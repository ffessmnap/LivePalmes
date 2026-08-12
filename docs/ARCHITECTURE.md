# Architecture LivePalmes

<!-- description: Architecture technique actuelle, responsabilités des pages, stockage des données et vérifications avant publication. -->

Ce document explique l'organisation de LivePalmes avec des mots simples.

Il sert a comprendre :

- ce qui pilote une competition ;
- ce qui est visible par le public ;
- ou sont stockees les donnees ;
- quelles zones sont sensibles ;
- quelles verifications faire avant de publier.

## Idee generale

LivePalmes est une application web statique.

Cela veut dire qu'elle est faite principalement avec :

- des pages HTML ;
- des fichiers CSS pour l'apparence ;
- des fichiers JavaScript pour les actions ;
- Firebase pour partager les donnees en direct.

Il n'y a pas de framework comme React, Vue ou Angular.

Les pages HTML restent a la racine du projet pour garder des adresses simples et stables.

## Deux parties a bien distinguer

LivePalmes a deux grandes familles de pages.

### 1. Les pages de pilotage

Ces pages servent aux personnes qui organisent ou pilotent la competition.

Exemples :

- `pilotage-livepalmes.html` : acces global au pilotage ;
- `live.html` : console Live ;
- `speaker.html` : console Speaker ;
- `ja.html` : console Juge Arbitre ;
- `video.html` : console Juge Video ;
- `bureau-perf.html` : bureau des performances ;
- `secretariat.html` : secretariat.

Ces pages utilisent le moteur interne de LivePalmes :

- `app.js` ;
- les modules `assets/livepalmes-*.js` ;
- Firebase Authentication ;
- Firestore ;
- les Cloud Functions.

Elles peuvent lire et ecrire des donnees, selon les droits de l'utilisateur.

### 2. Les pages publiques

Ces pages sont faites pour les visiteurs, nageurs, clubs, entraineurs et familles.

Exemples :

- `public.html` ou `/` : accueil public ;
- `series-public.html` ou `/series` : series publiees ;
- `resultats.html` ou `/resultats` : resultats publies ;
- `medailles.html` : tableau des medailles ;
- `archives.html` : archives.

Ces pages utilisent surtout :

- `public.css` ;
- les scripts `assets/pages/*.js` ;
- des donnees publiees dans Firebase ou dans des fichiers publics.

Elles ne chargent pas `app.js`.

Elles ne doivent pas permettre de piloter la competition.

## Relation entre pilotage et public

La partie pilotage et les pages publiques sont separees cote interface.

Mais elles partagent certaines donnees, ce qui est normal.

Schema simple :

```text
Consoles de pilotage
  -> publient series, resultats, medailles, archives
  -> Firebase / fichiers publics
  -> pages publiques affichent ces informations
```

Autrement dit :

- le pilotage ecrit les informations ;
- Firebase ou les fichiers publics servent de tableau d'affichage ;
- les pages publiques lisent et affichent.

Une erreur de publication cote pilotage peut donc etre visible cote public.

Mais un visiteur public ne doit pas pouvoir modifier ou piloter la competition.

## Organisation des fichiers

### Pages HTML principales

- `index.html` : accueil historique et acces aux consoles ;
- `public.html` : accueil public ;
- `pilotage-livepalmes.html` : page de pilotage ;
- `live.html`, `speaker.html`, `ja.html`, `video.html`, `bureau-perf.html`, `secretariat.html` : consoles dediees ;
- `resultats.html`, `series-public.html`, `medailles.html`, `archives.html` : pages publiques ;
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
- `assets/livepalmes-admin-*.js` : portail ;
- `assets/livepalmes-publication.js` : preparation des donnees publiees ;
- `assets/livepalmes-firestore-refs.js` : acces aux chemins Firestore.

Regle importante : `app.js` doit rester un assembleur court. Il ne faut pas y remettre de grosse logique metier.

### JavaScript des pages publiques

- `assets/pages/public-home.js` ;
- `assets/pages/series-public.js` ;
- `assets/pages/resultats.js` ;
- `assets/pages/medailles.js` ;
- `assets/pages/archives.js` ;
- `assets/pages/pdf.js` ;
- `assets/pages/resultat-pdf.js` ;
- `assets/pages/series-pdf.js`.

Ces fichiers doivent rester separes du pilotage autant que possible.

### Espace performances

