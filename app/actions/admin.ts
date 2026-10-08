"use server";
import { parisEndOfDay } from "@/lib/format";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requirePermission, hashPassword, passwordProblem } from "@/lib/auth";
import { requireEvalEdit, slugify } from "@/lib/admin";
import { audit } from "@/lib/audit";
import { canEditSubject } from "@/lib/access";
import { contextSchema, validateQuestionData, QUESTION_TYPES, type QType } from "@/lib/questions";
import { ALLOWED_MIME, MAX_UPLOAD_BYTES, saveFile, sniffMime, deleteFile } from "@/lib/storage";
import { extractText } from "@/lib/extract";
import { aiConfigured, runAnalysis, runQuestions } from "@/lib/ai";
import { getSetting, setSetting } from "@/lib/settings";
import { stripeClient } from "@/lib/stripe";
import { scoreSummary } from "@/lib/grading";
import type { FormState } from "./auth";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

// ================= niveaux et matières =================
export async function saveLevelAction(_: FormState, f: FormData): Promise<FormState> {
  const u = await requirePermission("pedagogy.publish");
  const name = str(f, "name");
  if (!name) return { error: "Nom requis." };
  const id = str(f, "id");
  const data = { name, order: Number(f.get("order") ?? 0), visible: f.get("visible") === "on" };
  if (id) await prisma.gradeLevel.update({ where: { id }, data });
  else await prisma.gradeLevel.create({ data: { ...data, slug: slugify(name) } });
  await audit(u.id, id ? "level.update" : "level.create", "GradeLevel", id || null, data);
  revalidatePath("/admin/matieres");
  return { ok: "Niveau enregistré." };
}

export async function saveSubjectAction(_: FormState, f: FormData): Promise<FormState> {
  const u = await requirePermission("pedagogy.publish");
  const name = str(f, "name");
  if (!name) return { error: "Nom requis." };
  const id = str(f, "id");
  const color = /^#[0-9a-f]{6}$/i.test(str(f, "color")) ? str(f, "color") : "#1f3a68";
  const data = { name, icon: str(f, "icon") || "📘", color, order: Number(f.get("order") ?? 0), visible: f.get("visible") === "on" };
  if (id) await prisma.subject.update({ where: { id }, data });
  else {
    const gradeLevelId = str(f, "gradeLevelId");
    const slug = slugify(name);
    if (await prisma.subject.findUnique({ where: { gradeLevelId_slug: { gradeLevelId, slug } } })) return { error: "Cette matière existe déjà dans ce niveau." };
    await prisma.subject.create({ data: { ...data, gradeLevelId, slug } });
  }
  await audit(u.id, id ? "subject.update" : "subject.create", "Subject", id || null, data);
  revalidatePath("/admin/matieres");
  return { ok: "Matière enregistrée." };
}

export async function deleteSubjectAction(f: FormData) {
  const u = await requirePermission("pedagogy.publish");
  const id = str(f, "id");
  const count = await prisma.evaluation.count({ where: { subjectId: id } });
  if (count > 0) throw new Error("Cette matière contient des évaluations : fusionnez-la ou masquez-la plutôt.");
  await prisma.subject.delete({ where: { id } });
  await audit(u.id, "subject.delete", "Subject", id);
  revalidatePath("/admin/matieres");
}

export async function mergeSubjectsAction(_: FormState, f: FormData): Promise<FormState> {
  const u = await requirePermission("pedagogy.publish");
  const from = str(f, "from"), into = str(f, "into");
  if (!from || !into || from === into) return { error: "Choisissez deux matières différentes." };
  const [a, b] = await Promise.all([prisma.subject.findUnique({ where: { id: from } }), prisma.subject.findUnique({ where: { id: into } })]);
  if (!a || !b) return { error: "Matière introuvable." };
  await prisma.$transaction([
    prisma.evaluation.updateMany({ where: { subjectId: from }, data: { subjectId: into } }),
    prisma.teacherSubject.deleteMany({ where: { subjectId: from } }),
    prisma.subject.delete({ where: { id: from } }),
  ]);
  await audit(u.id, "subject.merge", "Subject", into, { from: a.name, into: b.name });
  revalidatePath("/admin/matieres");
  return { ok: `« ${a.name} » a été fusionnée dans « ${b.name} ».` };
}

// ================= évaluations =================
const evalSchema = z.object({
  title: z.string().trim().min(3, "Titre trop court").max(200),
  subjectId: z.string().min(1),
  examDate: z.string().optional(),
  teacherName: z.string().trim().max(100).optional(),
  schoolYear: z.string().trim().max(20).optional(),
});

