# Architecture LivePalmes

<!-- description: Architecture technique actuelle, responsabilités des pages, stockage des données et vérifications avant publication. -->

Ce document explique l'organisation de LivePalmes avec des mots simples.

Il sert a comprendre :

- ce qui appartient au portail metier ;
- ce qui est consultable en permanence par le public ;
- ce qui appartient au dispositif Direct des competitions nationales ;
- ou sont stockees les donnees ;
- quelles zones sont sensibles ;
- quelles verifications faire avant de publier.

## Idee generale

LivePalmes est un ecosysteme web dont l'interface reste volontairement simple.

L'interface est faite principalement avec :

- des pages HTML ;
- des fichiers CSS pour l'apparence ;
- des fichiers JavaScript pour les actions ;
- MySQL NAP pour les données métier du portail et les lectures sportives publiques ;
- Firebase pour les comptes, traitements serveur, réglages/traces techniques, fichiers, hébergement et LivePalmes Direct ;
- le circuit distinct Firebase/statique conservé pour Records/MPF.

Il n'y a pas de framework comme React, Vue ou Angular.

Les pages HTML restent a la racine du projet pour garder des adresses simples et stables.

La bascule NAP est publiée en PROD. La référence des sources et limites actuelles est [NAP_REFERENCE.md](NAP_REFERENCE.md) ; les évolutions restent soumises aux contrôles et validations du projet.

## Trois composantes a bien distinguer

### 1. Le Portail LivePalmes

Le portail est le coeur fonctionnel actuel de l'ecosysteme. Il sert aux clubs, responsables regionaux, responsables nationaux et gestionnaires habilites.

Page principale :

- `portail.html`.

Le portail permet notamment :

- de gerer les comptes, droits et perimetres d'intervention ;
- de preparer les competitions et leur programme ;
- aux clubs de gerer nageurs, officiels et engagements ;
- de produire les recapitulatifs PDF et exports WinPalme ;
- d'importer et corriger les performances ;
- de mettre a jour les Records de France et MPF ;
- d'acceder aux espaces DTN et d'administration selon les droits.

Il utilise principalement :

- les modules `assets/livepalmes-admin-*.js` ;
- Firebase Authentication ;
- MySQL NAP via les Cloud Functions ;
- Firestore pour les comptes, réglages et traces techniques, avec les anciennes copies Records/MPF conservées pour retour arrière.

Chaque compte ne voit et ne modifie que les espaces autorises par ses capacites et son perimetre.

### 2. L'espace public LivePalmes

Cet espace est consultable toute l'annee, sans connexion, par les nageurs, clubs, entraineurs et familles.

Exemples :

- `index.html` ou `/` : accueil public de l'ecosysteme ;
- `public.html` : copie de compatibilite de cet accueil ;
- `performances/records.html` : Records de France ;
- `performances/mpf.html` : meilleures performances francaises ;
- `performances/tops.html` : classements TOP ;
- `performances/nageur.html` : fiches et historiques des nageurs.
- `calendrier.html` : calendrier fédéral public filtrable ;
- `competition.html?id=...` : fiche publique d'un événement.

TOP, fiches nageurs, recherche, calendrier et résultats de compétition lisent NAP via des endpoints bornés. Records/MPF lisent leurs fichiers publics. Aucun accès MySQL direct depuis le navigateur.

### 3. LivePalmes Direct

LivePalmes Direct est un dispositif distinct, utilise uniquement pour les competitions nationales concernees. Il ne faut pas le melanger avec la preparation des competitions et les engagements du portail.

Il comprend les consoles terrain :

- `pilotage-livepalmes.html` : acces au pilotage du Direct ;
- `live.html` : console Live ;
- `speaker.html` : console Speaker ;
- `ja.html` : console Juge Arbitre ;
- `video.html` : console Juge Video ;
- `bureau-perf.html` : bureau des performances ;
- `secretariat.html` : secretariat.

Il comprend aussi les pages publiques liees au deroulement de cette competition :

- `series-public.html` ou `/series` : series publiees ;
- `resultats.html` ou `/resultats` : resultats publies ;
- `medailles.html` : tableau des medailles ;

Les consoles utilisent notamment :

- `app.js` ;
- les modules `assets/livepalmes-*.js` ;
- Firebase Authentication, Firestore et les Cloud Functions.

