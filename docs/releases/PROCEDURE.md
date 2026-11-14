# Procédure courante TEST et PROD

<!-- description: Exécution actuelle des livraisons, prérequis précoces, preuves compatibles, reprises et mesure du délai complet ; historique séparé. -->

## Périmètre et autorisation

Choisir le parcours dans [PUBLICATION.md](../agents/PUBLICATION.md). Les accords sensibles d’AGENTS.md restent nécessaires. Une autorisation de code ne couvre ni données réelles ni messages, y compris depuis TEST qui peut partager NAP. Aucun déploiement applicatif pour la seule documentation ou le seul outillage.

L’accord PROD est une instruction explicite d’Antoine dans Infra sur le périmètre présenté. Un accord déjà donné, éventuellement conditionnel, suffit lorsque ses conditions sont remplies. Nouvelle version, élargissement ou risque nouveau : nouvel examen. Les protections GitHub restent obligatoires.

## 1. Préparer et vérifier une seule version

Partir du dernier `main` et conserver les autres travaux. Une PR courte réunit le besoin, les tests ciblés, la documentation et le contrat requis avant la première CI. Garder les corrections dans cette PR. Aucun nouveau framework, moteur de publication ou benchmark ajouté à une livraison habituelle.

La CI obligatoire garde ses jobs application, publication et navigateur en parallèle, puis la synthèse `Verification technique` qui exige leurs réussites. Documentation seule sous `docs/*.md` : contrôle UTF-8/description/conflits, sans runtime ni tests applicatifs. AGENTS.md, outillage, workflows, dépendances et chemins inconnus gardent les contrôles complets.

Les tests communs sont déclarés dans `tools/verification-tests.json` et lancés par `tools/run-verification-tests.js`. Les cinq anciennes duplications application/publication restent supprimées. Un nouveau fichier `tests/*-tests.js` ou `tests/*-tests.py` sans parcours déclaré bloque ; les 45 fichiers auparavant hors circuit commun restent explicitement inventoriés dans `standalone`, sans exécution automatique nouvelle. `publicationFallback` conserve le complément historique des promotions sans preuve compatible. L’inventaire ne permet aucun choix manuel pendant un run.

Ajouter un test courant dans l’inventaire ne modifie pas le contrôleur. Le runner, le workflow et les contrôleurs de provenance restent protégés : leur modification impose les tests complets sur main. Toutes les sources, dépendances, tests, inventaire et chemins inconnus participent toujours à l’empreinte Git complète PR→main.

Les succès sont regroupés dans les journaux par protection actuelle ; un échec indique le fichier et la famille concernés. Les détails restent disponibles. La syntaxe vérifie les fichiers JavaScript suivis et les nouveaux fichiers non ignorés, hors dépendances et sorties temporaires ; quatre processus maximum, erreur toujours bloquante. Le contrôle des espaces Git reste conservé, notamment pour les éventuelles sorties produites pendant les tests.

Firestore conserve sa sélection actuelle. MySQL peut être omis seulement pour un diff composé de CSS/images connues à la racine, sous `assets/` ou `css/`, et de documentation Markdown sous `docs/`. HTML, JavaScript, backend, outillage, configuration et chemins inconnus conservent ses trois tests isolés. Une suite non requise ne produit aucune fausse preuve de réussite.

Une sélection complémentaire fermée dans `verification-test-impact.json` peut omettre six contrats applicatifs de structure/empreintes serveur et un comparateur publication pour des **modifications de CSS existants seuls**, avec Markdown éventuel. Les liens HTML de racine peuvent seulement changer la valeur `?v=` des mêmes CSS modifiés : texte, scripts, autres attributs et structure doivent rester identiques. Ajout, retrait, renommage, lien symbolique, autre code ou contexte incertain : suite complète. Aucun parcours navigateur ou test d’interface n’est retiré.

