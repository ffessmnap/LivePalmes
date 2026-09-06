# Remise à niveau de Firebase TEST depuis PROD

Cette procédure décrit la méthode validée pour remettre `livepalmes-test` au niveau de `livepalmes` sans modifier la production.

## Règles de sécurité

- `livepalmes` est une **source en lecture seule**.
- Aucun workflow de remise à niveau ne doit écrire dans PROD.
- Firebase Authentication PROD n'est jamais copié.
- Les profils `users`, les `accessGrants`, les audits et les droits propres à TEST sont conservés.
- Un super-admin TEST actif doit exister avant toute copie.
- Les files email, schedulers et jobs opérationnels ne sont pas copiés.
- Les workflows de copie/publication sont **manuels uniquement** : une modification du dépôt ne doit jamais déclencher une remise à niveau TEST.

## Identités utilisées

### Source PROD

Le compte de service utilisé par GitHub Actions doit appartenir au projet `livepalmes` et disposer uniquement des droits de lecture nécessaires, notamment Firestore (`roles/datastore.viewer`) et, si la copie Storage est utilisée, les droits de lecture sur les buckets concernés.

### Destination TEST

Le compte de service TEST doit appartenir à `livepalmes-test` et disposer des droits d'écriture nécessaires sur Firestore et les buckets TEST.

## Procédure validée

### 1. Synchroniser les données source PROD vers TEST

Utiliser `tools/sync-firebase-prod-to-test.js`.

Commencer par un inventaire ou un dry-run. L'application réelle exige les deux confirmations de sécurité prévues par l'outil :

- `copy-livepalmes-readonly-to-livepalmes-test`
- `email-and-schedulers-disabled-in-livepalmes-test`

L'outil copie les collections métier autorisées et les ressources Storage prévues par `tools/firebase-test-data-sync-manifest.js`. Il ne vide pas les collections TEST et ne modifie pas les comptes administratifs TEST.

### 2. Copier les index et caches dérivés PROD vers TEST

Dans GitHub Actions, lancer manuellement :

**Copier index PROD vers TEST**

Confirmation demandée :

`copy-derived-indexes-prod-to-test`

Cette étape remplace la reconstruction longue des index par une copie contrôlée des collections dérivées déjà saines en PROD, notamment :

- rosters et répertoires engagements ;
- calendriers et caches engagements ;
- `performanceSwimmerIndex` et `performanceSwimmerPages` ;
- `performanceTopViews` ;
- vues et états DTN.

Les références vers les buckets, Hosting et projets PROD sont transformées vers leurs équivalents TEST. Les documents en surplus dans ces seules collections dérivées TEST peuvent être supprimés afin d'obtenir un miroir exact de PROD.

### 3. Republier les données publiques de performances TEST

Dans GitHub Actions, lancer manuellement :

**Publier performances publiques Firebase TEST**

Cette étape :

1. lit la collection `performances` de `livepalmes-test` ;
2. génère les fichiers publics optimisés ;
3. exécute le contrôle de cohérence ;
4. publie les fichiers dans `livepalmes-test-public-data-206080168534/performance-public-firestore/` ;
5. vérifie la présence du manifeste et de la version.

Les pages publiques **TOP** et **fiche nageur** utilisent ces fichiers publics. La présence des index Firestore seule ne suffit donc pas à les alimenter.

## Contrôles finaux

Après les trois étapes, vérifier au minimum sur TEST :

- connexion au portail/admin ;
- compétitions et engagements ;
- page TOP ;
- recherche et fiche nageur ;
- DTN ;
- records/MPF si leur source a été modifiée.

Pour une vérification de volumes et de références résiduelles, utiliser `tools/verify-firebase-test-data-sync.js` en lecture seule.

## Ce qu'il ne faut plus faire

- Ne pas relancer l'ancienne reconstruction paginée des index nageurs/TOP après une copie complète saine depuis PROD.
- Ne pas utiliser l'ancien workflow de suivi de reconstruction : il a été supprimé.
- Ne pas déclencher automatiquement une copie PROD → TEST sur un `push` GitHub.
- Ne jamais accorder de droit d'écriture PROD au compte de service utilisé pour cette procédure.

## Résumé opérationnel

Ordre normal :

**Synchronisation source → copie index/caches → publication publique TEST → recette.**

Si TOP et fiches nageurs sont vides alors que les index Firestore sont présents, vérifier en priorité que l'étape de publication publique TEST a été exécutée avec succès.
