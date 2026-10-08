import "server-only";
// Tirage des variantes et correction des contrôles blancs (code serveur uniquement).
import { prisma } from "./db";
import { grade, scoreSummary } from "./grading";
import { seededIndex, type QType } from "./questions";
import { XP, awardXp, checkBadges, grantBadge } from "./gamification";
import { getSetting } from "./settings";
import { aiConfigured, suggestOpenGrade } from "./ai";

/** Une question tirée au hasard par groupe de variantes ; les questions sans groupe sont toujours posées. */
export function pickVariant(questions: { id: string; variantGroup: string | null; order: number }[], seed: string): string[] {
  const groups = new Map<string, { id: string; order: number }[]>();
  const out: { id: string; order: number }[] = [];
  for (const q of questions) {
    if (!q.variantGroup) out.push(q);
    else groups.set(q.variantGroup, [...(groups.get(q.variantGroup) ?? []), q]);
  }
  for (const [g, qs] of groups) out.push(qs[seededIndex(qs.length, seed + g)]);
  return out.sort((a, b) => a.order - b.order).map((q) => q.id);
}

export async function gradeMockAttempt(userId: string, attemptId: string) {
  const attempt = await prisma.attempt.findFirst({ where: { id: attemptId, userId, kind: "MOCK_EXAM" } });
  if (!attempt || attempt.status !== "IN_PROGRESS") return;
  const ids = attempt.questionIds as string[];
  const questions = await prisma.question.findMany({ where: { id: { in: ids } } });
  const answers = await prisma.answer.findMany({ where: { attemptId } });
  const features = await getSetting("features");
  for (const q of questions) {
    let a = answers.find((x) => x.questionId === q.id);
    if (!a) a = await prisma.answer.create({ data: { attemptId, userId, questionId: q.id, response: {}, maxPoints: q.points, reviewStatus: "PENDING" } });
    const r = grade(q.type as QType, q.data, a.response, q.points);
    if (r.autoGradable) {
      await prisma.answer.update({ where: { id: a.id }, data: { isCorrect: r.isCorrect, pointsAwarded: r.points, reviewStatus: "AUTO" } });
    } else {
      const text = String((a.response as any)?.text ?? "").trim();
      if (!text) {
        // réponse vide : 0 point, sans appréciation arbitraire
        await prisma.answer.update({ where: { id: a.id }, data: { isCorrect: false, pointsAwarded: 0, reviewStatus: "AUTO", reviewerNote: "Aucune réponse rédigée." } });
      } else if (features.aiGradingEnabled && aiConfigured()) {
        try {
          const suggestion = await suggestOpenGrade(q, text);
          await prisma.answer.update({ where: { id: a.id }, data: { aiSuggestion: suggestion as any, reviewStatus: "AI_SUGGESTED" } });
        } catch { /* reste en attente de correction humaine */ }
      }
    }
  }
  const final = await prisma.answer.findMany({ where: { attemptId } });
  const s = scoreSummary(final);
  await prisma.attempt.update({
    where: { id: attemptId },
    data: { status: s.complete ? "GRADED" : "PENDING_REVIEW", submittedAt: new Date(), autoPoints: s.autoPoints, pendingPoints: s.pendingPoints, maxPoints: s.maxPoints, scoreOn20: s.scoreOn20 },
  });
  await awardXp(userId, XP.mockExam, "mock");
  await checkBadges(userId);
  await checkAllSteps(userId, attempt.evaluationId);
}

export async function checkAllSteps(userId: string, evaluationId: string) {
  const [learn, flash, prac, mock] = await Promise.all([
    prisma.xpEvent.findFirst({ where: { userId, reason: `learn:${evaluationId}` } }),
    prisma.flashcardReview.count({ where: { userId, flashcard: { evaluationId } } }),
    prisma.answer.count({ where: { userId, question: { evaluationId, step: "PRACTICE" } } }),
    prisma.attempt.count({ where: { userId, evaluationId, kind: "MOCK_EXAM", status: { not: "IN_PROGRESS" } } }),
  ]);
  if (learn && flash > 0 && prac > 0 && mock > 0) await grantBadge(userId, "ALL_STEPS");
}
