# Integration du module engagements dans le portail

<!-- description: Proposition d'intégration technique et fonctionnelle du module engagements dans le portail existant. -->

## Objectif

Ce document complete le cahier des charges fonctionnel :

```text
docs/module-engagements.md
```

Il precise comment integrer le module engagements dans le portail LivePalmes actuel, sans creer une deuxieme application.

L'objectif est de faire evoluer le portail existant :

```text
portail.html
```

pour accueillir les profils club, region et national.

## Constat sur l'existant

Le portail LivePalmes existe deja.

Il utilise :

- `portail.html` comme page principale ;
- `assets/livepalmes-admin-portal.js` comme assembleur du portail ;
- `assets/livepalmes-admin-portal.css` pour les styles ;
- `assets/livepalmes-admin-auth.js` pour l'authentification ;
- Firebase Authentication ;
- des Cloud Functions pour lire et modifier les acces ;
- des capacites LivePalmes pour afficher les bons menus.

Les modules administratifs existants sont deja integres dans le portail :

- `portail.html#records-mpf` ;
- `portail.html#import-competitions` ;
- `portail.html#correction-performance` ;
- `portail.html#gestion-acces`.

Le futur module engagements doit suivre le meme principe.

## Decision d'architecture

Le module engagements doit etre integre dans le portail existant.

Il ne faut pas creer :

- un nouveau portail separe ;
- une application React/Vue/Vite ;
- un nouveau systeme d'authentification ;
- une nouvelle architecture de droits parallele.

Il faut creer des vues et modules dedies, charges depuis `portail.html`.

## Navigation cible

Le portail pourrait contenir un groupe de navigation :

```text
Engagements
```

Liens possibles :

- `#engagements-calendrier` : calendrier et engagements club ;
- `#engagements-club` : espace club ;
- `#engagements-competitions` : gestion des competitions ;
- `#engagements-demandes-acces` : demandes d'acces ;
- `#engagements-alertes` : alertes nationales.

L'affichage depend des droits.

Dans la vue engagements du portail, les grands sujets doivent etre separes par sous-onglets lorsque cela rend le parcours plus clair. La creation d'une competition doit notamment rester dans un onglet distinct du calendrier.

## Capacites cible

Les capacites actuelles sont :

- `admin.full` ;
- `records.manage` ;
- `consoles.manage` ;
- `consoles.access` ;
- `competitions.import` ;
- `dtn.view`.

Le droit `dtn.view` donne acces a l'espace DTN. Il est independant du module engagements et ne donne aucun droit sur les engagements.

Ces capacites ne suffisent pas pour le module engagements.

Decision cible : les modules metier sensibles doivent rester controles par des droits explicites.

`admin.full` permet de gerer le portail, les utilisateurs et l'attribution des droits. Il ne doit pas etre utilise comme raccourci fonctionnel donnant automatiquement acces a tous les modules sensibles.

Cela concerne notamment :

- `records.manage` pour les records et MPF ;
- `consoles.manage` ou `consoles.access` pour les consoles ;
- `competitions.import` pour les imports et corrections de competitions ;
- `dtn.view` pour l'espace DTN ;
- les futures capacites `engagements.*`.

Cette regle evite qu'un compte charge de l'administration des acces puisse modifier des donnees sportives ou acceder aux outils de competition sans droit metier explicite.

Capacites proposees :

- `engagements.club.manage` : gerer les engagements de son club ;
- `engagements.region.manage` : gerer les competitions et acces d'une region ;
- `engagements.national.manage` : gerer le module engagements au niveau national ;
- `engagements.access.manage` : traiter les demandes d'acces selon son perimetre ;
- `engagements.documents.manage` : generer ou consulter les documents selon son perimetre.

Pour simplifier la V1, on peut commencer avec :

- `engagements.club.manage` ;
- `engagements.region.manage` ;
- `engagements.national.manage`.

Les droits engagements sont des capacites dediees. L'acces metier au module engagements doit etre decide explicitement lors de la validation des capacites.

Un utilisateur peut cumuler `dtn.view` et un droit engagements, mais ce sont deux casquettes separees.

Point d'attention technique : le code actuel conserve encore des comportements de transition ou `admin.full` peut servir de fallback sur certains modules existants. Pour les nouveaux modules sensibles, et en particulier les engagements, il faudra appliquer la regle explicite des le depart.

## Perimetres des droits

Le cahier des charges V1 fixe des limites simples :

- un utilisateur club est rattache a un seul club ;
- un responsable regional gere une seule region ;
- le niveau national voit tout.

