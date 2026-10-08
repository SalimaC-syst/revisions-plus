import { prisma } from "./db";
import { clientIp } from "./auth";

export async function audit(actorId: string | null, action: string, entity: string, entityId?: string | null, details?: unknown) {
  await prisma.auditLog.create({
    data: { actorId, action, entity, entityId: entityId ?? null, details: (details ?? undefined) as any, ip: await clientIp().catch(() => null) },
  });
}
