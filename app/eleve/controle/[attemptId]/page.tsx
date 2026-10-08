import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireStudent } from "@/lib/student";
import { gradeMockAttempt } from "@/lib/exam";
import { toPublicQuestion, type QType } from "@/lib/questions";
import { responseText, grade } from "@/lib/grading";
import { ExamRunner } from "@/components/player/ExamRunner";
import { note20 } from "@/lib/format";
import { notionMastery, recommendation } from "@/lib/mastery";
import { startMockExam } from "@/app/actions/student";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ attemptId: string }> }) {
  const user = await requireStudent();
  const { attemptId } = await params;
  let attempt = await prisma.attempt.findFirst({ where: { id: attemptId, userId: user.id, kind: "MOCK_EXAM" }, include: { mockExam: true, evaluation: true } });
  if (!attempt) notFound();
  const ids = attempt.questionIds as string[];
  const questions = await prisma.question.findMany({ where: { id: { in: ids } }, include: { notion: true } });
  const ordered = ids.map((id) => questions.find((q) => q.id === id)!).filter(Boolean);

  if (attempt.status === "IN_PROGRESS") {
    const expired = attempt.deadlineAt && Date.now() > attempt.deadlineAt.getTime() + 60_000;
    if (!expired) {
      const saved = await prisma.answer.findMany({ where: { attemptId } });
      return (
        <div className="stack">
          <h1>📝 {attempt.mockExam?.title}</h1>
          <ExamRunner attemptId={attempt.id} questions={ordered.map((q) => toPublicQuestion(q, attempt!.id))} deadline={attempt.deadlineAt?.toISOString() ?? null}
            initial={Object.fromEntries(saved.map((a) => [a.questionId, a.response]))} totalPoints={ordered.reduce((s, q) => s + q.points, 0)} />
        </div>
      );
    }
    // temps écoulé : la copie est ramassée avec les réponses enregistrées
    await gradeMockAttempt(user.id, attempt.id);
    attempt = (await prisma.attempt.findFirst({ where: { id: attemptId }, include: { mockExam: true, evaluation: true } }))!;
  }

  const answers = await prisma.answer.findMany({ where: { attemptId } });
  const rec = recommendation(await notionMastery(user.id, attempt.evaluationId));
  const missed = new Map<string, number>();
  for (const q of ordered) {
    const a = answers.find((x) => x.questionId === q.id);
    if (a && a.pointsAwarded !== null && a.pointsAwarded < q.points && q.notion) missed.set(q.notion.name, (missed.get(q.notion.name) ?? 0) + 1);
  }
  const pending = attempt.status === "PENDING_REVIEW";
  return (
    <div className="stack">
      <p className="small"><Link href={`/eleve/evaluation/${attempt.evaluationId}/controle`}>← Retour au contrôle blanc</Link></p>
      <h1>Correction · {attempt.mockExam?.title}</h1>
      <div className="card" style={{ textAlign: "center" }}>
        {pending ? (
          <>
            <p className="muted">Questions corrigées automatiquement : {attempt.autoPoints} / {(attempt.maxPoints ?? 0) - (attempt.pendingPoints ?? 0)} points</p>
            <p className="alert alert-info">Ta réponse rédigée ({attempt.pendingPoints} point{(attempt.pendingPoints ?? 0) > 1 ? "s" : ""}) doit être corrigée par ton professeur : ta note sur 20 s'affichera ici dès qu'elle sera validée. En attendant, compare ta réponse avec le corrigé ci-dessous.</p>
          </>
        ) : (
          <>
            <p className="muted">Ta note</p>
            <div className="score-big">{note20(attempt.scoreOn20)}</div>
            <p className="muted">{attempt.autoPoints} points sur {attempt.maxPoints}</p>
            <p>{(attempt.scoreOn20 ?? 0) >= 16 ? "Excellent travail ! 🎉" : (attempt.scoreOn20 ?? 0) >= 12 ? "Bon travail, tu es sur la bonne voie ! 👍" : (attempt.scoreOn20 ?? 0) >= 8 ? "Tu progresses. Regarde bien tes erreurs, elles t'indiquent quoi réviser. 💪" : "Ce contrôle blanc sert à repérer ce qu'il reste à apprendre : suis les conseils ci-dessous. 🌱"}</p>
          </>
        )}
      </div>
      {(missed.size > 0 || rec) && (
        <div className="card">
          <h2>Mes conseils de révision</h2>
          {missed.size > 0 && <p><strong>Notions à retravailler :</strong> {[...missed.keys()].join(", ")}.</p>}
          {rec && <p>💡 {rec.text}</p>}
          <div className="row">
            {rec && rec.weakIds.length > 0 && <Link className="btn" href={`/eleve/renforcement/${attempt.evaluationId}`}>Mes 5 questions de renforcement</Link>}
            <Link className="btn btn-ghost" href={`/eleve/evaluation/${attempt.evaluationId}/comprendre`}>Relire la fiche</Link>
            {attempt.mockExamId && <form action={startMockExam.bind(null, attempt.mockExamId)}><button className="btn btn-ghost">Refaire le contrôle (nouvelle version)</button></form>}
          </div>
        </div>
      )}
      <h2>Corrigé détaillé</h2>
      {ordered.map((q, i) => {
        const a = answers.find((x) => x.questionId === q.id);
        const data = q.data as any;
        const g = grade(q.type as QType, data, a?.response, q.points);
        const status = a?.pointsAwarded === null || a?.pointsAwarded === undefined ? "pending" : a.pointsAwarded >= q.points ? "ok" : a.pointsAwarded > 0 ? "partial" : "ko";
        return (
          <section className="card" key={q.id}>
            <div className="spread">
              <strong>Question {i + 1}{q.notion ? ` · ${q.notion.name}` : ""}</strong>
              <span className={`badge ${status === "ok" ? "badge-ok" : status === "ko" ? "badge-ko" : status === "partial" ? "badge-warn" : "badge-brand"}`}>
                {status === "pending" ? `En attente de correction (${q.points} pt)` : `${a!.pointsAwarded} / ${q.points} pt`}
              </span>
            </div>
            <p className="question" style={{ marginTop: 8 }}>{q.prompt}</p>
            <p><strong>Ta réponse :</strong> {responseText(q.type as QType, data, a?.response)}</p>
            {status !== "ok" && q.type !== "OPEN" && g.expected && <p><strong>Réponse attendue :</strong> {g.expected}</p>}
            {q.type === "IMAGE_POINT" && status !== "ok" && <p className="small">{g.parts.filter((p) => !p.ok).map((p) => p.label).join(", ")} : mal placé(s).</p>}
            {q.type === "OPEN" && (
              <>
                <p><strong>Corrigé :</strong> <span style={{ whiteSpace: "pre-line" }}>{data.modelAnswer}</span></p>
                <p className="small"><strong>Critères :</strong> {data.criteria.map((c: any) => `${c.label} (${c.points} pt)`).join(" ; ")}</p>
                {a?.reviewerNote && <p className="alert alert-info">👩‍🏫 {a.reviewerNote}</p>}
              </>
            )}
            {q.explanation && <p><strong>Explication :</strong> {q.explanation}</p>}
            {q.method && <p className="small"><strong>🧭 Méthode :</strong> {q.method}</p>}
          </section>
        );
      })}
    </div>
  );
}
