import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { Shell } from "@/components/Shell";
import { can, ROLE_LABELS, type RoleName } from "@/lib/roles";
import { prisma } from "@/lib/db";
import { stripeMode } from "@/lib/stripe";
import { aiConfigured } from "@/lib/ai";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const user = await requireUser(["SUPER_ADMIN", "ADMIN_PEDA", "TEACHER"]);
  const pending = await prisma.answer.count({ where: { reviewStatus: { in: ["PENDING", "AI_SUGGESTED"] }, attempt: { status: "PENDING_REVIEW" } } });
  const openReq = can(user.role, "users.manage") ? await prisma.dataRequest.count({ where: { status: "OPEN" } }) : 0;
  const r = user.role;
  return (
    <Shell nav={[]} right={<span className="small">{user.firstName} · {ROLE_LABELS[r as RoleName]}</span>}>
      <div className="admin-layout">
        <nav className="side" aria-label="Administration">
          <h4>Pédagogie</h4>
          {can(r, "stats.view") && <Link href="/admin">Tableau de bord</Link>}
          <Link href="/admin/evaluations">Évaluations</Link>
          {can(r, "pedagogy.publish") && <Link href="/admin/matieres">Niveaux et matières</Link>}
          <Link href="/admin/corrections">Corrections {pending > 0 && <span className="badge badge-warn">{pending}</span>}</Link>
          {can(r, "users.manage") && (<><h4>Familles et comptes</h4><Link href="/admin/utilisateurs">Utilisateurs</Link><Link href="/admin/rgpd">Demandes RGPD {openReq > 0 && <span className="badge badge-warn">{openReq}</span>}</Link></>)}
          {can(r, "billing.manage") && (<><h4>Ventes</h4><Link href="/admin/abonnements">Abonnements et paiements</Link><Link href="/admin/tarifs">Tarifs</Link></>)}
          {can(r, "settings.manage") && (<><h4>Établissement</h4><Link href="/admin/parametres">Paramètres</Link><Link href="/admin/journal">Journal et erreurs</Link></>)}
        </nav>
        <div>
          {can(r, "settings.manage") && (stripeMode() !== "live" || !aiConfigured()) && (
            <div className="alert alert-warn small">
              {stripeMode() === "off" && "Paiement en ligne : non connecté (aucun encaissement possible). "}
              {stripeMode() === "test" && "Paiement en ligne : mode TEST, aucun encaissement réel. "}
              {!aiConfigured() && "Génération IA : non connectée (clé API à fournir). "}
              Voir la documentation d'installation.
            </div>
          )}
          {children}
        </div>
      </div>
    </Shell>
  );
}