Le dossier `performances/` contient les pages liees aux performances historiques :

- records ;
- MPF ;
- TOP ;
- fiches nageurs ;
- import et gestion.

Les visiteurs ne doivent pas lire directement une enorme base Firestore pour ces pages.

Les pages publiques utilisent des fichiers optimises dans :

```text
performances/public/data/
```

Le portail ne charge pas le referentiel complet des nageurs a son ouverture. La liste des clubs provient de `performances/public/data/club-reference.js`, generee par `tools/build-admin-club-reference.js`. Le meme generateur produit `functions/assets/club-reference.json` afin que les fonctions serveur utilisent le code club dans les statistiques et documents destines aux humains, tout en conservant l'identifiant numerique comme cle technique. Le fichier de travail `admin-reference.js`, qui contient des donnees nageurs, est exclu de Firebase Hosting. Dans l'administration Records / MPF, les suggestions de nageurs sont chargees a la demande depuis les shards statiques `performance-public/search/`.

Les ecrans couteux du portail sont charges uniquement lorsqu'ils deviennent actifs. L'annuaire des acces est pagine et borne cote Cloud Functions ; les recherches regionales s'appuient sur les index declares dans `firestore.indexes.json`. L'ouverture de l'espace DTN lit seulement son cache : un cache absent ou perime demande une action explicite « Recalculer ». Ce recalcul utilise les fichiers TOP de Storage, et non un parcours de la collection Firestore `performances`.

Les destinataires des courriels d'engagements sont conserves dans 32 fragments par capacite. Ils sont mis a jour a chaque modification d'un utilisateur. L'initialisation automatique est plafonnee a 505 lectures reparties entre les trois capacites et son etat ; au-dela, une reconstruction nationale paginee de 250 utilisateurs maximum par appel est obligatoire.

Les parcours interactifs des engagements n'effectuent aucune reconstruction massive automatique. Le calendrier et les effectifs clubs lisent leurs documents agreges, maintenus par les declencheurs Firestore. Le calcul d'un temps lit le cache du nageur puis, si necessaire, son unique fichier public `performance-public-firestore/swimmers/`. Un agregat ou fichier absent produit un etat d'indisponibilite explicite ; les reconstructions nationales volontaires sont paginees et plafonnees sous mille lectures par appel.

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

### Donnees de competition

Les donnees actives sont rattachees a une competition Firestore.

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

La source d'administration des Records / MPF est :

```text
competitions/livepalmes-active/performanceData/records
```

Les pages publiques lisent uniquement le fichier statique genere :

```text
performances/public/data/records-data.js
```

En fonctionnement normal, chaque modification de `performanceData/records` declenche aussi `syncPublicRecordsData`. La fonction publie une version JSON immuable dans `performance-public-firestore/records/versions/`, puis remplace atomiquement le petit manifeste `performance-public-firestore/records/manifest.json`. Les pages Records, MPF et fiches nageurs lisent ce manifeste sans interroger Firestore ; le fichier Hosting ci-dessus reste leur secours local.

Avant chaque déploiement Firebase Hosting, le hook `hosting.predeploy` synchronise aussi le fichier de secours depuis Firestore. La commande reste disponible pour lancer la synchronisation manuellement :

```powershell
node tools/sync-records-from-firestore.js --write
```

Le meme hook regenere le petit referentiel clubs. Les mises a jour RF / MPF restent independantes de ce fichier : elles continuent a invalider puis republier automatiquement le manifeste Records public.

### Performances historiques

Les performances historiques peuvent representer plusieurs centaines de milliers de lignes.

Il ne faut donc pas brancher une page publique directement sur une grosse requete Firestore.

Le principe a respecter est :

```text
Portail / import / correction
  -> base interne ou donnees de travail
  -> generation de fichiers publics optimises
  -> lecture rapide par les visiteurs
```

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

Les pages consoles dediees sont generees depuis `index.html`.

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

Apres une modification du socle console dans `index.html`, il faut regenerer ou verifier ces pages.

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

1. Identifier si la demande concerne le pilotage, le public, les performances ou Firebase.
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
Pilotage competition
  -> ecrit et publie
  -> Firebase / fichiers publics
  -> pages publiques lisent et affichent
```

Le pilotage et le public sont separes cote interface.

Ils sont relies par les donnees publiees.

Les pages publiques ne doivent jamais devenir des pages de pilotage.
