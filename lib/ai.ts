// Génération de ressources pédagogiques à partir des documents des enseignants.
// Règles : fidélité stricte aux documents, aucun contenu publié sans validation humaine,
// aucune donnée d'élève transmise pour la génération.
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { prisma } from "./db";
import { readFile } from "./storage";
import { dataSchemas, questionPoints, type QType } from "./questions";

export const AI_MODEL = process.env.AI_MODEL ?? "claude-opus-5-5";
export const aiConfigured = () => !!process.env.ANTHROPIC_API_KEY;

let client: Anthropic | null = null;
const anthropic = () => (client ??= new Anthropic());

const SYSTEM = `Tu es ingénieur pédagogique pour un collège français (classes de 6e et 5e, élèves de 10 à 13 ans).
Tu prépares des ressources de révision à partir des documents transmis par l'enseignant.

Règles impératives :
- Fidélité absolue aux documents : n'ajoute aucune information, date, définition ou exemple absent des documents. Si une notion est évoquée sans être expliquée, reprends seulement ce qui est écrit.
- Si un passage est illisible, ambigu, ou si tu n'es pas certain d'une lecture (écriture manuscrite, formule, tableau, carte), signale-le avec toVerify = true et décris le problème dans le champ issues du document concerné.
- Indique pour chaque élément le document source (titre exact) et, si possible, la page ou la diapositive.
- Langue : français correct, phrases courtes, vocabulaire du niveau de la classe, ton bienveillant, sans infantiliser.
- Les définitions doivent reprendre la formulation du cours dès qu'elle existe.
- Les questions doivent avoir une seule réponse incontestable d'après le cours, avec une explication qui renvoie au cours.`;

const BLOCK_TYPES = ["KEYPOINTS", "TEXT", "DEFINITIONS", "TIMELINE", "TABLE", "EXAMPLE"] as const;

export const analysisSchema = z.object({
  documents: z.array(z.object({ title: z.string(), readingQuality: z.enum(["bonne", "partielle", "mauvaise"]), issues: z.array(z.string()), summary: z.string() })),
  chapters: z.array(z.string()),
  objectives: z.array(z.string()),
  notions: z.array(z.object({ name: z.string() })),
  memo: z.array(z.object({
    type: z.enum(BLOCK_TYPES),
    title: z.string(),
    notion: z.string(),
    source: z.string(),
    toVerify: z.boolean(),
    text: z.string(),
    items: z.array(z.string()),
    definitions: z.array(z.object({ term: z.string(), definition: z.string() })),
    events: z.array(z.object({ year: z.number(), dateLabel: z.string(), label: z.string() })),
    headers: z.array(z.string()),
    rows: z.array(z.array(z.string())),
  })),
  flashcards: z.array(z.object({ front: z.string(), back: z.string(), notion: z.string(), source: z.string(), toVerify: z.boolean() })),
});
export type Analysis = z.infer<typeof analysisSchema>;

export const AI_QUESTION_TYPES = ["MCQ", "TRUE_FALSE", "SHORT_ANSWER", "FILL_BLANK", "ORDER", "MATCH", "CATEGORIZE", "NUMERIC", "TIMELINE", "OPEN"] as const;

export const questionsSchema = z.object({
  mockExam: z.object({ title: z.string(), durationMin: z.number(), instructions: z.string() }),
  questions: z.array(z.object({
    step: z.enum(["MEMORIZE", "PRACTICE", "EXAM"]),
    type: z.enum(AI_QUESTION_TYPES),
    prompt: z.string(),
    contextText: z.string(),
    notion: z.string(),
    source: z.string(),
    toVerify: z.boolean(),
    explanation: z.string(),
    method: z.string(),
    points: z.number(),
    variantGroup: z.string(),
    dataJson: z.string(),
  })),
});

const DATA_FORMATS = `Format du champ dataJson selon le type (JSON strict) :
- MCQ : {"options":["...","...","..."],"correct":[index de la bonne réponse]}
- TRUE_FALSE : {"correct":true}
- SHORT_ANSWER : {"accepted":["réponse principale","variante acceptée"]}
- FILL_BLANK : {"text":"La capitale de l'Empire byzantin est [[Constantinople]].","wordBank":true} (plusieurs réponses acceptées : [[Aix-la-Chapelle|Aix]])
- ORDER : {"items":["premier","deuxième","troisième"]} (dans le BON ordre)
- MATCH : {"pairs":[{"left":"notion","right":"définition"}]}
- CATEGORIZE : {"categories":["A","B"],"items":[{"text":"...","category":"A"}]}
- NUMERIC : {"answer":12.5,"tolerance":0,"unit":"cm"}
- TIMELINE : {"min":400,"max":1100,"tolerance":10,"events":[{"label":"...","year":800}]}
- OPEN : {"criteria":[{"label":"critère explicite","points":1}],"modelAnswer":"réponse modèle rédigée"}`;

