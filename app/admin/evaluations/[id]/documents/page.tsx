import { prisma } from "@/lib/db";
import { requireEvalEdit } from "@/lib/admin";
import { ActionForm } from "@/components/forms/ActionForm";
import { uploadDocumentAction, updateDocumentAction, deleteDocumentAction } from "@/app/actions/admin";
import { ConfirmButton } from "@/components/ConfirmButton";

const RIGHTS = { UNVERIFIED: "Droits non vérifiés", AUTHORIZED: "Diffusion aux élèves autorisée", INTERNAL_ONLY: "Usage interne (génération seulement)" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireEvalEdit(id);
  const docs = await prisma.document.findMany({ where: { evaluationId: id }, orderBy: { createdAt: "asc" } });
  return (
    <div className="stack">
      <div className="card">
        <h2>Importer les documents du professeur</h2>
        <p className="small muted">PDF, Word, PowerPoint, photos du cahier (JPG, PNG, WebP), texte. 25 Mo maximum par fichier. Les fichiers sont stockés hors de tout accès public.</p>
        <ActionForm action={uploadDocumentAction} submitLabel="Importer" pendingLabel="Import et lecture en cours…" resetOnSuccess>
          <input type="hidden" name="evaluationId" value={id} />
          <div className="grid-2">
            <div className="field"><label htmlFor="files">Fichiers</label><input id="files" name="files" type="file" multiple accept=".pdf,.docx,.pptx,.jpg,.jpeg,.png,.webp,.txt" /></div>
            <div className="field"><label htmlFor="url">Ou lien (Digipad, vidéo, ressource en ligne)</label><input id="url" name="url" type="url" placeholder="https://digipad.app/..." /></div>
            <div className="field"><label htmlFor="title">Titre <span className="hint">(facultatif)</span></label><input id="title" name="title" type="text" /></div>
            <div className="field"><label htmlFor="rightsStatus">Droits de diffusion</label>
              <select id="rightsStatus" name="rightsStatus" defaultValue="UNVERIFIED">{Object.entries(RIGHTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
              <span className="hint">Un document n'est montré aux élèves que si la diffusion est autorisée par son auteur (et, pour un manuel ou une œuvre de tiers, couverte par l'exception pédagogique).</span>
            </div>
          </div>
        </ActionForm>
      </div>
      {docs.length === 0 && <p className="muted">Aucun document pour l'instant.</p>}
      {docs.map((d) => (
        <div className="item" key={d.id}>
          <div className="spread">
            <strong>{d.kind === "LINK" ? "🔗" : d.mimeType?.startsWith("image/") ? "🖼" : "📄"} {d.title}</strong>
            <span className="small muted">{d.kind === "LINK" ? d.url : `${d.filename} · ${Math.round((d.size ?? 0) / 1024)} Ko`}</span>
          </div>
          {d.extractionNote && <p className={`small ${/à vérifier|partielle|mauvaise|impossible/i.test(d.extractionNote) ? "alert alert-warn" : "muted"}`} style={{ marginTop: 6 }}>Lecture : {d.extractionNote}</p>}
          {d.extractedText && <details className="small"><summary>Voir le texte extrait ({d.extractedText.length} caractères)</summary><pre style={{ whiteSpace: "pre-wrap", maxHeight: 300, overflow: "auto", background: "var(--surface-2)", padding: 10, borderRadius: 8 }}>{d.extractedText.slice(0, 20000)}</pre></details>}
          <form action={updateDocumentAction} className="row" style={{ marginTop: 8 }}>
            <input type="hidden" name="id" value={d.id} />
            <input aria-label="Titre" name="title" type="text" defaultValue={d.title} style={{ maxWidth: 260 }} />
            <select aria-label="Droits" name="rightsStatus" defaultValue={d.rightsStatus} style={{ maxWidth: 280 }}>{Object.entries(RIGHTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
            <label className="check" style={{ margin: 0 }}><input type="checkbox" name="visibleToStudents" defaultChecked={d.visibleToStudents} /> Visible par les élèves</label>
            <input aria-label="Note sur les droits" name="rightsNote" type="text" defaultValue={d.rightsNote ?? ""} placeholder="Note (accord de l'auteur, source…)" style={{ maxWidth: 260 }} />
            <button className="btn btn-sm">Enregistrer</button>
            {d.kind === "FILE" && <a className="btn btn-sm btn-ghost" href={`/api/documents/${d.id}`} target="_blank">Ouvrir</a>}
          </form>
          <form action={deleteDocumentAction} style={{ marginTop: 6 }}><input type="hidden" name="id" value={d.id} /><ConfirmButton className="btn btn-sm btn-ghost" message="Supprimer ce document ?">Supprimer</ConfirmButton></form>
        </div>
      ))}
    </div>
  );
}