Ces indépendances ont été revues sur les corps de tests et leurs dépendances exécutées. Leurs empreintes normalisées sont figées ; source inspectée modifiée ou catalogue incompatible : repli complet avec motif « contrat à réexaminer ». Une empreinte ne doit jamais être simplement recalculée pour masquer une nouvelle dépendance. Le catalogue et le sélecteur sont des contrôleurs protégés, distincts de l’inventaire courant des tests. La sélection dérive du diff Git exact et de l’événement CI authentifié, sans entrée de workflow permettant de choisir les tests. Hors CI de vérification, le runner reste complet, notamment pour les parcours de secours de publication.

Les artefacts séparés `ci-test-selection-application` et `ci-test-selection-publication` indiquent base/candidat, fichiers exécutés, tests non requis et motifs. Un rapport en attente ou une suite échouée ne vaut jamais réussite ; une modification des sources suivies pendant une suite sélective refuse sa preuve. Les preuves PR→main conservent leur provenance, leur intégrité, leur environnement exact et la synthèse obligatoire. Les suites non requises Firestore/MySQL ne produisent aucune preuve artificielle, y compris à travers la frontière du conteneur CI.

Dans le conteneur CI figé, les suites application, publication et navigateur exécutent leur sélection dans des copies Git locales jetables : quatre au maximum pour l’application, deux pour publication/navigateur, bornées aussi par les processeurs disponibles. Chaque copie conserve le commit et l’historique exacts, son index et ses temporaires privés ; seuls les paquets déjà installés sont partagés. Aucun test n’est retiré par cette répartition et aucun paramètre de workflow ne choisit les tests. Une copie ne peut pas relancer un pool. Hors de ce conteneur, les commandes restent séquentielles.

Le runner attend tous les tests lancés et vérifie la couverture unique avant toute réussite. Échec, signal, dépassement de délai, sortie excessive, préparation impossible ou modification des sources suivies dans une copie ou le dossier d’origine bloque la preuve. Les reçus distinguent durée écoulée du groupe et durées des fichiers, sans les additionner comme délai de livraison. Le pool est un contrôleur protégé : son changement impose la première CI main complète.

Les contrats lisant la vue logique historique du serveur et du portail partagent aussi sa reconstruction. Le helper de tests vérifie le contenu exact de chaque source lue, son propre code, ses helpers et le parseur avant de reprendre cette vue ; une dépendance modifiée ou absente impose le calcul courant. Une charge de cache altérée est refusée. Les lectures brutes et les tests d’exécution continuent d’utiliser les fichiers réels ; aucune assertion ni règle applicative n’est remplacée par le cache.

## 2. Publier TEST commun si nécessaire

Après CI main réussie, `livepalmes-test-automatic.yml` ne prépare que le parcours d’interface ordinaire connu. Le diff complet depuis TEST et la référence PROD est contrôlé. Un commit de documentation/outillage seul ne déclenche aucun déploiement applicatif. Une opération sensible exige son parcours manuel et apparaît comme telle ; une panne API, preuve inaccessible ou provenance invalide reste un échec. Les snapshots datés `.github/releases/evidence/*.rules` sont des métadonnées conservées dans le diff, pas des règles déployables ; les vrais fichiers de règles et configurations restent sensibles.

TEST commun est publié par `livepalmes-test-common.yml`, sur un commit intégré exact de `main`. Un aperçu `pr-N` ne le remplace pas ; il reste facultatif sur demande avec `apercu-test`. Les aperçus partagent TEST et ne prouvent aucune isolation des données.

Hosting seul (`hosting_only=true`) exige l’équivalence backend et ses preuves. Pour des sources existantes autorisées et éligibles, utiliser `standard` dans `livepalmes-test-mail-sources.yml`, avec `standard_request` calculé par l’assistant : candidat, baseline TEST authentifiée, sélection complète et référence de l’accord. Contrôler sources/labels et états techniques, puis Hosting commun du même candidat et `verification_only=true`, sans seconde publication de sources. Ce contrôle final ne produit volontairement aucun nouveau `test-proof` ; conserver la preuve commune et la provenance du contrôle final séparément.

