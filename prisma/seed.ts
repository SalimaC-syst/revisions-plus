// Données initiales. Idempotent : peut être relancé sans dupliquer.
//   npm run db:seed                → niveaux, matières, offres, module HG en BROUILLON (à relire), super-admin si SEED_ADMIN_* fourni
//   SEED_DEMO=1 npm run db:seed    → en plus : module HG publié et validé + comptes de démonstration (jamais en production)
import { PrismaClient, type Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { EVAL, NOTIONS, BLOCKS, FLASHCARDS, QUESTIONS, REF, LEGACY } from "./content/hg-5e-byzance";
import { validateQuestionData, type QType } from "../lib/questions";

const prisma = new PrismaClient();
const DEMO = process.env.SEED_DEMO === "1";

const BASE: [string, string, string][] = [
  ["Français", "francais", "📖"], ["Mathématiques", "mathematiques", "➗"], ["Histoire", "histoire", "🏛️"], ["Géographie", "geographie", "🌍"],
  ["Anglais", "anglais", "🇬🇧"], ["Physique-Chimie", "physique-chimie", "⚗️"], ["SVT", "svt", "🌱"], ["Éducation musicale", "education-musicale", "🎵"],
  ["Arts plastiques", "arts-plastiques", "🎨"], ["Technologie", "technologie", "⚙️"],
];
const CINQ_EXTRA: [string, string, string][] = [["Espagnol", "espagnol", "🇪🇸"], ["Latin", "latin", "🏺"]];

async function levels() {
  const sixieme = await prisma.gradeLevel.upsert({ where: { slug: "6e" }, update: {}, create: { slug: "6e", name: "Sixième", order: 1 } });
  const cinquieme = await prisma.gradeLevel.upsert({ where: { slug: "5e" }, update: {}, create: { slug: "5e", name: "Cinquième", order: 2 } });
  const lists: [typeof sixieme, [string, string, string][]][] = [
    [sixieme, BASE],
    [cinquieme, [...BASE.slice(0, 5), ...CINQ_EXTRA, ...BASE.slice(5)]],
  ];
  for (const [lvl, subjects] of lists) {
    for (const [i, [name, slug, icon]] of subjects.entries()) {
      await prisma.subject.upsert({
        where: { gradeLevelId_slug: { gradeLevelId: lvl.id, slug } },
        update: {},
        create: { gradeLevelId: lvl.id, name, slug, icon, order: i + 1 },
      });
    }
  }
  return { sixieme, cinquieme };
}

async function plans() {
  await prisma.plan.upsert({ where: { code: "MONTHLY" }, update: {}, create: {
    code: "MONTHLY", name: "Mensuel sans engagement", order: 1, priceCents: 2500, commitmentMonths: 0,
    description: "Accès complet pour un élève, résiliable à tout moment.",
    terms: "25 € par mois, prélevés chaque mois. Résiliable à tout moment depuis l'espace parent : l'accès reste ouvert jusqu'à la fin du mois payé.",
  } });
  await prisma.plan.upsert({ where: { code: "ENGAGEMENT_9" }, update: {}, create: {
    code: "ENGAGEMENT_9", name: "Année scolaire (9 mois)", order: 2, priceCents: 1900, commitmentMonths: 9,
    description: "Accès complet pour un élève pendant 9 mois, à tarif réduit.",
    terms: "19 € par mois pendant 9 mois, soit 171 € au total. Engagement de 9 mois, sans reconduction tacite : l'abonnement s'arrête automatiquement à la fin de la période.",
  } });
}

async function admin() {
  const email = process.env.SEED_ADMIN_EMAIL?.toLowerCase().trim();
  const pw = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !pw) return;
  if (pw.length < 12) throw new Error("SEED_ADMIN_PASSWORD doit faire au moins 12 caractères");
  await prisma.user.upsert({ where: { email }, update: {}, create: { email, passwordHash: await bcrypt.hash(pw, 12), role: "SUPER_ADMIN", firstName: "Administrateur" } });
  console.log(`Super-admin : ${email}`);
}

