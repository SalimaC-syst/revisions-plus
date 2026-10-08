import { prisma } from "./db";

/** Images utilisables dans les contenus : cartes intégrées + images importées. */
export async function availableImages(evaluationId: string) {
  const docs = await prisma.document.findMany({ where: { evaluationId, kind: "FILE", mimeType: { startsWith: "image/" } } });
  return [
    { url: "/cartes/mediterranee-europe.svg", title: "Carte intégrée : Europe et Méditerranée" },
    { url: "/cartes/monde.svg", title: "Carte intégrée : planisphère" },
    { url: "/cartes/france.svg", title: "Carte intégrée : France métropolitaine" },
    ...docs.map((d) => ({ url: `/api/documents/${d.id}`, title: `${d.title}${d.visibleToStudents && d.rightsStatus === "AUTHORIZED" ? "" : " (rendre visible aux élèves pour l'utiliser)"}` })),
  ];
}
