import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { startSubscriptionAction } from "@/app/actions/parent";
import { ActionForm } from "@/components/forms/ActionForm";
import { stripeMode } from "@/lib/stripe";
import { euros } from "@/lib/format";
import { getSetting } from "@/lib/settings";

export const metadata = { title: "Choisir un abonnement" };

export default async function Page({ params }: { params: Promise<{ studentId: string }> }) {
  const parent = await requireUser(["PARENT"]);
  const { studentId } = await params;
  const child = await prisma.user.findFirst({ where: { id: studentId, parentId: parent.id } });
  if (!child) notFound();
  const plans = await prisma.plan.findMany({ where: { active: true }, orderBy: { order: "asc" } });
  const mode = stripeMode();
  const f = await getSetting("features");
  return (
    <div className="stack">
      <h1>Abonnement de {child.firstName}</h1>
      {mode === "off" && <div className="alert alert-warn">Le paiement en ligne n'est pas encore ouvert : le compte marchand de l'établissement n'est pas connecté. Contactez l'établissement pour obtenir un accès.</div>}
      {mode === "test" && <div className="alert alert-info">Mode test : aucun paiement réel ne sera effectué. Utilisez la carte de test 4242 4242 4242 4242.</div>}
      <div className="grid-2">
        {plans.map((p) => (
          <div className="card" key={p.id}>
            <h2>{p.name}</h2>
            <p><span className="score-big" style={{ fontSize: "2.2rem" }}>{euros(p.priceCents)}</span> <span className="muted">/ mois</span></p>
            {p.commitmentMonths > 0 && <p><span className="badge badge-brand">Engagement {p.commitmentMonths} mois · total {euros(p.priceCents * p.commitmentMonths)}</span></p>}
            <p>{p.description}</p>
            <p className="small muted" style={{ whiteSpace: "pre-line" }}>{p.terms}</p>
            {mode !== "off" && (
              <ActionForm action={startSubscriptionAction} submitLabel={`Payer ${euros(p.priceCents)} et activer`} pendingLabel="Redirection vers le paiement sécurisé…">
                <input type="hidden" name="studentId" value={child.id} />
                <input type="hidden" name="planId" value={p.id} />
                <div className="field"><label className="check"><input type="checkbox" name="cgv" required /> <span>J'accepte les <Link href="/cgv" target="_blank">conditions générales de vente</Link>, y compris les modalités de résiliation{p.commitmentMonths > 0 ? ` et l'engagement de ${p.commitmentMonths} mois` : ""}.</span></label></div>
                <div className="field"><label className="check"><input type="checkbox" name="waiver" /> <span className="small">Je demande l'accès immédiat et je reconnais perdre mon droit de rétractation de {f.withdrawalDays} jours dès le début de l'accès. <em>Sans cette case, l'accès s'ouvrira à l'issue du délai de rétractation.</em></span></label></div>
              </ActionForm>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
