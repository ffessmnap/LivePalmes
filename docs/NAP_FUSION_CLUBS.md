# Préparation des 14 regroupements de clubs NAP

<!-- description: Outil ponctuel des 14 fusions de clubs, inventaire borné, sauvegarde chiffrée, reprise et restauration ; aucune autorisation d'exécution. -->

## Décisions et limites

Préparation demandée par Antoine le 31 octobre 2026. Les 14 sources sont transférées vers 12 cibles : 389→413, 551→209, 718→719, 223→444, 457→345, 123→278, 382→662, 532→639, 518→126, 664→45, 708→188, 651/699/698→220. Les identités exactes du classeur approuvé sont figées dans `tools/club-merge-clubs.json`, avec son empreinte ; les propositions antérieures de nouveaux sigles ne sont pas utilisées.

Les cibles gardent tous leurs champs. Les sources sont **supprimées physiquement en dernier**, jamais désactivées. Aucun nageur, officiel, compte, engagement ou résultat n'est supprimé pour dédoublonner des personnes. Les trois comptes de Corbie gardent UID, rôles et préférences. Seuls le club/nom du profil source, son périmètre explicite, le périmètre du droit existant et le club de la demande historique approuvée changent. Les autres champs de la demande restent identiques. OPEN/OPEN PASS rejoignent 220, sans modifier ses paramètres.

L'outil est local et ponctuel, hors des Functions et de l'interface. Aucun workflow d'application automatique, scheduler, appel SMTP, reconstruction globale d'annuaire, nouvelle collection, règle, index ou modification de schéma. L'autorisation de préparation ne vaut ni exécution, ni restauration métier, ni déploiement PROD.

## État de préparation et blocage Corbie

Le correctif #649 protège les snapshots de l'annuaire d'accès. Il ne protège pas les deux autres copies dérivées dans `syncEngagementMailRecipientIndex`. Le contrôle **hors réseau du véritable déclencheur**, `node tools/club-merge-projections.js`, rejoue un événement ancien après le nouveau, puis le même cas après retour arrière. À la préparation initiale, liste d'administrateurs et destinataires reviennent au club obsolète dans les deux sens. Le contrôle retourne `readyForCorbie:false` et un code non nul ; ce n'est pas un échec de connexion ou un essai sur un compte réel.

`--apply` et `--restore` refusent ce code source tant que ce rejeu échoue, même si un fichier d'accord est fourni. Compléter ces deux protections serveur exige l'accord de périmètre sensible, les tests ciblés et la CI, une livraison TEST puis un accord PROD dans Infra. Il faut ensuite contrôler que la version réellement déployée correspond à la preuve de rejeu. La simple réussite du rejeu local ne prouve pas le code en PROD.

La fenêtre d'exclusion des écritures, la clé existante de restauration et les emplacements privés durables restent des prérequis opérationnels à établir. Aucun verrou global du portail ni droit IAM n'est créé implicitement. Une simple case dans un JSON ne suspend pas les autres écrivains : l'opérateur doit fournir une preuve réelle de la fenêtre, incluant le portail, les imports, les scripts et les écritures de profils ; les synchroniseurs de projections doivent rester disponibles. À défaut, ne pas exécuter.

## Inventaire et budget avant toute écriture

