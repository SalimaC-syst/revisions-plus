import Link from "next/link";
import { requireStudent, publishedEvaluation } from "@/lib/student";
import { PracticeSession } from "@/components/player/PracticeSession";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  await requireStudent();
  const { id } = await params;
  const ev = await publishedEvaluation(id);
  return (
    <div className="stack">
      <p className="small"><Link href={`/eleve/evaluation/${ev.id}`}>← {ev.title}</Link></p>
      <h1>💪 Renforcement personnalisé</h1>
      <p className="muted">Cinq questions choisies pour toi, sur les notions que tu dois encore consolider.</p>
      <PracticeSession evaluationId={ev.id} kind="REINFORCEMENT" backHref={`/eleve/evaluation/${ev.id}`} startLabel="C'est parti !" />
    </div>
  );
}
