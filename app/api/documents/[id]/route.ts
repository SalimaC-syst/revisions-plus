import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { studentHasAccess, canEditSubject } from "@/lib/access";
import { readFile } from "@/lib/storage";
import { isStaff } from "@/lib/roles";

// Les documents ne sont jamais publics : chaque téléchargement vérifie les droits.
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Non autorisé", { status: 401 });
  const { id } = await params;
  const doc = await prisma.document.findUnique({ where: { id }, include: { evaluation: { include: { subject: true } } } });
  if (!doc || doc.kind !== "FILE" || !doc.storageKey) return new NextResponse("Introuvable", { status: 404 });
  let allowed = false;
  if (isStaff(user.role)) allowed = canEditSubject(user, doc.evaluation.subjectId) || user.role !== "TEACHER";
  else if (user.role === "STUDENT") {
    allowed = doc.visibleToStudents && doc.rightsStatus === "AUTHORIZED" && doc.evaluation.status === "PUBLISHED" && (await studentHasAccess(user.id));
  }
  if (!allowed) return new NextResponse("Accès refusé", { status: 403 });
  const buf = await readFile(doc.storageKey);
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "content-type": doc.mimeType ?? "application/octet-stream",
      "content-disposition": `inline; filename*=UTF-8''${encodeURIComponent(doc.filename ?? "document")}`,
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
