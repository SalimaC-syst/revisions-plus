// Parcours complet : inscription parent → compte élève → accès → 4 étapes → contrôle blanc → correction → note /20.
import { test, expect, type Page, type Locator, type Browser } from "@playwright/test";

const STAMP = Date.now().toString(36);
const PARENT = { email: `parent.${STAMP}@exemple.fr`, password: "Parent-Test-2026" };
const CHILD = { username: `lea.${STAMP}`, password: "Eleve-Test-2026", firstName: "Léa" };

async function login(browser: Browser, identifier: string, password: string) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  page.on("dialog", (d) => d.accept());
  await page.goto("/connexion");
  await page.getByLabel("Identifiant ou adresse e-mail").fill(identifier);
  await page.getByLabel("Mot de passe").fill(password);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/connexion"));
  return page;
}

/** Répond à la question visible dans `scope` en utilisant les commandes proposées (sans connaître la réponse). */
async function answerAny(scope: Locator) {
  const has = async (l: Locator) => (await l.count()) > 0;
  const choices = scope.getByRole("group", { name: "Choix de réponse" }).getByRole("button");
  if (await has(choices)) return choices.first().click();
  const tf = scope.getByRole("group", { name: "Vrai ou faux" }).getByRole("button");
  if (await has(tf)) return tf.first().click();
  const open = scope.getByLabel("Ta réponse rédigée");
  if (await has(open)) return open.fill("Charlemagne est couronné empereur par le pape à Rome en 800. Il gouverne avec les comtes, contrôlés par les missi dominici.");
  const short = scope.getByLabel("Ta réponse", { exact: true });
  if (await has(short)) return short.fill("Constantinople");
  const blanks = scope.getByLabel(/^Trou \d+$/);
  if (await has(blanks)) { for (const b of await blanks.all()) await b.fill("800"); return; }
  const years = scope.getByLabel(/^Année pour /);
  if (await has(years)) { for (const y of await years.all()) await y.fill("800"); return; }
  const selects = scope.locator("select");
  if (await has(selects)) { for (const s of await selects.all()) await s.selectOption({ index: 1 }); return; }
  const tags = scope.getByLabel("Étiquettes à classer").getByRole("button");
  if (await has(tags)) { await tags.first().click(); await scope.getByRole("button", { name: "Placer ici" }).first().click(); return; }
  const map = scope.locator(".mapbox");
  if (await has(map)) { const n = await scope.getByRole("group", { name: "Noms à placer" }).getByRole("button").count(); for (let i = 0; i < n; i++) await map.click({ position: { x: 40 + i * 30, y: 60 } }); return; }
  // remise en ordre : l'ordre affiché est accepté tel quel
}

async function runPractice(page: Page, startLabel: string) {
  await page.getByRole("button", { name: startLabel }).click();
  for (let i = 0; i < 40; i++) {
    const validate = page.getByRole("button", { name: "Valider ma réponse" });
    await expect(validate).toBeVisible();
    await answerAny(page.locator("main"));
    await validate.click();
    // retour immédiat : correction ou explication affichée
    const next = page.getByRole("button", { name: /^(Question suivante|Terminer)$/ });
    await expect(next).toBeVisible();
    const last = (await next.textContent()) === "Terminer";
    await next.click();
    if (last) break;
  }
  await expect(page.getByRole("button", { name: "Recommencer" })).toBeVisible();
}