export async function saveEvaluationAction(_: FormState, f: FormData): Promise<FormState> {
  const user = await requirePermission("pedagogy.edit");
  const p = evalSchema.safeParse(Object.fromEntries(f));
  if (!p.success) return { error: p.error.issues[0].message };
  if (!canEditSubject(user, p.data.subjectId)) return { error: "Vous n'avez pas accès à cette matière." };
  const id = str(f, "id");
  const data = {
    title: p.data.title, subjectId: p.data.subjectId,
    examDate: p.data.examDate ? new Date(`${p.data.examDate}T12:00:00`) : null,
    teacherName: p.data.teacherName || null, showTeacher: f.get("showTeacher") === "on",
    schoolYear: p.data.schoolYear || "2026-2027",
    chapters: String(f.get("chapters") ?? "").split(/\r?\n/).map((s) => s.trim()).filter(Boolean),
    objectives: String(f.get("objectives") ?? "").split(/\r?\n/).map((s) => s.trim()).filter(Boolean),
  };
  if (id) {
    await requireEvalEdit(id);
    await prisma.evaluation.update({ where: { id }, data });
    await audit(user.id, "evaluation.update", "Evaluation", id);
    revalidatePath(`/admin/evaluations/${id}`);
    return { ok: "Informations enregistrées." };
  }
  const ev = await prisma.evaluation.create({ data });
  await audit(user.id, "evaluation.create", "Evaluation", ev.id, { title: ev.title });
  redirect(`/admin/evaluations/${ev.id}/documents`);
}

export async function setEvaluationStatusAction(f: FormData) {
  const id = str(f, "id");
  const status = str(f, "status") as "DRAFT" | "PUBLISHED" | "ARCHIVED";
  const { user } = await requireEvalEdit(id, "pedagogy.publish");
  await prisma.evaluation.update({ where: { id }, data: { status, publishedAt: status === "PUBLISHED" ? new Date() : undefined } });
  await audit(user.id, `evaluation.${status.toLowerCase()}`, "Evaluation", id);
  revalidatePath(`/admin/evaluations/${id}`);
  revalidatePath("/admin/evaluations");
}

/** Réutilisation d'une année sur l'autre : copie complète en brouillon. */
export async function duplicateEvaluationAction(f: FormData) {
  const id = str(f, "id");
  const { user, ev } = await requireEvalEdit(id);
  const full = await prisma.evaluation.findUniqueOrThrow({ where: { id }, include: { notions: true, learnBlocks: true, flashcards: true, questions: true, mockExams: true, documents: true } });
  const copy = await prisma.evaluation.create({
    data: { subjectId: ev.subjectId, title: `${ev.title} (copie)`, teacherName: ev.teacherName, showTeacher: ev.showTeacher, chapters: ev.chapters as any, objectives: ev.objectives as any, schoolYear: str(f, "schoolYear") || ev.schoolYear, copiedFromId: ev.id },
  });
  const notionMap = new Map<string, string>();
  for (const n of full.notions) notionMap.set(n.id, (await prisma.notion.create({ data: { evaluationId: copy.id, name: n.name, order: n.order } })).id);
  const nid = (x: string | null) => (x ? notionMap.get(x) ?? null : null);
  const mockMap = new Map<string, string>();
  for (const m of full.mockExams) mockMap.set(m.id, (await prisma.mockExam.create({ data: { evaluationId: copy.id, title: m.title, instructions: m.instructions, durationMin: m.durationMin, status: m.status, source: m.source } })).id);
  for (const b of full.learnBlocks) await prisma.learnBlock.create({ data: { evaluationId: copy.id, notionId: nid(b.notionId), order: b.order, type: b.type, title: b.title, data: b.data as any, status: b.status, source: b.source, sourceRef: b.sourceRef } });
  for (const c of full.flashcards) await prisma.flashcard.create({ data: { evaluationId: copy.id, notionId: nid(c.notionId), front: c.front, back: c.back, order: c.order, status: c.status, source: c.source, sourceRef: c.sourceRef } });
  for (const q of full.questions) await prisma.question.create({ data: { evaluationId: copy.id, notionId: nid(q.notionId), mockExamId: q.mockExamId ? mockMap.get(q.mockExamId) : null, step: q.step, type: q.type, prompt: q.prompt, context: q.context as any, data: q.data as any, explanation: q.explanation, method: q.method, points: q.points, variantGroup: q.variantGroup, order: q.order, status: q.status, source: q.source, sourceRef: q.sourceRef } });
  for (const d of full.documents) await prisma.document.create({ data: { evaluationId: copy.id, title: d.title, kind: d.kind, filename: d.filename, mimeType: d.mimeType, size: d.size, storageKey: d.storageKey, url: d.url, embeddable: d.embeddable, visibleToStudents: d.visibleToStudents, rightsStatus: d.rightsStatus, rightsNote: d.rightsNote, extractedText: d.extractedText, extractionNote: d.extractionNote } });
  await audit(user.id, "evaluation.duplicate", "Evaluation", copy.id, { from: id });
  redirect(`/admin/evaluations/${copy.id}`);
}

