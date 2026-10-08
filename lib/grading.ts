// Correction automatique des réponses fermées. Les réponses rédigées (OPEN)
// ne reçoivent jamais de note automatique : elles passent en correction guidée.
import { BLANK_RE, type QType } from "./questions";

export type Part = { label: string; ok: boolean; expected: string; given?: string };
export type GradeResult = {
  autoGradable: boolean;
  isCorrect: boolean | null;
  points: number | null; // null = en attente de correction
  maxPoints: number;
  parts: Part[];
  expected: string; // réponse attendue lisible
};

export function normalize(s: unknown): string {
  return String(s ?? "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[’'`]/g, "'")
    .replace(/[^a-z0-9' -]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Tolère l'absence d'article initial et une faute de frappe sur les mots longs. */
export function textMatches(given: unknown, accepted: string[]): boolean {
  const g = stripArticle(normalize(given));
  if (!g) return false;
  return accepted.some((a) => {
    const n = stripArticle(normalize(a));
    if (n === g) return true;
    return n.length >= 8 && levenshtein(n, g) <= 1;
  });
}
function stripArticle(s: string) {
  return s.replace(/^(le |la |les |l'|un |une |des |du |de la |de l'|d')/, "").trim();
}
export function levenshtein(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[a.length][b.length];
}

function toNumber(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const s = String(v ?? "").replace(/\s/g, "").replace(",", ".");
  if (!/^-?\d+(\.\d+)?$/.test(s)) return null;
  return Number(s);
}

const roundQuarter = (x: number) => Math.round(x * 4) / 4;

function partial(parts: Part[], max: number): Pick<GradeResult, "isCorrect" | "points"> {
  const okCount = parts.filter((p) => p.ok).length;
  const all = parts.length > 0 && okCount === parts.length;
  return { isCorrect: all, points: parts.length ? roundQuarter((okCount / parts.length) * max) : 0 };
}

export function grade(type: QType, data: any, response: any, maxPoints: number): GradeResult {
  const r = response ?? {};
  const base = { autoGradable: true, maxPoints };
  switch (type) {
    case "MCQ": {
      const sel: number[] = Array.isArray(r.selected) ? [...new Set<number>(r.selected.map(Number))].sort((a, b) => a - b) : [];
      const cor: number[] = [...data.correct].sort((a: number, b: number) => a - b);
      const ok = sel.length === cor.length && sel.every((v, i) => v === cor[i]);
      const expected = cor.map((i) => data.options[i]).join(" ; ");
      return { ...base, isCorrect: ok, points: ok ? maxPoints : 0, parts: [], expected };
    }
    case "TRUE_FALSE": {
      const ok = typeof r.value === "boolean" && r.value === data.correct;
      return { ...base, isCorrect: ok, points: ok ? maxPoints : 0, parts: [], expected: data.correct ? "Vrai" : "Faux" };
    }
    case "SHORT_ANSWER": {
      const ok = textMatches(r.text, data.accepted);
      return { ...base, isCorrect: ok, points: ok ? maxPoints : 0, parts: [], expected: data.accepted[0] };
    }
    case "FILL_BLANK": {
      const blanks: string[][] = [];
      String(data.text).replace(BLANK_RE, (_: string, inner: string) => { blanks.push(inner.split("|").map((x) => x.trim())); return ""; });
      const given: unknown[] = Array.isArray(r.blanks) ? r.blanks : [];
      const parts = blanks.map((acc, i) => ({ label: `Trou ${i + 1}`, ok: textMatches(given[i], acc), expected: acc[0], given: String(given[i] ?? "") }));
      return { ...base, ...partial(parts, maxPoints), parts, expected: parts.map((p) => p.expected).join(" ; ") };
    }
    case "ORDER": {
      const given: string[] = Array.isArray(r.order) ? r.order : [];
      const parts = data.items.map((item: string, i: number) => ({ label: `Position ${i + 1}`, ok: given[i] === item, expected: item, given: given[i] }));
      return { ...base, ...partial(parts, maxPoints), parts, expected: data.items.join(" → ") };
    }
    case "MATCH": {
      const given = (r.pairs ?? {}) as Record<string, string>;
      const parts = data.pairs.map((p: any) => ({ label: p.left, ok: given[p.left] === p.right, expected: p.right, given: given[p.left] }));
      return { ...base, ...partial(parts, maxPoints), parts, expected: data.pairs.map((p: any) => `${p.left} = ${p.right}`).join(" ; ") };
    }
    case "CATEGORIZE": {
      const given = (r.assign ?? {}) as Record<string, string>;
      const parts = data.items.map((it: any) => ({ label: it.text, ok: given[it.text] === it.category, expected: it.category, given: given[it.text] }));
      return { ...base, ...partial(parts, maxPoints), parts, expected: data.items.map((i: any) => `${i.text} → ${i.category}`).join(" ; ") };
    }
    case "NUMERIC": {
      const v = toNumber(r.value);
      const ok = v !== null && Math.abs(v - data.answer) <= (data.tolerance ?? 0) + 1e-9;
      return { ...base, isCorrect: ok, points: ok ? maxPoints : 0, parts: [], expected: `${data.answer}${data.unit ? " " + data.unit : ""}` };
    }
    case "TIMELINE": {
      const years = (r.years ?? {}) as Record<string, number>;
      const tol = data.tolerance ?? 0;
      const parts = data.events.map((e: any) => {
        const y = toNumber(years[e.label]);
        return { label: e.label, ok: y !== null && Math.abs(y - e.year) <= tol, expected: String(e.year), given: y === null ? "" : String(y) };
      });
      return { ...base, ...partial(parts, maxPoints), parts, expected: data.events.map((e: any) => `${e.label} : ${e.year}`).join(" ; ") };
    }
    case "IMAGE_POINT": {
      const pts = (r.points ?? {}) as Record<string, { x: number; y: number }>;
      const parts = data.targets.map((t: any) => {
        const p = pts[t.label];
        const ok = !!p && Math.hypot(Number(p.x) - t.x, Number(p.y) - t.y) <= (t.r ?? 6);
        return { label: t.label, ok, expected: "emplacement indiqué sur la correction" };
      });
      return { ...base, ...partial(parts, maxPoints), parts, expected: "" };
    }
    case "OPEN":
      return { autoGradable: false, isCorrect: null, points: null, maxPoints, parts: [], expected: data.modelAnswer };
  }
}

/** Note sur 20 : uniquement si toutes les réponses sont corrigées. */
export function scoreSummary(answers: { pointsAwarded: number | null; maxPoints: number }[]) {
  const maxPoints = answers.reduce((s, a) => s + a.maxPoints, 0);
  const graded = answers.filter((a) => a.pointsAwarded !== null);
  const autoPoints = graded.reduce((s, a) => s + (a.pointsAwarded ?? 0), 0);
  const pendingPoints = answers.filter((a) => a.pointsAwarded === null).reduce((s, a) => s + a.maxPoints, 0);
  const complete = pendingPoints === 0;
  const scoreOn20 = complete && maxPoints > 0 ? Math.round((autoPoints / maxPoints) * 20 * 4) / 4 : null;
  return { maxPoints, autoPoints, pendingPoints, complete, scoreOn20 };
}

/** Réponse de l'élève sous forme lisible (corrigé détaillé). */
export function responseText(type: QType, data: any, r: any): string {
  r = r ?? {};
  switch (type) {
    case "MCQ": return (r.selected ?? []).map((i: number) => data.options[i]).join(" ; ") || "—";
    case "TRUE_FALSE": return typeof r.value === "boolean" ? (r.value ? "Vrai" : "Faux") : "—";
    case "SHORT_ANSWER": case "OPEN": return String(r.text ?? "").trim() || "—";
    case "NUMERIC": return String(r.value ?? "").trim() ? `${r.value}${data.unit ? " " + data.unit : ""}` : "—";
    case "FILL_BLANK": return (r.blanks ?? []).map((b: string) => b || "…").join(" ; ") || "—";
    case "ORDER": return (r.order ?? []).join(" → ") || "—";
    case "MATCH": return Object.entries(r.pairs ?? {}).map(([k, v]) => `${k} = ${v}`).join(" ; ") || "—";
    case "CATEGORIZE": return Object.entries(r.assign ?? {}).map(([k, v]) => `${k} → ${v}`).join(" ; ") || "—";
    case "TIMELINE": return Object.entries(r.years ?? {}).map(([k, v]) => `${k} : ${v}`).join(" ; ") || "—";
    case "IMAGE_POINT": return `${Object.keys(r.points ?? {}).length} lieu(x) placé(s)`;
  }
}
