import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { cancelSubscriptionAction, openBillingPortalAction } from "@/app/actions/parent";
import { dateFr, euros } from "@/lib/format";
import { subscriptionGrantsAccess } from "@/lib/access";
import { stripeMode } from "@/lib/stripe";
import { ConfirmButton } from "@/components/ConfirmButton";

export const metadata = { title: "Abonnements et factures" };

const STATUS: Record<string, [string, string]> = {
  PENDING: ["En attente de paiement", "badge-warn"], ACTIVE: ["Actif", "badge-ok"], PAST_DUE: ["Paiement en échec", "badge-ko"],
  CANCELED: ["Résilié (accès jusqu'à la fin de la période)", "badge-warn"], SUSPENDED: ["Suspendu", "badge-ko"], ENDED: ["Terminé", ""],
};

export default async function Page({ searchParams }: { searchParams: Promise<{ resiliation?: string }> }) {
  const parent = await requireUser(["PARENT"]);
  const sp = await searchParams;
  const subs = await prisma.subscription.findMany({ where: { parentId: parent.id, NOT: { status: "PENDING", stripeSubscriptionId: null } }, include: { plan: true, student: true }, orderBy: { createdAt: "desc" } });
  const payments = await prisma.payment.findMany({ where: { parentId: parent.id }, orderBy: { createdAt: "desc" }, include: { subscription: { include: { student: true } } } });
  return (
    <div className="stack">
      <h1>Abonnements et factures</h1>
      {sp.resiliation && <div className="alert alert-ok" role="status">Votre demande de résiliation est enregistrée le {dateFr(new Date())}. Elle vaut accusé de réception. Aucun nouveau prélèvement ne sera effectué après la fin de la période en cours.</div>}
      {stripeMode() === "test" && <div className="alert alert-info">Mode test : les paiements affichés sont des paiements de test, sans encaissement réel.</div>}
      <div className="card">
        <h2>Abonnements</h2>
        {subs.length === 0 && <p className="muted">Aucun abonnement.</p>}
        <div className="table-wrap"><table>
          <thead><tr><th>Élève</th><th>Formule</th><th>Statut</th><th>Échéance</th><th></th></tr></thead>
          <tbody>
            {subs.map((s) => {
              const [label, cls] = STATUS[s.status];
              const canCancel = !s.manualGrant && !s.cancelAtPeriodEnd && ["ACTIVE", "PAST_DUE"].includes(s.status);
              return (
                <tr key={s.id}>
                  <td>{s.student.firstName}</td>
                  <td>{s.manualGrant ? "Accès accordé par l'établissement" : `${s.plan.name} · ${euros(s.priceCents)}/mois`}</td>
                  <td><span className={`badge ${cls}`}>{label}</span>{subscriptionGrantsAccess(s) ? "" : s.status === "ACTIVE" ? <span className="small muted"> (accès après le délai de rétractation)</span> : ""}</td>
                  <td className="small">
                    {s.currentPeriodEnd && <>Période payée jusqu'au {dateFr(s.currentPeriodEnd)}<br /></>}
                    {s.commitmentEndsAt && <>Fin de l'engagement : {dateFr(s.commitmentEndsAt)} (arrêt automatique, sans reconduction)<br /></>}
                    {s.cancelAtPeriodEnd && s.plan.commitmentMonths === 0 && <>Résiliation enregistrée</>}
                  </td>
                  <td>
                    {canCancel && s.plan.commitmentMonths === 0 && (
                      <form action={cancelSubscriptionAction}>
                        <input type="hidden" name="subscriptionId" value={s.id} />
                        <ConfirmButton className="btn btn-sm btn-ghost" message="Confirmer la résiliation ? L'accès reste ouvert jusqu'à la fin du mois payé.">Résilier mon abonnement</ConfirmButton>
                      </form>
                    )}
                    {canCancel && s.plan.commitmentMonths > 0 && <span className="small muted">Engagement en cours : arrêt automatique au terme. Résiliation anticipée pour motif légitime : <a href="/parent/donnees">nous écrire</a>.</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table></div>
        {parent.stripeCustomerId && stripeMode() !== "off" && (
          <form action={openBillingPortalAction} style={{ marginTop: 12 }}><button className="btn btn-ghost btn-sm">Mettre à jour ma carte bancaire</button></form>
        )}
      </div>
      <div className="card">
        <h2>Historique des paiements</h2>
        {payments.length === 0 && <p className="muted">Aucun paiement.</p>}
        <div className="table-wrap"><table>
          <thead><tr><th>Date</th><th>Élève</th><th>Montant</th><th>Statut</th><th>Facture</th></tr></thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id}>
                <td>{dateFr(p.createdAt)}</td>
                <td>{p.subscription?.student.firstName ?? ""}</td>
                <td>{euros(p.amountCents)}{p.refundedCents > 0 && <span className="small muted"> (remboursé : {euros(p.refundedCents)})</span>}</td>
                <td>{{ PAID: "Payé", FAILED: "Échec", REFUNDED: "Remboursé", PARTIALLY_REFUNDED: "Remboursé en partie" }[p.status]}{p.failureMessage && <div className="small muted">{p.failureMessage}</div>}</td>
                <td>{p.invoicePdf ? <a href={p.invoicePdf} rel="noopener">PDF</a> : p.invoiceUrl ? <a href={p.invoiceUrl} rel="noopener">Voir</a> : ""}</td>
              </tr>
            ))}
          </tbody>
        </table></div>
      </div>
    </div>
  );
}
