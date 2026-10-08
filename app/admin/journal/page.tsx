import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { dateTimeFr } from "@/lib/format";

export const metadata = { title: "Journal" };

export default async function Page() {
  await requirePermission("audit.view");
  const [logs, errors] = await Promise.all([
    prisma.auditLog.findMany({ include: { actor: { select: { firstName: true, lastName: true } } }, orderBy: { createdAt: "desc" }, take: 200 }),
    prisma.errorLog.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
  ]);
  return (
    <div className="stack">
      <h1>Journal des opérations</h1>
      <div className="card table-wrap"><table>
        <thead><tr><th>Date</th><th>Auteur</th><th>Action</th><th>Objet</th><th>Détails</th></tr></thead>
        <tbody>{logs.map((l) => <tr key={l.id}><td className="small">{dateTimeFr(l.createdAt)}</td><td>{l.actor ? `${l.actor.firstName} ${l.actor.lastName}` : "—"}</td><td><code>{l.action}</code></td><td className="small">{l.entity} {l.entityId?.slice(-6)}</td><td className="small" style={{ maxWidth: 360, overflowWrap: "anywhere" }}>{l.details ? JSON.stringify(l.details).slice(0, 200) : ""}</td></tr>)}</tbody>
      </table></div>
      <h2>Erreurs techniques récentes</h2>
      <div className="card table-wrap"><table>
        <thead><tr><th>Date</th><th>Page</th><th>Message</th></tr></thead>
        <tbody>{errors.length === 0 ? <tr><td colSpan={3} className="muted">Aucune erreur enregistrée.</td></tr> : errors.map((e) => <tr key={e.id}><td className="small">{dateTimeFr(e.createdAt)}</td><td className="small">{e.path}</td><td className="small">{e.message}</td></tr>)}</tbody>
      </table></div>
    </div>
  );
}
