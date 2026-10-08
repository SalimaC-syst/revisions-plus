"use client";
import { useState, useTransition } from "react";
import { setGoal } from "@/app/actions/student";

export function GoalForm({ evaluationId, current }: { evaluationId: string; current: number | null }) {
  const [v, setV] = useState(current ?? 14);
  const [pending, start] = useTransition();
  const [ok, setOk] = useState(false);
  return (
    <form className="row" style={{ marginTop: 12 }} onSubmit={(e) => { e.preventDefault(); start(async () => { await setGoal(evaluationId, v); setOk(true); }); }}>
      <label htmlFor={`goal-${evaluationId}`} style={{ margin: 0 }}>🎯 Mon objectif :</label>
      <input id={`goal-${evaluationId}`} type="number" min={5} max={20} value={v} onChange={(e) => { setV(Number(e.target.value)); setOk(false); }} style={{ width: 90 }} />
      <span>/20</span>
      <button className="btn btn-sm" disabled={pending}>{ok ? "Enregistré ✔" : "Enregistrer"}</button>
    </form>
  );
}
