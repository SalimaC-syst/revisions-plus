"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireStudent, publishedEvaluation } from "@/lib/student";
import { grade, scoreSummary } from "@/lib/grading";
import { toPublicQuestion, seededShuffle, type PublicQuestion, type QType } from "@/lib/questions";
import { nextReview } from "@/lib/srs";
import { XP, awardXp, checkBadges, BADGES, ENCOURAGEMENTS, pick, grantBadge } from "@/lib/gamification";
import { pickReinforcement, notionMastery, recommendation } from "@/lib/mastery";
import type { Feedback } from "@/components/player/types";
import { gradeMockAttempt, pickVariant, checkAllSteps } from "@/lib/exam";

const badgeInfo = (codes: string[]) => codes.map((c) => ({ name: BADGES[c].name, icon: BADGES[c].icon }));

export async function markLearnDone(evaluationId: string) {
  const user = await requireStudent();
  await publishedEvaluation(evaluationId);
  const done = await prisma.xpEvent.findFirst({ where: { userId: user.id, reason: `learn:${evaluationId}` } });
  if (!done) await awardXp(user.id, XP.activityDone, `learn:${evaluationId}`);
  await checkAllSteps(user.id, evaluationId);
  revalidatePath(`/eleve/evaluation/${evaluationId}`);
  return { xpGained: done ? 0 : XP.activityDone };
}

export async function reviewFlashcard(flashcardId: string, knew: boolean) {
  const user = await requireStudent();
  const card = await prisma.flashcard.findFirst({ where: { id: flashcardId, status: "VALIDATED", evaluation: { status: "PUBLISHED" } } });
  if (!card) throw new Error("Carte introuvable");
  const cur = await prisma.flashcardReview.findUnique({ where: { userId_flashcardId: { userId: user.id, flashcardId } } });
  const nx = nextReview(cur?.box ?? 1, knew);
  await prisma.flashcardReview.upsert({
    where: { userId_flashcardId: { userId: user.id, flashcardId } },
    create: { userId: user.id, flashcardId, box: nx.box, dueAt: nx.dueAt, reviewCount: 1, lapses: knew ? 0 : 1 },
    update: { box: nx.box, dueAt: nx.dueAt, reviewCount: { increment: 1 }, lapses: knew ? undefined : { increment: 1 } },
  });
  await awardXp(user.id, XP.flashcard, "flashcard");
  const newBadges = await checkBadges(user.id);
  return { box: nx.box, newBadges: badgeInfo(newBadges) };
}

type Kind = "PRACTICE" | "MEMORIZE" | "REINFORCEMENT";

/** Démarre une série d'exercices ; renvoie les questions sans les réponses. */
export async function startSession(evaluationId: string, kind: Kind): Promise<{ attemptId: string; questions: PublicQuestion[]; intro?: string }> {
  const user = await requireStudent();
  await publishedEvaluation(evaluationId);
  let ids: string[];
  let intro: string | undefined;
  if (kind === "REINFORCEMENT") {
    const rec = recommendation(await notionMastery(user.id, evaluationId));
    ids = await pickReinforcement(user.id, evaluationId, rec?.weakIds ?? []);
    intro = rec?.text;
  } else {
    const qs = await prisma.question.findMany({ where: { evaluationId, step: kind, status: "VALIDATED" }, orderBy: { order: "asc" }, select: { id: true } });
    ids = qs.map((q) => q.id);
  }
  const attempt = await prisma.attempt.create({ data: { userId: user.id, evaluationId, kind, questionIds: ids } });
  const questions = await prisma.question.findMany({ where: { id: { in: ids } } });
  const byId = new Map(questions.map((q) => [q.id, q]));
  return { attemptId: attempt.id, questions: ids.map((id) => toPublicQuestion(byId.get(id)!, attempt.id)), intro };
}

async function loadAttemptQuestion(userId: string, attemptId: string, questionId: string) {
  const attempt = await prisma.attempt.findFirst({ where: { id: attemptId, userId } });
  if (!attempt || !(attempt.questionIds as string[]).includes(questionId)) throw new Error("Question introuvable");
  const q = await prisma.question.findUniqueOrThrow({ where: { id: questionId } });
  return { attempt, q };
}

function correctionFor(q: { type: string; data: any }) {
  if (q.type === "IMAGE_POINT") return { targets: q.data.targets.map((t: any) => ({ label: t.label, x: t.x, y: t.y })) };
  if (q.type === "OPEN") return { modelAnswer: q.data.modelAnswer, criteria: q.data.criteria };
  if (q.type === "MCQ") return { mcqCorrect: q.data.correct };
  return undefined;
}