Cette decision est plus stricte que le document general `docs/droits-acces-livepalmes.md`, qui prevoit une architecture plus souple avec plusieurs perimetres.

Il faut conserver l'architecture souple en base, mais appliquer les limites V1 dans l'interface et les fonctions.

Exemple :

```json
{
  "uid": "firebase-user-id",
  "capability": "engagements.club.manage",
  "scopeType": "club",
  "scopeId": "12345",
  "status": "active"
}
```

Exemple region :

```json
{
  "uid": "firebase-user-id",
  "capability": "engagements.region.manage",
  "scopeType": "region",
  "scopeId": "6",
  "status": "active"
}
```

Exemple national :

```json
{
  "uid": "firebase-user-id",
  "capability": "engagements.national.manage",
  "scopeType": "national",
  "scopeId": "",
  "status": "active"
}
```

## Ecarts avec l'existant

### Acces actuels trop generaux

Aujourd'hui, le formulaire de gestion des acces du portail gere surtout des droits globaux.

Il manque :

- numero de club structure ;
- region structuree ;
- perimetre du droit ;
- demandes d'acces ;
- validation regionale ;
- distinction club / region / national pour les engagements.

### Grants actuels trop peu scopes

Les grants actuels sont ecrits avec un perimetre national par defaut.

Pour les engagements, ce n'est pas suffisant.

Il faudra stocker correctement :

- `scopeType` ;
- `scopeId` ;
- `clubId` si utile ;
- `regionId` si utile ;
- `status` ;
- trace de creation et mise a jour.

### Portail encore oriente gestion

Le portail actuel parle surtout a des administrateurs.

Le module engagements introduit un vrai espace club.

Il faudra donc adapter le vocabulaire et les vues pour que le portail soit utilisable par :

- un entraineur ;
- un responsable club ;
- un responsable regional ;
- un administrateur national.

## Donnees existantes reutilisables

### Nageurs, clubs, courses et categories

LivePalmes possede deja des donnees utiles dans l'espace performances.

Sources utiles :

- `performances/public/data/admin-reference.js` ;
- `performances/public/data/performance-public/` ;
- `performances/public/data/performance-public-firestore/`.

Ces donnees contiennent notamment :

- nageurs ;
- clubs ;
- courses ;
- categories ;
- fiches nageurs ;
- performances par nageur.

Le module engagements doit reutiliser ces donnees pour rechercher les nageurs et proposer les temps d'engagement.

Important : une page club ne doit pas declencher de lectures Firestore massives.

Pour la recherche nageur et les temps d'engagement, il faudra preferer :

- fichiers publics optimises ;
- index existants ;
- fonctions serveur ciblees ;
- requetes Firestore indexables.

### Records et MPF

Les records et MPF officiels sont deja stockes dans :

```text
competitions/livepalmes-active/performanceData/records
```

Le fallback statique est :

```text
performances/public/data/records-data.js
```

Le module engagements doit reutiliser ces sources pour les controles de temps.

Il ne doit pas inventer de regle sportive.

## Structure de fichiers proposee

### HTML

Ne pas creer une nouvelle page racine pour la V1.

Ajouter les vues dans :

```text
portail.html
```

Exemples :

- `data-admin-view="entries-calendar"` ;
- `data-admin-view="entries-club"` ;
- `data-admin-view="entries-competitions"` ;
- `data-admin-view="entries-access-requests"` ;
- `data-admin-view="entries-alerts"`.

### JavaScript

Creer des modules dedies dans `assets/`.

Proposition :

- `assets/livepalmes-entries-portal.js` : assembleur du module engagements ;
- `assets/livepalmes-entries-api.js` : appels Cloud Functions ;
- `assets/livepalmes-entries-calendar.js` : calendrier competitions ;
- `assets/livepalmes-entries-club.js` : parcours club ;
- `assets/livepalmes-entries-admin.js` : creation et suivi competitions ;
- `assets/livepalmes-entries-access.js` : demandes d'acces ;
- `assets/livepalmes-entries-swimmers.js` : recherche nageurs, licence, doublons ;
- `assets/livepalmes-entries-times.js` : formats et controles des temps ;
- `assets/livepalmes-entries-relays.js` : logique relais ;
- `assets/livepalmes-entries-documents.js` : GED, PDF, TXT.

Ces noms peuvent etre ajustes, mais il faut eviter de grossir `assets/livepalmes-admin-portal.js`.

`assets/livepalmes-admin-portal.js` doit seulement :

- detecter la vue active ;
- verifier les capacites ;
- charger le module engagements a la demande.

### CSS

Ajouter un fichier dedie :

