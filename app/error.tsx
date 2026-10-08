"use client";
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return <main id="contenu"><div className="card"><h1>Oups, un problème est survenu</h1><p>L'erreur a été enregistrée. Réessaie dans un instant.</p><button className="btn" onClick={reset}>Réessayer</button></div></main>;
}
