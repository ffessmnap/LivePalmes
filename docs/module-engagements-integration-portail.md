# Intégration des engagements dans le portail

<!-- description: Architecture actuelle du module de préparation des compétitions et des engagements intégré au portail LivePalmes. -->

## Positionnement

La gestion des engagements fait partie du **portail LivePalmes**. Elle sert à préparer les compétitions, inscrire les nageurs et relais, déclarer les officiels et produire les documents nécessaires.

Elle ne doit pas être confondue avec **LivePalmes Direct**, utilisé seulement pour certaines compétitions nationales une fois la compétition commencée.

Le module est déjà largement implémenté, mais le portail complet reste en cours de finalisation, de test et d'amélioration.

## Accès depuis le portail

L'interface est intégrée à `portail.html` et au module principal `assets/livepalmes-admin-portal.js`. Il n'existe pas d'application séparée ni de fichiers `livepalmes-entries-*` dédiés.

Selon ses droits, un utilisateur retrouve notamment :

- les compétitions ouvertes aux engagements ;
- les nageurs et officiels de son club ;
- les engagements individuels et les relais ;
- les responsables d'équipe et les documents ;
- le calendrier et les outils nationaux d'administration.

## Fonctionnement général

Le navigateur affiche le portail et envoie les demandes au serveur. Les Cloud Functions vérifient le compte, la capacité et le périmètre autorisé avant de lire ou modifier les données.

Le navigateur n'accède donc pas directement aux collections du portail dans Firestore. Ce passage par le serveur permet de contrôler les clubs, régions et droits nationaux de façon cohérente.

## Données principales

Le calendrier public complète les compétitions d'engagement avec deux collections internes agrégées par saison : `engagementCalendarEvents` pour les événements non compétitifs et `engagementCalendarEventCalendars` pour leur index. Les compétitions continuent d'utiliser `engagementCompetitions` et `engagementCompetitionCalendars`.

Les déclencheurs publient ensuite des fichiers JSON statiques dans le bucket public : `calendar/manifest.json`, `calendar/seasons/{finSaison}.json` et `calendar/events/{id}.json`. Les pages `calendrier.html` et `competition.html` ne lisent pas Firestore.

Les informations sont réparties par fonction :

- `engagementCompetitions` : définition et état des compétitions ;
- `engagementClubEntries` : dossier d'engagement d'un club, avec nageurs, épreuves, relais, officiels et documents ;
- `engagementClubs` : annuaire des clubs ;
- `engagementClubRosters` et `engagementClubPeopleRosters` : listes de nageurs et de personnes rattachées au club ;
- `engagementCompetitionCalendars` et `engagementPublicDirectories` : calendriers et informations destinées à la consultation ;
- `engagementCompetitionEntrySummaries`, `engagementClubCompetitionIndexes` et `engagementCompetitionStatisticsCache` : résumés et caches pour accélérer les écrans ;
- `engagementSwimmerLicenseNumbers` et `engagementSwimmerChangeRequests` : licences et demandes de correction ;
- `engagementEntryTimeCaches` : temps d'engagement préparés à partir des performances ;
- `engagementMailJobs`, `engagementMailRecipientShards` et `engagementMailRecipientIndexState` : préparation et suivi des envois de courriels ;
- `engagementClosureQueue` : opérations de clôture programmées.

D'autres collections conservent les demandes de suppression et les traces d'administration. La structure exacte du document d'un club reste définie dans `functions/index.js`.

## Documents et courriels

Les documents d'information utilisent le même stockage pour les compétitions et les autres événements. Ils sont publics ; leur remplacement réécrit le même objet avec le même jeton afin de conserver l'URL. Les exports techniques et récapitulatifs clubs ne sont pas exposés dans les fichiers publics.

Les pièces générées liées aux engagements sont stockées dans Firebase Storage sous le préfixe `entry-documents`. Les documents d'information déposés par les organisateurs utilisent `competition-documents`. Leurs métadonnées sont bornées à 20 entrées dans le document `engagementCompetitions` afin que leur consultation n'ajoute aucune lecture Firestore à l'ouverture d'une fiche.

Les URL des documents d'information sont techniquement publiques et partageables. La réponse destinée aux clubs exclut systématiquement l'identité de l'auteur ; cette information est ajoutée uniquement à la réponse contrôlée des administrateurs régionaux ou nationaux.

Les courriels sont préparés et envoyés côté serveur. Pour les documents, le ciblage lit l'index existant des administrateurs de clubs : niveau national pour toutes les régions, ou région organisatrice et régions invitées pour une compétition régionale ou départementale. Les identifiants d'envoi restent dans les secrets Firebase et ne doivent jamais être placés dans le code du navigateur ou la documentation.

## Lien avec les performances

Le module peut utiliser la base de performances pour proposer ou contrôler des temps d'engagement. Des caches évitent de recalculer les mêmes informations à chaque ouverture.

Cette utilisation ne donne pas au module le droit de modifier les règles sportives, les records ou les MPF. Ces domaines gardent leurs circuits et validations propres.

## Droits

Les niveaux principaux sont : gestion de son club, changement temporaire de club autorisé, gestion régionale et gestion nationale. Leur définition complète se trouve dans `docs/droits-acces-livepalmes.md`.

Un utilisateur ne doit recevoir que les données correspondant à son périmètre. Les listes, statistiques et recherches doivent rester bornées et utiliser les index ou caches prévus.

## Fonctions déjà couvertes

L'implémentation actuelle comprend notamment : création et gestion des compétitions, dossiers des clubs, responsables d'équipe, nageurs, officiels, engagements individuels, relais, récapitulatifs PDF, export TXT WinPalme, courriels, clôtures planifiées, statistiques et outils nationaux de correction ou de fusion.

Le détail métier des écrans et des règles d'engagement est décrit dans `docs/module-engagements.md`.

## Vérification

Toute évolution de ce module est sensible car elle touche le portail, les droits et les données de compétition. Elle nécessite une validation explicite avant modification, puis les tests ciblés de `docs/TESTS_MANUELS.md` et la vérification globale prévue par le dépôt.
