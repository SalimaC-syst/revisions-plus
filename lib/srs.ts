// Répétition espacée (système de Leitner à 5 boîtes).
export const BOX_INTERVAL_DAYS = [0, 0, 1, 3, 7, 16]; // index = boîte

export function nextReview(box: number, knew: boolean, now = new Date()) {
  const newBox = knew ? Math.min(box + 1, 5) : 1;
  const days = BOX_INTERVAL_DAYS[newBox];
  // une carte ratée revient dans la même séance (10 minutes)
  const dueAt = new Date(now.getTime() + (knew ? days * 86400_000 : 10 * 60_000));
  return { box: newBox, dueAt };
}

export const isMastered = (box: number) => box >= 4;
