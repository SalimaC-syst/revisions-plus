export const euros = (cents: number) => (cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
export const dateFr = (d: Date | string | null | undefined, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" }) =>
  d ? new Date(d).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", ...opts }) : "";
export const dateTimeFr = (d: Date | string | null | undefined) =>
  d ? new Date(d).toLocaleString("fr-FR", { timeZone: "Europe/Paris", dateStyle: "short", timeStyle: "short" }) : "";
export const daysUntil = (d: Date | string) => Math.ceil((new Date(d).getTime() - Date.now()) / 86400_000);
export const note20 = (x: number | null | undefined) => (x === null || x === undefined ? "—" : `${x.toLocaleString("fr-FR", { maximumFractionDigits: 2 })}/20`);

/** « AAAA-MM-JJ » saisi en France → 23:59:59 heure de Paris ce jour-là (été comme hiver). */
export function parisEndOfDay(day: string): Date {
  const utc = new Date(`${day}T23:59:59Z`);
  const paris = new Date(utc.toLocaleString("en-US", { timeZone: "Europe/Paris" }));
  const asUtc = new Date(utc.toLocaleString("en-US", { timeZone: "UTC" }));
  return new Date(utc.getTime() - (paris.getTime() - asUtc.getTime()));
}
