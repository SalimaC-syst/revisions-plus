import { prisma } from "./db";

export type Branding = { schoolName: string; shortName: string; tagline: string; primary: string; accent: string; logoKey: string | null; logoAuthorized: boolean };
export type Legal = { publisher: string; legalForm: string; siret: string; address: string; email: string; phone: string; director: string; host: string; mediator: string; dpoEmail: string };
export type Features = { aiGenerationEnabled: boolean; aiGradingEnabled: boolean; withdrawalDays: number };

export const DEFAULTS = {
  branding: {
    schoolName: "Collège Saint-Joseph d'Argenteuil",
    shortName: "Révisions+",
    tagline: "Comprendre, mémoriser, s'entraîner, réussir",
    primary: "#1f3a68",
    accent: "#d99a1e",
    logoKey: null,
    logoAuthorized: false,
  } as Branding,
  legal: {
    publisher: "[À compléter : organisme gestionnaire]",
    legalForm: "[À compléter]",
    siret: "[À compléter]",
    address: "[À compléter]",
    email: "[À compléter]",
    phone: "[À compléter]",
    director: "[À compléter : directeur de la publication]",
    host: "[À compléter : hébergeur, adresse]",
    mediator: "[À compléter : médiateur de la consommation]",
    dpoEmail: "[À compléter : contact protection des données]",
  } as Legal,
  features: { aiGenerationEnabled: true, aiGradingEnabled: false, withdrawalDays: 14 } as Features,
};

export async function getSetting<K extends keyof typeof DEFAULTS>(key: K): Promise<(typeof DEFAULTS)[K]> {
  const row = await prisma.setting.findUnique({ where: { key } }).catch(() => null);
  return { ...DEFAULTS[key], ...((row?.value as object) ?? {}) } as (typeof DEFAULTS)[K];
}

export async function setSetting<K extends keyof typeof DEFAULTS>(key: K, value: Partial<(typeof DEFAULTS)[K]>) {
  const current = await getSetting(key);
  const merged = { ...current, ...value };
  await prisma.setting.upsert({ where: { key }, create: { key, value: merged as any }, update: { value: merged as any } });
}

export const CGV_VERSION = "2026-10-v1";
export const PRIVACY_VERSION = "2026-10-v1";
