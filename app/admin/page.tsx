import Link from "next/link";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { euros } from "@/lib/format";
import { subscriptionGrantsAccess } from "@/lib/access";

export const metadata = { title: "Administration" };

export default async function Page() {
  await requirePermission("stats.view");
  const since30 = new Date(Date.now() - 30 * 86400_000);
  const since7 = new Date(Date.now() - 7 * 86400_000);
  const [students, active7, answers30, subs, paid30, topEvals, mockAvg, byNotion] = await Promise.all([
    prisma.user.count({ where: { role: "STUDENT" } }),
    prisma.xpEvent.groupBy({ by: ["userId"], where: { createdAt: { gte: since7 } } }),
    prisma.answer.count({ where: { createdAt: { gte: since30 } } }),
    prisma.subscription.findMany({ include: { plan: true } }),
    prisma.payment.aggregate({ where: { status: { in: ["PAID", "PARTIALLY_REFUNDED"] }, createdAt: { gte: since30 } }, _sum: { amountCents: true, refundedCents: true }, _count: true }),
    prisma.attempt.groupBy({ by: ["evaluationId"], _count: { _all: true }, orderBy: { _count: { evaluationId: "desc" } }, take: 5 }),
    prisma.attempt.aggregate({ where: { kind: "MOCK_EXAM", scoreOn20: { not: null } }, _avg: { scoreOn20: true }, _count: true }),
    prisma.$queryRaw<{ name: string; title: string; rate: number; n: bigint }[]>`
      SELECT n.name, e.title, AVG(CASE WHEN a."maxPoints" > 0 THEN a."pointsAwarded" / a."maxPoints" END)::float AS rate, COUNT(*) AS n
      FROM "Answer" a JOIN "Question" q ON q.id = a."questionId" JOIN "Notion" n ON n.id = q."notionId" JOIN "Evaluation" e ON e.id = q."evaluationId"
      WHERE a."pointsAwarded" IS NOT NULL GROUP BY n.id, n.name, e.title HAVING COUNT(*) >= 3 ORDER BY rate ASC LIMIT 8`,
  ]);
  const evals = await prisma.evaluation.findMany({ where: { id: { in: topEvals.map((t) => t.evaluationId) } }, include: { subject: { include: { gradeLevel: true } } } });
  const activeSubs = subs.filter((s) => subscriptionGrantsAccess(s));
  const failing = subs.filter((s) => s.status === "PAST_DUE").length;
  return (
    <div className="stack">
      <h1>Tableau de bord</h1>
      <div className="grid">
        <div className="card"><div className="kpi">{students}</div><p className="muted">comptes élèves</p></div>
        <div className="card"><div className="kpi">{active7.length}</div><p className="muted">élèves actifs (7 jours)</p></div>
        <div className="card"><div className="kpi">{answers30}</div><p className="muted">réponses à des exercices (30 jours)</p></div>
        <div className="card"><div className="kpi">{activeSubs.length}</div><p className="muted">accès actifs ({activeSubs.filter((s) => s.manualGrant).length} accordés manuellement)</p></div>
        <div className="card"><div className="kpi">{euros((paid30._sum.amountCents ?? 0) - (paid30._sum.refundedCents ?? 0))}</div><p className="muted">encaissé sur 30 jours ({paid30._count} paiements)</p></div>
        <div className="card"><div className="kpi">{failing}</div><p className="muted">abonnement(s) en échec de paiement</p></div>
      </div>
      <div className="grid-2">
        <div className="card">
          <h2>Évaluations les plus travaillées</h2>
          {topEvals.length === 0 ? <p className="muted">Pas encore d'activité.</p> : (
            <ol>{topEvals.map((t) => { const e = evals.find((x) => x.id === t.evaluationId); return <li key={t.evaluationId}><Link href={`/admin/evaluations/${t.evaluationId}`}>{e?.subject.gradeLevel.name} · {e?.subject.name} · {e?.title}</Link> — {t._count._all} séances</li>; })}</ol>
          )}
        </div>
        <div className="card">
          <h2>Progression pédagogique agrégée</h2>
          <p>Moyenne aux contrôles blancs : <strong>{mockAvg._avg.scoreOn20 !== null ? `${mockAvg._avg.scoreOn20.toFixed(1)}/20` : "—"}</strong> ({mockAvg._count} copies)</p>
          <h3>Notions les moins réussies</h3>
          {byNotion.length === 0 ? <p className="muted">Données insuffisantes.</p> : <ul>{byNotion.map((n) => <li key={n.name + n.title}>{n.name} <span className="muted small">({n.title})</span> : {Math.round(n.rate * 100)} % de réussite</li>)}</ul>}
          <p className="small muted">Données agrégées, sans identification des élèves.</p>
        </div>
      </div>
    </div>
  );
}
