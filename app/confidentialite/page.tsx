import { LegalPage } from "@/components/LegalPage";
import { getSetting, PRIVACY_VERSION } from "@/lib/settings";

export const metadata = { title: "Confidentialité" };

export default async function Page() {
  const l = await getSetting("legal");
  return (
    <LegalPage title="Politique de confidentialité">
      <p className="small muted">Version {PRIVACY_VERSION}</p>
      <p>Le service s'adresse à des élèves mineurs. Le compte est ouvert et géré par un parent ou représentant légal. Responsable du traitement : {l.publisher}. Contact : {l.dpoEmail}.</p>
      <h2>Données traitées</h2>
      <ul>
        <li>Parent : nom, prénom, e-mail, historique d'abonnement et de paiements (sans données bancaires).</li>
        <li>Élève : prénom, initiale ou nom, identifiant de connexion, niveau de classe, réponses aux exercices, notes de contrôles blancs, progression.</li>
        <li>Journal technique : connexions et opérations d'administration (sécurité).</li>
      </ul>
      <p>Aucune adresse e-mail n'est demandée à l'élève. Aucune publicité, aucun profilage publicitaire, aucune revente de données.</p>
      <h2>Finalités et bases légales</h2>
      <ul>
        <li>Fournir le service de révision et la progression personnalisée (exécution du contrat).</li>
        <li>Facturation et obligations comptables (obligation légale).</li>
        <li>Sécurité de la plateforme (intérêt légitime).</li>
      </ul>
      <h2>Intelligence artificielle</h2>
      <p>L'IA sert à préparer des ressources à partir des documents des enseignants. Aucune donnée d'élève n'est transmise pour cette génération. La correction assistée des réponses rédigées est désactivée par défaut ; si l'établissement l'active, seul le texte de la réponse est transmis, sans nom ni identifiant, au prestataire lié par un contrat de sous-traitance (article 28 du RGPD) excluant l'entraînement de ses modèles sur ces données. Toute note est validée par un enseignant.</p>
      <h2>Destinataires</h2>
      <p>Personnel habilité de l'établissement (selon son rôle), parents pour leurs enfants. Sous-traitants : hébergeur ({l.host}), Stripe (paiement), fournisseur d'IA (génération de contenus).</p>
      <h2>Durées de conservation</h2>
      <ul>
        <li>Compte et progression : durée de l'abonnement, puis 12 mois, puis suppression ou anonymisation.</li>
        <li>Factures : 10 ans (obligation comptable).</li>
        <li>Journaux de sécurité : 12 mois.</li>
      </ul>
      <h2>Vos droits</h2>
      <p>Accès, rectification, effacement, limitation, portabilité, opposition. Depuis l'espace parent, vous pouvez télécharger les données de votre enfant et demander leur suppression. Vous pouvez aussi saisir la CNIL (cnil.fr).</p>
      <h2>Sécurité</h2>
      <p>Connexions chiffrées (HTTPS), mots de passe hachés, cookies de session sécurisés, droits d'accès par rôle, documents stockés hors accès public, sauvegardes chiffrées régulières.</p>
    </LegalPage>
  );
}
