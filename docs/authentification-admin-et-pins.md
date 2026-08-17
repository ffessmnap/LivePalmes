# Authentification admin et codes PIN

<!-- description: Fonctionnement des comptes, capacités et codes PIN protégeant les consoles et accès administratifs. -->

## Objectif

Expliquer deux mecanismes distincts :

- la connexion et les habilitations du Portail LivePalmes ;
- l'acces temporaire aux consoles de LivePalmes Direct lors des competitions nationales concernees.

Le portail et ces mecanismes sont encore en phase de finalisation et de test.

## Comptes du Portail LivePalmes

Les utilisateurs se connectent avec une adresse email et un mot de passe geres par Firebase Authentication.

Le compte LivePalmes porte ensuite des capacites et un perimetre qui determinent ce que la personne peut consulter ou modifier : club, region, national, Records / MPF, import de competitions, DTN, administration ou acces au Direct.

Masquer un bouton dans l'interface ne suffit jamais a proteger une action. Les fonctions serveur et les regles Firestore doivent aussi verifier le compte, son statut, ses capacites et son perimetre.

## Acces actuel a LivePalmes Direct

Les consoles utilisees lors des competitions nationales concernees demandent deux niveaux d'acces :

1. un compte LivePalmes actif avec email et mot de passe ;
2. le PIN temporaire du role utilise pendant la competition.

Le compte doit disposer de `consoles.access` ou `consoles.manage`.

Comportement actuel de transition : `admin.full` est encore accepte comme solution de secours pour l'acces console. La cible fonctionnelle reste un acces explicite avec `consoles.access` ou `consoles.manage`.
La validation du PIN ajoute ensuite un claim `livepalmesConsoleAccess`, le role et la competition, sans supprimer les claims permanents du compte. Les regles Firestore exigent ce claim et un grant console non expire.

Une session Firebase anonyme ne peut pas verifier un PIN. Les comptes console doivent etre crees ou approuves depuis le Portail LivePalmes. Un compte distinct par personne ou tablette reste recommande afin de conserver le cloisonnement des roles et la possibilite de revoquer un seul appareil.

Les roles terrain sont :

- speaker ;
- live ;
- JA ;
- vidéo ;
- bureau des performances ;
- secrétariat.

Chaque utilisateur se connecte d'abord avec son compte LivePalmes, puis saisit le code PIN du role. L'autorisation temporaire obtenue est rattachee au compte, au role et a la competition.

## Fonctionnement actuel des PIN

Les PIN ne sont pas codes en dur dans le JavaScript public et ne sont pas envoyes au navigateur pour verification.

Le parcours est le suivant :

1. La console envoie le role et le PIN saisi a la Cloud Function `verifyPin`.
2. La fonction verifie d'abord le compte LivePalmes et son droit d'acces aux consoles.
3. Elle compare le PIN avec son empreinte protegee stockee cote serveur.
4. Elle bloque temporairement les tentatives apres plusieurs erreurs.
5. Si le PIN est correct, elle cree une autorisation temporaire pour ce role et cette competition.
6. La console recoit seulement le resultat de la verification, jamais le PIN conserve cote serveur.

Seuls les comptes disposant du droit `consoles.manage` peuvent modifier les PIN avec la fonction serveur prevue a cet effet.

## Transition encore presente

Quelques identifiants administrateurs restent codes en dur comme filet de securite technique. Cette transition doit etre finalisee et testee avant leur retrait.

La cible fonctionnelle reste :

- des comptes nominatifs avec email et mot de passe ;
- des capacites metier explicites et cumulables ;
- des controles effectues cote serveur ;
- un PIN supplementaire uniquement pour le role temporaire dans LivePalmes Direct ;
- des pages publiques accessibles sans connexion.

Toute modification de ce dispositif reste sensible et doit etre realisee hors competition, avec tests des regles Firestore, des Cloud Functions, des comptes et des differents roles.