Les pages publiques du Direct utilisent surtout :

- `public.css` ;
- les scripts `assets/pages/*.js` ;
- des donnees publiees dans Firebase ou dans des fichiers publics.

Elles ne chargent pas `app.js` et ne permettent pas de piloter la competition.

## Relations entre les composantes

Le portail, l'espace public permanent et le Direct appartiennent au meme ecosysteme, mais repondent a des usages differents.

Le portail gere les donnees metier durables :

- comptes et droits ;
- clubs, nageurs et officiels ;
- preparation des competitions et engagements ;
- performances, Records et MPF.

Les consultations sportives publiques interrogent NAP via le serveur ; Records/MPF conservent leur publication statique distincte.

Le Direct possede son propre parcours pour une competition nationale :

```text
Consoles LivePalmes Direct
  -> publient series, resultats, medailles, archives
  -> Firebase / fichiers publics
  -> pages publiques du Direct affichent ces informations
```

Le fait que le Direct partage Firebase et certains composants techniques avec le portail ne signifie pas qu'il soit utilise pour toutes les competitions.

## Organisation des fichiers

### Pages HTML principales

- `portail.html` : portail metier principal ;
- `index.html` : accueil public principal de l'ecosysteme ;
- `public.html` : copie de compatibilite de l'accueil public ;
- `pilotage-livepalmes.html` : page de pilotage ;
- `live.html`, `speaker.html`, `ja.html`, `video.html`, `bureau-perf.html`, `secretariat.html` : consoles dediees ;
- `resultats.html`, `series-public.html`, `medailles.html` : pages publiques ;
- `pdf.html`, `resultat-pdf.html`, `series-pdf.html` : vues PDF.

### Styles

- `styles.css` : styles communs ;
- `console.css` : styles des consoles internes ;
- `public.css` : styles des pages publiques ;
- `assets/livepalmes-admin-portal.css` : portail ;
- `performances/public/styles.css` : espace performances.

### JavaScript des consoles

- `app.js` : assembleur principal des consoles ;
- `assets/livepalmes-app-*.js` : demarrage, etat, stockage, modules, DOM ;
- `assets/livepalmes-ui-*.js` : boutons et interactions ;
- `assets/livepalmes-series-*.js` : import et gestion des series ;
- `assets/livepalmes-results-*.js` : resultats et publication ;
- `assets/livepalmes-result-*.js` : lecture PDF, publication, maintenance ;
- `assets/livepalmes-final-*.js` : finalistes, forfaits, repechages ;
- `assets/livepalmes-publication.js` : preparation des donnees publiees ;
- `assets/livepalmes-firestore-refs.js` : acces aux chemins Firestore.

Regle importante : `app.js` doit rester un assembleur court. Il ne faut pas y remettre de grosse logique metier.

### JavaScript du portail

- `assets/livepalmes-admin-portal.js` : assembleur principal du portail ;
- `assets/livepalmes-admin-auth.js` : connexion et session ;
- `assets/livepalmes-admin-*.js` : vues et operations administratives ;
- `performances/public/admin*.js` et `performances/public/import-competitions.js` : gestion des donnees sportives integree au portail.

### JavaScript des pages publiques

- `assets/pages/series-public.js` ;
- `assets/pages/resultats.js` ;
- `assets/pages/medailles.js` ;
- `assets/pages/calendrier.js` et `assets/pages/competition.js` ;
- `assets/public/livepalmes-public-calendar.js` : chargement et règles d'affichage du calendrier ;
- `assets/pages/pdf.js` ;
- `assets/pages/resultat-pdf.js` ;
- `assets/pages/series-pdf.js`.

Ces fichiers doivent rester separes du pilotage autant que possible.

Le calendrier public et les fiches événements utilisent les lecteurs NAP. Les anciens fichiers `calendar/` et leurs déclencheurs Firestore ne sont plus la source courante.

### Espace performances

Le dossier `performances/` contient les pages liees aux performances historiques :

- records ;
- MPF ;
- TOP ;
- fiches nageurs ;
- import et gestion.

