import { prisma } from "@/lib/db";
import { euros } from "@/lib/format";

export async function PlanCards({ children }: { children?: (plan: { id: string; code: string }) => React.ReactNode }) {
  const plans = await prisma.plan.findMany({ where: { active: true }, orderBy: { order: "asc" } });
  return (
    <div className="grid-2">
      {plans.map((p) => (
        <div className="card" key={p.id}>
          <h2>{p.name}</h2>
          <p><span className="score-big" style={{ fontSize: "2.2rem" }}>{euros(p.priceCents)}</span> <span className="muted">par mois et par élève</span></p>
          {p.commitmentMonths > 0 && <p className="badge badge-brand">Engagement {p.commitmentMonths} mois · total {euros(p.priceCents * p.commitmentMonths)}</p>}
          <p>{p.description}</p>
          <p className="small muted" style={{ whiteSpace: "pre-line" }}>{p.terms}</p>
          {children?.(p)}
        </div>
      ))}
    </div>
  );
}
