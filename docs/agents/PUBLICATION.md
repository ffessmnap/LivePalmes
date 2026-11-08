# Publication LivePalmes — parcours quotidien

<!-- description: Parcours court TEST/PROD, réutilisation des preuves et protections à conserver ; exécution technique dans PROCEDURE.md. -->

## Choisir le parcours

Lire les consignes du dernier `main` et préserver le travail des autres conversations. Une demande de développement autorise PR, intégration après contrôles et TEST dans son périmètre. Une analyse seule ne déclenche aucun développement. Les accords sensibles d'`AGENTS.md` restent nécessaires ; un accord explicite déjà acquis ne se redemande pas.

| Changement | Parcours |
| --- | --- |
| Documentation seule | Relecture et CI requise. Aucun déploiement ni preflight. |
| Interface seule | Tests ciblés, contrôle ordinateur/mobile pertinent, CI puis TEST commun. Hosting seul si le backend est équivalent et prouvé ; toute différence ou preuve absente bloque ce mode. |
| Backend existant autorisé | Tests concernés, CI, sélection calculée des fonctions différentes, contrôles backend puis Hosting. Expliquer les dépendances qui élargissent la sélection. |
| Données, droits, mails, infrastructure ou autre opération sensible | Accord explicite sur l'opération et ses limites, puis parcours spécifique. Aucun ancien accord ne s'étend à un nouveau besoin. |

## Enchaîner les étapes autorisées

**PR → CI → TEST commun → retour utilisateur → bilan PROD → accord Infra → PROD.** L'assistant gère les commits, runs, preuves et manifestes. Les commandes et contrats techniques figurent dans la [procédure actuelle](../releases/PROCEDURE.md).

1. Une PR courte par besoin depuis `main`, avec les tests et la documentation utiles. Attendre les contrôles GitHub obligatoires. L'aperçu `pr-N` est facultatif, sur demande via `apercu-test` ; il ne remplace pas TEST commun.
2. Après CI main réussie, laisser l'automatisme publier les interfaces ordinaires connues sur TEST. Backend, chemins inconnus et cas sensibles suivent le parcours explicite. TEST commun reste un commit intégré de `main`, jamais une branche isolée. Conserver la preuve de réussite.
3. Recueillir le retour utilisateur sur la version commune présentée. Une validation explicite de toute cette version couvre ses évolutions présentées, sans confirmation individuelle répétée ; une validation partielle reste partielle. Une modification ultérieure invalide les parcours concernés. Une CI verte ne vaut pas validation utilisateur.
4. Assembler le bilan PROD depuis les preuves et retours authentiques, compléter les points bloquants et exécuter le preflight existant. Figer le candidat validé pour exclure les ajouts suivants. Présenter un bilan court dans Infra ; l'accord explicite d'Antoine autorise uniquement ce périmètre. La PR d'un manifeste seul n'est pas obligatoire.
5. Publier après cet accord, vérifier le résultat et fournir les liens utiles. Une approbation GitHub encore requise reste obligatoire.

## Réutiliser le travail déjà fait

| Situation | Action attendue |
| --- | --- |
| CI ou publication en cours | Attendre le run existant avec une attente bornée. Aucun second lancement identique ni annulation d'une publication engagée. |
| Preuve CI exacte compatible | Réutiliser les suites applicative et publication attestées ; sans preuve compatible, exécuter la suite concernée. Garder les contrôles frais de l'état déployé. |
| Petite interface, backend équivalent et prouvé | Hosting seul. Ne pas redéployer les fonctions pour aligner leur SHA sur celui de Hosting. |
| Version TEST déjà publiée et validée | Réutiliser sa preuve pour PROD. Ne relancer TEST que si la version, son état ou la validité de la preuve l'exige. |
| Permissions et capacités inchangées, déjà attestées | Réutiliser les preuves compatibles. Nouveauté, doute ou preuve manquante : contrôle ciblé des prérequis. |
| Sélection backend large | Expliquer la dépendance commune ou la preuve manquante. Ne pas réduire la sélection à la main ; une amélioration du sélecteur ou une extraction métier constitue un besoin distinct. |

Pas de benchmark, audit général, rapport HTML ou refonte d'outillage ajouté à une livraison ordinaire. Ne répéter un contrôle que si un changement, un échec ou une preuve incompatible le justifie. Inclure le suivi dans la PR ouverte ; après fusion, lier les preuves GitHub et regrouper la mise à jour de `docs/releases/EVOLUTIONS.md`, sans PR par résultat de contrôle. Distinguer déploiement et validation, durée totale et attentes externes.

## Protections conservées

Préparation Infra du 8 novembre : le complément `novemberValidatedRelease` est fermé à l’application TEST `a422125b`, à la PROD Direct du 6 novembre et aux preuves nommées dans `20261108-production-validated-contract.json`. Les 102 ordinaires calculées restent incluses ; après revue explicite de deux préférences conservées, sélection totale de 117 : sources/labels pour 115 existantes, deux créations ordinaires, puis Hosting. Les deux préférences restent aux révisions identiques TEST/PROD ; une preuve statique fermée démontre leur closure inchangée, sans assouplir la preuve TEST des sources publiées. Seule exception de configuration préparée après l’accord ciblé d’Antoine : six liaisons SMTP existantes sur `resolveAccessUserDeletionRequest`, versions 1, compte runtime conservé. Aucun autre secret, IAM, règle, index, réglage, donnée ou activation ; mails tous clubs et automates restent actifs et inchangés, sans rattrapage. Cet accord de préparation ne vaut pas accord PROD ; preflight, prérequis et bilan final dans Infra restent requis.

