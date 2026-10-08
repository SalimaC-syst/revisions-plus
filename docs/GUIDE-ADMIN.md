# Guide de l'administrateur et des enseignants

Ce guide s'adresse à la direction, à l'équipe pédagogique et aux enseignants. Aucune compétence technique n'est nécessaire.
Pour s'y connecter : **Se connecter**, puis **Administration** apparaît dans le menu.

## 1. Les rôles

| Rôle | Ce qu'il peut faire |
|---|---|
| **Super-administrateur** | Tout, y compris les comptes administrateurs, les tarifs, les paramètres et les demandes RGPD |
| **Administrateur pédagogique** | Niveaux, matières, évaluations, publication, corrections, statistiques |
| **Enseignant** | Les évaluations **de ses matières uniquement** : contenus, génération IA, corrections. Il ne publie pas |
| **Parent** | Son espace : enfants, abonnement, factures, suivi, données personnelles |
| **Élève** | Son espace de révision |

La publication reste à la direction ou à l'administrateur pédagogique : un enseignant prépare, un responsable publie.

## 2. Niveaux et matières

**Administration › Niveaux et matières.** Les matières sont indépendantes par niveau. En 5e s'ajoutent l'espagnol et le latin.

- **Ajouter** une matière : nom, icône et couleur.
- **Masquer** une matière : elle disparaît pour les élèves, les contenus sont conservés.
- **Renommer** : sans conséquence pour les évaluations existantes.
- **Fusionner** : toutes les évaluations de la matière d'origine sont déplacées dans celle d'arrivée, puis la première est supprimée. L'opération est tracée dans le journal.
- **Supprimer** : possible seulement si la matière ne contient aucune évaluation.

## 3. Créer une évaluation

**Administration › Évaluations › Nouvelle évaluation.** Renseigner le niveau, la matière, le titre, la date du contrôle (facultative), le nom de l'enseignant et les objectifs.

L'évaluation s'ouvre ensuite sur sept onglets, dans l'ordre de travail :

1. **Informations** : les données ci-dessus et les **notions** (par exemple « Vocabulaire », « Repères chronologiques »). Les notions servent à mesurer ce que chaque élève maîtrise et à lui proposer du renforcement ciblé.
2. **Documents** : importer le cours (Word, PowerPoint, PDF, images, texte) ou ajouter un lien (Digipad, vidéo). Pour chaque document, indiquer s'il est **visible des élèves** et son **statut de droits** (libre, autorisé, usage interne). Un document dont les droits ne sont pas vérifiés n'est jamais montré aux élèves.
3. **Génération IA** : voir le paragraphe 4.
4. **Fiche mémo** (étape « Je comprends ») : blocs de texte, points clés, définitions, frise, tableau, exemple commenté, média.
5. **Flashcards** (étape « Je mémorise ») : recto / verso, rattachées à une notion.
6. **Exercices** (étape « Je m'entraîne ») : onze types de questions (QCM, vrai/faux, réponse courte, texte à trous, remise en ordre, association, catégories, calcul, frise, placement sur une carte, réponse rédigée). Pour chaque question : l'explication affichée après la réponse, et la « méthode à retenir ».
7. **Contrôles blancs** : durée, consignes, et les questions du contrôle. Pour proposer plusieurs sujets équivalents, donner le même **groupe de variantes** (A, B, C…) à deux questions de même barème : chaque élève en reçoit une au hasard.

Le bandeau **« Prêt pour les élèves ? »** indique à tout moment ce qui est validé et ce qui manque.

## 4. La génération assistée par IA

Onglet **Génération IA**, après avoir importé les documents.

- **Étape A** analyse le cours et propose la fiche mémo et les flashcards.
- **Étape B** propose les exercices et le contrôle blanc avec ses variantes.

Trois garanties :

1. **Rien n'est publié automatiquement.** Tout arrive en **brouillon**, invisible des élèves.
2. **Chaque élément indique sa source** (la page ou le passage du document). Les éléments dont l'IA n'est pas sûre portent la mention « ⚠ à vérifier ».
3. **Aucune donnée d'élève n'est transmise** : seuls les documents sélectionnés sont envoyés.

Relire, corriger, puis **Valider**. Le bouton « Valider tous les brouillons relus » ne valide jamais les éléments marqués « à vérifier » : ceux-là se valident un par un.

## 5. Publier

Dans l'évaluation, bouton **Publier**. Les élèves ne voient que les **contenus validés** d'une évaluation **publiée**. **Dépublier** la retire immédiatement de l'espace élève sans rien effacer. **Dupliquer** sert à repartir de l'année précédente ; **Archiver** à ranger une évaluation passée.

## 6. Corriger les réponses rédigées

**Administration › Corrections.** Les questions rédigées ne reçoivent jamais de note automatique.

Pour chaque copie : la réponse de l'élève, le corrigé attendu et les critères avec leur barème. Saisir les points et un commentaire, puis **Valider la correction**. La note sur 20 n'apparaît à l'élève que lorsque toutes ses réponses rédigées ont été corrigées ; avant cela il voit « en attente de correction ».

Si l'aide IA à la correction est activée (**Paramètres**), une proposition de note critère par critère s'affiche, pré-remplie et modifiable. **C'est la note de l'enseignant qui compte.**

## 7. Familles, comptes et accès

- **Utilisateurs** : rechercher un compte, changer un rôle, attribuer des matières à un enseignant, suspendre un compte, réinitialiser un mot de passe.
- **Abonnements et paiements** : voir les abonnements, suspendre ou réactiver, rembourser, et **accorder un accès sans paiement en ligne** (règlement par chèque ou virement, bourse, compte de test). L'accès est alors marqué « accordé par l'établissement ».
- **Tarifs** : modifier les montants, les intitulés et les conditions des deux formules. Les changements ne s'appliquent qu'aux nouveaux abonnements.
- **Demandes RGPD** : voir le document de conformité.
- **Journal et erreurs** : historique des actions sensibles et erreurs techniques.

## 8. Paramètres

**Administration › Paramètres** : nom et logo de l'établissement, couleurs, mentions légales, et trois interrupteurs — génération IA, aide IA à la correction (désactivée par défaut) et durée du droit de rétractation.

**Le logo ne doit être téléversé qu'avec l'autorisation écrite de l'établissement** ; une case le rappelle et doit être cochée.

## 9. Côté élève, en bref

L'élève choisit son espace (Sixième ou Cinquième), une matière, une évaluation, puis suit les quatre étapes. Il voit sa progression, ses notions maîtrisées ou à retravailler, une recommandation personnalisée, des points d'expérience, des badges et des missions du jour. **Il n'y a aucun classement entre élèves** et aucune note n'est visible des autres familles.
