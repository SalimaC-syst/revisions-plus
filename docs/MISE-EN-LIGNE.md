# Mettre la plateforme en ligne, pas à pas

Ce guide ne demande aucune connaissance technique. Comptez environ une heure la première fois.

## Pourquoi pas GitHub Pages ?

GitHub Pages sait afficher des pages **fixes** : c'est pour cela que l'ancien site y fonctionnait. La nouvelle plateforme a besoin d'un **serveur** (pour les comptes, les corrections, les paiements) et d'une **base de données** (pour garder les progrès des élèves). Il faut donc un hébergeur.

Je vous recommande **Clever Cloud** : entreprise française, serveurs à Paris (les données des élèves restent en France), connexion directe à GitHub, HTTPS automatique. À chaque modification du code, le site se met à jour tout seul.

Le parcours se fait en trois temps :

1. Mettre le nouveau code sur GitHub (avec moi, 5 minutes).
2. Préparer Clever Cloud : une base de données, un espace pour les documents, l'application.
3. Démarrer, vérifier, se connecter.

---

## Partie 1 : mettre le code sur GitHub

Le nouveau code est prêt sur mon poste de travail mais je ne peux pas l'envoyer sur votre GitHub tant que votre compte n'est pas relié à Claude.

1. Ouvrez **https://claude.ai/connect-github** et connectez votre compte GitHub (SalimaC-syst).
2. Si GitHub vous propose d'installer l'application **Claude**, choisissez **« Only select repositories »**, cochez **Revisions-Plus**, puis validez.
3. Écrivez-moi **« c'est fait »** dans ce fil. J'envoie le code et je crée une **demande de fusion** (pull request).
4. Sur GitHub, ouvrez l'onglet **Demandes de tirage**, cliquez sur ma demande, puis sur le bouton vert **Merge pull request**, puis **Confirm merge**.

Le code est alors sur la branche principale de votre dépôt.

> **À savoir :** l'ancienne page publiée par GitHub Pages ne s'affichera plus après la fusion (elle est rangée dans le dossier `legacy`). C'est normal. Vous pouvez désactiver GitHub Pages dans **Paramètres › Pages**.

---

## Partie 2 : préparer Clever Cloud

### Étape 1. Créer le compte

1. Allez sur **https://console.clever-cloud.com** et choisissez **« Se connecter avec GitHub »**. C'est le plus simple : Clever Cloud verra directement votre dépôt.
2. Créez une **organisation** au nom de l'établissement (par exemple « Collège Saint-Joseph Argenteuil »). Les factures seront à ce nom.
3. Ajoutez un **moyen de paiement** dans l'organisation. La console affiche le prix de chaque élément avant que vous le validiez.

### Étape 2. Créer la base de données

1. Cliquez sur **Créer** › **un add-on** › **PostgreSQL**.
2. Choisissez une petite offre **payante**. Évitez l'offre gratuite « DEV », qui est réservée aux essais.
3. Région : **Paris**. Nom : `revisions-base`.
4. Une fois créée, ouvrez-la. Dans **Informations de l'add-on**, repérez la ligne **Connection URI**, qui commence par `postgresql://`. **Gardez cette page ouverte**, vous en aurez besoin à l'étape 5.

### Étape 3. Créer l'espace pour les documents de cours

1. **Créer** › **un add-on** › **FS Bucket**. Région : **Paris**. Nom : `revisions-documents`.
2. Une fois créé, repérez son **hôte** (*host*) : une adresse qui se termine par `fsbucket.services.clever-cloud.com`. **Gardez-la aussi.**

### Étape 4. Créer l'application

1. **Créer** › **une application** › choisissez le dépôt **Revisions-Plus**.
2. Type : **Node.js**. Taille : **S**. Région : **Paris**. Nom : `revisions-saint-joseph`.
3. Quand Clever Cloud propose de **lier des add-ons**, cochez `revisions-base` et `revisions-documents`.
4. Clever Cloud lance tout de suite un premier démarrage. **Il va échouer : c'est normal**, les réglages de l'étape suivante manquent encore.
5. Dans **Noms de domaine**, notez l'adresse qui se termine par `.cleverapps.io`. C'est l'adresse provisoire de votre site.

