# Gestion de la base des performances LivePalmes

Ce document explique simplement comment LivePalmes gere les performances utilisees pour les TOP, les fiches nageurs, les MPF et les records.

L'idee importante : LivePalmes a maintenant une base active unique pour les performances. Les anciennes sources restent conservees, mais l'exploitation quotidienne se fait dans une base consolidee.

## Resume tres simple

LivePalmes utilise trois familles de donnees :

1. **La base active des performances**
   - C'est la base principale utilisee pour l'administration.
   - Elle contient les performances historiques INTRANAP et les competitions importees ensuite.
   - Elle peut etre alimentee et corrigee par les administrateurs habilites.
   - Elle est stockee dans Firestore dans la collection `performances`.

2. **L'ancienne base INTRANAP**
   - C'est la grosse base historique.
   - Elle contient plusieurs annees de resultats.
   - On ne la modifie pas directement.
   - Elle sert d'archive source et de reference de reconstruction.

3. **Les MPF et records**
   - Ils sont geres a part.
   - Ils ne sont pas recalcules automatiquement depuis toutes les performances.
   - Ils sont modifies manuellement par un administrateur habilite.

## Pourquoi on ne modifie pas directement INTRANAP

La base INTRANAP est consideree comme une base historique de reference.

On l'utilise pour extraire les performances, mais on ne va pas reecrire dedans depuis LivePalmes.

Cela evite de casser ou de polluer l'historique.

Quand une nouvelle competition est ajoutee, elle est integree dans la base active LivePalmes. Ainsi :

- INTRANAP reste intacte ;
- les nouvelles competitions peuvent apparaitre dans les TOP et fiches nageurs ;
- on peut corriger ou masquer une performance LivePalmes sans toucher a l'ancien historique.

## Comment INTRANAP est utilisee

INTRANAP contient beaucoup de resultats.

Pour que les pages publiques soient rapides, LivePalmes ne relit pas toute la base INTRANAP a chaque affichage.

A la place, on genere des fichiers publics optimises :

- un index des nageurs ;
- des fichiers de performances par groupe de nageurs ;
- des fichiers sources pour les TOP ;
- un resume des filtres disponibles : saisons, regions, categories, courses.

Ces fichiers sont generes par un script technique :

`tools/build-intranap-public-data.js`

Ce script lit la base INTRANAP locale, puis produit des fichiers dans :

`performances/public/data/`

Ces fichiers sont ensuite deployes sur Firebase Hosting.

Les memes performances historiques sont aussi migrees dans Firestore dans la collection `performances`, afin d'avoir une base active unique avec les imports LivePalmes.

## Quelles performances INTRANAP sont gardees

Le systeme ne garde que les performances utiles aux TOP et fiches nageurs.

Sont gardees :

- les courses en bassin ;
- les courses individuelles ;
- les courses dans les distances reconnues : surface, apnee, immersion, bipalmes ;
- les temps valides ;
- les temps intermediaires exploitables.

Sont exclues :

- les courses hors bassin ;
- les relais ;
- les courses non reconnues ;
- les temps invalides ;
- les competitions sans information exploitable.

## Categories

Pour les TOP, la categorie n'est pas prise comme une simple etiquette du fichier source.

La categorie est recalculee avec :

- la date de la course ;
- la date de naissance du nageur.

Cela permet d'avoir la categorie du nageur au moment ou la performance a ete nagee.

Exemple : un nageur senior aujourd'hui peut avoir nage une performance junior dans le passe. La performance doit rester classee en junior si c'etait sa categorie a l'epoque.

## Fusion des fiches nageurs

Il arrive qu'un meme nageur ait plusieurs fiches dans INTRANAP.

Exemple :

- meme nom ;
- meme prenom ;
- meme date de naissance ;
- mais club different.

Dans LivePalmes, ces fiches sont fusionnees.

La cle de fusion est :

`nom + prenom + date de naissance`

Le club ne sert pas a identifier le nageur.

Le club reste en revanche conserve sur chaque performance. Un nageur peut donc avoir :

- des performances avec un ancien club ;
- des performances avec un nouveau club ;
- une seule fiche nageur globale.

## Temps intermediaires

Les temps intermediaires sont conserves quand ils existent.

Par convention :

- `TI1` correspond au passage 100 m ;
- `TI2` correspond au passage 200 m ;
- `TI3` correspond au passage 400 m ;
- `TI4` correspond au passage 800 m.

Ces passages peuvent servir aux TOP.

Exemple :

Un nageur fait un 1500 m surface.

S'il a un passage au 400 m, ce passage peut entrer dans le TOP du 400 m surface si c'est une performance suffisamment bonne.

Sur la fiche nageur, on peut distinguer une performance normale d'une performance issue d'un temps intermediaire.

## Imports de nouvelles competitions

Les imports se font depuis la page administration, avec le droit :

`competitions.import`

Deux types de fichiers sont prevus.

### Fichier TXT federal

C'est le fichier de resultats classique issu du systeme federal.

Le systeme lit notamment :

- le nom de la competition ;
- la date ;
- le lieu ;
- le bassin ;
- les clubs ;
- les nageurs ;
- les courses ;
- les temps finaux ;
- les temps intermediaires si presents.

### Fichier Excel international

