# Sauvegardes NAP vers un Drive partagé

<!-- description: Préparation inactive des sauvegardes NAP chiffrées, configuration du compte technique et du Drive partagé, contrôles et activation distincte. -->

## État et périmètre autorisé

Préparation demandée le 30 octobre 2026. **Aucune sauvegarde, aucun verrouillage et aucune planification ne sont autorisés à ce stade.** `tools/nap-backup-config.json` contient `enabled: false` ; le workflow `nap-backup-drive.yml` ne possède aucun déclencheur périodique. Même un lancement manuel en mode `backup` est refusé avant les accès réseau. Une fusion de ces outils ne déclenche donc pas de sauvegarde.

Le diagnostic réel du 30 octobre a constaté MySQL 5.7.30, 67 tables (31 MyISAM, 36 InnoDB), environ 138 Mio de données et d'index. Le compte dispose de tous les privilèges sur `nage-palmes`, mais pas de privilège global RELOAD. Ces observations sont datées ; le contrôle préalable relit les métadonnées. La taille du SQL compressé et la durée de blocage ne sont pas encore mesurées.

La sauvegarde concerne la structure et le contenu de la seule base NAP, y compris les compléments `livepalmes_*`. Elle ne couvre pas Firebase Auth, Firestore, les fichiers/protocoles sur Google, les comptes SQL du serveur ni les journaux binaires. Elle ne permet donc pas à elle seule une restauration complète de l'écosystème ou à un instant arbitraire.

## 1. Créer le dossier dans Workspace

1. Dans Google Drive, ouvrir **Drives partagés**, puis le Drive partagé choisi. Créer un dossier **Sauvegardes NAP**. Limiter les membres du Drive/dossier aux personnes autorisées à accéder à la base nominative ; les droits hérités du Drive partagé restent applicables.
2. Copier son lien, de la forme `https://drive.google.com/drive/folders/IDENTIFIANT`. L'identifiant sera la variable `NAP_BACKUP_FOLDER_ID`.
3. Ne pas ajouter de partage public. Le dossier ne contiendra que des archives chiffrées.

Le compte technique est ajouté à l'étape suivante. Un compte de service est une identité extérieure au domaine Workspace : si la politique du Drive interdit son ajout, arrêter et examiner une solution autorisée avec l'administrateur, sans ouvrir le partage général ni activer de délégation à l'ensemble du domaine.

## 2. Créer le compte technique dédié

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

Une fois les outils intégrés et ces paramètres renseignés, lancer **Sauvegarde NAP vers Drive → Run workflow → mode check**, confirmation vide. Ce mode relit le secret, vérifie le dossier partagé et sa capacité d'ajout, et exécute sept requêtes SQL de métadonnées. Il ne crée aucun fichier Drive, ne lit aucune ligne métier et ne demande aucun verrou. L'accès réel d'un runner GitHub à NAP reste à confirmer par ce contrôle ; la réussite de la connexion locale ne le garantit pas.

Ce contrôle ne prouve pas encore l'upload d'un fichier ni sa restauration. Les essais synthétiques Drive, la première sauvegarde et la restauration isolée doivent être autorisés et exécutés séparément. Aucun de ces essais ne fait partie de la préparation actuelle.

## Fonctionnement préparé et limites