export async function deleteEvaluationAction(f: FormData) {
  const id = str(f, "id");
  const { user, ev } = await requireEvalEdit(id, "pedagogy.publish");
  const attempts = await prisma.attempt.count({ where: { evaluationId: id } });
  if (attempts > 0) throw new Error("Des élèves ont déjà travaillé sur cette évaluation : archivez-la plutôt que de la supprimer.");
  await prisma.evaluation.delete({ where: { id } });
  await audit(user.id, "evaluation.delete", "Evaluation", id, { title: ev.title });
  redirect("/admin/evaluations");
}

// ================= documents =================
export async function uploadDocumentAction(_: FormState, f: FormData): Promise<FormState> {
  const evaluationId = str(f, "evaluationId");
  const { user } = await requireEvalEdit(evaluationId);
  const files = f.getAll("files").filter((x): x is File => x instanceof File && x.size > 0);
  const link = str(f, "url");
  if (!files.length && !link) return { error: "Choisissez un fichier ou indiquez un lien." };
  const rightsStatus = (["UNVERIFIED", "AUTHORIZED", "INTERNAL_ONLY"].includes(str(f, "rightsStatus")) ? str(f, "rightsStatus") : "UNVERIFIED") as any;
  const done: string[] = [];
  for (const file of files) {
    if (file.size > MAX_UPLOAD_BYTES) return { error: `« ${file.name} » dépasse 25 Mo.` };
    const buf = Buffer.from(await file.arrayBuffer());
    const mime = sniffMime(buf, file.type);
    if (!mime || !ALLOWED_MIME[mime]) return { error: `« ${file.name} » : format non accepté (PDF, Word, PowerPoint, photo JPG/PNG/WebP ou texte).` };
    const key = await saveFile(buf, ALLOWED_MIME[mime]);
    const ex = await extractText(buf, mime);
    await prisma.document.create({ data: { evaluationId, title: str(f, "title") && files.length === 1 ? str(f, "title") : file.name.replace(/\.[^.]+$/, ""), kind: "FILE", filename: file.name, mimeType: mime, size: file.size, storageKey: key, extractedText: ex.text, extractionNote: ex.note, rightsStatus, createdById: user.id } });
    done.push(file.name);
  }
  if (link) {
    let u: URL;
    try { u = new URL(link); } catch { return { error: "Lien invalide." }; }
    if (u.protocol !== "https:") return { error: "Seuls les liens sécurisés (https) sont acceptés." };
    await prisma.document.create({ data: { evaluationId, title: str(f, "title") || u.hostname, kind: "LINK", url: u.toString(), embeddable: /digipad\.app|youtube|youtu\.be|vimeo/.test(u.hostname), rightsStatus, createdById: user.id } });
    done.push(u.hostname);
  }
  await audit(user.id, "document.add", "Evaluation", evaluationId, { files: done });
  revalidatePath(`/admin/evaluations/${evaluationId}/documents`);
  return { ok: `${done.length} document(s) ajouté(s).` };
}

export async function updateDocumentAction(f: FormData) {
  const doc = await prisma.document.findUniqueOrThrow({ where: { id: str(f, "id") } });
  const { user } = await requireEvalEdit(doc.evaluationId);
  const rightsStatus = str(f, "rightsStatus") as any;
  const visible = f.get("visibleToStudents") === "on";
  await prisma.document.update({ where: { id: doc.id }, data: { title: str(f, "title") || doc.title, rightsStatus, rightsNote: str(f, "rightsNote") || null, visibleToStudents: visible && rightsStatus === "AUTHORIZED" } });
  await audit(user.id, "document.update", "Document", doc.id, { rightsStatus, visible });
  revalidatePath(`/admin/evaluations/${doc.evaluationId}/documents`);
}

export async function deleteDocumentAction(f: FormData) {
  const doc = await prisma.document.findUniqueOrThrow({ where: { id: str(f, "id") } });
  const { user } = await requireEvalEdit(doc.evaluationId);
  await prisma.document.delete({ where: { id: doc.id } });
  if (doc.storageKey && !(await prisma.document.findFirst({ where: { storageKey: doc.storageKey } }))) await deleteFile(doc.storageKey);
  await audit(user.id, "document.delete", "Document", doc.id, { title: doc.title });
  revalidatePath(`/admin/evaluations/${doc.evaluationId}/documents`);
}

