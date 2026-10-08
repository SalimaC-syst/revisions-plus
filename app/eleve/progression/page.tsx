import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireStudent } from "@/lib/student";
import { evaluationProgress, studentEvaluations } from "@/lib/progress";
import { notionMastery, recommendation } from "@/lib/mastery";
import { BADGES, levelFor, totalXp, streak } from "@/lib/gamification";
import { ProgressBar } from "@/components/ProgressBar";
import { dateFr, note20 } from "@/lib/format";

export const metadata = { title: "Ma progression" };

export default async function Page() {
  const user = await requireStudent();
  const xp = await totalXp(user.id);
  const lv = levelFor(xp);
  const st = await streak(user.id);
  const evals = await studentEvaluations(user.gradeLevelId);
  const badges = await prisma.userBadge.findMany({ where: { userId: user.id } });
  const exercises = await prisma.answer.count({ where: { userId: user.id } });
  const mocks = await prisma.attempt.findMany({ where: { userId: user.id, kind: "MOCK_EXAM", status: { not: "IN_PROGRESS" } }, include: { evaluation: { include: { subject: true } } }, orderBy: { submittedAt: "asc" } });
  const graded = mocks.filter((m) => m.scoreOn20 !== null);
  const rows = await Promise.all(evals.map(async (e) => {
    const p = await evaluationProgress(user.id, e.id);
    const m = await notionMastery(user.id, e.id);
    return { e, p, m, rec: recommendation(m) };
  }));
  const upcoming = rows.filter((r) => !r.e.examDate || r.e.examDate >= new Date(Date.now() - 86400_000));
  const mastered = rows.flatMap((r) => r.m.filter((x) => x.level === "maitrise").map((x) => `${x.name} (${r.e.subject.name})`));
  const toWork = rows.flatMap((r) => r.m.filter((x) => x.level === "a_retravailler" || x.level === "en_cours").map((x) => ({ name: x.name, ev: r.e })));
  return (
    <div className="stack">
      <h1>Ma progression</h1>
      <div className="grid">
        <div className="card">
          <div className="kpi">Niveau {lv.level}</div>
          <p className="muted">{lv.name}</p>
          <ProgressBar value={(lv.current / lv.needed) * 100} label="Vers le niveau suivant" accent />
          <p className="small">{lv.needed - lv.current} XP avant le niveau {lv.level + 1}</p>
        </div>
        <div className="card"><div className="kpi">🔥 {st}</div><p className="muted">jour(s) de révision d'affilée</p></div>
        <div className="card"><div className="kpi">{exercises}</div><p className="muted">réponses à des exercices</p></div>
        <div className="card"><div className="kpi">{graded.length}</div><p className="muted">contrôle(s) blanc(s) corrigé(s)</p></div>
      </div>

      <div className="card">
        <h2>Mes évaluations à venir</h2>
        {upcoming.length === 0 && <p className="muted">Aucune pour l'instant.</p>}
        {upcoming.map(({ e, p, rec }) => (
          <div className="item" key={e.id}>
            <div className="spread"><Link href={`/eleve/evaluation/${e.id}`}><strong>{e.subject.icon} {e.subject.name} · {e.title}</strong></Link><span className="small muted">{e.examDate ? dateFr(e.examDate) : ""}</span></div>
            <ProgressBar value={p.percent} label={`Progression ${e.title}`} />
            <p className="small" style={{ margin: "6px 0 0" }}>{p.percent} % · fiche {p.learnDone ? "lue" : "à lire"} · {p.flashMastered}/{p.flashTotal} cartes · {p.practiceDone}/{p.practiceTotal} exercices · contrôle blanc : {note20(p.bestScore)}</p>
            {rec && <p className="small" style={{ margin: "4px 0 0" }}>💡 {rec.text}</p>}
          </div>
        ))}
      </div>

      <div className="grid-2">
        <div className="card">
          <h2>✅ Notions maîtrisées</h2>
          {mastered.length ? <ul>{mastered.map((m) => <li key={m}>{m}</li>)}</ul> : <p className="muted">Continue tes révisions : elles apparaîtront ici.</p>}
        </div>
        <div className="card">
          <h2>🔁 À retravailler</h2>
          {toWork.length ? <ul>{toWork.map((t) => <li key={t.ev.id + t.name}>{t.name} · <Link href={`/eleve/renforcement/${t.ev.id}`}>m'entraîner</Link></li>)}</ul> : <p className="muted">Rien à signaler pour l'instant. 👏</p>}
        </div>
      </div>

      <div className="card">
        <h2>📈 Mes notes aux contrôles blancs</h2>
        {graded.length === 0 ? <p className="muted">Tu n'as pas encore de note. Lance un contrôle blanc depuis une évaluation.</p> : <ScoreChart points={graded.map((m) => ({ label: dateFr(m.submittedAt, { day: "numeric", month: "short" }), score: m.scoreOn20!, title: `${m.evaluation.subject.name} · ${m.evaluation.title}` }))} />}
      </div>

      <div className="card">
        <h2>🏅 Mes badges</h2>
        <div className="grid">
          {Object.entries(BADGES).map(([code, b]) => {
            const has = badges.some((x) => x.code === code);
            return (
              <div key={code} className="item" style={{ opacity: has ? 1 : 0.45 }}>
                <div style={{ fontSize: "1.8rem" }} aria-hidden="true">{b.icon}</div>
                <strong>{b.name}</strong>
                <p className="small muted" style={{ margin: 0 }}>{has ? b.description : `À débloquer : ${b.description.toLowerCase()}`}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ScoreChart({ points }: { points: { label: string; score: number; title: string }[] }) {
  const w = 640, h = 220, pad = 34;
  const x = (i: number) => pad + (points.length === 1 ? (w - 2 * pad) / 2 : (i * (w - 2 * pad)) / (points.length - 1));
  const y = (s: number) => h - pad - (s / 20) * (h - 2 * pad);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%" }} role="img" aria-label={`Évolution des notes : ${points.map((p) => `${p.label} ${p.score}/20`).join(", ")}`}>
      {[0, 5, 10, 15, 20].map((g) => <g key={g}><line x1={pad} x2={w - pad} y1={y(g)} y2={y(g)} stroke="#e5e1d8" /><text x={4} y={y(g) + 4} fontSize="11" fill="#666">{g}</text></g>)}
      <polyline fill="none" stroke="var(--brand)" strokeWidth="3" points={points.map((p, i) => `${x(i)},${y(p.score)}`).join(" ")} />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(p.score)} r="6" fill="var(--accent)" stroke="#fff" strokeWidth="2"><title>{p.title} : {p.score}/20</title></circle>
          <text x={x(i)} y={h - 10} fontSize="11" textAnchor="middle" fill="#666">{p.label}</text>
        </g>
      ))}
    </svg>
  );
}