Les fonctions exclues, mails, schedulers, changements de configuration et règles suivent un contrat spécifique. Les anciens flags et accords ne s’étendent jamais à un autre candidat. Références et limites : [CONTRATS_ET_REPRISES.md](CONTRATS_ET_REPRISES.md).

## 3. Préparer le bilan PROD

### Découvrir les prérequis avant de fermer un nouveau contrat

Une interface ordinaire avec identités et capacités déjà attestées n’exige pas un nouvel audit général. Réutiliser les preuves compatibles. Pour un besoin nouveau ou incertain, le mode `discovery_json` du workflow existant `livepalmes-production-readiness.yml` observe la cible avant de supposer sa baseline. Fournir `preparation_run=0`, les deux anciens modes à false, et un JSON fermé : `candidate` complet déjà ancêtre de main, `services` parmi `hosting`, `sources`, `rules`. L’assistant prépare ces entrées.

La découverte exige main, tentative 1, workflow officiel, environnement production protégé et CI publication exacte de l’outillage. Elle utilise les deux comptes existants. Rapports séparés `production-discovery-*` : identité publique uniquement, permissions requises/manquantes, Hosting observé, inventaire technique des fonctions si demandé et source Rules si lisible. Aucun credential, valeur de secret, modification IAM, écriture Rules, invocation métier ou donnée sportive. Une permission d’écriture manquante n’empêche pas de conserver l’état déjà lisible. Le rapport n’est ni un contrat, ni un reçu de prérequis prêt, ni une autorisation de publication.

Budget par identité : un test groupé des permissions ; pour Hosting une lecture de référence, et pour Rules une release et un ruleset ; pour sources l’inventaire existant borné à 500 fonctions maximum. Aucune lecture métier NAP/Firestore, aucun appel par nageur ou destinataire. Une lecture refusée ou incomplète reste visible et bloque toute affirmation de disponibilité correspondante.

### Assembler plutôt que ressaisir

`livepalmes-release-draft.yml` assemble sans Firebase le run TEST choisi, la dernière PROD authentifiée et les retours utilisateur authentiques. Chaque évolution porte titre, commits complets, statut validé et citation avec `source: {threadId, messageId, text}` ; l’assistant lit le message humain. Une validation de toute la version présentée couvre ses évolutions, sans demander une confirmation répétée. Une retouche postérieure invalide les fichiers touchés.

L’artefact `release-draft` contient `request-draft.json`, `draft-status.json`, `full-diff.json`, `proof-decisions.json`, `delivery-state.json`, le manifeste standard applicable et un résumé. Tout le diff reste inventorié, outillage et documentation compris. Fichier applicatif non couvert, retour absent ou revue sensible manquante : blocage explicite.

Un dossier bloqué termine désormais le workflow en échec après rédaction du diagnostic ; les artefacts restent conservés même dans ce cas. Un workflow vert ne signifie donc plus seulement que le fichier de bilan a été produit. Dépendances du lecteur d’empreintes et réutilisation après documentation seule suivent le parcours déjà intégré, sans nouvelle exception. Préparer le périmètre PROD et ses éventuels besoins sensibles dès TEST, avant d’annoncer le candidat prêt ; aucune correction du circuit ne doit être déduite d’un accord de promotion ordinaire.

`delivery-state.json` est le point de reprise initial : objectif, candidat applicatif, outillage, preuves, phase, blocages et prochaine action. Maintenir ce même point pendant la livraison avec accords, opérations distantes et jalons. Après interruption, le relire et vérifier les runs distants avant toute action ; ne pas reprendre un objectif terminé.

### Sources existantes et preuves compatibles

Le moteur permanent `standard-source-policy.py` / `standard-source-publish.py` reçoit seulement `standardSources`, distinct des anciens contrats. `sources_authorization_json` fournit candidat, noms autorisés et source humaine. Le preflight calcule `standard-source-manifest.json` depuis toutes les origines PROD authentifiées, avec deux comparateurs concordants. La sélection complète doit être exactement celle autorisée. Aucun nom retiré à la main, aucune ancienne exception élargie.

