# Authentification admin et codes PIN

<!-- description: Fonctionnement des comptes, capacités et codes PIN protégeant les consoles et accès administratifs. -->

## Objectif

Expliquer deux mecanismes distincts :

- la connexion et les habilitations du Portail LivePalmes ;
- l'acces temporaire aux consoles de LivePalmes Direct lors des competitions nationales concernees.

Le portail et ces mecanismes sont encore en phase de finalisation et de test.

## Comptes du Portail LivePalmes

Les utilisateurs se connectent avec une adresse email et un mot de passe geres par Firebase Authentication.

Sur PROD, la session reste ouverte jusqu’à une déconnexion volontaire, une invalidation Firebase ou la désactivation du compte. Le chantier approuvé du 2 novembre prépare sur TEST une reconnexion après 24 heures d’inactivité réelle, partagée entre onglets et contrôlée aussi côté serveur. Les saisies restent en mémoire pendant la reconnexion du même compte ; aucune écriture n’est rejouée. Activation PROD exclue de l’accord TEST. Les consoles de LivePalmes Direct conservent leurs propres protections et expirations. Voir les budgets, limites et contrôles dans [Réactivité du portail](PORTAIL_REACTIVITE.md).

Complément A3.4a autorisé le 17 novembre : bootstrap, client et annuaire sont préparés dans une première version compatible ; l’enforcement serveur PROD et la fermeture directe suivront dans une version distincte après vérification de la première. Aucun changement de durée, capacité ou compte ; activation complète non déclarée à ce stade. L’accord conditionnel d’Antoine couvre TEST/PROD quand les contrôles nécessaires sont concluants, avec publications dans Infra. [Détails A3.4a](audit-a3-session.md).

Optimisation autorisée le 30 octobre : à la restauration d'une session utilisant le profil serveur, le SDK réutilise un jeton encore valable et le renouvelle si nécessaire ([contrat Firebase](https://firebase.google.com/docs/reference/js/auth.user#getidtokenresult)). Le portail attend toujours la lecture du profil serveur actif et de ses capacités avant d'ouvrir l'espace privé ; aucun droit n'est accordé sur le seul jeton en cache. Une connexion explicite et les consommateurs historiques fondés sur les claims conservent le renouvellement forcé. Aucun appel réel de connexion/profil n'est utilisé pour la recette hors réseau, car la lecture du profil peut actualiser `lastLoginAt`.

Le compte LivePalmes porte ensuite des capacites et un perimetre qui determinent ce que la personne peut consulter ou modifier : club, region, national, Records / MPF, import de competitions, DTN, administration ou acces au Direct.

Masquer un bouton dans l'interface ne suffit jamais a proteger une action. Les fonctions serveur et les regles Firestore doivent aussi verifier le compte, son statut, ses capacites et son perimetre.

## Microsoft Authenticator et secours administrateur — TEST validé, PROD préparée

Le parcours et son fournisseur TOTP sont disponibles et qualifiés sur TEST pour les administrateurs généraux (`admin.full`). Le même parcours est préparé pour PROD, avec une clé distincte : sa mise à disposition effective est suivie dans le registre. La carte « Mon compte » est réservée à ces administrateurs sur les deux projets connus. Aucune obligation pour tous les comptes. Avec l’e-mail vérifié et le mot de passe actuel, l’administrateur prépare le QR, choisit « Ajouter un compte → Autre compte » dans Microsoft Authenticator, conserve la clé de configuration sur papier puis saisit le code dans LivePalmes. Ne transmettre aucun QR, mot de passe, clé ou code dans une conversation. Tester ensuite une nouvelle connexion et une restauration depuis la fiche avant d’étendre cette protection.

En cas de téléphone perdu, la clé papier permet de recréer les mêmes codes dans Authenticator : cela réutilise le facteur existant. Le portail propose une première association seulement si aucun TOTP n’est déjà présent, puis affiche les consignes de récupération. Le TEST réel a refusé une demande de secret supplémentaire avec un seul TOTP visible ; les anciens essais à deux facteurs simulés ne prouvaient pas cette possibilité chez le fournisseur. Si le papier est perdu ou le téléphone volé, contacter le responsable LivePalmes pour préparer un remplacement avec vérification d’identité et accord spécifique : retirer le seul facteur crée temporairement une connexion par mot de passe seul. Aucun retrait du dernier facteur dans le parcours ordinaire, ni désactivation automatique. Antoine a qualifié sur TEST le retrait via sa notification de sécurité, une nouvelle association avec papier et une restauration depuis ce papier suivie d’une connexion réussie ; aucun deuxième appareil physique testé. État des livraisons et limites dans [A3.4b](audit-a3-session.md).

Pour préserver l’adresse vérifiée d’un compte MFA, son changement d’e-mail passe provisoirement par le responsable LivePalmes. Le formulaire habituel reste disponible pour les comptes sans second facteur. Aucun changement d’adresse réel par les contrôles de ce lot.

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
