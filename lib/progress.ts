// Progression réelle de l'élève, calculée à partir des données enregistrées.
import { prisma } from "./db";
import { isMastered } from "./srs";

export type EvalProgress = {
  learnDone: boolean;
  flashMastered: number; flashTotal: number;
  memorizeDone: number; memorizeTotal: number;
  practiceDone: number; practiceTotal: number;
  mockAttempts: number; bestScore: number | null; lastScore: number | null; pendingReview: boolean;
  percent: number;
};

export async function evaluationProgress(userId: string, evaluationId: string): Promise<EvalProgress> {
  const [learn, flashTotal, flashReviews, memQs, pracQs, mocks] = await Promise.all([
    prisma.xpEvent.findFirst({ where: { userId, reason: `learn:${evaluationId}` } }),
    prisma.flashcard.count({ where: { evaluationId, status: "VALIDATED" } }),
    prisma.flashcardReview.findMany({ where: { userId, flashcard: { evaluationId, status: "VALIDATED" } }, select: { box: true } }),
    prisma.question.findMany({ where: { evaluationId, step: "MEMORIZE", status: "VALIDATED" }, select: { id: true } }),
    prisma.question.findMany({ where: { evaluationId, step: "PRACTICE", status: "VALIDATED" }, select: { id: true } }),
    prisma.attempt.findMany({ where: { userId, evaluationId, kind: "MOCK_EXAM", status: { not: "IN_PROGRESS" } }, orderBy: { submittedAt: "asc" }, select: { scoreOn20: true, status: true } }),
  ]);
  const correctIds = async (ids: string[]) => ids.length ? (await prisma.answer.findMany({ where: { userId, questionId: { in: ids }, OR: [{ isCorrect: true }, { isCorrect: null }] }, distinct: ["questionId"], select: { questionId: true } })).length : 0;
  const memorizeDone = await correctIds(memQs.map((q) => q.id));
  const practiceDone = await correctIds(pracQs.map((q) => q.id));
  const flashMastered = flashReviews.filter((r) => isMastered(r.box)).length;
  const scores = mocks.map((m) => m.scoreOn20).filter((s): s is number => s !== null);
  const ratio = (a: number, b: number) => (b ? a / b : 0);
  const memRatio = flashTotal + memQs.length ? (flashMastered + memorizeDone) / (flashTotal + memQs.length) : 0;
  const examRatio = scores.length ? Math.max(...scores) / 20 : mocks.length ? 0.5 : 0;
  const percent = Math.round(((learn ? 1 : 0) + memRatio + ratio(practiceDone, pracQs.length) + examRatio) / 4 * 100);
  return {
    learnDone: !!learn, flashMastered, flashTotal, memorizeDone, memorizeTotal: memQs.length,
    practiceDone, practiceTotal: pracQs.length, mockAttempts: mocks.length,
    bestScore: scores.length ? Math.max(...scores) : null, lastScore: scores.length ? scores[scores.length - 1] : null,
    pendingReview: mocks.some((m) => m.status === "PENDING_REVIEW"),
    percent,
  };
}

/** Évaluations publiées visibles par l'élève (son niveau). */
export async function studentEvaluations(gradeLevelId: string | null) {
  return prisma.evaluation.findMany({
    where: { status: "PUBLISHED", subject: { visible: true, gradeLevelId: gradeLevelId ?? undefined } },
    include: { subject: { include: { gradeLevel: true } } },
    orderBy: [{ examDate: "asc" }],
  });
}
