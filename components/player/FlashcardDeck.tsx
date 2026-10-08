"use client";
import { useMemo, useState, useTransition } from "react";
import { reviewFlashcard } from "@/app/actions/student";

type Card = { id: string; front: string; back: string; box: number; due: boolean };

export function FlashcardDeck({ cards }: { cards: Card[] }) {
  const ordered = useMemo(() => [...cards].sort((a, b) => Number(b.due) - Number(a.due) || a.box - b.box), [cards]);
  const [queue, setQueue] = useState(ordered.map((c) => c.id));
  const [boxes, setBoxes] = useState<Record<string, number>>(Object.fromEntries(cards.map((c) => [c.id, c.box])));
  const [flipped, setFlipped] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const byId = new Map(cards.map((c) => [c.id, c]));
  const mastered = Object.values(boxes).filter((b) => b >= 4).length;

  if (cards.length === 0) return <div className="alert alert-info">Pas encore de flashcards pour cette évaluation.</div>;
  if (queue.length === 0) {
    return (
      <div className="card" role="status">
        <h3>🎉 Paquet terminé !</h3>
        <p>{mastered} carte{mastered > 1 ? "s" : ""} maîtrisée{mastered > 1 ? "s" : ""} sur {cards.length}. Les cartes difficiles reviendront lors de tes prochaines révisions : c'est la répétition espacée.</p>
        <button className="btn" onClick={() => { setQueue(ordered.map((c) => c.id)); setFlipped(false); }}>Revoir tout le paquet</button>
      </div>
    );
  }
  const card = byId.get(queue[0])!;
  const answer = (knew: boolean) => start(async () => {
    const r = await reviewFlashcard(card.id, knew);
    setBoxes((b) => ({ ...b, [card.id]: r.box }));
    setMsg(r.newBadges.length ? `Nouveau badge : ${r.newBadges.map((b) => `${b.icon} ${b.name}`).join(", ")} 🎉` : null);
    // une carte ratée revient en fin de paquet
    setQueue((q) => (knew ? q.slice(1) : [...q.slice(1), q[0]]));
    setFlipped(false);
  });
  return (
    <div>
      <div className="spread small muted" style={{ marginBottom: 10 }}>
        <span>{queue.length} carte{queue.length > 1 ? "s" : ""} restante{queue.length > 1 ? "s" : ""}</span>
        <span>Maîtrisées : {mastered} / {cards.length}</span>
      </div>
      <button type="button" className={`flashcard ${flipped ? "flipped" : ""}`} onClick={() => setFlipped(!flipped)} aria-label={flipped ? `Réponse : ${card.back}. Clique pour revoir la question.` : `${card.front}. Clique pour voir la réponse.`}>
        <span className="flashcard-in">
          <span className="flashcard-face" aria-hidden={flipped}>{card.front}</span>
          <span className="flashcard-face flashcard-back" aria-hidden={!flipped}>{card.back}</span>
        </span>
      </button>
      <p className="small muted" style={{ textAlign: "center" }}>Touche la carte pour la retourner. Boîte {boxes[card.id]} / 5.</p>
      {msg && <div className="alert alert-ok">{msg}</div>}
      <div className="row" style={{ justifyContent: "center" }}>
        {flipped ? (
          <>
            <button className="btn btn-ghost" onClick={() => answer(false)} disabled={pending}>🔁 À revoir</button>
            <button className="btn" onClick={() => answer(true)} disabled={pending}>✅ Je savais</button>
          </>
        ) : (
          <button className="btn btn-accent" onClick={() => setFlipped(true)}>Voir la réponse</button>
        )}
      </div>
    </div>
  );
}
