import { describe, expect, it } from "vitest";
import { subscriptionGrantsAccess, canEditSubject } from "@/lib/access";
import { nextReview, isMastered } from "@/lib/srs";
import { streakFromDays, levelFor } from "@/lib/gamification";
import { levelOf } from "@/lib/mastery";
import { pickVariant } from "@/lib/exam";
import { toPublicQuestion, validateQuestionData, seededShuffle, questionPoints, type QType } from "@/lib/questions";
import { questionToForm, formToQuestion, blockToForm, formToBlock } from "@/components/admin/formats";
import { scrubPersonalData, questionsSchema } from "@/lib/ai";
import { can } from "@/lib/roles";
import { QUESTIONS, BLOCKS } from "@/prisma/content/hg-5e-byzance";
import { addMonths } from "@/lib/stripe";

const NOW = new Date("2026-10-08T12:00:00Z");
const later = new Date("2026-11-08T12:00:00Z");
const earlier = new Date("2026-10-01T12:00:00Z");

describe("accès aux révisions", () => {
  it("abonnement actif payé jusqu'à une date future", () => {
    expect(subscriptionGrantsAccess({ status: "ACTIVE", currentPeriodEnd: later, manualGrant: false, withdrawalWaived: true, startedAt: NOW }, NOW)).toBe(true);
    expect(subscriptionGrantsAccess({ status: "ACTIVE", currentPeriodEnd: earlier, manualGrant: false, withdrawalWaived: true }, NOW)).toBe(false);
  });
  it("résilié : accès jusqu'à la fin de la période payée, puis coupé", () => {
    expect(subscriptionGrantsAccess({ status: "CANCELED", currentPeriodEnd: later, manualGrant: false, withdrawalWaived: true }, NOW)).toBe(true);
    expect(subscriptionGrantsAccess({ status: "CANCELED", currentPeriodEnd: earlier, manualGrant: false, withdrawalWaived: true }, NOW)).toBe(false);
  });
  it("sans renonciation au droit de rétractation, accès après 14 jours", () => {
    const s = { status: "ACTIVE", currentPeriodEnd: later, manualGrant: false, withdrawalWaived: false, startedAt: new Date("2026-10-01T12:00:00Z") };
    expect(subscriptionGrantsAccess(s, NOW)).toBe(false);
    expect(subscriptionGrantsAccess(s, new Date("2026-10-16T12:00:00Z"))).toBe(true);
  });
  it("suspendu, en attente ou terminé : pas d'accès", () => {
    for (const status of ["SUSPENDED", "PENDING", "ENDED"]) expect(subscriptionGrantsAccess({ status, currentPeriodEnd: later, manualGrant: true }, NOW)).toBe(false);
  });
  it("accès offert par l'administration", () => {
    expect(subscriptionGrantsAccess({ status: "ACTIVE", currentPeriodEnd: null, manualGrant: true }, NOW)).toBe(true);
  });
  it("un enseignant ne modifie que ses matières", () => {
    expect(canEditSubject({ role: "TEACHER", teacherSubjects: [{ subjectId: "hist" }] }, "hist")).toBe(true);
    expect(canEditSubject({ role: "TEACHER", teacherSubjects: [{ subjectId: "hist" }] }, "maths")).toBe(false);
    expect(canEditSubject({ role: "PARENT" }, "hist")).toBe(false);
    expect(canEditSubject({ role: "ADMIN_PEDA" }, "maths")).toBe(true);
  });
  it("droits par rôle", () => {
    expect(can("STUDENT", "pedagogy.edit")).toBe(false);
    expect(can("PARENT", "users.manage")).toBe(false);
    expect(can("TEACHER", "pedagogy.publish")).toBe(false); // l'enseignant propose, l'admin publie
    expect(can("ADMIN_PEDA", "billing.manage")).toBe(false);
    expect(can("SUPER_ADMIN", "admins.manage")).toBe(true);
  });
  it("engagement de 9 mois : fin au bon jour", () => {
    expect(addMonths(new Date("2026-09-01T00:00:00Z"), 9).toISOString().slice(0, 10)).toBe("2027-06-01");
  });
});

describe("répétition espacée", () => {
  it("monte d'une boîte si su, revient en boîte 1 sinon", () => {
    expect(nextReview(2, true, NOW).box).toBe(3);
    expect(nextReview(5, true, NOW).box).toBe(5);
    const miss = nextReview(4, false, NOW);
    expect(miss.box).toBe(1);
    expect(miss.dueAt.getTime() - NOW.getTime()).toBe(10 * 60_000);
    expect(nextReview(3, true, NOW).dueAt.getTime() - NOW.getTime()).toBe(7 * 86400_000);
    expect(isMastered(4)).toBe(true);
  });
});