// ================= génération IA =================
export async function generateAction(_: FormState, f: FormData): Promise<FormState> {
  const evaluationId = str(f, "evaluationId");
  const { user } = await requireEvalEdit(evaluationId, "pedagogy.ai");
  if (!aiConfigured()) return { error: "Le service d'IA n'est pas encore connecté (clé API manquante). Vous pouvez saisir les contenus manuellement." };
  if (!(await getSetting("features")).aiGenerationEnabled) return { error: "La génération par IA est désactivée dans les paramètres." };
  const documentIds = f.getAll("documentIds").map(String);
  if (!documentIds.length) return { error: "Sélectionnez au moins un document." };
  const what = str(f, "what");
  try {
    if (what === "analysis") await runAnalysis(evaluationId, documentIds, user.id, { flashcards: Number(f.get("flashcards") ?? 15) });
    else await runQuestions(evaluationId, documentIds, user.id, { memorize: Number(f.get("memorize") ?? 8), practice: Number(f.get("practice") ?? 12), exam: Number(f.get("exam") ?? 8) });
  } catch (e) {
    return { error: `La génération a échoué : ${(e as Error).message}` };
  }
  await audit(user.id, `ai.${what}`, "Evaluation", evaluationId, { documentIds });
  revalidatePath(`/admin/evaluations/${evaluationId}`, "layout");
  return { ok: "Contenus générés en brouillon. Relisez-les et validez-les un par un avant publication." };
}

// ================= notions =================
export async function saveNotionAction(_: FormState, f: FormData): Promise<FormState> {
  const evaluationId = str(f, "evaluationId");
  await requireEvalEdit(evaluationId);
  const name = str(f, "name");
  if (!name) return { error: "Nom requis." };
  const id = str(f, "id");
  if (id) await prisma.notion.update({ where: { id }, data: { name } });
  else await prisma.notion.create({ data: { evaluationId, name, order: await prisma.notion.count({ where: { evaluationId } }) } });
  revalidatePath(`/admin/evaluations/${evaluationId}`, "layout");
  return { ok: "Notion enregistrée." };
}

export async function deleteNotionAction(f: FormData) {
  const n = await prisma.notion.findUniqueOrThrow({ where: { id: str(f, "id") } });
  await requireEvalEdit(n.evaluationId);
  await prisma.notion.delete({ where: { id: n.id } });
  revalidatePath(`/admin/evaluations/${n.evaluationId}`, "layout");
}

// ================= contenus : fiche, flashcards, questions =================
async function evalFromItem(kind: "learnBlock" | "flashcard" | "question" | "mockExam", id: string) {
  const item = await (prisma[kind] as any).findUniqueOrThrow({ where: { id } });
  return item.evaluationId as string;
}

export async function saveLearnBlockAction(_: FormState, f: FormData): Promise<FormState> {
  const evaluationId = str(f, "evaluationId");
  const { user } = await requireEvalEdit(evaluationId);
  let data: unknown;
  try { data = JSON.parse(str(f, "data")); } catch { return { error: "Contenu invalide." }; }
  const title = str(f, "title");
  if (!title) return { error: "Titre requis." };
  const fields = { title, type: str(f, "type"), data: data as any, notionId: str(f, "notionId") || null, status: (f.get("validate") === "on" ? "VALIDATED" : "DRAFT") as any };
  const id = str(f, "id");
  if (id) { if ((await evalFromItem("learnBlock", id)) !== evaluationId) return { error: "Incohérence." }; await prisma.learnBlock.update({ where: { id }, data: fields }); }
  else await prisma.learnBlock.create({ data: { ...fields, evaluationId, order: await prisma.learnBlock.count({ where: { evaluationId } }) } });
  await audit(user.id, id ? "content.update" : "content.create", "LearnBlock", id || null, { status: fields.status });
  revalidatePath(`/admin/evaluations/${evaluationId}/fiche`);
  return { ok: fields.status === "VALIDATED" ? "Bloc enregistré et validé." : "Bloc enregistré en brouillon." };
}

export async function saveFlashcardAction(_: FormState, f: FormData): Promise<FormState> {
  const evaluationId = str(f, "evaluationId");
  const { user } = await requireEvalEdit(evaluationId);
  const front = str(f, "front"), back = str(f, "back");
  if (!front || !back) return { error: "Recto et verso requis." };
  const fields = { front, back, notionId: str(f, "notionId") || null, status: (f.get("validate") === "on" ? "VALIDATED" : "DRAFT") as any };
  const id = str(f, "id");
  if (id) { if ((await evalFromItem("flashcard", id)) !== evaluationId) return { error: "Incohérence." }; await prisma.flashcard.update({ where: { id }, data: fields }); }
  else await prisma.flashcard.create({ data: { ...fields, evaluationId, order: await prisma.flashcard.count({ where: { evaluationId } }) } });
  await audit(user.id, id ? "content.update" : "content.create", "Flashcard", id || null, { status: fields.status });
  revalidatePath(`/admin/evaluations/${evaluationId}/flashcards`);
  return { ok: "Flashcard enregistrée." };
}

