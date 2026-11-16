# Audit A2 — sauvegardes et environnements

<!-- description: Vérification réelle du 16 novembre 2026 : sauvegarde NAP prouvée, cibles TEST/PROD établies, protections Firebase partielles et conditions restant nécessaires à la clôture A2. -->

## État et périmètre

[A2 #893](https://github.com/ffessmnap/LivePalmes/issues/893) reste **ouvert**. La sauvegarde NAP est opérationnelle ; le chantier complet n’est pas encore clôturable. Le 16 novembre, Antoine demande de poursuivre les vérifications restantes jusqu’à pouvoir clôturer A2, avec une explication simple. Les constatations ci-dessous proviennent de lectures réalisées entre 12 h 18 et 12 h 42, heure de Paris, sur la version `503cf99253e1dc903272f4cafc87318483fdc13b`.

Cette reprise ne modifie aucune donnée ou configuration distante, ne déclenche aucun export, import, restauration, mail, migration ou déploiement. Les secrets utilisés pour les seuls contrôles de connexion restent en mémoire et ne sont ni affichés ni archivés. Aucun autre chantier de l’audit n’est lancé.

## Ce qui est prouvé et ce qui manque

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

## Complément Firebase autorisé — préparation du 16 novembre

Antoine autorise explicitement les copies chiffrées de Firestore, comptes et fichiers Firebase PROD/TEST et anciens documents NAP vers Drive ; compte dédié en lecture/export et rôle Contributeur dans le seul dossier (ajout/modification/partage), clés dans les coffres Google/GitHub, espace privé temporaire et essais dans des cibles jetables a2-restore-*, nettoyage limité à ces cibles. Les données actuelles restent inchangées ; les éventuels frais sont présentés avant engagement. Cet accord remplace l’attente d’accord de périmètre décrite par le diagnostic initial, sans inventer de preuve de copie manquante.

Comptage plafonné réalisé après présentation de son coût inférieur au centime : **16 511 documents PROD et 1 515 TEST**. La sélection Firestore REST `allDescendants: true` sans identifiant de collection couvre les groupes et sous-collections, sans requête par document. Une agrégation plafonnée fixe le nombre attendu et le `readTime`, réutilisé pour toutes les pages ordonnées sur `__name__`, sans offset. La copie s’arrête si compte, unicité, délai ou volume divergent. Aucune option native payante, aucun nouveau bucket de transit ou nouvelle base Google ne sont nécessaires pour cette méthode. Aux volumes constatés, coût attendu de quelques centimes par passage selon lectures/transferts et quotas existants, hors quota Drive ; aucun montant mensuel garanti en cas de croissance.

Première partie préparée dans `a2-firebase-backup.yml` et `tools/a2-firebase-*.js`, configuration **désactivée**. Modes : `fixture` par défaut sans secret/donnée réelle, `check` de prérequis, puis `trial` réel manuel avec confirmation exacte `A2-COPIES-ET-RECUPERATION-ISOLEE-AUTORISEES`. `backup` exige activation et preuve compatible en planification. Horaire préparé mardi 2 h Paris, distinct de la copie SQL existante et sans ses verrous. Ne pas activer tant que la récupération réelle depuis Drive n’est pas prouvée.

Chaque projet est archivé séparément en JSON typé/gzip/AES-256-GCM, format authentifié existant réutilisé ; aucune donnée en clair sur le disque hôte. Les comptes comprennent identités, empreintes/sels et paramètres de récupération, droits personnalisés et configurations des fournisseurs ; un hash expurgé, un tenant non couvert ou une pagination incomplète bloque. La configuration d’un fournisseur externe est sauvegardée, mais aucun envoi d’e-mail ou véritable login OAuth n’est exécuté pendant la récupération. Les fichiers sont listés par pages, téléchargés sur leur génération inventoriée, contrôlés par taille, MD5/CRC32C et SHA-256, avec métadonnées nécessaires ; aucun objet n’est remplacé ou effacé.

Plafonds par projet : 50 000 documents, 50 000 comptes, 256 Mio de données Firestore, 256 Mio de fichiers, 1 000 objets par bucket, 64 Mio par fichier, 512 Mio de JSON avant compression. Un dépassement arrête la copie, sans sauvegarde partielle déclarée complète. Budget courant : environ 18 026 documents plus quelques pages d’agrégation et d’Auth ; GET de contenu par fichier requis pour la copie, sans requête métier par ligne. Les téléchargements de fichiers et la copie de maintenance restent exhaustifs et bornés, hors parcours interactif.

Toute copie réelle doit être retéléchargée depuis Drive, déchiffrée en mémoire et restaurée dans les émulateurs Firestore/Auth/Storage d’un conteneur Docker **sans réseau, sans port publié, sans clé Google et sans montage hôte inscriptible**. Code/dépendances seuls montés en lecture ; données et logs en mémoire/tmpfs, conteneur supprimé ensuite. Image et outils Node/Java reprennent les pins CI existants ; le CLI émulateur reprend le lockfile existant. Documents et types, comptes et champs de récupération, octets et métadonnées des fichiers sont comparés. Les dates/générations gérées par le service et les sessions actives ne sont pas promises identiques après restauration ; les champs de données archivés restent intacts.

Le reçu ne contient que compteurs, empreintes et références des archives chiffrées. La preuve d’activation lie sources, chiffrement, configuration hors seul interrupteur enabled, workflow et outils de récupération. Aucune autorisation de restaurer dans les services actuels ne découle de ce programme. L’archivage des originaux NAP et l’extension des alertes au complément restent des étapes distinctes à terminer avant clôture A2 ; la partie Firebase ne suffit pas à fermer l’issue.

## Complément concret à préparer et autoriser avant clôture

1. **Firestore et comptes de connexion des deux projets** : prévoir une copie complète restaurable, incluant les types/références et paramètres nécessaires, ainsi que les identités et éléments techniques permettant de récupérer les accès. Préserver les données historiques encore présentes, sans sélection silencieuse des seules collections jugées courantes. Activer aussi la protection contre suppression des bases si Antoine valide cette modification de configuration.
2. **Fichiers Firebase** : copie indépendante des quatre buckets applicatifs, avec contenus et métadonnées nécessaires à leur récupération. Distinguer espace applicatif et espace public ; les archives ne sont jamais rendues publiques. Les buckets techniques de construction sont hors de cette copie de données.
3. **Originaux NAP** : obtenir une preuve datée de sauvegarde/restauration des fichiers chez l’hébergeur, ou préparer leur archivage indépendant à partir des références NAP, sans modifier les originaux. Inventorier et dédupliquer avant tout transfert ; quatre références vides ne sont ni corrigées ni supprimées sans besoin métier validé. Disponibilité et volume des 3 054 références externes restent à vérifier ; aucun échec de fichier n’est inventé.
4. **Essai de récupération** : récupérer les copies réellement stockées, vérifier les empreintes, reconstruire dans une cible isolée et comparer. Aucun import dans les bases `(default)`, Auth ou buckets actuels. Les nouvelles cibles de restauration, droits de lecture/export et de dépôt, conservation des clés et coût d’usage doivent être présentés avant toute opération réelle ou activation.
5. **Exploitation** : réutiliser le principe de copies chiffrées, clé séparée et alertes mail, sans étendre silencieusement les droits du compte NAP existant. Ne pas supprimer d’archive historique. Documenter perte possible depuis la dernière copie, délai réellement mesuré de récupération et limites ; aucune promesse de restauration globale atomique NAP/Firebase/tiers.

Une copie Drive maîtrisée comme pour NAP et les sauvegardes natives Firestore sont deux possibilités techniques ; le choix doit conserver une procédure de récupération effectivement testée. Les sauvegardes natives et les exports/restaurations Firestore entraînent des coûts d’usage. Un export est facturé en lectures par document, une importation en écritures : aucun tarif ou montant global n’est inventé avant dimensionnement. Voir [la facturation Firestore](https://firebase.google.com/docs/firestore/pricing) et [l’export/import](https://firebase.google.com/docs/firestore/manage-data/export-import).

La demande de vérification actuelle autorise ce diagnostic et sa documentation. Elle n’est pas interprétée comme un accord pour de nouveaux accès IAM, une lecture/export des éléments de récupération des comptes, une copie réelle de toutes les données Firebase, une restauration dans Google ou une nouvelle option payante. Ces actes restent soumis à l’accord précis prévu par AGENTS.md. **Ne pas fermer A2 tant que les copies manquantes et leurs essais ne sont pas prouvés, ou que leurs limites n’ont pas été explicitement arbitrées.**

## Budget et vérifications de cette reprise

Aucune lecture de document Firestore ou profil Auth ; aucun contenu Storage/Drive téléchargé ; aucune invocation métier. Deux requêtes SQL de métadonnées pour comparer les cibles ; inventaire des domaines par lecture sur index `documents.id`, d’abord 501 puis 3 083 champs URL dans une limite de 4 001, avec traitement en mémoire et publication des seuls domaines/compteurs. La seconde passe vérifie aussi les valeurs vides ; les comptages intermédiaires ne servent pas de preuve finale. Aucun nom de personne ou de fichier individuel publié.

Métadonnées Google paginées ou bornées : au plus dix bases par projet, 200 Functions par projet, 100 jobs par région/projet, 100 entrées par racine Storage ; absence de pagination restante contrôlée sur les inventaires retenus. Les premières métriques sur trois jours étaient tronquées : elles sont remplacées par les réponses complètes sur trente minutes, 1 000 points maximum par appel. Deux fichiers publics de configuration téléchargés et comparés à main avant contrôle de leur sélection de projet. Les recherches Drive et de courrier n’ont pas fourni de preuve complète supplémentaire ; aucun message ni pièce jointe n’a été envoyé ou téléchargé.

Modification documentaire seulement : descriptions, UTF-8, cohérence des liens et CI obligatoire. Aucune recette applicative ou publication TEST/PROD déclenchée pour ce bilan.
