import type { QuestionContext } from "@/lib/questions";

export function QuestionContextView({ ctx }: { ctx: QuestionContext }) {
  if (!ctx) return null;
  return (
    <figure className="card" style={{ background: "var(--surface-2)", boxShadow: "none", margin: "0 0 16px" }}>
      {ctx.text && <blockquote style={{ margin: 0, whiteSpace: "pre-line" }}>{ctx.text}</blockquote>}
      {ctx.imageUrl && <img src={ctx.imageUrl} alt="Document à analyser" />}
      {ctx.chart && <BarChart {...ctx.chart} />}
      {ctx.source && <figcaption className="small muted" style={{ marginTop: 8 }}>Source : {ctx.source}</figcaption>}
    </figure>
  );
}

function BarChart({ title, labels, values, unit }: { title: string; labels: string[]; values: number[]; unit?: string }) {
  const max = Math.max(...values, 1);
  const w = 520, h = 240, pad = 36, bw = (w - pad * 2) / values.length;
  return (
    <svg viewBox={`0 0 ${w} ${h + 40}`} role="img" aria-label={`${title} : ${labels.map((l, i) => `${l} ${values[i]}${unit ?? ""}`).join(", ")}`} style={{ width: "100%", maxWidth: 560 }}>
      <text x={w / 2} y={16} textAnchor="middle" fontSize="14" fontWeight="700" fill="currentColor">{title}</text>
      <line x1={pad} x2={w - pad} y1={h} y2={h} stroke="#999" />
      {values.map((v, i) => {
        const bh = (v / max) * (h - 40);
        const x = pad + i * bw + bw * 0.15;
        return (
          <g key={i}>
            <rect className="chart-bar" x={x} y={h - bh} width={bw * 0.7} height={bh} rx="4" />
            <text x={x + bw * 0.35} y={h - bh - 4} textAnchor="middle" fontSize="12" fill="currentColor">{v}{unit}</text>
            <text x={x + bw * 0.35} y={h + 16} textAnchor="middle" fontSize="12" fill="currentColor">{labels[i]}</text>
          </g>
        );
      })}
    </svg>
  );
}