export async function saveQuestionAction(_: FormState, f: FormData): Promise<FormState> {
  const evaluationId = str(f, "evaluationId");
  const { user } = await requireEvalEdit(evaluationId);
  const type = str(f, "type") as QType;
  if (!QUESTION_TYPES.includes(type)) return { error: "Type inconnu." };
  const prompt = str(f, "prompt");
  if (!prompt) return { error: "L'énoncé est requis." };
  let raw: unknown, ctx: unknown;
  try { raw = JSON.parse(str(f, "data")); ctx = str(f, "context") ? JSON.parse(str(f, "context")) : null; } catch { return { error: "Données invalides." }; }
  const v = validateQuestionData(type, raw);
  if (!v.success) return { error: `Réponse attendue incomplète : ${v.error.issues[0].message}` };
  const c = contextSchema.safeParse(ctx);
  if (!c.success) return { error: "Document d'appui invalide." };
  const step = str(f, "step") as "MEMORIZE" | "PRACTICE" | "EXAM";
  const mockExamId = step === "EXAM" ? str(f, "mockExamId") || null : null;
  if (step === "EXAM" && !mockExamId) return { error: "Choisissez le contrôle blanc." };
  const points = Math.max(0.25, Number(f.get("points") ?? 1));
  const fields = {
    type, prompt, step, mockExamId, data: v.data as any, context: (c.data ?? undefined) as any,
    explanation: str(f, "explanation"), method: str(f, "method"), points: type === "OPEN" ? (v.data as any).criteria.reduce((s: number, x: any) => s + x.points, 0) || points : points,
    variantGroup: step === "EXAM" ? str(f, "variantGroup") || null : null,
    notionId: str(f, "notionId") || null, status: (f.get("validate") === "on" ? "VALIDATED" : "DRAFT") as any,
  };
  const id = str(f, "id");
  if (id) { if ((await evalFromItem("question", id)) !== evaluationId) return { error: "Incohérence." }; await prisma.question.update({ where: { id }, data: fields }); }
  else await prisma.question.create({ data: { ...fields, evaluationId, order: await prisma.question.count({ where: { evaluationId } }) } });
  await audit(user.id, id ? "content.update" : "content.create", "Question", id || null, { status: fields.status, type });
  revalidatePath(`/admin/evaluations/${evaluationId}`, "layout");
  return { ok: fields.status === "VALIDATED" ? "Question enregistrée et validée." : "Question enregistrée en brouillon." };
}

export async function setItemStatusAction(f: FormData) {
  const kind = str(f, "kind") as "learnBlock" | "flashcard" | "question" | "mockExam";
  if (!["learnBlock", "flashcard", "question", "mockExam"].includes(kind)) throw new Error("Type inconnu");
  const evaluationId = await evalFromItem(kind, str(f, "id"));
  const { user } = await requireEvalEdit(evaluationId);
  const status = str(f, "status") === "VALIDATED" ? "VALIDATED" : "DRAFT";
  await (prisma[kind] as any).update({ where: { id: str(f, "id") }, data: { status } });
  await audit(user.id, `content.${status.toLowerCase()}`, kind, str(f, "id"));
  revalidatePath(`/admin/evaluations/${evaluationId}`, "layout");
}

export async function validateAllAction(f: FormData) {
  const evaluationId = str(f, "evaluationId");
  const { user } = await requireEvalEdit(evaluationId);
  const kind = str(f, "kind") as "learnBlock" | "flashcard";
  if (!["learnBlock", "flashcard"].includes(kind)) throw new Error("Type inconnu");
  const r = await (prisma[kind] as any).updateMany({ where: { evaluationId, status: "DRAFT", NOT: { sourceRef: { contains: "à vérifier" } } }, data: { status: "VALIDATED" } });
  await audit(user.id, "content.validate_bulk", kind, evaluationId, { count: r.count });
  revalidatePath(`/admin/evaluations/${evaluationId}`, "layout");
}

export async function deleteItemAction(f: FormData) {
  const kind = str(f, "kind") as "learnBlock" | "flashcard" | "question" | "mockExam";
  if (!["learnBlock", "flashcard", "question", "mockExam"].includes(kind)) throw new Error("Type inconnu");
  const evaluationId = await evalFromItem(kind, str(f, "id"));
  const { user } = await requireEvalEdit(evaluationId);
  await (prisma[kind] as any).delete({ where: { id: str(f, "id") } });
  await audit(user.id, "content.delete", kind, str(f, "id"));
  revalidatePath(`/admin/evaluations/${evaluationId}`, "layout");
}

export async function moveItemAction(f: FormData) {
  const kind = str(f, "kind") as "learnBlock" | "flashcard" | "question";
  if (!["learnBlock", "flashcard", "question"].includes(kind)) throw new Error("Type inconnu");
  const id = str(f, "id");
  const evaluationId = await evalFromItem(kind, id);
  await requireEvalEdit(evaluationId);
  const items: { id: string; order: number }[] = await (prisma[kind] as any).findMany({ where: { evaluationId }, orderBy: { order: "asc" }, select: { id: true, order: true } });
  const i = items.findIndex((x) => x.id === id);
  const j = i + (str(f, "dir") === "up" ? -1 : 1);
  if (i < 0 || j < 0 || j >= items.length) return;
  [items[i], items[j]] = [items[j], items[i]];
  await prisma.$transaction(items.map((x, k) => (prisma[kind] as any).update({ where: { id: x.id }, data: { order: k } })));
  revalidatePath(`/admin/evaluations/${evaluationId}`, "layout");
}

