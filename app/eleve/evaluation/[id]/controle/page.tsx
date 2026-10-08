import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireStudent, publishedEvaluation } from "@/lib/student";
import { startMockExam } from "@/app/actions/student";
import { dateTimeFr, note20 } from "@/lib/format";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireStudent();
  const { id } = await params;
  const ev = await publishedEvaluation(id);
  const mocks = await prisma.mockExam.findMany({ where: { evaluationId: ev.id, status: "VALIDATED" }, include: { questions: { where: { status: "VALIDATED" }, select: { points: true, variantGroup: true } } } });
  const attempts = await prisma.attempt.findMany({ where: { userId: user.id, evaluationId: ev.id, kind: "MOCK_EXAM" }, orderBy: { startedAt: "desc" }, include: { mockExam: true } });
  return (
    <div className="stack">
      <p className="small"><Link href={`/eleve/evaluation/${ev.id}`}>← {ev.title}</Link></p>
      <h1>📝 Étape 4 · Je passe mon contrôle blanc</h1>
      <p className="muted">Mets-toi dans les conditions du contrôle : au calme, sans ton cahier. Tes réponses sont enregistrées au fur et à mesure. À la fin, tu obtiens ta note sur 20 et une correction détaillée.</p>
      {mocks.length === 0 && <div className="card"><p>Le contrôle blanc n'est pas encore publié.</p></div>}
      {mocks.map((m) => {
        const groups = new Set(m.questions.filter((q) => q.variantGroup).map((q) => q.variantGroup));
        const fixed = m.questions.filter((q) => !q.variantGroup);
        const count = fixed.length + groups.size;
        const hasVariants = m.questions.length > count;
        return (
          <div className="card" key={m.id}>
            <h2>{m.title}</h2>
            <p>⏱ Durée : <strong>{m.durationMin} minutes</strong> · {count} questions · noté sur 20{hasVariants ? " · questions différentes à chaque tentative" : ""}</p>
            {m.instructions && <p className="small" style={{ whiteSpace: "pre-line" }}>{m.instructions}</p>}
            <form action={startMockExam.bind(null, m.id)}><button className="btn btn-accent">Commencer le contrôle blanc</button></form>
          </div>
        );
      })}
      {attempts.length > 0 && (
        <div className="card">
          <h2>Mes tentatives</h2>
          <div className="table-wrap"><table>
            <thead><tr><th>Date</th><th>Contrôle</th><th>Note</th><th></th></tr></thead>
            <tbody>
              {attempts.map((a) => (
                <tr key={a.id}>
                  <td>{dateTimeFr(a.startedAt)}</td>
                  <td>{a.mockExam?.title}</td>
                  <td>{a.status === "IN_PROGRESS" ? "En cours" : a.status === "PENDING_REVIEW" ? "Correction en cours par l'enseignant" : note20(a.scoreOn20)}</td>
                  <td><Link href={`/eleve/controle/${a.id}`}>{a.status === "IN_PROGRESS" ? "Reprendre" : "Voir la correction"}</Link></td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </div>
      )}
    </div>
  );
}