type DocRow = { id: string; title: string; kind: string; mimeType: string | null; storageKey: string | null; extractedText: string | null; url: string | null };

async function documentBlocks(docs: DocRow[]): Promise<Anthropic.ContentBlockParam[]> {
  const blocks: Anthropic.ContentBlockParam[] = [];
  for (const d of docs) {
    if (d.kind === "LINK") { blocks.push({ type: "text", text: `Ressource externe « ${d.title} » : ${d.url} (contenu non transmis).` }); continue; }
    if (!d.storageKey) continue;
    if (d.mimeType === "application/pdf") {
      const data = (await readFile(d.storageKey)).toString("base64");
      blocks.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data }, title: d.title });
    } else if (d.mimeType?.startsWith("image/")) {
      const data = (await readFile(d.storageKey)).toString("base64");
      blocks.push({ type: "text", text: `Document « ${d.title} » (photo ou image) :` });
      blocks.push({ type: "image", source: { type: "base64", media_type: d.mimeType as "image/png" | "image/jpeg" | "image/webp", data } });
    } else if (d.extractedText) {
      blocks.push({ type: "text", text: `Document « ${d.title} » :\n${d.extractedText}` });
    }
  }
  return blocks;
}

async function structuredCall<T extends z.ZodTypeAny>(schema: T, content: Anthropic.ContentBlockParam[]) {
  const stream = anthropic().messages.stream({
    model: AI_MODEL,
    max_tokens: 48000,
    thinking: { type: "adaptive" },
    output_config: { effort: "high", format: zodOutputFormat(schema) },
    system: SYSTEM,
    messages: [{ role: "user", content }],
  } as any);
  const msg = await stream.finalMessage();
  if (msg.stop_reason === "refusal") throw new Error("Le service d'IA a refusé de traiter ces documents.");
  if (msg.stop_reason === "max_tokens") throw new Error("Réponse de l'IA trop longue : générez moins d'éléments à la fois.");
  const text = msg.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join("");
  const parsed = schema.safeParse(JSON.parse(text));
  if (!parsed.success) throw new Error("Réponse de l'IA mal formée.");
  return { data: parsed.data as z.infer<T>, usage: msg.usage };
}

export async function runAnalysis(evaluationId: string, documentIds: string[], userId: string, counts: { flashcards: number }) {
  const ev = await prisma.evaluation.findUniqueOrThrow({ where: { id: evaluationId }, include: { subject: { include: { gradeLevel: true } } } });
  const docs = await prisma.document.findMany({ where: { id: { in: documentIds }, evaluationId } });
  const gen = await prisma.aiGeneration.create({ data: { evaluationId, kind: "ANALYSIS", status: "RUNNING", model: AI_MODEL, createdById: userId } });
  try {
    const content = await documentBlocks(docs);
    content.push({
      type: "text",
      text: `Évaluation : « ${ev.title} » — ${ev.subject.name}, classe de ${ev.subject.gradeLevel.name}.
1. Pour chaque document, évalue la qualité de lecture, liste les problèmes de reconnaissance et résume son contenu.
2. Liste les chapitres, objectifs d'apprentissage et notions essentielles (5 à 8 notions, par exemple « Définitions », « Repères chronologiques », « Localiser sur une carte »).
3. Rédige une fiche mémo en blocs (points clés, définitions, frise si le cours contient des dates, tableau si utile, exemple commenté). Remplis seulement les champs utiles au type de bloc, laisse les autres vides.
4. Rédige environ ${counts.flashcards} flashcards (recto : notion, date ou question courte ; verso : réponse du cours).`,
    });
    const { data, usage } = await structuredCall(analysisSchema, content);
    await saveAnalysis(evaluationId, data, gen.id, docs);
    await prisma.aiGeneration.update({ where: { id: gen.id }, data: { status: "DONE", inputTokens: usage.input_tokens, outputTokens: usage.output_tokens, summary: { notions: data.notions.length, memo: data.memo.length, flashcards: data.flashcards.length, documents: data.documents } } });
  } catch (e) {
    await prisma.aiGeneration.update({ where: { id: gen.id }, data: { status: "ERROR", error: (e as Error).message } });
    throw e;
  }
}