describe("motivation et maîtrise", () => {
  it("série de jours consécutifs", () => {
    expect(streakFromDays(["2026-10-08", "2026-10-07", "2026-10-06"], NOW)).toBe(3);
    expect(streakFromDays(["2026-10-07", "2026-10-06"], NOW)).toBe(2); // pas encore travaillé aujourd'hui
    expect(streakFromDays(["2026-10-05"], NOW)).toBe(0);
  });
  it("niveaux d'XP croissants", () => {
    expect(levelFor(0).level).toBe(1);
    expect(levelFor(100).level).toBe(2);
    expect(levelFor(250).level).toBe(3);
  });
  it("niveaux de maîtrise", () => {
    expect(levelOf(null, 0)).toBe("nouveau");
    expect(levelOf(0.9, 2)).toBe("en_cours"); // pas assez de réponses pour « maîtrisée »
    expect(levelOf(0.9, 3)).toBe("maitrise");
    expect(levelOf(0.3, 5)).toBe("a_retravailler");
  });
});

describe("contrôle blanc : variantes", () => {
  const qs = [
    { id: "a1", variantGroup: "A", order: 0 }, { id: "a2", variantGroup: "A", order: 1 },
    { id: "b1", variantGroup: "B", order: 2 }, { id: "b2", variantGroup: "B", order: 3 },
    { id: "x", variantGroup: null, order: 4 },
  ];
  it("une question par groupe, déterministe pour une même graine", () => {
    const v = pickVariant(qs, "seed-1");
    expect(v).toHaveLength(3);
    expect(v).toContain("x");
    expect(v.filter((id) => id.startsWith("a"))).toHaveLength(1);
    expect(pickVariant(qs, "seed-1")).toEqual(v);
  });
  it("des graines différentes produisent des sujets différents", () => {
    const seen = new Set(Array.from({ length: 30 }, (_, i) => pickVariant(qs, `s${i}`).join()));
    expect(seen.size).toBeGreaterThan(1);
  });
  it("le module HG totalise 20 points par sujet", () => {
    const groups = new Map<string, number[]>();
    for (const q of QUESTIONS.filter((q) => q.step === "EXAM")) groups.set(q.group!, [...(groups.get(q.group!) ?? []), q.points ?? 1]);
    let total = 0;
    for (const pts of groups.values()) { expect(new Set(pts).size).toBe(1); total += pts[0]; }
    expect(total).toBe(20);
  });
});

describe("contenus et sécurité", () => {
  it("toutes les questions du module HG sont valides", () => {
    for (const q of QUESTIONS) expect(validateQuestionData(q.type as QType, q.data).success, q.prompt).toBe(true);
  });
  it("le navigateur de l'élève ne reçoit jamais la réponse", () => {
    for (const [i, q] of QUESTIONS.entries()) {
      const pub = toPublicQuestion({ id: `q${i}`, type: q.type, prompt: q.prompt, context: q.context ?? null, data: q.data, points: q.points ?? 1 });
      const json = JSON.stringify(pub.view);
      expect(json).not.toMatch(/"correct"|"accepted"|"modelAnswer"|"year"|"answer"|"x":|"category"/);
    }
  });
  it("le mélange ne présente jamais la liste dans l'ordre correct", () => {
    expect(seededShuffle(["1", "2"], "abc")).toEqual(["2", "1"]);
  });
  it("l'éditeur de l'admin ne déforme pas les contenus (aller-retour)", () => {
    for (const q of QUESTIONS) {
      const back = formToQuestion(q.type, questionToForm(q.type, q.data));
      const parsed = validateQuestionData(q.type as QType, back);
      expect(parsed.success, q.prompt).toBe(true);
      expect(parsed.data).toEqual(validateQuestionData(q.type as QType, q.data).data);
    }
    for (const b of BLOCKS) expect(formToBlock(b.type, blockToForm(b.type, b.data))).toEqual(b.data);
  });
  it("l'IA ne reçoit pas les coordonnées présentes dans une copie", () => {
    const s = scrubPersonalData("Écrivez-moi à jean.dupont@mail.fr ou au 06 12 34 56 78.");
    expect(s).not.toMatch(/dupont|06 12/);
  });
  it("une sortie IA mal formée est rejetée", () => {
    expect(questionsSchema.safeParse({ mockExam: { title: "t" }, questions: [] }).success).toBe(false);
  });
});

describe("barème des rédactions", () => {
  it("la somme des critères égale les points de la question", () => {
    for (const q of QUESTIONS.filter((q) => q.type === "OPEN")) {
      expect(q.data.criteria.reduce((s: number, c: any) => s + c.points, 0), q.prompt).toBe(q.points ?? 1);
      expect(questionPoints("OPEN", q.data, 1)).toBe(q.points);
    }
  });
});

describe("dates en heure de Paris", () => {
  it("fin de journée correcte en été et en hiver", async () => {
    const { parisEndOfDay, dateFr } = await import("@/lib/format");
    expect(parisEndOfDay("2027-07-04").toISOString()).toBe("2027-07-04T21:59:59.000Z");
    expect(parisEndOfDay("2027-01-15").toISOString()).toBe("2027-01-15T22:59:59.000Z");
    expect(dateFr(parisEndOfDay("2027-07-04"))).toBe("4 juillet 2027");
  });
});
