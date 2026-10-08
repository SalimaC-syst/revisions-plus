// Webhooks Stripe sur une vraie base PostgreSQL (événements construits localement, aucun appel à Stripe).
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import Stripe from "stripe";
import { prisma } from "@/lib/db";
import { handleStripeEvent, addMonths } from "@/lib/stripe";
import { studentHasAccess } from "@/lib/access";

const tag = `t${Date.now()}`;
let parentId = "", studentId = "", monthlySub = "", engageSub = "";
const ev = (type: string, object: any) => ({ id: `evt_${tag}_${Math.random().toString(36).slice(2)}`, type, data: { object } });
const ts = (d: Date) => Math.floor(d.getTime() / 1000);

beforeAll(async () => {
  const parent = await prisma.user.create({ data: { email: `${tag}@test.local`, passwordHash: "x", role: "PARENT", firstName: "P", stripeCustomerId: `cus_${tag}` } });
  const student = await prisma.user.create({ data: { username: `${tag}.eleve`, passwordHash: "x", role: "STUDENT", firstName: "E", parentId: parent.id } });
  parentId = parent.id; studentId = student.id;
  const monthly = await prisma.plan.findUniqueOrThrow({ where: { code: "MONTHLY" } });
  const engage = await prisma.plan.findUniqueOrThrow({ where: { code: "ENGAGEMENT_9" } });
  monthlySub = (await prisma.subscription.create({ data: { parentId, studentId, planId: monthly.id, priceCents: 2500, withdrawalWaived: true } })).id;
  engageSub = (await prisma.subscription.create({ data: { parentId, studentId, planId: engage.id, priceCents: 1900, withdrawalWaived: true } })).id;
});
afterAll(async () => {
  await prisma.payment.deleteMany({ where: { parentId } });
  await prisma.user.deleteMany({ where: { id: { in: [studentId, parentId] } } });
  await prisma.stripeEvent.deleteMany({ where: { id: { startsWith: `evt_${tag}` } } });
});

