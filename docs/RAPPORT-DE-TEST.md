# Rapport de test

Date : 8 octobre 2026. Version : branche `plateforme-saint-joseph`.
Méthode : tests automatisés rejouables (`npm test` et `npm run test:e2e`) et vérification visuelle des écrans sur ordinateur et sur téléphone.

Ce rapport distingue trois catégories, demandées dans le cahier des charges :
**(A)** développé et testé, **(B)** développé mais à valider par l'établissement, **(C)** en attente d'un accès ou d'une décision.

---

## 1. Résultats des tests automatisés

| Série | Nombre | Résultat |
|---|---|---|
| Règles métier et correction (Vitest) | 38 | ✅ |
| Paiement et webhooks Stripe sur base réelle (Vitest) | 8 | ✅ |
| Parcours complets dans le navigateur (Playwright) | 5 | ✅ |

Les tests de paiement construisent localement les événements que Stripe envoie : ils vérifient le comportement du site **sans compte Stripe**.

### Ce que couvrent les tests de parcours

1. **Parcours complet d'une famille** : inscription d'un parent → création du compte élève → accès accordé par l'établissement → les quatre étapes (fiche lue, flashcards du paquet entier, 12 exercices, contrôle blanc rendu) → correction de la rédaction par l'enseignant → apparition de la note sur 20 chez l'élève et chez le parent.
2. **Publication** : une évaluation dépubliée disparaît de l'espace élève ; un enseignant n'a pas le bouton « Publier ».
3. **Sécurité** : les pages privées redirigent vers la connexion, un élève n'entre pas dans l'administration, les réponses attendues ne sont jamais envoyées au navigateur, les en-têtes de sécurité sont présents.

## 2. Tests fonctionnels (A — développé et testé)

| Vérification | Résultat |
|---|---|
| Inscription parent, création d'un compte élève sans adresse e-mail | ✅ |
| Blocage de l'élève sans abonnement, avec message explicite | ✅ |
| Accès accordé manuellement, visible immédiatement côté parent et élève | ✅ |
| Espaces Sixième et Cinquième, espagnol et latin présents en 5e uniquement | ✅ |
| Étape 1 : fiche mémo complète (points clés, frise, définitions, tableau, document commenté) | ✅ |
| Étape 2 : flashcards avec répétition espacée, carte ratée revue dans la même séance | ✅ |
| Étape 3 : 12 exercices de 8 types, correction immédiate avec explication et méthode, possibilité de réessayer | ✅ |
| Étape 4 : contrôle blanc chronométré, enregistrement automatique, une question tirée par groupe de variantes (6 questions, 20 points) | ✅ |
| Corrigé détaillé après le contrôle, réponse de l'élève face à la réponse attendue | ✅ |
| Correction d'une réponse rédigée par l'enseignant, puis note sur 20 et commentaire visibles de l'élève | ✅ |
| Tableau de bord : progression, notions maîtrisées ou à retravailler, recommandation personnalisée, renforcement ciblé | ✅ |
| Points d'expérience, niveaux, badges, missions du jour, **sans aucun classement entre élèves** | ✅ |
| Suivi par le parent (progression, dernière note) | ✅ |
| Administration : matières (ajout, masquage, renommage, fusion, suppression), évaluations, publication, duplication, archivage | ✅ |
| Import de documents (Word, PowerPoint, images, texte), statut des droits, visibilité élève | ✅ |
| Journal des actions sensibles et journal des erreurs | ✅ |
| Affichage sur téléphone (390 px) et sur ordinateur, navigation au clavier sur tous les exercices | ✅ |
| Sauvegarde puis restauration complète de la base (29 questions retrouvées intactes) | ✅ |
| Image de déploiement : migrations appliquées, site servi, en-têtes de sécurité présents | ✅ |

Captures d'écran : dossier [`docs/captures`](captures) (14 écrans, en version ordinateur et téléphone).

## 3. Tests de paiement (A — testé sans compte marchand)

| Vérification | Résultat |
|---|---|
| Aucun accès avant paiement | ✅ |
| Paiement validé : abonnement actif, période d'accès synchronisée | ✅ |
| Événement renvoyé deux fois par Stripe : traité une seule fois | ✅ |
| Facture payée, puis remboursement partiel correctement enregistré | ✅ |
| Prélèvement refusé : abonnement « impayé », accès maintenu jusqu'à la fin de la période payée | ✅ |
| Résiliation du mensuel : accès maintenu jusqu'à la fin du mois payé, puis coupé | ✅ |
| Formule 9 mois : fin d'engagement calculée (1ᵉʳ septembre → 1ᵉʳ juin), **sans reconduction tacite** | ✅ |
| Suspension administrative prioritaire sur l'état Stripe | ✅ |
| Droit de rétractation de 14 jours sans renonciation expresse : accès différé | ✅ |
| Webhook : signature invalide refusée (400), signature valide acceptée (200) | ✅ |
| Sans clé Stripe : le site annonce que le paiement n'est pas ouvert et **n'affiche aucun bouton de paiement** | ✅ |

