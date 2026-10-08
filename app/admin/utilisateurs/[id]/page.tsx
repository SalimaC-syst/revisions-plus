import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { ActionForm } from "@/components/forms/ActionForm";
import { updateUserAction, eraseFamilyAction } from "@/app/actions/admin";
import { ROLE_LABELS, type RoleName } from "@/lib/roles";
import { ConfirmButton } from "@/components/ConfirmButton";
import { dateFr } from "@/lib/format";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requirePermission("users.manage");
  const { id } = await params;
  const u = await prisma.user.findUnique({ where: { id }, include: { children: true, parent: true, teacherSubjects: true, consents: { orderBy: { createdAt: "desc" } }, subscriptionsPaid: { include: { student: true, plan: true } } } });
  if (!u) notFound();
  const subjects = u.role === "TEACHER" ? await prisma.subject.findMany({ include: { gradeLevel: true }, orderBy: [{ gradeLevel: { order: "asc" } }, { order: "asc" }] }) : [];
  return (
    <div className="stack">
      <p className="small"><Link href="/admin/utilisateurs">Utilisateurs</Link></p>
      <h1>{u.firstName} {u.lastName} <span className="badge">{ROLE_LABELS[u.role as RoleName]}</span></h1>
      <div className="grid-2">
        <div className="card">
          <p className="small">Identifiant : <strong>{u.email ?? u.username}</strong> · créé le {dateFr(u.createdAt)} · dernière connexion : {dateFr(u.lastLoginAt) || "jamais"}</p>
          {u.parent && <p className="small">Parent : <Link href={`/admin/utilisateurs/${u.parent.id}`}>{u.parent.firstName} {u.parent.lastName}</Link></p>}
          {u.children.length > 0 && <p className="small">Enfants : {u.children.map((c) => <Link key={c.id} href={`/admin/utilisateurs/${c.id}`} style={{ marginRight: 8 }}>{c.firstName}</Link>)}</p>}
          <ActionForm action={updateUserAction} submitLabel="Enregistrer">
            <input type="hidden" name="id" value={u.id} />
            <div className="field"><label htmlFor="st">Statut</label><select id="st" name="status" defaultValue={u.status}><option value="ACTIVE">Actif</option><option value="SUSPENDED">Suspendu</option></select></div>
            {["SUPER_ADMIN", "ADMIN_PEDA", "TEACHER"].includes(u.role) && (
              <div className="field"><label htmlFor="ro">Rôle</label><select id="ro" name="role" defaultValue={u.role}>
                <option value="TEACHER">Enseignant</option><option value="ADMIN_PEDA">Administrateur pédagogique</option>{admin.role === "SUPER_ADMIN" && <option value="SUPER_ADMIN">Super-administrateur</option>}
              </select></div>
            )}
            <div className="field"><label htmlFor="pw">Nouveau mot de passe <span className="hint">(laisser vide pour ne pas changer)</span></label><input id="pw" name="password" type="text" autoComplete="off" /></div>
            {u.role === "TEACHER" && (
              <fieldset className="field" style={{ border: 0, padding: 0 }}>
                <legend style={{ fontWeight: 600 }}>Matières attribuées</legend>
                <input type="hidden" name="subjects" value="" />
                <div style={{ columns: 2 }}>{subjects.map((s) => <label key={s.id} className="check small"><input type="checkbox" name="subjects" value={s.id} defaultChecked={u.teacherSubjects.some((t) => t.subjectId === s.id)} /> {s.gradeLevel.name} · {s.name}</label>)}</div>
              </fieldset>
            )}
          </ActionForm>
        </div>
        <div className="card">
          <h2>Consentements</h2>
          {u.consents.length === 0 ? <p className="muted small">Aucun.</p> : <ul className="small">{u.consents.map((c) => <li key={c.id}>{dateFr(c.createdAt)} · {c.type} ({c.version})</li>)}</ul>}
          {u.subscriptionsPaid.length > 0 && <><h2>Abonnements</h2><ul className="small">{u.subscriptionsPaid.map((s) => <li key={s.id}>{s.student.firstName} · {s.manualGrant ? "accès manuel" : s.plan.name} · {s.status}</li>)}</ul><Link href="/admin/abonnements">Gérer</Link></>}
          {u.role === "PARENT" && (
            <form action={eraseFamilyAction} style={{ marginTop: 16 }}>
              <input type="hidden" name="id" value={u.id} />
              <ConfirmButton className="btn btn-danger btn-sm" message="Effacer définitivement ce parent, ses enfants et toutes leurs données ? Les abonnements Stripe seront arrêtés. Les paiements sont conservés sans nom (obligation comptable).">Effacer la famille (RGPD)</ConfirmButton>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
