import { prisma } from "@/lib/db";
import { requireEvalEdit } from "@/lib/admin";
import { QuestionEditor } from "@/components/admin/Editors";
import { QuestionList } from "@/components/admin/QuestionList";
import { availableImages } from "@/lib/images";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireEvalEdit(id);
  const [qs, notions, images] = await Promise.all([
    prisma.question.findMany({ where: { evaluationId: id, step: { in: ["MEMORIZE", "PRACTICE"] } }, orderBy: { order: "asc" }, include: { notion: true } }),
    prisma.notion.findMany({ where: { evaluationId: id }, orderBy: { order: "asc" } }),
    availableImages(id),
  ]);
  const mem = qs.filter((q) => q.step === "MEMORIZE");
  const prac = qs.filter((q) => q.step === "PRACTICE");
  return (
    <div className="stack">
      <h2>Étape 2 « Je mémorise » · activités ({mem.length})</h2>
      <QuestionList questions={mem as any} evaluationId={id} notions={notions} step="MEMORIZE" images={images} />
      <details className="card"><summary>+ Ajouter une activité de mémorisation</summary><QuestionEditor evaluationId={id} notions={notions} step="MEMORIZE" images={images} /></details>
      <h2 style={{ marginTop: 28 }}>Étape 3 « Je m'entraîne » · exercices ({prac.length})</h2>
      <QuestionList questions={prac as any} evaluationId={id} notions={notions} step="PRACTICE" images={images} />
      <details className="card"><summary>+ Ajouter un exercice</summary><QuestionEditor evaluationId={id} notions={notions} step="PRACTICE" images={images} /></details>
    </div>
  );
}
