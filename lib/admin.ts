import "server-only";
import { notFound, redirect } from "next/navigation";
import { prisma } from "./db";
import { requirePermission } from "./auth";
import { canEditSubject } from "./access";
import type { Permission } from "./roles";

/** Vérifie le droit de modifier une évaluation (les enseignants : leurs matières seulement). */
export async function requireEvalEdit(evaluationId: string, perm: Permission = "pedagogy.edit") {
  const user = await requirePermission(perm);
  const ev = await prisma.evaluation.findUnique({ where: { id: evaluationId }, include: { subject: { include: { gradeLevel: true } } } });
  if (!ev) notFound();
  if (!canEditSubject(user, ev.subjectId)) redirect("/admin");
  return { user, ev };
}

export function lines(s: FormDataEntryValue | null) {
  return String(s ?? "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
}

export function slugify(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "x";
}
