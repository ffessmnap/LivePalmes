# Authentification admin et codes PIN

## Objectif

## Acces actuel aux consoles

Les consoles de competition utilisent deux niveaux d'acces :

1. un compte LivePalmes actif avec email et mot de passe ;
2. le PIN temporaire du role utilise pendant la competition.

Le compte doit disposer de `consoles.access`, `consoles.manage` ou `admin.full`.
La validation du PIN ajoute ensuite un claim `livepalmesConsoleAccess`, le role et la competition, sans supprimer les claims permanents du compte. Les regles Firestore exigent ce claim et un grant console non expire.

Une session Firebase anonyme ne peut pas verifier un PIN. Les comptes console doivent etre crees ou approuves depuis l'administration LivePalmes. Un compte distinct par personne ou tablette reste recommande afin de conserver le cloisonnement des roles et la possibilite de revoquer un seul appareil.

Faire évoluer LivePalmes pour que le code admin ne soit plus présent ni vérifiable directement dans le front.

L'idée retenue :

- l'administrateur se connecte avec un email et un mot de passe via Firebase Authentication ;
- les autres rôles utilisent un compte LivePalmes puis leur code PIN ;
- l'administrateur authentifié est le seul à pouvoir modifier les PIN et lancer les actions sensibles.

## Architecture cible

### Administrateur

L'admin utilise Firebase Authentication avec email + mot de passe.

Une fois connecté, il peut accéder aux fonctions sensibles :

- modification des codes PIN ;
- activation ou désactivation des codes ;
- RAZ ;
- fonctions de pilotage globales.

Les règles Firestore doivent vérifier `request.auth` pour autoriser ces actions uniquement à l'admin.

### Rôles terrain

Les autres consoles utilisent une connexion en deux etapes :

- speaker ;
- live ;
- JA ;
- vidéo ;
- bureau des performances ;
- secrétariat.

Chaque utilisateur se connecte d'abord avec son compte LivePalmes, puis saisit le code PIN du rôle.

Les PIN ne doivent plus être codés en dur dans le JavaScript public.

## Point de sécurité important

Si les PIN sont stockés dans Firestore et lus directement par le front, ils ne sont pas totalement secrets.

Même s'ils ne sont pas affichés à l'écran, une personne curieuse pourrait inspecter les données chargées par le navigateur.

La meilleure solution est donc :

1. Le front envoie le rôle et le PIN saisi à une Cloud Function.
2. La Cloud Function vérifie le PIN côté serveur.
3. Le front reçoit seulement une réponse du type `ok` ou `refusé`.
4. Les PIN réels ne sont jamais envoyés au navigateur.

## Stockage conseillé des PIN

Les PIN doivent idéalement être stockés sous forme hachée, pas en clair.

Exemple de logique :

- Firestore stocke un hash du PIN par rôle ;
- la Cloud Function reçoit le PIN saisi ;
- elle calcule le hash ;
- elle compare avec le hash stocké ;
- elle renvoie une autorisation temporaire si le PIN est correct.

## Étapes possibles

### Étape 1 : Firebase Authentication admin

- Activer Firebase Authentication email + mot de passe.
- Créer le compte admin.
- Ajouter la connexion admin dans LivePalmes.
- Identifier l'admin par son UID Firebase.
- Adapter les règles Firestore pour protéger les actions sensibles.

### Étape 2 : PIN stockés en base

- Déplacer les PIN des consoles vers Firestore.
- Ajouter une interface admin pour modifier les PIN.
- Autoriser seulement l'admin authentifié à écrire ces PIN.

### Étape 3 : vérification PIN côté serveur

- Créer une Cloud Function `verifyPin(role, pin)`.
- Ne plus laisser le front lire directement les PIN.
- Faire répondre la fonction avec une autorisation temporaire.

### Étape 4 : règles Firestore renforcées

- Distinguer les droits admin et les droits consoles.
- Vérifier `request.auth` pour les actions admin.
- Limiter les écritures sensibles aux seuls utilisateurs autorisés.

## Recommandation

Ne pas faire cette migration juste avant ou pendant une compétition.

C'est une évolution structurelle qui touche :

- l'accès admin ;
- les règles Firestore ;
- la gestion des PIN ;
- les permissions d'écriture ;
- potentiellement les Cloud Functions.

Le bon plan serait de la réaliser hors urgence, sur une période de test, avec possibilité de revenir à l'ancien système si besoin.

## Décision proposée pour LivePalmes

À terme :

- admin : email + mot de passe Firebase Authentication ;
- consoles terrain : compte LivePalmes actif puis PIN du role ;
- PIN : stockés en base et modifiables uniquement par l'admin ;
- vérification PIN : idéalement via Cloud Function ;
- pages publiques : aucun changement, elles restent accessibles sans connexion.
