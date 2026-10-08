import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireStudent } from "@/lib/student";
import { dateFr, daysUntil } from "@/lib/format";
import { dailyMissions } from "@/lib/gamification";
import { ProgressBar } from "@/components/ProgressBar";

export const metadata = { title: "Mes matières" };

export default async function Page() {
  const user = await requireStudent();
  const levels = await prisma.gradeLevel.findMany({
    where: { visible: true },
    orderBy: { order: "asc" },
    include: { subjects: { where: { visible: true }, orderBy: { order: "asc" }, include: { _count: { select: { evaluations: { where: { status: "PUBLISHED" } } } } } } },
  });
  // l'espace de l'élève d'abord
  levels.sort((a, b) => Number(b.id === user.gradeLevelId) - Number(a.id === user.gradeLevelId));
  const upcoming = await prisma.evaluation.findMany({
    where: { status: "PUBLISHED", examDate: { gte: new Date(Date.now() - 86400_000) }, subject: { visible: true, gradeLevelId: user.gradeLevelId ?? undefined } },
    include: { subject: true }, orderBy: { examDate: "asc" }, take: 3,
  });
  const missions = await dailyMissions(user.id);
  return (
    <div className="stack">
      <section className="hero">
        <h1>Bonjour {user.firstName} ! 👋</h1>
        {upcoming.length ? (
          <>
            <p className="muted">Ton prochain contrôle :</p>
            <h2 style={{ color: "#fff" }}>{upcoming[0].subject.icon} {upcoming[0].subject.name} · {upcoming[0].title}</h2>
            <p>{upcoming[0].examDate && `${dateFr(upcoming[0].examDate, { weekday: "long", day: "numeric", month: "long" })} · dans ${Math.max(0, daysUntil(upcoming[0].examDate))} jour(s)`}</p>
            <Link className="btn btn-accent" href={`/eleve/evaluation/${upcoming[0].id}`}>Réviser maintenant</Link>
          </>
        ) : <p className="muted">Aucun contrôle annoncé pour l'instant. Tu peux réviser librement les évaluations disponibles.</p>}
      </section>
      <div className="card">
        <h2>🎯 Missions du jour</h2>
        <div className="grid">
          {missions.map((m) => (
            <div key={m.label}>
              <p className="small" style={{ marginBottom: 4 }}>{m.done >= m.goal ? "✅ " : ""}{m.label} <span className="muted">({m.done}/{m.goal})</span></p>
              <ProgressBar value={(m.done / m.goal) * 100} label={m.label} accent />
            </div>
          ))}
        </div>
      </div>
      {levels.map((l) => (
        <section key={l.id} aria-labelledby={`lvl-${l.id}`}>
          <h2 id={`lvl-${l.id}`}>Espace {l.name} {l.id === user.gradeLevelId && <span className="badge badge-brand">ma classe</span>}</h2>
          <div className="grid">
            {l.subjects.map((s) => (
              <Link key={s.id} className="tile" href={`/eleve/matiere/${s.id}`}>
                <span className="tile-icon" style={{ background: `${s.color}22` }} aria-hidden="true">{s.icon}</span>
                <strong>{s.name}</strong>
                <p className="small muted" style={{ margin: 0 }}>{s._count.evaluations ? `${s._count.evaluations} évaluation${s._count.evaluations > 1 ? "s" : ""} à réviser` : "Bientôt disponible"}</p>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
