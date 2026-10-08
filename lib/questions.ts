// Types de questions, validation des données saisies par l'administrateur,
// version « publique » (sans réponses) envoyée au navigateur de l'élève.
import { z } from "zod";

export const QUESTION_TYPES = [
  "MCQ", "TRUE_FALSE", "SHORT_ANSWER", "FILL_BLANK", "ORDER", "MATCH",
  "CATEGORIZE", "NUMERIC", "TIMELINE", "IMAGE_POINT", "OPEN",
] as const;
export type QType = (typeof QUESTION_TYPES)[number];

export const TYPE_LABELS: Record<QType, string> = {
  MCQ: "QCM",
  TRUE_FALSE: "Vrai / faux",
  SHORT_ANSWER: "Réponse courte",
  FILL_BLANK: "Texte à trous",
  ORDER: "Remise en ordre / chronologie",
  MATCH: "Association",
  CATEGORIZE: "Glisser-déposer dans des catégories",
  NUMERIC: "Calcul (réponse numérique)",
  TIMELINE: "Repérage sur une frise",
  IMAGE_POINT: "Placement sur une carte / image",
  OPEN: "Réponse rédigée (correction guidée)",
};

const nonEmpty = z.string().trim().min(1);

export const dataSchemas = {
  MCQ: z.object({ options: z.array(nonEmpty).min(2), correct: z.array(z.number().int().min(0)).min(1) })
    .refine((d) => d.correct.every((i) => i < d.options.length), "Réponse correcte hors des choix"),
  TRUE_FALSE: z.object({ correct: z.boolean() }),
  SHORT_ANSWER: z.object({ accepted: z.array(nonEmpty).min(1) }),
  FILL_BLANK: z.object({ text: z.string().refine((t) => /\[\[[^\]]+\]\]/.test(t), "Le texte doit contenir au moins un trou [[réponse]]"), wordBank: z.boolean().default(true) }),
  ORDER: z.object({ items: z.array(nonEmpty).min(2) }),
  MATCH: z.object({ pairs: z.array(z.object({ left: nonEmpty, right: nonEmpty })).min(2) }),
  CATEGORIZE: z.object({ categories: z.array(nonEmpty).min(2), items: z.array(z.object({ text: nonEmpty, category: nonEmpty })).min(2) })
    .refine((d) => d.items.every((i) => d.categories.includes(i.category)), "Chaque élément doit appartenir à une catégorie existante"),
  NUMERIC: z.object({ answer: z.number(), tolerance: z.number().min(0).default(0), unit: z.string().default("") }),
  TIMELINE: z.object({ min: z.number(), max: z.number(), tolerance: z.number().min(0).default(0), events: z.array(z.object({ label: nonEmpty, year: z.number() })).min(1) })
    .refine((d) => d.max > d.min && d.events.every((e) => e.year >= d.min && e.year <= d.max), "Les dates doivent être comprises entre le début et la fin de la frise"),
  IMAGE_POINT: z.object({ image: nonEmpty, targets: z.array(z.object({ label: nonEmpty, x: z.number().min(0).max(100), y: z.number().min(0).max(100), r: z.number().min(1).max(30).default(6) })).min(1) }),
  OPEN: z.object({ criteria: z.array(z.object({ label: nonEmpty, points: z.number().min(0) })).min(1), modelAnswer: nonEmpty }),
} satisfies Record<QType, z.ZodTypeAny>;

export type QuestionData = { [K in QType]: z.infer<(typeof dataSchemas)[K]> };

export const contextSchema = z.object({
  text: z.string().optional(),
  imageUrl: z.string().optional(),
  source: z.string().optional(),
  chart: z.object({ title: z.string(), labels: z.array(z.string()), values: z.array(z.number()), unit: z.string().optional() }).optional(),
}).nullable().optional();
export type QuestionContext = z.infer<typeof contextSchema>;

/** Barème d'une question : pour une rédaction, la somme des critères fait foi. */
export function questionPoints(type: QType, data: any, points: number): number {
  if (type === "OPEN") {
    const sum = (data?.criteria ?? []).reduce((s: number, c: any) => s + (Number(c.points) || 0), 0);
    if (sum > 0) return sum;
  }
  return points > 0 ? points : 1;
}

export function validateQuestionData(type: QType, data: unknown) {
  return dataSchemas[type].safeParse(data);
}

// ---------- mélange déterministe (stable au rechargement) ----------
function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
export function seededShuffle<T>(arr: T[], seed: string): T[] {
  const out = arr.slice();
  let s = hash(seed) || 1;
  const rand = () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 100000) / 100000; };
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  // évite de présenter une liste déjà dans le bon ordre
  if (out.length > 1 && out.every((v, i) => v === arr[i])) out.push(out.shift()!);
  return out;
}

/** Indice tiré au hasard mais stable pour une même graine (tirage des variantes). */
export function seededIndex(length: number, seed: string): number {
  let s = hash(seed) || 1;
  s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
  return (s >>> 0) % Math.max(length, 1);
}

export const BLANK_RE = /\[\[([^\]]+)\]\]/g;

export type PublicQuestion = {
  id: string;
  type: QType;
  prompt: string;
  context: QuestionContext;
  points: number;
  view: Record<string, unknown>;
};

/** Ce que le navigateur reçoit : jamais la réponse attendue. */
export function toPublicQuestion(q: { id: string; type: string; prompt: string; context: unknown; data: unknown; points: number }, seed = ""): PublicQuestion {
  const type = q.type as QType;
  const d = q.data as any;
  const s = q.id + seed;
  let view: Record<string, unknown> = {};
  switch (type) {
    case "MCQ": view = { options: d.options, multiple: d.correct.length > 1 }; break;
    case "TRUE_FALSE": view = {}; break;
    case "SHORT_ANSWER": view = {}; break;
    case "FILL_BLANK": {
      const answers: string[] = [];
      const segments = String(d.text).split(BLANK_RE).map((part, i) => {
        if (i % 2 === 1) { answers.push(part.split("|")[0].trim()); return { blank: answers.length - 1 }; }
        return { text: part };
      });
      view = { segments, wordBank: d.wordBank !== false ? seededShuffle(answers, s) : null };
      break;
    }
    case "ORDER": view = { items: seededShuffle(d.items, s) }; break;
    case "MATCH": view = { lefts: d.pairs.map((p: any) => p.left), rights: seededShuffle(d.pairs.map((p: any) => p.right), s) }; break;
    case "CATEGORIZE": view = { categories: d.categories, items: seededShuffle(d.items.map((i: any) => i.text), s) }; break;
    case "NUMERIC": view = { unit: d.unit ?? "" }; break;
    case "TIMELINE": view = { min: d.min, max: d.max, labels: seededShuffle(d.events.map((e: any) => e.label), s) }; break;
    case "IMAGE_POINT": view = { image: d.image, labels: d.targets.map((t: any) => t.label) }; break;
    case "OPEN": view = { criteria: d.criteria }; break;
  }
  return { id: q.id, type, prompt: q.prompt, context: (q.context ?? null) as QuestionContext, points: q.points, view };
}