export async function saveMockExamAction(_: FormState, f: FormData): Promise<FormState> {
  const evaluationId = str(f, "evaluationId");
  const { user } = await requireEvalEdit(evaluationId);
  const title = str(f, "title");
  if (!title) return { error: "Titre requis." };
  const fields = { title, instructions: str(f, "instructions"), durationMin: Math.max(5, Math.min(240, Number(f.get("durationMin") ?? 45))), status: (f.get("validate") === "on" ? "VALIDATED" : "DRAFT") as any };
  const id = str(f, "id");
  if (id) await prisma.mockExam.update({ where: { id }, data: fields });
  else await prisma.mockExam.create({ data: { ...fields, evaluationId } });
  await audit(user.id, "mock.save", "MockExam", id || null, fields);
  revalidatePath(`/admin/evaluations/${evaluationId}/controles`);
  return { ok: "Contrôle blanc enregistré." };
}

// ================= correction des réponses rédigées =================
export async function reviewAnswerAction(_: FormState, f: FormData): Promise<FormState> {
  const user = await requirePermission("corrections.review");
  const answer = await prisma.answer.findUniqueOrThrow({ where: { id: str(f, "answerId") }, include: { question: { include: { evaluation: true } } } });
  if (!canEditSubject(user, answer.question.evaluation.subjectId)) return { error: "Vous n'avez pas accès à cette matière." };
  const points = Number(String(f.get("points")).replace(",", "."));
  if (!Number.isFinite(points) || points < 0 || points > answer.maxPoints) return { error: `La note doit être comprise entre 0 et ${answer.maxPoints}.` };
  await prisma.answer.update({ where: { id: answer.id }, data: { pointsAwarded: points, isCorrect: points >= answer.maxPoints, reviewStatus: "VALIDATED", reviewerNote: str(f, "note") || null, reviewedById: user.id, reviewedAt: new Date() } });
  if (answer.attemptId) {
    const all = await prisma.answer.findMany({ where: { attemptId: answer.attemptId } });
    const s = scoreSummary(all);
    await prisma.attempt.update({ where: { id: answer.attemptId }, data: { autoPoints: s.autoPoints, pendingPoints: s.pendingPoints, scoreOn20: s.scoreOn20, status: s.complete ? "GRADED" : "PENDING_REVIEW" } });
  }
  await audit(user.id, "answer.review", "Answer", answer.id, { points });
  revalidatePath("/admin/corrections");
  return { ok: "Correction enregistrée." };
}

// ================= utilisateurs =================
export async function createStaffAction(_: FormState, f: FormData): Promise<FormState> {
  const admin = await requirePermission("users.manage");
  const role = str(f, "role");
  if (!["SUPER_ADMIN", "ADMIN_PEDA", "TEACHER", "PARENT"].includes(role)) return { error: "Rôle invalide." };
  const email = str(f, "email").toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Adresse e-mail invalide." };
  if (await prisma.user.findUnique({ where: { email } })) return { error: "Cette adresse est déjà utilisée." };
  const pw = String(f.get("password") ?? "");
  const pb = passwordProblem(pw);
  if (pb) return { error: pb };
  const u = await prisma.user.create({ data: { email, firstName: str(f, "firstName"), lastName: str(f, "lastName"), role: role as any, passwordHash: await hashPassword(pw) } });
  await audit(admin.id, "user.create", "User", u.id, { role, email });
  revalidatePath("/admin/utilisateurs");
  return { ok: `Compte créé pour ${email}. Communiquez-lui son mot de passe provisoire par un canal sûr.` };
}

export async function updateUserAction(_: FormState, f: FormData): Promise<FormState> {
  const admin = await requirePermission("users.manage");
  const target = await prisma.user.findUniqueOrThrow({ where: { id: str(f, "id") } });
  if (target.role === "SUPER_ADMIN" && admin.role !== "SUPER_ADMIN") return { error: "Action réservée au super-administrateur." };
  const data: any = {};
  const status = str(f, "status");
  if (status === "ACTIVE" || status === "SUSPENDED") data.status = status;
  const role = str(f, "role");
  if (role && target.role !== "STUDENT" && target.role !== "PARENT" && ["SUPER_ADMIN", "ADMIN_PEDA", "TEACHER"].includes(role)) {
    if (target.id === admin.id && role !== "SUPER_ADMIN") return { error: "Vous ne pouvez pas retirer vos propres droits de super-administrateur." };
    data.role = role;
  }
  const pw = String(f.get("password") ?? "");
  if (pw) { const pb = passwordProblem(pw); if (pb) return { error: pb }; data.passwordHash = await hashPassword(pw); }
  if (target.id === admin.id && data.status === "SUSPENDED") return { error: "Vous ne pouvez pas suspendre votre propre compte." };
  await prisma.user.update({ where: { id: target.id }, data });
  if (data.status === "SUSPENDED" || pw) await prisma.session.deleteMany({ where: { userId: target.id } });
  if (f.has("subjects")) {
    const ids = f.getAll("subjects").map(String).filter(Boolean);
    await prisma.teacherSubject.deleteMany({ where: { userId: target.id } });
    if (ids.length) await prisma.teacherSubject.createMany({ data: ids.map((subjectId) => ({ userId: target.id, subjectId })) });
  }
  await audit(admin.id, "user.update", "User", target.id, { status: data.status, role: data.role, passwordReset: !!pw, subjects: f.has("subjects") ? f.getAll("subjects").length : undefined });
  revalidatePath(`/admin/utilisateurs/${target.id}`);
  return { ok: "Compte mis à jour." };
}

