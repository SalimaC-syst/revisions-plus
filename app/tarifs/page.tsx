import Link from "next/link";
import { PublicHeader } from "@/components/PublicHeader";
import { Footer } from "@/components/Shell";
import { PlanCards } from "@/components/PlanCards";

export const metadata = { title: "Tarifs" };

export default function Page() {
  return (
    <>
      <PublicHeader />
      <main id="contenu">
        <h1>Formules d'abonnement</h1>
        <p className="muted">Un abonnement par élève. Prix TTC. Paiement sécurisé par carte bancaire via Stripe : la plateforme ne voit ni ne conserve vos données bancaires.</p>
        <PlanCards />
        <p style={{ marginTop: 20 }}><Link className="btn" href="/inscription">Créer mon compte parent</Link> <Link href="/cgv">Lire les conditions générales de vente</Link></p>
      </main>
      <Footer />
    </>
  );
}
