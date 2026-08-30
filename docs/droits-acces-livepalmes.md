# Droits d'accès LivePalmes

<!-- description: Modèle actuel des comptes, capacités, périmètres et accès temporaires du portail et des consoles LivePalmes. -->

## Principe

Un compte LivePalmes ne reçoit pas un unique rôle général. Il reçoit des **capacités**, c'est-à-dire des autorisations précises, éventuellement limitées à un club ou à une région.

Exemple : une personne peut gérer les engagements de son club sans pouvoir administrer les records, les comptes nationaux ou les consoles du direct.

Le portail est encore en finalisation et en test. Le modèle ci-dessous décrit cependant l'implémentation actuelle, et non une organisation future.

## Les trois niveaux de contrôle

L'accès repose sur trois éléments complémentaires :

1. **le compte Firebase Authentication**, qui prouve l'identité de la personne ;
2. **le profil LivePalmes**, qui indique ses capacités et son rattachement ;
3. **le contrôle côté serveur**, qui vérifie chaque opération sensible avant de l'exécuter.

Les informations du profil sont conservées dans `users/{uid}`. Elles comprennent notamment l'adresse électronique, l'identité, le club ou la région, l'état du compte, les capacités et les périmètres autorisés.

Le profil conserve aussi la préférence `emailPreferences.competitionNotifications`. Lorsqu'elle vaut `false`, le compte est exclu des courriels d'ouverture de compétition, de nouveaux documents et de récapitulatif PDF d'engagement. Les messages indispensables au compte, à sa sécurité et les envois techniques restent actifs. Cette préférence est reprise dans l'index borné des destinataires afin d'éviter une lecture par adresse lors d'un envoi groupé. Le profil et son entrée d'index sont mis à jour dans un même lot atomique : la désactivation est donc prise en compte immédiatement, y compris pour un courriel déjà préparé mais pas encore envoyé.

## Capacités actuelles

| Capacité | Utilité simple |
|---|---|
| `admin.full` | Administration générale de LivePalmes |
| `records.manage` | Gestion des records et MPF |
| `consoles.manage` | Administration des accès et réglages des consoles |
| `consoles.access` | Possibilité d'ouvrir une console autorisée |
| `competitions.import` | Import de données de compétition |
| `dtn.view` | Consultation des espaces réservés à la DTN |
| `engagements.club.manage` | Gestion des engagements de son club |
| `engagements.club.switch` | Changement temporaire vers un autre club autorisé |
| `engagements.region.manage` | Gestion des clubs de sa région |
| `engagements.national.manage` | Gestion nationale des engagements et annuaires |

Les capacités `dtn.view` et `engagements.*` doivent être accordées explicitement. Elles ne sont pas déduites automatiquement d'un autre droit ordinaire.

## Périmètres

Une capacité peut être limitée :

- à un club, identifié par `clubId` ;
- à une région, identifiée par `regionId` ;
- au niveau national lorsqu'aucune limite plus étroite ne s'applique.

La gestion d'un club exige un club de rattachement. Le changement temporaire de club complète ce droit mais ne le remplace pas. À la fin de la session temporaire, le club habituel redevient actif.

Les délégations détaillées sont suivies dans `accessGrants`. Chaque autorisation peut être activée, désactivée et associée à un type de périmètre.

## Ce que reçoit la session

Après connexion, Firebase place dans la session des informations signées appelées « claims ». LivePalmes y retrouve notamment :

- le profil d'accès général ;
- les capacités autorisées ;
- les informations nécessaires aux consoles.

L'utilisateur ne peut pas modifier lui-même ces informations. Une modification de droits peut nécessiter une reconnexion ou un renouvellement de la session avant d'être visible.

## Administration des comptes

Un administrateur général ou national peut gérer les comptes dans son domaine d'autorité. Un gestionnaire régional ne peut intervenir que dans sa région et seulement sur les niveaux prévus par le portail.

Dans le calendrier et le module engagements, une competition ou un evenement dont la date de fin est depassee devient consultable mais non modifiable pour le gestionnaire regional. Celui-ci conserve la gestion documentaire, sauf la suppression des documents existants, et peut transmettre une demande de suppression au niveau national. Ce verrou est controle cote serveur en plus de l'interface.

Les fonctions serveur vérifient ces limites même si un utilisateur tente de contourner l'interface. Les actions importantes sont enregistrées dans `auditLogs` afin de conserver une trace.

La consultation du Journal d’activité est réservée à la capacité `admin.full`. Une capacité nationale, régionale ou de gestion des performances ne donne pas accès à ce journal. Les traces antérieures à sa mise en service sont reprises sur sept jours ; les nouvelles traces restent consultables pendant une période glissante maximale d’un an.

## Cas particulier de LivePalmes Direct

Les consoles ajoutent un deuxième verrou :

1. le compte doit posséder `consoles.access` ou `consoles.manage` ;
2. le PIN de la console doit être validé.

Le PIN n'est pas conservé en clair. Le serveur vérifie son empreinte puis crée une autorisation temporaire dans `consoleGrants`. Les règles Firestore contrôlent cette autorisation avant d'accepter les écritures du direct. Sa durée actuelle est de 12 heures.

Les consoles restent ainsi séparées du portail d'engagements et ne sont utilisées que pour les compétitions nationales prévues à cet effet.

## Compatibilité actuelle

Le code conserve encore une liste technique d'identifiants administrateurs historiques comme solution de compatibilité pour les super-administrateurs. Le modèle à privilégier pour les nouveaux accès reste celui des profils, capacités et délégations enregistrés.

## Références

- `functions/index.js` : contrôles serveur réellement appliqués ;
- `assets/livepalmes-admin-auth.js` : gestion de la session dans le portail ;
- `firestore.rules` : accès directs autorisés ou refusés ;
- `docs/authentification-admin-et-pins.md` : parcours de connexion et PIN ;
- `docs/FIREBASE_REGLES.md` : séparation entre portail, direct et accès public.

Toute modification des capacités, PIN, profils, délégations ou règles d'accès nécessite une validation explicite et des tests ciblés avant publication.
