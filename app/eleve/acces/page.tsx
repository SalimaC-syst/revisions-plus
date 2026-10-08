import { requireUser } from "@/lib/auth";

export default async function Page() {
  const user = await requireUser(["STUDENT"]);
  return (
    <div className="card">
      <h1>Bonjour {user.firstName} 👋</h1>
      <p>Ton accès aux révisions n'est pas encore activé. Demande à tes parents de choisir un abonnement depuis leur espace parent.</p>
    </div>
  );
}
