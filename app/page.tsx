import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, homeFor } from "@/lib/auth";
import { PublicHeader } from "@/components/PublicHeader";
import { Footer } from "@/components/Shell";
import { getSetting } from "@/lib/settings";

export default async function Home() {
  const user = await getCurrentUser();
  if (user) redirect(homeFor(user.role));
  const b = await getSetting("branding");
  const steps = [
    ["📖", "Je comprends", "Fiches mémo, définitions, frises et cartes fidèles au cours du professeur."],
    ["🧠", "Je mémorise", "Flashcards avec répétition espacée, associations, textes à trous."],
    ["✏️", "Je m'entraîne", "Exercices interactifs avec correction expliquée immédiatement."],
    ["📝", "Je passe mon contrôle blanc", "Une vraie simulation chronométrée, notée sur 20, avec corrigé détaillé."],
  ];
  return (
    <>
      <PublicHeader />
      <main id="contenu">
        <section className="hero">
          <p className="badge" style={{ background: "rgba(255,255,255,.15)", color: "#fff" }}>Espace de révision réservé aux élèves de 6e et 5e</p>
          <h1 style={{ fontSize: "clamp(1.8rem,4.5vw,2.6rem)" }}>{b.tagline}</h1>
          <p className="muted" style={{ maxWidth: 640 }}>Chaque révision suit les contrôles annoncés par les enseignants du {b.schoolName}, à partir de leurs propres documents.</p>
          <div className="row">
            <Link className="btn btn-accent" href="/connexion">Se connecter</Link>
            <Link className="btn btn-ghost" style={{ background: "#fff" }} href="/inscription">Inscrire mon enfant</Link>
          </div>
        </section>
        <h2>Un parcours en quatre étapes pour chaque contrôle</h2>
        <div className="steps">
          {steps.map(([icon, title, text], i) => (
            <div className="card step" key={title}>
              <div className="step-num" aria-hidden="true">{i + 1}</div>
              <h3>{icon} {title}</h3>
              <p className="muted">{text}</p>
            </div>
          ))}
        </div>
        <div className="grid-2" style={{ marginTop: 24 }}>
          <div className="card">
            <h2>Pour les familles</h2>
            <p>Un espace parent pour créer le compte de l'enfant, gérer l'abonnement et suivre sa progression. Sans publicité, sans classement entre élèves.</p>
            <Link href="/tarifs">Voir les formules</Link>
          </div>
          <div className="card">
            <h2>Pour l'établissement</h2>
            <p>Importer le cours, contrôler les ressources proposées par l'IA, valider, publier. Aucun contenu n'est publié sans validation pédagogique.</p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
