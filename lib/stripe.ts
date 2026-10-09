// Intégration Stripe : Checkout (abonnement), portail client, webhooks, remboursements.
// Aucune donnée bancaire ne transite ni n'est stockée par la plateforme.
import Stripe from "stripe";
import { prisma } from "./db";
import { getSetting } from "./settings";

let client: Stripe | null = null;
export function stripeClient(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  client ??= new Stripe(key);
  return client;
}
export const stripeMode = (): "off" | "test" | "live" => {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return "off";
  return key.startsWith("sk_live") ? "live" : "test";
};

export function addMonths(d: Date, months: number) {
  const r = new Date(d);
  r.setUTCMonth(r.getUTCMonth() + months);
  return r;
}

export async function ensureCustomer(stripe: Stripe, parent: { id: string; email: string | null; firstName: string; lastName: string; stripeCustomerId: string | null }) {
  if (parent.stripeCustomerId) return parent.stripeCustomerId;
  const c = await stripe.customers.create({
    email: parent.email ?? undefined,
    name: `${parent.firstName} ${parent.lastName}`.trim(),
    preferred_locales: ["fr"],
    metadata: { parentId: parent.id },
  });
  await prisma.user.update({ where: { id: parent.id }, data: { stripeCustomerId: c.id } });
  return c.id;
}

export async function createCheckout(opts: {
  parent: Parameters<typeof ensureCustomer>[1];
  subscriptionId: string;
  plan: { code: string; name: string; priceCents: number };
  studentName: string;
  appUrl: string;
}) {
  const stripe = stripeClient();
  if (!stripe) throw new Error("Paiement en ligne non configuré.");
  const customer = await ensureCustomer(stripe, opts.parent);
  const { shortName } = await getSetting("branding");
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer,
    locale: "fr",
    line_items: [{
      quantity: 1,
      price_data: {
        currency: "eur",
        unit_amount: opts.plan.priceCents,
        recurring: { interval: "month" },
        product_data: { name: `${shortName} — ${opts.plan.name} (${opts.studentName})` },
      },
    }],
    metadata: { subscriptionId: opts.subscriptionId },
    subscription_data: { metadata: { subscriptionId: opts.subscriptionId, planCode: opts.plan.code } },
    success_url: `${opts.appUrl}/parent/abonnement/retour?statut=ok`,
    cancel_url: `${opts.appUrl}/parent/abonnement/retour?statut=annule`,
  });
  await prisma.subscription.update({ where: { id: opts.subscriptionId }, data: { stripeCheckoutId: session.id } });
  return session.url!;
}

// ---------- synchronisation par webhooks ----------
const STATUS_MAP: Record<string, string> = {
  active: "ACTIVE", trialing: "ACTIVE", past_due: "PAST_DUE", unpaid: "PAST_DUE",
  canceled: "ENDED", incomplete: "PENDING", incomplete_expired: "ENDED", paused: "SUSPENDED",
};

function periodEnd(sub: any): Date | null {
  const t = sub.items?.data?.[0]?.current_period_end ?? sub.current_period_end;
  return t ? new Date(t * 1000) : null;
}

async function findLocalSubscription(stripeSub: any) {
  const localId = stripeSub.metadata?.subscriptionId;
  if (localId) return prisma.subscription.findUnique({ where: { id: localId }, include: { plan: true } });
  return prisma.subscription.findUnique({ where: { stripeSubscriptionId: stripeSub.id }, include: { plan: true } });
}

export async function syncSubscription(stripeSub: any) {
  const local = await findLocalSubscription(stripeSub);
  if (!local) return;
  let status = STATUS_MAP[stripeSub.status] ?? local.status;
  // résiliation programmée : l'accès reste ouvert jusqu'à la fin de la période payée
  const scheduled = !!stripeSub.cancel_at_period_end || !!stripeSub.cancel_at;
  if (status === "ACTIVE" && scheduled && local.plan.commitmentMonths === 0) status = "CANCELED";
  if (local.status === "SUSPENDED" && status !== "ENDED") status = "SUSPENDED"; // suspension administrative prioritaire
  await prisma.subscription.update({
    where: { id: local.id },
    data: {
      status: status as any,
      stripeSubscriptionId: stripeSub.id,
      currentPeriodEnd: stripeSub.status === "canceled" && stripeSub.ended_at ? new Date(stripeSub.ended_at * 1000) : periodEnd(stripeSub),
      cancelAtPeriodEnd: scheduled,
      canceledAt: stripeSub.canceled_at ? new Date(stripeSub.canceled_at * 1000) : null,
      startedAt: local.startedAt ?? (stripeSub.start_date ? new Date(stripeSub.start_date * 1000) : new Date()),
    },
  });
}

