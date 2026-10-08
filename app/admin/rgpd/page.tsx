import Link from "next/link";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { handleDataRequestAction } from "@/app/actions/admin";
import { dateFr } from "@/lib/format";

export const metadata = { title: "Demandes RGPD" };

export default async function Page() {
  await requirePermission("users.manage");
  const reqs = await prisma.dataRequest.findMany({ include: { user: true }, orderBy: [{ status: "asc" }, { createdAt: "asc" }] });
  return (
    <div className="stack">
      <h1>Demandes des familles</h1>
      <p className="muted">Délai légal de réponse : un mois. Pour un effacement, ouvrez la fiche du parent puis « Effacer la famille ».</p>
      {reqs.length === 0 && <div className="card"><p>Aucune demande.</p></div>}
      {reqs.map((r) => (
        <div className="card" key={r.id}>
          <div className="spread"><strong>{{ ACCESS: "Accès", DELETION: "Suppression", RECTIFICATION: "Rectification / autre" }[r.type]} · <Link href={`/admin/utilisateurs/${r.userId}`}>{r.user.firstName} {r.user.lastName}</Link></strong><span className="small muted">{dateFr(r.createdAt)} · {r.status}</span></div>
          {r.message && <p style={{ whiteSpace: "pre-line" }}>{r.message}</p>}
          {r.status === "OPEN" && (
            <form action={handleDataRequestAction} className="row">
              <input type="hidden" name="id" value={r.id} />
              <input name="response" type="text" placeholder="Réponse visible par le parent" aria-label="Réponse" style={{ flex: 1, minWidth: 240 }} />
              <select name="status" aria-label="Statut" style={{ maxWidth: 160 }}><option value="DONE">Traitée</option><option value="REJECTED">Refusée</option></select>
              <button className="btn btn-sm">Clore</button>
            </form>
          )}
          {r.response && <p className="small">Réponse : {r.response}</p>}
        </div>
      ))}
    </div>
  );
}
