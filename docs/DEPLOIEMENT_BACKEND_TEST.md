# Déploiement du backend Firebase TEST par lots

<!-- description: Mode opératoire du workflow manuel de déploiement progressif du backend Firebase TEST, inventaire versionné des lots et contrôles après déploiement. -->

## Limites absolues

Le workflow `Deploiement backend Firebase TEST par lots` cible exclusivement `livepalmes-test`. Il ne doit jamais être adapté pour PROD, ne se lance que manuellement depuis `main`, exige la confirmation `livepalmes-test` et le SHA complet affiché par GitHub. Aucun secret n'est lu ou affiché : le workflow vérifie seulement son existence dans Secret Manager TEST.

Le codebase temporaire créé par le workflow réutilise `functions/index.js` mais ne réexporte que les noms du lot choisi. Firebase CLI peut ainsi analyser tout le module sans découvrir d'endpoint hors lot. Les déclarations `defineSecret` restent sans effet pour les lots sans endpoint email exporté ; ces lots n'exigent aucun secret SMTP.

`all-safe` enchaîne l'infrastructure Firestore et les lots `access`, `engagement-core`, `performance` et `publications`. Il exclut entièrement `email` et `schedulers` : il ne prépare donc pas d'email et ne peut en envoyer aucun.

## Ordre obligatoire recommandé

1. `bootstrap` ;
2. `access` ;
3. `engagement-core` ;
4. `performance` ;
5. `publications` ;
6. `email` ;
7. `schedulers`.

Ne pas utiliser `all-safe` pour une première installation : le déploiement progressif rend les validations et retours arrière plus simples.

## Préconditions communes

- GitHub Environment `firebase-test` protégé par approbation ;
- secret GitHub `FIREBASE_SERVICE_ACCOUNT_LIVEPALMES_TEST_BACKEND` appartenant au projet TEST ;
- APIs du lot activées et IAM accordé uniquement dans TEST ;
- Firestore/Auth/Storage TEST sans données PROD ;
- deux buckets attendus : `livepalmes-test.firebasestorage.app` et `livepalmes-test-public-data-206080168534` ;
- tous les tests locaux et les dry-runs réussis ;
- vérification du SHA de `main` à déployer.

## Inventaire versionné

La source normative lisible par le workflow est `tools/firebase-test-backend-lots.js`. Le test `tools/check-firebase-test-backend-lots.js` compare cet inventaire aux exports réels et refuse tout export absent, doublon ou Function présente dans plusieurs lots.

### bootstrap

- **Functions :** `getCurrentAccessUser` dans sa version bootstrap isolée.
- **Ressources :** règles Firestore et 11 index composites.
- **Secrets :** aucun.
- **Après déploiement :** tester appel anonyme refusé, utilisateur absent/inactif refusé et utilisateur actif TEST accepté.

### access (13 Functions)

**Functions exactes :**

- `getCurrentAccessUser`
- `createOrUpdateAccessUser`
- `listAccessUsers`
- `setAccessUserStatus`
- `deleteAccessUser`
- `requestAccessUserDeletion`
- `listAccessUserDeletionRequests`
- `resolveAccessUserDeletionRequest`
- `updateCurrentAccountEmail`
- `setRolePins`
- `verifyPin`
- `rebuildAccessDirectoryIndexNextPage`
- `rebuildAccessDirectorySnapshotNextPage`

**Secrets :** aucun.

**APIs requises :** `cloudfunctions.googleapis.com`, `run.googleapis.com`, `cloudbuild.googleapis.com`, `artifactregistry.googleapis.com`, `firestore.googleapis.com`, `identitytoolkit.googleapis.com`.

**IAM :** roles/cloudfunctions.developer ; roles/iam.serviceAccountUser ; runtime: roles/datastore.user + administration Firebase Auth.

**Dépendances :** Firestore: users, accès, annuaires, grants, audit ; Auth: utilisateurs, custom claims, révocation.

