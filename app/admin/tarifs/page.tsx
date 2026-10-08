import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { ActionForm } from "@/components/forms/ActionForm";
import { savePlanAction } from "@/app/actions/admin";

export const metadata = { title: "Tarifs" };

export default async function Page() {
  await requirePermission("billing.manage");
  const plans = await prisma.plan.findMany({ orderBy: { order: "asc" } });
  const form = (p?: (typeof plans)[number]) => (
    <ActionForm action={savePlanAction} submitLabel="Enregistrer" resetOnSuccess={!p}>
      {p && <input type="hidden" name="id" value={p.id} />}
      <div className="grid-2">
        <div className="field"><label>Nom</label><input name="name" type="text" defaultValue={p?.name} required /></div>
        <div className="field"><label>Prix mensuel TTC (€)</label><input name="price" type="text" inputMode="decimal" defaultValue={p ? (p.priceCents / 100).toFixed(2) : ""} required /></div>
        <div className="field"><label>Engagement (mois, 0 = sans engagement)</label><input name="commitmentMonths" type="number" min={0} max={24} defaultValue={p?.commitmentMonths ?? 0} /></div>
        <div className="field"><label className="check"><input type="checkbox" name="active" defaultChecked={p?.active ?? true} /> Proposée à la souscription</label></div>
      </div>
      <div className="field"><label>Description</label><textarea name="description" defaultValue={p?.description} rows={2} /></div>
      <div className="field"><label>Modalités affichées (résiliation, échéance, renouvellement)</label><textarea name="terms" defaultValue={p?.terms} rows={4} /></div>
    </ActionForm>
  );
  return (
    <div className="stack">
      <h1>Tarifs</h1>
      <p className="muted">Les prix se modifient ici, sans intervention technique. Un changement de prix s'applique aux nouvelles souscriptions ; les abonnements en cours conservent leur prix.</p>
      {plans.map((p) => <div className="card" key={p.id}><h2>{p.name}</h2>{form(p)}</div>)}
      <details className="card"><summary>+ Nouvelle formule</summary>{form()}</details>
    </div>
  );
}
