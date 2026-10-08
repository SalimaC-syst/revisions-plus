import { prisma } from "@/lib/db";
import { requireEvalEdit } from "@/lib/admin";
import { LearnBlockEditor } from "@/components/admin/Editors";
import { ItemControls, StatusBadge } from "@/components/admin/ItemControls";
import { LearnBlockView } from "@/components/LearnBlockView";
import { availableImages } from "@/lib/images";
import { validateAllAction } from "@/app/actions/admin";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireEvalEdit(id);
  const [blocks, notions, images] = await Promise.all([
    prisma.learnBlock.findMany({ where: { evaluationId: id }, orderBy: { order: "asc" }, include: { notion: true } }),
    prisma.notion.findMany({ where: { evaluationId: id }, orderBy: { order: "asc" } }),
    availableImages(id),
  ]);
  const drafts = blocks.filter((b) => b.status === "DRAFT").length;
  return (
    <div className="stack">
      <div className="spread">
        <h2 style={{ margin: 0 }}>Étape 1 « Je comprends » · fiche mémo ({blocks.length} blocs)</h2>
        {drafts > 0 && <form action={validateAllAction}><input type="hidden" name="evaluationId" value={id} /><input type="hidden" name="kind" value="learnBlock" /><button className="btn btn-sm btn-ghost" title="Les blocs marqués « à vérifier » restent en brouillon">Valider tous les brouillons relus</button></form>}
      </div>
      {blocks.map((b) => (
        <div key={b.id} className={`item ${b.status === "VALIDATED" ? "validated" : "draft"}`}>
          <div className="spread"><StatusBadge status={b.status} source={b.source} sourceRef={b.sourceRef} /><ItemControls kind="learnBlock" id={b.id} status={b.status} /></div>
          {b.sourceRef && <p className="small muted" style={{ margin: "6px 0" }}>Source : {b.sourceRef}{b.notion ? ` · Notion : ${b.notion.name}` : ""}</p>}
          <LearnBlockView block={b} />
          <details><summary>Modifier</summary><LearnBlockEditor evaluationId={id} notions={notions} block={b} images={images} /></details>
        </div>
      ))}
      <details className="card" open={blocks.length === 0}>
        <summary>+ Ajouter un bloc</summary>
        <LearnBlockEditor evaluationId={id} notions={notions} images={images} />
      </details>
    </div>
  );
}
