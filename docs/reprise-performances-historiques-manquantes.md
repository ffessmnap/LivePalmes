# Reprise des performances historiques manquantes

<!-- description: Note de reprise du diagnostic et du plan de correction des performances INTRANAP potentiellement absentes de Firestore et des fiches publiques. -->

## Objet

Cette note permet de reprendre ultérieurement l'audit et la correction des performances historiques potentiellement absentes des fiches nageurs, sans recommencer l'enquête menée le 12 août 2026.

Ne pas lancer directement une migration à partir des écarts de compteurs présentés ci-dessous. Ils identifient des candidats à contrôler, pas encore un delta certifié ligne par ligne.

## Incident révélateur : Antoine FAUVEAU

La date de naissance d'Antoine FAUVEAU a été corrigée de `1992-07-01` vers `1993-07-01` depuis l'administration nationale.

L'ancienne version de la fonction de correction a reconstruit ses performances depuis une fiche publique compacte qui ne contenait plus `publicKey` et `performanceBaseId`. Les 680 performances déjà accessibles ont donc été copiées sous la nouvelle identité au lieu de mettre à jour leurs documents techniques d'origine.

L'enquête a ensuite montré que 71 lignes historiques n'étaient déjà pas présentes dans Firestore :

- 38 performances finales confirmées comme appartenant à Antoine ;
- 33 temps intermédiaires associés.

La réparation ciblée a produit une fiche unique :

- identité : `FAUVEAU|ANTOINE|1993-07-01` ;
- identifiant INTRANAP : `912` ;
- licence : `A-05-222647` ;
- 353 performances finales ;
- 398 temps intermédiaires ;
- 751 lignes uniques au total ;
- aucune ligne Firestore restante sous l'identité 1992.

Le correctif durable de la fonction `updateEngagementNationalSwimmerIdentity` a été déployé. Les futures corrections d'identité doivent maintenant hydrater les identifiants techniques et mettre à jour les documents d'origine au lieu de les recopier.

## Constats de l'audit global

Les contrôles suivants ont été réalisés sans scan complet de Firestore : index publics Storage, ancien catalogue public Hosting et export Firestore local.

### Absence d'autres incidents d'identité

- Une seule entrée `engagementClubSwimmer.identityCorrected` existe dans `auditLogs` : Antoine FAUVEAU, le 12 août 2026.
- Aucun autre identifiant nageur n'est relié à plusieurs identités dans les 8 837 fiches référencées par la recherche publique dynamique.
- L'export local de 437 953 lignes ne présente aucun identifiant nageur réparti entre plusieurs `swimmerIdentityKey`.
- Aucune autre copie technique de source `livepalmes`, semblable à celles créées pour Antoine, n'a été trouvée dans cet export.

Le bogue de modification d'identité n'a donc touché qu'Antoine.

### Migration historique probablement incomplète

Le suivi `performanceMigrationJobs/intranap-csv-seed` indique qu'une migration a écrit 433 667 performances pour 8 827 nageurs le 12 juin 2026.

L'ancien catalogue public, généré le 20 juin 2026, annonce :

- 473 679 lignes ;
- 9 829 nageurs ;
- des saisons allant de 2003 à 2026.

L'export Firestore local du 1er août 2026 contient :

- 437 953 lignes exportables ;
- 433 666 lignes de source `intranap` ;
- 4 287 lignes de source `livepalmes-import`.

La comparaison des index de nageurs de l'ancien catalogue et du catalogue dynamique a signalé :

- 1 106 nageurs dont l'ancien compteur est supérieur au compteur dynamique ;
- 1 015 nageurs historiques absents de l'index dynamique ;
- 373 nageurs dont le compteur dynamique est supérieur ;
- 23 nageurs uniquement présents dans le catalogue dynamique.

Ces écarts ne prouvent pas que toutes les lignes correspondantes doivent être importées. Les compteurs peuvent différer à cause des nouveaux imports, des règles de filtrage, des doublons éliminés ou de sorties publiques qui ne sont pas parfaitement synchrones.

### Référence publique résiduelle d'Antoine

Le fichier public dynamique `search/91.json` contient encore une référence orpheline vers l'ancienne fiche 1992 d'Antoine. Le fichier nageur correspondant est déjà supprimé. Cette entrée doit être retirée lors de la prochaine publication ciblée.

## Cause la plus probable

La base Firestore a été initialisée le 12 juin à partir d'un seed de 433 667 performances. Un catalogue historique plus complet a ensuite été généré le 20 juin, mais son complément n'a pas été resynchronisé vers Firestore.

Le cas Antoine a rendu cette différence visible : une correction d'identité ne pouvait déplacer que les lignes déjà présentes dans Firestore. Ses anciennes performances absentes de Firestore ne pouvaient donc pas suivre automatiquement.

