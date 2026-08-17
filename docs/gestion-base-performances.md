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

L'aperçu avant validation est essentiel : il permet de repérer un mauvais fichier ou une interprétation incorrecte avant l'écriture définitive.

## Corrections

Une correction autorisée est enregistrée dans `performanceCorrections`, appliquée à la base active et reportée dans le journal des changements.

L'objectif est de conserver une trace claire de l'ancienne valeur, de la nouvelle valeur, de l'auteur et du moment de la correction. Les fichiers publics concernés sont ensuite régénérés de manière ciblée.

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
