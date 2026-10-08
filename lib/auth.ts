import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { prisma } from "./db";
import { can, type Permission, type RoleName } from "./roles";

export const SESSION_COOKIE = "sj_session";
const SESSION_DAYS = 14;

export async function hashPassword(pw: string) {
  return bcrypt.hash(pw, 12);
}
export async function verifyPassword(pw: string, hash: string) {
  return bcrypt.compare(pw, hash);
}

/** 10 caractères minimum, au moins une lettre et un chiffre. */
export function passwordProblem(pw: string): string | null {
  if (pw.length < 10) return "Le mot de passe doit contenir au moins 10 caractères.";
  if (!/[a-zA-Z]/.test(pw) || !/\d/.test(pw)) return "Le mot de passe doit contenir des lettres et au moins un chiffre.";
  return null;
}

const sha256 = (s: string) => crypto.createHash("sha256").update(s).digest("hex");

export async function createSession(userId: string) {
  const token = crypto.randomBytes(32).toString("base64url");
  const h = await headers();
  await prisma.session.create({
    data: { id: sha256(token), userId, expiresAt: new Date(Date.now() + SESSION_DAYS * 86400_000), userAgent: h.get("user-agent")?.slice(0, 200) },
  });
  await prisma.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 86400,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await prisma.session.deleteMany({ where: { id: sha256(token) } });
  jar.delete(SESSION_COOKIE);
}

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

export async function getCurrentUser() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { id: sha256(token) },
    include: { user: { include: { gradeLevel: true, teacherSubjects: true } } },
  });
  if (!session || session.expiresAt < new Date()) return null;
  if (session.user.status !== "ACTIVE") return null;
  return session.user;
}

export async function requireUser(roles?: RoleName[]) {
  const user = await getCurrentUser();
  if (!user) redirect("/connexion");
  if (roles && !roles.includes(user.role as RoleName)) redirect(homeFor(user.role));
  return user;
}

export async function requirePermission(perm: Permission) {
  const user = await requireUser();
  if (!can(user.role, perm)) redirect(homeFor(user.role));
  return user;
}

export function homeFor(role: string) {
  if (role === "STUDENT") return "/eleve";
  if (role === "PARENT") return "/parent";
  return "/admin";
}

export async function clientIp() {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "").trim() || null;
}

/** Limite les tentatives : 5 échecs en 15 minutes bloquent l'identifiant. */
export async function isLoginLocked(identifier: string) {
  const since = new Date(Date.now() - 15 * 60_000);
  const failures = await prisma.loginAttempt.count({ where: { identifier, success: false, createdAt: { gte: since } } });
  return failures >= 5;
}