- Version exacte, diff applicatif entièrement couvert, validations authentiques et preuves GitHub vérifiées. Une évolution incluse et non validée bloque ; aucune sélection silencieuse de fichiers.
- PROD : accord Infra sur le bilan précis, environnement `production` limité à `main`, contrôle frais de dérive, sauvegarde chiffrée rouverte et comparée avant écriture, retour arrière disponible et vérifications finales.
- Aucune copie TEST→PROD, migration, correction/génération de données, publication Storage, règle/index, suppression, invocation métier ou envoi de test implicite. Fonctions email/schedulers et opérations sensibles restent dans leurs contrats autorisés.
- Préserver exclusions et réglages mail courants. Ne pas couper, réactiver ou élargir les envois sans plan explicite. Un ancien plan IDF ne prouve pas le périmètre mail actuel.
- Accord de coordination du 8 novembre : les deux chantiers mails peuvent utiliser le complément TEST de sources fermé par lot dans `20261108-test-mail-sources-contract.json`. Chaque entrée fixe sa version applicative ; le commit main exact, y compris l’outillage, doit réussir sa propre CI. Le lot suivant reste bloqué tant que son entrée fermée n’existe pas. File/planificateur déjà suspendus et mails déjà désactivés requis ; aucun changement d’état, permission, message ou PROD. Exécution dans la procédure courante.
- Accord complémentaire d’Antoine du 8 novembre après le refus de lecture des tâches : confirmer d’abord le `client_email` réel du workflow, puis autoriser uniquement `cloudtasks.tasks.list` au compte backend TEST sur la seule file `processNapNotificationTask`, via `livepalmesTestTaskMetadataReader`. Cette exception IAM n’autorise aucun autre droit, réglage ou projet ; le complément de sources ne modifie pas IAM.
- Source inconnue, preuve incompatible, dérive ou contrat refusé : arrêter l'écriture et expliquer le point bloqué. Ne pas élargir les permissions pour débloquer une livraison.
- Nouvelles demandes d’Antoine du 8 novembre : contacts multiples/copies puis rappel J−1 des compétitions, en deux livraisons TEST successives. Chaque nouveau lot possède son propre contrat fermé à son candidat et sa baseline commune réelle ; `contacts` utilise `20261108-competition-mail-contacts-contract.json`. Les anciens contrats `models`/`decisions` et leur reprise restent inchangés. Même périmètre maximal des six consommateurs de sources, mêmes gardes et permissions, aucun envoi, programmation réelle, migration, nouvelle liaison SMTP/secret/permission, activation de file/planificateur ou PROD. Le second lot attend la fin du premier et son contrat propre.
- Contacts est clôturé sur TEST en `9b9dae56`, contrôle final 42473496899 réussi. Le rappel utilise uniquement `release=reminder` et `20261108-competition-deadline-reminder-contract.json`, avec cette baseline commune réelle et ses six consommateurs calculés (catalogue/rendu partagés inclus). Contrats antérieurs et leurs empreintes inchangés ; mêmes préservations et aucun déclenchement réel.

- Nouveau chantier TXT officiels du 8 novembre : Antoine confirme le même `OFF` à six champs pour la piscine et autorise l'enchaînement TEST après les deux lots mails. `release=officials_txt` utilise uniquement `20261108-txt-officials-contract.json`, ancre applicative `59ff0467`, baseline réelle `257f4271` / TEST 42477367936 contrôlé par 42478168092. Trois sources conservées calculées seulement : clôture, worker NAP et tâche NAP ; plafond global des six noms et contrats antérieurs inchangés. Aucun droit, réglage, invocation, programmation, donnée, envoi, activation ou PROD. Les cinq consommateurs ordinaires du générateur commun sont conservés dans la sélection calculée, y compris leurs dépendances de qualification, sans changement de règle sportive.

- Trophée départemental du 8 novembre : décision métier explicite d’Antoine et livraison TEST confiée à la coordination. `release=trophy_departmental` utilise le contrat distinct `20261108-trophy-departmental-contract.json`, ancre `c6d81e8e`, baseline TXT `a2372e76` / TEST 42481737517 / contrôle 42482039649. Le point d’entrée existant choisit un exécuteur dédié fermé à `readNapPublicSwimmer` et `manageDamienHebertEdition` ; les six noms mails, leurs contrats et les lots ordinaires ne changent pas. Sources/labels seulement, configurations et édition TEST conservées par empreintes ; aucune invocation, donnée, permission, activation ou PROD.

Les [anciennes consignes](PUBLICATION_HISTORIQUE_20261026.md) et les [contrats datés](../releases/PROCEDURE_HISTORIQUE_20261026.md) servent uniquement à une reprise ou exception identifiée. Leurs autorisations restent bornées à leurs versions.

Correctif dates OFF du 8 novembre : nouvelle demande explicite de conserver les composantes source même invalides dans le TXT uniquement, après clôture des trois adresses. `release=officials_dates` utilise le contrat distinct `20261108-txt-official-dates-contract.json`, ancre `43122fa5`, baseline réelle `0ed4890b` / TEST 42492806085 / final 42493447083. Treize consommateurs ordinaires du lecteur partagé et trois sources conservées calculées (clôture, worker NAP, tâche NAP), sans réduction manuelle, changement de règle sportive ou élargissement des six noms mails. Lot applicatif/tests/documentation/contrat complet avant première CI ; revue centrale du plan avant publication sensible, puis CI PR/main exactes, sources/labels, TEST commun et final sans déploiement. Aucun ancien contrat réutilisé, accès métier supplémentaire, donnée/export/import réel, message, activation, programmation, permission ou PROD.
