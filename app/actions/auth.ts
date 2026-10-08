"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { clientIp, createSession, destroySession, hashPassword, homeFor, isLoginLocked, passwordProblem, verifyPassword } from "@/lib/auth";
import { CGV_VERSION, PRIVACY_VERSION } from "@/lib/settings";
import { audit } from "@/lib/audit";

export type FormState = { error?: string; ok?: string } | undefined;

export async function loginAction(_: FormState, form: FormData): Promise<FormState> {
  const identifier = String(form.get("identifier") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  if (!identifier || !password) return { error: "Indique ton identifiant et ton mot de passe." };
  if (await isLoginLocked(identifier)) return { error: "Trop de tentatives. Réessaie dans 15 minutes." };
  const user = await prisma.user.findFirst({ where: { OR: [{ email: identifier }, { username: identifier }] } });
  const ok = !!user && (await verifyPassword(password, user.passwordHash));
  await prisma.loginAttempt.create({ data: { identifier, success: ok, ip: await clientIp() } });
  if (!user || !ok) return { error: "Identifiant ou mot de passe incorrect." };
  if (user.status !== "ACTIVE") return { error: "Ce compte est suspendu. Contacte l'établissement." };
  await createSession(user.id);
  if (user.role !== "STUDENT" && user.role !== "PARENT") await audit(user.id, "auth.login", "User", user.id);
  redirect(homeFor(user.role));
}

export async function logoutAction() {
  await destroySession();
  redirect("/connexion");
}

const registerSchema = z.object({
  firstName: z.string().trim().min(1, "Prénom requis").max(60),
  lastName: z.string().trim().min(1, "Nom requis").max(60),
  email: z.string().trim().toLowerCase().email("Adresse e-mail invalide"),
  password: z.string(),
  password2: z.string(),
});

export async function registerParentAction(_: FormState, form: FormData): Promise<FormState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  if (d.password !== d.password2) return { error: "Les deux mots de passe ne correspondent pas." };
  const pb = passwordProblem(d.password);
  if (pb) return { error: pb };
  if (form.get("legalGuardian") !== "on") return { error: "L'inscription doit être faite par un parent ou représentant légal." };
  if (form.get("privacy") !== "on") return { error: "Merci d'accepter la politique de confidentialité." };
  if (await prisma.user.findUnique({ where: { email: d.email } })) return { error: "Un compte existe déjà avec cette adresse. Connectez-vous." };
  const ip = await clientIp();
  const user = await prisma.user.create({
    data: {
      email: d.email, firstName: d.firstName, lastName: d.lastName, role: "PARENT", passwordHash: await hashPassword(d.password),
      consents: { create: [{ type: "PRIVACY", version: PRIVACY_VERSION, ip }, { type: "LEGAL_GUARDIAN", version: CGV_VERSION, ip }] },
    },
  });
  await createSession(user.id);
  redirect("/parent?bienvenue=1");
}