Les lecteurs publics NAP utilisent des requêtes bornées, sans export intermédiaire, N+1 ni reconstruction silencieuse. Voir [les budgets](OPTIMISATION_NAP.md). Les consultations DTN utilisent les résultats conservés dans NAP et leur fraîcheur ; seul le recalcul explicite parcourt les sources NAP admissibles.

Le portail charge les écrans à la demande. Clubs et nageurs métier viennent de NAP, y compris la recherche de club à la demande d'accès et le changement de club de session. Les comptes, capacités, annuaires privés et destinataires de notification restent techniques dans Firebase. Aucun fichier privé de licences ou de comptes n'est publié sur Hosting.

Les documents de compétition restent hébergés chez Google avec leurs métadonnées dans NAP. Les PDF/exports utilisent les dossiers NAP. Notifications et clôtures suivent le circuit LivePalmes, avec coupure nationale des mails automatiques et absence de rattrapage ; voir [NAP_REFERENCE.md](NAP_REFERENCE.md).

Le cache prive de l'annuaire est maintenu par le declencheur deja attache aux modifications de `users`, avec relance automatique en cas d'echec temporaire. Sa version 3 place dans chaque fragment regional tous les comptes non nationaux de la region : comptes regionaux et administrateurs de club. La region provient du perimetre explicite, puis du club de rattachement si necessaire ; les anciens codes numeriques et les libelles regionaux sont normalises vers le libelle LivePalmes canonique afin de ne jamais scinder une meme region en plusieurs fragments. Une modification de profil lit un document d'etat et ecrit au maximum le cache national, l'ancien cache regional et le nouveau cache regional. Les ecritures etant idempotentes et indexees par utilisateur, une relance ne duplique aucune entree. La reconstruction initiale est volontaire et paginee par 100 profils maximum avec `rebuildAccessDirectorySnapshotNextPage` : le premier appel utilise `restart: true`, les suivants poursuivent jusqu'a `completed: true`. Le document `accessDirectorySnapshotState/default` ne passe a `ready` qu'apres finalisation de tous les fragments. Cette reconstruction ne doit jamais etre lancee pendant une verification locale.

La fonction de secours utilise encore les cles composees `accessDirectoryKeys` une fois l'etat `accessDirectoryIndexState/default` passe a `ready`. La version 2 ajoute la cle regionale aux comptes de club sans les transformer en gestionnaires regionaux. Avant cet etat, elle conserve son parcours borne historique. Pour une mise en service, deployer d'abord les Cloud Functions, reconstruire l'index avec `restart: true`, reconstruire ensuite le cache prive avec `restart: true`, verifier ses droits avec des profils national et regional, puis publier le portail. Aucun fichier contenant des emails ou des habilitations n'est publie sur Firebase Hosting ou dans un bucket public.

## Donnees et Firebase

Firebase est utilise pour :

- Firestore ;
- Firebase Authentication ;
- Cloud Functions ;
- Firebase Hosting.

La configuration principale est dans :

- `firebase.json` ;
- `firestore.rules` ;
- `assets/livepalmes-app-config.js` ;
- `functions/index.js`.

### Données de LivePalmes Direct (uniquement)

Les données des consoles et publications en direct restent rattachées à une compétition Firestore. Les compétitions et engagements du portail sont dans NAP ; ne pas confondre les deux périmètres.

La competition principale actuelle est :

```text
competitions/livepalmes-active
```

On y trouve notamment :

- les donnees live ;
- les resultats publics ;
- les series PDF ;
- les resultats PDF ;
- les archives ;
- les presences ;
- les verrous de roles ;
- les records et MPF.

Les nouveaux PDF publics sont stockes dans le bucket public sous `competition-pdfs/`. Firestore ne conserve que leurs metadonnees, leur URL et leur chemin de stockage. Les anciens documents contenant encore un `pdfDataUrl` restent lisibles pendant la transition ; une publication bascule temporairement sur ce format historique si la fonction de stockage est indisponible.

Les listes publiques de series et de resultats utilisent les documents agreges `public/seriesIndex` et `public/resultsIndex`. Leur publication avertit a partir de 650 ko et est bloquee au-dela de 900 ko, avant la limite Firestore. Un depassement du seuil d'alerte doit conduire a preparer un decoupage par session.

La page des archives lit en priorite `public/archivesIndex`, borne aux 50 archives publiques les plus recentes. La requete historique sur `historyArchives` reste uniquement un secours tant que l'index n'existe pas.

