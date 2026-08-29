# Règles Firebase de LivePalmes

<!-- description: Périmètre actuel des données Firestore et règles de sécurité Firebase utilisées par LivePalmes. -->

## À quoi servent ces règles ?

Firestore est la base de données en ligne utilisée par LivePalmes. Le fichier `firestore.rules` joue le rôle de portier : il décide quelles données le navigateur peut lire ou modifier directement.

Le principe actuel est simple :

- **LivePalmes Direct** utilise quelques zones Firestore autorisées pour faire fonctionner les consoles pendant une compétition nationale ;
- **le portail LivePalmes** passe principalement par des fonctions sécurisées côté serveur ;
- tout ce qui n'est pas explicitement autorisé est refusé.

Ces règles ne décrivent donc pas toutes les données du portail. Elles encadrent surtout les accès directs depuis un navigateur.

## Deux compétitions techniques

Les données de LivePalmes Direct sont rangées sous :

- `competitions/livepalmes-active` pour l'environnement actif ;
- `competitions/livepalmes-test` pour les essais prévus à cet effet.

Ces identifiants techniques ne correspondent pas au calendrier des compétitions préparées dans le portail.

## Accès aux consoles LivePalmes Direct

Pour agir depuis une console, deux contrôles se complètent :

1. l'utilisateur se connecte avec un compte Firebase autorisé ;
2. il saisit le PIN correspondant à son rôle sur la compétition.

Après validation du PIN, le serveur délivre une autorisation temporaire. Les règles vérifient à la fois le compte, le rôle et cette autorisation avant d'accepter une modification. L'autorisation d'une console expire actuellement après 12 heures.

Les principales zones concernées sont les données du direct, les alertes, les résumés, les PDF, les résultats, les archives, les présences et les verrous de rôle. Les droits précis diffèrent selon la console : une console ne peut pas modifier librement les données des autres rôles.

## Accès publics

Le calendrier public n'ouvre aucune collection Firestore. Les pages lisent les instantanés JSON générés dans le bucket public sous `calendar/`; les écritures et la publication restent réservées aux Cloud Functions authentifiées du portail.

Certaines données destinées à l'affichage public peuvent être lues sans compte, notamment une partie des informations de direct, des résultats publiés et des données de performances prévues à cet effet.

Une lecture publique ne donne jamais automatiquement le droit de modifier ces données.

## Données du portail

Les comptes, droits, engagements, clubs, nageurs, officiels, imports et corrections de performances ne sont pas ouverts directement au navigateur.

Le portail appelle des Cloud Functions Firebase. Ces fonctions agissent côté serveur, contrôlent l'identité, les capacités et le périmètre de l'utilisateur, puis réalisent uniquement l'opération autorisée. Le refus général placé à la fin des règles bloque tout autre accès direct.

## Sources de référence

- `firestore.rules` : règles réellement appliquées aux accès directs ;
- `firestore.indexes.json` : index nécessaires aux recherches Firestore ;
- `functions/index.js` : contrôles et opérations exécutés côté serveur ;
- `docs/droits-acces-livepalmes.md` : modèle des comptes, capacités et périmètres ;
- `docs/authentification-admin-et-pins.md` : connexion au portail et accès aux consoles.

## Vérification et publication

Les règles peuvent être testées localement avec l'émulateur Firestore :

```powershell
npm --prefix tests/firestore-rules test
```

Ce test utilise le projet fictif `demo-livepalmes` et ne doit pas écrire dans la base de production.

Toute modification ou publication des règles, index ou fonctions Firebase est une opération sensible. Elle doit être validée explicitement et suivre `docs/agents/PUBLICATION.md`. Le fichier local versionné est la référence ; il ne faut pas maintenir une deuxième version copiée manuellement dans la console Firebase.