Seuls source et label sont modifiés (`build_config.source,labels`). Configurations, secrets/bindings, autres fonctions, mails actifs tous clubs et témoins automates/modèles sont conservés. Création/suppression distante, nouvelle configuration, IAM, donnée et fonctions exclues sont refusés. Les origines inconnues ou dépendances non isolables imposent le repli prudent ou un parcours spécifique ; elles ne prouvent jamais une équivalence.

`reuse_evidence_json` peut reprendre preflight et prérequis authentifiés du même plan, candidat, sélection, référence et contrôleurs. La comparaison prudente actuelle du répertoire `tools` est conservée ; ne pas la réduire sans démonstration des dépendances. Les contrôles frais de dérive et la sauvegarde ne sont jamais déduits d’une preuve ancienne.

`freezeTestCandidate: true` conserve le candidat ordinaire validé et sa preuve TEST. Une version TEST descendante n’est recevable qu’avec preuve applicative exacte et état frais conforme. Les exceptions sensibles gardent leur propre contrat ; aucune sélection silencieuse de fichiers, aucune copie TEST vers PROD.

Réexamen national des demandes d’officiels du 13 novembre : contrat distinct immuable `20261113-production-official-review-contract.json`, option `officialReviewRelease.contractSha256`, candidat TEST `90cc44b7`, deux sources/labels calculées et 117 fonctions conservées depuis la PROD 43419140643. Le contrat spécifique couvre le changement exact de déclaration ; les exclusions standard et les anciens contrats restent inchangés. Le transport permanent est partagé par une politique interne fermée, sans entrée de workflow permettant de choisir les noms ou les masques. Configurations, bindings, mails actifs et témoins conservés ; aucune demande réelle traitée. CI/prérequis/preflight, sauvegarde chiffrée rouverte/comparée et dérive fraîche restent obligatoires. Aucune reprise automatique de ce nouveau contrat.

Après documentation seule, la réutilisation CI vérifie chaque bord Git du premier parent (dix au maximum), la CI main réussie de chaque commit et le ZIP authentifié de la preuve source. Seuls `docs/*.md` sans code ni contrôleur modifié permettent cette équivalence ; le fichier de preuve d’origine n’est jamais réécrit au nouveau candidat et un reçu distinct conserve les liens. Une preuve présente mais invalide/expirée/incompatible ne déclenche aucune recherche d’un ancêtre. Ce complément ne modifie ni les sélections de tests ni leurs replis complets.

### Contrôler et présenter le plan

Lancer `livepalmes-production-preflight.yml` sur main avec exactement une entrée : `request_json` (64 Kio maximum, clés uniques) ou `request_file` sous `.github/releases/`. La PR d’un manifeste seul est facultative. Le preflight ne lit pas Google et ne déploie rien. Il authentifie TEST et les artefacts de dernière PROD, reconstruit les origines, vérifie la couverture et calcule la sélection.

Les preuves applicatives du candidat figé et celles de l’outillage sont distinctes. Les suites exactes compatibles sont réutilisées ; absence, expiration, altération ou incompatibilité impose le contrôle concerné. PR→main exige une fusion à deux parents, même dépôt et branche, contenu Git complet identique, contrôleurs inchangés depuis la base fiable, tentative 1 réussie, ZIP authentifié et environnement exact compatible. Les images, Node/JDK/MySQL/navigateur et protections du conteneur restent ceux de la politique actuelle. Le repli complet et la synthèse obligatoire sont conservés.

Pour les prérequis du plan : `livepalmes-production-readiness.yml`, `preparation_run=<run du plan>`. Identités publiques, permissions, dérive et capacités concernées sont attestées en lecture seule. En cas de mismatch Rules, source, empreinte et métadonnées observées sont conservées même si le contrat reste refusé. Aucune référence n’est réinitialisée automatiquement. Les anciens modes `identity_only` et `rules_observation_only` restent bornés à leur contrat historique.

