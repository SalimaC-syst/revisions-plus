"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { clientIp, hashPassword, passwordProblem, requireUser } from "@/lib/auth";
import { CGV_VERSION } from "@/lib/settings";
import { createCheckout, stripeClient } from "@/lib/stripe";
import type { FormState } from "./auth";

async function ownChild(parentId: string, studentId: string) {
  const child = await prisma.user.findFirst({ where: { id: studentId, parentId, role: "STUDENT" } });
  if (!child) throw new Error("Élève introuvable.");
  return child;
}

const childSchema = z.object({
  firstName: z.string().trim().min(1, "Prénom requis").max(40),
  lastInitial: z.string().trim().max(40).default(""),
  gradeLevelId: z.string().min(1, "Choisissez la classe"),
  username: z.string().trim().toLowerCase().regex(/^[a-z0-9._-]{4,30}$/, "Identifiant : 4 à 30 caractères (lettres, chiffres, point, tiret)"),
  password: z.string(),
});

export async function addChildAction(_: FormState, form: FormData): Promise<FormState> {
  const parent = await requireUser(["PARENT"]);
  const p = childSchema.safeParse(Object.fromEntries(form));
  if (!p.success) return { error: p.error.issues[0].message };
  const pb = passwordProblem(p.data.password);
  if (pb) return { error: pb };
  if (await prisma.user.findUnique({ where: { username: p.data.username } })) return { error: "Cet identifiant est déjà pris, choisissez-en un autre." };
  const level = await prisma.gradeLevel.findUnique({ where: { id: p.data.gradeLevelId } });
  if (!level) return { error: "Classe inconnue." };
  await prisma.user.create({
    data: { role: "STUDENT", firstName: p.data.firstName, lastName: p.data.lastInitial, username: p.data.username, passwordHash: await hashPassword(p.data.password), parentId: parent.id, gradeLevelId: level.id },
  });
  revalidatePath("/parent");
  return { ok: `Le compte de ${p.data.firstName} est créé. Identifiant : ${p.data.username}` };
}

export async function updateChildAction(_: FormState, form: FormData): Promise<FormState> {
  const parent = await requireUser(["PARENT"]);
  const child = await ownChild(parent.id, String(form.get("studentId")));
  const data: any = {};
  const gl = String(form.get("gradeLevelId") ?? "");
  if (gl) data.gradeLevelId = gl;
  const pw = String(form.get("password") ?? "");
  if (pw) {
    const pb = passwordProblem(pw);
    if (pb) return { error: pb };
    data.passwordHash = await hashPassword(pw);
    await prisma.session.deleteMany({ where: { userId: child.id } });
  }
  await prisma.user.update({ where: { id: child.id }, data });
  revalidatePath(`/parent/enfant/${child.id}`);
  return { ok: pw ? "Mot de passe modifié." : "Modifications enregistrées." };
}

export async function startSubscriptionAction(_: FormState, form: FormData): Promise<FormState> {
  const parent = await requireUser(["PARENT"]);
  const child = await ownChild(parent.id, String(form.get("studentId")));
  const plan = await prisma.plan.findFirst({ where: { id: String(form.get("planId")), active: true } });
  if (!plan) return { error: "Formule introuvable." };
  if (form.get("cgv") !== "on") return { error: "Merci d'accepter les conditions générales de vente." };
  if (!stripeClient()) return { error: "Le paiement en ligne n'est pas encore ouvert. Contactez l'établissement pour activer l'accès." };
  const waived = form.get("waiver") === "on";
  const existing = await prisma.subscription.findFirst({ where: { studentId: child.id, status: { in: ["ACTIVE", "PAST_DUE"] } } });
  if (existing) return { error: "Cet élève a déjà un abonnement en cours." };
  await prisma.subscription.deleteMany({ where: { studentId: child.id, status: "PENDING", stripeSubscriptionId: null } });
  const sub = await prisma.subscription.create({ data: { parentId: parent.id, studentId: child.id, planId: plan.id, priceCents: plan.priceCents, withdrawalWaived: waived } });
  const ip = await clientIp();
  await prisma.consent.createMany({ data: [
    { userId: parent.id, type: "CGV", version: CGV_VERSION, ip },
    ...(waived ? [{ userId: parent.id, type: "WITHDRAWAL_WAIVER", version: CGV_VERSION, ip }] : []),
  ] });
  const url = await createCheckout({ parent, subscriptionId: sub.id, plan, studentName: child.firstName, appUrl: process.env.APP_URL ?? "http://localhost:3000" });
  redirect(url);
}

export async function cancelSubscriptionAction(form: FormData) {
  const parent = await requireUser(["PARENT"]);
  const sub = await prisma.subscription.findFirst({ where: { id: String(form.get("subscriptionId")), parentId: parent.id }, include: { plan: true } });
  if (!sub) throw new Error("Abonnement introuvable.");
  const stripe = stripeClient();
  if (sub.plan.commitmentMonths === 0 && sub.stripeSubscriptionId && stripe) {
    await stripe.subscriptions.update(sub.stripeSubscriptionId, { cancel_at_period_end: true });
  }
  await prisma.subscription.update({ where: { id: sub.id }, data: { cancelAtPeriodEnd: true, canceledAt: new Date(), status: sub.plan.commitmentMonths === 0 ? "CANCELED" : sub.status } });
  await prisma.consent.create({ data: { userId: parent.id, type: "TERMINATION_NOTICE", version: sub.id, ip: await clientIp() } });
  revalidatePath("/parent/facturation");
  redirect("/parent/facturation?resiliation=ok");
}

export async function openBillingPortalAction() {
  const parent = await requireUser(["PARENT"]);
  const stripe = stripeClient();
  if (!stripe || !parent.stripeCustomerId) redirect("/parent/facturation");
  const s = await stripe.billingPortal.sessions.create({ customer: parent.stripeCustomerId!, return_url: `${process.env.APP_URL}/parent/facturation`, locale: "fr" });
  redirect(s.url);
}

export async function dataRequestAction(_: FormState, form: FormData): Promise<FormState> {
  const parent = await requireUser(["PARENT"]);
  const type = String(form.get("type"));
  if (!["ACCESS", "DELETION", "RECTIFICATION"].includes(type)) return { error: "Demande invalide." };
  await prisma.dataRequest.create({ data: { userId: parent.id, type: type as any, message: String(form.get("message") ?? "").slice(0, 2000) } });
  return { ok: "Votre demande est enregistrée. L'établissement y répondra dans un délai d'un mois maximum." };
}
