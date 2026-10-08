"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { saveExamAnswer, submitMockExam } from "@/app/actions/student";
import { QuestionInput, isAnswered } from "./QuestionInput";
import { QuestionContextView } from "./Context";
import type { PublicQuestion } from "./types";

export function ExamRunner({ attemptId, questions, deadline, initial, totalPoints }: { attemptId: string; questions: PublicQuestion[]; deadline: string | null; initial: Record<string, any>; totalPoints: number }) {
  const [answers, setAnswers] = useState<Record<string, any>>(initial);
  const [saved, setSaved] = useState<"ok" | "saving" | "error">("ok");
  const [left, setLeft] = useState<number | null>(deadline ? new Date(deadline).getTime() - Date.now() : null);
  const [pending, start] = useTransition();
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const submitted = useRef(false);

  const submit = () => {
    if (submitted.current) return;
    submitted.current = true;
    start(async () => { await Promise.all(Object.keys(timers.current).map((id) => flush(id))); await submitMockExam(attemptId); });
  };
  const flush = async (id: string) => {
    clearTimeout(timers.current[id]); delete timers.current[id];
    setSaved("saving");
    try { await saveExamAnswer(attemptId, id, answersRef.current[id]); setSaved("ok"); } catch { setSaved("error"); }
  };
  const answersRef = useRef(answers);
  answersRef.current = answers;

  useEffect(() => {
    if (!deadline) return;
    const t = setInterval(() => {
      const ms = new Date(deadline).getTime() - Date.now();
      setLeft(ms);
      if (ms <= 0) { clearInterval(t); submit(); }
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deadline]);

  const change = (id: string, v: any) => {
    setAnswers((a) => ({ ...a, [id]: v }));
    clearTimeout(timers.current[id]);
    timers.current[id] = setTimeout(() => flush(id), 800);
  };

  const answered = questions.filter((q) => isAnswered(q, answers[q.id])).length;
  const mm = left !== null ? Math.max(0, Math.floor(left / 60000)) : 0;
  const ss = left !== null ? Math.max(0, Math.floor((left % 60000) / 1000)) : 0;

  return (
    <div>
      <div className="card" style={{ position: "sticky", top: 8, zIndex: 5, padding: "10px 16px" }}>
        <div className="spread">
          {left !== null && <span className={`timer ${left < 5 * 60000 ? "low" : ""}`} role="timer" aria-live={left < 60000 ? "assertive" : "off"}>⏱ {String(mm).padStart(2, "0")}:{String(ss).padStart(2, "0")}</span>}
          <span className="small">{answered} / {questions.length} questions répondues · barème sur {totalPoints} points, ramené sur 20</span>
          <span className="small muted" aria-live="polite">{saved === "saving" ? "Enregistrement…" : saved === "error" ? "⚠ Non enregistré, vérifie ta connexion" : "✓ Réponses enregistrées"}</span>
        </div>
      </div>
      {questions.map((q, i) => (
        <section className="card" key={q.id} aria-labelledby={`h-${q.id}`} style={{ marginTop: 16 }}>
          <div className="spread small muted"><span id={`h-${q.id}`}>Question {i + 1}</span><span>{q.points} pt{q.points > 1 ? "s" : ""}</span></div>
          <QuestionContextView ctx={q.context} />
          <p className="question">{q.prompt}</p>
          <QuestionInput q={q} value={answers[q.id]} onChange={(v) => change(q.id, v)} disabled={pending} />
        </section>
      ))}
      <div className="card" style={{ marginTop: 16 }}>
        <p>{answered < questions.length ? `Attention : ${questions.length - answered} question(s) sans réponse.` : "Tu as répondu à toutes les questions."}</p>
        <button className="btn btn-accent" disabled={pending} onClick={() => { if (window.confirm("Rendre ta copie ? Tu ne pourras plus modifier tes réponses.")) submit(); }}>{pending ? "Correction…" : "Rendre ma copie"}</button>
      </div>
    </div>
  );
}