function invoiceSubscriptionId(inv: any): string | null {
  const s = inv.parent?.subscription_details?.subscription ?? inv.subscription;
  return typeof s === "string" ? s : s?.id ?? null;
}

async function paymentRefFor(stripe: Stripe | null, inv: any): Promise<string | null> {
  if (inv.payment_intent) return typeof inv.payment_intent === "string" ? inv.payment_intent : inv.payment_intent.id;
  if (!stripe) return null;
  try {
    const list = await stripe.invoicePayments.list({ invoice: inv.id, limit: 1 });
    const p: any = list.data[0]?.payment;
    const ref = p?.payment_intent ?? p?.charge;
    return typeof ref === "string" ? ref : ref?.id ?? null;
  } catch {
    return null;
  }
}

export async function handleStripeEvent(event: { id: string; type: string; data: { object: any } }, stripe: Stripe | null = stripeClient()) {
  // idempotence : chaque événement n'est traité qu'une fois
  const seen = await prisma.stripeEvent.findUnique({ where: { id: event.id } });
  if (seen) return { duplicate: true };
  const obj = event.data.object;

  switch (event.type) {
    case "checkout.session.completed": {
      const local = await prisma.subscription.findUnique({ where: { id: obj.metadata?.subscriptionId ?? "" }, include: { plan: true } });
      if (!local) break;
      const stripeSubId = typeof obj.subscription === "string" ? obj.subscription : obj.subscription?.id;
      const start = new Date((obj.created ?? Date.now() / 1000) * 1000);
      const data: any = { stripeSubscriptionId: stripeSubId, startedAt: start };
      if (obj.payment_status === "paid") data.status = "ACTIVE";
      if (local.plan.commitmentMonths > 0) {
        const end = addMonths(start, local.plan.commitmentMonths);
        data.commitmentEndsAt = end;
        // l'abonnement s'arrête automatiquement au terme de l'engagement (pas de reconduction tacite)
        if (stripe && stripeSubId) await stripe.subscriptions.update(stripeSubId, { cancel_at: Math.floor(end.getTime() / 1000) });
      }
      await prisma.subscription.update({ where: { id: local.id }, data });
      if (stripe && stripeSubId) await syncSubscription(await stripe.subscriptions.retrieve(stripeSubId));
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await syncSubscription(obj);
      break;
    case "invoice.paid":
    case "invoice.payment_failed": {
      const subId = invoiceSubscriptionId(obj);
      const local = subId ? await prisma.subscription.findUnique({ where: { stripeSubscriptionId: subId } }) : null;
      const parent = local ? { id: local.parentId } : await prisma.user.findFirst({ where: { stripeCustomerId: obj.customer } });
      if (!parent) break;
      const paid = event.type === "invoice.paid";
      const ref = paid ? await paymentRefFor(stripe, obj) : null;
      await prisma.payment.upsert({
        where: { stripeInvoiceId: obj.id },
        create: {
          stripeInvoiceId: obj.id, parentId: parent.id, subscriptionId: local?.id,
          amountCents: paid ? obj.amount_paid : obj.amount_due, status: paid ? "PAID" : "FAILED",
          invoiceUrl: obj.hosted_invoice_url, invoicePdf: obj.invoice_pdf, stripePaymentRef: ref,
          failureMessage: paid ? null : obj.last_finalization_error?.message ?? "Le paiement a été refusé par la banque.",
        },
        update: {
          amountCents: paid ? obj.amount_paid : obj.amount_due, status: paid ? "PAID" : "FAILED",
          invoiceUrl: obj.hosted_invoice_url, invoicePdf: obj.invoice_pdf, stripePaymentRef: ref ?? undefined,
          failureMessage: paid ? null : "Le paiement a été refusé par la banque.",
        },
      });
      if (local && !paid && local.status === "ACTIVE") await prisma.subscription.update({ where: { id: local.id }, data: { status: "PAST_DUE" } });
      break;
    }
    case "charge.refunded": {
      const ref = typeof obj.payment_intent === "string" ? obj.payment_intent : obj.id;
      const pay = await prisma.payment.findFirst({ where: { OR: [{ stripePaymentRef: ref }, { stripePaymentRef: obj.id }] } });
      if (pay) {
        const refunded = obj.amount_refunded ?? 0;
        await prisma.payment.update({ where: { id: pay.id }, data: { refundedCents: refunded, status: refunded >= pay.amountCents ? "REFUNDED" : "PARTIALLY_REFUNDED" } });
      }
      break;
    }
  }
  await prisma.stripeEvent.create({ data: { id: event.id, type: event.type } });
  return { duplicate: false };
}
