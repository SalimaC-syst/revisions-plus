import Link from "next/link";
export default function NotFound() {
  return <main id="contenu"><div className="card"><h1>Page introuvable</h1><p>Cette page n'existe pas ou n'est pas encore publiée.</p><Link className="btn" href="/">Retour à l'accueil</Link></div></main>;
}
