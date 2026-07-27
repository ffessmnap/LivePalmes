# Droits d'acces LivePalmes

## Objectif

Preparer LivePalmes a devenir un outil utilise par plusieurs publics :

- quelques administrateurs generaux ;
- des responsables records et MPF ;
- des responsables regionaux capables de creer des acces pour les clubs de leur region ;
- des responsables club capables de gerer leur club et, a terme, les engagements ;
- les consoles temporaires d'une competition, deja gerees aujourd'hui par PIN.

Le point important : une personne peut cumuler plusieurs droits. Par exemple, elle peut etre administrateur regional et aussi responsable records/MPF.

Les droits metier sensibles doivent rester independants. Un droit d'administration generale permet de gerer les utilisateurs et les attributions, mais il ne doit pas automatiquement donner acces a tous les modules metier comme les records/MPF, les consoles, l'import de competitions, l'espace DTN ou les futurs engagements.

## Principe a retenir

Il ne faut pas stocker un seul role par utilisateur.

Il faut stocker une liste d'autorisations, chacune avec :

- une capacite : ce que la personne peut faire ;
- un perimetre : ou elle peut le faire ;
- un statut : actif, suspendu, expire ;
- une trace : qui a donne ce droit et quand.

Exemple :

```json
{
  "uid": "firebase-user-id",
  "permissions": [
    { "capability": "records.manage", "scope": { "type": "national" } },
    { "capability": "clubs.manageUsers", "scope": { "type": "region", "id": "bretagne" } },
    { "capability": "engagements.club.manage", "scope": { "type": "club", "id": "12345" } }
  ]
}
```

## Droits proposes

### Administrateur general

Capacites :

- gerer tous les utilisateurs ;
- attribuer ou retirer tous les droits ;
- gerer les regions et les clubs ;
- acceder aux fonctions techniques d'administration ;
- consulter le journal des actions sensibles.

Ce droit ne remplace pas les droits metier specialises. Pour modifier les records/MPF, acceder aux consoles, importer des competitions, consulter l'espace DTN ou gerer les engagements, le compte doit recevoir la capacite metier correspondante.

Perimetre :

- national.

Ce droit doit rester limite a quelques personnes.

### Responsable records et MPF

Capacites :

- importer ou modifier les records ;
- importer ou modifier les MPF ;
- valider les corrections de donnees de performance ;
- consulter l'historique des modifications.

Perimetre :

- national, sauf besoin futur plus fin.

Ce droit est separe de la gestion generale : quelqu'un peut gerer les records sans pouvoir creer des comptes du portail.

### Administrateur regional

Capacites :

- creer ou inviter des utilisateurs pour les clubs de sa region ;
- rattacher un utilisateur a un club de sa region ;
- suspendre ou retirer un acces club dans sa region ;
- consulter les clubs de sa region.

Perimetre :

- une ou plusieurs regions.

Limite importante :

- il ne peut pas donner un droit plus fort que le sien ;
- il ne peut pas agir sur une autre region ;
- il ne peut pas nommer un administrateur general.

### Responsable club

Capacites :

- gerer les informations de son club ;
- voir les utilisateurs rattaches a son club ;
- demander un acces pour une autre personne du club, selon decision future ;
- consulter les nageurs et performances du club ;
- preparer puis envoyer les engagements aux competitions quand ce module existera.

Perimetre :

- un ou plusieurs clubs.

### Administrateur competition

Capacites :

- preparer une competition ;
- importer series et resultats ;
- publier les resultats ;
- gerer les consoles de competition.

Perimetre :

- une competition precise.

Ce droit est different des consoles actuelles speaker, live, JA, video, bureau des performances et secretariat. Les consoles restent des acces temporaires par PIN pour le jour de competition.

## Modele de donnees propose

Collections Firestore possibles :

- `users/{uid}` : profil utilisateur LivePalmes ;
- `accessGrants/{grantId}` : droits accordes a un utilisateur ;
- `regions/{regionId}` : referentiel des regions ;
- `clubs/{clubId}` : referentiel des clubs, avec rattachement region ;
- `auditLogs/{logId}` : journal des actions sensibles ;
- `invitations/{invitationId}` : invitations envoyees par email.

Champs conseilles pour `users/{uid}` :

```json
{
  "uid": "firebase-user-id",
  "email": "personne@example.org",
  "firstName": "Prenom",
  "lastName": "Nom",
  "clubId": "12345",
  "clubName": "Nom du club",
  "licenseNumber": "A-123456",
  "status": "active",
  "createdAt": "2026-06-02T12:00:00.000Z",
  "updatedAt": "2026-06-02T12:00:00.000Z"
}
```

