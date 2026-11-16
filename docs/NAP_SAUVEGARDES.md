# Sauvegardes NAP vers un Drive partagé

<!-- description: Sauvegarde NAP vers Drive le mardi à 2 h, preuve de récupération et alertes mail pour échec ou absence de copie. -->

## État et périmètre autorisé

Le 16 novembre 2026, Antoine autorise la préparation des sauvegardes de la base NAP vers le Drive NAP chaque mardi à minuit, avec un premier essai de sauvegarde et de récupération avant activation. Après mesure réelle du débit, Antoine autorise explicitement un plafond de dix minutes pour la copie, un nouvel essai maintenant puis les copies du mardi uniquement après récupération réussie ; certaines consultations/modifications NAP peuvent attendre ou échouer temporairement pendant cette fenêtre. L’essai manuel `trial` a réussi le 16 novembre à 11 h 26 (Paris), avant toute activation. La configuration passe maintenant à `enabled: true` après authentification du reçu ; les copies périodiques exigent aussi la variable d’ouverture et cette preuve compatible. L'essai exporte la base réelle sous les verrous bornés décrits ci-dessous ; la récupération utilise uniquement un serveur MySQL jetable isolé. Aucune restauration vers NAP réelle.

Le 16 novembre, après cette première mise en service, Antoine demande explicitement de déplacer les copies au mardi à **2 h Europe/Paris** et d’envoyer une alerte à **antoine.fauveau@nap-ffessm.fr** en cas d’échec ou d’absence de lancement. Ce complément ne change ni l’export, ni ses verrous, ni le chiffrement ou la restauration. La preuve initiale reste compatible.

## Horaire, dossier et condition d'activation

