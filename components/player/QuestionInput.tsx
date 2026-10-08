"use client";
import { useRef, useState } from "react";
import type { Feedback, PublicQuestion } from "./types";

type Props = { q: PublicQuestion; value: any; onChange: (v: any) => void; disabled?: boolean; feedback?: Feedback | null };

export function QuestionInput(props: Props) {
  switch (props.q.type) {
    case "MCQ": return <Mcq {...props} />;
    case "TRUE_FALSE": return <TrueFalse {...props} />;
    case "SHORT_ANSWER": return <ShortText {...props} />;
    case "NUMERIC": return <NumericInput {...props} />;
    case "FILL_BLANK": return <FillBlank {...props} />;
    case "ORDER": return <OrderList {...props} />;
    case "MATCH": return <MatchPairs {...props} />;
    case "CATEGORIZE": return <Categorize {...props} />;
    case "TIMELINE": return <Timeline {...props} />;
    case "IMAGE_POINT": return <ImagePoint {...props} />;
    case "OPEN": return <OpenAnswer {...props} />;
  }
}

/** Le tableau de réponse est vide tant que l'élève n'a rien saisi. */
/** Réponse par défaut : pour une remise en ordre, l'ordre affiché est déjà une réponse possible. */
export function initialValue(q: PublicQuestion): any {
  return q.type === "ORDER" ? { order: (q.view as any).items } : null;
}

export function isAnswered(q: PublicQuestion, v: any): boolean {
  if (!v) return false;
  switch (q.type) {
    case "MCQ": return (v.selected ?? []).length > 0;
    case "TRUE_FALSE": return typeof v.value === "boolean";
    case "SHORT_ANSWER": case "OPEN": return String(v.text ?? "").trim().length > 0;
    case "NUMERIC": return String(v.value ?? "").trim().length > 0;
    case "FILL_BLANK": return (v.blanks ?? []).some((b: string) => b?.trim());
    case "ORDER": return (v.order ?? []).length > 0;
    case "MATCH": return Object.keys(v.pairs ?? {}).length > 0;
    case "CATEGORIZE": return Object.keys(v.assign ?? {}).length > 0;
    case "TIMELINE": return Object.keys(v.years ?? {}).length > 0;
    case "IMAGE_POINT": return Object.keys(v.points ?? {}).length > 0;
  }
}

function partOk(fb: Feedback | null | undefined, label: string) {
  const p = fb?.parts.find((x) => x.label === label);
  return p ? (p.ok ? "good" : "bad") : "";
}

function Mcq({ q, value, onChange, disabled, feedback }: Props) {
  const view = q.view as { options: string[]; multiple: boolean };
  const sel: number[] = value?.selected ?? [];
  const toggle = (i: number) => {
    if (disabled) return;
    onChange({ selected: view.multiple ? (sel.includes(i) ? sel.filter((x) => x !== i) : [...sel, i]) : [i] });
  };
  const correct = feedback?.correction?.mcqCorrect;
  return (
    <div role="group" aria-label="Choix de réponse">
      {view.multiple && <p className="small muted">Plusieurs réponses sont possibles.</p>}
      {view.options.map((o, i) => {
        let cls = "choice";
        if (correct) cls += correct.includes(i) ? " good" : sel.includes(i) ? " bad" : "";
        return (
          <button type="button" key={i} className={cls} aria-pressed={sel.includes(i)} onClick={() => toggle(i)} disabled={disabled}>
            <span aria-hidden="true" className="badge">{String.fromCharCode(65 + i)}</span> {o}
          </button>
        );
      })}
    </div>
  );
}

function TrueFalse({ value, onChange, disabled }: Props) {
  return (
    <div className="row" role="group" aria-label="Vrai ou faux">
      {[true, false].map((b) => (
        <button type="button" key={String(b)} className="choice" style={{ width: "auto", minWidth: 140, justifyContent: "center" }} aria-pressed={value?.value === b} onClick={() => !disabled && onChange({ value: b })} disabled={disabled}>
          {b ? "Vrai" : "Faux"}
        </button>
      ))}
    </div>
  );
}

function ShortText({ value, onChange, disabled }: Props) {
  return <input type="text" aria-label="Ta réponse" value={value?.text ?? ""} onChange={(e) => onChange({ text: e.target.value })} disabled={disabled} autoComplete="off" spellCheck={false} />;
}