## Plan recommandé

### Étape 1 — Produire un delta local de candidats

1. Régénérer la source INTRANAP normalisée complète depuis la source locale de référence, avec les générateurs existants.
2. Construire pour chaque ligne sa clé canonique `publicKey` et son `performanceBaseId`.
3. Télécharger ou lire les fichiers publics dynamiques Storage, sans requête Firestore.
4. Comparer les clés INTRANAP aux clés présentes dans les fichiers dynamiques.
5. Produire un rapport local contenant au minimum :
   - nombre total de lignes candidates ;
   - performances finales et temps intermédiaires ;
   - nageurs concernés ;
   - répartition par saison ;
   - répartition par course ;
   - nageurs entièrement absents ;
   - principaux écarts de compteurs.

Cette étape est en lecture locale et Storage uniquement. Elle ne doit effectuer aucune écriture de production.

### Étape 2 — Vérifier uniquement les candidats dans Firestore

Les fichiers publics peuvent être incomplets alors que certains documents existent dans Firestore. Avant tout import :

1. calculer les références Firestore canoniques des seuls candidats ;
2. utiliser des lectures directes bornées et groupées avec `getAll` ;
3. retirer du delta les documents qui existent déjà ;
4. produire le rapport final du delta réellement absent.

Le coût attendu est de l'ordre du nombre de candidats, probablement quelques dizaines de milliers de lectures, et non 438 000 lectures. Le nombre exact doit être annoncé avant l'exécution.

### Étape 3 — Faire valider le rapport

Avant toute écriture, présenter :

- le nombre exact de documents à créer ;
- le nombre de nageurs affectés ;
- les saisons et sources concernées ;
- les anomalies éventuelles nécessitant une décision métier ;
- l'estimation des écritures Firestore et des fichiers publics à reconstruire.

Une validation explicite est obligatoire pour la migration des performances.

### Étape 4 — Importer uniquement le delta certifié

Après validation :

1. écrire uniquement les documents absents avec leur identifiant canonique ;
2. rendre le script idempotent et interrompre l'opération si les totaux attendus changent ;
3. journaliser la migration dans `performanceMigrationJobs` ;
4. reconstruire les index et pages des seuls nageurs affectés ;
5. reconstruire uniquement les fichiers de recherche et TOP concernés ;
6. supprimer la référence 1992 d'Antoine dans `search/91.json` ;
7. mettre à jour le manifeste et `version.js` sans présenter leur `rowCount` comme un comptage Firestore temps réel non vérifié.

Ne pas réécrire aveuglément les quelque 473 000 lignes historiques.

### Étape 5 — Vérifier avant publication

Contrôles minimaux :

- aucune clé canonique du delta ne reste absente ;
- aucune clé canonique n'est dupliquée ;
- un seul index par identifiant nageur ;
- compteurs finaux et intermédiaires cohérents ;
- échantillons sur les plus gros écarts historiques ;
- Antoine apparaît une seule fois, avec 353 performances finales ;
- les fiches publiques et TOP concernés chargent correctement ;
- `node tools/verify-livepalmes.js` passe ;
- tests manuels ciblés avant publication Storage ou Hosting.

La publication Firebase Storage, le déploiement des fonctions et le déploiement Hosting nécessitent chacun un périmètre explicite et validé. Le déploiement Hosting ne doit pas être utilisé pour cette migration si seule la publication Storage est nécessaire.

## Estimation de reprise

- audit local et construction du delta candidat : 15 à 30 minutes ;
- vérification Firestore bornée et rapport final : 10 à 20 minutes ;
- import ciblé et reconstruction des fichiers affectés : 20 à 40 minutes ;
- contrôles finaux : environ 10 minutes.

Estimation totale : 45 minutes à 1 h 30 selon le nombre réel de lignes et de nageurs concernés.

## Fichiers et éléments utiles

- export local Firestore : `outputs/performance-base-firestore-active.ndjson` ;
- générateur de la source : `tools/build-intranap-public-data.js` ;
- générateur du seed : `tools/build-performance-base-seed.js` ;
- générateur public Firestore : `tools/build-public-performance-files-from-firestore.js` ;
- fonction de correction d'identité : `functions/index.js` ;
- réparation ciblée d'Antoine : `tools/repair-antoine-fauveau-performance-history.js` ;
- fichiers publics dynamiques : `gs://livepalmes-public-data-718081132564/performance-public-firestore/` ;
- ancien catalogue public : `performances/public/data/performance-public/`.

## État au 12 août 2026

- correction durable des modifications d'identité : déployée ;
- fiche Antoine : réparée et publiée ;
- audit global préliminaire : terminé ;
- delta ligne par ligne global : non calculé ;
- migration globale : non exécutée ;
- nettoyage de `search/91.json` : restant à faire lors de la prochaine publication ciblée.