### Records et MPF

La source officielle et l’administration sont les compléments NAP `livepalmes_records_versions` et `livepalmes_records_current`. Pages publiques, fiches nageurs et repères partagés lisent cette source via les fonctions existantes ; aucun chargement statique RF/MPF ni repli sportif Firestore n’est nécessaire en mode NAP.

Les anciennes copies sont conservées temporairement pour retour arrière. La synchronisation historique Firestore ne doit pas être relancée. Voir [le circuit public](pipeline-performances-publiques.md) et [le suivi](releases/EVOLUTIONS.md).

### Performances historiques

Les performances natives sont consultées directement dans NAP. Imports TXT WinPalme et corrections enregistrent dans NAP après aperçu, sauvegarde et confirmation ; aucune reconstruction sportive Firestore n'est requise. Les temps compacts restent interprétés sans normalisation des lignes natives. Voir [gestion-base-performances.md](gestion-base-performances.md).

## Cloud Functions

Les Cloud Functions sont dans :

```text
functions/index.js
```

Elles utilisent Node.js 22.

Elles gerent notamment :

- les PIN des roles ;
- les droits d'acces ;
- la gestion des utilisateurs ;
- les imports de competitions ;
- les imports et corrections de performances ;
- la publication de donnees publiques de performances ;
- certaines operations longues ou sensibles.

Ces fonctions font partie des zones sensibles.

## Pages consoles generees

Les pages consoles dediees sont generees depuis `pilotage-livepalmes.html`.

Commande :

```powershell
node tools/build-console-pages.js
```

Pages concernees :

- `live.html` ;
- `speaker.html` ;
- `ja.html` ;
- `video.html` ;
- `bureau-perf.html` ;
- `secretariat.html`.

Apres une modification du socle console dans `pilotage-livepalmes.html`, il faut regenerer ou verifier ces pages.

La verification globale le controle automatiquement.

## Zones sensibles

Ces zones doivent etre modifiees avec prudence.

Demander validation avant une modification importante sur :

- authentification ;
- codes PIN ;
- droits d'acces ;
- regles Firestore ;
- configuration Firebase ;
- Cloud Functions ;
- structure des donnees Firestore ;
- import PDF des series ;
- lecture PDF des resultats ;
- publication des resultats ;
- finalistes, forfaits, repechages ;
- records et MPF ;
- categories sportives ;
- classements ;
- medailles ;
- performances historiques ;
- fichiers generes dans `performances/public/data/` ;
- cache et rewrites dans `firebase.json`.

## Regles simples pour modifier LivePalmes

1. Identifier si la demande concerne le portail, l'espace public permanent, le Direct ou Firebase.
2. Lire le fichier existant le plus proche du besoin.
3. Modifier le plus petit nombre de fichiers possible.
4. Ne pas creer une nouvelle architecture si un module existe deja.
5. Ne pas ajouter de grosse logique metier dans `app.js`.
6. Ne pas brancher les pages publiques sur des lectures Firestore volumineuses.
7. Verifier avant de publier.

## Verification technique

La commande principale est :

```powershell
node tools/verify-livepalmes.js
```

Elle verifie :

- la syntaxe JavaScript ;
- les tests automatiques ;
- les textes visibles casses ;
- les garde-fous d'architecture ;
- la synchronisation des pages consoles generees ;
- les scripts charges par role ;
- les erreurs d'espaces Git quand Git est disponible.

Pour ajouter un test navigateur :

```powershell
node tools/verify-livepalmes.js --browser
```

## Tests manuels

Les tests automatiques ne suffisent pas pour tout.

Apres une modification sensible, consulter :

```text
docs/TESTS_MANUELS.md
```

Tester manuellement en particulier apres une modification sur :

- PDF ;
- resultats ;
- series ;
- finalistes ;
- medailles ;
- records / MPF ;
- Firebase ;
- droits d'acces ;
- pages publiques.

## Resume ultra court

```text
LivePalmes
  -> Portail : preparation, engagements, comptes, droits et donnees sportives
  -> Public : Records, MPF, TOP, performances et fiches nageurs
  -> Direct national : consoles, series et resultats en direct
```

Les trois composantes partagent une infrastructure technique, mais leurs responsabilites restent separees.
