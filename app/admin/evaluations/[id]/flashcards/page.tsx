import { prisma } from "@/lib/db";
import { requireEvalEdit } from "@/lib/admin";
import { ActionForm } from "@/components/forms/ActionForm";
import { saveFlashcardAction, validateAllAction } from "@/app/actions/admin";
import { ItemControls, StatusBadge } from "@/components/admin/ItemControls";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireEvalEdit(id);
  const [cards, notions] = await Promise.all([
    prisma.flashcard.findMany({ where: { evaluationId: id }, orderBy: { order: "asc" } }),
    prisma.notion.findMany({ where: { evaluationId: id }, orderBy: { order: "asc" } }),
  ]);
  const form = (c?: (typeof cards)[number]) => (
    <ActionForm action={saveFlashcardAction} submitLabel={c ? "Enregistrer" : "Ajouter la carte"} resetOnSuccess={!c}>
      <input type="hidden" name="evaluationId" value={id} />
      {c && <input type="hidden" name="id" value={c.id} />}
      <div className="grid-2">
        <div className="field"><label>Recto (question, notion, date)</label><textarea name="front" defaultValue={c?.front} rows={2} required /></div>
        <div className="field"><label>Verso (réponse du cours)</label><textarea name="back" defaultValue={c?.back} rows={2} required /></div>
      </div>
      <div className="row">
        <select name="notionId" aria-label="Notion" defaultValue={c?.notionId ?? ""} style={{ maxWidth: 280 }}><option value="">— Notion —</option>{notions.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}</select>
        <label className="check" style={{ margin: 0 }}><input type="checkbox" name="validate" defaultChecked={c?.status === "VALIDATED"} /> Vérifiée (validée)</label>
      </div>
    </ActionForm>
  );
  return (
    <div className="stack">
      <div className="spread">
        <h2 style={{ margin: 0 }}>Étape 2 « Je mémorise » · flashcards ({cards.length})</h2>
        {cards.some((c) => c.status === "DRAFT") && <form action={validateAllAction}><input type="hidden" name="evaluationId" value={id} /><input type="hidden" name="kind" value="flashcard" /><button className="btn btn-sm btn-ghost">Valider toutes les cartes relues</button></form>}
      </div>
      <p className="small muted">Les activités de mémorisation (questions rapides, associations, textes à trous, chronologie) se gèrent dans l'onglet « Exercices ».</p>
      {cards.map((c) => (
        <div key={c.id} className={`item ${c.status === "VALIDATED" ? "validated" : "draft"}`}>
          <div className="spread"><StatusBadge status={c.status} source={c.source} sourceRef={c.sourceRef} /><ItemControls kind="flashcard" id={c.id} status={c.status} /></div>
          <p style={{ margin: "8px 0 4px" }}><strong>{c.front}</strong> → {c.back}</p>
          {c.sourceRef && <p className="small muted" style={{ margin: 0 }}>Source : {c.sourceRef}</p>}
          <details><summary>Modifier</summary>{form(c)}</details>
        </div>
      ))}
      <details className="card" open={cards.length === 0}><summary>+ Ajouter une flashcard</summary>{form()}</details>
    </div>
  );
}
