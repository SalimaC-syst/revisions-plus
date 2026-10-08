import { defineConfig } from "@playwright/test";
import { E2E_DATABASE_URL } from "./tests/e2e/env";
import prepareDatabase from "./tests/e2e/global-setup";

// la base doit exister avant le démarrage du serveur web (lancé avant globalSetup) ;
// les processus de test héritent de la variable et ne la recréent pas
if (!process.env.E2E_DB_READY) { prepareDatabase(); process.env.E2E_DB_READY = "1"; }

const PORT = 3100;
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 180_000,
  workers: 1,
  reporter: [["list"], ["html", { outputFolder: "playwright-report", open: "never" }]],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    locale: "fr-FR",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    launchOptions: process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {},
  },
  webServer: {
    command: `PORT=${PORT} HOSTNAME=127.0.0.1 npm start`,
    url: `http://127.0.0.1:${PORT}/api/health`,
    reuseExistingServer: false,
    timeout: 60_000,
    env: { DATABASE_URL: E2E_DATABASE_URL, STORAGE_DIR: "./storage-e2e", APP_URL: `http://localhost:${PORT}`, STRIPE_SECRET_KEY: "", ANTHROPIC_API_KEY: "" },
  },
});