Chaque capture lit 26 clubs, 17 relations métier indexées (deux champs regroupés pour chefs d'équipe et historique supprimé), et la projection NAP des comptes : 18 lectures de relations, une lecture clubs. Chaque lecture de relation utilise les 26 identifiants sur un index dont la colonne club est en tête, avec sentinelle à 10 001 lignes. Déduplication par clé primaire avant de traiter les deux champs d'une même ligne. Au plus 5 000 mutations SQL et 32 Mo d'inventaire ; tout dépassement arrête, sans troncature.

Métadonnées bornées : 1 001 colonnes, 501 composants d'index, 101 références club, présence de triggers et clés étrangères ; moteur MyISAM/InnoDB et clés/index attendus contrôlés. Toute nouvelle contrainte unique, référence club non revue, colonne générée ou dépendance de qualification/historique supprimé sur une source bloque. `records.club` reste l'étiquette historique auditée, non une clé club ; les Records/MPF et les journaux d'imports ne sont pas réécrits.

Firebase : 16 requêtes groupées, par valeurs chaîne **et** entier, sur huit couples collection/champ. Users/périmètres/grants : sentinelle à 101 ; demandes et anciennes collections métier : 501. Une seule dépendance dans les anciennes collections bloque. Lecture groupée des 78 chemins clubs/rosters connus, qui doivent rester absents. Le périmètre attendu est exactement trois profils, trois droits existants et une demande historique. Changement de rôle, de compte ou de périmètre bloque.

Réservations de fusion nageurs : lecture groupée des chemins connus des nageurs des sources **et cibles**, plafond de 4 000 documents, lots de 100, sans requête par personne. Un état `pending` bloque. Imports NAP : lecture groupée par clés primaires des pointeurs des compétitions touchées, plafond de 1 000 compétitions ; `activeImportId` ou statut non terminal bloque. Ces opérations nécessitent aussi la fenêtre sans autres écrivains.

Avant sauvegarde, deux captures doivent concorder. L'application effectue quatre captures complètes (avant mutation, avant Firebase, avant suppression, contrôle final) ; la restauration également, avec recréation initiale des sources. Chaque phase SQL relit deux fois les tables métier, et une fois métadonnées/pointeurs sous verrou. Aucune lecture par ligne affichée : cet outil n'ajoute aucun coût au portail, à son ouverture, à ses actions ou à son rafraîchissement. Les mises à jour SQL sont volontairement individuelles, indexées par clé primaire et limitées aux images approuvées pour rendre une interruption récupérable.

## Sauvegarde et commandes de préparation

Utiliser les dépendances existantes de `functions/`, Node 22, ADC pour `livepalmes`, le mot de passe NAP dans `NAP_DB_PASSWORD` et une **clé privée existante** dans le fichier désigné par `CLUB_MERGE_KEY_FILE` (32 octets minimum). Ne jamais mettre ces valeurs dans les arguments, le dépôt, le chat ou un log. Aucun secret n'est créé/récupéré automatiquement.

Sans argument, `node tools/club-merge.js` affiche l'aide, sans charger de client ni contacter une base.

```text
node tools/club-merge.js --prepare <operation> <archive-privee> <copie-durable>
node tools/club-merge.js --verify-backup <archive-privee> <copie-durable>
node tools/club-merge.js --check <archive-privee> <copie-durable>
```

`--prepare` lit NAP/Firestore et crée seulement des fichiers locaux chiffrés ; `--check` relit les données sans écrire en base. `--verify-backup` fonctionne hors réseau. Prévoir deux emplacements privés préexistants, dont une copie durable hors de la machine d'exécution, et vérifier leurs accès ainsi que l'accès de l'opérateur de restauration à la clé. Le contrôle de deux chemins différents ne prouve pas deux supports indépendants : cette propriété est vérifiée par l'opérateur.

L'archive contient les lignes complètes, images avant/après, cibles inchangées, profils/droits/demande, versions Firestore, projections et contrôles des imports/réservations. Encodage typé sans perte pour Buffer, NULL, vide, zéros initiaux, grands nombres en chaîne et dates SQL à six décimales ; tout Number entier non sûr ou Date JavaScript est refusé. Compression bornée puis AES-256-GCM avec `production-backup-crypto`. Écriture exclusive, fsync, réouverture des deux fichiers réellement enregistrés, authentification, comparaison et reconstruction du plan. Aucun écrasement d'archive existante. Archives et journal hors dépôt ; aucune donnée nominative en sortie console.

**Aucune archive réelle n'a été créée au cours du développement.** Les preuves de chiffrement et de restauration proviennent des fixtures ; elles ne prouvent ni la clé réelle ni un export opérationnel. Aucune restauration vers une base réelle, même isolée, n'a été lancée. Le test réel des privilèges, des verrous MyISAM et de leur durée doit être réalisé dans la fenêtre approuvée avant d'annoncer une exécution possible.

## Exécution future, reprise et restauration

Après accord explicite distinct, revue des preuves et sauvegardes rouvertes : `--apply <archive> <copie> <preuves.json> <journal-prive>`. Même commande et **mêmes archives** pour reprendre. Ne pas lancer une nouvelle préparation pour remplacer l'état initial après une interruption. Une restauration exige son propre accord et utilise `--restore` avec `direction:restore`.

Le fichier privé de preuves contient `operation`, `planDigest`, `direction` (`apply` ou `restore`), `approval.quote` et `approval.context` exacts, `productionCommit`, `projectionReplayProof` (run GitHub authentifié à examiner), `projectionReview`, et `maintenance` (`operator`, `proof`, `startsAt`, `endsAt`). Fenêtre de 15 minutes maximum ; chaque étape revérifie l'expiration. Ces références sont une attestation examinée par l'opérateur, pas un validateur cryptographique de l'accord ou des permissions PROD. Un nouveau risque ou une dérive bloque la suite.

1. Relire et classifier toutes les images avant la première écriture. Cible inchangée, aucune nouvelle ligne, aucun conflit de clé ou de champ ; nouvelle source/dépendance interdit le lot.
2. Sous `LOCK TABLES`, transférer les références SQL avec clé primaire indexée **et** comparaison binaire sensible aux accents, casse, NULL et image complète. Pas de `INSERT IGNORE`, remplacement, cascade ni transaction globale fictive. Journal chiffré fsync avant et après chaque mutation ; fermeture de connexion et libération des verrous sur erreur. Session autocommit explicite pour les tables InnoDB. Verrou borné à 60 secondes par phase, attente à 10 secondes ; une expiration est une interruption à examiner, jamais un accusé de réussite.
3. Libérer les verrous avant Firebase et avant toute attente de projection. Bascule de trois documents Corbie par un seul commit conditionnel `updateTime`, avec masques exacts et vérification atomique des quatre documents gardés. Aucun compte Auth ou custom claim touché.
4. Contrôler les projections privées nationale/régionale, liste administrateurs, destinataires et NAP. La version SQL doit égaler la version courante du profil ; rôles, email et préférences conservés. Si un worker n'a pas encore convergé, arrêter et reprendre ultérieurement ; pas de boucle agressive ni réparation globale.
5. Après nouvelle capture Firebase et contrôle des références SQL sous verrou, supprimer les 14 sources par images exactes. Les lignes déjà supprimées sont reconnues. Vérifier l'ensemble avant levée de la fenêtre.

Reprise : image avant = à faire ; image après = déjà fait ; toute autre image = dérive, arrêt. Un accusé perdu ou un journal incomplet n'entraîne pas de double application. Les lignes/données étrangères ne sont jamais écrasées. L'archive initiale, et non le journal, fait autorité.

Restauration : préflight complet avant toute écriture ; recréer d'abord les sources absentes avec leurs identifiants, puis rétablir les seules références, puis les trois documents Corbie et la convergence des projections. Une clé réutilisée bloque. Pas de restauration de table entière, de diminution AUTO_INCREMENT ou de copie d'un ancien `source_version` : le synchroniseur génère la version courante. Dates techniques de projection et versions Firestore peuvent changer ; données métier et droits doivent retrouver l'image avant. Le retour arrière lui-même est reprenable.

## Contrôles automatisés et limites des preuves

`tests/club-merge-tests.js` : 46 points d'interruption après mutation SQL/commit Firestore, en application et en restauration ; reprise et restauration depuis chaque état ; 95 frontières du journal ; perte d'accusé, répétition, cible/ligne/droit divergent, nouvelle référence, clé réutilisée, collision de clé composée, compte supplémentaire, sauvegarde altérée/mauvaise clé, types sans perte. Fixture volumineuse de 133 nageurs et 455 performances. Personnes et résultats fictifs, identifiants de clubs du plan approuvé.

`tests/club-merge-adapters-tests.js` : vrais adaptateurs, transport simulé, masques Firestore et refus atomique si un compte gardé change entre lecture et commit ; sentinelles, CAS SQL indexé/binaire, suppression/réinsertion et libération des verrous. Inclus dans la vérification globale. Ces tests ne remplacent pas un serveur MySQL/Firestore réel, ne mesurent pas le verrouillage distant et ne prouvent pas la maintenance. Aucun test d'intégration connecté n'est déclenché automatiquement.
