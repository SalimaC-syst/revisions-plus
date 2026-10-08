import { prisma } from "@/lib/db";
import { requireEvalEdit } from "@/lib/admin";
import { QuestionEditor } from "@/components/admin/Editors";
import { QuestionList } from "@/components/admin/QuestionList";
import { ActionForm } from "@/components/forms/ActionForm";
import { saveMockExamAction } from "@/app/actions/admin";
import { ItemControls, StatusBadge } from "@/components/admin/ItemControls";
import { availableImages } from "@/lib/images";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireEvalEdit(id);
  const [mocks, notions, images] = await Promise.all([
    prisma.mockExam.findMany({ where: { evaluationId: id }, include: { questions: { orderBy: { order: "asc" }, include: { notion: true } } } }),
    prisma.notion.findMany({ where: { evaluationId: id }, orderBy: { order: "asc" } }),
    availableImages(id),
  ]);
  const mockForm = (m?: (typeof mocks)[number]) => (
    <ActionForm action={saveMockExamAction} submitLabel={m ? "Enregistrer les paramètres" : "Créer le contrôle blanc"} resetOnSuccess={!m}>
      <input type="hidden" name="evaluationId" value={id} />
      {m && <input type="hidden" name="id" value={m.id} />}
      <div className="grid-2">
        <div className="field"><label>Titre</label><input name="title" type="text" defaultValue={m?.title ?? "Contrôle blanc"} required /></div>
        <div className="field"><label>Durée (minutes)</label><input name="durationMin" type="number" min={5} max={240} defaultValue={m?.durationMin ?? 45} /></div>
      </div>
      <div className="field"><label>Consignes</label><textarea name="instructions" defaultValue={m?.instructions} rows={3} /></div>
      <label className="check"><input type="checkbox" name="validate" defaultChecked={m?.status === "VALIDATED"} /> Contrôle prêt à être proposé (validé)</label>
    </ActionForm>
  );
  return (
    <div className="stack">
      <p className="small muted">Le contrôle est noté sur 20 : la note est calculée à partir du barème de chaque question. Pour proposer des variantes, donnez la même lettre de groupe (A, B…) à plusieurs questions équivalentes et de même barème : une seule par groupe est tirée à chaque tentative. Les réponses rédigées ne sont jamais notées automatiquement : elles arrivent dans « Corrections ».</p>
      {mocks.map((m) => {
        const groups = new Map<string, number[]>();
        for (const q of m.questions.filter((q) => q.status === "VALIDATED")) groups.set(q.variantGroup ?? q.id, [...(groups.get(q.variantGroup ?? q.id) ?? []), q.points]);
        const total = [...groups.values()].reduce((s, pts) => s + pts[0], 0);
        const unequal = [...groups.entries()].filter(([, pts]) => new Set(pts).size > 1).map(([g]) => g);
        return (
          <div className="card" key={m.id}>
            <div className="spread"><h2 style={{ margin: 0 }}>{m.title} · {m.durationMin} min</h2><span className="row"><StatusBadge status={m.status} source={m.source} /><ItemControls kind="mockExam" id={m.id} status={m.status} movable={false} /></span></div>
            <p className="small">Barème d'une copie (questions validées) : <strong>{total} points</strong>, ramenés sur 20. {unequal.length > 0 && <span className="badge badge-ko">⚠ Barèmes différents dans le(s) groupe(s) {unequal.join(", ")}</span>}</p>
            <details><summary>Paramètres</summary>{mockForm(m)}</details>
            <QuestionList questions={m.questions as any} evaluationId={id} notions={notions} step="EXAM" mockExams={mocks} images={images} />
            <details className="card"><summary>+ Ajouter une question à ce contrôle</summary><QuestionEditor evaluationId={id} notions={notions} step="EXAM" mockExams={[m, ...mocks.filter((x) => x.id !== m.id)]} images={images} /></details>
          </div>
        );
      })}
      <details className="card" open={mocks.length === 0}><summary>+ Nouveau contrôle blanc</summary>{mockForm()}</details>
    </div>
  );
}
