// Extraction du texte des documents Word et PowerPoint. Les PDF et les photos
// sont lus directement par le modèle d'IA (texte, tableaux, schémas, écriture manuscrite).
import JSZip from "jszip";

export async function extractText(buf: Buffer, mime: string): Promise<{ text: string | null; note: string }> {
  try {
    if (mime.includes("wordprocessingml")) {
      const mammoth = await import("mammoth");
      const r = await mammoth.extractRawText({ buffer: buf });
      return { text: r.value.trim(), note: r.messages.length ? `Avertissements de lecture : ${r.messages.map((m) => m.message).slice(0, 3).join(" ; ")}` : "Texte extrait du document Word." };
    }
    if (mime.includes("presentationml")) {
      const zip = await JSZip.loadAsync(buf);
      const slides = Object.keys(zip.files)
        .filter((f) => /^ppt\/slides\/slide\d+\.xml$/.test(f))
        .sort((a, b) => Number(a.match(/\d+/g)!.pop()) - Number(b.match(/\d+/g)!.pop()));
      const parts: string[] = [];
      for (const [i, f] of slides.entries()) {
        const xml = await zip.files[f].async("string");
        const texts = [...xml.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((m) => decodeXml(m[1]));
        parts.push(`--- Diapositive ${i + 1} ---\n${texts.join("\n")}`);
      }
      return { text: parts.join("\n\n"), note: `${slides.length} diapositives lues (les images des diapositives ne sont pas analysées).` };
    }
    if (mime === "text/plain") return { text: buf.toString("utf8"), note: "Texte brut." };
    return { text: null, note: "Document analysé directement par l'IA (texte, images et mise en page)." };
  } catch (e) {
    return { text: null, note: `Lecture impossible : ${(e as Error).message}` };
  }
}

function decodeXml(s: string) {
  return s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");
}
