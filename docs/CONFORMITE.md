# Conformité : protection des données, mineurs et droit de la consommation

Ce document décrit ce qui est **en place dans le logiciel** et ce qui reste **à la charge de l'établissement**. Il ne remplace pas l'avis d'un juriste ; il rassemble ce qu'il faut vérifier avant l'ouverture aux familles.

---

## 1. Protection des données (RGPD)

### Ce qui est en place

| Principe | Mise en œuvre |
|---|---|
| **Minimisation** | Aucune adresse e-mail n'est demandée à l'élève : il se connecte avec un identifiant choisi par son parent. L'élève est enregistré avec son prénom et, facultativement, l'initiale de son nom. Aucune date de naissance, aucune photo, aucune adresse. |
| **Consentement du responsable légal** | À l'inscription, le parent certifie être le responsable légal et accepte la politique de confidentialité. Le consentement est horodaté et conservé avec sa version. |
| **Droit d'accès et portabilité** | Le parent télécharge à tout moment l'ensemble des données de son enfant, au format JSON, depuis son espace. |
| **Droit à l'effacement** | Le parent fait sa demande depuis **Mes données**. L'administration l'exécute : le compte parent, les comptes enfants et toutes les données pédagogiques sont supprimés, et les abonnements Stripe en cours sont annulés. |
| **Obligation comptable** | Les paiements sont conservés **sans identité** (le lien vers le parent est effacé), pour répondre à l'obligation de conservation des pièces comptables. |
| **Traçabilité** | Les actions sensibles (publication, correction, changement de rôle, remboursement, effacement) sont journalisées avec leur auteur et leur date. |
| **Sécurité** | Mots de passe hachés, sessions en base, HTTPS, en-têtes de sécurité, documents en stockage privé, droits vérifiés côté serveur. Détail dans le document d'installation. |
| **Pas de profilage commercial** | Aucune publicité, aucun traceur publicitaire, aucune mesure d'audience tierce, aucun partage de données à des fins commerciales. |

### Ce qui reste à faire par l'établissement

1. **Désigner un délégué à la protection des données** (ou un référent) et renseigner son adresse dans **Administration › Paramètres**. Elle s'affiche alors dans la politique de confidentialité.
2. **Inscrire le traitement au registre** de l'établissement : finalité (accompagnement scolaire sur abonnement), catégories de personnes (élèves mineurs, responsables légaux), données, durées de conservation, destinataires (hébergeur, Stripe, Anthropic), base légale (contrat pour l'abonnement, consentement du responsable légal pour les données pédagogiques).
3. **Analyse d'impact (AIPD)** : le traitement concerne des mineurs à grande échelle au sens du RGPD. Une analyse d'impact est à mener avant l'ouverture. Elle s'appuiera sur ce document et sur la partie sécurité du document d'installation.
4. **Signer les contrats de sous-traitance** (article 28) avec l'hébergeur, avec Stripe et avec Anthropic si l'IA est activée.
5. **Fixer les durées de conservation** et les inscrire dans la politique de confidentialité. Proposition à valider : données pédagogiques conservées pendant l'abonnement puis **12 mois**, pièces comptables **10 ans**, journaux techniques **12 mois**.
6. **Compléter la politique de confidentialité et les mentions légales** (champs marqués « à compléter » dans **Paramètres**).
7. **Informer les familles** à l'inscription et, si l'établissement le juge utile, par une note aux responsables légaux.

### Hébergement et transferts

L'hébergement doit être choisi **dans l'Union européenne**. Deux prestataires reçoivent des données :

- **Stripe** (paiement) : identité et coordonnées du parent, montants. Aucune donnée bancaire ne transite par le site ni n'y est stockée.
- **Anthropic** (IA), uniquement si la fonction est activée : le texte des documents de cours. L'aide à la correction des rédactions est **désactivée par défaut** ; si elle est activée, seule la réponse de l'élève est transmise, sans son nom, et les adresses e-mail et numéros de téléphone sont retirés automatiquement.

## 2. Protection des mineurs