function NumericInput({ q, value, onChange, disabled }: Props) {
  const unit = (q.view as any).unit as string;
  return (
    <div className="row">
      <input type="text" inputMode="decimal" aria-label="Ta réponse (nombre)" style={{ maxWidth: 220 }} value={value?.value ?? ""} onChange={(e) => onChange({ value: e.target.value })} disabled={disabled} />
      {unit && <span>{unit}</span>}
    </div>
  );
}

function FillBlank({ q, value, onChange, disabled, feedback }: Props) {
  const view = q.view as { segments: ({ text: string } | { blank: number })[]; wordBank: string[] | null };
  const count = view.segments.filter((s) => "blank" in s).length;
  const blanks: string[] = value?.blanks ?? Array(count).fill("");
  const [focus, setFocus] = useState(0);
  const set = (i: number, v: string) => { const n = [...blanks]; n[i] = v; onChange({ blanks: n }); };
  const fromBank = (w: string) => {
    if (disabled) return;
    const target = blanks[focus] ? blanks.findIndex((b) => !b) : focus;
    set(target === -1 ? focus : target, w);
  };
  return (
    <div>
      <p style={{ lineHeight: 2.4 }}>
        {view.segments.map((s, i) =>
          "text" in s ? <span key={i}>{s.text}</span> : (
            <input key={i} type="text" className={`blank ${partOk(feedback, `Trou ${s.blank + 1}`) === "bad" ? "bad" : ""}`} aria-label={`Trou ${s.blank + 1}`}
              value={blanks[s.blank] ?? ""} onFocus={() => setFocus(s.blank)} onChange={(e) => set(s.blank, e.target.value)} disabled={disabled}
              style={{ borderColor: partOk(feedback, `Trou ${s.blank + 1}`) === "good" ? "var(--ok)" : partOk(feedback, `Trou ${s.blank + 1}`) === "bad" ? "var(--ko)" : undefined }} autoComplete="off" />
          ))}
      </p>
      {view.wordBank && (
        <div aria-label="Banque de mots">
          <span className="small muted">Banque de mots (clique pour remplir) : </span>
          {view.wordBank.map((w, i) => <button type="button" key={i} className={`chip ${blanks.includes(w) ? "placed" : ""}`} onClick={() => fromBank(w)} disabled={disabled}>{w}</button>)}
        </div>
      )}
    </div>
  );
}

function OrderList({ q, value, onChange, disabled, feedback }: Props) {
  const items: string[] = value?.order ?? (q.view as any).items;
  const drag = useRef<number | null>(null);
  const move = (from: number, to: number) => {
    if (disabled || to < 0 || to >= items.length) return;
    const n = [...items]; const [x] = n.splice(from, 1); n.splice(to, 0, x); onChange({ order: n });
  };
  return (
    <ol style={{ paddingLeft: 0, listStyle: "none" }} aria-label="Éléments à remettre dans l'ordre">
      {items.map((it, i) => {
        const st = partOk(feedback, `Position ${i + 1}`);
        return (
          <li key={it} draggable={!disabled} onDragStart={() => (drag.current = i)} onDragOver={(e) => e.preventDefault()} onDrop={() => { if (drag.current !== null) move(drag.current, i); drag.current = null; }}
            className={`choice ${st}`} style={{ cursor: disabled ? "default" : "grab" }}>
            <strong aria-hidden="true">{i + 1}.</strong>
            <span style={{ flex: 1 }}>{it}</span>
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => move(i, i - 1)} disabled={disabled || i === 0} aria-label={`Monter « ${it} »`}>↑</button>
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => move(i, i + 1)} disabled={disabled || i === items.length - 1} aria-label={`Descendre « ${it} »`}>↓</button>
          </li>
        );
      })}
    </ol>
  );
}