### engagement-core (80 Functions)

**Functions exactes :**

- `listEngagementAccessRequests`
- `syncEngagementClubEntryToCompetitionSummary`
- `syncEngagementMailRecipientIndex`
- `rebuildEngagementMailRecipientIndexNextPage`
- `syncEngagementClubPersonToRoster`
- `syncPerformanceSwimmerToEngagementClubRoster`
- `syncEngagementClubSwimmerToRoster`
- `listEngagementCompetitions`
- `listEngagementCalendarEvents`
- `getEngagementCalendarEvent`
- `createEngagementCalendarEvent`
- `updateEngagementCalendarEvent`
- `deleteEngagementCalendarEvent`
- `listEngagementOpenWaterCourses`
- `addEngagementOpenWaterCourse`
- `setEngagementOpenWaterCourseStatus`
- `getEngagementCompetition`
- `uploadEngagementCompetitionDocument`
- `updateEngagementCompetitionDocument`
- `deleteEngagementCompetitionDocument`
- `previewEngagementCompetitionDocumentNotification`
- `getEngagementClubEntry`
- `preloadEngagementClubWorkspaces`
- `generateEngagementClubRecapPdf`
- `listEngagementCompetitionClubRecaps`
- `getEngagementCompetitionStatistics`
- `generateEngagementClubRecapPdfForAdmin`
- `generateEngagementCompetitionClubRecapPdfs`
- `generateEngagementCompetitionTxtExport`
- `saveEngagementClubTeamLeader`
- `removeEngagementClubTeamLeader`
- `listEngagementClubPeople`
- `saveEngagementClubPerson`
- `setEngagementClubPersonStatus`
- `saveEngagementClubOfficials`
- `listEngagementClubSwimmers`
- `setEngagementClubSwimmerActivityStatus`
- `rebuildEngagementClubAggregates`
- `previewEngagementClubSwimmerCreation`
- `previewEngagementClubSwimmerRecovery`
- `recoverEngagementClubSwimmer`
- `createEngagementClubSwimmer`
- `listEngagementNationalClubSwimmers`
- `searchEngagementNationalSwimmers`
- `prepareEngagementLicenseControlBatch`
- `validateEngagementSwimmerLicenses`
- `requestEngagementClubSwimmerChange`
- `listEngagementSwimmerChangeRequests`
- `getEngagementNationalAdministrationOverview`
- `listEngagementNationalClubs`
- `getPublicEngagementClubDirectory`
- `saveEngagementNationalClub`
- `deleteEngagementNationalClub`
- `getPortalPendingRequestOverview`
- `setEngagementNationalClubSwimmerStatus`
- `requestEngagementClubSwimmerDeletion`
- `deleteEngagementNationalClubSwimmer`
- `listEngagementSwimmerDeletionRequests`
- `resolveEngagementSwimmerDeletionRequest`
- `searchEngagementNationalSwimmerMergeTargets`
- `listEngagementNationalClubPeople`
- `setEngagementNationalClubPersonStatus`
- `deleteEngagementNationalClubPerson`
- `listEngagementNationalAuditLogs`
- `mergeEngagementNationalClubPerson`
- `previewEngagementClubEntryTimes`
- `getEngagementClubEntryTimeHistory`
- `previewEngagementClubSwimmerEventTimes`
- `previewEngagementClubSwimmerEventTimesBatch`
- `saveEngagementClubIndividualEntries`
- `saveEngagementClubSwimmerSelection`
- `saveEngagementClubSwimmerSelections`
- `saveEngagementClubSwimmers`
- `saveEngagementClubRelays`
- `createEngagementCompetition`
- `updateEngagementCompetition`
- `deleteEngagementCompetition`
- `requestEngagementCompetitionDeletion`
- `listEngagementCompetitionDeletionRequests`
- `resolveEngagementCompetitionDeletionRequest`