- Rendez-vous retenu : mardi 02 h, `Europe/Paris`, donc nuit du lundi au mardi ; les changements d'heure sont pris en charge par la planification GitHub. GitHub peut retarder ou manquer un lancement : cet horaire n'est pas une garantie à la minute. Voir [la documentation des déclenchements](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule).
- Dossier créé pour ce besoin : [Sauvegardes NAP](https://drive.google.com/drive/folders/1EmLc7dmUWwf5jK3pYYQ7j4XPmfSrlIW3), sous LivePalmes du Drive partagé Commission Nationale NAP. La première archive chiffrée de 16 128 003 octets y a été déposée et ses métadonnées relues le 16 novembre.
- Activation après preuve : `enabled: true` dans le code, reçu authentifié dans la variable d’environnement `NAP_BACKUP_RESTORE_PROOF`, puis variable de dépôt `NAP_BACKUP_SCHEDULE_ENABLED=true`. Ces conditions sont contrôlées avant les secrets et les accès distants.
- L'essai récupère les octets chiffrés depuis Drive, compare leur empreinte, les déchiffre en mémoire et restaure toutes les tables exportées dans MySQL 5.7.44, sans réseau ni montage hôte. Un nouvel export ordonné de la base isolée doit être strictement identique au premier SQL, structure et données incluses. Le serveur jetable et son volume sont retirés à la fin, même après échec. Aucun SQL en clair n'est envoyé dans les artefacts.
- Le reçu `nap-backup-report/report.json` ne contient que des métadonnées et empreintes. Une preuve est produite seulement après téléchargement, restauration et comparaison réussis. Son empreinte couvre les sources de sauvegarde/restauration, le chiffrement et la configuration hors seul interrupteur d'activation.
- Après réussite authentifiée seulement : conserver `restoreProof` du reçu dans la variable d'environnement GitHub `NAP_BACKUP_RESTORE_PROOF` ; passer `enabled` à `true` par PR/CI puis ouvrir `NAP_BACKUP_SCHEDULE_ENABLED=true`. Le dossier et l'empreinte des outils doivent toujours correspondre à la preuve ; toute modification du mécanisme impose un nouvel essai avant sauvegarde périodique. Un reçu absent ou incompatible arrête avant secret ou accès distant.
- Aucun effacement Drive automatique : toutes les premières copies sont conservées. La conservation glissante de huit copies proposée dans le chat reste à mettre en place dans un lot explicite après mesure, sans supprimer de sauvegarde historique. Les alertes mail dédiées sont décrites ci-dessous ; elles ne dépendent pas des préférences personnelles de notification GitHub.


Le diagnostic réel du 30 octobre a constaté MySQL 5.7.30, 67 tables (31 MyISAM, 36 InnoDB), environ 138 Mio de données et d'index. Le compte dispose de tous les privilèges sur `nage-palmes`, mais pas de privilège global RELOAD. Ces observations sont datées ; le contrôle préalable relit les métadonnées. L’essai du 16 novembre couvre 76 tables : 83 493 104 octets SQL et 16 128 003 octets chiffrés. Le run complet a duré 2 min 57 s, préparation et restauration comprises ; ce n’est pas une mesure exacte du temps de verrouillage.

La sauvegarde concerne la structure et le contenu de la seule base NAP, y compris les compléments `livepalmes_*`. Elle ne couvre pas Firebase Auth, Firestore, les fichiers/protocoles sur Google, les comptes SQL du serveur ni les journaux binaires. Elle ne permet donc pas à elle seule une restauration complète de l'écosystème ou à un instant arbitraire.

## 1. Créer le dossier dans Workspace

1. Dans Google Drive, ouvrir **Drives partagés**, puis le Drive partagé choisi. Créer un dossier **Sauvegardes NAP**. Limiter les membres du Drive/dossier aux personnes autorisées à accéder à la base nominative ; les droits hérités du Drive partagé restent applicables.
2. Copier son lien, de la forme `https://drive.google.com/drive/folders/IDENTIFIANT`. L'identifiant sera la variable `NAP_BACKUP_FOLDER_ID`.
3. Ne pas ajouter de partage public. Le dossier ne contiendra que des archives chiffrées.

Le compte technique est ajouté à l'étape suivante. Un compte de service est une identité extérieure au domaine Workspace : si la politique du Drive interdit son ajout, arrêter et examiner une solution autorisée avec l'administrateur, sans ouvrir le partage général ni activer de délégation à l'ensemble du domaine.

## 2. Créer le compte technique dédié

Accord explicite complémentaire du 16 novembre : Antoine autorise le compte dédié, l'accès au seul secret NAP et au seul dossier de sauvegarde, ainsi que les clés dans les coffres Google/GitHub séparés des archives. Aucun privilège SQL supplémentaire ou rôle global du projet n'est inclus.

Depuis la [console des comptes de service](https://console.cloud.google.com/iam-admin/serviceaccounts?project=livepalmes-test), sélectionner **livepalmes-test** :

1. Créer le compte **nap-backup-drive**. L'adresse attendue par l'outil est `nap-backup-drive@livepalmes-test.iam.gserviceaccount.com`. Ne lui attribuer aucun rôle global sur le projet.
2. Dans [Secret Manager](https://console.cloud.google.com/security/secret-manager?project=livepalmes-test), ouvrir le seul secret **LIVEPALMES_NAP_PASSWORD**. Dans ses autorisations, ajouter ce compte avec le rôle **Accesseur de secrets Secret Manager** (`roles/secretmanager.secretAccessor`), au niveau de ce secret uniquement. Aucun changement de mot de passe NAP, de Functions ou de droit PROD.
3. Activer l'API Google Drive dans ce projet si elle n'est pas déjà activée ; conserver Secret Manager. Aucun service de calcul supplémentaire n'est nécessaire.
4. Dans le dossier Drive créé à l'étape 1, **Partager**, ajouter cette adresse avec le rôle minimal permettant l'ajout de fichiers (**Contributeur**). Privilégier l'accès au dossier seul ; ne pas attribuer Gestionnaire. Aucun nettoyage automatique ne nécessite de droit de suppression.
5. Dans le compte de service, **Clés → Ajouter une clé → Créer une clé → JSON**. Déposer son contenu uniquement dans le secret GitHub indiqué ci-dessous. Ne jamais le coller dans le chat, le dépôt ou le dossier de sauvegardes. Si la création de clés est interdite par l'organisation, arrêter : la fédération d'identité sera à préparer séparément, sans désactiver cette politique.

Le mécanisme suit l'identité dédiée : la portée OAuth Drive ne donne aucun accès aux fichiers personnels d'Antoine ; les possibilités du compte technique dépendent des dossiers/Drives qui lui sont effectivement partagés. Aucun consentement OAuth utilisateur ni jeton personnel à renouveler.

## 3. Configurer GitHub sans activer l'export

Dans le dépôt **ffessmnap/LivePalmes → Settings → Environments**, créer **nap-backup** et limiter ses branches de déploiement à **main**. Ajouter :

| Type | Nom | Valeur |
| --- | --- | --- |
| Secret d'environnement | `NAP_BACKUP_SERVICE_ACCOUNT_JSON` | JSON du compte dédié |
| Secret d'environnement | `NAP_BACKUP_ENCRYPTION_KEY` | 32 octets aléatoires encodés en base64 ; génération accompagnée, aucune réutilisation du mot de passe SQL |
| Variable d'environnement | `NAP_BACKUP_FOLDER_ID` | Identifiant du dossier partagé |

Conserver aussi la clé de chiffrement dans le gestionnaire de mots de passe de l'association, avec les personnes autorisées à restaurer. Ne pas la stocker dans le dossier Drive des sauvegardes : perdre cette clé rend les archives inutilisables. La révocation ou rotation du compte de service n'invalide pas les archives déjà chiffrées ; une rotation de la clé de chiffrement nécessite de conserver les anciennes clés.

Conserver également la clé de chiffrement dans un coffre de récupération séparé des archives (par exemple un secret dédié dans Secret Manager, sans élargir les droits du compte de sauvegarde). Les valeurs ne doivent jamais transiter par le chat.

Une fois les outils intégrés et ces paramètres renseignés, lancer **Sauvegarde NAP vers Drive → Run workflow → mode check**, confirmation vide. Ce mode relit le secret, vérifie le dossier partagé et sa capacité d'ajout, et exécute sept requêtes SQL de métadonnées. Il ne crée aucun fichier Drive, ne lit aucune ligne métier et ne demande aucun verrou. L'accès réel d'un runner GitHub à NAP reste à confirmer par ce contrôle ; la réussite de la connexion locale ne le garantit pas.

Le mode check ne prouve pas encore le dépôt ni la restauration. Après sa réussite, lancer manuellement le mode `trial` avec `NAP-PROD-SAUVEGARDE-ET-VERROUILLAGE-AUTORISES`. L'accord du 16 novembre couvre ce premier essai. Vérifier la réussite du job, son reçu technique et la présence du fichier chiffré Drive avant toute activation ; un échec laisse les interrupteurs fermés et conserve la copie chiffrée disponible.

## Fonctionnement et limites

- Le mode `backup` exige `enabled: true`, la branche main et la confirmation exacte. Un lancement périodique exige en plus la preuve de récupération compatible et la variable d'ouverture. `trial` exige un déclenchement manuel, main et la confirmation, tout en conservant l'activation fermée ; `check` demeure le défaut.
- Le client Docker reprend l’UID/GID du runner qui possède le fichier privé de connexion (mode 0600), avec système en lecture seule et toutes capacités retirées. Un précontrôle local de lecture du fichier et de toutes les options avec mysqldump --help (sortie ignorée), puis un SELECT 1 via le même client, précèdent tout verrou. Le mode check effectue aussi ce contrôle de connexion du client ; aucune ligne métier n'est exportée. Les erreurs de client ne rendent que leur catégorie ou code numérique ; aucun stderr SQL brut n’est journalisé.
- Client `mysqldump` 5.7.44 dans l'image officielle `mysql:5.7.44`, utilisé comme client pour l’export source sur un runner Linux ; seul l’essai de récupération démarre ensuite un serveur jetable isolé. Cette version ancienne correspond à la famille de la source. Téléchargement du client et vérification Drive avant verrouillage. La connexion reprend les paramètres TLS NAP existants (chiffrement obligatoire, certificat non vérifié, choix existant à réexaminer séparément).
- Une connexion dédiée demande `LOCK TABLES ... READ` pour toutes les tables natives et complémentaires inventoriées, sans verrou global, sans `READ LOCAL` et sans `--single-transaction`. Elle conserve les verrous pendant l'export sur une seconde connexion. La fermeture de la première les libère avant chiffrement/dépôt Drive, y compris après erreur. Les nouvelles écritures NAP, depuis tous ses consommateurs, peuvent attendre pendant ce temps.
- Avant la première exécution, convenir d'un créneau sans import, modification de schéma ni opération administrative sur NAP. Les verrous des tables existantes n'interdisent pas la création d'une nouvelle table ou d'une routine sur le serveur : la stabilité du schéma reste une condition d'exécution. Aucune modification de schéma, de règle sportive ou de donnée n'est faite par l'outil.
- Transfert SQL compressé entre serveur et client avec l'option standard mysqldump 5.7 --compress. Routines, événements et déclencheurs restent interdits par le précontrôle : leurs consultations répétées par table sont donc désactivées dans le dump, sans omettre un objet accepté. Toute apparition conserve le refus STORED_OBJECTS_REQUIRE_REVIEW ; aucune baisse de couverture ni hausse du délai. Voir [options MySQL 5.7](https://docs.oracle.com/cd/E17952_01/mysql-5.7-en/mysqldump.html).
- Le journal technique indique seulement les étapes, octets SQL/compressés et durée ; les contenus restent hors logs. Le dépassement de délai reste distingué de l'erreur du processus arrêté. La limite de verrou ne peut être changée sans accord explicite sur son impact ; le passage de 90 secondes à dix minutes a reçu cet accord avant modification.
- Attente de verrou bornée à 10 secondes ; délai SQL et coupure de la connexion ; durée totale d'acquisition/export bornée à dix minutes (600 000 ms), selon l'accord explicite du 16 novembre après les essais à 90 secondes. En cas d'échec ou dépassement : arrêt sans publication d'une sauvegarde partielle, sans seconde tentative d'export automatique. Le premier essai complet réussit en moins de trois minutes ; l’effet sur les applications pendant les verrous n’a pas fait l’objet d’une recette utilisateur.
- SQL limité à 512 Mio, archive compressée à 128 Mio, inventaire à 100 tables et taille physique à 512 Mio. Une vue, un moteur inattendu, une routine, un événement ou un déclencheur bloque l'outil. Le diagnostic n'en a trouvé aucun ; toute apparition impose de revoir le périmètre et les droits, sans l'ignorer dans une sauvegarde prétendue complète. En particulier, l'export des routines par le client 5.7 demanderait un accès à `mysql.proc` absent des droits actuels. `--no-tablespaces` évite d'exiger PROCESS global. Ces bornes et refus empêchent une croissance ou un objet imprévu plutôt que de tronquer les données.
- SQL traité en mémoire/flux, jamais déposé en clair ; gzip puis AES-256-GCM avec une clé dédiée. Réutilisation du format authentifié `LIVEPALMES_BACKUP_V1` du projet, vérification par déchiffrement avant upload. Seul le fichier `.sql.gz.enc` est écrit localement puis dans Drive. Le mot de passe SQL est chargé depuis Secret Manager et placé temporairement dans un fichier client privé, supprimé en fin de traitement ; jamais dans la ligne de commande ou les logs.
- Dépôt d'un nouveau fichier daté, sans remplacement ; relecture des métadonnées Drive, taille et empreinte MD5 de transport. Cette vérification ne remplace pas une restauration. En cas d'échec Drive, copie chiffrée conservée dans un artefact GitHub à rétention de 14 jours. Aucun artefact SQL en clair.
- Aucune purge Drive préparée : toutes les copies sont conservées ; aucune durée de rétention glissante n’est activée. Aucune ancienne sauvegarde n'est supprimée. Une surveillance séparée envoie les alertes d’échec ou d’absence décrites ci-dessous. Les horaires GitHub peuvent être retardés.

## Vérifications et budget

Tests automatisés sans réseau : garde d'activation avant accès distant, branche/confirmation, limites de volume, moteurs inattendus, verrou READ sur toutes les tables, libération après succès/échec/refus, limite de durée, export partiel rejeté, chiffrement authentifié, conservation locale sur panne Drive, vérification du dossier partagé et des empreintes de dépôt. Exécution : `node tests/nap-backup-tests.js` ; intégrés à la vérification globale.

Budget `check` : un échange de jeton Google, une lecture de métadonnées Drive, une lecture Secret Manager et sept requêtes SQL de métadonnées (au plus 101 tables, 100 lignes de droits acceptées et un témoin par type d'objet stocké). Zéro ligne métier et zéro écriture distante. Aucun déclenchement depuis les parcours utilisateurs.

Budget `backup` : même précontrôle, export complet intentionnel de la seule base dans les limites ci-dessus, commandes de session/verrouillage bornées, un upload Drive puis une relecture de métadonnées. Pas de listener ni de requête par ligne. La sauvegarde est une tâche de maintenance explicitement exhaustive, distincte du budget interactif.

## Alertes par mail

Destinataire unique autorisé : **antoine.fauveau@nap-ffessm.fr**. Le workflow `nap-backup-alert.yml` écoute la fin des sauvegardes sur main et effectue également un contrôle quotidien à **3 h 17 Europe/Paris**. Un échec de copie déclenche le contrôle sans attendre ce rendez-vous ; le mode de simple diagnostic `check` est ignoré. Une absence de copie, une attente excessive ou un reçu manquant sont signalés après une heure de grâce suivant le mardi à 2 h. La première échéance surveillée est le 17 novembre 2026. Le contrôle reste quotidien après mardi pour rattraper son propre rendez-vous manqué.

Une sauvegarde est considérée disponible uniquement si un run de copie valable réussit depuis l’échéance et possède ses deux artefacts attendus, reçu technique et copie chiffrée. Le contrôle lit uniquement les métadonnées GitHub, sans SQL, Drive, Firebase ou clé de récupération. Un accès GitHub impossible est signalé comme contrôle indisponible plutôt que comme réussite. Les mails donnent le motif et les liens utiles, sans pièce jointe ni contenu de la base ; aucune relance de copie ou restauration n’est automatique.

Le programme réutilise Nodemailer déjà installé et les paramètres SMTP LivePalmes, conservés dans le seul secret `NAP_BACKUP_ALERT_SMTP_JSON` de l’environnement GitHub séparé **nap-backup-alerts**, limité à main. Aucun compte Google supplémentaire, rôle IAM ou accès au mot de passe NAP n’est ajouté pour l’alerte. L’envoi périodique exige la variable de dépôt `NAP_BACKUP_ALERTS_ENABLED=true`. Les modes manuels restent `check` par défaut, `monitor`, et `test` avec confirmation exacte `NAP-ALERTE-TEST-AUTORISEE` ; ce dernier n’envoie qu’un mail de test au même destinataire, sans déclencher une sauvegarde.

Un reçu d’envoi non nominatif, hors adresse destinataire autorisée, est conservé 90 jours dans un artefact du workflow d’alerte sur main. Il évite de renvoyer le même incident hebdomadaire. Si le journal ne peut pas être relu ou si le serveur accepte le mail mais que le reçu ne peut pas être conservé, une répétition est possible ; l’envoi est prioritaire. Les connexions SMTP utilisent TLS, avec délais bornés, sans diagnostic brut ni secret dans les logs.

Limites : sauvegarde et surveillance restent hébergées sur GitHub. Une panne générale ou la désactivation des deux workflows retarde aussi le contrôle ; aucune surveillance extérieure à GitHub n’est déployée. Une acceptation SMTP ne prouve pas la réception en boîte principale ; vérifier le mail de test et les indésirables. Une panne du service SMTP empêche l’envoi et fait échouer le contrôle.

Budget de surveillance : zéro lecture métier NAP/Firestore et zéro requête Drive ; une liste de 100 runs maximum sur l’échéance, jusqu’à trois listes de 20 artefacts pour les copies réussies, puis une liste de 20 reçus d’alerte et au plus 20 contrôles de provenance. Aucun téléchargement de la base, listener ou requête par ligne métier. Toute limite dépassée devient une alerte de contrôle indisponible. Tests hors réseau : `node tests/nap-backup-alert-tests.js`, intégrés à la CI obligatoire.

## Extension aux copies Firebase A2

La surveillance distingue désormais la copie SQL NAP et les copies Firebase PROD/TEST du workflow `a2-firebase-backup.yml`. Chaque famille dispose de ses propres reçus et incidents ; la réussite de NAP ne masque pas un échec Firebase. Le contrôle Firebase reste fermé tant que `A2_BACKUP_SCHEDULE_ENABLED` n’est pas à true. Les essais fictifs et simples précontrôles sont exclus des alertes. Un test mail manuel reste un seul mail NAP : le second job ne répète pas ce test.

Même adresse autorisée, même coffre SMTP et même horaire quotidien 3 h 17 Paris. Budget GitHub ci-dessus appliqué séparément à chaque famille activée, toujours sans lecture métier ou accès Drive/Google. Le contrôle exige pour Firebase le reçu de récupération et l’artefact chiffré du même run. Aucun nouvel accès d’envoi, serveur de mail ou message de test réel ajouté. Les limites de panne générale GitHub/SMTP restent identiques. Les originaux NAP hébergés ailleurs ne sont pas annoncés couverts avant leur archivage effectivement prouvé.

Le complément Firebase est activé après essai réel 43875547237 et CI de #929 réussies. État final vérifié le 16 novembre à 13:48 UTC : sauvegardes SQL/Firebase et alertes ouvertes, preuves compatibles, environnements main-only. Contrôle sans envoi 43878725407 réussi pour les deux familles. Les anciens PDF NAP restent sous la responsabilité de la fédération selon décision explicite d’Antoine : aucune copie ou alerte ajoutée pour eux ; le diagnostic ponctuel associé est désactivé. [Bilan A2](audit-a2-sauvegardes-environnements.md).

## Preuve de mise en service des alertes

[#924](https://github.com/ffessmnap/LivePalmes/pull/924) intégrée sur `18889464fa4b8713d3c2f2e434b4ea27ea2ad426` : [CI PR](https://github.com/ffessmnap/LivePalmes/actions/runs/43853151793) et [CI main](https://github.com/ffessmnap/LivePalmes/actions/runs/43853821503) réussies. La sélection calculée est complète à cause de l’ajout du workflow : 407 fichiers de tests application et 71 publication, sans choix manuel ; preuves de contenu identique réutilisées sur main.

[Test mail réel 43854232563](https://github.com/ffessmnap/LivePalmes/actions/runs/43854232563) réussi le 16 novembre, de 11:02:50 à 11:03:13 UTC : un seul message clairement identifié comme test, émis par LivePalmes vers l’adresse autorisée, accepté à 11:03:07 et retrouvé par recherche Gmail ciblée dans la boîte de réception. Aucun nouvel export NAP n’est lancé. Le reçu d’envoi est téléchargé avec contrôle du digest GitHub par `release-cycle.py artifact` ; sa provenance et son contenu sont validés. Le contrôle anti-doublon reconnaît ensuite réellement cet artefact.

À 11:04:53 UTC, les variables de dépôt de sauvegarde et d’alerte sont relues à `true`, les deux workflows actifs et leurs environnements limités à main. Les horaires intégrés sont mardi **2 h** pour la copie et chaque jour **3 h 17** pour le contrôle, Europe/Paris ; première échéance le 17 novembre. L’empreinte des quatre sources de copie depuis les blobs Git main correspond toujours à la preuve initiale. Cette validation technique et la réception du mail de test ne prétendent pas avoir observé une future panne réelle.

## Preuve initiale de récupération

Le [run 43848399142](https://github.com/ffessmnap/LivePalmes/actions/runs/43848399142), sur `9dfc1ac1c3acc15335fee065ad1b032a62a8e911`, réussit de 10:23:30 à 10:26:27 UTC. Le reçu `nap-backup-report` est téléchargé par l’outil existant `release-cycle.py artifact`, avec empreinte ZIP authentifiée auprès de GitHub. Il confirme les verrous libérés, le téléchargement depuis Drive, la reconstruction des 76 tables et la comparaison SQL intégrale réussie à 10:26:19 UTC. L’empreinte des outils est recalculée depuis les blobs Git exacts et correspond au reçu. Les métadonnées Drive confirment le dossier et les 16 128 003 octets de l’archive.

Archive SHA-256 : `69162fc1111af175f838e608487480c6c178ba8a07d4dd4fd1fc72ec5c9b9c7b`. Empreinte des outils : `673cff6163b32c8609829a3201fd64c79bddee81debe176a2c4dbb76772dbe2d`. La seule activation `enabled` est exclue de cette empreinte ; aucune autre source de sauvegarde n’est modifiée après l’essai. La clé de récupération est conservée séparément dans Secret Manager, secret `LIVEPALMES_NAP_BACKUP_ENCRYPTION_KEY`, sans accès du compte de sauvegarde à ce coffre. Aucun contenu SQL ni clé n’est dans ce reçu.

## Déchiffrement et restauration, après accord distinct

Télécharger l'archive chiffrée et fournir sa clé dans `NAP_BACKUP_ENCRYPTION_KEY` sans l'afficher. La commande suivante écrit uniquement un fichier local gzip, refuse de remplacer un fichier existant et ne contacte ni NAP ni Google :

```text
node tools/nap-backup.js --decrypt archive.sql.gz.enc restauration.sql.gz
```

Décompresser et tester le SQL sur un serveur MySQL 5.7 isolé, avec comptes, tables, index, encodages, valeurs binaires et parcours métier contrôlés. **Aucune restauration vers NAP réelle n'est automatique ou autorisée par ce document.** L’essai isolé ci-dessus prouve la récupération technique de la copie initiale ; toute restauration vers la base réelle exige toujours un accord distinct.

## Références

- [Drive partagé et API](https://developers.google.com/workspace/drive/api/guides/enable-shareddrives).
- [Rôles Drive](https://developers.google.com/workspace/drive/api/guides/ref-roles).
- [Droits Secret Manager par secret](https://docs.cloud.google.com/secret-manager/docs/access-control).
- [Documentation MySQL 5.7 sur les verrous de tables](https://docs.oracle.com/cd/E17952_01/mysql-5.7-en/lock-tables.html) : vérifier le comportement lors de la première recette isolée.
- [Client mysqldump 5.7 et privilèges](https://docs.oracle.com/cd/E17952_01/mysql-5.7-en/mysqldump.html).
