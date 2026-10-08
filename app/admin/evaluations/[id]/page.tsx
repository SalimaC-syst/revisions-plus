import { prisma } from "@/lib/db";
import { requireEvalEdit } from "@/lib/admin";
import { EvaluationForm } from "@/components/EvaluationForm";
import { ActionForm } from "@/components/forms/ActionForm";
import { saveNotionAction, deleteNotionAction } from "@/app/actions/admin";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, ev } = await requireEvalEdit(id);
  const full = await prisma.evaluation.findUniqueOrThrow({ where: { id } });
  const subjects = await prisma.subject.findMany({
    where: user.role === "TEACHER" ? { id: { in: user.teacherSubjects.map((t) => t.subjectId) } } : {},
    include: { gradeLevel: true }, orderBy: [{ gradeLevel: { order: "asc" } }, { order: "asc" }],
  });
  const notions = await prisma.notion.findMany({ where: { evaluationId: id }, orderBy: { order: "asc" }, include: { _count: { select: { questions: true, flashcards: true } } } });
  return (
    <div className="grid-2">
      <div className="card"><h2>Informations</h2><EvaluationForm ev={full} subjects={subjects} /></div>
      <div className="card">
        <h2>Notions évaluées</h2>
        <p className="small muted">Les notions servent à mesurer ce que chaque élève maîtrise et à lui proposer du renforcement ciblé. Rattachez-y les questions et flashcards.</p>
        {notions.map((n) => (
          <div key={n.id} className="row nowrap" style={{ marginBottom: 6 }}>
            <ActionForm action={saveNotionAction} submitLabel="Renommer" submitClass="btn btn-sm btn-ghost" className="row nowrap grow">
              <input type="hidden" name="evaluationId" value={ev.id} /><input type="hidden" name="id" value={n.id} />
              <input aria-label="Nom de la notion" name="name" type="text" defaultValue={n.name} />
            </ActionForm>
            <span className="small muted" style={{ whiteSpace: "nowrap" }}>{n._count.questions} q. · {n._count.flashcards} cartes</span>
            <form action={deleteNotionAction}><input type="hidden" name="id" value={n.id} /><button className="btn btn-sm btn-ghost" aria-label={`Supprimer ${n.name}`}>✕</button></form>
          </div>
        ))}
        <ActionForm action={saveNotionAction} submitLabel="Ajouter" className="row nowrap" resetOnSuccess>
          <input type="hidden" name="evaluationId" value={ev.id} />
          <input aria-label="Nouvelle notion" name="name" type="text" placeholder="ex. Repères chronologiques" />
        </ActionForm>
      </div>
    </div>
  );
}
