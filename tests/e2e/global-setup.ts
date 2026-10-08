// Base dédiée aux tests E2E (jamais la base de développement ni de production) :
// recréée vide, migrations appliquées, puis données de démonstration.
import { execSync } from "node:child_process";
import { E2E_DATABASE_URL } from "./env";

export default function globalSetup() {
  const url = new URL(E2E_DATABASE_URL);
  const db = url.pathname.slice(1);
  if (!["localhost", "127.0.0.1"].includes(url.hostname) || !db.endsWith("_e2e")) throw new Error("Base E2E refusée : locale et suffixée _e2e uniquement");
  const admin = new URL(E2E_DATABASE_URL); admin.pathname = "/postgres";
  execSync(`psql "${admin}" -v ON_ERROR_STOP=1 -c 'DROP DATABASE IF EXISTS "${db}" WITH (FORCE)' -c 'CREATE DATABASE "${db}"'`, { stdio: "inherit" });
  const env = { ...process.env, DATABASE_URL: E2E_DATABASE_URL };
  execSync("npx prisma migrate deploy", { stdio: "inherit", env });
  execSync("npx tsx prisma/seed.ts", { stdio: "inherit", env: { ...env, SEED_DEMO: "1" } });
}
