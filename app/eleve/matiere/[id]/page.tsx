import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireStudent } from "@/lib/student";
import { evaluationProgress } from "@/lib/progress";
import { dateFr, note20 } from "@/lib/format";
import { ProgressBar } from "@/components/ProgressBar";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireStudent();
  const { id } = await params;
  const subject = await prisma.subject.findFirst({ where: { id, visible: true }, include: { gradeLevel: true, evaluations: { where: { status: "PUBLISHED" }, orderBy: { examDate: "asc" } } } });
  if (!subject) notFound();
  return (
    <div className="stack">
      <p className="small"><Link href="/eleve">Mes matières</Link> › {subject.gradeLevel.name}</p>
      <h1>{subject.icon} {subject.name} · {subject.gradeLevel.name}</h1>
      {subject.evaluations.length === 0 && <div className="card"><p>Aucune évaluation n'est encore disponible dans cette matière. Reviens bientôt !</p></div>}
      <div className="grid-2">
        {await Promise.all(subject.evaluations.map(async (e) => {
          const p = await evaluationProgress(user.id, e.id);
          const past = e.examDate && e.examDate < new Date(Date.now() - 86400_000);
          return (
            <Link key={e.id} href={`/eleve/evaluation/${e.id}`} className="tile">
              <div className="spread"><strong>{e.title}</strong>{past ? <span className="badge">Passée</span> : e.examDate ? <span className="badge badge-warn">{dateFr(e.examDate, { day: "numeric", month: "short" })}</span> : null}</div>
              <div style={{ margin: "10px 0 6px" }}><ProgressBar value={p.percent} label={`Progression ${e.title}`} /></div>
              <p className="small muted" style={{ margin: 0 }}>{p.percent} % · meilleure note : {note20(p.bestScore)}</p>
            </Link>
          );
        }))}
      </div>
    </div>
  );
}