/** Effacement RGPD : supprime le parent, ses enfants et leurs données ; conserve les paiements anonymisés (obligation comptable). */
export async function eraseFamilyAction(f: FormData) {
  const admin = await requirePermission("users.manage");
  const parent = await prisma.user.findFirstOrThrow({ where: { id: str(f, "id"), role: "PARENT" } });
  const stripe = stripeClient();
  const subs = await prisma.subscription.findMany({ where: { parentId: parent.id, stripeSubscriptionId: { not: null }, status: { in: ["ACTIVE", "PAST_DUE", "CANCELED"] } } });
  for (const s of subs) if (stripe && s.stripeSubscriptionId) await stripe.subscriptions.cancel(s.stripeSubscriptionId).catch(() => null);
  await prisma.user.deleteMany({ where: { parentId: parent.id } });
  // les demandes RGPD de la famille sont supprimées avec le compte (cascade) ;
  // les paiements sont conservés sans identité (obligation comptable)
  await prisma.user.delete({ where: { id: parent.id } });
  await audit(admin.id, "user.erase", "User", parent.id, { note: "Effacement famille (RGPD)" });
  redirect("/admin/utilisateurs?efface=1");
}

export async function handleDataRequestAction(f: FormData) {
  const admin = await requirePermission("users.manage");
  await prisma.dataRequest.update({ where: { id: str(f, "id") }, data: { status: str(f, "status") as any, response: str(f, "response") || null, handledAt: new Date() } });
  await audit(admin.id, "rgpd.request", "DataRequest", str(f, "id"), { status: str(f, "status") });
  revalidatePath("/admin/rgpd");
}

// ================= abonnements et paiements =================
export async function grantAccessAction(_: FormState, f: FormData): Promise<FormState> {
  const admin = await requirePermission("billing.manage");
  const student = await prisma.user.findFirst({ where: { id: str(f, "studentId"), role: "STUDENT" } });
  if (!student?.parentId) return { error: "Élève introuvable." };
  const until = str(f, "until");
  const plan = await prisma.plan.findFirstOrThrow({ orderBy: { order: "asc" } });
  await prisma.subscription.create({
    data: { parentId: student.parentId, studentId: student.id, planId: plan.id, priceCents: 0, status: "ACTIVE", manualGrant: true, manualNote: str(f, "note") || "Accès accordé par l'établissement", startedAt: new Date(), currentPeriodEnd: until ? parisEndOfDay(until) : null },
  });
  await audit(admin.id, "subscription.grant", "User", student.id, { until, note: str(f, "note") });
  revalidatePath("/admin/abonnements");
  return { ok: `Accès accordé à ${student.firstName}.` };
}

export async function setSubscriptionStatusAction(f: FormData) {
  const admin = await requirePermission("billing.manage");
  const sub = await prisma.subscription.findUniqueOrThrow({ where: { id: str(f, "id") } });
  const status = str(f, "status");
  const stripe = stripeClient();
  if (status === "SUSPENDED") {
    if (stripe && sub.stripeSubscriptionId) await stripe.subscriptions.update(sub.stripeSubscriptionId, { pause_collection: { behavior: "void" } });
    await prisma.subscription.update({ where: { id: sub.id }, data: { status: "SUSPENDED" } });
  } else if (status === "ACTIVE") {
    if (stripe && sub.stripeSubscriptionId) await stripe.subscriptions.update(sub.stripeSubscriptionId, { pause_collection: "" as any });
    await prisma.subscription.update({ where: { id: sub.id }, data: { status: "ACTIVE" } });
  } else if (status === "ENDED") {
    if (stripe && sub.stripeSubscriptionId) await stripe.subscriptions.cancel(sub.stripeSubscriptionId);
    await prisma.subscription.update({ where: { id: sub.id }, data: { status: "ENDED", currentPeriodEnd: new Date(), canceledAt: new Date() } });
  }
  await audit(admin.id, `subscription.${status.toLowerCase()}`, "Subscription", sub.id);
  revalidatePath("/admin/abonnements");
}

