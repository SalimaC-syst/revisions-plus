import { LegalPage } from "@/components/LegalPage";
import { getSetting, CGV_VERSION } from "@/lib/settings";
import { prisma } from "@/lib/db";
import { euros } from "@/lib/format";

export const metadata = { title: "Conditions générales de vente" };

export default async function Page() {
  const l = await getSetting("legal");
  const f = await getSetting("features");
  const plans = await prisma.plan.findMany({ where: { active: true }, orderBy: { order: "asc" } });
  return (
    <LegalPage title="Conditions générales de vente">
      <p className="small muted">Version {CGV_VERSION}</p>
      <h2>1. Objet</h2>
      <p>Les présentes conditions régissent l'abonnement au service en ligne de révision réservé aux élèves de 6e et 5e, proposé par {l.publisher}. Le contrat est conclu entre l'éditeur et le parent ou représentant légal majeur (« le client »).</p>
      <h2>2. Formules et prix</h2>
      <ul>
        {plans.map((p) => (
          <li key={p.id}><strong>{p.name}</strong> : {euros(p.priceCents)} TTC par mois et par élève{p.commitmentMonths > 0 ? `, avec un engagement de ${p.commitmentMonths} mois, soit ${euros(p.priceCents * p.commitmentMonths)} au total, payés mensuellement` : ", sans engagement"}. {p.terms}</li>
        ))}
      </ul>
      <p>Les prix applicables sont ceux affichés au moment de la souscription. Toute modification de prix ne s'applique pas aux abonnements en cours sans information préalable du client et possibilité de résilier.</p>
      <h2>3. Paiement</h2>
      <p>Le paiement est effectué par carte bancaire via le prestataire Stripe. Le premier mois est prélevé à la souscription, puis chaque mois à la date anniversaire. Les données bancaires sont traitées exclusivement par Stripe. En cas d'échec de paiement, le client est invité à mettre à jour son moyen de paiement ; l'accès peut être suspendu si l'impayé persiste. Une facture est disponible pour chaque paiement dans l'espace parent.</p>
      <h2>4. Accès au service</h2>
      <p>L'accès est ouvert dès la confirmation du paiement, pour la période payée. Le service est fourni « en l'état » des contenus publiés par l'établissement ; les contrôles blancs sont des outils d'entraînement et ne remplacent pas l'évaluation des enseignants.</p>
      <h2>5. Droit de rétractation</h2>
      <p>Le client dispose d'un délai de {f.withdrawalDays} jours à compter de la souscription pour se rétracter (article L221-18 du Code de la consommation). Le service étant un contenu numérique fourni immédiatement, le client peut demander expressément l'exécution immédiate et reconnaître perdre son droit de rétractation dès le début de l'accès (article L221-28, 13°). Ce choix est recueilli au moment de la souscription. À défaut, l'accès commence à l'issue du délai de rétractation.</p>
      <h2>6. Durée, renouvellement et résiliation</h2>
      <p><strong>Formule mensuelle :</strong> l'abonnement se renouvelle chaque mois. Le client peut le résilier à tout moment depuis son espace parent (bouton « Résilier mon abonnement »). La résiliation prend effet à la fin du mois en cours déjà payé ; aucun nouveau prélèvement n'est effectué.</p>
      <p><strong>Formule avec engagement :</strong> le client s'engage pour la durée indiquée et règle chaque mensualité jusqu'au terme. L'abonnement prend fin automatiquement au terme de l'engagement, sans reconduction tacite ; le client peut souscrire une nouvelle formule s'il le souhaite. Une résiliation anticipée est possible pour motif légitime (déménagement, changement d'établissement, maladie de longue durée) sur demande motivée.</p>
      <p>Conformément à l'article L215-1-1 du Code de la consommation, la résiliation peut être notifiée par voie électronique depuis l'espace parent ; un accusé de réception est affiché et conservé.</p>
      <h2>7. Remboursements</h2>
      <p>Les remboursements (rétractation, motif légitime, incident technique) sont traités par l'éditeur et effectués sur la carte utilisée.</p>
      <h2>8. Données personnelles</h2>
      <p>Voir la <a href="/confidentialite">politique de confidentialité</a>.</p>
      <h2>9. Réclamations et médiation</h2>
      <p>Réclamations : {l.email}. En cas de litige non résolu, le client peut recourir gratuitement au médiateur de la consommation : {l.mediator}. Plateforme européenne de règlement en ligne des litiges : https://ec.europa.eu/consumers/odr.</p>
      <h2>10. Droit applicable</h2>
      <p>Droit français.</p>
    </LegalPage>
  );
}