test("parcours complet élève sur le module Histoire 5e", async ({ browser }) => {
  // 1. Inscription du parent
  const ctx = await browser.newContext();
  const parent = await ctx.newPage();
  await parent.goto("/inscription");
  await parent.getByLabel("Prénom", { exact: true }).fill("Sophie");
  await parent.getByLabel("Nom", { exact: true }).fill("Martin");
  await parent.getByLabel("Adresse e-mail").fill(PARENT.email);
  await parent.getByLabel(/^Mot de passe/).fill(PARENT.password);
  await parent.getByLabel("Confirmer le mot de passe").fill(PARENT.password);
  await parent.getByLabel(/représentant légal/).check();
  await parent.getByLabel(/politique de confidentialité/).check();
  await parent.getByRole("button", { name: "Créer mon compte parent" }).click();
  await expect(parent.getByText("Votre compte est créé")).toBeVisible();

  // 2. Création du compte élève (sans e-mail)
  await parent.getByLabel("Prénom de l'élève").fill(CHILD.firstName);
  await parent.getByLabel("Classe").selectOption({ label: "Cinquième" });
  await parent.getByLabel("Identifiant de connexion").fill(CHILD.username);
  await parent.locator("#cpw").fill(CHILD.password);
  await parent.getByRole("button", { name: "Créer le compte élève" }).click();
  await expect(parent.getByText("Pas d'abonnement actif")).toBeVisible();

  // 3. Sans compte marchand : le paiement est annoncé comme non ouvert (pas de faux bouton)
  await parent.getByRole("link", { name: "Choisir un abonnement" }).click();
  await expect(parent.getByText("Le paiement en ligne n'est pas encore ouvert")).toBeVisible();
  await expect(parent.getByRole("button", { name: /Payer/ })).toHaveCount(0);

  // 4. L'élève sans abonnement est bloqué
  const studentBlocked = await login(browser, CHILD.username, CHILD.password);
  await expect(studentBlocked).toHaveURL(/\/eleve\/acces/);
  await studentBlocked.context().close();

  // 5. L'établissement accorde l'accès (règlement hors ligne)
  const admin = await login(browser, "admin@demo.local", "Demo-Admin-2026");
  await admin.goto("/admin/abonnements");
  const opt = await admin.locator("#stu option", { hasText: CHILD.username }).getAttribute("value");
  await admin.getByLabel("Élève").selectOption(opt!);
  await admin.getByLabel("Jusqu'au").fill("2027-07-04");
  await admin.getByLabel("Motif").fill("Test E2E");
  await admin.getByRole("button", { name: "Accorder l'accès" }).click();
  await expect(admin.locator(".alert-ok")).toBeVisible();
  await parent.goto("/parent");
  await expect(parent.getByText("Accès actif")).toBeVisible();

  // 6. Espace élève : Espace Cinquième → Histoire → évaluation
  const s = await login(browser, CHILD.username, CHILD.password);
  await expect(s.getByRole("heading", { name: /Espace Cinquième/ })).toBeVisible();
  await expect(s.getByRole("heading", { name: /Espace Sixième/ })).toBeVisible();
  const cinq = s.locator("section", { has: s.getByRole("heading", { name: /Espace Cinquième/ }) });
  await expect(cinq.getByText("Latin")).toBeVisible();
  await cinq.getByRole("link", { name: /Histoire/ }).click();
  await s.getByRole("link", { name: /Byzance et l'Europe carolingienne/ }).click();
  await s.waitForURL(/\/eleve\/evaluation\/[^/]+$/);
  const evalUrl = s.url();

  // Étape 1 : Je comprends
  await s.getByRole("link", { name: /Je comprends/ }).click();
  await expect(s.getByText("Frise chronologique")).toBeVisible();
  await s.getByRole("button", { name: /J'ai lu et compris/ }).click();
  await expect(s.getByText(/✔ Fiche lue/)).toBeVisible();

  // Étape 2 : Je mémorise (flashcards + activités)
  await s.goto(evalUrl + "/memoriser");
  for (let i = 0; i < 30; i++) {
    if (await s.getByText("Paquet terminé").isVisible()) break;
    await s.getByRole("button", { name: "Voir la réponse", exact: true }).click();
    await s.getByRole("button", { name: "✅ Je savais" }).click();
    await s.waitForTimeout(150);
  }
  await expect(s.getByText("Paquet terminé")).toBeVisible();
  await runPractice(s, "Lancer les activités");

  // Étape 3 : Je m'entraîne
  await s.goto(evalUrl + "/entrainer");
  await runPractice(s, "Commencer l'entraînement");

  // Étape 4 : contrôle blanc chronométré
  await s.goto(evalUrl + "/controle");
  await s.getByRole("button", { name: "Commencer le contrôle blanc" }).click();
  await s.waitForURL(/\/eleve\/controle\//);
  const sections = s.locator("main section.card");
  const n = await sections.count();
  expect(n).toBe(6); // une question par groupe de variantes
  for (const sec of await sections.all()) await answerAny(sec);
  await s.waitForTimeout(1200); // enregistrement automatique
  await s.getByRole("button", { name: "Rendre ma copie" }).click();
  await expect(s.getByText(/En attente de correction/).first()).toBeVisible();
  await expect(s.locator(".score-big")).toHaveCount(0); // pas de note /20 inventée tant que la rédaction n'est pas corrigée
  const resultUrl = s.url();

  // 7. L'enseignant corrige la rédaction
  const prof = await login(browser, "prof.histoire@demo.local", "Demo-Prof-2026");
  await prof.goto("/admin/corrections");
  const card = prof.locator(".card", { hasText: CHILD.firstName }).first();
  await expect(card).toBeVisible();
  await card.getByLabel(/Points \(sur 4\)/).fill("3");
  await card.getByLabel("Commentaire pour l'élève").fill("Bien : couronnement, comtes et missi dominici sont cités.");
  await card.getByRole("button", { name: "Valider la correction" }).click();
  await expect(prof.getByText("Rien à corriger pour l'instant")).toBeVisible();

  // 8. La note /20 apparaît chez l'élève avec le corrigé détaillé
  await s.goto(resultUrl);
  await expect(s.locator(".score-big")).toContainText("/20");
  await expect(s.getByText("Bien : couronnement, comtes et missi dominici sont cités.")).toBeVisible();

  // 9. Tableau de bord et progression
  await s.goto(evalUrl);
  await expect(s.getByText("Fiche lue ✔")).toBeVisible();
  await expect(s.getByText(/Meilleure note : .*\/20/)).toBeVisible();
  await s.goto("/eleve/progression");
  await expect(s.getByRole("heading", { level: 1 })).toBeVisible();

  // 10. Le parent voit la progression
  await parent.goto("/parent");
  await expect(parent.getByText(/dernier contrôle blanc : Byzance et l'Europe carolingienne, .*\/20/)).toBeVisible();
});

test("une évaluation dépubliée disparaît pour l'élève, un enseignant ne peut pas publier", async ({ browser }) => {
  const admin = await login(browser, "admin@demo.local", "Demo-Admin-2026");
  await admin.goto("/admin/evaluations");
  await admin.getByRole("link", { name: /Byzance et l'Europe carolingienne/ }).first().click();
  const evalAdminUrl = admin.url();
  await admin.getByRole("button", { name: "Dépublier" }).click();
  await expect(admin.getByRole("button", { name: "Publier" })).toBeVisible();

  const s = await login(browser, "eleve.demo", "Eleve-Demo-2026");
  await s.goto("/eleve");
  const cinq = s.locator("section", { has: s.getByRole("heading", { name: /Espace Cinquième/ }) });
  await cinq.getByRole("link", { name: /Histoire/ }).click();
  await expect(s.getByRole("link", { name: /Byzance/ })).toHaveCount(0);

  const prof = await login(browser, "prof.histoire@demo.local", "Demo-Prof-2026");
  await prof.goto(evalAdminUrl);
  await expect(prof.getByRole("button", { name: "Publier" })).toHaveCount(0);

  await admin.getByRole("button", { name: "Publier" }).click();
  await expect(admin.getByRole("button", { name: "Dépublier" })).toBeVisible();
  await s.reload();
  await expect(s.getByRole("link", { name: /Byzance/ })).toBeVisible();
});

test("sécurité : pages protégées et réponses jamais envoyées au navigateur", async ({ browser, request }) => {
  for (const path of ["/admin", "/parent", "/eleve"]) {
    const r = await request.get(path, { maxRedirects: 0 });
    expect([302, 303, 307, 308]).toContain(r.status());
  }
  const s = await login(browser, "eleve.demo", "Eleve-Demo-2026");
  await s.goto("/admin");
  await expect(s).not.toHaveURL(/\/admin$/);
  const page = await login(browser, "eleve.demo", "Eleve-Demo-2026");
  const bodies: string[] = [];
  page.on("response", async (r) => { if (r.request().method() === "POST") bodies.push(await r.text().catch(() => "")); });
  await page.goto("/eleve");
  const cinq = page.locator("section", { has: page.getByRole("heading", { name: /Espace Cinquième/ }) });
  await cinq.getByRole("link", { name: /Histoire/ }).click();
  await page.getByRole("link", { name: /Byzance/ }).click();
  await page.getByRole("link", { name: /Je m'entraîne/ }).click();
  await page.waitForURL(/\/entrainer$/);
  const html = await page.content();
  await page.getByRole("button", { name: "Commencer l'entraînement" }).click();
  await expect(page.getByRole("button", { name: "Valider ma réponse" })).toBeVisible();
  const all = html + bodies.join("");
  expect(all).not.toMatch(/"correct":|"accepted":|"modelAnswer":/);
  // en-têtes de sécurité
  const r = await request.get("/connexion");
  expect(r.headers()["content-security-policy"]).toBeTruthy();
  expect(r.headers()["x-frame-options"] ?? r.headers()["content-security-policy"]).toBeTruthy();
});
