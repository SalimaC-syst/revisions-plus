import Link from "next/link";

export default async function Page({ searchParams }: { searchParams: Promise<{ statut?: string }> }) {
  const { statut } = await searchParams;
  return (
    <div className="card">
      {statut === "ok" ? (
        <>
          <h1>Merci !</h1>
          <p>Le paiement a été transmis. L'accès s'active dès que la banque confirme le paiement, généralement en quelques secondes. Rechargez la page si l'accès n'apparaît pas encore.</p>
        </>
      ) : (
        <>
          <h1>Paiement annulé</h1>
          <p>Aucun montant n'a été prélevé. Vous pouvez recommencer quand vous le souhaitez.</p>
        </>
      )}
      <Link className="btn" href="/parent">Retour à mon espace</Link>
    </div>
  );
}
