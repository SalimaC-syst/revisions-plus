import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireStudent, publishedEvaluation } from "@/lib/student";
import { LearnBlockView } from "@/components/LearnBlockView";
import { LearnDoneButton } from "@/components/LearnDoneButton";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireStudent();
  const { id } = await params;
  const ev = await publishedEvaluation(id);
  const blocks = await prisma.learnBlock.findMany({ where: { evaluationId: ev.id, status: "VALIDATED" }, orderBy: { order: "asc" } });
  const done = await prisma.xpEvent.findFirst({ where: { userId: user.id, reason: `learn:${ev.id}` } });
  return (
    <div className="stack">
      <p className="small"><Link href={`/eleve/evaluation/${ev.id}`}>← {ev.title}</Link></p>
      <h1>📖 Étape 1 · Je comprends</h1>
      <p className="muted">Lis attentivement la fiche. Tout ce qui est ici vient du cours de ton professeur.</p>
      {blocks.length === 0 && <div className="card"><p>La fiche de révision n'est pas encore publiée.</p></div>}
      {blocks.map((b) => <LearnBlockView key={b.id} block={b} />)}
      {blocks.length > 0 && (
        <div className="card spread">
          <span>Tu as tout lu ? Passe à l'étape 2 pour mémoriser.</span>
          <span className="row">
            <LearnDoneButton evaluationId={ev.id} done={!!done} />
            <Link className="btn btn-ghost" href={`/eleve/evaluation/${ev.id}/memoriser`}>Étape 2 →</Link>
          </span>
        </div>
      )}
    </div>
  );
}