- Accès strictement privé : aucun contenu n'est accessible sans compte, et aucun compte élève ne peut être créé sans un compte parent.
- Aucun espace d'expression libre entre élèves, aucune messagerie, aucun contenu publié par un élève et visible d'un autre.
- **Aucun classement entre élèves.** La motivation repose sur la progression personnelle : points d'expérience, badges, missions du jour. Les notes ne sont visibles que de l'élève, de son responsable légal et de l'équipe pédagogique.
- Les contenus affichés sont validés par un adulte : rien de généré par l'IA n'atteint un élève sans validation humaine.
- Les messages adressés à l'élève sont bienveillants, y compris en cas d'erreur ou de note faible.
- Les documents externes ne sont visibles que si l'enseignant a renseigné leur statut de droits et coché leur visibilité.

## 3. Droit de la consommation (vente à distance à des particuliers)

### Ce qui est en place

| Exigence | Mise en œuvre |
|---|---|
| **Information précontractuelle** | Les deux formules sont présentées avec leur prix mensuel, leur durée, le total engagé et leurs conditions de résiliation, avant tout paiement. |
| **Acceptation des CGV** | Case à cocher obligatoire, avec la version acceptée et sa date conservées. |
| **Droit de rétractation de 14 jours** (art. L221-18) | Appliqué par défaut : sans renonciation expresse du parent, l'accès ne s'ouvre qu'au terme du délai. |
| **Renonciation expresse** (art. L221-28 13°) | Case distincte et non pré-cochée, qui explique que l'accès immédiat fait perdre le droit de rétractation. Le consentement est conservé. |
| **Résiliation électronique** (art. L215-1-1) | Bouton de résiliation dans l'espace parent, aussi simple que la souscription. L'accès reste ouvert jusqu'à la fin de la période payée. |
| **Pas de reconduction tacite sur l'engagement** | La formule 9 mois s'arrête automatiquement au terme des 9 mois. |
| **Factures** | Émises par Stripe et accessibles à tout moment depuis l'espace parent. |
| **Médiateur de la consommation** | Mentionné dans les CGV ; les coordonnées sont à renseigner dans **Paramètres**. |

### Ce qui reste à faire par l'établissement

1. **Faire relire les CGV, les mentions légales et la politique de confidentialité** par un juriste ou l'organisme gestionnaire, puis compléter les champs « à compléter ».
2. **Adhérer à un médiateur de la consommation** (obligation pour toute vente à des consommateurs) et renseigner ses coordonnées.
3. **Vérifier le régime fiscal et social** de cette activité au regard du statut de l'établissement (TVA, caractère lucratif ou non). Ce point doit être tranché avec l'expert-comptable **avant le premier encaissement**.
4. **Vérifier auprès de l'assureur** la couverture de l'activité.

## 4. Droits sur les contenus

- **Logo et charte graphique** : le logo ne doit être installé qu'avec l'autorisation écrite de l'établissement. Une case le rappelle dans **Paramètres** et doit être cochée.
- **Documents de cours** : chaque document importé porte un statut de droits (libre, autorisé, usage interne). Un document dont les droits ne sont pas vérifiés n'est jamais montré aux élèves. Pour les manuels et les œuvres de tiers, vérifier l'accord sectoriel applicable à l'usage pédagogique numérique.
- **Cartes fournies** : les fonds de carte muets livrés avec la plateforme ont été produits à partir de données géographiques du domaine public (Natural Earth, via world-atlas). Ils sont libres d'usage.
- **Contenus générés par IA** : ils sont produits à partir des documents fournis par l'enseignant et validés par lui. L'enseignant en reste l'auteur responsable.

## 5. Accessibilité

La plateforme vise le RGAA dans la mesure du possible pour un établissement privé : contrastes conformes, navigation complète au clavier sur tous les exercices (y compris le placement sur une carte), libellés explicites, structure de titres, textes alternatifs, et une page **Accessibilité** publique. Un audit formel n'a pas été réalisé : la déclaration de conformité reste à établir si l'établissement souhaite s'y engager.