Le mot de passe ne doit jamais etre stocke dans ce profil. Il reste gere par Firebase Authentication.

Exemple `accessGrants` :

```json
{
  "uid": "firebase-user-id",
  "capability": "clubs.manageUsers",
  "scopeType": "region",
  "scopeId": "bretagne",
  "status": "active",
  "createdAt": "2026-06-01T12:00:00.000Z",
  "createdBy": "admin-uid"
}
```

## Capacites de base

Liste de depart :

- `admin.full` : gestion generale ;
- `records.manage` : gestion records et MPF ;
- `consoles.manage` : gestion des acces consoles de competition ;
- `consoles.access` : acces permanent aux consoles ;
- `competitions.import` : import et correction des competitions ;
- `dtn.view` : acces a l'espace DTN ;
- `regions.manageClubUsers` : creation et gestion des acces club d'une region ;
- `engagements.club.manage` : engagements d'un club ;
- `engagements.region.manage` : competitions et acces engagements d'une region ;
- `engagements.national.manage` : module engagements au niveau national.

Cette liste pourra evoluer sans casser les comptes existants.

Les noms `regions.manageClubUsers` et les capacites `engagements.*` restent des capacites cible a valider avant implementation complete.

## Comment ca s'integre a l'existant

Aujourd'hui LivePalmes a deja :

- Firebase Authentication pour l'admin ;
- des PIN serveur pour les consoles de competition ;
- des regles Firestore ;
- des Cloud Functions pour verifier les PIN et attribuer des droits temporaires de console.

La prochaine evolution consiste a remplacer progressivement les administrateurs codes en dur par des droits stockes en base.

Aujourd'hui, certains UID admin sont encore presents dans :

- `assets/livepalmes-app-config.js` ;
- `functions/index.js` ;
- `firestore.rules`.

A terme, ces fichiers ne devraient plus contenir la liste complete des admins. Ils devraient seulement savoir verifier un droit comme `admin.full` ou `records.manage`.

## Securite

Les actions sensibles ne doivent pas etre protegees uniquement par l'affichage de boutons caches.

Il faut verifier les droits cote serveur :

- dans les regles Firestore pour les lectures/ecritures directes ;
- dans les Cloud Functions pour les actions sensibles ;
- dans l'interface seulement pour afficher les bons menus.

Le journal d'audit est indispensable pour les actions comme :

- creation d'un utilisateur ;
- ajout ou retrait d'un droit ;
- modification de records ou MPF ;
- publication ou suppression de donnees ;
- engagements de club.

## Plan progressif

### Etape 1 - Poser le vocabulaire

Valider ensemble les types de droits et les perimetres :

- national ;
- region ;
- club ;
- competition.

Livrable : ce document devient la reference fonctionnelle.

### Etape 2 - Creer le socle utilisateurs

Ajouter les collections `users`, `accessGrants`, `regions`, `clubs` et `auditLogs`.

Ajouter des fonctions de verification :

- `hasCapability(uid, capability, scope)` ;
- `canGrantCapability(actorUid, capability, scope)` ;
- `writeAuditLog(actorUid, action, target)`.

### Etape 3 - Migrer l'admin actuel

Donner au compte admin actuel le droit `admin.full`.

Garder temporairement l'ancien UID code en dur comme filet de securite, puis le retirer quand tout est valide.

### Etape 4 - Ajouter l'ecran de gestion des acces

Creer une interface admin simple :

- rechercher un utilisateur par email ;
- voir ses droits ;
- ajouter un droit ;
- retirer ou suspendre un droit ;
- voir le journal recent.

### Etape 5 - Ajouter les regions et clubs

Importer ou saisir le referentiel clubs/regions.

Permettre a un administrateur regional de creer des acces uniquement pour les clubs de sa region.

### Etape 6 - Brancher records et MPF

Remplacer la verification admin generale actuelle sur `performanceData/records` par une verification plus fine :

- `records.manage`.

Pendant une phase de transition, `admin.full` peut rester accepte comme filet de securite technique. La cible fonctionnelle reste toutefois une capacite metier explicite.

### Etape 7 - Preparer les engagements

Quand le module engagements sera cree, il devra utiliser les droits club :

- un responsable club agit seulement pour son club ;
- un administrateur regional peut accompagner les clubs de sa region ;
- un responsable national engagements peut intervenir partout avec une capacite explicite comme `engagements.national.manage`.

## Decision recommandee

Partir sur un modele par permissions cumulables, pas par role unique.

C'est plus souple, plus durable, et cela correspond mieux au fonctionnement reel de la federation : une meme personne peut avoir plusieurs casquettes.