function MatchPairs({ q, value, onChange, disabled, feedback }: Props) {
  const view = q.view as { lefts: string[]; rights: string[] };
  const pairs: Record<string, string> = value?.pairs ?? {};
  return (
    <div className="stack">
      {view.lefts.map((l, i) => {
        const st = partOk(feedback, l);
        return (
          <div key={l} className={`choice ${st}`} style={{ cursor: "default", flexWrap: "wrap" }}>
            <label htmlFor={`m-${q.id}-${i}`} style={{ flex: "1 1 180px", margin: 0 }}>{l}</label>
            <select id={`m-${q.id}-${i}`} style={{ flex: "2 1 220px" }} value={pairs[l] ?? ""} disabled={disabled}
              onChange={(e) => { const n = { ...pairs }; if (e.target.value) n[l] = e.target.value; else delete n[l]; onChange({ pairs: n }); }}>
              <option value="">— Associer —</option>
              {view.rights.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        );
      })}
    </div>
  );
}

function Categorize({ q, value, onChange, disabled, feedback }: Props) {
  const view = q.view as { categories: string[]; items: string[] };
  const assign: Record<string, string> = value?.assign ?? {};
  const [selected, setSelected] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const put = (item: string, cat: string | null) => {
    if (disabled) return;
    const n = { ...assign }; if (cat) n[item] = cat; else delete n[item];
    onChange({ assign: n }); setSelected(null);
  };
  const free = view.items.filter((i) => !assign[i]);
  const chip = (it: string) => (
    <button type="button" key={it} draggable={!disabled} onDragStart={(e) => e.dataTransfer.setData("text/plain", it)}
      className={`chip ${selected === it ? "selected" : ""}`} aria-pressed={selected === it} onClick={() => setSelected(selected === it ? null : it)} disabled={disabled}
      style={{ borderColor: partOk(feedback, it) === "good" ? "var(--ok)" : partOk(feedback, it) === "bad" ? "var(--ko)" : undefined }}>
      {it}
    </button>
  );
  return (
    <div>
      <p className="small muted">Fais glisser chaque étiquette dans la bonne colonne, ou touche une étiquette puis une colonne.</p>
      <div className="drop" style={{ marginBottom: 12 }} onDragOver={(e) => e.preventDefault()} onDrop={(e) => put(e.dataTransfer.getData("text/plain"), null)}
        onClick={(e) => { if (selected && e.target === e.currentTarget) put(selected, null); }} aria-label="Étiquettes à classer">
        {free.length ? free.map(chip) : <span className="small muted">Toutes les étiquettes sont classées.</span>}
      </div>
      <div className="grid">
        {view.categories.map((c) => (
          <div key={c} className={`drop ${over === c ? "target" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setOver(c); }} onDragLeave={() => setOver(null)}
            onDrop={(e) => { e.preventDefault(); setOver(null); put(e.dataTransfer.getData("text/plain"), c); }}
            onClick={(e) => { if (selected && e.target === e.currentTarget) put(selected, c); }}>
            <div className="spread" style={{ marginBottom: 6 }}>
              <strong>{c}</strong>
              {selected && !disabled && <button type="button" className="btn btn-sm" onClick={() => put(selected, c)}>Placer ici</button>}
            </div>
            {view.items.filter((i) => assign[i] === c).map(chip)}
          </div>
        ))}
      </div>
    </div>
  );
}

function Timeline({ q, value, onChange, disabled, feedback }: Props) {
  const view = q.view as { min: number; max: number; labels: string[] };
  const years: Record<string, number> = value?.years ?? {};
  const pct = (y: number) => ((y - view.min) / (view.max - view.min)) * 100;
  const ticks = 5;
  return (
    <div>
      <div style={{ position: "relative", height: 70, margin: "10px 12px 26px" }} aria-hidden="true">
        <div style={{ position: "absolute", top: 40, left: 0, right: 0, height: 6, background: "var(--brand)", borderRadius: 3 }} />
        {Array.from({ length: ticks + 1 }, (_, i) => {
          const y = Math.round(view.min + ((view.max - view.min) * i) / ticks);
          return <span key={i} className="small muted" style={{ position: "absolute", left: `${(i / ticks) * 100}%`, top: 50, transform: "translateX(-50%)" }}>{y}</span>;
        })}
        {view.labels.filter((l) => years[l] !== undefined).map((l, i) => (
          <span key={l} className={`pin ${partOk(feedback, l)}`} style={{ left: `${pct(years[l])}%`, top: 36 - (i % 2) * 22 }}>{l.length > 22 ? l.slice(0, 20) + "…" : l}</span>
        ))}
      </div>
      {view.labels.map((l, i) => (
        <div className="field" key={l}>
          <label htmlFor={`t-${q.id}-${i}`}>{l} <span className="hint">: {years[l] ?? "place l'événement"}</span></label>
          <div className="row">
            <input id={`t-${q.id}-${i}`} type="range" min={view.min} max={view.max} step={1} value={years[l] ?? Math.round((view.min + view.max) / 2)}
              onChange={(e) => onChange({ years: { ...years, [l]: Number(e.target.value) } })} disabled={disabled} style={{ flex: 1 }} />
            <input type="number" aria-label={`Année pour ${l}`} style={{ width: 110 }} value={years[l] ?? ""} min={view.min} max={view.max}
              onChange={(e) => onChange({ years: { ...years, [l]: e.target.value === "" ? undefined : Number(e.target.value) } })} disabled={disabled} />
          </div>
          {feedback && <span className={`badge ${partOk(feedback, l) === "good" ? "badge-ok" : "badge-ko"}`}>Réponse : {feedback.parts.find((p) => p.label === l)?.expected}</span>}
        </div>
      ))}
    </div>
  );
}

function ImagePoint({ q, value, onChange, disabled, feedback }: Props) {
  const view = q.view as { image: string; labels: string[] };
  const points: Record<string, { x: number; y: number }> = value?.points ?? {};
  const [active, setActive] = useState<string>(view.labels.find((l) => !points[l]) ?? view.labels[0]);
  const place = (x: number, y: number) => {
    if (disabled) return;
    const n = { ...points, [active]: { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) } };
    onChange({ points: n });
    const next = view.labels.find((l) => !n[l]);
    if (next) setActive(next);
  };
  const onKey = (e: React.KeyboardEvent) => {
    const p = points[active] ?? { x: 50, y: 50 };
    const d = e.shiftKey ? 5 : 1;
    const moves: Record<string, [number, number]> = { ArrowLeft: [-d, 0], ArrowRight: [d, 0], ArrowUp: [0, -d], ArrowDown: [0, d] };
    if (moves[e.key]) { e.preventDefault(); place(p.x + moves[e.key][0], p.y + moves[e.key][1]); setActive(active); }
    if (e.key === "Enter") { e.preventDefault(); place(p.x, p.y); }
  };
  return (
    <div>
      <p className="small muted">Choisis un nom, puis touche l'endroit correspondant sur la carte. Au clavier : flèches pour déplacer, Maj + flèches pour aller plus vite.</p>
      <div role="group" aria-label="Noms à placer" style={{ marginBottom: 8 }}>
        {view.labels.map((l) => <button type="button" key={l} className={`chip ${active === l ? "selected" : ""} ${points[l] ? "" : ""}`} aria-pressed={active === l} onClick={() => setActive(l)} disabled={disabled}>{points[l] ? "✓ " : ""}{l}</button>)}
      </div>
      <div className="mapbox" tabIndex={disabled ? -1 : 0} onKeyDown={onKey} aria-label={`Carte : placer « ${active} »`}
        onClick={(e) => { const r = (e.currentTarget as HTMLElement).getBoundingClientRect(); place(((e.clientX - r.left) / r.width) * 100, ((e.clientY - r.top) / r.height) * 100); }}>
        <img src={view.image} alt="Carte sur laquelle placer les lieux" draggable={false} />
        {view.labels.filter((l) => points[l]).map((l) => <span key={l} className={`pin ${partOk(feedback, l)}`} style={{ left: `${points[l].x}%`, top: `${points[l].y}%` }}>{l}</span>)}
        {feedback?.correction?.targets?.filter((t) => partOk(feedback, t.label) === "bad").map((t) => <span key={"c" + t.label} className="pin answer" style={{ left: `${t.x}%`, top: `${t.y}%` }}>{t.label} (correction)</span>)}
      </div>
    </div>
  );
}

function OpenAnswer({ q, value, onChange, disabled }: Props) {
  const criteria = (q.view as any).criteria as { label: string; points: number }[];
  const text = value?.text ?? "";
  return (
    <div>
      <details className="small" style={{ marginBottom: 8 }} open>
        <summary>Ce qui est attendu (barème)</summary>
        <ul>{criteria.map((c) => <li key={c.label}>{c.label} — {c.points} pt</li>)}</ul>
      </details>
      <textarea aria-label="Ta réponse rédigée" value={text} onChange={(e) => onChange({ text: e.target.value })} disabled={disabled} rows={7} />
      <p className="small muted">{text.trim() ? text.trim().split(/\s+/).length : 0} mots</p>
    </div>
  );
}
