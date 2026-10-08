"use client";
import { useMemo, useState } from "react";
import { ActionForm } from "@/components/forms/ActionForm";
import { saveLearnBlockAction, saveQuestionAction } from "@/app/actions/admin";
import { blockToForm, formToBlock, formToQuestion, questionToForm, QUESTION_HELP } from "./formats";
import { TYPE_LABELS, QUESTION_TYPES } from "@/lib/questions";

type Notion = { id: string; name: string };

const BLOCK_TYPES: Record<string, string> = {
  KEYPOINTS: "Points clés (liste)", DEFINITIONS: "Définitions", TIMELINE: "Frise chronologique", TABLE: "Tableau",
  TEXT: "Texte explicatif", EXAMPLE: "Exemple commenté", MEDIA: "Image, carte, vidéo ou lien",
};

function NotionSelect({ notions, value }: { notions: Notion[]; value?: string | null }) {
  return (
    <div className="field"><label>Notion</label>
      <select name="notionId" defaultValue={value ?? ""}><option value="">— Aucune —</option>{notions.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}</select>
    </div>
  );
}

export function LearnBlockEditor({ evaluationId, notions, block, images }: { evaluationId: string; notions: Notion[]; block?: { id: string; type: string; title: string; data: any; notionId: string | null; status: string }; images: { url: string; title: string }[] }) {
  const [type, setType] = useState(block?.type ?? "KEYPOINTS");
  const [f, setF] = useState<Record<string, string>>(blockToForm(block?.type ?? "KEYPOINTS", block?.data));
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  const data = useMemo(() => JSON.stringify(formToBlock(type, f)), [type, f]);
  const help: Record<string, string> = { KEYPOINTS: "Un point par ligne.", DEFINITIONS: "Une définition par ligne : terme = définition", TIMELINE: "Un événement par ligne : année | événement, ou année | date affichée | événement", TABLE: "Première ligne : titres des colonnes séparés par |. Puis une ligne par rangée." };
  return (
    <ActionForm action={saveLearnBlockAction} submitLabel="Enregistrer le bloc" resetOnSuccess={!block}>
      <input type="hidden" name="evaluationId" value={evaluationId} />
      {block && <input type="hidden" name="id" value={block.id} />}
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="data" value={data} />
      <div className="grid-2">
        <div className="field"><label>Type de bloc</label><select value={type} onChange={(e) => { setType(e.target.value); setF({}); }} disabled={!!block}>{Object.entries(BLOCK_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
        <div className="field"><label>Titre</label><input name="title" type="text" defaultValue={block?.title} required /></div>
      </div>
      {["KEYPOINTS", "DEFINITIONS", "TIMELINE", "TABLE"].includes(type) && <div className="field"><label>Contenu <span className="hint">{help[type]}</span></label><textarea value={f.lines ?? ""} onChange={set("lines")} rows={8} /></div>}
      {["TEXT", "EXAMPLE"].includes(type) && <div className="field"><label>Texte</label><textarea value={f.text ?? ""} onChange={set("text")} rows={6} /></div>}
      {type === "EXAMPLE" && <div className="field"><label>Commentaire</label><textarea value={f.comment ?? ""} onChange={set("comment")} rows={3} /></div>}
      {type === "MEDIA" && (
        <div className="grid-2">
          <div className="field"><label>Type</label><select value={f.kind ?? "video"} onChange={set("kind")}><option value="image">Image ou carte</option><option value="video">Vidéo (YouTube, Vimeo)</option><option value="link">Lien (Digipad, site)</option></select></div>
          <div className="field"><label>Adresse</label>
            <input type="text" value={f.url ?? ""} onChange={set("url")} placeholder="https://… ou image importée" list={`imgs-${evaluationId}`} />
            <datalist id={`imgs-${evaluationId}`}>{images.map((i) => <option key={i.url} value={i.url}>{i.title}</option>)}</datalist>
          </div>
          <div className="field"><label>Légende</label><input type="text" value={f.caption ?? ""} onChange={set("caption")} /></div>
          <div className="field"><label>Texte alternatif (accessibilité)</label><input type="text" value={f.alt ?? ""} onChange={set("alt")} /></div>
        </div>
      )}
      <NotionSelect notions={notions} value={block?.notionId} />
      <label className="check"><input type="checkbox" name="validate" defaultChecked={block?.status === "VALIDATED"} /> J'ai vérifié ce contenu : il est fidèle au cours (validé)</label>
    </ActionForm>
  );
}

type Q = { id: string; type: string; step: string; prompt: string; context: any; data: any; explanation: string; method: string; points: number; variantGroup: string | null; notionId: string | null; mockExamId: string | null; status: string };

export function QuestionEditor({ evaluationId, notions, question, step, mockExams, images }: { evaluationId: string; notions: Notion[]; question?: Q; step: "MEMORIZE" | "PRACTICE" | "EXAM"; mockExams?: { id: string; title: string }[]; images: { url: string; title: string }[] }) {
  const [type, setType] = useState(question?.type ?? "MCQ");
  const [f, setF] = useState<Record<string, string>>(questionToForm(question?.type ?? "MCQ", question?.data));
  const [ctx, setCtx] = useState<{ text?: string; imageUrl?: string; source?: string }>(question?.context ?? {});
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  const data = useMemo(() => JSON.stringify(formToQuestion(type, f)), [type, f]);
  const context = ctx.text || ctx.imageUrl ? JSON.stringify({ text: ctx.text || undefined, imageUrl: ctx.imageUrl || undefined, source: ctx.source || undefined }) : "";
  const help = QUESTION_HELP[type] ?? {};
  const pickPoint = (e: React.MouseEvent<HTMLImageElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - r.left) / r.width) * 1000) / 10, y = Math.round(((e.clientY - r.top) / r.height) * 1000) / 10;
    const label = window.prompt(`Nom du lieu en (${x}, ${y}) :`);
    if (label) setF({ ...f, lines: `${f.lines ? f.lines + "\n" : ""}${label} = ${x}, ${y}` });
  };
  return (
    <ActionForm action={saveQuestionAction} submitLabel="Enregistrer la question" resetOnSuccess={!question}>
      <input type="hidden" name="evaluationId" value={evaluationId} />
      {question && <input type="hidden" name="id" value={question.id} />}
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="step" value={step} />
      <input type="hidden" name="data" value={data} />
      <input type="hidden" name="context" value={context} />
      <div className="grid-2">
        <div className="field"><label>Format</label><select value={type} onChange={(e) => { setType(e.target.value); setF({}); }}>{QUESTION_TYPES.map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}</select></div>
        <NotionSelect notions={notions} value={question?.notionId} />
      </div>
      <div className="field"><label>Énoncé</label><textarea name="prompt" defaultValue={question?.prompt} rows={2} required /></div>
      <details className="field" open={!!(ctx.text || ctx.imageUrl)}>
        <summary>Document d'appui (analyse de document, texte, image)</summary>
        <div className="field"><label>Texte du document</label><textarea value={ctx.text ?? ""} onChange={(e) => setCtx({ ...ctx, text: e.target.value })} rows={3} /></div>
        <div className="grid-2">
          <div className="field"><label>Image</label><input type="text" value={ctx.imageUrl ?? ""} onChange={(e) => setCtx({ ...ctx, imageUrl: e.target.value })} list={`qimgs-${evaluationId}`} /><datalist id={`qimgs-${evaluationId}`}>{images.map((i) => <option key={i.url} value={i.url}>{i.title}</option>)}</datalist></div>
          <div className="field"><label>Source</label><input type="text" value={ctx.source ?? ""} onChange={(e) => setCtx({ ...ctx, source: e.target.value })} /></div>
        </div>
      </details>
      <fieldset className="card" style={{ background: "var(--surface-2)", boxShadow: "none" }}>
        <legend style={{ fontWeight: 700 }}>Réponse attendue</legend>
        {type === "TRUE_FALSE" && <div className="field"><select value={f.tf ?? "true"} onChange={set("tf")}><option value="true">Vrai</option><option value="false">Faux</option></select></div>}
        {type === "NUMERIC" && (
          <div className="row">
            <div className="field"><label>Résultat</label><input type="text" inputMode="decimal" value={f.answer ?? ""} onChange={set("answer")} style={{ width: 140 }} /></div>
            <div className="field"><label>Tolérance</label><input type="text" inputMode="decimal" value={f.tolerance ?? "0"} onChange={set("tolerance")} style={{ width: 110 }} /></div>
            <div className="field"><label>Unité</label><input type="text" value={f.unit ?? ""} onChange={set("unit")} style={{ width: 110 }} /></div>
          </div>
        )}
        {type === "TIMELINE" && (
          <div className="row">
            <div className="field"><label>Début de la frise</label><input type="number" value={f.min ?? ""} onChange={set("min")} style={{ width: 120 }} /></div>
            <div className="field"><label>Fin</label><input type="number" value={f.max ?? ""} onChange={set("max")} style={{ width: 120 }} /></div>
            <div className="field"><label>Tolérance (années)</label><input type="number" value={f.tolerance ?? "0"} onChange={set("tolerance")} style={{ width: 120 }} /></div>
          </div>
        )}
        {type === "CATEGORIZE" && <div className="field"><label>Catégories <span className="hint">(une par ligne)</span></label><textarea value={f.cats ?? ""} onChange={set("cats")} rows={3} /></div>}
        {type === "IMAGE_POINT" && (
          <div className="field"><label>Image (carte)</label>
            <select value={f.image ?? ""} onChange={set("image")}><option value="">— Choisir —</option>{images.map((i) => <option key={i.url} value={i.url}>{i.title}</option>)}</select>
            {f.image && <img src={f.image} alt="Cliquez pour placer un lieu" onClick={pickPoint} style={{ cursor: "crosshair", marginTop: 8, maxWidth: 520, border: "1px solid var(--line)", borderRadius: 8 }} />}
          </div>
        )}
        {help.text !== undefined && <div className="field"><label>{type === "OPEN" ? "Réponse modèle" : "Texte"} <span className="hint">{help.text}</span></label><textarea value={f.text ?? ""} onChange={set("text")} rows={4} /></div>}
        {type === "FILL_BLANK" && <label className="check"><input type="checkbox" checked={f.wordBank !== ""} onChange={(e) => setF({ ...f, wordBank: e.target.checked ? "on" : "" })} /> Afficher une banque de mots</label>}
        {help.lines !== undefined && <div className="field"><label>{type === "OPEN" ? "Critères" : "Éléments"} <span className="hint" style={{ whiteSpace: "pre-line" }}>{help.lines}</span></label><textarea value={f.lines ?? ""} onChange={set("lines")} rows={6} /></div>}
      </fieldset>
      <div className="grid-2" style={{ marginTop: 12 }}>
        <div className="field"><label>Explication pédagogique</label><textarea name="explanation" defaultValue={question?.explanation} rows={3} /></div>
        <div className="field"><label>Méthode à retenir</label><textarea name="method" defaultValue={question?.method} rows={3} /></div>
      </div>
      <div className="row">
        {type !== "OPEN" && <div className="field"><label>Points</label><input name="points" type="number" step="0.25" min="0.25" defaultValue={question?.points ?? 1} style={{ width: 110 }} /></div>}
        {step === "EXAM" && (
          <>
            <div className="field"><label>Contrôle blanc</label><select name="mockExamId" defaultValue={question?.mockExamId ?? mockExams?.[0]?.id}>{mockExams?.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}</select></div>
            <div className="field"><label>Groupe de variantes <span className="hint">(ex. A)</span></label><input name="variantGroup" type="text" defaultValue={question?.variantGroup ?? ""} style={{ width: 110 }} /></div>
          </>
        )}
      </div>
      <label className="check"><input type="checkbox" name="validate" defaultChecked={question?.status === "VALIDATED"} /> J'ai vérifié l'énoncé, la réponse et le corrigé (validé)</label>
    </ActionForm>
  );
}