**Secrets :** aucun.

**APIs requises :** `cloudfunctions.googleapis.com`, `run.googleapis.com`, `cloudbuild.googleapis.com`, `artifactregistry.googleapis.com`, `firestore.googleapis.com`, `eventarc.googleapis.com`, `pubsub.googleapis.com`, `storage.googleapis.com`.

**IAM :** roles/cloudfunctions.developer ; roles/eventarc.admin ; roles/iam.serviceAccountUser ; runtime: roles/datastore.user + objectAdmin limité au bucket Firebase Storage TEST.

**Dépendances :** Firestore: engagement*, users, performances et audit ; Storage TEST: livepalmes-test.firebasestorage.app ; Auth: identité et capacités.

### performance (15 Functions)

**Functions exactes :**

- `previewCompetitionImport`
- `listCompetitionImports`
- `updateCompetitionImportRecordAlertDecision`
- `buildDtnQualificationView`
- `refreshDtnQualificationCache`
- `getDtnQualificationOverview`
- `refreshDtnListingCache`
- `getDtnListingOverview`
- `rebuildPerformanceSwimmerIndexNextPage`
- `rebuildPerformanceTopIndexNextPage`
- `importHistoricalPerformanceRows`
- `exportAdditionalPerformanceData`
- `getPerformanceBaseMigrationStatus`
- `migratePerformanceBaseNextChunk`
- `getPerformancePublicationJobStatus`

**Secrets :** aucun.

**APIs requises :** `cloudfunctions.googleapis.com`, `run.googleapis.com`, `cloudbuild.googleapis.com`, `artifactregistry.googleapis.com`, `firestore.googleapis.com`, `eventarc.googleapis.com`, `pubsub.googleapis.com`, `storage.googleapis.com`.

**IAM :** roles/cloudfunctions.developer ; roles/eventarc.admin ; roles/iam.serviceAccountUser ; runtime: roles/datastore.user + objectViewer limité aux sources publiques TEST.

**Dépendances :** Firestore: performance*, imports et caches DTN ; Storage/Hosting TEST: lecture des sources DTN et migration ; Auth: capacité competitions.import ou dtn.view.

### publications (17 Functions)

**Functions exactes :**

- `storeCompetitionPdf`
- `deleteCompetitionPdf`
- `syncOfficialResultToPublicIndex`
- `rebuildEngagementCompetitionCalendars`
- `syncEngagementCompetitionToCalendar`
- `syncEngagementCalendarEventToCalendar`
- `syncPublicRecordsData`
- `publishPerformancePublicData`
- `createCompetitionImport`
- `resumeCompetitionImportPublication`
- `deleteCompetitionImport`
- `publishPerformanceCorrectionJob`
- `retryPerformancePublicationJob`
- `savePerformanceCorrection`
- `updateEngagementNationalSwimmerIdentity`
- `mergeEngagementNationalClubSwimmer`
- `repairEngagementNationalSwimmerMergePublication`

**Secrets :** aucun.

**APIs requises :** `cloudfunctions.googleapis.com`, `run.googleapis.com`, `cloudbuild.googleapis.com`, `artifactregistry.googleapis.com`, `firestore.googleapis.com`, `eventarc.googleapis.com`, `pubsub.googleapis.com`, `storage.googleapis.com`.

**IAM :** roles/cloudfunctions.developer ; roles/eventarc.admin ; roles/iam.serviceAccountUser ; runtime: roles/datastore.user + objectAdmin limité au bucket public TEST.

**Dépendances :** Firestore TEST: résultats, calendrier, records et performances ; Storage TEST: livepalmes-test-public-data-206080168534.

### email (10 Functions)

**Functions exactes :**