### Étape 5. Entrer les réglages

Dans l'application, ouvrez **Variables d'environnement**, puis passez en **mode expert** (une grande zone de texte). Collez le bloc ci-dessous **après avoir remplacé les quatre parties entre crochets** :

```
NODE_ENV=production
CC_NODE_DEV_DEPENDENCIES=install
CC_POST_BUILD_HOOK=npm run build
CC_PRE_RUN_HOOK=npm run deploy:prepare
PORT=8080
HOSTNAME=0.0.0.0
STORAGE_DIR=./storage
CC_FS_BUCKET=/storage:[hôte du FS Bucket, étape 3]
DATABASE_URL=[Connection URI de la base, étape 2]
APP_URL=https://[adresse .cleverapps.io, étape 4]
SEED_ADMIN_EMAIL=[votre adresse e-mail]
SEED_ADMIN_PASSWORD=[un mot de passe d'au moins 12 caractères]
```

Cliquez sur **Mettre à jour les changements**.

Ces deux dernières lignes servent uniquement à créer **votre compte de super-administrateur** au premier démarrage. Vous les retirerez ensuite (étape 8).

---

## Partie 3 : démarrer et vérifier

### Étape 6. Démarrer

1. Dans l'application, cliquez sur **Redémarrer** (choisissez la reconstruction complète si on vous le propose).
2. Ouvrez **Journaux** pour suivre l'avancement. La construction prend quelques minutes.
3. C'est prêt quand la ligne `Ready` apparaît.

> **Si la construction échoue avec « out of memory »** : dans **Informations**, activez une **instance de construction dédiée** plus grande, puis redémarrez.

### Étape 7. Vérifier

1. Ouvrez `https://[votre-adresse].cleverapps.io/api/health`. Vous devez lire `{"status":"ok"}`.
2. Ouvrez `https://[votre-adresse].cleverapps.io` : la page d'accueil de Révisions+ s'affiche.

### Étape 8. Première connexion et sécurité

1. Cliquez sur **Se connecter** et utilisez l'e-mail et le mot de passe de l'étape 5.
2. **Retirez immédiatement** les lignes `SEED_ADMIN_EMAIL` et `SEED_ADMIN_PASSWORD` des variables d'environnement, puis cliquez sur **Mettre à jour les changements**. Votre compte reste actif.
3. Dans **Administration › Paramètres**, complétez les mentions légales et, si vous avez l'autorisation écrite, ajoutez le logo.

Le site est en ligne. Le module d'histoire 5e est présent **en brouillon** : il n'est visible des élèves qu'après relecture par l'enseignant et publication.

---

## Plus tard, quand vous serez prête

Chaque point ci-dessous consiste à ajouter une ou deux lignes dans **Variables d'environnement**, puis à cliquer sur **Redémarrer**.

| Quoi | Où | Lignes à ajouter |
|---|---|---|
| **Votre propre adresse** (par ex. revisions.stjosephargenteuil.fr) | **Noms de domaine** de l'application, puis un enregistrement à créer chez votre fournisseur de domaine (Clever Cloud indique lequel) | Remplacer `APP_URL` par la nouvelle adresse |
| **Paiement Stripe** | Voir la partie 4 du [guide d'installation](INSTALLATION.md). L'adresse du webhook est `https://[votre-adresse]/api/stripe/webhook` | `STRIPE_SECRET_KEY` et `STRIPE_WEBHOOK_SECRET` |
| **Génération IA** | console.anthropic.com › clé API | `ANTHROPIC_API_KEY` |

Commencez Stripe avec une clé **de test** (`sk_test_…`) pour faire un paiement d'essai avec la carte 4242 4242 4242 4242, avant de passer à la clé réelle.

**Sauvegardes** : vérifiez dans l'add-on PostgreSQL que les sauvegardes automatiques sont actives, et notez leur durée de conservation.

---

## Si quelque chose bloque

Copiez les dernières lignes des **Journaux** de l'application et collez-les-moi dans ce fil : je vous dirai quoi corriger.
