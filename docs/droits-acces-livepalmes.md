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

## Copie des adresses par club dans NAP — préparation du 28 octobre 2026

NAP/MySQL est partagé entre TEST et PROD. La table privée `livepalmes_club_account_emails` est une projection des seuls profils `users/{uid}` de PROD : identifiant Firebase stable, `club_id`, `email`, état actif/inactif et préférence `competition_notifications`. Aucun mot de passe, jeton ou droit n'est copié. Un profil sans club reste sans rattachement SQL.

Le déclencheur dédié `syncNapClubAccountEmails` suit les profils, indépendamment de `syncEngagementMailRecipientIndex`, qui reste inchangé : les reprises SQL ne doivent pas rejouer d'anciennes mises à jour de l'index mail. Seul le projet explicite `livepalmes` ouvre NAP ; sur TEST le traitement retourne immédiatement, sans connexion, et ne reçoit pas le secret NAP. Une panne SQL ne bloque ni l'enregistrement du compte ni le circuit mail existant ; l'événement SQL bénéficie de sa propre reprise. La copie est asynchrone et peut donc être momentanément en retard. L'export est classé dans le lot NAP spécialisé, exclu de `all-safe` ; ce classement ne vaut pas autorisation de déploiement PROD.

Le traitement verrouille les lignes SQL puis relit les profils Firestore courants en un appel groupé, sans rejouer une ancienne adresse issue de l'événement. Adresse, club, état et préférence sont remplacés ensemble. La version Firestore `source_version`, en microsecondes, empêche aussi une reprise manuelle plus ancienne d'écraser une modification récente ; une absence utilise l'heure de lecture serveur pour dater le marqueur de suppression. La suppression efface adresse et club ; seul un marqueur technique `deleted` portant l'identifiant subsiste pour sérialiser les reprises. Les parcours LivePalmes mettent à jour le profil ; une modification faite exclusivement dans la console Firebase Authentication n'est pas couverte par ce déclencheur Firestore.