```text
assets/livepalmes-entries.css
```

Il doit reutiliser le style du portail et rester sobre.

## Collections Firestore cible

Le modele exact devra etre valide avant implementation.

Proposition de depart :

```text
engagementCompetitions/{competitionId}
```

Competition d'engagements. La premiere implementation lit cette collection en calendrier borne par date.

Lecture V1 :

- calendrier via la Cloud Function `listEngagementCompetitions` ;
- fiche competition via la Cloud Function `getEngagementCompetition` ;
- aucun scan public direct de la collection depuis le navigateur.

Creation V1 :

- uniquement via la Cloud Function `createEngagementCompetition` ;
- `engagements.region.manage` peut creer une competition `departemental` ou `regional` dans sa region ;
- `engagements.national.manage` peut creer une competition `departemental`, `regional` ou `national` ;
- aucune ecriture directe Firestore depuis le portail pour cette creation.

Edition V1 :

- uniquement via la Cloud Function `updateEngagementCompetition` ;
- porte d'abord sur les parametres generaux visibles dans la fiche ;
- reprend les memes controles de perimetre que la creation ;
- les courses, restrictions, frais et documents seront ajoutes ensuite dans des onglets separes.

Champs minimaux du calendrier :

- `name` ;
- `date` au format `YYYY-MM-DD` ;
- `location` ;
- `regionId` ;
- `level` : `departemental`, `regional` ou `national` ;
- `entryStatus` : `upcoming`, `open` ou `closed` ;
- `entryDeadlineAt` au format ISO si connu ;
- `officialsRequired`.

```text
engagementCompetitions/{competitionId}/clubEntries/{clubId}
```

Etat d'engagement d'un club sur une competition.

```text
engagementCompetitions/{competitionId}/clubEntries/{clubId}/swimmers/{entrySwimmerId}
```

Nageurs ajoutes par le club a la competition.

```text
engagementCompetitions/{competitionId}/clubEntries/{clubId}/individualEntries/{entryId}
```

Courses individuelles.

```text
engagementCompetitions/{competitionId}/clubEntries/{clubId}/relays/{relayId}
```

Relais.

```text
engagementCompetitions/{competitionId}/clubEntries/{clubId}/officials/{officialId}
```

Officiels declares.

```text
engagementCompetitions/{competitionId}/clubEntries/{clubId}/documents/{documentId}
```

Dernier PDF club.

```text
engagementCompetitions/{competitionId}/documents/{documentId}
```

Documents admin, dont export TXT global.

```text
engagementAccessRequests/{requestId}
```

Demandes d'acces club.

```text
engagementSwimmerAlerts/{alertId}
```

Alertes sensibles : doublons valides, changement de club confirme, derogation.

```text
clubPeople/{clubId}/officials/{officialId}
clubPeople/{clubId}/teamLeaders/{teamLeaderId}
```

Base reutilisable officiels et chefs d'equipe par club.

## Stockage des documents

Les PDF et TXT ne doivent pas etre stockes en gros champs Firestore.

Option recommandee :

- fichiers dans Firebase Storage ;
- metadonnees dans Firestore ;
- URL ou chemin Storage dans les documents de GED.

Exemples de chemins :

```text
entry-documents/{competitionId}/export.txt
entry-documents/{competitionId}/clubs/{clubId}/recap.pdf
```

La GED V1 conserve seulement la derniere version.

## Regles de securite

Les regles devront respecter :

- un club lit et ecrit uniquement ses engagements ;
- un club ne voit pas les engagements des autres clubs ;
- un niveau 2 agit uniquement sur sa region ;
- un niveau 3 agit partout ;
- les actions sensibles passent par Cloud Functions quand un controle metier est necessaire.

Les controles importants ne doivent pas exister seulement dans l'interface.

Exemples de controles cote serveur :

- creation competition selon droit et region ;
- validation d'une demande d'acces ;
- reouverture des engagements ;
- generation TXT ;
- generation PDF ;
- derogation nationale ;
- action niveau 3 comme un club ;
- modification apres fermeture.

## Integration avec les donnees performances

Le module engagements aura besoin de :

- rechercher un nageur ;
- lire ses performances ;
- determiner son dernier club connu ;
- verifier s'il a deja nage dans la saison ;
- proposer les meilleurs temps d'engagement ;
- controler records et MPF.

Il ne faut pas brancher l'espace club sur des scans Firestore.

Approche recommandee :

1. utiliser l'index public nageurs pour la recherche ;
2. charger la fiche/performance du nageur selectionne ;
3. filtrer localement les performances du nageur pour la course et la periode ;
4. utiliser une Cloud Function si une verification doit etre officielle ou auditee ;
5. stocker dans l'engagement le temps retenu avec sa source.

