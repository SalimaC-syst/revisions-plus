import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireEvalEdit } from "@/lib/admin";
import { can } from "@/lib/roles";
import { AdminTabs } from "@/components/AdminTabs";
import { setEvaluationStatusAction, duplicateEvaluationAction, deleteEvaluationAction } from "@/app/actions/admin";
import { ConfirmButton } from "@/components/ConfirmButton";
import { dateFr } from "@/lib/format";

export default async function Layout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, ev } = await requireEvalEdit(id);
  const count = async (m: "learnBlock" | "flashcard", status: "DRAFT" | "VALIDATED") => (prisma[m] as any).count({ where: { evaluationId: id, status } });
  const [lbV, lbD, fcV, fcD, qs, mocks] = await Promise.all([
    count("learnBlock", "VALIDATED"), count("learnBlock", "DRAFT"), count("flashcard", "VALIDATED"), count("flashcard", "DRAFT"),
    prisma.question.groupBy({ by: ["step", "status"], where: { evaluationId: id }, _count: true }),
    prisma.mockExam.findMany({ where: { evaluationId: id }, select: { status: true, _count: { select: { questions: { where: { status: "VALIDATED" } } } } } }),
  ]);
  const q = (step: string, status: string) => qs.find((x) => x.step === step && x.status === status)?._count ?? 0;
  const mockReady = mocks.some((m) => m.status === "VALIDATED" && m._count.questions > 0);
  const checks = [
    { ok: lbV > 0, label: `Fiche : ${lbV} bloc(s) validé(s)${lbD ? `, ${lbD} brouillon(s)` : ""}` },
    { ok: fcV > 0 || q("MEMORIZE", "VALIDATED") > 0, label: `Mémoriser : ${fcV} carte(s) et ${q("MEMORIZE", "VALIDATED")} activité(s) validées${fcD + q("MEMORIZE", "DRAFT") ? `, ${fcD + q("MEMORIZE", "DRAFT")} brouillon(s)` : ""}` },
    { ok: q("PRACTICE", "VALIDATED") >= 3, label: `S'entraîner : ${q("PRACTICE", "VALIDATED")} exercice(s) validé(s)${q("PRACTICE", "DRAFT") ? `, ${q("PRACTICE", "DRAFT")} brouillon(s)` : ""}` },
    { ok: mockReady, label: `Contrôle blanc : ${mockReady ? "prêt" : "à valider"} (${q("EXAM", "VALIDATED")} question(s) validée(s)${q("EXAM", "DRAFT") ? `, ${q("EXAM", "DRAFT")} brouillon(s)` : ""})` },
  ];
  const base = `/admin/evaluations/${id}`;
  const status = { DRAFT: ["Brouillon", "badge-warn"], PUBLISHED: ["Publiée", "badge-ok"], ARCHIVED: ["Archivée", ""] }[ev.status];
  return (
    <div className="stack">
      <p className="small"><Link href="/admin/evaluations">Évaluations</Link> › {ev.subject.gradeLevel.name} · {ev.subject.name}</p>
      <div className="spread">
        <div>
          <h1 style={{ marginBottom: 4 }}>{ev.title} <span className={`badge ${status[1]}`}>{status[0]}</span></h1>
          <p className="muted small" style={{ margin: 0 }}>{ev.examDate ? `Contrôle le ${dateFr(ev.examDate)}` : "Date non renseignée"} · {ev.schoolYear}</p>
        </div>
        <div className="row">
          {can(user.role, "pedagogy.publish") && ev.status !== "PUBLISHED" && (
            <form action={setEvaluationStatusAction}><input type="hidden" name="id" value={id} /><input type="hidden" name="status" value="PUBLISHED" />
              <ConfirmButton className="btn btn-accent" message="Publier ? Seuls les contenus validés seront visibles des élèves.">Publier</ConfirmButton></form>
          )}
          {can(user.role, "pedagogy.publish") && ev.status === "PUBLISHED" && (
            <form action={setEvaluationStatusAction}><input type="hidden" name="id" value={id} /><input type="hidden" name="status" value="DRAFT" /><button className="btn btn-ghost">Dépublier</button></form>
          )}
          {can(user.role, "pedagogy.publish") && ev.status !== "ARCHIVED" && (
            <form action={setEvaluationStatusAction}><input type="hidden" name="id" value={id} /><input type="hidden" name="status" value="ARCHIVED" /><ConfirmButton className="btn btn-ghost" message="Archiver cette évaluation ? Elle ne sera plus visible des élèves.">Archiver</ConfirmButton></form>
          )}
          <form action={duplicateEvaluationAction}><input type="hidden" name="id" value={id} /><button className="btn btn-ghost" title="Réutiliser pour une autre année">Dupliquer</button></form>
          {can(user.role, "pedagogy.publish") && (
            <form action={deleteEvaluationAction}><input type="hidden" name="id" value={id} /><ConfirmButton className="btn btn-ghost" message="Supprimer définitivement cette évaluation et tous ses contenus ?">Supprimer</ConfirmButton></form>
          )}
        </div>
      </div>
      {!can(user.role, "pedagogy.publish") && <p className="small muted">La publication est réservée aux administrateurs pédagogiques.</p>}
      <div className="card" style={{ padding: 14 }}>
        <strong>Prêt pour les élèves ?</strong>
        <ul style={{ listStyle: "none", padding: 0, margin: "6px 0 0" }}>{checks.map((c) => <li key={c.label} className="small">{c.ok ? "✅" : "⬜"} {c.label}</li>)}</ul>
        <p className="small muted" style={{ margin: "6px 0 0" }}>Les élèves ne voient que les contenus validés d'une évaluation publiée. Un contenu généré par IA reste en brouillon tant qu'il n'est pas validé.</p>
      </div>
      <AdminTabs base={base} tabs={[
        { href: "", label: "Informations" }, { href: "/documents", label: "1. Documents" }, { href: "/ia", label: "2. Génération IA" },
        { href: "/fiche", label: "Fiche mémo" }, { href: "/flashcards", label: "Flashcards" }, { href: "/exercices", label: "Exercices" }, { href: "/controles", label: "Contrôles blancs" },
      ]} />
      {children}
    </div>
  );
}
