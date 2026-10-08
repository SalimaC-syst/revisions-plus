import Link from "next/link";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { ActionForm } from "@/components/forms/ActionForm";
import { grantAccessAction, setSubscriptionStatusAction, refundAction } from "@/app/actions/admin";
import { ConfirmButton } from "@/components/ConfirmButton";
import { dateFr, euros } from "@/lib/format";
import { stripeMode } from "@/lib/stripe";

export const metadata = { title: "Abonnements et paiements" };

export default async function Page() {
  await requirePermission("billing.manage");
  const [subs, payments, students] = await Promise.all([
    prisma.subscription.findMany({ where: { NOT: { status: "PENDING", stripeSubscriptionId: null } }, include: { student: true, parent: true, plan: true }, orderBy: { createdAt: "desc" }, take: 300 }),
    prisma.payment.findMany({ include: { parent: true, subscription: { include: { student: true } } }, orderBy: { createdAt: "desc" }, take: 200 }),
    prisma.user.findMany({ where: { role: "STUDENT" }, include: { parent: true }, orderBy: { firstName: "asc" } }),
  ]);
  const mode = stripeMode();
  return (
    <div className="stack">
      <h1>Abonnements et paiements</h1>
      <div className={`alert ${mode === "live" ? "alert-ok" : "alert-warn"}`}>
        Paiement en ligne : {mode === "live" ? "connecté en production" : mode === "test" ? "mode TEST (aucun encaissement réel)" : "non connecté (aucun encaissement possible)"}.
        {mode !== "off" && <> Le détail complet des paiements est aussi disponible dans le tableau de bord Stripe.</>}
      </div>
      <div className="card">
        <h2>Abonnements</h2>
        <div className="table-wrap"><table>
          <thead><tr><th>Élève</th><th>Parent</th><th>Formule</th><th>Statut</th><th>Échéances</th><th></th></tr></thead>
          <tbody>
            {subs.length === 0 && <tr><td colSpan={6} className="muted">Aucun abonnement.</td></tr>}
            {subs.map((s) => (
              <tr key={s.id}>
                <td>{s.student.firstName} {s.student.lastName}</td>
                <td><Link href={`/admin/utilisateurs/${s.parentId}`}>{s.parent.firstName} {s.parent.lastName}</Link></td>
                <td className="small">{s.manualGrant ? `Accès manuel · ${s.manualNote ?? ""}` : `${s.plan.name} · ${euros(s.priceCents)}/mois`}</td>
                <td><span className={`badge ${s.status === "ACTIVE" ? "badge-ok" : ["PAST_DUE", "SUSPENDED"].includes(s.status) ? "badge-ko" : "badge-warn"}`}>{s.status}</span></td>
                <td className="small">{s.currentPeriodEnd && <>jusqu'au {dateFr(s.currentPeriodEnd)}<br /></>}{s.commitmentEndsAt && <>fin d'engagement {dateFr(s.commitmentEndsAt)}<br /></>}{s.cancelAtPeriodEnd && "résiliation programmée"}</td>
                <td>
                  <div className="row" style={{ gap: 4 }}>
                    {s.status !== "SUSPENDED" && s.status !== "ENDED" && <form action={setSubscriptionStatusAction}><input type="hidden" name="id" value={s.id} /><input type="hidden" name="status" value="SUSPENDED" /><ConfirmButton className="btn btn-sm btn-ghost" message="Suspendre l'accès (et les prélèvements) ?">Suspendre</ConfirmButton></form>}
                    {s.status === "SUSPENDED" && <form action={setSubscriptionStatusAction}><input type="hidden" name="id" value={s.id} /><input type="hidden" name="status" value="ACTIVE" /><button className="btn btn-sm">Réactiver</button></form>}
                    {s.status !== "ENDED" && <form action={setSubscriptionStatusAction}><input type="hidden" name="id" value={s.id} /><input type="hidden" name="status" value="ENDED" /><ConfirmButton className="btn btn-sm btn-ghost" message="Mettre fin immédiatement à cet abonnement ?">Terminer</ConfirmButton></form>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>
      </div>
      <div className="card">
        <h2>Accorder un accès sans paiement en ligne</h2>
        <p className="small muted">Pour un règlement par chèque ou virement, une bourse, ou un compte de test. L'accès est marqué « accordé par l'établissement ».</p>
        <ActionForm action={grantAccessAction} submitLabel="Accorder l'accès" className="row">
          <div className="field"><label htmlFor="stu">Élève</label><select id="stu" name="studentId">{students.map((s) => <option key={s.id} value={s.id}>{s.firstName} {s.lastName} ({s.username}) · parent {s.parent?.lastName}</option>)}</select></div>
          <div className="field"><label htmlFor="until">Jusqu'au</label><input id="until" name="until" type="date" required /></div>
          <div className="field"><label htmlFor="note">Motif</label><input id="note" name="note" type="text" placeholder="ex. règlement par chèque n°…" /></div>
        </ActionForm>
      </div>
      <div className="card">
        <h2>Paiements et remboursements</h2>
        <div className="table-wrap"><table>
          <thead><tr><th>Date</th><th>Parent · élève</th><th>Montant</th><th>Statut</th><th>Facture</th><th>Rembourser</th></tr></thead>
          <tbody>
            {payments.length === 0 && <tr><td colSpan={6} className="muted">Aucun paiement.</td></tr>}
            {payments.map((p) => (
              <tr key={p.id}>
                <td>{dateFr(p.createdAt)}</td>
                <td className="small">{p.parent ? `${p.parent.firstName} ${p.parent.lastName}` : "(compte effacé)"}{p.subscription ? ` · ${p.subscription.student.firstName}` : ""}</td>
                <td>{euros(p.amountCents)}{p.refundedCents > 0 && <div className="small muted">remboursé {euros(p.refundedCents)}</div>}</td>
                <td>{p.status}{p.failureMessage && <div className="small muted">{p.failureMessage}</div>}</td>
                <td>{p.invoiceUrl && <a href={p.invoiceUrl} rel="noopener">Voir</a>}</td>
                <td>
                  {p.status !== "FAILED" && p.refundedCents < p.amountCents && (
                    <ActionForm action={refundAction} submitLabel="Rembourser" submitClass="btn btn-sm btn-ghost" className="row" confirm="Confirmer le remboursement ? Il sera effectué sur la carte du client.">
                      <input type="hidden" name="paymentId" value={p.id} />
                      <input aria-label="Montant en euros" name="amount" type="text" inputMode="decimal" defaultValue={((p.amountCents - p.refundedCents) / 100).toFixed(2)} style={{ width: 90 }} />
                      <input aria-label="Motif" name="note" type="text" placeholder="Motif" style={{ width: 140 }} />
                    </ActionForm>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>
      </div>
    </div>
  );
}