describe("webhooks Stripe", () => {
  it("pas d'accès avant paiement", async () => {
    expect(await studentHasAccess(studentId)).toBe(false);
  });

  it("paiement validé : abonnement actif, puis période synchronisée", async () => {
    const start = new Date();
    const e = ev("checkout.session.completed", { metadata: { subscriptionId: monthlySub }, subscription: `sub_m_${tag}`, payment_status: "paid", created: ts(start) });
    expect(await handleStripeEvent(e, null)).toEqual({ duplicate: false });
    expect(await handleStripeEvent(e, null)).toEqual({ duplicate: true }); // renvoi par Stripe : ignoré
    const end = addMonths(start, 1);
    await handleStripeEvent(ev("customer.subscription.updated", { id: `sub_m_${tag}`, status: "active", metadata: { subscriptionId: monthlySub }, items: { data: [{ current_period_end: ts(end) }] }, start_date: ts(start) }), null);
    const s = await prisma.subscription.findUniqueOrThrow({ where: { id: monthlySub } });
    expect(s.status).toBe("ACTIVE");
    expect(s.stripeSubscriptionId).toBe(`sub_m_${tag}`);
    expect(Math.abs(s.currentPeriodEnd!.getTime() - end.getTime())).toBeLessThan(1000);
    expect(await studentHasAccess(studentId)).toBe(true);
  });

  it("facture payée puis remboursement partiel", async () => {
    await handleStripeEvent(ev("invoice.paid", { id: `in_${tag}`, customer: `cus_${tag}`, parent: { subscription_details: { subscription: `sub_m_${tag}` } }, amount_paid: 2500, amount_due: 2500, payment_intent: `pi_${tag}`, hosted_invoice_url: "https://invoice.stripe.com/x" }), null);
    let p = await prisma.payment.findUniqueOrThrow({ where: { stripeInvoiceId: `in_${tag}` } });
    expect(p.status).toBe("PAID");
    expect(p.subscriptionId).toBe(monthlySub);
    await handleStripeEvent(ev("charge.refunded", { id: `ch_${tag}`, payment_intent: `pi_${tag}`, amount_refunded: 1000 }), null);
    p = await prisma.payment.findUniqueOrThrow({ where: { id: p.id } });
    expect(p.status).toBe("PARTIALLY_REFUNDED");
    expect(p.refundedCents).toBe(1000);
  });

  it("échec de prélèvement : impayé, accès maintenu jusqu'à la fin de la période", async () => {
    await handleStripeEvent(ev("invoice.payment_failed", { id: `in2_${tag}`, customer: `cus_${tag}`, parent: { subscription_details: { subscription: `sub_m_${tag}` } }, amount_due: 2500 }), null);
    expect((await prisma.subscription.findUniqueOrThrow({ where: { id: monthlySub } })).status).toBe("PAST_DUE");
    expect((await prisma.payment.findUniqueOrThrow({ where: { stripeInvoiceId: `in2_${tag}` } })).status).toBe("FAILED");
  });

  it("résiliation du mensuel : accès jusqu'à la fin du mois payé", async () => {
    const end = addMonths(new Date(), 1);
    await handleStripeEvent(ev("customer.subscription.updated", { id: `sub_m_${tag}`, status: "active", cancel_at_period_end: true, metadata: { subscriptionId: monthlySub }, items: { data: [{ current_period_end: ts(end) }] } }), null);
    const s = await prisma.subscription.findUniqueOrThrow({ where: { id: monthlySub } });
    expect(s.status).toBe("CANCELED");
    expect(s.cancelAtPeriodEnd).toBe(true);
  });

  it("engagement 9 mois : fin d'engagement fixée, pas de reconduction tacite", async () => {
    const start = new Date("2026-09-01T10:00:00Z");
    await handleStripeEvent(ev("checkout.session.completed", { metadata: { subscriptionId: engageSub }, subscription: `sub_e_${tag}`, payment_status: "paid", created: ts(start) }), null);
    // Stripe renvoie l'abonnement avec cancel_at = fin d'engagement : il reste actif (engagement en cours)
    await handleStripeEvent(ev("customer.subscription.updated", { id: `sub_e_${tag}`, status: "active", cancel_at: ts(addMonths(start, 9)), metadata: { subscriptionId: engageSub }, items: { data: [{ current_period_end: ts(addMonths(new Date(), 1)) }] } }), null);
    const s = await prisma.subscription.findUniqueOrThrow({ where: { id: engageSub } });
    expect(s.commitmentEndsAt!.toISOString().slice(0, 10)).toBe("2027-06-01");
    expect(s.status).toBe("ACTIVE");
  });

  it("suspension administrative prioritaire sur Stripe", async () => {
    await prisma.subscription.updateMany({ where: { studentId }, data: { status: "SUSPENDED" } });
    await handleStripeEvent(ev("customer.subscription.updated", { id: `sub_e_${tag}`, status: "active", metadata: { subscriptionId: engageSub }, items: { data: [{ current_period_end: ts(addMonths(new Date(), 1)) }] } }), null);
    expect((await prisma.subscription.findUniqueOrThrow({ where: { id: engageSub } })).status).toBe("SUSPENDED");
    expect(await studentHasAccess(studentId)).toBe(false);
  });
});

describe("route /api/stripe/webhook", () => {
  it("refuse une signature invalide et accepte une signature valide", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_dummy";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_secret";
    const { POST } = await import("@/app/api/stripe/webhook/route");
    const payload = JSON.stringify(ev("customer.subscription.updated", { id: "sub_inconnu", status: "active", metadata: {}, items: { data: [] } }));
    const bad = await POST(new Request("http://x/api/stripe/webhook", { method: "POST", body: payload, headers: { "stripe-signature": "t=1,v1=faux" } }));
    expect(bad.status).toBe(400);
    const header = new Stripe("sk_test_dummy").webhooks.generateTestHeaderString({ payload, secret: "whsec_test_secret" });
    const ok = await POST(new Request("http://x/api/stripe/webhook", { method: "POST", body: payload, headers: { "stripe-signature": header } }));
    expect(ok.status).toBe(200);
  });
});
