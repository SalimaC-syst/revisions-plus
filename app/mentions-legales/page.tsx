import { LegalPage } from "@/components/LegalPage";
import { getSetting } from "@/lib/settings";

export const metadata = { title: "Mentions légales" };

export default async function Page() {
  const l = await getSetting("legal");
  const b = await getSetting("branding");
  return (
    <LegalPage title="Mentions légales">
      <h2>Éditeur du service</h2>
      <p>{l.publisher} — {l.legalForm}<br />SIRET : {l.siret}<br />Adresse : {l.address}<br />Contact : {l.email} · {l.phone}</p>
      <p>Directeur de la publication : {l.director}</p>
      <h2>Hébergement</h2>
      <p>{l.host}</p>
      <h2>Propriété intellectuelle</h2>
      <p>Le nom et le logo du {b.schoolName} sont utilisés avec l'autorisation de l'établissement. Les documents pédagogiques appartiennent à leurs auteurs ; ils sont diffusés aux seuls élèves abonnés, dans le cadre autorisé par les enseignants et, pour les œuvres de tiers, dans les limites de l'exception pédagogique et des accords sectoriels. Toute reproduction ou diffusion hors de la plateforme est interdite.</p>
      <h2>Protection des données</h2>
      <p>Voir la <a href="/confidentialite">politique de confidentialité</a>. Contact : {l.dpoEmail}.</p>
    </LegalPage>
  );
}
