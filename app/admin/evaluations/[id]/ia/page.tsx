import { prisma } from "@/lib/db";
import { requireEvalEdit } from "@/lib/admin";
import { ActionForm } from "@/components/forms/ActionForm";
import { generateAction } from "@/app/actions/admin";
import { aiConfigured, AI_MODEL } from "@/lib/ai";
import { dateTimeFr } from "@/lib/format";
import Link from "next/link";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireEvalEdit(id, "pedagogy.ai");
  const docs = await prisma.document.findMany({ where: { evaluationId: id }, orderBy: { createdAt: "asc" } });
  const gens = await prisma.aiGeneration.findMany({ where: { evaluationId: id }, orderBy: { createdAt: "desc" }, take: 10 });
  const docPicker = (
    <fieldset className="field" style={{ border: 0, padding: 0 }}>
      <legend style={{ fontWeight: 600 }}>Documents à analyser</legend>
      {docs.filter((d) => d.kind === "FILE").map((d) => <label key={d.id} className="check"><input type="checkbox" name="documentIds" value={d.id} defaultChecked /> {d.title}</label>)}
      {docs.filter((d) => d.kind === "FILE").length === 0 && <p className="small muted">Importez d'abord des documents dans l'onglet « Documents ».</p>}
    </fieldset>
  );
  return (
    <div className="stack">
      {!aiConfigured() && <div className="alert alert-warn">Le service d'IA n'est pas encore connecté : il faut une clé API (voir la documentation d'installation). En attendant, tous les contenus peuvent être saisis à la main dans les onglets suivants.</div>}
      <div className="alert alert-info small">
        Fonctionnement : l'IA lit uniquement les documents sélectionnés (aucune donnée d'élève n'est transmise), signale ce qu'elle a mal lu, et propose des contenus <strong>en brouillon</strong>. Chaque élément indique sa source ; ceux marqués « ⚠ à vérifier » demandent une attention particulière. Rien n'est visible des élèves avant votre validation.
      </div>
      <div className="grid-2">
        <div className="card">
          <h2>Étape A · Analyse, fiche mémo et flashcards</h2>
          <ActionForm action={generateAction} submitLabel="Analyser et générer" pendingLabel="Analyse en cours (1 à 3 minutes)…">
            <input type="hidden" name="evaluationId" value={id} /><input type="hidden" name="what" value="analysis" />
            {docPicker}
            <div className="field"><label htmlFor="flashcards">Nombre de flashcards</label><input id="flashcards" name="flashcards" type="number" defaultValue={15} min={5} max={40} /></div>
          </ActionForm>
        </div>
        <div className="card">
          <h2>Étape B · Exercices et contrôle blanc</h2>
          <p className="small muted">Lancez de préférence après l'étape A, pour que les questions soient rattachées aux notions.</p>
          <ActionForm action={generateAction} submitLabel="Générer les exercices" pendingLabel="Génération en cours (1 à 3 minutes)…">
            <input type="hidden" name="evaluationId" value={id} /><input type="hidden" name="what" value="questions" />
            {docPicker}
            <div className="row">
              <div className="field"><label htmlFor="memorize">Mémorisation</label><input id="memorize" name="memorize" type="number" defaultValue={8} min={0} max={20} style={{ width: 100 }} /></div>
              <div className="field"><label htmlFor="practice">Entraînement</label><input id="practice" name="practice" type="number" defaultValue={12} min={0} max={30} style={{ width: 100 }} /></div>
              <div className="field"><label htmlFor="exam">Contrôle blanc</label><input id="exam" name="exam" type="number" defaultValue={8} min={3} max={20} style={{ width: 100 }} /></div>
            </div>
          </ActionForm>
        </div>
      </div>
      <div className="card">
        <h2>Historique des générations</h2>
        {gens.length === 0 ? <p className="muted">Aucune génération.</p> : (
          <div className="table-wrap"><table><thead><tr><th>Date</th><th>Type</th><th>Résultat</th></tr></thead><tbody>
            {gens.map((g) => {
              const s = g.summary as any;
              return (
                <tr key={g.id}>
                  <td>{dateTimeFr(g.createdAt)}</td>
                  <td>{g.kind === "ANALYSIS" ? "Analyse + fiche + flashcards" : "Exercices + contrôle blanc"}<div className="small muted">{g.model}</div></td>
                  <td className="small">
                    {g.status === "ERROR" && <span className="badge badge-ko">Erreur : {g.error}</span>}
                    {g.status === "RUNNING" && <span className="badge badge-warn">En cours</span>}
                    {g.status === "DONE" && g.kind === "ANALYSIS" && <>{s?.notions} notions, {s?.memo} blocs, {s?.flashcards} cartes.{s?.documents?.map((d: any) => <div key={d.title}>📄 {d.title} : lecture {d.readingQuality}{d.issues.length ? ` — ⚠ ${d.issues.join(" ; ")}` : ""}</div>)}</>}
                    {g.status === "DONE" && g.kind === "EXERCISES" && <>{s?.created} questions créées.{s?.rejected?.length ? <div>⚠ {s.rejected.length} question(s) écartée(s) car incomplètes : {s.rejected.join(" ; ")}</div> : null}</>}
                  </td>
                </tr>
              );
            })}
          </tbody></table></div>
        )}
        <p className="small muted">Modèle utilisé : {AI_MODEL}. <Link href={`/admin/evaluations/${id}/fiche`}>Relire et valider les contenus →</Link></p>
      </div>
    </div>
  );
}
