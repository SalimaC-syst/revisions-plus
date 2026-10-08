// Captures d'écran pour le rapport de test (ordinateur et téléphone). Lancé après le parcours complet.
import { test, expect } from "@playwright/test";

const OUT = "docs/captures";
for (const device of [{ name: "ordinateur", viewport: { width: 1280, height: 860 } }, { name: "mobile", viewport: { width: 390, height: 844 } }]) {
  test(`captures ${device.name}`, async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: device.viewport, locale: "fr-FR" });
    const p = await ctx.newPage();
    p.on("dialog", (d) => d.accept());
    const shot = (n: string) => p.screenshot({ path: `${OUT}/${device.name}-${n}.png`, fullPage: true });
    await p.goto("/"); await shot("01-accueil");
    await p.goto("/connexion");
    await p.getByLabel("Identifiant ou adresse e-mail").fill("eleve.demo");
    await p.getByLabel("Mot de passe").fill("Eleve-Demo-2026");
    await p.getByRole("button", { name: "Se connecter" }).click();
    await p.waitForURL(/\/eleve/); await shot("02-eleve-accueil");
    const cinq = p.locator("section", { has: p.getByRole("heading", { name: /Espace Cinquième/ }) });
    await cinq.getByRole("link", { name: /Histoire/ }).click();
    await p.getByRole("link", { name: /Byzance/ }).click();
    await p.waitForURL(/\/eleve\/evaluation\/[^/]+$/); await shot("03-evaluation");
    const base = p.url();
    await p.goto(base + "/comprendre"); await shot("04-fiche");
    await p.goto(base + "/memoriser"); await shot("05-flashcards");
    await p.goto(base + "/entrainer");
    await p.getByRole("button", { name: "Commencer l'entraînement" }).click();
    await expect(p.getByRole("button", { name: "Valider ma réponse" })).toBeVisible();
    await shot("06-exercice");
    await p.getByRole("group", { name: "Choix de réponse" }).getByRole("button").nth(1).click().catch(() => {});
    await p.getByRole("button", { name: "Valider ma réponse" }).click().catch(() => {});
    await p.waitForTimeout(600); await shot("07-correction-immediate");
    await p.goto(base + "/controle"); await shot("08-controle-blanc");
    const done = p.getByRole("link", { name: "Voir la correction" }).first();
    if (await done.count()) { await done.click(); await shot("09-resultat-controle"); }
    await p.goto("/eleve/progression"); await shot("10-progression");
    await ctx.close();

    const a = await (await browser.newContext({ viewport: device.viewport, locale: "fr-FR" })).newPage();
    await a.goto("/connexion");
    await a.getByLabel("Identifiant ou adresse e-mail").fill("admin@demo.local");
    await a.getByLabel("Mot de passe").fill("Demo-Admin-2026");
    await a.getByRole("button", { name: "Se connecter" }).click();
    await a.waitForURL(/\/admin/); await a.screenshot({ path: `${OUT}/${device.name}-11-admin.png`, fullPage: true });
    await a.goto("/admin/evaluations"); await a.getByRole("link", { name: /Byzance/ }).first().click();
    await a.waitForURL(/\/admin\/evaluations\/[^/]+$/); const ab = a.url();
    await a.screenshot({ path: `${OUT}/${device.name}-12-admin-evaluation.png`, fullPage: true });
    await a.goto(ab + "/exercices"); await a.screenshot({ path: `${OUT}/${device.name}-13-admin-exercices.png`, fullPage: true });
    await a.goto(ab + "/ia"); await a.screenshot({ path: `${OUT}/${device.name}-14-admin-ia.png`, fullPage: true });
    await a.goto("/admin/abonnements"); await a.screenshot({ path: `${OUT}/${device.name}-15-admin-abonnements.png`, fullPage: true });
  });
}