Pour les nouveaux nageurs, il faudra creer une source complementaire d'engagements sans modifier brutalement la base historique.

Une publication ou synchronisation vers la base performances pourra etre decidee ensuite.

## Integration avec les records et MPF

Le controle des temps doit reutiliser la logique et les donnees existantes.

Points a respecter :

- records de France : bassin 50 m electronique ;
- MPF : tous les bassins en manuel, et bassins 25 m / 33 m en electronique ;
- pas de regle inventee ;
- blocage uniquement si la reference applicable existe et est fiable ;
- trace des saisies manuelles.

Une extraction utilitaire commune pourra etre creee plus tard pour eviter de dupliquer la logique actuelle dans `functions/index.js`.

## Lots de developpement recommandes

### Lot 0 - Alignement technique

Objectif : preparer le portail et les droits.

Actions :

- valider les nouvelles capacites ;
- adapter le modele `users` / `accessGrants` aux perimetres ;
- documenter les collections ;
- ne pas encore ouvrir les engagements.

### Lot 1 - Portail club minimal

Objectif : permettre a un club connecte de voir son espace.

Actions :

- ajouter la navigation engagements ;
- afficher le calendrier vide ou mocke depuis Firestore ;
- afficher les informations du club ;
- afficher les utilisateurs rattaches au club ;
- verifier que le portail reste utilisable par un profil non admin general.

### Lot 2 - Competitions d'engagements

Objectif : permettre a un niveau 2/3 de creer une competition.

Actions :

- formulaire de creation ;
- niveau departemental/regional/national ;
- region automatique pour niveau 2 ;
- courses et restrictions par course ;
- date limite ;
- frais informatifs ;
- officiel requis oui/non ;
- ouverture/fermeture.

La fiche competition du calendrier est structuree en sous-onglets :

- `General` : informations principales et modification des champs deja disponibles ;
- `Courses` : selection des courses individuelles et relais depuis une liste predefinie LivePalmes ;
- `Frais` : droits forfaitaires informatifs, frais par course, frais relais et lien HelloAsso ;
- `Documents` : GED de competition preparee, recap PDF clubs et export TXT a generer dans un lot ulterieur.

Les courses et relais d'une competition sont stockes dans le champ `events` du document `engagementCompetitions`. Ce champ est valide cote Cloud Function contre une nomenclature fermee LivePalmes.

Chaque entree `events[]` peut porter `categoryRestrictions`. Regle V1 :

- tableau vide ou absent : toutes categories autorisees ;
- tableau renseigne : seules les categories listees sont autorisees ;
- les categories individuelles sont validees cote serveur contre les codes LivePalmes `P`, `B`, `M`, `C`, `J`, `S`, `M30+`, `M40+`, `M50+`, `M60+`, `M70+`, `M80+` ;
- les categories relais sont validees cote serveur contre les codes LivePalmes `P`, `B`, `M`, `C`, `J`, `S`, `R140`, `R180`, `R220`, `R260` ;
- le `50 AP` interdit reglementairement `P`, `B` et `M` ;
- le relais `4 x 200 BI` n'est pas propose en engagements ;
- le relais `4 x 50 BI` n'est pas propose en engagements ;
- le relais `4 x 100 SB` remplace le `4 x 200 BI` et est obligatoirement mixte ;
- le relais `4 x 100 BI` est obligatoirement mixte ;
- le relais `4 x 50 SF` peut etre mixte uniquement en categories Master ; ce choix est fait par l'admin lors du parametrage de la competition, pas par le club.

Regles de region pour la creation et la modification :

- un niveau 2 regional utilise automatiquement la region de son acces, champ verrouille ;
- un niveau 3 national renseigne la region pour une competition departementale ou regionale ;
- une competition nationale n'a pas de region obligatoire et le champ est vide ;
- cote serveur, une competition nationale est toujours enregistree avec `regionId` vide.

Parametres sportifs V1 stockes dans `engagementCompetitions` :

- `poolLength` : `25`, `33` ou `50` ;
- `timingType` : `manual` ou `electronic` ;
- `qualificationTimesMode` : `all` ou `period` ;
- `qualificationStartDate` et `qualificationEndDate` obligatoires si le mode est `period` ;
- `maxEventsPerSwimmer` : entier de 0 a 20, `0` signifiant non limite.

Frais informatifs V1 stockes dans `engagementCompetitions.fees` :

