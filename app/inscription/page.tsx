import { RegisterForm } from "@/components/forms/RegisterForm";
import { PublicHeader } from "@/components/PublicHeader";
import { Footer } from "@/components/Shell";

export const metadata = { title: "Inscription parent" };

export default function Page() {
  return (
    <>
      <PublicHeader />
      <main id="contenu" style={{ maxWidth: 720 }}>
        <div className="card">
          <h1>Créer un compte parent</h1>
          <p className="muted">Le compte est ouvert par un parent ou représentant légal. Vous créerez ensuite le compte de votre enfant et choisirez son abonnement.</p>
          <RegisterForm />
        </div>
      </main>
      <Footer />
    </>
  );
}
