"use client";
import { useState, useTransition } from "react";
import { markLearnDone } from "@/app/actions/student";

export function LearnDoneButton({ evaluationId, done }: { evaluationId: string; done: boolean }) {
  const [isDone, setDone] = useState(done);
  const [xp, setXp] = useState(0);
  const [pending, start] = useTransition();
  if (isDone) return <span className="badge badge-ok">✔ Fiche lue{xp ? ` · +${xp} XP` : ""}</span>;
  return <button className="btn" disabled={pending} onClick={() => start(async () => { const r = await markLearnDone(evaluationId); setXp(r.xpGained); setDone(true); })}>J'ai lu et compris la fiche</button>;
}
