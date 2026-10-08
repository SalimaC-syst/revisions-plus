import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ActionForm } from "@/components/forms/ActionForm";
import { dataRequestAction } from "@/app/actions/parent";
import { dateFr } from "@/lib/format";

export const metadata = { title: "Mes données" };

export default async function Page() {
  const parent = await requireUser(["PARENT"]);
  const requests = await prisma.dataRequest.findMany({ where: { userId: parent.id }, orderBy: { createdAt: "desc" } });
  return (
    <div className="stack">
      <h1>Mes données et demandes</h1>
      <div className="card">
        <p>Vous pouvez télécharger à tout moment les données de votre enfant depuis sa page de progression. Pour toute autre demande (rectification, suppression du compte, résiliation pour motif légitime), écrivez-nous ici.</p>
        <ActionForm action={dataRequestAction} submitLabel="Envoyer la demande" resetOnSuccess>
          <div className="field"><label htmlFor="type">Type de demande</label>
            <select id="type" name="type"><option value="ACCESS">Accès à mes données</option><option value="RECTIFICATION">Rectification ou autre demande</option><option value="DELETION">Suppression de mon compte et de ceux de mes enfants</option></select>
          </div>
          <div className="field"><label htmlFor="message">Précisions</label><textarea id="message" name="message" maxLength={2000} /></div>
        </ActionForm>
      </div>
      {requests.length > 0 && (
        <div className="card"><h2>Mes demandes</h2>
          <ul>{requests.map((r) => <li key={r.id}>{dateFr(r.createdAt)} · {{ ACCESS: "Accès", DELETION: "Suppression", RECTIFICATION: "Rectification / autre" }[r.type]} · {{ OPEN: "en cours", DONE: "traitée", REJECTED: "refusée" }[r.status]}{r.response ? ` — ${r.response}` : ""}</li>)}</ul>
        </div>
      )}
    </div>
  );
}
