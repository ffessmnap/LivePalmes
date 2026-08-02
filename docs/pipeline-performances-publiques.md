# Pipeline des performances publiques

<!-- description: Pipeline de reconstruction et de publication des fichiers optimisés utilisés par les pages publiques de performances. -->

Ce document fixe la chaine propre pour reconstruire les donnees publiques des performances.

## Objectif

Les pages publiques `performances/tops.html` et `performances/nageur.html` ne doivent pas lire Firestore en masse.
Elles lisent des fichiers statiques optimises dans :

```text
performances/public/data/performance-public/
```

Ces fichiers sont deployes sur Firebase Hosting.

## Sources

La source historique brute est le dossier local INTRANAP :

```text
C:\Users\ITIFP\OneDrive - SNCF\Documents\BDD INTRANAP
```

Il doit contenir notamment :

- `perfs_202605151707.csv`
- `nageurs_202605151707.csv`
- `competitions_202605151706.csv`
- `clubs_202605151706.csv`

Les scripts selectionnent automatiquement le dernier fichier disponible pour chaque prefixe :

- `perfs_*.csv`
- `nageurs_*.csv`
- `competitions_*.csv`
- `clubs_*.csv`

Ces fichiers CSV sont la source a conserver. Ils ne doivent pas etre deplaces ou supprimes sans sauvegarde.

## Fichiers intermediaires

La commande suivante transforme les CSV INTRANAP en fichiers intermediaires :

```powershell
node tools/build-intranap-public-data.js
```

Elle produit notamment :

```text
performances/public/data/intranap-summary.js
performances/public/data/intranap-swimmers-index.js
performances/public/data/intranap-swimmer-perfs/
performances/public/data/intranap-top-source/
```

Les deux dossiers `intranap-swimmer-perfs/` et `intranap-top-source/` sont ignores par Git pour eviter de stocker trop de fichiers generes dans le depot.
Ils restent utiles localement pour reconstruire la base publique.

## Seed de base active

La commande suivante reconstruit un fichier NDJSON a partir des fichiers intermediaires :

```powershell
node tools/build-performance-base-seed.js
```

Sortie :

```text
outputs/performance-base-seed.ndjson
```

Ce fichier est temporaire et ignore par Git.
Il sert de source pour reconstruire les fichiers publics optimises.

## Fichiers publics optimises

La commande suivante regenere les fichiers publics lus par les visiteurs :

```powershell
node tools/build-public-performance-files.js
```

Sortie :

```text
performances/public/data/performance-public/
```

Ces fichiers sont deployes sur Firebase Hosting.

## Diagnostic

Avant de reconstruire ou deployer, lancer :

```powershell
node tools/check-performance-pipeline.js
```

Le diagnostic verifie :

- la presence des CSV INTRANAP ;
- la presence des fichiers intermediaires ;
- la presence et le poids des fichiers publics optimises.
- la presence des apercus TOP rapides utilises par defaut sur la page TOP.

Les fichiers publics contiennent aussi :

```text
performances/public/data/performance-public/tops-preview/
```

Ces fichiers limitent chaque categorie aux meilleurs temps utiles pour l'affichage TOP 25 par defaut.
Les fichiers complets dans `tops/` restent disponibles quand l'utilisateur choisit `Tous`, une saison ou une region.

Si les fichiers intermediaires sont absents mais que les CSV sont presents, relancer :

```powershell
node tools/build-intranap-public-data.js
```

## Ordre complet de reconstruction

Pour repartir de la source historique brute :

```powershell
node tools/check-performance-pipeline.js
node tools/build-intranap-public-data.js
node tools/build-performance-base-seed.js
node tools/build-public-performance-files.js
node tools/verify-livepalmes.js
```

Puis seulement si tout est correct :

```powershell
firebase deploy --only hosting --project livepalmes
```

## A retenir

- Les CSV INTRANAP sont la source historique brute.
- Les dossiers `intranap-swimmer-perfs/` et `intranap-top-source/` sont des fichiers intermediaires regenerables.
- Le dossier `performance-public/` contient les fichiers publics optimises deployes.
- Ne jamais deployer apres une generation qui annonce `0 performance`.