**(C)** Un encaissement réel reste à faire en préproduction avec les clés de test, puis en production, une fois le compte Stripe de l'établissement ouvert. Les étapes sont décrites dans le document d'installation.

## 4. Tests de sécurité (A)

| Vérification | Résultat |
|---|---|
| Mots de passe hachés (bcrypt), jamais stockés en clair | ✅ |
| Jeton de session stocké sous forme d'empreinte, cookie HttpOnly | ✅ |
| Blocage après 5 échecs de connexion en 15 minutes | ✅ |
| Droits vérifiés côté serveur à chaque action, enseignant limité à ses matières | ✅ |
| Les réponses attendues n'arrivent jamais dans le navigateur de l'élève (vérifié sur les 29 questions et sur les pages servies) | ✅ |
| En-têtes de sécurité : CSP, X-Frame-Options, HSTS, Referrer-Policy | ✅ |
| Documents stockés hors du dossier public, type réel contrôlé, servis après vérification des droits | ✅ |
| Un élève ne peut pas déclencher la correction d'un contrôle qui ne lui appartient pas | ✅ |

## 5. Tests pédagogiques (A pour le fonctionnement, B pour le contenu)

| Vérification | Résultat |
|---|---|
| Correction partielle au quart de point (texte à trous, association, frise, carte) | ✅ |
| Tolérance aux accents, aux majuscules, aux articles et à une faute de frappe sur les mots longs | ✅ |
| **Aucune note automatique sur une réponse rédigée**, jamais de note arbitraire | ✅ |
| Pas de note sur 20 tant qu'une réponse attend sa correction | ✅ |
| Explication et méthode affichées après chaque réponse | ✅ |
| Barème du contrôle blanc : chaque sujet fait bien 20 points, variantes de même barème | ✅ |
| Somme des critères d'une rédaction égale aux points de la question | ✅ |

**(B)** Le contenu du module d'histoire 5e « Byzance et l'Europe carolingienne » a été préparé d'après le programme officiel de 5e et les éléments récupérés de l'ancien site. **Il doit être relu et confronté au cours réellement donné en classe avant d'être proposé aux élèves.** Chaque élément indique sa source ; la définition de « Païen » reprise de l'ancien site est marquée « à vérifier » car elle est imprécise.

## 6. Défauts trouvés pendant les tests et corrigés

| Défaut | Correction |
|---|---|
| Le contrôle blanc tirait toujours la même variante : tous les élèves avaient le même sujet | Tirage corrigé et vérifié sur 30 tirages différents |
| Une question rédigée valait 1 point au lieu de la somme de ses critères (sujet à 17 points au lieu de 20) | Barème calculé à partir des critères, à la saisie comme à l'import IA ; test ajouté |
| Une question de remise en ordre ne pouvait pas être validée si l'élève jugeait l'ordre affiché correct | L'ordre affiché compte désormais comme une réponse |
| Un accès accordé « jusqu'au 4 juillet » s'affichait « jusqu'au 5 juillet » (décalage horaire) | Calcul en heure de Paris, été comme hiver ; test ajouté |
| Pages publiques figées à la construction : un changement de tarif ou de mentions légales n'apparaissait pas | Pages recalculées à chaque visite |
| Deux défauts d'affichage dans l'administration et sur la page d'évaluation | Corrigés |

## 7. Ce qui reste à faire (B et C)

| Point | Catégorie | Qui |
|---|---|---|
| Relire le module d'histoire 5e et le confronter au cours de l'enseignant | B | Enseignant d'histoire-géographie |
| Compléter les mentions légales, les CGV et la politique de confidentialité (champs « à compléter ») | B | Direction |
| Fournir le logo et la charte graphique, avec l'autorisation écrite d'usage | C | Direction |
| Ouvrir le compte Stripe de l'établissement, puis faire un paiement de test et un paiement réel | C | Direction |
| Fournir une clé API Anthropic et signer l'avenant de traitement des données | C | Direction |
| Choisir l'hébergeur dans l'UE et le nom de domaine | C | Direction |
| Fournir les cours des autres matières pour créer les évaluations | C | Équipe pédagogique |
| Désigner le délégué à la protection des données et compléter le registre | C | Direction |

## 8. Comment rejouer ces tests

```bash
npm test          # règles métier, correction, paiements
npm run test:e2e  # parcours complets dans un navigateur et captures d'écran
```

Les tests de parcours utilisent une base dédiée (`sj_e2e`), recréée à chaque lancement : ils ne touchent ni la base de développement ni celle de production. Le rapport détaillé s'ouvre avec `npx playwright show-report`.
