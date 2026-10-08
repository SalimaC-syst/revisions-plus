# Installation, hébergement et maintenance

## 1. Environnements

| Environnement | Usage | Base | Stripe | IA |
|---|---|---|---|---|
| Développement | poste du développeur | locale, `SEED_DEMO=1` | vide ou `sk_test_` | facultative |
| Préproduction | recette par l'établissement, tests de paiement | copie séparée, jamais la base de production | `sk_test_` (aucun débit réel) | clé de test |
| Production | élèves et familles | dédiée, sauvegardée chaque nuit | `sk_live_` | clé de production |

Chaque environnement a son propre fichier `.env`, sa propre base et son propre dossier de documents. Le bandeau de l'administration indique en permanence si le paiement est **non connecté**, en **mode test** ou **réel**, et si l'IA est connectée.

## 2. Hébergement recommandé

- **Dans l'Union européenne** (données de mineurs). Par exemple : Scaleway, OVHcloud, Clever Cloud ou un serveur virtuel (VPS) en France. PostgreSQL managé de préférence.
- **HTTPS obligatoire**, par exemple avec Caddy ou Nginx et un certificat Let's Encrypt devant le port 3000.
- Ressources minimales : 1 vCPU, 2 Go de RAM, 20 Go de disque.

### Avec Docker (recommandé)

```bash
cp .env.example .env            # compléter APP_URL, SEED_ADMIN_*, Stripe, IA
export POSTGRES_PASSWORD='mot-de-passe-long-et-aléatoire'
docker compose up -d --build    # applique les migrations au démarrage
docker compose exec app npx tsx prisma/seed.ts   # première installation uniquement
```

### Sans Docker

```bash
npm ci
npm run build
npm run db:migrate
npm run db:seed        # première installation
npm start              # écoute sur PORT (3000 par défaut)
```

Le site se surveille avec `GET /api/health`, qui répond `{"status":"ok"}` quand la base de données répond. Les erreurs serveur sont enregistrées et consultables dans **Administration › Journal et erreurs**.

## 3. Variables d'environnement

Voir [`.env.example`](../.env.example). Les variables `SEED_ADMIN_EMAIL` et `SEED_ADMIN_PASSWORD` ne servent qu'au premier lancement de `db:seed`. Il faut ensuite les retirer du fichier `.env`.

## 4. Stripe (paiement)

Le site fonctionne sans Stripe. Dans ce cas, il indique clairement aux familles que le paiement en ligne n'est pas ouvert, et l'administration peut accorder des accès manuellement (règlement par chèque ou virement).

1. Créer le compte Stripe au nom de l'établissement. L'IBAN et les pièces d'identité de l'établissement seront demandés.
2. **Aucun produit à créer dans Stripe** : les prix sont pris dans **Administration › Tarifs** (25 €/mois sans engagement, 19 €/mois sur 9 mois, soit 171 €).
3. Dans *Développeurs › Clés API*, copier la clé secrète dans `STRIPE_SECRET_KEY`.
4. Dans *Développeurs › Webhooks*, ajouter le point de terminaison `https://VOTRE-DOMAINE/api/stripe/webhook` avec les événements :
   `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`, `charge.refunded`.
   Copier le secret de signature dans `STRIPE_WEBHOOK_SECRET`.
5. Dans *Paramètres › Portail client*, activer la mise à jour du moyen de paiement et l'accès aux factures. **Désactiver la résiliation dans le portail** : elle se fait depuis l'espace parent, qui applique les règles d'engagement.
6. Faire d'abord un paiement complet en mode test (carte `4242 4242 4242 4242`), en préproduction, puis passer aux clés `sk_live_`.

Règles appliquées :
- Formule mensuelle : résiliable à tout moment par un bouton dans l'espace parent. L'accès reste ouvert jusqu'à la fin du mois payé.
- Formule 9 mois : l'abonnement s'arrête automatiquement au terme des 9 mois (`cancel_at`), sans reconduction tacite.
- Droit de rétractation de 14 jours : sans renonciation expresse cochée par le parent, l'accès s'ouvre à l'issue du délai.
- Paiement refusé : l'abonnement passe « impayé », et l'accès reste ouvert jusqu'à la fin de la période payée.
- Remboursements : depuis **Administration › Abonnements et paiements**.

## 5. IA (génération de contenus et aide à la correction)

1. Créer un compte sur console.anthropic.com au nom de l'établissement, puis une clé API à placer dans `ANTHROPIC_API_KEY`.
2. Définir une limite de dépenses mensuelle dans la console.
3. Signer l'avenant de traitement des données (DPA) proposé par Anthropic.

Ce que l'IA reçoit : uniquement le texte des documents de cours sélectionnés par l'enseignant. L'aide à la correction des rédactions est **désactivée par défaut** (**Administration › Paramètres**). Si on l'active, seule la réponse de l'élève est transmise, sans nom, et les adresses e-mail et numéros de téléphone sont retirés.

## 6. Sauvegardes

```bash
npm run backup                    # base (pg_dump) + documents, dans ./backups
BACKUP_DIR=/mnt/sauvegardes npm run backup
```

- Planifier chaque nuit, par exemple avec cron : `0 2 * * * cd /srv/revisions && npm run backup`.
- Les sauvegardes de plus de 30 jours sont supprimées (`BACKUP_KEEP_DAYS`).
- **Copier les sauvegardes hors du serveur**, sur un stockage objet dans l'UE.
- Tester une restauration chaque trimestre en préproduction : `npm run restore backups/base_….dump backups/documents_….tar.gz`.

## 7. Mises à jour

```bash
npm run backup
git pull
npm ci && npm run build
npm run db:migrate
# redémarrer le service
```

Avant chaque mise en production : `npm test` et `npm run test:e2e` doivent passer.

## 8. Sécurité en place

- Mots de passe hachés (bcrypt, coût 12). Les sessions sont stockées en base sous forme d'empreinte, avec un cookie HttpOnly, SameSite et Secure en production, valable 14 jours.
- Après 5 échecs de connexion en 15 minutes, l'identifiant est bloqué temporairement.
- Les droits sont vérifiés côté serveur à chaque action. Un enseignant n'agit que sur ses matières.
- Les réponses attendues ne sont jamais envoyées au navigateur de l'élève.
- En-têtes de sécurité (CSP, HSTS, X-Frame-Options, Referrer-Policy).
- Documents importés : stockage privé hors du dossier public, contrôle du type réel de fichier, 25 Mo maximum, servis uniquement après vérification des droits.
- Journal des actions sensibles (publication, corrections, comptes, remboursements, effacements).
