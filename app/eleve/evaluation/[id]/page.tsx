import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireStudent, publishedEvaluation } from "@/lib/student";
import { evaluationProgress } from "@/lib/progress";
import { notionMastery, recommendation, LEVEL_LABEL } from "@/lib/mastery";
import { dateFr, daysUntil, note20 } from "@/lib/format";
import { ProgressBar } from "@/components/ProgressBar";
import { GoalForm } from "@/components/GoalForm";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireStudent();
  const { id } = await params;
  const ev = await publishedEvaluation(id);
  const [p, mastery, docs, goal] = await Promise.all([
    evaluationProgress(user.id, ev.id),
    notionMastery(user.id, ev.id),
    prisma.document.findMany({ where: { evaluationId: ev.id, visibleToStudents: true, rightsStatus: "AUTHORIZED" }, orderBy: { createdAt: "asc" } }),
    prisma.studentGoal.findUnique({ where: { userId_evaluationId: { userId: user.id, evaluationId: ev.id } } }),
  ]);
  const rec = recommendation(mastery);
  const chapters = ev.chapters as string[];
  const objectives = ev.objectives as string[];
  const base = `/eleve/evaluation/${ev.id}`;
  const steps = [
    { n: 1, href: `${base}/comprendre`, icon: "📖", title: "Je comprends", status: p.learnDone ? "Fiche lue ✔" : "À lire" },
    { n: 2, href: `${base}/memoriser`, icon: "🧠", title: "Je mémorise", status: `${p.flashMastered}/${p.flashTotal} cartes maîtrisées` },
    { n: 3, href: `${base}/entrainer`, icon: "✏️", title: "Je m'entraîne", status: `${p.practiceDone}/${p.practiceTotal} exercices réussis` },
    { n: 4, href: `${base}/controle`, icon: "📝", title: "Je passe mon contrôle blanc", status: p.bestScore !== null ? `Meilleure note : ${note20(p.bestScore)}` : p.pendingReview ? "Correction en cours" : "Pas encore passé" },
  ];
  return (
    <div className="stack">
      <p className="small"><Link href="/eleve">Mes matières</Link> › <Link href={`/eleve/matiere/${ev.subjectId}`}>{ev.subject.name}</Link></p>
      <section className="hero">
        <p className="muted">{ev.subject.icon} {ev.subject.name} · {ev.subject.gradeLevel.name}</p>
        <h1 style={{ color: "#fff" }}>{ev.title}</h1>
        <p>
          {ev.examDate && <>📅 Contrôle le <strong>{dateFr(ev.examDate, { weekday: "long", day: "numeric", month: "long" })}</strong>{daysUntil(ev.examDate) >= 0 ? ` (dans ${daysUntil(ev.examDate)} jour(s))` : ""}</>}
          {ev.showTeacher && ev.teacherName && <>{ev.examDate ? " · " : ""}👩‍🏫 {ev.teacherName}</>}
        </p>
        <ProgressBar value={p.percent} label="Ma progression" accent />
        <p className="small" style={{ marginTop: 6 }}>Ma progression : {p.percent} %{goal ? ` · Mon objectif : ${goal.targetScore}/20` : ""}</p>
      </section>
      {rec && (
        <div className="alert alert-info">
          <p style={{ margin: 0 }}>💡 {rec.text}</p>
          {rec.weakIds.length > 0 && <Link className="btn btn-sm" style={{ marginTop: 8 }} href={`/eleve/renforcement/${ev.id}`}>Lancer mes 5 questions de renforcement</Link>}
        </div>
      )}
      <div className="steps">
        {steps.map((s) => (
          <Link key={s.n} href={s.href} className="tile">
            <div className="step-num" aria-hidden="true">{s.n}</div>
            <strong>{s.icon} {s.title}</strong>
            <p className="small muted" style={{ margin: 0 }}>{s.status}</p>
          </Link>
        ))}
      </div>
      <div className="grid-2">
        <div className="card">
          <h2>Ce qu'il faut savoir</h2>
          {chapters.length > 0 && <><h3>Chapitres</h3><ul>{chapters.map((c) => <li key={c}>{c}</li>)}</ul></>}
          {objectives.length > 0 && <><h3>Objectifs</h3><ul>{objectives.map((o) => <li key={o}>{o}</li>)}</ul></>}
        </div>
        <div className="card">
          <h2>Mes notions</h2>
          {mastery.length === 0 && <p className="muted">Les notions apparaîtront ici.</p>}
          <ul style={{ listStyle: "none", padding: 0 }}>
            {mastery.map((m) => (
              <li key={m.id} className="spread" style={{ padding: "6px 0", borderBottom: "1px solid var(--line)" }}>
                <span>{m.name}</span>
                <span className={`badge ${m.level === "maitrise" ? "badge-ok" : m.level === "a_retravailler" ? "badge-ko" : m.level === "en_cours" ? "badge-warn" : ""}`}>{LEVEL_LABEL[m.level]}</span>
              </li>
            ))}
          </ul>
          <GoalForm evaluationId={ev.id} current={goal?.targetScore ?? null} />
        </div>
      </div>
      {docs.length > 0 && (
        <div className="card">
          <h2>Documents du professeur</h2>
          <ul>
            {docs.map((d) => (
              <li key={d.id}>
                {d.kind === "LINK" ? <a href={d.url!} target="_blank" rel="noopener noreferrer">{d.title} ↗</a> : <a href={`/api/documents/${d.id}`} target="_blank">{d.title}</a>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
