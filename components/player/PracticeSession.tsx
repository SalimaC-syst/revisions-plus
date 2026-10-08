"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { answerQuestion, finishSession, startSession } from "@/app/actions/student";
import { QuestionInput, isAnswered, initialValue } from "./QuestionInput";
import { QuestionContextView } from "./Context";
import { FeedbackPanel } from "./FeedbackPanel";
import type { Feedback, PublicQuestion } from "./types";

type Kind = "PRACTICE" | "MEMORIZE" | "REINFORCEMENT";

export function PracticeSession({ evaluationId, kind, backHref, startLabel = "Commencer" }: { evaluationId: string; kind: Kind; backHref: string; startLabel?: string }) {
  const [session, setSession] = useState<{ attemptId: string; questions: PublicQuestion[]; intro?: string } | null>(null);
  const [idx, setIdx] = useState(0);
  const [value, setValue] = useState<any>(null);
  const [fb, setFb] = useState<Feedback | null>(null);
  const [firstTry, setFirstTry] = useState<Record<string, boolean | null>>({});
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const begin = () => start(async () => {
    setError(null);
    try {
      const s = await startSession(evaluationId, kind);
      setSession(s); setIdx(0); setValue(null); setFb(null); setFirstTry({}); setDone(false);
    } catch { setError("Impossible de démarrer. Vérifie ta connexion et réessaie."); }
  });

  if (!session) {
    return (
      <div>
        {error && <div className="alert alert-ko">{error}</div>}
        <button className="btn btn-accent" onClick={begin} disabled={pending}>{pending ? "Chargement…" : startLabel}</button>
      </div>
    );
  }
  if (session.questions.length === 0) {
    return <div className="alert alert-info">Aucune activité disponible pour le moment. {kind === "REINFORCEMENT" ? "Fais d'abord quelques exercices pour que je puisse repérer ce que tu dois retravailler." : "Ton professeur n'a pas encore publié d'exercices ici."}</div>;
  }
  if (done) {
    const total = session.questions.length;
    const ok = Object.values(firstTry).filter((v) => v === true).length;
    return (
      <div className="card" role="status">
        <h2>🎉 Série terminée !</h2>
        <p>Tu as trouvé <strong>{ok} réponse{ok > 1 ? "s" : ""} sur {total}</strong> du premier coup.</p>
        <p className="muted">{ok === total ? "Parfait ! Tu peux passer à l'étape suivante." : "Chaque erreur corrigée est un progrès. Recommence la série pour ancrer ce que tu as appris."}</p>
        <div className="row">
          <button className="btn" onClick={begin} disabled={pending}>Recommencer</button>
          <Link className="btn btn-ghost" href={backHref}>Retour à l'évaluation</Link>
        </div>
      </div>
    );
  }

  const q = session.questions[idx];
  const validate = () => start(async () => {
    setError(null);
    try {
      const f = await answerQuestion(session.attemptId, q.id, value ?? initialValue(q));
      setFb(f);
      setFirstTry((m) => (q.id in m ? m : { ...m, [q.id]: f.isCorrect }));
    } catch { setError("La réponse n'a pas pu être enregistrée. Réessaie."); }
  });
  const next = () => start(async () => {
    if (idx + 1 >= session.questions.length) { await finishSession(session.attemptId); setDone(true); return; }
    setIdx(idx + 1); setValue(null); setFb(null);
  });

  return (
    <div className="card">
      {session.intro && idx === 0 && !fb && <div className="alert alert-info">💡 {session.intro}</div>}
      <div className="spread small muted" style={{ marginBottom: 8 }}>
        <span>Question {idx + 1} sur {session.questions.length}</span>
        <span>{q.points} pt{q.points > 1 ? "s" : ""}</span>
      </div>
      <div className="progress" style={{ marginBottom: 16 }} aria-hidden="true"><span style={{ width: `${(idx / session.questions.length) * 100}%` }} /></div>
      <QuestionContextView ctx={q.context} />
      <p className="question" id={`q-${q.id}`}>{q.prompt}</p>
      <QuestionInput key={q.id + (fb ? "-fb" : "")} q={q} value={value} onChange={setValue} disabled={!!fb || pending} feedback={fb} />
      {error && <div className="alert alert-ko" style={{ marginTop: 12 }}>{error}</div>}
      {fb && <FeedbackPanel fb={fb} />}
      <div className="row" style={{ marginTop: 16 }}>
        {!fb && <button className="btn" onClick={validate} disabled={pending || !isAnswered(q, value ?? initialValue(q))}>{pending ? "Vérification…" : "Valider ma réponse"}</button>}
        {fb && fb.isCorrect !== true && <button className="btn btn-ghost" onClick={() => { setFb(null); setValue(null); }}>Réessayer</button>}
        {fb && <button className="btn" onClick={next} disabled={pending}>{idx + 1 >= session.questions.length ? "Terminer" : "Question suivante"}</button>}
      </div>
    </div>
  );
}
