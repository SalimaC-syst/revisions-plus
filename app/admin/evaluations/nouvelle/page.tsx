import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { EvaluationForm } from "@/components/EvaluationForm";

export const metadata = { title: "Nouvelle évaluation" };

export default async function Page() {
  const user = await requirePermission("pedagogy.edit");
  const subjects = await prisma.subject.findMany({
    where: user.role === "TEACHER" ? { id: { in: user.teacherSubjects.map((t) => t.subjectId) } } : {},
    include: { gradeLevel: true }, orderBy: [{ gradeLevel: { order: "asc" } }, { order: "asc" }],
  });
  return (
    <div className="stack">
      <h1>Nouvelle évaluation</h1>
      <p className="muted">Étape 1 : décrivez le contrôle. Étape 2 : importez les documents du professeur. Étape 3 : générez et validez les ressources. Étape 4 : publiez.</p>
      <div className="card"><EvaluationForm ev={null} subjects={subjects} /></div>
    </div>
  );
}