/** Exercice d'entraînement : correction immédiate et explication. */
export async function answerQuestion(attemptId: string, questionId: string, response: unknown): Promise<Feedback> {
  const user = await requireStudent();
  const { attempt, q } = await loadAttemptQuestion(user.id, attemptId, questionId);
  if (attempt.kind === "MOCK_EXAM") throw new Error("Pas de correction pendant le contrôle blanc.");
  const r = grade(q.type as QType, q.data, response, q.points);
  const previous = await prisma.answer.findFirst({ where: { userId: user.id, questionId }, orderBy: { createdAt: "desc" } });
  await prisma.answer.create({
    data: { attemptId, userId: user.id, questionId, response: response as any, isCorrect: r.isCorrect, pointsAwarded: r.points, maxPoints: q.points, reviewStatus: "AUTO" },
  });
  let xp = 0;
  if (r.isCorrect) xp = XP.correct; else if ((r.points ?? 0) > 0) xp = XP.partial; else xp = XP.attempted;
  await awardXp(user.id, xp, `answer:${attempt.kind}`);
  const newBadges = await checkBadges(user.id);
  if (r.isCorrect && previous && previous.isCorrect === false && (await grantBadge(user.id, "COMEBACK"))) newBadges.push("COMEBACK");
  await checkAllSteps(user.id, attempt.evaluationId);
  const seed = Date.now();
  const tone = r.isCorrect === null ? null : r.isCorrect ? "correct" : (r.points ?? 0) > 0 ? "partial" : "wrong";
  return {
    isCorrect: r.isCorrect, points: r.points, maxPoints: q.points, parts: r.parts, expected: r.expected,
    explanation: q.explanation, method: q.method,
    encouragement: tone ? pick(ENCOURAGEMENTS[tone], seed) : "Compare ta réponse avec le corrigé et les critères ci-dessous.",
    xpGained: xp, newBadges: badgeInfo(newBadges), correction: correctionFor(q),
  };
}

export async function finishSession(attemptId: string) {
  const user = await requireStudent();
  const attempt = await prisma.attempt.findFirst({ where: { id: attemptId, userId: user.id } });
  if (!attempt || attempt.status !== "IN_PROGRESS") return { xpGained: 0 };
  const answers = await prisma.answer.findMany({ where: { attemptId }, orderBy: { createdAt: "asc" } });
  const firstTry = new Map<string, (typeof answers)[number]>();
  for (const a of answers) if (!firstTry.has(a.questionId)) firstTry.set(a.questionId, a);
  const s = scoreSummary([...firstTry.values()]);
  await prisma.attempt.update({ where: { id: attemptId }, data: { status: "SUBMITTED", submittedAt: new Date(), autoPoints: s.autoPoints, maxPoints: s.maxPoints, pendingPoints: s.pendingPoints } });
  await awardXp(user.id, XP.activityDone, `session:${attempt.kind}`);
  await checkAllSteps(user.id, attempt.evaluationId);
  return { xpGained: XP.activityDone };
}

// ---------- contrôle blanc ----------
export async function startMockExam(mockExamId: string) {
  const user = await requireStudent();
  const mock = await prisma.mockExam.findFirst({ where: { id: mockExamId, status: "VALIDATED", evaluation: { status: "PUBLISHED" } }, include: { questions: { where: { status: "VALIDATED" }, orderBy: { order: "asc" } } } });
  if (!mock || mock.questions.length === 0) throw new Error("Contrôle blanc indisponible.");
  // reprise d'un contrôle non terminé
  const open = await prisma.attempt.findFirst({ where: { userId: user.id, mockExamId, status: "IN_PROGRESS" } });
  if (open) redirect(`/eleve/controle/${open.id}`);
  const ids = pickVariant(mock.questions, `${user.id}-${Date.now()}`);
  const attempt = await prisma.attempt.create({
    data: { userId: user.id, evaluationId: mock.evaluationId, mockExamId, kind: "MOCK_EXAM", questionIds: ids, deadlineAt: new Date(Date.now() + mock.durationMin * 60_000) },
  });
  redirect(`/eleve/controle/${attempt.id}`);
}

export async function saveExamAnswer(attemptId: string, questionId: string, response: unknown) {
  const user = await requireStudent();
  const { attempt, q } = await loadAttemptQuestion(user.id, attemptId, questionId);
  if (attempt.status !== "IN_PROGRESS") return { saved: false };
  if (attempt.deadlineAt && Date.now() > attempt.deadlineAt.getTime() + 60_000) return { saved: false, expired: true };
  const existing = await prisma.answer.findFirst({ where: { attemptId, questionId } });
  if (existing) await prisma.answer.update({ where: { id: existing.id }, data: { response: response as any } });
  else await prisma.answer.create({ data: { attemptId, userId: user.id, questionId, response: response as any, maxPoints: q.points, reviewStatus: "PENDING" } });
  return { saved: true };
}

export async function submitMockExam(attemptId: string) {
  const user = await requireStudent();
  await gradeMockAttempt(user.id, attemptId);
  redirect(`/eleve/controle/${attemptId}`);
}

export async function setGoal(evaluationId: string, target: number) {
  const user = await requireStudent();
  const t = Math.max(5, Math.min(20, Math.round(target)));
  await prisma.studentGoal.upsert({ where: { userId_evaluationId: { userId: user.id, evaluationId } }, create: { userId: user.id, evaluationId, targetScore: t }, update: { targetScore: t } });
  revalidatePath(`/eleve/evaluation/${evaluationId}`);
}

