# Synchronisation sélective des données PROD vers Firebase TEST

## Frontière de sécurité

La source identifiée dans `.firebaserc` et `functions/livepalmes-environment.js` est `livepalmes`. Elle est ouverte par l'outil uniquement sous l'identité nommée `prod-read-only-source`; le code source n'utilise sur cette instance que les lectures Firestore et Storage. La destination est codée en dur sur `livepalmes-test` et utilise une application Admin distincte.

Le dry-run est le mode par défaut. Une écriture exige simultanément `--apply`, la confirmation `copy-livepalmes-readonly-to-livepalmes-test`, l'attestation `email-and-schedulers-disabled-in-livepalmes-test`, un credential source dont `project_id=livepalmes` et un credential destination dont `project_id=livepalmes-test`. Les credentials doivent être distincts et le compte source doit recevoir uniquement des rôles de lecture.

Firebase Authentication n'est jamais lu ni copié depuis PROD. Avant une application, l'outil recherche les profils TEST actifs portant `admin.full`, affiche uniquement leurs UID et refuse de continuer s'il n'en trouve aucun. Aucune suppression n'est effectuée : les comptes et données administratives TEST sont donc conservés.

## Manifeste Firestore exact

| Décision | Collections ou ressources | Raison |
|---|---|---|
| **COPIER PROD → TEST** | `competitions` et ses sous-collections autorisées `results`, `liveData`, `history`, `performanceData` | Compétitions Direct, résultats, historique et records sportifs sources. Les sous-collections `secrets`, `security`, `consoleGrants`, `pinAttempts` et `public` sont exclues récursivement. |
| **COPIER** | `engagementClubs`, `engagementConfigurations` | Référentiel et configuration métier des clubs/courses. |
| **COPIER** | `engagementCalendarEvents`, `engagementCompetitions`, `engagementClubEntries` | Calendrier source, compétitions et engagements. |
| **COPIER** | `engagementClubPeople`, `engagementClubSwimmers`, `engagementSwimmerLicenses`, `engagementSwimmerLicenseNumbers`, `engagementSwimmerAlerts` | Personnes, officiels, nageurs et contrôles de licence nécessaires à la recette sportive. |
| **COPIER** | `performanceImports`, `performances`, `performanceChanges`, `performanceCorrections` | Sources et historique métier de la base de performances. Les jobs de publication ne sont pas copiés. |
| **RECONSTRUIRE DANS TEST** | `engagementClubRosters`, `engagementClubPeopleRosters`, `engagementPublicDirectories` | Index dérivés des clubs, nageurs et personnes. |
| **RECONSTRUIRE** | `engagementCompetitionCalendars`, `engagementCalendarEventCalendars` | Calendriers dérivés; utiliser `rebuildEngagementCompetitionCalendars` après copie. |
| **RECONSTRUIRE** | `engagementCompetitionEntrySummaries`, `engagementClubCompetitionIndexes`, `engagementCompetitionStatisticsCache`, `engagementEntryTimeCaches` | Résumés, index et caches dérivés des engagements. |
| **RECONSTRUIRE** | `performanceSwimmerIndex`, `performanceSwimmerPages`, `performanceSwimmerIndexState` | Utiliser `rebuildPerformanceSwimmerIndexNextPage` jusqu'à achèvement. |
| **RECONSTRUIRE** | `performanceTopViews`, `performanceTopIndexState` | Utiliser `rebuildPerformanceTopIndexNextPage` jusqu'à achèvement. |
| **RECONSTRUIRE** | `dtnQualificationViews`, `dtnQualificationViewState` | Utiliser `refreshDtnQualificationCache`, puis `refreshDtnListingCache`. |
| **RECONSTRUIRE** | sous-collection `competitions/*/public`, fichiers calendrier, records et publications de performances | Utiliser les Functions du lot `publications` uniquement après validation des sources TEST. |
| **EXCLURE** | Firebase Authentication PROD et custom claims | Comptes réels et mécanismes d'administration hors périmètre. |
| **EXCLURE / CONSERVER TEST** | `users`, `accessGrants`, `accessDirectoryIndexState`, `accessDirectorySnapshots`, `accessDirectorySnapshotState`, `engagementClubAdminDirectories` | Préserve le super-admin et les annuaires d'accès propres à TEST. |
| **EXCLURE / CONSERVER TEST** | `auditLogs` | Ne pas mélanger les traces administratives PROD et TEST. |
| **EXCLURE** | `accessUserDeletionRequests`, `portalAccessRequestRateLimits`, `engagementAccessRequests` | Demandes, suppressions et protections liées aux comptes réels. |
| **EXCLURE** | `competitions/*/secrets`, `competitions/*/security`, `competitions/*/consoleGrants`, `competitions/*/security/pinAttempts/items`, `presence`, `roleLocks`, `testMode` | PIN, présence, verrous, modes et grants temporaires des consoles. |
| **EXCLURE — validation humaine** | sous-collection `alerts` | Sémantique potentiellement opérationnelle; exclue par prudence tant que sa reprise n'est pas validée. |
| **EXCLURE** | `engagementMailJobs`, `engagementMailRecipientShards`, `engagementMailRecipientIndexState` | Emails préparés, files et index de destinataires. |
| **EXCLURE** | `engagementClosureQueue`, `performancePublicationJobs`, `performanceMigrationJobs`, `dtnQualificationJobs` | Queues et jobs susceptibles d'être repris par un trigger ou scheduler. |
| **EXCLURE** | `engagementCompetitionDeletionRequests`, `engagementSwimmerChangeRequests`, `engagementSwimmerDeletionRequests` | Demandes opérationnelles en attente, à ne pas rejouer dans TEST. |
| **EXCLURE PAR DÉFAUT** | Toute collection découverte mais absente de `COPY` | Une nouvelle collection doit faire l'objet d'une validation humaine et d'une modification versionnée du manifeste. |

