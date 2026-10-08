import type { Feedback } from "./types";

export function FeedbackPanel({ fb }: { fb: Feedback }) {
  const cls = fb.isCorrect === null ? "neutral" : fb.isCorrect ? "ok" : (fb.points ?? 0) > 0 ? "partial" : "ko";
  const title = fb.isCorrect === null ? "Correction guidée" : fb.isCorrect ? "✅ Bonne réponse" : (fb.points ?? 0) > 0 ? "🟡 Réponse en partie juste" : "❌ Pas tout à fait";
  return (
    <div className={`feedback ${cls}`} role="status" aria-live="polite">
      <div className="spread">
        <strong style={{ fontSize: "1.1rem" }}>{title}</strong>
        {fb.xpGained > 0 && <span className="xp-chip">+{fb.xpGained} XP</span>}
      </div>
      <p style={{ marginTop: 6 }}>{fb.encouragement}</p>
      {fb.isCorrect === false && fb.expected && <p><strong>Réponse attendue :</strong> {fb.expected}</p>}
      {fb.parts.length > 0 && fb.isCorrect === false && (
        <ul className="small">
          {fb.parts.map((p) => <li key={p.label}>{p.ok ? "✔" : "✘"} {p.label}{!p.ok && p.expected ? ` → ${p.expected}` : ""}</li>)}
        </ul>
      )}
      {fb.correction?.modelAnswer && (
        <>
          <p><strong>Corrigé du professeur :</strong></p>
          <p style={{ whiteSpace: "pre-line" }}>{fb.correction.modelAnswer}</p>
          <p className="small"><strong>Vérifie toi-même si ta réponse contient :</strong></p>
          <ul className="small">{fb.correction.criteria?.map((c) => <li key={c.label}>{c.label} ({c.points} pt)</li>)}</ul>
        </>
      )}
      {fb.explanation && <p><strong>Explication :</strong> {fb.explanation}</p>}
      {fb.method && <p><strong>🧭 Méthode à retenir :</strong> {fb.method}</p>}
      {fb.newBadges.length > 0 && <p><strong>Nouveau badge :</strong> {fb.newBadges.map((b) => `${b.icon} ${b.name}`).join(", ")} 🎉</p>}
    </div>
  );
}
