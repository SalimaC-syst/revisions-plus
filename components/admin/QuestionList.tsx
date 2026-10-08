import { QuestionEditor } from "./Editors";
import { ItemControls, StatusBadge } from "./ItemControls";
import { TYPE_LABELS, type QType } from "@/lib/questions";
import { grade, responseText } from "@/lib/grading";

type Q = Parameters<typeof QuestionEditor>[0]["question"] & { source: string; sourceRef: string | null; notion?: { name: string } | null };

/** Aperçu lisible de la réponse attendue, pour relecture. */
function expectedPreview(q: NonNullable<Q>) {
  const d = q.data as any;
  if (q.type === "MCQ") return d.options.map((o: string, i: number) => (d.correct.includes(i) ? `✔ ${o}` : `· ${o}`)).join("  ");
  if (q.type === "OPEN") return `Critères : ${d.criteria.map((c: any) => `${c.label} (${c.points})`).join(" ; ")}`;
  if (q.type === "IMAGE_POINT") return d.targets.map((t: any) => `${t.label} (${t.x}, ${t.y})`).join(" ; ");
  return grade(q.type as QType, d, {}, q.points).expected || responseText(q.type as QType, d, {});
}

export function QuestionList({ questions, evaluationId, notions, step, mockExams, images }: { questions: NonNullable<Q>[]; evaluationId: string; notions: { id: string; name: string }[]; step: "MEMORIZE" | "PRACTICE" | "EXAM"; mockExams?: { id: string; title: string }[]; images: { url: string; title: string }[] }) {
  return (
    <>
      {questions.map((q, i) => (
        <div key={q.id} className={`item ${q.status === "VALIDATED" ? "validated" : "draft"}`}>
          <div className="spread">
            <span className="row" style={{ gap: 6 }}><strong>{i + 1}.</strong><span className="badge">{TYPE_LABELS[q.type as QType]}</span>{q.variantGroup && <span className="badge">Variante {q.variantGroup}</span>}<span className="small muted">{q.points} pt</span><StatusBadge status={q.status} source={q.source} sourceRef={q.sourceRef} /></span>
            <ItemControls kind="question" id={q.id} status={q.status} />
          </div>
          {q.context?.text && <blockquote className="small" style={{ background: "var(--surface-2)", padding: 8, borderRadius: 8, margin: "8px 0" }}>{q.context.text}</blockquote>}
          <p style={{ margin: "8px 0 4px" }}><strong>{q.prompt}</strong></p>
          <p className="small" style={{ margin: 0 }}>Attendu : {expectedPreview(q)}</p>
          {q.explanation && <p className="small muted" style={{ margin: 0 }}>Explication : {q.explanation}</p>}
          <p className="small muted" style={{ margin: 0 }}>{q.notion ? `Notion : ${q.notion.name}` : "Sans notion"}{q.sourceRef ? ` · Source : ${q.sourceRef}` : ""}</p>
          <details><summary>Modifier</summary><QuestionEditor evaluationId={evaluationId} notions={notions} question={q} step={step} mockExams={mockExams} images={images} /></details>
        </div>
      ))}
    </>
  );
}
