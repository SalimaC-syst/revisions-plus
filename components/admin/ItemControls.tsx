import { setItemStatusAction, deleteItemAction, moveItemAction } from "@/app/actions/admin";
import { ConfirmButton } from "@/components/ConfirmButton";

export function StatusBadge({ status, sourceRef, source }: { status: string; sourceRef?: string | null; source?: string }) {
  return (
    <span className="row" style={{ gap: 6 }}>
      <span className={`badge ${status === "VALIDATED" ? "badge-ok" : "badge-warn"}`}>{status === "VALIDATED" ? "Validé" : "Brouillon"}</span>
      {source === "AI" && <span className="badge badge-brand">IA</span>}
      {source === "LEGACY" && <span className="badge">Ancien site</span>}
      {sourceRef?.includes("à vérifier") && <span className="badge badge-ko">⚠ à vérifier</span>}
    </span>
  );
}

export function ItemControls({ kind, id, status, movable = true }: { kind: "learnBlock" | "flashcard" | "question" | "mockExam"; id: string; status: string; movable?: boolean }) {
  return (
    <div className="row" style={{ gap: 6 }}>
      <form action={setItemStatusAction}>
        <input type="hidden" name="kind" value={kind} /><input type="hidden" name="id" value={id} />
        <input type="hidden" name="status" value={status === "VALIDATED" ? "DRAFT" : "VALIDATED"} />
        <button className={`btn btn-sm ${status === "VALIDATED" ? "btn-ghost" : ""}`}>{status === "VALIDATED" ? "Repasser en brouillon" : "✓ Valider"}</button>
      </form>
      {movable && kind !== "mockExam" && (
        <>
          <form action={moveItemAction}><input type="hidden" name="kind" value={kind} /><input type="hidden" name="id" value={id} /><input type="hidden" name="dir" value="up" /><button className="btn btn-sm btn-ghost" aria-label="Monter">↑</button></form>
          <form action={moveItemAction}><input type="hidden" name="kind" value={kind} /><input type="hidden" name="id" value={id} /><input type="hidden" name="dir" value="down" /><button className="btn btn-sm btn-ghost" aria-label="Descendre">↓</button></form>
        </>
      )}
      <form action={deleteItemAction}><input type="hidden" name="kind" value={kind} /><input type="hidden" name="id" value={id} /><ConfirmButton className="btn btn-sm btn-ghost" message="Supprimer définitivement ?">Supprimer</ConfirmButton></form>
    </div>
  );
}
