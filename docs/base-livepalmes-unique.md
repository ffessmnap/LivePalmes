# Base LivePalmes unique des performances

<!-- description: Modèle cible de la base interne unique des performances et de son journal de modifications. -->

## Cible

La source officielle devient une base interne unique :

- `performanceBase` : une ligne par performance officielle LivePalmes ;
- `performanceBaseChanges` : journal technique des synchronisations, corrections, masquages et imports.

Les pages publiques ne lisent pas directement cette base. Elles continuent de lire des fichiers publics optimises, generes depuis la base officielle.

## Etat mis en place

Depuis cette transition :

- chaque nouvel import continue d'etre stocke dans `performanceImports` pour l'audit ;
- chaque nouvel import est aussi synchronise dans `performanceBase` ;
- chaque correction ou masquage est toujours stocke dans `performanceCorrections` ;
- chaque correction ou masquage est aussi applique dans `performanceBase`.

Cela donne une source officielle pour les nouvelles actions, tout en conservant l'affichage public actuel.

## Migration historique

La migration complete de l'historique ne doit pas etre lancee a l'aveugle : elle represente plusieurs centaines de milliers de performances.

Premiere etape de controle :

```bash
node tools/build-performance-base-seed.js
```

Ce script genere :

```text
outputs/performance-base-seed.ndjson
```

Chaque ligne contient une performance prete a etre inseree dans `performanceBase`.

Pour tester sur un petit echantillon :

```bash
node tools/build-performance-base-seed.js --limit 1000
```

Une fois le fichier controle, on pourra ajouter l'etape d'import Firestore par lots, avec reprise possible en cas d'interruption.

## Publication publique

La cible finale est :

1. Admin modifie `performanceBase`.
2. Une publication regenere les fichiers publics TOP et fiches nageurs.
3. Les visiteurs lisent uniquement ces fichiers publics optimises.

Cela garde une base administrative simple, sans exposer les pages publiques a des lectures Firestore massives.