- `swimmerFee` : forfait par nageur ;
- `individualEventFee` : frais par course individuelle ;
- `relayFee` : frais par relais ;
- `helloAssoUrl` : lien de paiement optionnel ;
- `latePaymentSurcharge` : fixe a `50`.

Si `helloAssoUrl` est vide, le portail indique que le lien est en attente de publication. Les factures restent gerees par HelloAsso.

GED competition V1 :

- `computerEmail` est stocke sur la competition pour le futur envoi TXT ;
- l'onglet Documents affiche les elements attendus : export TXT, recap PDF clubs, emails clubs, email informatique ;
- les niveaux 2 et 3 peuvent lister les clubs engages et telecharger le PDF recapitulatif de chaque club a la demande ;
- les statuts documentaires sont prepares avec `pending`, `generated`, `sent` ;
- le stockage GED durable et l'export TXT seront ajoutes dans le lot documents/export suivant.

## Verification locale des Functions

Par defaut, le portail local appelle les Cloud Functions deployees.

Pour tester les Functions locales sans publication, lancer l'emulateur :

```powershell
firebase.cmd emulators:start --only functions,firestore --project livepalmes
```

Puis ouvrir le portail avec le parametre local :

```text
portail.html?emulator=1#engagements
```

Le parametre `emulator=1` bascule uniquement les appels Cloud Functions vers `127.0.0.1:5001`. L'authentification Firebase reste celle du projet LivePalmes. Si Firestore est aussi emule, il faut que l'utilisateur connecte existe dans l'emulateur avec les droits engagements necessaires, sauf pour l'UID super admin historique.

### Lot 3 - Demandes d'acces

Objectif : gerer les demandes d'acces club.

Actions :

- formulaire de demande ;
- demande faite pour soi ;
- demande faite par un club pour un tiers ;
- validation niveau 2 selon region ;
- validation niveau 3 globale ;
- desactivation d'acces ;
- audit.

### Lot 4 - Engagements club individuels

Objectif : engager des nageurs sur des courses individuelles.

Actions :

- chef d'equipe obligatoire ou renonciation ;
- recherche nageur ;
- licence obligatoire ;
- ajout d'un nouveau nageur ;
- alertes changement de club ;
- alertes doublons ;
- choix des courses ;
- temps d'engagement connu ou manuel ;
- max d'epreuves par nageur.

La selection d'un nageur est persistee immediatement par une fonction unitaire : le retrait lit uniquement la competition et l'inscription du club ; l'ajout ajoute au plus la fiche nageur et sa licence aux lectures fixes. Le choix d'une course appelle `saveEngagementClubIndividualEntries` pour le seul nageur modifie. Les ecritures du navigateur sont mises en file afin que des clics rapides ne puissent pas s'ecraser mutuellement. Aucune de ces actions ne relit l'effectif complet du club.

### Lot 5 - Officiels et relais

Objectif : completer le parcours club.

Actions :

- base officiels ;
- base chefs d'equipe ;
- relais avec categorie ;
- relayeurs facultatifs ;
- controle de coherence si relayeurs indiques ;
- controle relais de meme distance/nature.

### Lot 6 - GED, PDF et TXT

Objectif : produire les documents.

Actions :

- generation PDF club a la demande ;
- generation PDF club a la fermeture ;
- export TXT global ;
- stockage Storage ;
- GED competition ;
- telechargement admin et club.

### Lot 7 - Mails automatiques

Objectif : envoyer les notifications.

Actions :

- notification ouverture engagements ;
- envoi TXT au responsable informatique ;
- envoi PDF a tous les admins du club ;
- journalisation ;
- relance apres reouverture.

Ce lot depend de la configuration mail.

## Points a valider avant code sensible

Avant de modifier `functions/index.js`, `firestore.rules` ou la configuration Firebase, valider :

- noms definitifs des capacites ;
- structure des grants ;
- structure des competitions d'engagements ;
- structure des engagements club ;
- droits exacts des niveaux 2 et 3 ;
- strategie PDF/TXT ;
- strategie mail ;
- strategie de synchronisation des nouveaux nageurs.

## Verification

Apres chaque lot technique :

```powershell
node tools/verify-livepalmes.js
```

Apres modification de l'interface du portail :

```powershell
node tools/verify-livepalmes.js --browser
```

Si les pages consoles ne sont pas touchees, ne pas regenerer les pages dediees inutilement.

## Conclusion

Le cahier des charges est coherent avec LivePalmes, a condition de l'integrer comme une extension du portail existant.

La priorite technique est de faire evoluer proprement les droits et perimetres avant de coder les ecrans d'engagement.