async function notionIdFor(evaluationId: string, name: string, cache: Map<string, string>) {
  const key = name.trim().toLowerCase();
  if (!key) return null;
  if (cache.has(key)) return cache.get(key)!;
  const existing = await prisma.notion.findFirst({ where: { evaluationId, name: { equals: name.trim(), mode: "insensitive" } } });
  const id = existing?.id ?? (await prisma.notion.create({ data: { evaluationId, name: name.trim(), order: cache.size } })).id;
  cache.set(key, id);
  return id;
}

export async function saveAnalysis(evaluationId: string, a: Analysis, generationId: string, docs: { id: string; title: string }[]) {
  const cache = new Map<string, string>();
  for (const n of a.notions) await notionIdFor(evaluationId, n.name, cache);
  const ev = await prisma.evaluation.findUniqueOrThrow({ where: { id: evaluationId } });
  const merge = (cur: unknown, add: string[]) => [...new Set([...(cur as string[]), ...add])];
  await prisma.evaluation.update({ where: { id: evaluationId }, data: { chapters: merge(ev.chapters, a.chapters), objectives: merge(ev.objectives, a.objectives) } });
  for (const d of a.documents) {
    const doc = docs.find((x) => x.title === d.title);
    if (doc) await prisma.document.update({ where: { id: doc.id }, data: { extractionNote: `Lecture ${d.readingQuality}. ${d.issues.length ? "À vérifier : " + d.issues.join(" ; ") : "Aucun problème signalé."}` } });
  }
  const start = await prisma.learnBlock.count({ where: { evaluationId } });
  for (const [i, b] of a.memo.entries()) {
    await prisma.learnBlock.create({
      data: {
        evaluationId, order: start + i, type: b.type, title: b.title, notionId: await notionIdFor(evaluationId, b.notion, cache),
        data: blockData(b), status: "DRAFT", source: "AI", sourceRef: `${b.source}${b.toVerify ? " — ⚠ à vérifier" : ""} (génération ${generationId.slice(-6)})`,
      },
    });
  }
  const fstart = await prisma.flashcard.count({ where: { evaluationId } });
  for (const [i, f] of a.flashcards.entries()) {
    await prisma.flashcard.create({
      data: { evaluationId, order: fstart + i, front: f.front, back: f.back, notionId: await notionIdFor(evaluationId, f.notion, cache), status: "DRAFT", source: "AI", sourceRef: `${f.source}${f.toVerify ? " — ⚠ à vérifier" : ""}` },
    });
  }
}

export function blockData(b: Analysis["memo"][number]) {
  switch (b.type) {
    case "KEYPOINTS": return { items: b.items };
    case "DEFINITIONS": return { items: b.definitions };
    case "TIMELINE": return { events: b.events.map((e) => ({ year: e.year, date: e.dateLabel, label: e.label })) };
    case "TABLE": return { headers: b.headers, rows: b.rows };
    case "EXAMPLE": return { text: b.text, comment: b.items.join("\n") };
    default: return { text: b.text };
  }
}

export async function runQuestions(evaluationId: string, documentIds: string[], userId: string, counts: { memorize: number; practice: number; exam: number }) {
  const ev = await prisma.evaluation.findUniqueOrThrow({ where: { id: evaluationId }, include: { subject: { include: { gradeLevel: true } }, notions: true } });
  const docs = await prisma.document.findMany({ where: { id: { in: documentIds }, evaluationId } });
  const gen = await prisma.aiGeneration.create({ data: { evaluationId, kind: "EXERCISES", status: "RUNNING", model: AI_MODEL, createdById: userId } });
  try {
    const content = await documentBlocks(docs);
    content.push({
      type: "text",
      text: `Évaluation : « ${ev.title} » — ${ev.subject.name}, classe de ${ev.subject.gradeLevel.name}.
Notions : ${ev.notions.map((n) => n.name).join(", ") || "à déterminer d'après le cours"}.
Objectifs : ${(ev.objectives as string[]).join(" ; ") || "à déterminer d'après le cours"}.

Crée :
- ${counts.memorize} activités de mémorisation (step MEMORIZE) : questions rapides, associations, textes à trous, classements chronologiques.
- ${counts.practice} exercices d'entraînement (step PRACTICE) variés et adaptés à la matière (au moins 5 types différents), chacun avec une explication pédagogique et une méthode à retenir.
- Un contrôle blanc (step EXAM) d'environ ${counts.exam} questions, comme un vrai contrôle de ${ev.subject.name} en ${ev.subject.gradeLevel.name}, dont au moins une question rédigée (OPEN) avec critères de correction explicites. Pour permettre de refaire le contrôle avec des variantes, donne à chaque question d'examen un variantGroup (A, B, C...) et propose 2 variantes équivalentes par groupe (même barème, même notion). Le barème d'une variante (points) doit être identique dans son groupe ; le total d'une version doit faire 20 points.
Pour les autres étapes, variantGroup est une chaîne vide. contextText contient un document à analyser (extrait du cours) ou une chaîne vide.
N'utilise pas d'images.
${DATA_FORMATS}`,
    });
    const { data, usage } = await structuredCall(questionsSchema, content);
    const { created, rejected } = await saveQuestions(evaluationId, data, gen.id);
    await prisma.aiGeneration.update({ where: { id: gen.id }, data: { status: "DONE", inputTokens: usage.input_tokens, outputTokens: usage.output_tokens, summary: { created, rejected } } });
  } catch (e) {
    await prisma.aiGeneration.update({ where: { id: gen.id }, data: { status: "ERROR", error: (e as Error).message } });
    throw e;
  }
}

