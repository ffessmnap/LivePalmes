# Performances, Records et MPF

<!-- description: Règles sensibles concernant les performances historiques, Records, MPF, données générées et coûts Firestore. -->

## Règles métier

Les calculs de Records, MPF, catégories, relais, classements, médailles et qualifications sont sensibles. Ne jamais inventer une règle sportive ni modifier leur logique sans validation explicite.

Les Records et MPF officiels sont stockés dans :

```text
competitions/livepalmes-active/performanceData/records
```

Le fallback statique correspondant est :

```text
performances/public/data/records-data.js
```

Après une modification publiée et validée, le fallback se synchronise avec :

```powershell
node tools/sync-records-from-firestore.js --write
```

Cette commande lit Firestore et écrit un fichier généré : ne pas la lancer sans validation de publication.

## Pipeline public

Les pages TOP et fiches nageurs ne doivent pas effectuer de lectures Firestore massives. Elles utilisent des fichiers publics générés et optimisés.

- `performances/public/data/performance-public/` : fichiers publics générés présents dans le dépôt ;
- `performances/public/data/performance-public-firestore/` : sortie locale ignorée par Git destinée à Firebase Storage ;
- `outputs/` : fichiers de travail ignorés par Git.

Ne jamais modifier ces sorties manuellement. Corriger la source ou le générateur, reconstruire localement, contrôler le résultat puis demander une validation distincte avant publication Storage.

## Firestore

Les données historiques peuvent atteindre plusieurs centaines de milliers de lignes. Toute évolution doit utiliser des requêtes indexables, bornées et paginées. Mesurer ou estimer les lectures par ouverture et vérifier qu’elles ne croissent pas avec le nombre de résultats affichés. Interdiction des scans complets publics, lectures N+1, lecture par nageur ou résultat et listeners multiples inutiles.

## Références

Lire seulement les sections utiles des documents dont la description correspond à la tâche, notamment `docs/gestion-base-performances.md` et `docs/pipeline-performances-publiques.md`. Pour toute publication ou migration, appliquer aussi `docs/agents/PUBLICATION.md`.