« Prêt PROD » exige le candidat complet validé, les accords sensibles, les preuves recevables, le preflight et les prérequis adaptés sans permission manquante. Présenter dans Infra évolutions, sélection/exclusions, preuves, sauvegarde, retour arrière et éventuels blocages. L’accord explicite d’Antoine porte sur cette version ; il ne supprime aucune protection GitHub.

## 4. Publier PROD après accord

Lancer `livepalmes-production-release.yml`, `preparation_run=<run approuvé>`, `resume_run=0` et confirmation explicite. Environnement production limité à main, aucun déploiement sur push.

1. Authentifier plan et preuves, checkout exact, état TEST et référence PROD. Toute dérive bloque avant écriture.
2. Sauvegarder code, configurations concernés, référence Hosting et règles autorisées ; chiffrer, rouvrir et comparer avant publication.
3. Publier uniquement les fonctions calculées selon le parcours autorisé ; sans sélection backend, aucune préparation/simulation/publication Functions. Contrôler inventaire complet, états et exclusions.
4. Publier Hosting en dernier depuis le checkout propre. Refuser fichiers non suivis, credentials et liens sortants ; conserver caches et rewrites hors accord spécifique.
5. Contrôler fichiers servis, CSP/cache et témoins du lot. Le lecteur Hosting conserve ses trois tentatives bornées avec attentes de 5 puis 15 secondes ; aucun script applicatif exécuté.

Les opérations sur règles/index, données, migrations, Storage, invocations et messages ne sont pas incluses dans le parcours ordinaire. Une sauvegarde de code ne restaure pas les données métier.

## 5. Conclure ou reprendre

Confirmer résultat effectif, contrôles, preuves, limites et blocages. Regrouper le registre après fusion ; aucun nouveau déploiement pour sa seule clôture. Distinguer développement terminé, CI réussie, publication vérifiée et validation humaine.

Si un déploiement est interrompu, conserver plan, sauvegarde initiale et révisions partielles authentifiées. Après examen de l’état distant et avec l’accord applicable, `resume_run=<run interrompu>`, `preparation_run=0` dans un nouveau run ; pas de « Re-run jobs » ambigu pour une publication. Hosting reste bloqué tant que les contrôles nécessaires ne passent pas.

Retour arrière sur demande explicite avec `livepalmes-production-rollback.yml`, artefacts/empreintes et environnement protégé. Code/Hosting seulement, aucune restauration métier implicite. Conserver la clé backend d’origine pendant les 14 jours de conservation des sauvegardes.

## Mesurer le délai complet

Conserver dans le point de reprise les jalons `requested`, `code-ready`, `test-verified`, `user-validated`, `production-ready`, `production-approved`, `published`, `verified`, `closed`, avec heure et fuseau explicites et source vérifiable. Ne renseigner que les jalons réellement atteints. Annoter séparément attentes externes et reprises ; aucune minute attribuée sans preuve.

`python tools/ci-runtime.py delivery <journal.json>` lit un objet `milestones` (liste de `{phase, at, source}`), calcule les intervalles disponibles et n’autorise aucune action. `ci-runtime.py timings` sépare installations et vérifications GitHub ; `compare <run-PR> <run-main> <dossier>` authentifie les preuves de suites d’une paire compatible. Les jobs parallèles ne sont jamais additionnés au délai total. Les cibles 15 min TEST, 10 min PROD ordinaire et 15 min sources déjà couvertes restent des objectifs à mesurer, pas des garanties ; le temps de préparation reste visible.

## Historique et contrats spécifiques

Les [contrats et reprises spécifiques](CONTRATS_ET_REPRISES.md) préservent intégralement les détails de livraison antérieurs au rangement de cette procédure, notamment Rules Direct, bindings, exclusions et reprises partielles. Les [références agents historiques](../agents/PUBLICATION_HISTORIQUE.md) et le [registre](EVOLUTIONS.md) complètent les preuves. Aucun ancien accord n’est reporté sur un nouveau besoin.
