import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireStudent, publishedEvaluation } from "@/lib/student";
import { PracticeSession } from "@/components/player/PracticeSession";
import { TYPE_LABELS, type QType } from "@/lib/questions";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  await requireStudent();
  const { id } = await params;
  const ev = await publishedEvaluation(id);
  const types = await prisma.question.groupBy({ by: ["type"], where: { evaluationId: ev.id, step: "PRACTICE", status: "VALIDATED" }, _count: true });
  return (
    <div className="stack">
      <p className="small"><Link href={`/eleve/evaluation/${ev.id}`}>← {ev.title}</Link></p>
      <h1>✏️ Étape 3 · Je m'entraîne</h1>
      <p className="muted">Après chaque réponse, tu vois la correction, l'explication et la méthode. Tu peux réessayer autant de fois que tu veux.</p>
      <p className="small">{types.map((t) => `${TYPE_LABELS[t.type as QType]} (${t._count})`).join(" · ")}</p>
      <PracticeSession evaluationId={ev.id} kind="PRACTICE" backHref={`/eleve/evaluation/${ev.id}`} startLabel="Commencer l'entraînement" />
      <p><Link className="btn btn-ghost" href={`/eleve/evaluation/${ev.id}/controle`}>Étape 4 : mon contrôle blanc →</Link></p>
    </div>
  );
}
