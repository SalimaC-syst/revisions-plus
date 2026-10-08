import Link from "next/link";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { ActionForm } from "@/components/forms/ActionForm";
import { createStaffAction } from "@/app/actions/admin";
import { ROLE_LABELS, type RoleName } from "@/lib/roles";
import { dateFr } from "@/lib/format";

export const metadata = { title: "Utilisateurs" };

export default async function Page({ searchParams }: { searchParams: Promise<{ role?: string; q?: string; efface?: string }> }) {
  const admin = await requirePermission("users.manage");
  const sp = await searchParams;
  const users = await prisma.user.findMany({
    where: {
      role: (sp.role as any) || undefined,
      OR: sp.q ? [{ email: { contains: sp.q, mode: "insensitive" } }, { username: { contains: sp.q, mode: "insensitive" } }, { firstName: { contains: sp.q, mode: "insensitive" } }, { lastName: { contains: sp.q, mode: "insensitive" } }] : undefined,
    },
    include: { parent: { select: { firstName: true, lastName: true } }, gradeLevel: true, _count: { select: { children: true } } },
    orderBy: { createdAt: "desc" }, take: 200,
  });
  return (
    <div className="stack">
      <h1>Utilisateurs</h1>
      {sp.efface && <div className="alert alert-ok">Les comptes de la famille ont été effacés.</div>}
      <form className="row" method="get">
        <input name="q" type="text" placeholder="Nom, e-mail ou identifiant" defaultValue={sp.q} aria-label="Recherche" style={{ maxWidth: 280 }} />
        <select name="role" defaultValue={sp.role ?? ""} aria-label="Rôle" style={{ maxWidth: 240 }}><option value="">Tous les rôles</option>{Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <button className="btn btn-sm btn-ghost">Filtrer</button>
      </form>
      <div className="card table-wrap"><table>
        <thead><tr><th>Nom</th><th>Rôle</th><th>Identifiant</th><th>Rattachement</th><th>Statut</th><th>Dernière connexion</th></tr></thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td><Link href={`/admin/utilisateurs/${u.id}`}>{u.firstName} {u.lastName}</Link></td>
              <td>{ROLE_LABELS[u.role as RoleName]}</td>
              <td className="small">{u.email ?? u.username}</td>
              <td className="small">{u.role === "STUDENT" ? `${u.gradeLevel?.name ?? ""} · parent : ${u.parent?.firstName} ${u.parent?.lastName}` : u.role === "PARENT" ? `${u._count.children} enfant(s)` : ""}</td>
              <td>{u.status === "ACTIVE" ? <span className="badge badge-ok">Actif</span> : <span className="badge badge-ko">Suspendu</span>}</td>
              <td className="small">{dateFr(u.lastLoginAt)}</td>
            </tr>
          ))}
        </tbody>
      </table></div>
      <div className="card">
        <h2>Créer un compte</h2>
        <p className="small muted">Pour le personnel (enseignants, administrateurs) ou un parent inscrit par l'établissement. Les élèves sont créés par leurs parents.</p>
        <ActionForm action={createStaffAction} submitLabel="Créer le compte" resetOnSuccess>
          <div className="grid-2">
            <div className="field"><label htmlFor="fn">Prénom</label><input id="fn" name="firstName" type="text" required /></div>
            <div className="field"><label htmlFor="ln">Nom</label><input id="ln" name="lastName" type="text" required /></div>
            <div className="field"><label htmlFor="em">E-mail</label><input id="em" name="email" type="email" required /></div>
            <div className="field"><label htmlFor="ro">Rôle</label><select id="ro" name="role">
              <option value="TEACHER">Enseignant</option><option value="ADMIN_PEDA">Administrateur pédagogique</option>
              {admin.role === "SUPER_ADMIN" && <option value="SUPER_ADMIN">Super-administrateur</option>}<option value="PARENT">Parent</option>
            </select></div>
            <div className="field"><label htmlFor="pw">Mot de passe provisoire</label><input id="pw" name="password" type="text" required minLength={10} autoComplete="off" /></div>
          </div>
        </ActionForm>
      </div>
    </div>
  );
}
