// Surveillance des erreurs serveur : journalisées en base et consultables dans l'admin.
// Un service externe (Sentry, etc.) peut être branché ici via une variable d'environnement.
export async function onRequestError(err: unknown, request: { path: string }) {
  try {
    const { prisma } = await import("./lib/db");
    const e = err as Error & { digest?: string };
    await prisma.errorLog.create({ data: { message: e.message?.slice(0, 1000) ?? String(err), stack: e.stack?.slice(0, 4000), path: request.path, digest: e.digest } });
  } catch {
    console.error(err);
  }
}
