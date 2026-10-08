import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { ActionForm } from "@/components/forms/ActionForm";
import { saveLevelAction, saveSubjectAction, deleteSubjectAction, mergeSubjectsAction } from "@/app/actions/admin";
import { ConfirmButton } from "@/components/ConfirmButton";

export const metadata = { title: "Niveaux et matières" };

export default async function Page() {
  await requirePermission("pedagogy.publish");
  const levels = await prisma.gradeLevel.findMany({ orderBy: { order: "asc" }, include: { subjects: { orderBy: { order: "asc" }, include: { _count: { select: { evaluations: true } } } } } });
  const all = levels.flatMap((l) => l.subjects.map((s) => ({ ...s, level: l.name })));
  return (
    <div className="stack">
      <h1>Niveaux et matières</h1>
      <p className="muted">Renommez, masquez, réordonnez, ajoutez, supprimez ou fusionnez les matières. Une matière masquée disparaît de l'espace élève sans perdre ses contenus.</p>
      {levels.map((l) => (
        <div className="card" key={l.id}>
          <ActionForm action={saveLevelAction} submitLabel="Enregistrer le niveau" submitClass="btn btn-sm" className="row">
            <input type="hidden" name="id" value={l.id} />
            <input aria-label="Nom du niveau" name="name" type="text" defaultValue={l.name} style={{ maxWidth: 220 }} />
            <input aria-label="Ordre" name="order" type="number" defaultValue={l.order} style={{ width: 80 }} />
            <label className="check" style={{ margin: 0 }}><input type="checkbox" name="visible" defaultChecked={l.visible} /> Visible</label>
          </ActionForm>
          <div className="table-wrap" style={{ marginTop: 12 }}><table>
            <thead><tr><th>Icône</th><th>Matière</th><th>Couleur</th><th>Ordre</th><th>Visible</th><th>Évaluations</th><th></th></tr></thead>
            <tbody>
              {l.subjects.map((s) => (
                <tr key={s.id}>
                  <td colSpan={6}>
                    <ActionForm action={saveSubjectAction} submitLabel="Enregistrer" submitClass="btn btn-sm btn-ghost" className="row">
                      <input type="hidden" name="id" value={s.id} />
                      <input aria-label="Icône" name="icon" type="text" defaultValue={s.icon} style={{ width: 64 }} />
                      <input aria-label="Nom" name="name" type="text" defaultValue={s.name} style={{ maxWidth: 220 }} />
                      <input aria-label="Couleur" name="color" type="color" defaultValue={s.color} style={{ width: 60, padding: 2 }} />
                      <input aria-label="Ordre" name="order" type="number" defaultValue={s.order} style={{ width: 70 }} />
                      <label className="check" style={{ margin: 0 }}><input type="checkbox" name="visible" defaultChecked={s.visible} /> Visible</label>
                      <span className="small muted">{s._count.evaluations} évaluation(s)</span>
                    </ActionForm>
                  </td>
                  <td>
                    {s._count.evaluations === 0 && (
                      <form action={deleteSubjectAction}><input type="hidden" name="id" value={s.id} /><ConfirmButton className="btn btn-sm btn-danger" message={`Supprimer « ${s.name} » ?`}>Supprimer</ConfirmButton></form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
          <details style={{ marginTop: 10 }}>
            <summary>Ajouter une matière en {l.name}</summary>
            <ActionForm action={saveSubjectAction} submitLabel="Ajouter" className="row" resetOnSuccess>
              <input type="hidden" name="gradeLevelId" value={l.id} />
              <input aria-label="Icône" name="icon" type="text" defaultValue="📘" style={{ width: 64 }} />
              <input aria-label="Nom de la matière" name="name" type="text" placeholder="Nom de la matière" style={{ maxWidth: 260 }} required />
              <input aria-label="Couleur" name="color" type="color" defaultValue="#1f3a68" style={{ width: 60, padding: 2 }} />
              <input aria-label="Ordre" name="order" type="number" defaultValue={l.subjects.length} style={{ width: 70 }} />
              <input type="hidden" name="visible" value="on" />
            </ActionForm>
          </details>
        </div>
      ))}
      <div className="grid-2">
        <div className="card">
          <h2>Fusionner deux matières</h2>
          <p className="small muted">Toutes les évaluations de la première matière sont déplacées dans la seconde, puis la première est supprimée.</p>
          <ActionForm action={mergeSubjectsAction} submitLabel="Fusionner" confirm="Confirmer la fusion ? Cette opération est définitive.">
            <div className="field"><label htmlFor="from">Matière à fusionner</label><select id="from" name="from">{all.map((s) => <option key={s.id} value={s.id}>{s.level} · {s.name}</option>)}</select></div>
            <div className="field"><label htmlFor="into">Dans la matière</label><select id="into" name="into">{all.map((s) => <option key={s.id} value={s.id}>{s.level} · {s.name}</option>)}</select></div>
          </ActionForm>
        </div>
        <div className="card">
          <h2>Ajouter un niveau</h2>
          <ActionForm action={saveLevelAction} submitLabel="Ajouter" resetOnSuccess>
            <div className="field"><label htmlFor="ln">Nom</label><input id="ln" name="name" type="text" placeholder="ex. Quatrième" /></div>
            <input type="hidden" name="order" value={levels.length} />
            <label className="check"><input type="checkbox" name="visible" /> Visible immédiatement</label>
          </ActionForm>
        </div>
      </div>
    </div>
  );
}
