import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { evaluationProgress, studentEvaluations } from "@/lib/progress";
import { notionMastery, LEVEL_LABEL } from "@/lib/mastery";
import { ProgressBar } from "@/components/ProgressBar";
import { ActionForm } from "@/components/forms/ActionForm";
import { updateChildAction } from "@/app/actions/parent";
import { dateFr, note20 } from "@/lib/format";
import { BADGES, levelFor, totalXp, streak } from "@/lib/gamification";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const parent = await requireUser(["PARENT"]);
  const { id } = await params;
  const child = await prisma.user.findFirst({ where: { id, parentId: parent.id, role: "STUDENT" }, include: { gradeLevel: true, badges: true } });
  if (!child) notFound();
  const evals = await studentEvaluations(child.gradeLevelId);
  const levels = await prisma.gradeLevel.findMany({ orderBy: { order: "asc" } });
  const xp = await totalXp(child.id);
  const lv = levelFor(xp);
  const st = await streak(child.id);
  const mocks = await prisma.attempt.findMany({ where: { userId: child.id, kind: "MOCK_EXAM", status: { not: "IN_PROGRESS" } }, include: { evaluation: { include: { subject: true } } }, orderBy: { submittedAt: "desc" }, take: 10 });
  return (
    <div className="stack">
      <h1>Progression de {child.firstName}</h1>
      <div className="grid">
        <div className="card"><div className="kpi">{lv.level}</div><p className="muted">Niveau « {lv.name} » · {xp} points</p></div>
        <div className="card"><div className="kpi">{st}</div><p className="muted">jour(s) de révision d'affilée</p></div>
        <div className="card"><div className="kpi">{child.badges.length}</div><p className="muted">badge(s) obtenus</p></div>
      </div>
      <div className="card">
        <h2>Contrôles blancs récents</h2>
        {mocks.length === 0 ? <p className="muted">Aucun contrôle blanc passé pour l'instant.</p> : (
          <div className="table-wrap"><table><thead><tr><th>Date</th><th>Matière</th><th>Évaluation</th><th>Note</th></tr></thead><tbody>
            {mocks.map((m) => <tr key={m.id}><td>{dateFr(m.submittedAt)}</td><td>{m.evaluation.subject.name}</td><td>{m.evaluation.title}</td><td>{m.scoreOn20 !== null ? note20(m.scoreOn20) : "Correction en cours par l'enseignant"}</td></tr>)}
          </tbody></table></div>
        )}
      </div>
      <div className="card">
        <h2>Évaluations à préparer</h2>
        {evals.length === 0 && <p className="muted">Aucune évaluation publiée pour l'instant.</p>}
        {await Promise.all(evals.map(async (e) => {
          const p = await evaluationProgress(child.id, e.id);
          const m = await notionMastery(child.id, e.id);
          return (
            <div className="item" key={e.id}>
              <div className="spread"><strong>{e.subject.name} · {e.title}</strong><span className="small muted">{e.examDate ? `Contrôle le ${dateFr(e.examDate)}` : ""}</span></div>
              <ProgressBar value={p.percent} label={`Progression ${e.title}`} />
              <p className="small" style={{ marginTop: 6 }}>{p.percent} % · meilleure note au contrôle blanc : {note20(p.bestScore)}</p>
              <p className="small muted">{m.filter((x) => x.level !== "nouveau").map((x) => `${x.name} : ${LEVEL_LABEL[x.level]}`).join(" · ")}</p>
            </div>
          );
        }))}
      </div>
      {child.badges.length > 0 && (
        <div className="card"><h2>Badges</h2><p>{child.badges.map((b) => BADGES[b.code] ? `${BADGES[b.code].icon} ${BADGES[b.code].name}` : b.code).join(" · ")}</p></div>
      )}
      <div className="grid-2">
        <div className="card">
          <h2>Compte de l'élève</h2>
          <p className="small">Identifiant : <strong>{child.username}</strong></p>
          <ActionForm action={updateChildAction} submitLabel="Enregistrer">
            <input type="hidden" name="studentId" value={child.id} />
            <div className="field"><label htmlFor="gl">Classe</label><select id="gl" name="gradeLevelId" defaultValue={child.gradeLevelId ?? ""}>{levels.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select></div>
            <div className="field"><label htmlFor="pw">Nouveau mot de passe <span className="hint">(laisser vide pour ne pas changer)</span></label><input id="pw" name="password" type="password" autoComplete="new-password" /></div>
          </ActionForm>
        </div>
        <div className="card">
          <h2>Données de l'élève</h2>
          <p className="small">Téléchargez toutes les données enregistrées pour {child.firstName} (format JSON lisible).</p>
          <Link className="btn btn-ghost btn-sm" href={`/api/parent/export/${child.id}`}>Télécharger les données</Link>
          <p className="small" style={{ marginTop: 12 }}>Pour demander la suppression du compte : <Link href="/parent/donnees">Mes données</Link>.</p>
        </div>
      </div>
    </div>
  );
}
