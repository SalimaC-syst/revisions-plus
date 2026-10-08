import { PublicHeader } from "./PublicHeader";
import { Footer } from "./Shell";

export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <>
      <PublicHeader />
      <main id="contenu" style={{ maxWidth: 860 }}>
        <div className="card stack">
          <h1>{title}</h1>
          <div className="alert alert-warn small">Document modèle préparé pour le lancement : il doit être relu et validé par un juriste et par l'établissement avant toute commercialisation. Les mentions entre crochets sont à compléter dans Admin &gt; Paramètres.</div>
          {children}
        </div>
      </main>
      <Footer />
    </>
  );
}
