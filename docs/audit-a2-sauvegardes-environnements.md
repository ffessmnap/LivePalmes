# Audit A2 — sauvegardes et environnements

<!-- description: Clôture initiale A2 le 16 novembre 2026 et complément de récupération TOTP autorisé le 18 novembre, en préparation : copies NAP et Firebase récupérées, planifications et alertes actives, environnements établis et anciens PDF laissés à la fédération selon décision d’Antoine. -->

## État et périmètre

[A2 #893](https://github.com/ffessmnap/LivePalmes/issues/893) est **terminé sur le périmètre convenu** : copies NAP et Firebase PROD/TEST vers Drive, récupération isolée prouvée, rendez-vous du mardi à 2 h Paris et alertes d’échec/absence activés. Le 16 novembre, Antoine exclut explicitement les anciens PDF NAP du travail et des alertes, en indiquant que la fédération les sauvegarde. Cette couverture fédérale est déclarée par Antoine, sans audit indépendant ou récupération de ces PDF dans ce chantier. Aucun ancien fichier n’a été modifié ou supprimé.

Les cibles des environnements sont documentées : Firebase/Storage distincts, mais base NAP native partagée entre TEST et PROD. La première échéance automatique du nouveau dispositif est le 17 novembre 2026 ; aucun succès futur de planification n’est inventé. Les résultats de copie, récupération et contrôle manuel sont décrits ci-dessous.

Le diagnostic initial ci-dessous a été réalisé sans changement distant. Après accord explicite, le complément décrit plus bas a créé les accès limités et réalisé des copies réelles, avec récupération uniquement en conteneurs jetables. Aucun déploiement applicatif ou changement de donnée source. Les secrets utilisés pour les seuls contrôles de connexion restent en mémoire et ne sont ni affichés ni archivés. Aucun autre chantier de l’audit n’est lancé.

## Complément TOTP autorisé le 18 novembre — préparation

Le parcours Microsoft Authenticator A3 introduit un cas absent de la première qualification A2. Dans le vrai importeur de l'émulateur verrouillé `firebase-tools 15.24.0`, trois comptes fictifs en mémoire donnent : mot de passe importé, SMS importé, TOTP refusé (« Second factor not supported. »). Aucun réseau, compte réel ou copie réelle pour cette reproduction ; le test local Node `24.16.0` ne remplace pas le futur essai Docker au profil CI exact. Le [type Google `MfaEnrollment.TotpInfo`](https://docs.cloud.google.com/identity-platform/docs/reference/rest/v1/MfaEnrollment) n'exporte pas de champ de clé TOTP. Une récupération de ses seules métadonnées ne reconstitue donc pas les codes de sécurité après reconstruction complète des comptes. La [documentation de l'émulateur](https://firebase.google.com/docs/emulator-suite/connect_auth) décrit les facteurs SMS ; aucune prise en charge TOTP n'est déduite des tests initiaux.

Après un refus automatique de l'édition de ce nouveau périmètre A2, Antoine accepte explicitement la proposition : « Oui, préparer et livrer après les contrôles », conversation `01a1e61a-8f79-7323-8f08-03b3fa948a75`, message `01a1ee97-f4a7-7210-ba5a-a747a8e4c976`, réponse `call_b55c3f5bf4eb4347a911e75a98a9b168/0`. L'accord couvre préparation, CI, essais fictifs, puis mise en service et nouvelles copies chiffrées de validation TEST/PROD vers le même dossier Drive A2 après contrôles réussis. Les seules restaurations permises par ce lot restent les émulateurs isolés. Aucun compte réel ou facteur source modifié, aucune nouvelle clé/permission/suppression ni e-mail de test. La commande refusée n'avait rien exécuté ; l'accord précis précède les modifications.

Le correctif conserve le bundle et l'archive source intégraux. Dans la cible d'essai jetable seulement, le plan importe les comptes de base et les SMS, avec la comparaison canonique A2 existante. Les métadonnées TOTP sont récupérées séparément dans un fichier privé du tmpfs et comparées par empreinte ; elles ne sont jamais déclarées importées comme identifiants TOTP. Le plan n'altère pas le tableau source, refuse les types/facteurs inconnus, les champs TOTP futurs non pris en charge, doublons et métadonnées invalides. Les vérifications Firestore, générations/contenus/métadonnées de fichiers, chiffrement et téléchargement Drive restent conservées. Aucun secret de génération TOTP n'est demandé ou collecté.

Le reçu de récupération **schema 2** distingue `exportedDataRestoredAndCompared` de l'ancien booléen `restoredAndCompared` : ce dernier vaut false lorsqu'un TOTP exige une réassociation. Il contient portée, compteurs SMS/TOTP, empreintes de l'identité source, de l'import et des métadonnées, `totpCredentialsRecovered: false` et l'étape opérateur requise. Le parent recalcule les valeurs attendues et refuse tout reçu annonçant une récupération TOTP automatique, masquant ses comptes ou perdant les métadonnées. Aucun véritable login OAuth/SMS/TOTP n'est prétendu par la récupération de données.

Avant secret ou copie réelle, `trial`/`backup` exige aussi l'accord technique exact `A2_AUTH_RECOVERY_POLICY=A2-TOTP-REENROLEMENT-MANUEL-CONTROLE`. La planification exigera un nouveau reçu schema 2 de même portée, lié au code exact, dossier, projets, archives téléchargées et résultat de récupération. Un ancien reçu schema 1 n'est jamais réétiqueté. Le bundle chiffré reste schema 1 compatible avec les archives conservées ; les clés, destinations, horaires et alertes existants restent inchangés. `fixture` ne reçoit aucun secret, et `check` ne devient pas une copie.

Ordre de mise en service : lot code/tests/documentation complet, CI obligatoire et essai `fixture` du workflow A2 existant sur la branche exacte, cinq comptes fictifs dont un SMS et un TOTP, Docker sans réseau/externe et montages en lecture seule. Ensuite intégration et copie/récupération réelle de validation déjà autorisée, authentification des ZIP/reçus, puis renouvellement explicite de l'accord de portée et de la preuve protégée. Modifier le mécanisme invalide son ancienne empreinte : coordonner ces étapes avant l'échéance périodique, sans déclarer la planification validée entre l'intégration et la nouvelle preuve. Aucun autre droit ou environnement ajouté.

À ce stade : correctif en préparation ; les contrôles CI, Docker, copies réelles et renouvellement de la preuve restent à effectuer. Le mécanisme de main et ses variables ne sont pas modifiés par la seule branche. Après une vraie restauration de comptes, le responsable devra vérifier les identités et organiser une nouvelle association TOTP avant de rétablir les accès privilégiés ; cette opération réelle nécessite son propre accord de cible. La fiche papier permet toujours de reconstruire les codes d'un téléphone perdu lorsque le facteur du compte d'origine existe. La recette personnelle MFA PROD demeure reportée ; aucune obligation MFA activée.

## Diagnostic initial avant le complément autorisé

| Périmètre | Constat réel | Conclusion A2 |
| --- | --- | --- |
| NAP/MySQL | Copie des 76 tables, téléchargement Drive, restauration MySQL isolée et comparaison intégrale réussis. Horaire mardi 2 h Paris, alertes actives et test mail reçu. | Lot sauvegarde NAP terminé ; premier lancement périodique futur non encore observé. |
| Firestore PROD et TEST | Une base `(default)` dans chaque projet, région `eur3`. Aucune planification native de sauvegarde et aucune sauvegarde native listée. PITR étendu désactivé ; rétention technique affichée : 3 600 s. Protection contre suppression de la base désactivée. | Aucune copie complète restaurable prouvée ; complément nécessaire. La fenêtre technique d’une heure n’est pas une sauvegarde indépendante. |
| Comptes Firebase Authentication | Projets de connexion distincts dans les configurations servies et déployées. Aucun export périodique complet ou essai de récupération des comptes identifié dans les outils et preuves examinés. | Récupération des identités et des éléments techniques nécessaires aux accès à couvrir ; sauvegarder la collection Firestore `users` ne sauvegarde pas Firebase Authentication. |
| PDF et fichiers Firebase/Storage | Quatre buckets applicatifs distincts, protection après suppression de 604 800 s (sept jours), sans versionnement explicite activé. Pas de copie indépendante ou d’essai de récupération identifié. | Protection partielle ; ne pas la présenter comme une sauvegarde complète testée. |
| Documents référencés dans NAP | 3 083 champs `documents.location` examinés dans une lecture bornée : 3 054 références vers `nap.ffessm.fr`, 25 vers `firebasestorage.googleapis.com`, quatre vides. | Le dump SQL conserve les liens, pas les fichiers externes. Sauvegarde des originaux NAP à prouver chez l’hébergeur ou par une copie indépendante. Les nombres sont des références, pas un décompte de fichiers uniques. |
| Code et retour arrière | Sources conservées dans Git. Dernière publication réussie du 15 novembre avec archive de code chiffrée non expirée, vérification d’ouverture/comparaison avant publication et preuves après publication. | Retour arrière du code documenté pour la fenêtre de conservation ; ne couvre pas les données métier. |
| Environnements | Projets Firebase/Hosting/Storage distincts, cibles publiques contrôlées et 119 Functions PROD / 121 TEST inventoriées sans pagination restante. Deux connexions SQL aboutissent au même serveur et à la même base `nage-palmes`. | Correspondance établie ; TEST n’isole pas les écritures NAP natives. |

Les garanties de sauvegardes extérieures non accessibles dans cet audit ne sont pas supposées absentes : elles ne sont simplement pas prouvées. Les dossiers Drive de sauvegardes ponctuelles de fusions/corrections ne remplacent pas une archive complète périodique. Aucun message n’a été envoyé à un prestataire ou à un autre intervenant.

## Correspondance des usages avec leurs cibles

| Usage | Production | TEST | Limite vérifiée |
| --- | --- | --- | --- |
| Site et Functions | `livepalmes.web.app`, Functions `europe-west1-livepalmes` | `livepalmes-test.web.app`, Functions `europe-west1-livepalmes-test` | Le module d’environnement servi par chaque site correspond au fichier de main ; sélection du projet contrôlée hors réseau après comparaison du contenu. |
| Auth et Firestore | Projet `livepalmes`, base `(default)` | Projet `livepalmes-test`, base `(default)` | Projets séparés ; aucune copie de comptes ni lecture de document métier effectuée pendant cet audit. |
| Fichiers applicatifs | `livepalmes.firebasestorage.app` | `livepalmes-test.firebasestorage.app` | Les fichiers déposés sont distincts, mais les liens contenus dans NAP peuvent désigner des documents externes ou d’un autre espace. |
| Fichiers publics | `livepalmes-public-data-718081132564` | `livepalmes-test-public-data-206080168534` | Buckets distincts ; la racine publique TEST est vide au contrôle borné complet. |
| Tables NAP natives, portail, performances, Records/MPF | Base `nage-palmes` | **Même base réelle** | Une modification native depuis TEST peut modifier les données utilisées en PROD ; toute écriture réelle conserve son accord spécifique. |
| Nouveau Direct | Tables NAP `livepalmes_direct_*`, lignes `environment=production` | Mêmes tables, lignes `environment=test` | Séparation logique du Direct dans une base partagée ; les compétitions et référentiels natifs joints restent partagés. |

Sources de configuration : `.firebaserc`, `assets/livepalmes-environment.js`, `functions/livepalmes-environment.js`, `functions/nap-connection.js`, `functions/nap-portal-pool.js` et `functions/nap-direct-store.js`. Le code n’a pas été modifié. Les deux requêtes SQL ne lisent que `DATABASE()`, `@@server_uuid` et `VERSION()` ; les UUID sont comparés en mémoire sans publication de leurs valeurs.

Les références au secret SQL sont propres au projet de chaque Function : 99 Functions PROD liées à `LIVEPALMES_NAP_PASSWORD` dans `livepalmes`, 100 TEST dans `livepalmes-test`. Deux noms de secrets distincts ne prouvent donc pas deux bases distinctes ; les connexions ont été vérifiées.

Cloud Scheduler `europe-west1` : seule tâche listée, clôture horaire des compétitions, active en PROD et en pause en TEST. Aucune tâche de sauvegarde Firebase n’y est observée. Cette lecture est régionale ; elle ne constitue pas un inventaire des éventuels services externes de l’hébergeur NAP.

## Volumes constatés sans lire les contenus

Mesures Google Monitoring du 16 novembre à 12 h 15–12 h 20 Paris, réponses complètes après fenêtre de collecte bornée à trente minutes :

| Service | PROD | TEST |
| --- | --- | --- |
| Firestore, données et index | 198 326 810 octets, environ 198 Mo | 85 160 139 octets, environ 85 Mo |
| Bucket applicatif | 88 objets, 13 310 667 octets | 25 objets, 2 488 810 octets |
| Bucket public | 6 objets, 6 644 644 octets | Racine vide au contrôle Storage ; pas de série de volume renvoyée. |

Ces métriques ne sont ni la taille d’un futur export ni un nombre de documents Firestore. Les fichiers techniques de construction Functions sont séparés des données applicatives et ne sont pas additionnés aux PDF.

Préfixes Storage applicatifs observés : `competition-documents/`, `engagements/`, `entry-documents/`, `national-documents/` ; public PROD : `competition-pdfs/`, `performance-public/`. Les noms et contenus des fichiers individuels n’ont pas été parcourus. Les comptes Firebase n’ont pas été exportés ou comptés par lecture de leurs profils.

## Preuves déjà disponibles

- [Copie NAP et récupération initiale 43848399142](https://github.com/ffessmnap/LivePalmes/actions/runs/43848399142), puis [activation et alerte #924](https://github.com/ffessmnap/LivePalmes/pull/924) et [clôture documentaire #925](https://github.com/ffessmnap/LivePalmes/pull/925). Détails, empreintes et limites dans [NAP_SAUVEGARDES.md](NAP_SAUVEGARDES.md).
- [Publication de code réussie 43707826259](https://github.com/ffessmnap/LivePalmes/actions/runs/43707826259) : artefact `production-code-backup` id `14159416061`, ZIP 1 328 613 octets, SHA-256 `00b53fd0675ad3285f07e2ac6455394c5079047923939713542a60f131c4b015`, conservé jusqu’au 29 novembre 2026 à 12 h 14 Paris ; artefacts `production-after` et `production-hosting-after` également présents. Métadonnées relues sans ouvrir l’archive. Le workflow vérifie ouverture et comparaison avant mutation. Il chiffre avec la clé privée du compte technique de publication : la disponibilité de cette clé conditionne l’ouverture des anciennes copies, notamment en cas de rotation. Ne pas la confondre avec la clé NAP séparée.
- Métadonnées d’administration lues : listes complètes Firestore des deux projets, plannings, sauvegardes tous lieux, politiques des buckets, Functions de la région déployée, tâches Cloud Scheduler de cette région et racines Storage. Les métadonnées Firestore sont les observations littérales suivantes :

```json
{
  "observedAtUtc": "2026-11-16T11:18:16Z",
  "projects": ["livepalmes", "livepalmes-test"],
  "databasePerProject": "(default)",
  "locationId": "eur3",
  "backupSchedulesPerProject": [],
  "nativeBackupsPerProject": [],
  "pointInTimeRecoveryEnablement": "POINT_IN_TIME_RECOVERY_DISABLED",
  "versionRetentionPeriod": "3600s",
  "deleteProtectionState": "DELETE_PROTECTION_DISABLED",
  "applicationStorageSoftDeleteSeconds": 604800,
  "applicationStorageVersioningEnabled": false
}
```

Les relevés techniques sans secrets sont conservés dans le point de reprise privé `tmp/a2-nap-backup/REPRISE.md` et ses fichiers `audit-*.json`. Ils ne contiennent ni contenu de fichier, ni profil utilisateur, ni URL de document individuelle. Le présent bilan conserve les faits nécessaires à la revue sans dépendre de l’ouverture d’un compte Google.

## Pourquoi TEST et les archives de publication ne suffisent pas

`tools/firebase-test-data-sync-manifest.js` et `tools/sync-firebase-prod-to-test.js` décrivent une synchronisation choisie de PROD vers TEST, avec exclusions et remplacements. Auth, profils de droits, files de mails et journaux ne sont pas une copie complète de secours. Ne pas exécuter ces outils pendant cet audit ni utiliser TEST pour écraser les données courantes en guise de restauration.

Le retour arrière des publications couvre code/configuration/Hosting. Une archive de code ne reconstitue pas les documents Firestore, les comptes Firebase ou les PDF. La protection Storage de sept jours ne prouve pas une récupération au-delà de cette période ou après perte du projet. Voir [les protections Storage](https://docs.cloud.google.com/storage/docs/protection-backup-recovery-overview), [les sauvegardes Firestore](https://firebase.google.com/docs/firestore/backups) et [l’export/import des comptes](https://firebase.google.com/docs/cli/auth).

## Historique de préparation Firebase autorisé — 16 novembre

Antoine autorise explicitement les copies chiffrées de Firestore, comptes et fichiers Firebase PROD/TEST et anciens documents NAP vers Drive ; compte dédié en lecture/export et rôle Contributeur dans le seul dossier (ajout/modification/partage), clés dans les coffres Google/GitHub, espace privé temporaire et essais dans des cibles jetables a2-restore-*, nettoyage limité à ces cibles. Les données actuelles restent inchangées ; les éventuels frais sont présentés avant engagement. Cet accord remplace l’attente d’accord de périmètre décrite par le diagnostic initial, sans inventer de preuve de copie manquante.

Comptage plafonné réalisé après présentation de son coût inférieur au centime : **16 511 documents PROD et 1 515 TEST**. La sélection Firestore REST `allDescendants: true` sans identifiant de collection couvre les groupes et sous-collections, sans requête par document. Une agrégation plafonnée fixe le nombre attendu et le `readTime`, réutilisé pour toutes les pages ordonnées sur `__name__`, sans offset. La copie s’arrête si compte, unicité, délai ou volume divergent. Aucune option native payante, aucun nouveau bucket de transit ou nouvelle base Google ne sont nécessaires pour cette méthode. Aux volumes constatés, coût attendu de quelques centimes par passage selon lectures/transferts et quotas existants, hors quota Drive ; aucun montant mensuel garanti en cas de croissance.

Lors de la préparation initiale, première partie préparée dans `a2-firebase-backup.yml` et `tools/a2-firebase-*.js`, configuration **désactivée**. Modes : `fixture` par défaut sans secret/donnée réelle, `check` de prérequis, puis `trial` réel manuel avec confirmation exacte `A2-COPIES-ET-RECUPERATION-ISOLEE-AUTORISEES`. `backup` exige activation et preuve compatible en planification. Horaire préparé mardi 2 h Paris, distinct de la copie SQL existante et sans ses verrous. Ne pas activer tant que la récupération réelle depuis Drive n’est pas prouvée.

Chaque projet est archivé séparément en JSON typé/gzip/AES-256-GCM, format authentifié existant réutilisé ; aucune donnée en clair sur le disque hôte. Les comptes comprennent identités, empreintes/sels et paramètres de récupération, droits personnalisés et configurations des fournisseurs ; un hash expurgé, un tenant non couvert ou une pagination incomplète bloque. La configuration d’un fournisseur externe est sauvegardée, mais aucun envoi d’e-mail ou véritable login OAuth n’est exécuté pendant la récupération. Les fichiers sont listés par pages, téléchargés sur leur génération inventoriée, contrôlés par taille, MD5/CRC32C et SHA-256, avec métadonnées nécessaires ; aucun objet n’est remplacé ou effacé.

Plafonds par projet : 50 000 documents, 50 000 comptes, 256 Mio de données Firestore, 256 Mio de fichiers, 1 000 objets par bucket, 64 Mio par fichier, 512 Mio de JSON avant compression. Un dépassement arrête la copie, sans sauvegarde partielle déclarée complète. Budget courant : environ 18 026 documents plus quelques pages d’agrégation et d’Auth ; GET de contenu par fichier requis pour la copie, sans requête métier par ligne. Les téléchargements de fichiers et la copie de maintenance restent exhaustifs et bornés, hors parcours interactif.

Toute copie réelle doit être retéléchargée depuis Drive, déchiffrée en mémoire et restaurée dans les émulateurs Firestore/Auth/Storage d’un conteneur Docker **sans réseau, sans port publié, sans clé Google et sans montage hôte inscriptible**. Code/dépendances seuls montés en lecture ; données et logs en mémoire/tmpfs, conteneur supprimé ensuite. Image et outils Node/Java reprennent les pins CI existants ; le CLI émulateur reprend le lockfile existant. Documents et types, comptes et champs de récupération, octets et métadonnées des fichiers sont comparés. Les dates/générations gérées par le service et les sessions actives ne sont pas promises identiques après restauration ; les champs de données archivés restent intacts.

Le premier essai fictif 43868234553 s’est arrêté avant émulateurs et authentification Google : ubuntu-latest résolvait vers Ubuntu 26.04, dont le moteur Docker expose une identité différente de celle attendue par le runtime. Le nouveau workflow reprend Ubuntu 24.04 déjà validé, sans retirer le contrôle d’identité OCI. Le test fictif manuel est isolé dans un job sans environnement ni secret, utilisable sur une branche ; contrôles et copies réelles restent réservés à main dans leur environnement protégé.

Qualification fictive réussie sur la version de code `021e8eeb` : [essai 43872717569](https://github.com/ffessmnap/LivePalmes/actions/runs/43872717569), avec deux documents dont une sous-collection orpheline, entier 64 bits, horodatage à la microseconde, octets, NaN, nombre décimal, géopoint et référence, trois comptes et un fichier binaire. Le REST de cet émulateur transforme le zéro négatif en zéro positif : ce cas reste conservé dans les archives et dans la comparaison stricte ; une donnée réelle de ce type ferait échouer la qualification plutôt que déclarer une récupération identique. Les diagnostics de contenu sont limités au mode fictif sans identifiant Google ; les copies réelles ne les impriment jamais. La clé du compte dédié est conservée dans Secret Manager et GitHub sans fichier local en clair ; coût présenté avant création : environ 0,06 USD/mois hors quota gratuit pour la nouvelle version du coffre. Le compte ne peut pas lire ce coffre.

Le reçu ne contient que compteurs, empreintes et références des archives chiffrées. La preuve d’activation lie sources, chiffrement, configuration hors seul interrupteur enabled, workflow et outils de récupération. Aucune autorisation de restaurer dans les services actuels ne découle de ce programme. L’extension des alertes est désormais intégrée et vérifiée ; les anciens PDF NAP sont exclus selon la décision explicite d’Antoine décrite ci-dessous.

## Accès aux anciens originaux NAP — diagnostic borné

Le 16 novembre, un inventaire local des en-têtes des 3 002 URL NAP uniques a reçu 238 réponses 404, 2 763 refus 403 et une réponse 400. Les six sondes initiales avaient pourtant donné cinq PDF disponibles : ces refus ne prouvent pas la disparition des fichiers. Même la racine du domaine est ensuite refusée depuis ce poste ; aucune réponse HTML de refus ou contenu PDF n’a été conservé. Index individuel conservé uniquement chiffré, aucune URL publiée. Ce contrôle ne constitue aucune sauvegarde des originaux.

Pour vérifier si le refus dépendait du poste, `a2-nap-documents.yml` a réalisé un sondage manuel sur main depuis le serveur GitHub de sauvegarde : une lecture SQL indexée plafonnée à 4 001 références, connexion fermée avant HTTP, déduplication et six requêtes HEAD espacées, sans verrou, contenu de fichier, Drive ou nouvelle permission. HTTPS et domaine nap.ffessm.fr stricts, redirection externe refusée. Le reçu ne contient que compteurs, tailles et statuts. Le [sondage 43877858381](https://github.com/ffessmnap/LivePalmes/actions/runs/43877858381), reçu authentifié, a obtenu six refus 403. Après la décision d’Antoine de laisser ces anciens PDF à la fédération, ce workflow de diagnostic a été **désactivé manuellement**. Aucun archivage ou alerte sur ces anciens PDF n’est préparé, actif ou attendu.

## Essai réel Firebase réussi et activation confirmée

[Essai 43875547237](https://github.com/ffessmnap/LivePalmes/actions/runs/43875547237) réussi sur main `a03e4a220719573ac2acd3986afa22f97a8fdae5`, après #928 et CI PR 43873989399/main 43874723632 réussies. Durée totale du run : **3 min 25 s**, du 16 novembre 13:25:05 à 13:28:30 UTC ; elle ne représente pas tout le délai de préparation et de vérification.

| Projet | Documents récupérés | Comptes récupérés | Fichiers récupérés | Archive chiffrée |
| --- | ---: | ---: | ---: | ---: |
| PROD livepalmes | 16 650 | 1 008 | 104 | 21 540 403 octets |
| TEST livepalmes-test | 1 515 | 2 | 25 | 4 403 050 octets |

Chaque archive a été déposée dans Sauvegardes NAP, retéléchargée, déchiffrée en mémoire et récupérée/comparée dans les émulateurs sans réseau. Reçu authentifié par provenance main/workflow/attempt et digest ZIP, empreinte des outils recalculée depuis les blobs Git exacts. Métadonnées Drive fraîches vérifiées à 13:32 UTC : bon dossier, tailles et MD5 conformes. Les **25 références Firebase de NAP sont toutes couvertes** : contrôle supplémentaire à 13:41 UTC directement dans les deux archives chiffrées authentifiées, SHA-256 vérifiés puis déchiffrement uniquement en mémoire ; aucun objet manquant ou bucket inconnu. Aucune donnée source modifiée et aucun verrou NAP dans cet essai.

Preuve : empreinte `4adac822764ff6a00531d21ded393f855d3f9df89cd9447bed749c1222c8a64f` ; archive PROD `1GEgjq-NX4a1_F4QHxQePML1HkjFPb6zj`, SHA-256 `d0f136830b04c2ecd13d3a609066b9a5b989f597f761bc59b6dad635660607e6` ; TEST `1ES5g8OKfIPqsyqUdQSW3NnHpqHaOvIdG`, SHA-256 `de3faf760029b90a38419dda57df571fe2caa64e1495f0266873b5aef00a1574`. Clés séparées des copies, aucun accès au coffre de récupération depuis le compte de copie.

La preuve compatible est enregistrée dans l’environnement GitHub a2-firebase-backup limité à main. #929 intégrée sur `902dc3a26a2174243ce51426b621c54ed68af039`, CI PR [43876894394](https://github.com/ffessmnap/LivePalmes/actions/runs/43876894394) et main [43877761560](https://github.com/ffessmnap/LivePalmes/actions/runs/43877761560) réussies. Activation de la variable de dépôt à true après ces contrôles. À 13:48 UTC, les trois interrupteurs NAP/Firebase/alertes sont relus à true ; trois environnements limités à main, workflows de copie et d’alerte actifs, diagnostic des anciens PDF désactivé. Garde de planification vérifiée hors réseau depuis les blobs Git main exacts et les preuves authentiques ; preuve SQL initiale également toujours compatible. Toute copie future reprend téléchargement et récupération/comparaison ; modifier les sources du mécanisme invalide la preuve de planification. La surveillance mail Firebase est liée au même interrupteur, avec reçus distincts de SQL NAP. Pas de second essai réel nécessaire pour ce seul interrupteur exclu de l’empreinte.

## Décision de clôture et limites conservées

- NAP et Firebase : copies indépendantes chiffrées, téléchargement et récupération réellement vérifiés, clés conservées séparément et accès bornés au périmètre approuvé. Les données historiques présentes sont incluses ; aucune sélection silencieuse des seules collections courantes.
- Alertes : SQL NAP et Firebase contrôlés séparément. [Contrôle final 43878725407](https://github.com/ffessmnap/LivePalmes/actions/runs/43878725407) réussi sur 902dc3a2 pour les deux familles, mode check, aucun envoi de mail ; prochaine échéance non encore due. Le test SMTP réel antérieur 43854232563 avait été reçu dans la boîte d’Antoine. Adresse fixe antoine.fauveau@nap-ffessm.fr ; aucun nouveau test réel ou message tiers.
- Anciens PDF NAP : Antoine déclare leur sauvegarde assurée par la fédération et décide de ne pas les traiter ni créer d’alerte. Il ne s’agit pas d’une preuve technique fédérale obtenue dans cet audit. Quatre références vides restent inchangées. Le code de copie et les alertes n’interrogent pas ces anciennes URL : leur indisponibilité ne déclenche aucune alerte de ce programme.
- Code, règles et index versionnés : circuit Git/publication existant conservé, sans déploiement applicatif dans ce lot. Les buckets techniques de construction sont hors de la copie de données. Aucune option native de sauvegarde/PITR ou protection contre suppression n’a été activée ; les copies Drive choisies ne sont pas un retour à n’importe quelle minute.

En cas de récupération, les changements depuis la dernière copie utilisable peuvent être perdus : jusqu’à une semaine en fonctionnement hebdomadaire normal, davantage si un incident reste non traité. Pas d’atomicité globale entre NAP, Auth, Firestore et fichiers ; le readTime Firestore est fixé par projet et les générations des fichiers sont vérifiées. Les sessions de connexion et dates/générations gérées par les services ne sont pas promises identiques après récupération ; aucun véritable login OAuth externe ou envoi d’e-mail n’a été tenté pendant l’essai. La durée de 3 min 25 s mesure l’essai complet Firebase, pas un délai garanti de remise en service de toutes les applications.

Aucune purge Drive automatique : copies conservées sans effacement historique, artefacts chiffrés GitHub supplémentaires conservés quatorze jours. Le compte SQL existant conserve ses droits étendus historiques ; aucun nouveau droit SQL. Sauvegarde et contrôle restent sur GitHub : une panne générale de GitHub peut retarder les deux ; une panne SMTP empêche l’envoi. Le contrôle d’absence est prévu quotidiennement à 3 h 17 Paris, après une heure de grâce suivant le rendez-vous de 2 h. Les horaires peuvent être retardés par la plateforme.

La fenêtre traçable du diagnostic initial (11:18 UTC) au contrôle d’activation (13:48 UTC) couvre environ 2 h 30, avec analyse, préparation des accès/outils, corrections des essais fictifs et attentes CI ; ce n’est pas la durée d’une copie. La préparation de la sauvegarde SQL et du mail avait été réalisée auparavant et conserve ses propres preuves. La clôture documentaire regroupe les résultats sans second export, nouveau mail ou publication applicative.

## Budget et vérifications du diagnostic initial

Aucune lecture de document Firestore ou profil Auth ; aucun contenu Storage/Drive téléchargé ; aucune invocation métier. Deux requêtes SQL de métadonnées pour comparer les cibles ; inventaire des domaines par lecture sur index `documents.id`, d’abord 501 puis 3 083 champs URL dans une limite de 4 001, avec traitement en mémoire et publication des seuls domaines/compteurs. La seconde passe vérifie aussi les valeurs vides ; les comptages intermédiaires ne servent pas de preuve finale. Aucun nom de personne ou de fichier individuel publié.

Métadonnées Google paginées ou bornées : au plus dix bases par projet, 200 Functions par projet, 100 jobs par région/projet, 100 entrées par racine Storage ; absence de pagination restante contrôlée sur les inventaires retenus. Les premières métriques sur trois jours étaient tronquées : elles sont remplacées par les réponses complètes sur trente minutes, 1 000 points maximum par appel. Deux fichiers publics de configuration téléchargés et comparés à main avant contrôle de leur sélection de projet. Les recherches Drive et de courrier n’ont pas fourni de preuve complète supplémentaire ; aucun message ni pièce jointe n’a été envoyé ou téléchargé.

Modification documentaire seulement : descriptions, UTF-8, cohérence des liens et CI obligatoire. Aucune recette applicative ou publication TEST/PROD déclenchée pour ce bilan.