Pour les competitions internationales, on utilise une trame Excel.

Elle permet de fournir les informations qui manquent souvent dans les fichiers internationaux :

- nom et prenom du nageur ;
- sexe ;
- date de naissance ;
- nationalite ;
- federation ;
- club ou equipe ;
- course ;
- temps final ;
- temps intermediaires ;
- date et lieu de course.

La trame est ici :

`docs/Trame_import_competition_internationale_LivePalmes.xlsx`

## Etapes d'un import

Un import ne va pas directement dans la base sans controle.

Le fonctionnement est :

1. L'administrateur charge un fichier.
2. LivePalmes analyse le fichier.
3. Une previsualisation s'affiche.
4. L'administrateur controle les informations detectees.
5. Si tout est bon, il valide l'import.
6. Les performances sont stockees dans la base additionnelle LivePalmes.
7. Elles sont synchronisees dans la base consolidee des performances.
8. Elles peuvent ensuite servir aux TOP et fiches nageurs.

## Ou sont stockes les imports

Les competitions importees sont d'abord stockees dans Firestore, dans la collection :

`performanceImports`

Chaque import contient :

- les informations de competition ;
- les clubs detectes ;
- les performances ;
- les alertes ;
- les doublons possibles ;
- l'auteur de l'import ;
- la date d'import.

Les performances normalisees sont ensuite synchronisees dans la base active unique :

`performances`

Cette collection sert de base consolidee LivePalmes pour toutes les performances : historiques INTRANAP, imports, corrections et futures competitions.

Les changements sont historises dans :

`performanceChanges`

## Doublons possibles

Lors d'un import, LivePalmes peut detecter des doublons possibles.

Un doublon possible ne veut pas forcement dire qu'il y a une erreur.

Cela veut dire que plusieurs lignes se ressemblent fortement :

- meme nageur ;
- meme course ;
- meme date ;
- meme temps ;
- meme club ou competition.

L'objectif est d'attirer l'attention de l'administrateur avant validation.

## Corrections et modifications de performances

Certaines performances peuvent devoir etre corrigees apres import.

Le systeme prevoit une logique de correction :

- modifier une performance ;
- masquer une performance ;
- conserver une trace du changement ;
- ne pas modifier directement INTRANAP.

Cela permet de corriger LivePalmes sans abimer la source historique.

## MPF et records

Les MPF et records sont geres separement des TOP et fiches nageurs.

Ils sont stockes dans Firestore dans :

`competitions/livepalmes-active/performanceData/records`

Ils sont aussi accompagnes d'un fichier statique de secours :

`performances/public/data/records-data.js`

Cela permet :

- d'afficher les MPF et records meme si la base distante est temporairement indisponible ;
- de modifier les MPF et records depuis l'administration ;
- de ne pas recalculer automatiquement les MPF et records depuis les performances.

Important :

Les MPF et records sont consideres comme des donnees statiques gerees manuellement par un admin.

## Pages publiques

Actuellement, les pages TOP et Fiche nageur peuvent etre activees ou mises en pause.

Quand elles sont en pause, les adresses :

- `/performances/tops.html`
- `/performances/nageur.html`

sont redirigees vers :

`/performances/construction.html`

Cela evite de charger les scripts et donc d'utiliser inutilement la base pendant les corrections.

Pour les remettre en ligne, il suffit de retirer les deux redirections temporaires dans :

`firebase.json`

puis de redeployer l'hebergement Firebase.

## Publication publique depuis la base unique

La base active unique est `performances`, mais les visiteurs ne lisent pas directement cette collection.

Pour eviter les lectures Firestore a chaque consultation, les pages publiques lisent des fichiers statiques optimises.

Au quotidien, la publication publique ne relit pas toute la base `performances`. Elle publie uniquement :

- les performances importees, identifiees par `source = livepalmes-import` ;
- les corrections administrateur ;
- les nageurs concernes par ces imports et corrections.

Cela evite de relire les centaines de milliers de performances historiques a chaque publication.

Une reconstruction complete peut rester necessaire apres un changement global de logique, par exemple une modification de calcul des categories. Dans ce cas seulement, il faut relire ou regenerer l'historique complet.

## Schema simple

```text
Ancienne base INTRANAP
        |
        | generation de fichiers publics rapides
        v
Fichiers publics TOP / Nageur


Imports admin TXT ou Excel
        |
        v
performanceImports
        |
        | normalisation / controle / corrections
        v
performances
        |
        v
TOP et fiches nageurs


Administration MPF / Records
        |
        v
performanceData/records
        |
        v
Pages MPF et Records
```

## Ce qu'il faut retenir

- La collection `performances` est la base active unique.
- INTRANAP est la base historique : on la lit, on ne la modifie pas.
- Les nouvelles competitions vont dans `performanceImports`, puis sont synchronisees dans `performances`.
- Les imports sont controles avant validation.
- Les performances peuvent etre corrigees sans toucher INTRANAP.
- Les fiches nageurs fusionnent les doublons par nom, prenom et date de naissance.
- Le club est conserve au niveau de chaque performance.
- Les MPF et records sont geres manuellement et separement.
- Les pages TOP et Nageur peuvent etre coupees temporairement pour eviter les lectures pendant les travaux.
