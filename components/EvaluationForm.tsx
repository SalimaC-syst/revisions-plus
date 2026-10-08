import { ActionForm } from "@/components/forms/ActionForm";
import { saveEvaluationAction } from "@/app/actions/admin";

type Ev = { id: string; title: string; subjectId: string; examDate: Date | null; teacherName: string | null; showTeacher: boolean; schoolYear: string; chapters: unknown; objectives: unknown } | null;

export function EvaluationForm({ ev, subjects }: { ev: Ev; subjects: { id: string; name: string; gradeLevel: { name: string } }[] }) {
  return (
    <ActionForm action={saveEvaluationAction} submitLabel={ev ? "Enregistrer" : "Créer et importer les documents"}>
      {ev && <input type="hidden" name="id" value={ev.id} />}
      <div className="grid-2">
        <div className="field"><label htmlFor="subjectId">Niveau et matière</label>
          <select id="subjectId" name="subjectId" defaultValue={ev?.subjectId}>{subjects.map((s) => <option key={s.id} value={s.id}>{s.gradeLevel.name} · {s.name}</option>)}</select>
        </div>
        <div className="field"><label htmlFor="title">Titre de l'évaluation</label><input id="title" name="title" type="text" defaultValue={ev?.title} placeholder="ex. Les premières civilisations" required /></div>
        <div className="field"><label htmlFor="examDate">Date du contrôle</label><input id="examDate" name="examDate" type="date" defaultValue={ev?.examDate ? ev.examDate.toISOString().slice(0, 10) : ""} /></div>
        <div className="field"><label htmlFor="teacherName">Enseignant</label><input id="teacherName" name="teacherName" type="text" defaultValue={ev?.teacherName ?? ""} placeholder="ex. Mme Martin" />
          <label className="check" style={{ marginTop: 6 }}><input type="checkbox" name="showTeacher" defaultChecked={ev?.showTeacher ?? true} /> Afficher le nom aux élèves</label></div>
        <div className="field"><label htmlFor="schoolYear">Année scolaire</label><input id="schoolYear" name="schoolYear" type="text" defaultValue={ev?.schoolYear ?? "2026-2027"} /></div>
      </div>
      <div className="grid-2">
        <div className="field"><label htmlFor="chapters">Chapitres à connaître <span className="hint">(un par ligne)</span></label><textarea id="chapters" name="chapters" defaultValue={((ev?.chapters as string[]) ?? []).join("\n")} /></div>
        <div className="field"><label htmlFor="objectives">Objectifs d'apprentissage <span className="hint">(un par ligne)</span></label><textarea id="objectives" name="objectives" defaultValue={((ev?.objectives as string[]) ?? []).join("\n")} /></div>
      </div>
    </ActionForm>
  );
}
