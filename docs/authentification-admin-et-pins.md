# Authentification admin et codes PIN

## Objectif

Faire évoluer LivePalmes pour que le code admin ne soit plus présent ni vérifiable directement dans le front.

L'idée retenue :

- l'administrateur se connecte avec un email et un mot de passe via Firebase Authentication ;
- les autres rôles gardent une connexion simple par code PIN ;
- l'administrateur authentifié est le seul à pouvoir modifier les PIN et lancer les actions sensibles.

## Architecture cible

### Administrateur

L'admin utilise Firebase Authentication avec email + mot de passe.

Une fois connecté, il peut accéder aux fonctions sensibles :

- modification des codes PIN ;
- activation ou désactivation des codes ;
- RAZ ;
- mode formation ;
- tour de contrôle ;
- fonctions de pilotage globales.

Les règles Firestore doivent vérifier `request.auth` pour autoriser ces actions uniquement à l'admin.

### Rôles terrain

Les autres consoles restent simples :

- speaker ;
- live ;
- JA ;
- vidéo ;
- bureau des performances ;
- secrétariat.

Chaque rôle saisit seulement un code PIN.

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
- consoles terrain : PIN simples ;
- PIN : stockés en base et modifiables uniquement par l'admin ;
- vérification PIN : idéalement via Cloud Function ;
- pages publiques : aucun changement, elles restent accessibles sans connexion.

## Palier 1 installe dans le code

Ce palier prepare Firebase Authentication sans bloquer les consoles existantes.

Ce qui est en place :

- chargement du SDK Firebase Authentication sur les pages consoles ;
- module `assets/livepalmes-admin-auth.js` pour connecter/deconnecter un admin Firebase ;
- fenetre du cadenas compatible avec une connexion email + mot de passe ;
- verification locale d'un UID ou email admin autorise via `adminAuth.adminUids` ou `adminAuth.adminEmails` dans `assets/livepalmes-app-config.js` ;
- ancien code admin conserve temporairement uniquement si aucun admin Firebase n'est configure.

Ce qui n'est pas encore bascule :

- les regles Firestore ne sont pas encore durcies avec `request.auth`, pour eviter de couper les consoles avant d'avoir l'UID admin ;
- les PIN des roles terrain restent dans le fonctionnement actuel ;
- aucune Cloud Function `verifyPin` n'est encore creee.

Prochaine bascule sure :

1. Activer Email/Mot de passe dans Firebase Authentication.
2. Creer le compte admin dans la console Firebase.
3. Recuperer l'UID du compte admin.
4. Ajouter cet UID dans `adminAuth.adminUids`.
5. Tester que le cadenas accepte la connexion Firebase.
6. Desactiver le fallback `legacyAdminPinFallback`.
7. Durcir progressivement les regles Firestore.
