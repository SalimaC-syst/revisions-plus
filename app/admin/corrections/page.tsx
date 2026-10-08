import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { ActionForm } from "@/components/forms/ActionForm";
import { reviewAnswerAction } from "@/app/actions/admin";
import { dateTimeFr } from "@/lib/format";

export const metadata = { title: "Corrections" };

export default async function Page() {
  const user = await requirePermission("corrections.review");
  const subjectFilter = user.role === "TEACHER" ? { subjectId: { in: user.teacherSubjects.map((t) => t.subjectId) } } : {};
  const answers = await prisma.answer.findMany({
    where: { reviewStatus: { in: ["PENDING", "AI_SUGGESTED"] }, attempt: { status: "PENDING_REVIEW" }, question: { type: "OPEN", evaluation: subjectFilter } },
    include: { question: { include: { evaluation: { include: { subject: { include: { gradeLevel: true } } } } } }, user: { select: { firstName: true, lastName: true } } },
    orderBy: { createdAt: "asc" },
  });
  return (
    <div className="stack">
      <h1>Réponses rédigées à corriger ({answers.length})</h1>
      <p className="muted">Ces réponses de contrôles blancs ne sont pas notées automatiquement. La note sur 20 de l'élève s'affiche dès que vous avez validé toutes ses réponses rédigées. Une proposition de l'IA n'est qu'une aide : la note est la vôtre.</p>
      {answers.length === 0 && <div className="card"><p>Rien à corriger pour l'instant. 👍</p></div>}
      {answers.map((a) => {
        const d = a.question.data as any;
        const s = a.aiSuggestion as any;
        const suggested = s?.criteria ? Math.min(a.maxPoints, s.criteria.reduce((t: number, c: any) => t + (c.points ?? 0), 0)) : undefined;
        return (
          <div className="card" key={a.id}>
            <p className="small muted">{a.question.evaluation.subject.gradeLevel.name} · {a.question.evaluation.subject.name} · {a.question.evaluation.title} · {a.user.firstName} {a.user.lastName} · {dateTimeFr(a.createdAt)}</p>
            <p><strong>{a.question.prompt}</strong> <span className="badge">{a.maxPoints} pt</span></p>
            <div className="grid-2">
              <div><h3>Réponse de l'élève</h3><blockquote style={{ whiteSpace: "pre-line", background: "var(--surface-2)", padding: 12, borderRadius: 10, margin: 0 }}>{(a.response as any)?.text}</blockquote></div>
              <div><h3>Corrigé et critères</h3><p className="small" style={{ whiteSpace: "pre-line" }}>{d.modelAnswer}</p><ul className="small">{d.criteria.map((c: any) => <li key={c.label}>{c.label} — {c.points} pt</li>)}</ul></div>
            </div>
            {s && (
              <div className="alert alert-info small">
                <strong>Proposition de l'IA (à vérifier) :</strong>
                <ul>{s.criteria.map((c: any) => <li key={c.label}>{c.label} : {c.met} ({c.points} pt) — {c.comment}</li>)}</ul>
                <p style={{ margin: 0 }}>{s.feedback}{s.needsHumanReview ? " · L'IA signale un doute." : ""}</p>
              </div>
            )}
            <ActionForm action={reviewAnswerAction} submitLabel="Valider la correction" className="row">
              <input type="hidden" name="answerId" value={a.id} />
              <div className="field"><label htmlFor={`p-${a.id}`}>Points (sur {a.maxPoints})</label><input id={`p-${a.id}`} name="points" type="number" step="0.25" min={0} max={a.maxPoints} defaultValue={suggested} required style={{ width: 120 }} /></div>
              <div className="field" style={{ flex: 1, minWidth: 240 }}><label htmlFor={`n-${a.id}`}>Commentaire pour l'élève</label><input id={`n-${a.id}`} name="note" type="text" defaultValue={s?.feedback ?? ""} /></div>
            </ActionForm>
          </div>
        );
      })}
    </div>
  );
}
