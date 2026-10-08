import Link from "next/link";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { dateFr } from "@/lib/format";

export const metadata = { title: "Évaluations" };

const STATUS = { DRAFT: ["Brouillon", "badge-warn"], PUBLISHED: ["Publiée", "badge-ok"], ARCHIVED: ["Archivée", ""] } as const;

export default async function Page({ searchParams }: { searchParams: Promise<{ statut?: string; matiere?: string }> }) {
  const user = await requirePermission("pedagogy.edit");
  const sp = await searchParams;
  const subjectFilter = user.role === "TEACHER" ? { in: user.teacherSubjects.map((t) => t.subjectId) } : sp.matiere || undefined;
  const evals = await prisma.evaluation.findMany({
    where: { subjectId: subjectFilter as any, status: (sp.statut as any) || { not: "ARCHIVED" } },
    include: { subject: { include: { gradeLevel: true } }, _count: { select: { questions: true, flashcards: true, learnBlocks: true, documents: true } } },
    orderBy: [{ examDate: "asc" }, { createdAt: "desc" }],
  });
  const subjects = await prisma.subject.findMany({ include: { gradeLevel: true }, orderBy: [{ gradeLevel: { order: "asc" } }, { order: "asc" }] });
  return (
    <div className="stack">
      <div className="spread"><h1 style={{ margin: 0 }}>Évaluations</h1><Link className="btn" href="/admin/evaluations/nouvelle">+ Nouvelle évaluation</Link></div>
      <form className="row" method="get">
        <select name="statut" defaultValue={sp.statut ?? ""} aria-label="Statut" style={{ maxWidth: 200 }}><option value="">En cours (brouillons et publiées)</option><option value="DRAFT">Brouillons</option><option value="PUBLISHED">Publiées</option><option value="ARCHIVED">Archivées</option></select>
        {user.role !== "TEACHER" && <select name="matiere" defaultValue={sp.matiere ?? ""} aria-label="Matière" style={{ maxWidth: 260 }}><option value="">Toutes les matières</option>{subjects.map((s) => <option key={s.id} value={s.id}>{s.gradeLevel.name} · {s.name}</option>)}</select>}
        <button className="btn btn-sm btn-ghost">Filtrer</button>
      </form>
      <div className="card table-wrap">
        <table>
          <thead><tr><th>Niveau · matière</th><th>Évaluation</th><th>Date</th><th>Contenus</th><th>Statut</th></tr></thead>
          <tbody>
            {evals.length === 0 && <tr><td colSpan={5} className="muted">Aucune évaluation.</td></tr>}
            {evals.map((e) => (
              <tr key={e.id}>
                <td>{e.subject.gradeLevel.name} · {e.subject.name}</td>
                <td><Link href={`/admin/evaluations/${e.id}`}>{e.title}</Link><div className="small muted">{e.schoolYear}</div></td>
                <td>{dateFr(e.examDate)}</td>
                <td className="small">{e._count.documents} doc. · {e._count.learnBlocks} blocs · {e._count.flashcards} cartes · {e._count.questions} questions</td>
                <td><span className={`badge ${STATUS[e.status][1]}`}>{STATUS[e.status][0]}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
