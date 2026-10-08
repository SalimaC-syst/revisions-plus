# Révisions Saint-Joseph

Plateforme de révision en ligne pour les élèves de 6e et de 5e du Collège privé Saint-Joseph d'Argenteuil.
Accès privé par abonnement souscrit par les parents. Chaque évaluation suit quatre étapes : **Je comprends**, **Je mémorise**, **Je m'entraîne** et **Contrôle blanc**.

> L'ancien site statique (une page HTML) est conservé tel quel dans [`legacy/index.html`](legacy/index.html). La branche `v1-revisions-plus` n'a pas été modifiée.

## Démarrage rapide (développement)

Prérequis : Node.js 22 et PostgreSQL 16.

```bash
cp .env.example .env          # renseigner DATABASE_URL
npm install
npx prisma migrate deploy     # crée les tables
SEED_DEMO=1 npm run db:seed   # données de démonstration (jamais en production)
npm run dev                   # http://localhost:3000
```

Comptes de démonstration créés par `SEED_DEMO=1` :

| Rôle | Identifiant | Mot de passe |
|---|---|---|
| Super-administrateur | admin@demo.local | Demo-Admin-2026 |
| Enseignant (5e Histoire) | prof.histoire@demo.local | Demo-Prof-2026 |
| Parent | parent@demo.local | Demo-Parent-2026 |
| Élève de 5e | eleve.demo | Eleve-Demo-2026 |

## Commandes

| Commande | Rôle |
|---|---|
| `npm run build` puis `npm start` | Construire puis lancer en production |
| `npm run db:migrate` | Appliquer les migrations de base de données |
| `npm run db:seed` | Créer niveaux, matières, offres et premier super-admin (`SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`) |
| `npm test` | Tests unitaires et d'intégration (base PostgreSQL locale requise) |
| `npm run test:e2e` | Parcours complets dans un navigateur, sur une base dédiée `sj_e2e` recréée à chaque lancement |
| `npm run typecheck` | Vérification TypeScript |
| `npm run backup` / `npm run restore` | Sauvegarde et restauration (base + documents) |

## Documentation

- [Installation, hébergement et maintenance](docs/INSTALLATION.md)
- [Guide de l'administrateur et des enseignants](docs/GUIDE-ADMIN.md)
- [Rapport de test](docs/RAPPORT-DE-TEST.md)
- [Conformité : RGPD, mineurs, droit de la consommation](docs/CONFORMITE.md)

## Technique

- Next.js 15 (App Router, actions serveur), React 19, TypeScript.
- PostgreSQL et Prisma, avec sessions en base et mots de passe hachés (bcrypt).
- Stripe Checkout, portail client et webhooks. Aucune donnée bancaire ne transite par le site.
- Génération assistée par IA (API Anthropic, Claude). Les contenus générés restent toujours en brouillon jusqu'à leur validation humaine.
- Tests : Vitest (règles métier, notation, paiements) et Playwright (parcours complets).