Lecture privée prévue pour Winpalm (son intégration n'est pas incluse) :

```sql
SELECT DISTINCT email
FROM livepalmes_club_account_emails
WHERE club_id = ? AND status = 'active' AND email IS NOT NULL
ORDER BY email;
```

Pour les notifications concernées par la préférence existante, ajouter `AND competition_notifications = 1`. L'index `(club_id, status)` évite de parcourir tous les comptes. Aucun changement du circuit d'envoi actuel, aucun envoi et aucune publication publique des adresses.

Budget supplémentaire : ouverture/rafraîchissement du portail = zéro ; événement de profil PROD = une lecture Firestore courante et trois requêtes SQL sur clé primaire dans une transaction, sans parcours des autres comptes ; événement TEST = zéro. Une reprise répète ce coût fixe. Les changements de champs sans effet sur l'adresse peuvent aussi provoquer ce traitement fixe. Table absente ou panne : échec avec reprise, jamais de reconstruction implicite.

La reprise explicite `nap-club-account-emails.yml` est limitée à `main`, au commit exact contrôlé par la CI, à la première tentative et à l'environnement protégé `firebase-test`. Elle réutilise le circuit des reprises NAP existantes : le compte backend TEST appelle `exportNapPublicPage`, privé et déjà détenteur de l'accès MySQL ; le compte backend PROD lit seulement les profils PROD. Aucun mot de passe NAP n'est lu par le workflow et aucun droit IAM n'est ajouté. L'action POST `approved-club-account-emails` de la maintenance privée n'active pas la synchronisation des comptes TEST.

`inspect` lit les métadonnées/clés SQL puis les champs minimaux des profils PROD, sans écriture SQL/Firestore. `apply` exige `nap-shared-prod-account-emails` : sauvegardes de la source et de la projection existante chiffrées, rouvertes et comparées, conservées avant toute écriture ; création de la seule table absente (structure/index/moteur incompatibles refusés) puis pages de 100. Les anciennes clés SQL sont incluses pour effacer les coordonnées des profils disparus. Budget plafonné : 10 001 documents Firestore d'inventaire, 10 000 relectures groupées, deux lectures SQL de 10 001 lignes maximum (inventaire/préparation), trois requêtes SQL par page et une vérification groupée supplémentaire, plus les métadonnées de structure. Aucun parcours interactif ni reconstruction implicite. L'empreinte de chaque page et le plan de table sont contrôlés ; une version déjà plus récente est conservée. Les reçus publiés ne contiennent que compteurs et métadonnées ; seuls les fichiers chiffrés contiennent les coordonnées et les fichiers de travail non chiffrés sont effacés du runner.

Mise en service : CI, déploiement TEST ciblé de la maintenance privée via le lot NAP existant, `inspect`, création/reprise autorisée, puis création du déclencheur PROD et liaison au secret NAP après bilan approuvé dans Infra. La synchronisation automatique TEST reste désactivée. Refaire la reprise après activation pour réconcilier les changements intervenus pendant l'initialisation. Aucun changement IAM implicite. Le 28 octobre, la maintenance TEST et la reprise initiale sont attestées : 249 profils PROD copiés et vérifiés dans la nouvelle table NAP, aucun compte TEST lu, aucune écriture Auth/Firestore ni mail ; [preuve de reprise](https://github.com/ffessmnap/LivePalmes/actions/runs/40779405006). L'activation automatique PROD reste à approuver dans Infra. Une reprise après échec conserve les pages déjà validées. Le rollback de code conserve la table et n'autorise aucune suppression SQL.

## Capacités actuelles

| Capacité | Utilité simple |
|---|---|
| `admin.full` | Administration générale de LivePalmes |
| `records.manage` | Gestion des records et MPF |
| `consoles.manage` | Administration des accès et réglages des consoles |
| `consoles.access` | Possibilité d'ouvrir une console autorisée |
| `competitions.import` | Import de données de compétition |
| `dtn.view` | Consultation des espaces réservés à la DTN |
| `dtn.manage` | Préparation, modification et activation des saisons DTN ; nécessite aussi `dtn.view` |
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

Depuis le chantier régional du 29 octobre, Ajouter ouvre le formulaire existant : région du périmètre régional imposée, clubs de cette région et seule habilitation Engagements club cochée. Les noms, prénom, email et licence restent saisissables ; le mail de création/réinitialisation utilise le mécanisme Firebase Auth existant. Le serveur refuse tout UID de modification, toute autre habilitation et toute région ou club extérieur. Un email Auth déjà existant est refusé pour préserver ses droits cumulés ; seul le national peut reprendre ce compte. La création Auth atomique protège aussi un conflit concurrent sur le même email.

Le sélecteur de club en haut à gauche est ouvert aux responsables régionaux, même sans habilitation club distincte. Il conserve leur périmètre régional original et limite les clubs proposés et chaque contexte serveur à cette région, y compris avec un droit de changement de club cumulé et pour le club habituel. Un droit national cumulé conserve son périmètre national existant. La session temporaire ne modifie aucun droit enregistré. Sans droit club distinct, l’espace club est activé seulement après le choix explicite du contexte (ou restauration d’un contexte autorisé), sans préchargement club supplémentaire à la connexion.

Budget : référentiel NAP borné et cache existants réutilisés (aucun nouvel appel à l'ouverture du portail, du formulaire si cache présent, ni pour filtrer/sélectionner localement ; cache absent : même appel annuaire borné existant, sans reconstruction). Création régionale : deux lectures ponctuelles du profil acteur, une requête NAP par clé primaire LIMIT 1 pour le club, une recherche Auth email ; création Auth/claims, un profil, les 11 grants existants et une trace d'audit. Le déclencheur existant d'annuaire conserve son coût ; la projection NAP des comptes reste désactivée sur TEST. Chaque appel de l'espace club conserve ses lectures métier existantes et ajoute au plus une recherche NAP du club par clé primaire pour vérifier la région ; retour/rafraîchissement : même plafond par appel. Pire cas identique, indépendant du nombre de comptes/clubs affichés ; aucun scan ou listener ajouté. Les annuaires privés gardent leur pagination/cache existants. Tests hors réseau uniquement, aucun email réel.

Les responsables régionaux consultent l’historique des demandes d’accès traitées de leur seule région, les responsables nationaux celui de toutes les régions. La vue reste en lecture seule et applique le même contexte serveur que les demandes en attente. Elle indique validation/refus, date et heure Europe/Paris, auteur (nom du profil actuel ou adresse enregistrée lors du traitement) et motif du refus. Aucun accès au Journal d’activité national n’est accordé. Les demandes déjà conservées sont disponibles sans migration ; une nouvelle demande pour le même email/club peut remplacer la précédente selon l’identifiant historique existant : cette vue ne constitue pas un journal immuable de toutes les tentatives.

Budget ajouté : zéro lecture d’historique à l’ouverture du portail ou de « À traiter » ; au clic Historique, au plus 26 documents de demandes (25 lignes et une sentinelle), 25 profils d’auteurs distincts dans un `getAll`, et le profil de contexte existant (au plus 52 documents). Page suivante ou actualisation : même plafond fixe ; retour sous une minute : zéro appel. Pas de listener, lecture par ligne, scan/reconstruction de repli, lecture NAP ni écriture métier. Une erreur d’index/réseau affiche une indisponibilité ; le cache privé est effacé à la déconnexion/changement de compte et les réponses obsolètes sont ignorées.

Les deux index complémentaires `engagementAccessRequests` sont définis dans `tools/account-history-test-indexes.js` : `status ASC, resolvedAt DESC, __name__ DESC` et `regionId ASC, status ASC, resolvedAt DESC, __name__ DESC`, portée COLLECTION. Leur ajout seul sur TEST a été explicitement autorisé le 26 octobre. Le workflow dédié vérifie main, le commit exact et un compte de service TEST, ne supprime aucun index et attend READY ; il ne publie ni règle ni document. Ces index sont gérés séparément du manifeste global ; leur éventuel ajout PROD exige un accord explicite distinct.

Un administrateur général ou national peut gérer les comptes dans son domaine d'autorité. Un gestionnaire régional ne peut intervenir que dans sa région et seulement sur les niveaux prévus par le portail.

Dans l'annuaire « Utilisateurs et habilitations », un gestionnaire régional voit les comptes régionaux et les comptes administrateurs des clubs rattachés à sa région. Les comptes `admin.full`, les comptes nationaux et ceux des autres régions restent exclus. La région est déterminée par le périmètre explicite du compte, puis par son club de rattachement lorsque ce périmètre manque. Les anciens codes numériques et les libellés régionaux équivalents sont normalisés vers le même périmètre. Cette visibilité n'accorde pas à elle seule le droit de modifier les habilitations ou de supprimer le compte.

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

Les gestionnaires DTN peuvent modifier les paramètres de la saison active et du brouillon suivant. Les lecteurs ne voient que les saisons active et précédente. La précédente est verrouillée. Un administrateur général disposant de l’accès DTN conserve la gestion générale. Aucun compte existant ne reçoit automatiquement `dtn.manage`.