- `submitEngagementAccessRequest`
- `resolveEngagementAccessRequest`
- `updateCurrentEmailNotificationPreferences`
- `disableCompetitionEmailNotifications`
- `notifyEngagementCompetitionDocuments`
- `listEngagementCompetitionMailJobs`
- `prepareEngagementOpeningNotificationEmails`
- `prepareEngagementClubRecapEmails`
- `sendEngagementPreparedEmails`
- `resolveEngagementSwimmerChangeRequest`

**Secrets :** `LIVEPALMES_SMTP_HOST`, `LIVEPALMES_SMTP_PORT`, `LIVEPALMES_SMTP_USER`, `LIVEPALMES_SMTP_PASS`, `LIVEPALMES_SMTP_SECURE`, `LIVEPALMES_MAIL_FROM`, `LIVEPALMES_NOTIFICATION_LINK_SECRET`.

**APIs requises :** `cloudfunctions.googleapis.com`, `run.googleapis.com`, `cloudbuild.googleapis.com`, `artifactregistry.googleapis.com`, `firestore.googleapis.com`, `secretmanager.googleapis.com`.

**IAM :** roles/cloudfunctions.developer ; roles/iam.serviceAccountUser ; runtime: roles/datastore.user + roles/secretmanager.secretAccessor limité aux secrets TEST.

**Dépendances :** Firestore TEST: users, demandes, shards et engagementMailJobs ; Auth TEST ; SMTP de capture exclusivement TEST ; Hosting TEST pour les liens de préférences.

### schedulers (2 Functions)

**Functions exactes :**

- `resumePerformancePublicationJobs`
- `closeDueEngagementCompetitions`

**Secrets :** `LIVEPALMES_SMTP_HOST`, `LIVEPALMES_SMTP_PORT`, `LIVEPALMES_SMTP_USER`, `LIVEPALMES_SMTP_PASS`, `LIVEPALMES_SMTP_SECURE`, `LIVEPALMES_MAIL_FROM`, `LIVEPALMES_NOTIFICATION_LINK_SECRET`.

**APIs requises :** `cloudfunctions.googleapis.com`, `run.googleapis.com`, `cloudbuild.googleapis.com`, `artifactregistry.googleapis.com`, `firestore.googleapis.com`, `storage.googleapis.com`, `cloudscheduler.googleapis.com`, `secretmanager.googleapis.com`.

**IAM :** roles/cloudfunctions.developer ; roles/cloudscheduler.admin ; roles/iam.serviceAccountUser ; runtime: rôles Firestore/Storage/Secret Manager TEST des traitements appelés.

**Dépendances :** Firestore TEST: engagementClosureQueue et performancePublicationJobs ; Buckets TEST ; SMTP de capture TEST pour closeDueEngagementCompetitions.

## Frontière performance / publications

Le lot `performance` ne contient aucune Function capable d’écrire dans le bucket public ou d’enfiler/rejouer un job de publication. Les imports créateurs, reprises, suppressions, corrections et réparations d’identité qui ont un effet public sont dans `publications`. Le contrôle automatique maintient une liste explicite de ces effets et interdit leur présence dans `access`, `engagement-core` ou `performance`.

Revue des sept Functions signalées :

- `createCompetitionImport` appelle `publishCompetitionImportOutputs`, qui écrit l’instantané additionnel et les fichiers publics incrémentaux : déplacée dans `publications` ;
- `resumeCompetitionImportPublication` appelle elle aussi `publishCompetitionImportOutputs` : déplacée dans `publications` ;
- `deleteCompetitionImport` réécrit l’instantané public et reconstruit les fichiers affectés : déplacée dans `publications` ;
- `publishPerformanceCorrectionJob` traite le job dès sa création et écrit l’instantané et les fichiers publics : déplacée dans `publications` ;
- `retryPerformancePublicationJob` crée un nouveau job qui sera traité par le trigger précédent : déplacée dans `publications` ;
- `importHistoricalPerformanceRows` écrit uniquement la base et l’état de migration Firestore : maintenue dans `performance` ;
- `migratePerformanceBaseNextChunk` lit ses fichiers source depuis le Hosting TEST puis écrit uniquement Firestore : maintenue dans `performance`.