export async function saveQuestions(evaluationId: string, d: z.infer<typeof questionsSchema>, generationId: string) {
  const cache = new Map<string, string>();
  let created = 0;
  const rejected: string[] = [];
  const examQs = d.questions.filter((q) => q.step === "EXAM");
  const mock = examQs.length
    ? await prisma.mockExam.create({ data: { evaluationId, title: d.mockExam.title, durationMin: Math.max(10, Math.min(120, Math.round(d.mockExam.durationMin))), instructions: d.mockExam.instructions, status: "DRAFT", source: "AI" } })
    : null;
  let order = await prisma.question.count({ where: { evaluationId } });
  for (const q of d.questions) {
    let raw: unknown;
    try { raw = JSON.parse(q.dataJson); } catch { rejected.push(`${q.prompt.slice(0, 60)} (données illisibles)`); continue; }
    const parsed = dataSchemas[q.type as QType].safeParse(raw);
    if (!parsed.success) { rejected.push(`${q.prompt.slice(0, 60)} (${parsed.error.issues[0]?.message})`); continue; }
    await prisma.question.create({
      data: {
        evaluationId, step: q.step, type: q.type, prompt: q.prompt, data: parsed.data as any,
        context: q.contextText ? { text: q.contextText } : undefined,
        explanation: q.explanation, method: q.method, points: questionPoints(q.type as QType, parsed.data, q.points),
        variantGroup: q.step === "EXAM" ? q.variantGroup || null : null,
        mockExamId: q.step === "EXAM" ? mock?.id : null,
        notionId: await notionIdFor(evaluationId, q.notion, cache),
        order: order++, status: "DRAFT", source: "AI",
        sourceRef: `${q.source}${q.toVerify ? " — ⚠ à vérifier" : ""} (génération ${generationId.slice(-6)})`,
      },
    });
    created++;
  }
  return { created, rejected };
}

// ---------- correction assistée des réponses rédigées ----------
export const openGradeSchema = z.object({
  criteria: z.array(z.object({ label: z.string(), met: z.enum(["oui", "partiellement", "non"]), points: z.number(), comment: z.string() })),
  feedback: z.string(),
  needsHumanReview: z.boolean(),
});

/** Retire ce qui pourrait identifier l'élève avant tout envoi. */
export function scrubPersonalData(text: string) {
  return text
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "[courriel]")
    .replace(/(\+33|0)[1-9](?:[ .-]?\d{2}){4}/g, "[téléphone]")
    .slice(0, 4000);
}

export async function suggestOpenGrade(question: { prompt: string; data: any }, answerText: string) {
  const { data } = await structuredCall(openGradeSchema, [{
    type: "text",
    text: `Propose une correction d'une réponse d'élève de collège. Tu ne connais pas l'élève.
Question : ${question.prompt}
Réponse attendue (corrigé du professeur) : ${question.data.modelAnswer}
Critères et barème : ${question.data.criteria.map((c: any) => `${c.label} (${c.points} pt)`).join(" ; ")}

Réponse de l'élève :
"""${scrubPersonalData(answerText)}"""

Pour chaque critère, indique s'il est rempli et les points proposés (sans dépasser le barème du critère), avec un commentaire bienveillant et précis. Mets needsHumanReview à true en cas de doute. Cette proposition sera validée par un enseignant.`,
  }]);
  return data;
}