export async function refundAction(_: FormState, f: FormData): Promise<FormState> {
  const admin = await requirePermission("billing.manage");
  const pay = await prisma.payment.findUniqueOrThrow({ where: { id: str(f, "paymentId") } });
  const stripe = stripeClient();
  if (!stripe) return { error: "Stripe n'est pas configuré." };
  if (!pay.stripePaymentRef) return { error: "Référence de paiement Stripe inconnue : remboursez depuis le tableau de bord Stripe." };
  const euros = Number(String(f.get("amount")).replace(",", "."));
  const cents = Math.round(euros * 100);
  if (!(cents > 0) || cents > pay.amountCents - pay.refundedCents) return { error: "Montant invalide." };
  const params = pay.stripePaymentRef.startsWith("pi_") ? { payment_intent: pay.stripePaymentRef } : { charge: pay.stripePaymentRef };
  try {
    await stripe.refunds.create({ ...params, amount: cents, reason: "requested_by_customer", metadata: { note: str(f, "note") } });
  } catch (e) {
    return { error: `Stripe a refusé le remboursement : ${(e as Error).message}` };
  }
  const refunded = pay.refundedCents + cents;
  await prisma.payment.update({ where: { id: pay.id }, data: { refundedCents: refunded, status: refunded >= pay.amountCents ? "REFUNDED" : "PARTIALLY_REFUNDED" } });
  await audit(admin.id, "payment.refund", "Payment", pay.id, { cents, note: str(f, "note") });
  revalidatePath("/admin/abonnements");
  return { ok: "Remboursement effectué." };
}

export async function savePlanAction(_: FormState, f: FormData): Promise<FormState> {
  const admin = await requirePermission("billing.manage");
  const price = Math.round(Number(String(f.get("price")).replace(",", ".")) * 100);
  if (!(price > 0)) return { error: "Prix invalide." };
  const data = { name: str(f, "name"), description: str(f, "description"), terms: str(f, "terms"), priceCents: price, commitmentMonths: Math.max(0, Number(f.get("commitmentMonths") ?? 0)), active: f.get("active") === "on" };
  const id = str(f, "id");
  if (id) await prisma.plan.update({ where: { id }, data });
  else await prisma.plan.create({ data: { ...data, code: slugify(data.name).toUpperCase(), order: await prisma.plan.count() } });
  await audit(admin.id, "plan.save", "Plan", id || null, data);
  revalidatePath("/admin/tarifs");
  return { ok: "Formule enregistrée. Le nouveau prix s'applique aux nouvelles souscriptions." };
}

// ================= paramètres =================
export async function saveBrandingAction(_: FormState, f: FormData): Promise<FormState> {
  const admin = await requirePermission("settings.manage");
  const hex = (v: string, d: string) => (/^#[0-9a-f]{6}$/i.test(v) ? v : d);
  const cur = await getSetting("branding");
  const update: any = { schoolName: str(f, "schoolName") || cur.schoolName, shortName: str(f, "shortName") || cur.shortName, tagline: str(f, "tagline"), primary: hex(str(f, "primary"), cur.primary), accent: hex(str(f, "accent"), cur.accent), logoAuthorized: f.get("logoAuthorized") === "on" };
  const logo = f.get("logo");
  if (logo instanceof File && logo.size > 0) {
    if (logo.size > 2 * 1024 * 1024) return { error: "Logo trop lourd (2 Mo max)." };
    const buf = Buffer.from(await logo.arrayBuffer());
    const mime = sniffMime(buf, logo.type);
    if (!mime || !mime.startsWith("image/")) return { error: "Le logo doit être une image PNG, JPG ou WebP." };
    update.logoKey = await saveFile(buf, ALLOWED_MIME[mime]);
  }
  await setSetting("branding", update);
  await audit(admin.id, "settings.branding", "Setting", "branding", update);
  revalidatePath("/", "layout");
  return { ok: "Identité visuelle enregistrée." };
}

export async function saveLegalAction(_: FormState, f: FormData): Promise<FormState> {
  const admin = await requirePermission("settings.manage");
  const keys = ["publisher", "legalForm", "siret", "address", "email", "phone", "director", "host", "mediator", "dpoEmail"] as const;
  const v = Object.fromEntries(keys.map((k) => [k, str(f, k)]));
  await setSetting("legal", v);
  await audit(admin.id, "settings.legal", "Setting", "legal");
  return { ok: "Informations légales enregistrées." };
}

export async function saveFeaturesAction(_: FormState, f: FormData): Promise<FormState> {
  const admin = await requirePermission("settings.manage");
  const v = { aiGenerationEnabled: f.get("aiGenerationEnabled") === "on", aiGradingEnabled: f.get("aiGradingEnabled") === "on" };
  await setSetting("features", v);
  await audit(admin.id, "settings.features", "Setting", "features", v);
  return { ok: "Paramètres enregistrés." };
}
