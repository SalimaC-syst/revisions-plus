// Maîtrise des notions et recommandations personnalisées.
import { prisma } from "./db";
import { isMastered } from "./srs";

export type NotionMastery = { id: string; name: string; score: number | null; answered: number; level: "nouveau" | "a_retravailler" | "en_cours" | "maitrise" };

export function levelOf(score: number | null, answered: number): NotionMastery["level"] {
  if (score === null || answered === 0) return "nouveau";
  if (score >= 0.8 && answered >= 3) return "maitrise";
  if (score >= 0.5) return "en_cours";
  return "a_retravailler";
}

export const LEVEL_LABEL: Record<NotionMastery["level"], string> = {
  nouveau: "Pas encore travaillée",
  a_retravailler: "À retravailler",
  en_cours: "En bonne voie",
  maitrise: "Maîtrisée",
};

/** Dernière réponse par question (les progrès comptent plus que les erreurs passées). */
export async function notionMastery(userId: string, evaluationId: string): Promise<NotionMastery[]> {
  const notions = await prisma.notion.findMany({ where: { evaluationId }, orderBy: { order: "asc" } });
  const answers = await prisma.answer.findMany({
    where: { userId, question: { evaluationId }, pointsAwarded: { not: null } },
    orderBy: { createdAt: "asc" },
    select: { questionId: true, pointsAwarded: true, maxPoints: true, question: { select: { notionId: true } } },
  });
  const latest = new Map<string, (typeof answers)[number]>();
  for (const a of answers) latest.set(a.questionId, a);
  const reviews = await prisma.flashcardReview.findMany({ where: { userId, flashcard: { evaluationId } }, select: { box: true, flashcard: { select: { notionId: true } } } });

  return notions.map((n) => {
    const as = [...latest.values()].filter((a) => a.question.notionId === n.id);
    const fr = reviews.filter((r) => r.flashcard.notionId === n.id);
    let num = as.reduce((s, a) => s + (a.pointsAwarded ?? 0) / (a.maxPoints || 1), 0);
    let den = as.length;
    num += fr.reduce((s, r) => s + (isMastered(r.box) ? 1 : r.box >= 2 ? 0.5 : 0), 0) * 0.5;
    den += fr.length * 0.5;
    const answered = as.length + fr.length;
    const score = den > 0 ? num / den : null;
    return { id: n.id, name: n.name, score, answered, level: levelOf(score, answered) };
  });
}

export function recommendation(m: NotionMastery[]): { text: string; weakIds: string[] } | null {
  const worked = m.filter((x) => x.level !== "nouveau");
  if (worked.length === 0) return null;
  const strong = worked.filter((x) => x.level === "maitrise").map((x) => x.name);
  const weak = [...worked].filter((x) => x.level === "a_retravailler" || x.level === "en_cours").sort((a, b) => (a.score ?? 0) - (b.score ?? 0));
  if (weak.length === 0) {
    const untouched = m.filter((x) => x.level === "nouveau").map((x) => x.name);
    return untouched.length
      ? { text: `Bravo, tout ce que tu as travaillé est maîtrisé ! Il te reste à découvrir : ${untouched.slice(0, 3).join(", ")}.`, weakIds: m.filter((x) => x.level === "nouveau").map((x) => x.id) }
      : { text: "Bravo, toutes les notions sont maîtrisées ! Un contrôle blanc te permettra de le confirmer.", weakIds: [] };
  }
  const weakNames = weak.slice(0, 2).map((x) => x.name.toLowerCase());
  const start = strong.length ? `Tu maîtrises bien ${strong.slice(0, 2).map((s) => s.toLowerCase()).join(" et ")}, mais tu dois encore travailler ` : "Tu dois encore travailler ";
  return { text: `${start}${weakNames.join(" et ")}. Je te propose cinq questions pour progresser.`, weakIds: weak.map((x) => x.id) };
}

/** Choisit jusqu'à 5 questions de renforcement sur les notions fragiles. */
export async function pickReinforcement(userId: string, evaluationId: string, weakIds: string[], count = 5) {
  const pool = await prisma.question.findMany({
    where: { evaluationId, status: "VALIDATED", step: { in: ["PRACTICE", "MEMORIZE"] }, type: { not: "OPEN" }, ...(weakIds.length ? { notionId: { in: weakIds } } : {}) },
    select: { id: true, notionId: true },
  });
  const last = await prisma.answer.findMany({ where: { userId, questionId: { in: pool.map((p) => p.id) } }, orderBy: { createdAt: "asc" }, select: { questionId: true, isCorrect: true } });
  const lastBy = new Map(last.map((a) => [a.questionId, a.isCorrect]));
  const rank = (id: string) => (lastBy.get(id) === false ? 0 : lastBy.has(id) ? 2 : 1); // ratées, puis jamais vues, puis réussies
  const sorted = pool.sort((a, b) => rank(a.id) - rank(b.id) || weakIds.indexOf(a.notionId ?? "") - weakIds.indexOf(b.notionId ?? ""));
  return sorted.slice(0, count).map((q) => q.id);
}
