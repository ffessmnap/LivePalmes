# Gestion des performances

<!-- description: Fonctionnement actuel des imports, corrections, contrôles et publications des performances depuis le portail. -->

## Vue d'ensemble

Le portail LivePalmes permet aux personnes autorisées d'alimenter et de corriger la base des performances sans manipuler directement Firestore.

Le cycle normal est le suivant :

1. un fichier de résultats est sélectionné ;
2. LivePalmes l'analyse et affiche un aperçu ;
3. l'utilisateur contrôle les données avant confirmation ;
4. le serveur enregistre le lot et les performances ;
5. les index internes et les fichiers publics concernés sont mis à jour.

Le portail et ce processus sont encore en phase de finalisation et de test.

## Imports

Les imports acceptés dépendent des outils actuellement présents dans le portail, notamment les fichiers texte issus des compétitions françaises et les tableaux prévus pour certaines données internationales.

Un import confirmé crée ou met à jour :

- les performances actives dans `performances` ;
- le suivi du lot dans `performanceImports` ;
- le journal dans `performanceChanges` ;
- les index utiles aux recherches et aux TOP.

Le lot conserve aussi son état de publication (`pending`, `publishing`, `failed` ou `published`). Si l'enregistrement Firestore est terminé mais que la génération des fichiers publics est interrompue, le portail propose « Reprendre la publication ». Cette reprise réutilise les performances déjà stockées et ne les recrée pas.

La reprise lit un document de lot puis uniquement sa sous-collection de performances, avec une limite stricte de 5 000 performances et une lecture sentinelle supplémentaire pour détecter un lot incohérent. Elle ne parcourt jamais la collection globale `performances` et n'effectue aucune lecture par ligne en dehors de ce lot borné. En fonctionnement normal, le coût est donc de `1 + N` lectures pour un lot de `N` performances ; en cas de concurrence, la transaction de réservation peut relire le seul document du lot.

La page d'import met l'historique au premier plan. L'action « Importer des résultats » ouvre une grande fenêtre qui regroupe le choix du fichier, son analyse, la vérification et la validation ; sur mobile, cette fenêtre occupe tout l'écran. L'aperçu avant validation est essentiel : il permet de repérer un mauvais fichier ou une interprétation incorrecte avant l'écriture définitive. Toutes les performances importables sont consultables par pages de 100 lignes, avec recherche et filtres sur les rattachements à vérifier et les doublons possibles. Pour la trame internationale, le rattachement proposé réutilise la référence nageurs existante et exige une concordance exacte du nom, du prénom, de la date de naissance et du sexe ; l'identifiant international saisi dans la trame n'est pas assimilé à un identifiant LivePalmes.

L'aperçu recherche aussi un import actif de la même compétition. L'identifiant externe est prioritaire ; à défaut, la comparaison utilise la date, le nom, le lieu et le bassin. Un fichier strictement identique ne peut pas être réimporté. Pour un fichier corrigé, l'action « Remplacer l'import existant » stocke d'abord le nouveau lot puis crée un travail durable. Ce travail active le nouveau lot, désactive l'ancien et republie uniquement les fiches et TOP concernés. L'ancien lot reste dans l'historique avec le statut `replaced` et un lien vers son remplaçant.

La détection d'un import existant reste bornée à cinq documents par identifiant ou code de compétition, et à vingt documents pour le repli par date. Le remplacement lit un document et au maximum `N + 1` performances pour chacun des deux lots, sans parcourir la collection globale des performances.

## Corrections

Une correction autorisée est enregistrée immédiatement dans `performanceCorrections`, puis un travail durable est créé dans `performancePublicationJobs`. Un worker séparé applique la correction à la base active, alimente le journal des changements et régénère uniquement les fichiers publics concernés. Le portail peut donc répondre sans charger le gros instantané public en mémoire.

Chaque travail passe par `pending`, `processing`, puis `published` ou `failed`. Une location temporaire empêche deux workers de traiter simultanément le même travail. Les interruptions sont reprises automatiquement toutes les cinq minutes, avec cinq tentatives au maximum ; un échec définitif peut être relancé depuis le portail. Le traitement est idempotent : une reprise réécrit les mêmes fichiers ciblés sans créer une seconde performance.

L'objectif est de conserver une trace claire de l'ancienne valeur, de la nouvelle valeur, de l'auteur et du moment de la correction. Le portail retire immédiatement la ligne supprimée de sa liste locale et indique séparément l'état de la publication des TOP et fiches nageurs.

Les suppressions de lots ou corrections importantes sont des opérations sensibles : elles doivent être confirmées et vérifiées avec les tests manuels adaptés.

## Consultation interne et publique

Le portail utilise les index Firestore pour les recherches de gestion. Les visiteurs utilisent les pages publiques de LivePalmes, alimentées par des fichiers optimisés dans Firebase Storage.

Les pages publiques des TOP et des nageurs sont bien des pages actives ; elles ne sont plus redirigées vers une page d'attente. En local, une copie générée peut servir aux contrôles, tandis qu'en ligne la source principale est le stockage public Firebase.

## Records et MPF

La gestion des records et des MPF utilise un circuit séparé de la base générale des performances. Une modification validée dans l'outil Records déclenche sa propre publication publique.

Il ne faut donc pas utiliser un import de performances ordinaires pour remplacer ou recalculer implicitement les règles officielles des records et MPF.

## Reconstruction complète

La reconstruction de toute la base publique n'est pas une opération quotidienne. Elle sert surtout après une migration, une reprise globale ou une réparation contrôlée.

Les outils concernés peuvent lire une grande quantité de documents ou remplacer des fichiers publiés. Ils ne doivent être lancés qu'après validation explicite, avec sauvegarde et vérifications adaptées.

## Contrôles recommandés

Pour une opération courante :

- contrôler l'aperçu et le nombre de lignes avant confirmation ;
- vérifier le compte et le périmètre utilisés ;
- rechercher quelques nageurs ou performances après l'opération ;
- vérifier les TOP ou fiches publiques touchés ;
- consulter le journal et l'état de publication en cas d'anomalie.

Références complémentaires :

- `docs/base-livepalmes-unique.md` pour l'organisation interne ;
- `docs/pipeline-performances-publiques.md` pour la publication ;
- `docs/agents/PERFORMANCES.md` pour les consignes de modification ;
- `docs/TESTS_MANUELS.md` pour les scénarios sensibles.