Les seules sous-collections autorisées sont versionnées séparément : `results`, `liveData`, `history`, `performanceData`, `extras`, `races`, `summaries`, `resultArchives`, `historyArchives`, `resultPdfs`, `seriesPdfs`, `sessionResultsPdfs`, ainsi que `clubs` et `performances` sous les imports. Toute autre sous-collection découverte est journalisée puis exclue.

`importHistoricalPerformanceRows` et `migratePerformanceBaseNextChunk` ne sont pas nécessaires lorsque `performances` est copiée intégralement. Ils restent utiles uniquement pour reconstruire la base depuis les fichiers historiques à la place d'une copie Firestore. `publishPerformancePublicData` et `syncPublicRecordsData` ne sont exécutées qu'à l'étape de publication contrôlée.

### Fonctions de reconstruction auditées

| Function | Décision après copie |
|---|---|
| `migratePerformanceBaseNextChunk` | Ne pas lancer après une copie complète de `performances`; voie alternative de migration depuis Hosting TEST. |
| `importHistoricalPerformanceRows` | Ne pas lancer après une copie complète; voie alternative d'import Firestore. |
| `rebuildPerformanceSwimmerIndexNextPage` | Lancer page par page jusqu'à `done`, après `performances`. |
| `rebuildPerformanceTopIndexNextPage` | Lancer page par page après l'index nageurs. |
| `refreshDtnQualificationCache` | Lancer après les index de performances et TOP. |
| `refreshDtnListingCache` | Lancer après le cache de qualification. |
| `rebuildEngagementClubAggregates` | Lancer pour chaque club copié afin de recalculer rosters et agrégats. |
| `rebuildEngagementCompetitionCalendars` | Lancer après compétitions et événements; écrit uniquement vers les ressources TEST résolues par l'environnement. |
| `syncPublicRecordsData` | Trigger de publication : ne provoquer sa synchronisation qu'à l'étape `publications`, dans le bucket public TEST. |
| `publishPerformancePublicData` | Lancer en dernier pour produire les fichiers publics à partir des index TEST reconstruits. |

## Storage et Hosting

| Décision | Source → destination | Contenu |
|---|---|---|
| **COPIER** | `livepalmes.firebasestorage.app` → `livepalmes-test.firebasestorage.app` | Préfixes `competition-documents/` et `entry-documents/`. |
| **COPIER** | `livepalmes-public-data-718081132564` → `livepalmes-test-public-data-206080168534` | Préfixe `competition-pdfs/`. |
| **RECONSTRUIRE** | bucket public TEST | `calendar/`, `performance-public/`, `performance-public-firestore/`, `records/`, `dtn-listing/`. |
| **CONSERVER** | Hosting TEST | Les sources historiques sous `performances/public/data/` sont livrées par le dépôt; aucun Hosting PROD n'est aspiré. |
| **EXCLURE** | Tous les autres objets | Doute par défaut; ajout au manifeste obligatoire avant copie. |

