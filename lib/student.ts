import "server-only";
import { notFound, redirect } from "next/navigation";
import { prisma } from "./db";
import { requireUser } from "./auth";
import { studentHasAccess } from "./access";

/** Élève connecté avec un abonnement actif. */
export async function requireStudent() {
  const user = await requireUser(["STUDENT"]);
  if (!(await studentHasAccess(user.id))) redirect("/eleve/acces");
  return user;
}

/** Une évaluation n'est visible que si elle est publiée et sa matière visible. */
export async function publishedEvaluation(id: string) {
  const ev = await prisma.evaluation.findFirst({
    where: { id, status: "PUBLISHED", subject: { visible: true, gradeLevel: { visible: true } } },
    include: { subject: { include: { gradeLevel: true } } },
  });
  if (!ev) notFound();
  return ev;
}