- Le mode `backup` exige un changement explicite de `enabled` à `true`, la branche main et la confirmation exacte prévue par l'outil. La planification reste absente tant qu'un accord distinct ne la fait pas ajouter. Le mode `check` demeure le choix par défaut.
- Client `mysqldump` 5.7.44 dans l'image officielle `mysql:5.7.44`, utilisé uniquement comme client sur un runner Linux ; aucun serveur MySQL n'est démarré. Cette version ancienne correspond à la famille de la source. Téléchargement du client et vérification Drive avant verrouillage. La connexion reprend les paramètres TLS NAP existants (chiffrement obligatoire, certificat non vérifié, choix existant à réexaminer séparément).
- Une connexion dédiée demande `LOCK TABLES ... READ` pour toutes les tables natives et complémentaires inventoriées, sans verrou global, sans `READ LOCAL` et sans `--single-transaction`. Elle conserve les verrous pendant l'export sur une seconde connexion. La fermeture de la première les libère avant chiffrement/dépôt Drive, y compris après erreur. Les nouvelles écritures NAP, depuis tous ses consommateurs, peuvent attendre pendant ce temps.
- Avant la première exécution, convenir d'un créneau sans import, modification de schéma ni opération administrative sur NAP. Les verrous des tables existantes n'interdisent pas la création d'une nouvelle table ou d'une routine sur le serveur : la stabilité du schéma reste une condition d'exécution. Aucune modification de schéma, de règle sportive ou de donnée n'est faite par l'outil.
- Attente de verrou bornée à 10 secondes ; délai SQL et coupure de la connexion ; durée totale d'acquisition/export bornée à 90 secondes. En cas d'échec ou dépassement : arrêt sans publication d'une sauvegarde partielle, sans seconde tentative d'export automatique. La durée réelle et l'effet sur les applications ne sont pas encore vérifiés.
- SQL limité à 512 Mio, archive compressée à 128 Mio, inventaire à 100 tables et taille physique à 512 Mio. Une vue, un moteur inattendu, une routine, un événement ou un déclencheur bloque l'outil. Le diagnostic n'en a trouvé aucun ; toute apparition impose de revoir le périmètre et les droits, sans l'ignorer dans une sauvegarde prétendue complète. En particulier, l'export des routines par le client 5.7 demanderait un accès à `mysql.proc` absent des droits actuels. `--no-tablespaces` évite d'exiger PROCESS global. Ces bornes et refus empêchent une croissance ou un objet imprévu plutôt que de tronquer les données.
- SQL traité en mémoire/flux, jamais déposé en clair ; gzip puis AES-256-GCM avec une clé dédiée. Réutilisation du format authentifié `LIVEPALMES_BACKUP_V1` du projet, vérification par déchiffrement avant upload. Seul le fichier `.sql.gz.enc` est écrit localement puis dans Drive. Le mot de passe SQL est chargé depuis Secret Manager et placé temporairement dans un fichier client privé, supprimé en fin de traitement ; jamais dans la ligne de commande ou les logs.
- Dépôt d'un nouveau fichier daté, sans remplacement ; relecture des métadonnées Drive, taille et empreinte MD5 de transport. Cette vérification ne remplace pas une restauration. En cas d'échec Drive, copie chiffrée conservée dans un artefact GitHub à rétention de 14 jours. Aucun artefact SQL en clair.
- Aucune purge Drive préparée : la proposition de douze copies/quatre semaines est à confirmer après mesure du premier export. Aucune ancienne sauvegarde n'est supprimée. Les alertes GitHub d'échec sont disponibles selon les préférences du compte ; le suivi d'une sauvegarde attendue mais jamais déclenchée reste à ajouter lors de l'activation périodique. Les horaires GitHub peuvent être retardés.

## Vérifications et budget

Tests automatisés sans réseau : garde d'activation avant accès distant, branche/confirmation, limites de volume, moteurs inattendus, verrou READ sur toutes les tables, libération après succès/échec/refus, limite de durée, export partiel rejeté, chiffrement authentifié, conservation locale sur panne Drive, vérification du dossier partagé et des empreintes de dépôt. Exécution : `node tests/nap-backup-tests.js` ; intégrés à la vérification globale.

Budget `check` : un échange de jeton Google, une lecture de métadonnées Drive, une lecture Secret Manager et sept requêtes SQL de métadonnées (au plus 101 tables, 100 lignes de droits acceptées et un témoin par type d'objet stocké). Zéro ligne métier et zéro écriture distante. Aucun déclenchement depuis les parcours utilisateurs.

Budget futur `backup` : même précontrôle, export complet intentionnel de la seule base dans les limites ci-dessus, commandes de session/verrouillage bornées, un upload Drive puis une relecture de métadonnées. Pas de listener ni de requête par ligne. La sauvegarde est une tâche de maintenance explicitement exhaustive, distincte du budget interactif.

## Déchiffrement et restauration, après accord distinct

Télécharger l'archive chiffrée et fournir sa clé dans `NAP_BACKUP_ENCRYPTION_KEY` sans l'afficher. La commande suivante écrit uniquement un fichier local gzip, refuse de remplacer un fichier existant et ne contacte ni NAP ni Google :

```text
node tools/nap-backup.js --decrypt archive.sql.gz.enc restauration.sql.gz
```

Décompresser et tester le SQL sur un serveur MySQL 5.7 isolé, avec comptes, tables, index, encodages, valeurs binaires et parcours métier contrôlés. **Aucune restauration vers NAP réelle n'est automatique ou autorisée par ce document.** La preuve de restauration et la mesure de durée sont nécessaires avant de qualifier le dispositif de sauvegarde opérationnelle.

## Références

- [Drive partagé et API](https://developers.google.com/workspace/drive/api/guides/enable-shareddrives).
- [Rôles Drive](https://developers.google.com/workspace/drive/api/guides/ref-roles).
- [Droits Secret Manager par secret](https://docs.cloud.google.com/secret-manager/docs/access-control).
- [Documentation MySQL 5.7 sur les verrous de tables](https://docs.oracle.com/cd/E17952_01/mysql-5.7-en/lock-tables.html) : vérifier le comportement lors de la première recette isolée.
- [Client mysqldump 5.7 et privilèges](https://docs.oracle.com/cd/E17952_01/mysql-5.7-en/mysqldump.html).