Chaque valeur Firestore et chaque métadonnée Storage copiée remplace les quatre références PROD connues (buckets Firebase/public, origine Hosting et chemin de projet) par leur équivalent TEST. La vérification post-sync échoue si une référence résiduelle est trouvée dans une collection source copiée.

## Ordre d'exécution

1. Vérifier dans Cloud Functions et Cloud Scheduler TEST que les lots `email` et `schedulers` sont absents ou désactivés. Une écriture Firestore peut réveiller les triggers TEST déjà déployés; l'outil exige donc une attestation explicite, mais ne modifie lui-même aucune Function ni aucun scheduler.
2. Créer manuellement deux identités : source avec `roles/datastore.viewer` et `roles/storage.objectViewer` limités aux buckets utiles; destination avec `roles/datastore.user` et `roles/storage.objectAdmin` limités aux deux buckets TEST. Ne créer aucune clé automatiquement.
3. Vérifier que le super-admin TEST apparaît dans Firebase Auth et `users/{uid}` avec `status=active` et `capabilities.admin.full=true`.
4. Exécuter le dry-run Firestore, puis le dry-run avec Storage, et conserver les compteurs.
5. Faire valider humainement le manifeste, les volumes et les préfixes Storage.
6. Exécuter l'application. L'outil fait des upserts idempotents par ID; il ne vide aucune collection TEST et ne supprime pas « RECETTE TEST - NE PAS UTILISER ».
7. Reconstruire dans TEST, dans cet ordre : agrégats/rosters engagements, calendriers, index nageurs, TOP, DTN, puis publications publiques TEST.
8. Exécuter la vérification post-sync et la recette manuelle. Renouveler les index/caches jusqu'à ce que chaque Function paginée indique sa fin.

## Commandes

Dry-run Firestore par défaut :

```bash
node tools/sync-firebase-prod-to-test.js \
  --source-credential /chemin/prod-readonly.json \
  --destination-credential /chemin/test-writer.json
```

Dry-run incluant l'inventaire Storage : ajouter `--include-storage`.

Application réelle — **à ne lancer qu'après validation humaine** :

```bash
node tools/sync-firebase-prod-to-test.js \
  --source-credential /chemin/prod-readonly.json \
  --destination-credential /chemin/test-writer.json \
  --include-storage \
  --apply \
  --confirmation copy-livepalmes-readonly-to-livepalmes-test \
  --automation-confirmation email-and-schedulers-disabled-in-livepalmes-test
```

Le checkpoint `.firebase-test-data-sync-checkpoint.json` est mis à jour après chaque page appliquée. Relancer la même commande reprend les collections paginées. Pour un nouvel instantané complet, archiver ou supprimer manuellement ce checkpoint local; cela ne supprime aucune donnée Firebase.

Vérification en lecture seule :

```bash
node tools/verify-firebase-test-data-sync.js \
  --source-credential /chemin/prod-readonly.json \
  --destination-credential /chemin/test-writer.json
```

Le rapport donne les nombres PROD/TEST et l'écart pour clubs, nageurs, performances, compétitions, résultats, officiels/personnes et records/MPF. Il liste aussi les ressources volontairement différentes, les UID admin TEST protégés et toute référence PROD résiduelle.

## Effet exact sur TEST

L'application remplace par upsert les documents portant le même chemin dans les 15 collections `COPY` et leurs sous-collections non exclues. Elle ajoute les documents absents. Elle ne supprime aucun document TEST, aucun compte Auth, aucun profil `users`, aucun grant, aucun audit et aucun job. Les objets des trois préfixes Storage sont remplacés lorsqu'ils portent le même nom, sans suppression des objets TEST supplémentaires.

Les volumes ne peuvent pas être estimés statiquement depuis le dépôt. Le dry-run parcourt les collections et affiche un compteur par page et par chemin; il constitue l'estimation obligatoire avant toute application.
