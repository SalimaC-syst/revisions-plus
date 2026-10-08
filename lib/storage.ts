// Stockage privé des documents : hors du dossier public, servi uniquement
// par une route qui vérifie les droits. Remplaçable par un stockage objet (S3).
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
export const ALLOWED_MIME: Record<string, string> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "text/plain": "txt",
};

const root = () => path.resolve(process.env.STORAGE_DIR ?? "./storage");

/** Vérifie la signature binaire réelle du fichier (et pas seulement l'extension). */
export function sniffMime(buf: Buffer, declared: string): string | null {
  const hex = buf.subarray(0, 8).toString("hex");
  if (hex.startsWith("25504446")) return "application/pdf";
  if (hex.startsWith("89504e47")) return "image/png";
  if (hex.startsWith("ffd8ff")) return "image/jpeg";
  if (buf.subarray(0, 4).toString() === "RIFF" && buf.subarray(8, 12).toString() === "WEBP") return "image/webp";
  if (hex.startsWith("504b0304") && (declared.includes("wordprocessingml") || declared.includes("presentationml"))) return declared;
  if (declared === "text/plain" && !buf.includes(0)) return "text/plain";
  return null;
}

export async function saveFile(buf: Buffer, ext: string) {
  const key = `${new Date().getFullYear()}/${crypto.randomUUID()}.${ext}`;
  const full = path.join(root(), key);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, buf, { mode: 0o600 });
  return key;
}

export async function readFile(key: string) {
  const full = path.join(root(), key);
  if (!full.startsWith(root() + path.sep)) throw new Error("Chemin invalide");
  return fs.readFile(full);
}

export async function deleteFile(key: string) {
  const full = path.join(root(), key);
  if (!full.startsWith(root() + path.sep)) return;
  await fs.rm(full, { force: true });
}
