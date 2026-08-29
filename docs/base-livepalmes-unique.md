# Base active des performances LivePalmes

<!-- description: Organisation actuelle de la base interne des performances, de son journal de modifications et de ses index. -->

## Rôle de la base

LivePalmes conserve une base interne commune pour centraliser les performances individuelles. Elle rassemble les données historiques reprises des anciennes sources et les nouvelles performances ajoutées depuis le portail.

La collection Firestore de référence s'appelle aujourd'hui `performances`. Les anciens noms `performanceBase` et `performanceBaseChanges`, présents dans de premiers documents de conception, ne correspondent plus à l'implémentation actuelle.

## Ce que contient une performance

Chaque ligne relie notamment :

- une nageuse ou un nageur ;
- une épreuve et un temps ;
- une compétition, une date et un lieu ;
- un club, une catégorie et les informations utiles au classement ;
- la source permettant de retrouver l'origine de la donnée.

Le détail exact reste défini par le code d'import et les règles sportives validées. La documentation ne doit pas inventer ni modifier ces règles.

## Collections principales

- `performances` : données actives utilisées par les outils internes ;
- `performanceChanges` : journal des ajouts, corrections et suppressions ;
- `performanceImports` : suivi des lots importés ;
- `performanceCorrections` : demandes et historique des corrections ;
- `performanceMigrationJobs` : suivi des opérations exceptionnelles de migration.

Le journal permet de comprendre d'où vient une modification et d'éviter qu'une correction soit perdue lors d'une publication ultérieure.

## Index de consultation

La base complète n'est pas relue à chaque affichage. Des index préparés facilitent les recherches :

- `performanceSwimmerIndex` et `performanceSwimmerPages` pour retrouver les performances d'une personne ;
- `performanceTopViews` pour les meilleures performances ;
- `performanceSwimmerIndexState` et `performanceTopIndexState` pour suivre l'état de construction de ces index.

Cette organisation réduit les lectures, accélère le portail et limite les coûts Firebase.

## Alimentation de la base

Les données peuvent venir :

- de la reprise historique INTRANAP ;
- d'imports de résultats réalisés dans le portail ;
- de corrections autorisées et tracées.

La source historique reste conservée comme référence d'origine. La base active évolue ensuite grâce aux imports et corrections. Son exhaustivité historique doit être contrôlée séparément ; elle ne doit pas être supposée uniquement parce qu'une reprise a été effectuée.

## Publication vers le site public

Firestore est la base de travail interne. Les pages publiques ne parcourent pas directement toute cette base : elles utilisent des fichiers optimisés, publiés dans Firebase Storage.

Lors d'une opération courante, seules les parties touchées sont recalculées autant que possible : fiche nageur, recherche, identifiants concernés et TOP associés. Une reconstruction complète reste une opération exceptionnelle.

Le fonctionnement détaillé est décrit dans `docs/pipeline-performances-publiques.md`.

## Records et MPF

Les records et les meilleures performances françaises ne sont pas stockés dans la collection `performances`. Ils restent dans leur espace dédié sous `competitions/livepalmes-active/performanceData/records`, puis sont publiés séparément pour le site public.

Cette séparation évite de confondre :

- la base détaillée de toutes les performances ;
- les références officielles de records et de MPF.

## État actuel

La base et ses outils sont encore améliorés pendant la finalisation et les tests du portail. Toute migration, reconstruction complète, correction massive ou publication de données doit être explicitement validée avant exécution.