La même revue a identifié puis déplacé dans `publications` quatre autres entrées à effet public : `savePerformanceCorrection`, qui crée un job de publication, ainsi que `updateEngagementNationalSwimmerIdentity`, `mergeEngagementNationalClubSwimmer` et `repairEngagementNationalSwimmerMergePublication`, qui reconstruisent directement les fichiers publics d’un nageur.

`exportAdditionalPerformanceData` reste dans `performance` : malgré son nom, elle construit et retourne un snapshot sans le sauvegarder dans Storage. L’écriture effective appartient à `publishPerformancePublicData`, classée dans `publications`.

Deux exceptions à effet public existent hors du lot `publications` pour préserver des opérations indivisibles : `resolveEngagementSwimmerChangeRequest` reste dans `email`, car elle approuve la correction, met à jour les fichiers publics et envoie la notification de résolution dans une seule transaction métier ; `resumePerformancePublicationJobs` reste dans `schedulers`, puisqu’elle constitue précisément la reprise planifiée. Ces exceptions sont nommées et figées par le test de classification.

Les documents de compétition de `engagement-core` utilisent le bucket Firebase Storage TEST prévu pour les pièces d’engagement. Ils ne touchent pas au bucket public de performances et restent dans leur lot métier conformément au découpage attendu.

## Contrôles manuels après chaque lot

### access

Tester un compte actif, inactif et inconnu, la création d'un compte TEST, la mise à jour des claims, la révocation, les PIN et la reconstruction paginée des annuaires. Vérifier que toutes les écritures restent dans Firestore/Auth TEST.

### engagement-core

Créer une compétition, un événement, un club, un nageur et un officiel synthétiques. Vérifier rosters, résumés et index destinataires. Déposer puis supprimer un document, générer PDF/TXT et confirmer que seul `livepalmes-test.firebasestorage.app` est utilisé. Aucun email ne doit partir.

### performance

Importer un petit jeu synthétique, reconstruire une page nageur et un index TOP, lancer un job DTN et une correction. Vérifier statuts et idempotence. Les sorties éventuelles doivent rester dans le bucket public TEST ; le scheduler de reprise reste absent.

### publications

Publier un calendrier, un PDF, un résultat, un snapshot Records/MPF et un jeu minimal de performances. Vérifier chaque URL, manifeste et objet : domaine Hosting TEST et bucket `livepalmes-test-public-data-206080168534` uniquement, sans donnée personnelle réelle.

### email

Avant le lancement, configurer un SMTP de capture exclusivement TEST, un expéditeur TEST et des destinataires synthétiques. Vérifier les sept secrets et le droit `secretAccessor` du runtime. Après déploiement, préparer un job, contrôler le destinataire, envoyer vers le sink, tester le lien de désinscription et confirmer qu'aucune adresse réelle ne reçoit de message.

### schedulers

Avant le lancement, les collections `engagementClosureQueue` et les jobs de publication `pending/processing` doivent être vides ; le workflow le vérifie avec deux lectures bornées à un document et n'affiche aucune donnée. Saisir la confirmation supplémentaire `livepalmes-test-schedulers-empty`. Après déploiement, introduire un unique job synthétique, déclencher manuellement chaque scheduler, vérifier l'idempotence, puis observer au moins deux cycles de cinq minutes.

## Actions d'infrastructure restant manuelles

Le workflow vérifie les APIs mais ne les active pas, vérifie les secrets mais ne les crée pas, et ne modifie aucun binding IAM. L'administrateur TEST doit donc effectuer ces opérations avant le lot concerné. Il doit aussi inspecter les politiques IAM des deux buckets, créer les comptes Auth TEST, configurer le SMTP sink, approuver l'environnement GitHub et contrôler les ressources dans la console après chaque déploiement.
