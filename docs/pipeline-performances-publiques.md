# Publication des performances publiques

<!-- description: Pipeline actuel de mise à jour et de reconstruction des fichiers optimisés utilisés par les pages publiques de performances. -->

## Pourquoi des fichiers publics séparés ?

La base Firestore contient les données de travail détaillées. Faire relire toute cette base à chaque visite serait lent et coûteux.

LivePalmes prépare donc des fichiers plus légers, adaptés aux recherches par nageur et aux TOP. Les pages publiques téléchargent seulement ce dont elles ont besoin.

## Source publique principale

La publication courante se trouve dans Firebase Storage sous :

`performance-public-firestore/`

Elle est servie depuis le bucket public `livepalmes-public-data-718081132564`. Un manifeste et un numéro de version indiquent aux pages quels fichiers charger.

Les principaux consommateurs sont les pages publiques de TOP et de consultation d'un nageur.

## Mise à jour courante

Après un import ou une correction dans le portail, les Cloud Functions mettent à jour la base active puis republient seulement les éléments touchés lorsque c'est possible :

- les fichiers des nageurs concernés ;
- les fichiers de recherche et d'identifiants associés ;
- les TOP concernés ;
- le manifeste ou la version de publication.

Cette mise à jour ciblée est le fonctionnement normal. Elle évite une reconstruction complète après chaque petite modification.

Les fiches nageurs portent un `rowSchemaVersion` et conservent dans chaque ligne les champs
nécessaires à la reconstruction des TOP, notamment saison, région, catégorie et identifiants
techniques. Une fiche d'un ancien schéma ne doit jamais servir de source à une
reconstruction ciblée : la publication est mise en échec récupérable jusqu'à une reconstruction
globale contrôlée.

## Reconstruction complète depuis Firestore

Pour une reprise globale contrôlée, l'outil `tools/build-public-performance-files-from-firestore.js` peut :

1. exporter la collection active `performances` ;
2. produire une sauvegarde intermédiaire dans `outputs/performance-base-firestore-active.ndjson` ;
3. reconstruire les fichiers dans `performances/public/data/performance-public-firestore/`.

Lorsqu'un export complet récent et contrôlé existe déjà, `tools/sync-performance-firestore-delta.js`
permet de ne lire que les documents modifiés depuis une date donnée. La requête est bornée par
défaut à 5 000 documents, conserve une fenêtre de recouvrement et produit un nouvel export sans
écraser la référence. La sortie fusionnée doit ensuite être reconstruite et soumise au contrôle
exhaustif comme un export complet.

L'outil `tools/upload-public-performance-files-to-storage.js` peut ensuite publier ces fichiers dans Firebase Storage sous `performance-public-firestore/`.

Avant toute authentification Firebase ou tout envoi, cet outil exécute obligatoirement `tools/check-public-performance-consistency.js`. Le contrôle compare l'export canonique, les fichiers de chaque nageur et tous les candidats TOP. La publication est refusée si un meilleur temps, une ligne saison/région ou une fiche diverge de l'export.

Ces commandes lisent la production ou remplacent des fichiers publics. Elles ne doivent pas être exécutées sans autorisation explicite, contrôle du projet Firebase ciblé et vérification du résultat local.

## Ancien jeu historique et solution de repli

Le dossier `performances/public/data/performance-public/` contient le jeu historique construit à partir des sources INTRANAP. Il sert encore de copie locale ou de solution de repli pour certains usages, mais ce n'est pas la publication active issue de la collection Firestore.

Les outils historiques principaux sont :

- `tools/build-intranap-public-data.js` ;
- `tools/build-performance-base-seed.js` ;
- `tools/build-public-performance-files.js`.

Le contrôle `tools/check-performance-pipeline.js` porte sur ce pipeline historique. Il ne suffit pas, à lui seul, à valider la publication active dans Storage.

## Données complémentaires

`additional-data.json` appartient au circuit historique et de compatibilité. Les pages
publiques par défaut utilisent `performance-public-firestore` et ne doivent pas dépendre
de ce fichier. Les lignes qui seraient encore présentes uniquement dans ce fichier doivent
être auditées métier avant son retrait ; il ne constitue pas la base canonique des TOP.

Certaines données ajoutées en dehors du socle historique sont regroupées dans `performance-public/additional-data.json`. Elles sont gérées par les fonctions d'import et d'export prévues à cet effet.

## Records et MPF

Les records et MPF suivent un circuit distinct. Leur source se trouve sous `performanceData/records` dans Firestore.

La fonction `syncPublicRecordsData` publie une version immuable, puis met à jour `performance-public-firestore/records/manifest.json`. Le fichier livré avec l'hébergement reste une solution de repli.

## Contrôles avant publication

Avant toute publication globale, vérifier au minimum :

- le projet Firebase et le bucket ciblés ;
- le nombre de performances exportées ;
- la présence du manifeste et de la version ;
- plusieurs recherches de nageurs et plusieurs TOP ;
- le résultat sans erreur de `node tools/check-public-performance-consistency.js` ;
- les records et MPF si leur branche a été modifiée ;
- le retour arrière ou la sauvegarde disponible.

Toute publication doit suivre `docs/agents/PUBLICATION.md`. Les fichiers de `performances/public/data/` sont générés : leur contenu ne doit pas être corrigé manuellement.
