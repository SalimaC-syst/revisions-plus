// Points d'expérience, niveaux, badges et missions. Aucun classement entre élèves.
import { prisma } from "./db";

export const XP = { correct: 10, partial: 4, attempted: 2, flashcard: 2, mockExam: 50, activityDone: 15 } as const;

export const LEVELS = ["Apprenti", "Curieux", "Explorateur", "Chercheur", "Expert", "Érudit", "Maître du savoir"];

export function levelFor(xp: number) {
  // seuils : 0, 100, 250, 450, 700, 1000, 1350, ...
  let level = 0, threshold = 0, step = 100;
  while (xp >= threshold + step) { threshold += step; step += 50; level++; }
  return {
    level: level + 1,
    name: LEVELS[Math.min(level, LEVELS.length - 1)],
    current: xp - threshold,
    needed: step,
  };
}

export const BADGES: Record<string, { name: string; icon: string; description: string }> = {
  FIRST_STEP: { name: "Premier pas", icon: "👣", description: "Tu as répondu à ta première question." },
  FLASH_10: { name: "Mémoire vive", icon: "🧠", description: "10 flashcards maîtrisées." },
  FLASH_50: { name: "Mémoire d'éléphant", icon: "🐘", description: "50 flashcards maîtrisées." },
  PRACTICE_25: { name: "Entraînement sérieux", icon: "💪", description: "25 exercices réalisés." },
  PRACTICE_100: { name: "Infatigable", icon: "🏃", description: "100 exercices réalisés." },
  FIRST_MOCK: { name: "Prêt pour le jour J", icon: "📝", description: "Premier contrôle blanc terminé." },
  MOCK_PROGRESS: { name: "En progrès", icon: "📈", description: "Ta note a augmenté entre deux contrôles blancs." },
  STREAK_3: { name: "Régularité", icon: "🔥", description: "3 jours de révision d'affilée." },
  STREAK_7: { name: "Une semaine complète", icon: "🌟", description: "7 jours de révision d'affilée." },
  ALL_STEPS: { name: "Parcours complet", icon: "🧭", description: "Les 4 étapes d'une évaluation terminées." },
  COMEBACK: { name: "Je ne lâche rien", icon: "🔁", description: "Tu as réussi une question que tu avais ratée." },
};

export async function awardXp(userId: string, amount: number, reason: string) {
  if (amount <= 0) return;
  await prisma.xpEvent.create({ data: { userId, amount, reason } });
}

export async function grantBadge(userId: string, code: keyof typeof BADGES) {
  const exists = await prisma.userBadge.findUnique({ where: { userId_code: { userId, code } } });
  if (exists) return false;
  await prisma.userBadge.create({ data: { userId, code } });
  return true;
}

export async function totalXp(userId: string) {
  const r = await prisma.xpEvent.aggregate({ where: { userId }, _sum: { amount: true } });
  return r._sum.amount ?? 0;
}

const dayKey = (d: Date) => d.toISOString().slice(0, 10);

export function streakFromDays(days: string[], today = new Date()): number {
  const set = new Set(days);
  let streak = 0;
  const d = new Date(today);
  if (!set.has(dayKey(d))) d.setUTCDate(d.getUTCDate() - 1); // la série tient encore aujourd'hui
  while (set.has(dayKey(d))) { streak++; d.setUTCDate(d.getUTCDate() - 1); }
  return streak;
}

export async function streak(userId: string) {
  const since = new Date(Date.now() - 60 * 86400_000);
  const events = await prisma.xpEvent.findMany({ where: { userId, createdAt: { gte: since } }, select: { createdAt: true } });
  return streakFromDays(events.map((e) => dayKey(e.createdAt)));
}

/** Vérifie les badges après une activité ; renvoie les nouveaux badges. */
export async function checkBadges(userId: string): Promise<string[]> {
  const earned: string[] = [];
  const add = async (code: keyof typeof BADGES, cond: boolean) => { if (cond && (await grantBadge(userId, code))) earned.push(code); };
  const [answers, mastered, mocks, st] = await Promise.all([
    prisma.answer.count({ where: { userId } }),
    prisma.flashcardReview.count({ where: { userId, box: { gte: 4 } } }),
    prisma.attempt.findMany({ where: { userId, kind: "MOCK_EXAM", status: { in: ["GRADED", "PENDING_REVIEW", "SUBMITTED"] } }, orderBy: { submittedAt: "asc" }, select: { scoreOn20: true, autoPoints: true, maxPoints: true, evaluationId: true } }),
    streak(userId),
  ]);
  await add("FIRST_STEP", answers >= 1);
  await add("FLASH_10", mastered >= 10);
  await add("FLASH_50", mastered >= 50);
  await add("PRACTICE_25", answers >= 25);
  await add("PRACTICE_100", answers >= 100);
  await add("FIRST_MOCK", mocks.length >= 1);
  const ratio = (m: (typeof mocks)[number]) => (m.maxPoints ? (m.autoPoints ?? 0) / m.maxPoints : 0);
  const byEval = new Map<string, number[]>();
  for (const m of mocks) byEval.set(m.evaluationId, [...(byEval.get(m.evaluationId) ?? []), ratio(m)]);
  await add("MOCK_PROGRESS", [...byEval.values()].some((r) => r.length >= 2 && r[r.length - 1] > r[r.length - 2]));
  await add("STREAK_3", st >= 3);
  await add("STREAK_7", st >= 7);
  return earned;
}

/** Missions du jour, calculées à partir de l'activité réelle. */
export async function dailyMissions(userId: string) {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const [flash, answers, mocks] = await Promise.all([
    prisma.xpEvent.count({ where: { userId, reason: "flashcard", createdAt: { gte: start } } }),
    prisma.answer.count({ where: { userId, createdAt: { gte: start }, attempt: { kind: { in: ["PRACTICE", "MEMORIZE", "REINFORCEMENT"] } } } }),
    prisma.attempt.count({ where: { userId, kind: { in: ["MOCK_EXAM", "REINFORCEMENT"] }, submittedAt: { gte: start } } }),
  ]);
  return [
    { label: "Réviser 10 flashcards", done: Math.min(flash, 10), goal: 10, xp: 20 },
    { label: "Répondre à 8 questions d'entraînement", done: Math.min(answers, 8), goal: 8, xp: 20 },
    { label: "Faire un renforcement ou un contrôle blanc", done: Math.min(mocks, 1), goal: 1, xp: 30 },
  ];
}

export const ENCOURAGEMENTS = {
  correct: ["Bravo, c'est juste !", "Excellent !", "Parfait, tu maîtrises !", "Bien joué !", "Exactement !"],
  partial: ["Tu y es presque !", "Une bonne partie est juste, regarde la correction.", "Pas mal du tout, encore un petit effort."],
  wrong: ["Pas encore, mais c'est en se trompant qu'on apprend.", "Regarde l'explication, tu vas y arriver.", "Ce n'est pas grave : relis la méthode et réessaie."],
};
export function pick(list: string[], seed: number) {
  return list[Math.abs(seed) % list.length];
}
