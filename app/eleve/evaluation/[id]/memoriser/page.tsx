import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireStudent, publishedEvaluation } from "@/lib/student";
import { FlashcardDeck } from "@/components/player/FlashcardDeck";
import { PracticeSession } from "@/components/player/PracticeSession";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireStudent();
  const { id } = await params;
  const ev = await publishedEvaluation(id);
  const cards = await prisma.flashcard.findMany({ where: { evaluationId: ev.id, status: "VALIDATED" }, orderBy: { order: "asc" }, include: { reviews: { where: { userId: user.id } } } });
  const memCount = await prisma.question.count({ where: { evaluationId: ev.id, step: "MEMORIZE", status: "VALIDATED" } });
  const now = new Date();
  return (
    <div className="stack">
      <p className="small"><Link href={`/eleve/evaluation/${ev.id}`}>← {ev.title}</Link></p>
      <h1>🧠 Étape 2 · Je mémorise</h1>
      <section className="card">
        <h2>Flashcards</h2>
        <p className="small muted">Réponds honnêtement : les cartes que tu connais reviendront plus tard, les cartes difficiles reviendront vite. Tu peux recommencer autant de fois que tu veux.</p>
        <FlashcardDeck cards={cards.map((c) => ({ id: c.id, front: c.front, back: c.back, box: c.reviews[0]?.box ?? 1, due: !c.reviews[0] || c.reviews[0].dueAt <= now }))} />
      </section>
      <section>
        <h2>Activités de mémorisation <span className="badge">{memCount}</span></h2>
        <p className="small muted">Questions rapides, associations, textes à trous, remises en ordre chronologique.</p>
        <PracticeSession evaluationId={ev.id} kind="MEMORIZE" backHref={`/eleve/evaluation/${ev.id}`} startLabel="Lancer les activités" />
      </section>
      <p><Link className="btn btn-ghost" href={`/eleve/evaluation/${ev.id}/entrainer`}>Étape 3 : je m'entraîne →</Link></p>
    </div>
  );
}