async function hgModule(cinquiemeId: string) {
  const subject = await prisma.subject.findUniqueOrThrow({ where: { gradeLevelId_slug: { gradeLevelId: cinquiemeId, slug: "histoire" } } });
  const existing = await prisma.evaluation.findFirst({ where: { subjectId: subject.id, title: EVAL.title } });
  if (existing) return existing; // ne jamais écraser un module déjà relu ou modifié par l'équipe
  const status = DEMO ? "VALIDATED" : "DRAFT";

  // contrôle des données avant insertion
  for (const q of QUESTIONS) {
    const r = validateQuestionData(q.type as QType, q.data);
    if (!r.success) throw new Error(`Question invalide (${q.prompt}) : ${r.error.message}`);
  }

  const ev = await prisma.evaluation.create({ data: {
    subjectId: subject.id, title: EVAL.title, teacherName: EVAL.teacherName, chapters: EVAL.chapters, objectives: EVAL.objectives,
    status: DEMO ? "PUBLISHED" : "DRAFT", publishedAt: DEMO ? new Date() : null,
  } });
  const notionIds = new Map<string, string>();
  for (const [i, name] of NOTIONS.entries()) {
    const n = await prisma.notion.create({ data: { evaluationId: ev.id, name, order: i } });
    notionIds.set(name, n.id);
  }
  const nid = (n: string | null | undefined) => (n ? notionIds.get(n) ?? null : null);

  for (const [i, b] of BLOCKS.entries()) {
    await prisma.learnBlock.create({ data: { evaluationId: ev.id, notionId: nid(b.notion), order: i, type: b.type, title: b.title, data: b.data as Prisma.InputJsonValue, status, source: "MANUAL", sourceRef: REF } });
  }
  for (const [i, f] of FLASHCARDS.entries()) {
    const ref = (f.legacy ? LEGACY : REF) + (f.verify ? " — ⚠ à vérifier (définition imprécise sur l'ancien site)" : "");
    await prisma.flashcard.create({ data: {
      evaluationId: ev.id, notionId: nid(f.notion), order: i, front: f.front, back: f.back,
      status: f.verify ? "DRAFT" : status, source: f.legacy ? "LEGACY" : "MANUAL", sourceRef: ref,
    } });
  }
  const mock = await prisma.mockExam.create({ data: {
    evaluationId: ev.id, title: "Contrôle blanc · Byzance et l'Europe carolingienne", durationMin: 40, status,
    instructions: "Réponds à toutes les questions. Tu peux revenir sur une question tant que tu n'as pas rendu ta copie. La rédaction est corrigée par ton professeur.",
  } });
  for (const [i, q] of QUESTIONS.entries()) {
    await prisma.question.create({ data: {
      evaluationId: ev.id, mockExamId: q.step === "EXAM" ? mock.id : null, notionId: nid(q.notion),
      step: q.step, type: q.type as QType, prompt: q.prompt, context: q.context ?? undefined, data: q.data,
      explanation: q.explanation ?? "", method: q.method ?? "", points: q.points ?? 1, variantGroup: q.group ?? null, order: i,
      status, source: q.legacy ? "LEGACY" : "MANUAL", sourceRef: q.legacy ? LEGACY : REF,
    } });
  }
  console.log(`Module HG 5e créé (${DEMO ? "publié, démonstration" : "brouillon à relire"}) : ${ev.id}`);
  return ev;
}

async function demo(cinquiemeId: string) {
  const hash = (p: string) => bcrypt.hash(p, 10);
  await prisma.user.upsert({ where: { email: "admin@demo.local" }, update: {}, create: { email: "admin@demo.local", passwordHash: await hash("Demo-Admin-2026"), role: "SUPER_ADMIN", firstName: "Admin", lastName: "Démo" } });
  const prof = await prisma.user.upsert({ where: { email: "prof.histoire@demo.local" }, update: {}, create: { email: "prof.histoire@demo.local", passwordHash: await hash("Demo-Prof-2026"), role: "TEACHER", firstName: "Professeur", lastName: "Histoire" } });
  const hist = await prisma.subject.findUniqueOrThrow({ where: { gradeLevelId_slug: { gradeLevelId: cinquiemeId, slug: "histoire" } } });
  await prisma.teacherSubject.upsert({ where: { userId_subjectId: { userId: prof.id, subjectId: hist.id } }, update: {}, create: { userId: prof.id, subjectId: hist.id } });
  const parent = await prisma.user.upsert({ where: { email: "parent@demo.local" }, update: {}, create: { email: "parent@demo.local", passwordHash: await hash("Demo-Parent-2026"), role: "PARENT", firstName: "Parent", lastName: "Démo" } });
  const student = await prisma.user.upsert({ where: { username: "eleve.demo" }, update: {}, create: { username: "eleve.demo", passwordHash: await hash("Eleve-Demo-2026"), role: "STUDENT", firstName: "Camille", parentId: parent.id, gradeLevelId: cinquiemeId } });
  if (!(await prisma.subscription.findFirst({ where: { studentId: student.id, manualGrant: true } }))) {
    const plan = await prisma.plan.findUniqueOrThrow({ where: { code: "MONTHLY" } });
    const end = new Date(); end.setFullYear(end.getFullYear() + 1);
    await prisma.subscription.create({ data: { parentId: parent.id, studentId: student.id, planId: plan.id, status: "ACTIVE", priceCents: 0, manualGrant: true, manualNote: "Compte de démonstration", startedAt: new Date(), currentPeriodEnd: end } });
  }
  console.log("Comptes de démonstration : admin@demo.local / Demo-Admin-2026 · prof.histoire@demo.local / Demo-Prof-2026 · parent@demo.local / Demo-Parent-2026 · eleve.demo / Eleve-Demo-2026");
}

async function main() {
  if (DEMO && process.env.NODE_ENV === "production" && process.env.ALLOW_DEMO_SEED !== "1") throw new Error("Refus : données de démonstration en production");
  const { cinquieme } = await levels();
  await plans();
  await admin();
  await hgModule(cinquieme.id);
  if (DEMO) await demo(cinquieme.id);
}

main().then(() => prisma.$disconnect()).catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
