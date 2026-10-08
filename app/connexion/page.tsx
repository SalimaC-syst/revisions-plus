import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, homeFor } from "@/lib/auth";
import { LoginForm } from "@/components/forms/LoginForm";
import { PublicHeader } from "@/components/PublicHeader";
import { Footer } from "@/components/Shell";

export const metadata = { title: "Connexion" };

export default async function Page() {
  const user = await getCurrentUser();
  if (user) redirect(homeFor(user.role));
  return (
    <>
      <PublicHeader />
      <main id="contenu" style={{ maxWidth: 460 }}>
        <div className="card">
          <h1>Connexion</h1>
          <p className="muted">Élèves : utilisez l'identifiant créé par vos parents.</p>
          <LoginForm />
          <p className="small muted" style={{ marginTop: 16 }}>Mot de passe oublié ? Élèves : demandez à vos parents de le réinitialiser depuis leur espace. Parents : contactez l'établissement.</p>
          <p className="small">Pas encore de compte ? <Link href="/inscription">Inscription des parents</Link></p>
        </div>
      </main>
      <Footer />
    </>
  );
}
