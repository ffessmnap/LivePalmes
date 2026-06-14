# Base publique consolidée des performances

Objectif : ne plus fusionner l'historique IntrAnap et les compétitions importées au chargement des pages publiques.

## Principe

- L'historique IntrAnap reste la source initiale.
- Les compétitions importées LivePalmes restent stockées comme source d'administration et d'audit.
- Une étape de publication consolide les deux sources et génère des fichiers publics optimisés.
- Les pages publiques TOP et fiches nageurs liront uniquement ces fichiers consolidés.

## Génération locale

Le générateur de transition est :

```bash
node tools/build-consolidated-performance-data.js
```

Par défaut, il lit `performances/public/data` et écrit dans `performances/public/data-consolidated`.

Il peut recevoir un export d'imports déjà normalisés :

```bash
node tools/build-consolidated-performance-data.js --imports outputs/additional-performances.json
```

Le format attendu est compatible avec la réponse actuelle de `listAdditionalPerformanceData` :

```json
{
  "performances": [],
  "swimmers": []
}
```

## Migration prévue

1. Générer et contrôler la sortie consolidée sans modifier les pages publiques.
2. Ajouter une publication admin qui exporte les imports validés vers ce générateur.
3. Brancher TOP et fiches nageurs sur le dossier consolidé.
4. Supprimer l'appel public à `listAdditionalPerformanceData`.

Cette approche garde les imports disponibles tout en évitant de relire Firestore pour chaque visiteur.

## Corrections administratives

Les corrections de performances sont stockées dans Firestore côté administration, dans `performanceCorrections`.
Elles ne sont pas lues directement par les visiteurs.

Après chaque import ou correction, une Cloud Function republie un fichier public :

```text
performance-public/additional-data.json
```

Ce fichier contient :

- les performances importées LivePalmes ;
- les nageurs issus de ces imports ;
- les corrections ou masquages de performances.

Les pages TOP et fiches nageurs appliquent ce fichier en overlay sur la base consolidée principale.
Ainsi, une correction peut toucher une performance issue de l'historique ou une performance importée, sans modifier directement la source historique.

## Publication vers les pages publiques

Une fois l'export additionnel téléchargé depuis la page d'import admin :

```bash
node tools/publish-consolidated-performance-data.js --imports outputs/livepalmes-base-additionnelle.json --publish
```

La commande remplace uniquement les fichiers publics liés aux TOP et fiches nageurs :

- `intranap-summary.js`
- `intranap-swimmers-index.js`
- `intranap-swimmer-perfs/`
- `intranap-top-source/`

Elle conserve les autres fichiers du dossier `performances/public/data`, notamment les records.
Avant d'appliquer les imports, elle reconstruit l'historique IntrAnap pour éviter de consolider une base déjà consolidée.
