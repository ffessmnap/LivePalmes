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

## TOP par bassin — correction du 4 octobre 2026

Les candidats des fichiers complets sont dédupliqués par nageur, saison, région **et bassin**. Dans chaque bucket Firestore (course/sexe/catégorie/saison/région), la clé est nageur + bassin ; la limite de 500 candidats s'applique à chaque bassin. Les champs optionnels vides sont omis pour limiter la taille des documents. Le champ `pool` doit survivre à `publicTopIndexRow`. Le preview contient les 100 meilleurs nageurs distincts tous bassins confondus ; les filtres bassin/saison/région chargent toujours le fichier complet avant la déduplication finale de la page TOP.

Constructeurs recensés : générateur `build-public-performance-files.js`, import historique `import-performance-seed-to-firestore.js`, backend `writePerformanceTopIndexRows` / `rebuildPerformanceTopIndexNextPage`, publication progressive `mergePublicTopRows` / `publishPublicTopFiles` et reconstruction ciblée `rebuildPublicTopFilesForAffectedRows`. Le contrôle `performance-public-consistency.js` suit la même clé. Les scripts ponctuels `repair-antoine-fauveau-performance-history`, `repair-antoine-corrupted-top-views`, `repair-performance-public-top-row`, `cleanup-stale-antoine-1993-top-rows` et `remove-world-games-2009-camille-100sf-splits` sont archivés et refusent désormais l'exécution : une reconstruction depuis un ancien TOP ne restitue pas ses candidats perdus. Le workflow de synchronisation PROD → TEST copie des agrégats sans les reconstruire : après une telle copie depuis une ancienne version, reconstruire les TOP avant recette.

Sur TEST uniquement, lancer `livepalmes-test-publish-performance-public.yml` avec `rebuild_tops_only=true`, après le déploiement du backend corrigé. Le workflow exporte `performances` en lecture seule, génère les fichiers, contrôle leur cohérence, prépare et sauvegarde les anciennes vues/fichiers dans l'artefact `test-top-backup` (14 jours), puis remplace uniquement `performanceTopViews`, `tops/`, `tops-preview/`, manifeste et version. Les fiches, recherches et fichiers DTN ne sont pas publiés dans ce mode. Le script `rebuild-test-top-indexes.js` refuse tout projet/credential/bucket différent de TEST. Une seconde lecture compare tous les documents et fichiers écrits et vérifie BECQ et trois autres nageurs multi-bassins ; preuve dans `test-top-verification`.

Budget de reconstruction hors parcours utilisateur : N lectures sources paginées par 1 000, B lectures de vues avant + B après, B écritures groupées par au plus 100 documents et 6 Mo et suppression des seules vues dérivées obsolètes. La taille de chaque vue est contrôlée avant toute écriture. Ouverture, filtre et rafraîchissement publics : zéro lecture Firestore ajoutée ; mêmes fichiers statiques, candidats supplémentaires dans les TOP complets, previews toujours plafonnés à 100 nageurs. Une reconstruction complète nécessite une période sans import/correction concurrent pour que l'export reste cohérent ; aucune reconstruction massive automatique en consultation.

En cas d'échec après écriture, conserver le run et sa sauvegarde ; restaurer les vues et fichiers sauvegardés sur TEST avec leurs métadonnées avant de reprendre, ou reconstruire à nouveau depuis les sources inchangées. Ne jamais restaurer ni modifier la collection source `performances`. Aucun accord PROD n'est associé à cette opération.

Les vues dont le tableau dépasserait 850 Ko utilisent `rowsEncoding: gzip-base64-v1` et `rowsGzip` à la place du tableau `rows`. La compression conserve exactement les mêmes candidats. `readPerformanceTopIndexRows` accepte les anciennes vues en tableau et les nouvelles vues compressées ; le writer progressif décode avant fusion et réencode ensuite. L'import historique et la reconstruction TEST emploient le même format, couvert par un test de lecture croisée. Les fichiers publics restent des JSON ordinaires, sans changement de navigateur. Un document encore trop volumineux après compression est refusé avant publication.
