# La base nageurs et performances de LivePalmes

<!-- description: Présentation courte de la base des nageurs, des performances et des bibliothèques de données utilisées par LivePalmes. -->

Ce document présente la partie « patrimoine de données » de LivePalmes : les nageurs, leurs performances, les TOP, les fiches nageurs, les clubs, les Records et les MPF.

La gestion d'une compétition en direct n'entre pas dans ce périmètre.

## Vue d'ensemble

LivePalmes ne repose pas sur un fichier unique. Les données sont organisées en plusieurs couches :

```text
Historique INTRANAP + nouveaux imports
                  ↓
       Base active Firestore
                  ↓
      Index et référentiels métier
                  ↓
      Fichiers publics optimisés
                  ↓
          TOP et fiches nageurs
```

Cette organisation permet de conserver les sources historiques, de corriger les données sans les détruire et d'afficher rapidement plusieurs centaines de milliers de performances.

## 1. La source historique INTRANAP

Le socle initial provient d'exports CSV INTRANAP contenant quatre grandes bibliothèques :

- les **nageurs** ;
- les **performances** ;
- les **compétitions historiques** ;
- les **clubs**.

Ces fichiers constituent l'archive source. LivePalmes les lit pour reconstruire sa base, mais ne les modifie pas directement.

Seules les performances utiles aux TOP et aux fiches nageurs sont retenues : courses individuelles en bassin, distances reconnues et temps valides. Les relais, les courses non prises en charge et les lignes inexploitables sont écartés par le générateur.

## 2. La base active Firestore

La collection centrale est :

```text
performances
```

Elle rassemble les performances historiques migrées depuis INTRANAP et les nouvelles performances ajoutées dans LivePalmes. Une ligne contient notamment :

- l'identité de rattachement du nageur ;
- la course, le sexe et la catégorie calculée ;
- le temps final ou le temps intermédiaire ;
- la date, le lieu et le bassin ;
- la compétition et le club associés ;
- l'origine de la donnée et son état de publication.

Les collections complémentaires servent à la gestion et à la traçabilité :

| Collection | Rôle |
|---|---|
| `performanceImports` | Conserve chaque import, son résumé, ses alertes et les lignes reçues. |
| `performanceCorrections` | Conserve les corrections et les masquages demandés par un administrateur. |
| `performanceChanges` | Journalise les évolutions appliquées à la base active. |
| `performanceSwimmerIndex` | Indexe les nageurs pour les recherches rapides et les rapprochements. |
| `performanceSwimmerPages` | Découpe les historiques nageurs volumineux en pages. |
| `performanceTopViews` | Prépare des groupes de performances utiles aux classements TOP. |

Ces index évitent de parcourir toute la collection `performances` lors d'une recherche de nageur ou d'un affichage de classement.

## 3. Comment un nageur est identifié

Dans l'historique, une même personne peut apparaître plusieurs fois, notamment après un changement de club.

LivePalmes rapproche les fiches à partir de l'identité du nageur :

```text
nom + prénom + date de naissance
```

Le club ne fait pas partie de cette identité. Il reste attaché à chaque performance, ce qui permet de conserver l'historique des changements de club tout en affichant une seule fiche nageur.

Les index conservent également les éléments utiles à la recherche, au rattachement d'une licence et à la détection de doublons ou d'identités proches.

## 4. Contenu d'une performance

Une performance relie plusieurs bibliothèques entre elles :

- un nageur ;
- une course, par exemple `50SF`, `100BI` ou `400IS` ;
- une date et une compétition ;
- un club et une région ;
- un temps ;
- une catégorie sportive correspondant à l'âge du nageur au moment de la course.

La catégorie n'est donc pas seulement reprise du fichier source : elle est recalculée à partir de la date de naissance et de la saison sportive. Une ancienne performance junior reste ainsi classée en junior même si le nageur est désormais senior.

Les temps intermédiaires sont également conservés lorsqu'ils sont exploitables. Par exemple, le passage au 400 m d'un 1 500 m peut alimenter le TOP du 400 m, tout en restant identifiable comme temps intermédiaire.

## 5. Les bibliothèques et référentiels complémentaires

Plusieurs jeux de données complètent la base des performances :

- le **référentiel clubs**, avec identifiants, sigles, noms et régions ;
- le **catalogue des courses** reconnues : surface, apnée, immersion et bi-palmes ;
- le **référentiel des catégories**, par sexe et tranche d'âge ;
- le **référentiel des régions et saisons**, utilisé par les filtres ;
- les **Records de France et MPF**, gérés séparément et validés manuellement ;
- les tables de correspondance et d'exception nécessaires pour nettoyer certaines données historiques.

Les Records et MPF ne sont pas déduits automatiquement de toutes les performances. Ils forment une bibliothèque officielle distincte, administrée avec précaution, puis publiée dans un fichier statique de secours :

```text
performances/public/data/records-data.js
```

Le référentiel allégé des clubs utilisé par le portail est publié dans :

```text
performances/public/data/club-reference.js
```

## 6. Importer et corriger des données

Les nouveaux résultats peuvent être importés depuis :

- un fichier TXT fédéral ;
- une trame Excel pour les compétitions internationales.

Le fichier est d'abord analysé et présenté à l'administrateur. Les informations détectées, incohérences et doublons possibles doivent être contrôlés avant validation.

Après validation :

1. l'import complet est conservé dans `performanceImports` pour l'audit ;
2. les lignes sont normalisées puis intégrées dans `performances` ;
3. les index nageurs et TOP sont mis à jour ;
4. les changements sont historisés ;
5. les fichiers destinés au public peuvent être régénérés.

Une correction ne réécrit jamais l'archive INTRANAP. Elle est enregistrée séparément, puis appliquée à la base active. On peut ainsi modifier ou masquer une donnée tout en conservant son origine et l'historique de l'intervention.

## 7. La bibliothèque publique optimisée

Les visiteurs ne consultent pas directement Firestore. Une version publique est générée dans :

```text
performances/public/data/performance-public/
```

Elle est découpée en plusieurs bibliothèques spécialisées :

| Dossier ou fichier | Utilisation |
|---|---|
| `manifest.json` | Décrit la version publiée, les volumes et les filtres disponibles. |
| `swimmers/` | Contient les fiches et performances, découpées par nageur. |
| `search/` | Permet la recherche rapide par nom. |
| `ids/` | Permet de retrouver directement une fiche par identifiant. |
| `tops/` | Contient les données complètes des classements. |
| `tops-preview/` | Contient des sélections plus légères pour l'affichage rapide des TOP 25. |

À titre d'ordre de grandeur, le manifeste généré présent dans le dépôt au 20 juin 2026 décrit environ **473 700 performances**, **9 800 nageurs avec performances**, **307 fichiers TOP** et des saisons allant de **2003 à 2026**.

Ces fichiers statiques sont rapides à servir et évitent de facturer une lecture Firestore pour chaque ligne affichée. Ils sont générés automatiquement : il ne faut pas les modifier à la main.

## À retenir

- INTRANAP reste la **source historique conservée intacte**.
- `performances` est la **base active consolidée** de LivePalmes.
- Un nageur possède une identité globale, tandis que son club reste attaché à chaque performance.
- Les imports, corrections et changements sont conservés pour assurer la **traçabilité**.
- Les index nageurs et TOP servent à travailler efficacement sur de gros volumes.
- Clubs, courses, catégories, régions, Records et MPF constituent des **bibliothèques complémentaires**.
- Les pages publiques utilisent des fichiers spécialisés et pré-générés, jamais un scan complet de Firestore.
