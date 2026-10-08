import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// Droit d'accès et de portabilité (RGPD art. 15 et 20)
export async function GET(_: Request, { params }: { params: Promise<{ studentId: string }> }) {
  const user = await getCurrentUser();
  const { studentId } = await params;
  if (!user || user.role !== "PARENT") return new NextResponse("Non autorisé", { status: 401 });
  const child = await prisma.user.findFirst({
    where: { id: studentId, parentId: user.id },
    select: {
      firstName: true, lastName: true, username: true, createdAt: true, lastLoginAt: true, gradeLevel: { select: { name: true } },
      attempts: { select: { kind: true, status: true, startedAt: true, submittedAt: true, scoreOn20: true, evaluation: { select: { title: true } } } },
      answers: { select: { createdAt: true, response: true, isCorrect: true, pointsAwarded: true, maxPoints: true, question: { select: { prompt: true } } } },
      flashcardReviews: { select: { box: true, reviewCount: true, flashcard: { select: { front: true } } } },
      xpEvents: { select: { amount: true, reason: true, createdAt: true } },
      badges: { select: { code: true, awardedAt: true } },
    },
  });
  if (!child) return new NextResponse("Introuvable", { status: 404 });
  return new NextResponse(JSON.stringify({ exportedAt: new Date(), student: child }, null, 2), {
    headers: { "content-type": "application/json; charset=utf-8", "content-disposition": `attachment; filename="donnees-${child.username}.json"`, "cache-control": "no-store" },
  });
}
