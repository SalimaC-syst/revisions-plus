// Accès aux révisions : réservé aux élèves dont un abonnement est actif.
import { prisma } from "./db";

type SubLike = { status: string; currentPeriodEnd: Date | null; manualGrant: boolean; withdrawalWaived?: boolean; startedAt?: Date | null };
export const WITHDRAWAL_DAYS = 14;

/** Règle pure, testée unitairement. */
export function subscriptionGrantsAccess(s: SubLike, now = new Date()): boolean {
  if (s.status === "SUSPENDED") return false;
  // sans renonciation expresse au droit de rétractation, l'accès commence après le délai légal
  if (!s.manualGrant && s.withdrawalWaived === false && s.startedAt && now.getTime() < s.startedAt.getTime() + WITHDRAWAL_DAYS * 86400_000) return false;
  if (s.manualGrant && (s.status === "ACTIVE")) return !s.currentPeriodEnd || s.currentPeriodEnd > now;
  if (s.status === "ACTIVE" || s.status === "PAST_DUE") return !!s.currentPeriodEnd && s.currentPeriodEnd > now;
  // résilié : l'accès reste ouvert jusqu'à la fin de la période payée
  if (s.status === "CANCELED") return !!s.currentPeriodEnd && s.currentPeriodEnd > now;
  return false;
}

export async function studentHasAccess(studentId: string) {
  const subs = await prisma.subscription.findMany({ where: { studentId } });
  return subs.some((s) => subscriptionGrantsAccess(s));
}

/** Un enseignant ne voit que les matières qui lui sont attribuées. */
export function canEditSubject(user: { role: string; teacherSubjects?: { subjectId: string }[] }, subjectId: string) {
  if (user.role === "SUPER_ADMIN" || user.role === "ADMIN_PEDA") return true;
  if (user.role === "TEACHER") return (user.teacherSubjects ?? []).some((t) => t.subjectId === subjectId);
  return false;
}
