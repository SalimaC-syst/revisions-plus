// Conversion entre formulaires simples (une ligne par élément) et données structurées.
export const splitLines = (s: string) => s.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
const pair = (l: string, sep = "=") => { const i = l.indexOf(sep); return i < 0 ? [l.trim(), ""] : [l.slice(0, i).trim(), l.slice(i + 1).trim()]; };
const num = (s: string) => Number(String(s).replace(",", "."));

export const blockToForm = (type: string, d: any): Record<string, string> => {
  switch (type) {
    case "TEXT": return { text: d?.text ?? "" };
    case "KEYPOINTS": return { lines: (d?.items ?? []).join("\n") };
    case "DEFINITIONS": return { lines: (d?.items ?? []).map((i: any) => `${i.term} = ${i.definition}`).join("\n") };
    case "TIMELINE": return { lines: (d?.events ?? []).map((e: any) => `${e.year} | ${e.date && e.date !== String(e.year) ? e.date + " | " : ""}${e.label}`).join("\n") };
    case "TABLE": return { lines: [(d?.headers ?? []).join(" | "), ...(d?.rows ?? []).map((r: string[]) => r.join(" | "))].join("\n") };
    case "EXAMPLE": return { text: d?.text ?? "", comment: d?.comment ?? "" };
    case "MEDIA": return { url: d?.url ?? "", kind: d?.kind ?? "video", caption: d?.caption ?? "", alt: d?.alt ?? "" };
  }
  return {};
};

export const formToBlock = (type: string, f: Record<string, string>): any => {
  switch (type) {
    case "TEXT": return { text: f.text ?? "" };
    case "KEYPOINTS": return { items: splitLines(f.lines ?? "") };
    case "DEFINITIONS": return { items: splitLines(f.lines ?? "").map((l) => { const [term, definition] = pair(l); return { term, definition }; }) };
    case "TIMELINE": return { events: splitLines(f.lines ?? "").map((l) => { const p = l.split("|").map((x) => x.trim()); return p.length >= 3 ? { year: num(p[0]), date: p[1], label: p.slice(2).join(" | ") } : { year: num(p[0]), date: p[0], label: p[1] ?? "" }; }) };
    case "TABLE": { const [h, ...rows] = splitLines(f.lines ?? ""); return { headers: (h ?? "").split("|").map((x) => x.trim()), rows: rows.map((r) => r.split("|").map((x) => x.trim())) }; }
    case "EXAMPLE": return { text: f.text ?? "", comment: f.comment ?? "" };
    case "MEDIA": return { url: f.url ?? "", kind: f.kind ?? "video", caption: f.caption ?? "", alt: f.alt ?? "" };
  }
  return {};
};

export const questionToForm = (type: string, d: any): Record<string, string> => {
  if (!d) return {};
  switch (type) {
    case "MCQ": return { lines: d.options.map((o: string, i: number) => `${d.correct.includes(i) ? "* " : ""}${o}`).join("\n") };
    case "TRUE_FALSE": return { tf: d.correct ? "true" : "false" };
    case "SHORT_ANSWER": return { lines: d.accepted.join("\n") };
    case "FILL_BLANK": return { text: d.text, wordBank: d.wordBank === false ? "" : "on" };
    case "ORDER": return { lines: d.items.join("\n") };
    case "MATCH": return { lines: d.pairs.map((p: any) => `${p.left} = ${p.right}`).join("\n") };
    case "CATEGORIZE": return { cats: d.categories.join("\n"), lines: d.items.map((i: any) => `${i.text} = ${i.category}`).join("\n") };
    case "NUMERIC": return { answer: String(d.answer), tolerance: String(d.tolerance ?? 0), unit: d.unit ?? "" };
    case "TIMELINE": return { min: String(d.min), max: String(d.max), tolerance: String(d.tolerance ?? 0), lines: d.events.map((e: any) => `${e.year} = ${e.label}`).join("\n") };
    case "IMAGE_POINT": return { image: d.image, lines: d.targets.map((t: any) => `${t.label} = ${t.x}, ${t.y}${t.r && t.r !== 6 ? `, ${t.r}` : ""}`).join("\n") };
    case "OPEN": return { lines: d.criteria.map((c: any) => `${c.label} = ${c.points}`).join("\n"), text: d.modelAnswer };
  }
  return {};
};

export const formToQuestion = (type: string, f: Record<string, string>): any => {
  const L = splitLines(f.lines ?? "");
  switch (type) {
    case "MCQ": return { options: L.map((l) => l.replace(/^\*\s*/, "")), correct: L.map((l, i) => (l.startsWith("*") ? i : -1)).filter((i) => i >= 0) };
    case "TRUE_FALSE": return { correct: f.tf === "true" };
    case "SHORT_ANSWER": return { accepted: L };
    case "FILL_BLANK": return { text: f.text ?? "", wordBank: f.wordBank === "on" };
    case "ORDER": return { items: L };
    case "MATCH": return { pairs: L.map((l) => { const [left, right] = pair(l); return { left, right }; }) };
    case "CATEGORIZE": return { categories: splitLines(f.cats ?? ""), items: L.map((l) => { const [text, category] = pair(l); return { text, category }; }) };
    case "NUMERIC": return { answer: num(f.answer), tolerance: num(f.tolerance || "0"), unit: f.unit ?? "" };
    case "TIMELINE": return { min: num(f.min), max: num(f.max), tolerance: num(f.tolerance || "0"), events: L.map((l) => { const [y, label] = pair(l); return { year: num(y), label }; }) };
    case "IMAGE_POINT": return { image: f.image ?? "", targets: L.map((l) => { const [label, coords] = pair(l); const [x, y, r] = coords.split(",").map((c) => num(c)); return { label, x, y, r: Number.isFinite(r) ? r : 6 }; }) };
    case "OPEN": return { criteria: L.map((l) => { const [label, pts] = pair(l); return { label, points: num(pts) }; }), modelAnswer: f.text ?? "" };
  }
  return {};
};

export const QUESTION_HELP: Record<string, { lines?: string; text?: string }> = {
  MCQ: { lines: "Un choix par ligne. Mettez une étoile * devant la ou les bonnes réponses.\nex. *Constantinople" },
  SHORT_ANSWER: { lines: "Réponses acceptées, une par ligne (majuscules, accents et articles ne comptent pas)." },
  FILL_BLANK: { text: "Mettez chaque mot à trouver entre doubles crochets : [[Constantinople]]. Variantes acceptées : [[Aix-la-Chapelle|Aix]]." },
  ORDER: { lines: "Les éléments dans le BON ordre, un par ligne. Ils seront mélangés pour l'élève." },
  MATCH: { lines: "Une paire par ligne : notion = définition" },
  CATEGORIZE: { lines: "Une étiquette par ligne : étiquette = catégorie" },
  TIMELINE: { lines: "Un événement par ligne : année = événement (années négatives pour avant J.-C.)" },
  IMAGE_POINT: { lines: "Un lieu par ligne : nom = x, y (en % de la largeur et de la hauteur). Cliquez sur l'image pour obtenir les coordonnées." },
  OPEN: { lines: "Critères de correction, un par ligne : critère = points", text: "Réponse modèle (corrigé du professeur)" },
};
