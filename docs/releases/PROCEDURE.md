# Procédure courante TEST et PROD

<!-- description: Procédure unique actuelle pour exécuter une livraison proportionnée, réutiliser ses preuves et conserver les protections PROD. -->

## Périmètre et autorisation

Choisir le parcours dans [PUBLICATION.md](../agents/PUBLICATION.md). Une demande de développement autorise TEST pour le besoin décrit ; une simple analyse ou une retouche documentaire ne déclenche pas de déploiement. Les opérations sensibles gardent leur accord explicite. Pour PROD, présenter le bilan précis et obtenir l’accord d’Antoine dans Infra avant l’écriture. Ne pas répéter une demande d’accord acquise pour ce périmètre ; une simple validation TEST ne vaut pas accord PROD. Un écart ou un nouveau risque impose un nouvel examen.

Préserver les exclusions du lot et le réglage des mails en place. Une autorisation ancienne, une source NAP existante ou une sauvegarde de code n’autorise ni migration, ni correction de données, ni envoi, ni restauration métier. Un rollback de code n’annule pas les écritures métier.

## 1. Préparer et vérifier une seule version

- Partir de `main` à jour, préserver le travail des autres conversations et regrouper code, tests ciblés et documentation utile dans une PR par besoin. Ne pas remplacer TEST commun par une branche isolée.
- Exécuter les contrôles locaux proportionnés au comportement modifié et laisser la CI obligatoire produire les vérifications globales prévues. Les suites applicative et de publication tournent en parallèle sur des runners distincts. La synthèse obligatoire « Verification technique » exige les deux réussites ; aucun artefact de vérification n’est réutilisable tant que le run entier n’a pas réussi. Les cinq tests communs restent dans la suite applicative obligatoire, sans seconde exécution dans la suite publication. Ne pas doubler manuellement une suite réussie du commit exact. Un échec, un nouveau changement ou une preuve incompatible justifie une nouvelle exécution.
- La syntaxe de tous les fichiers JavaScript est contrôlée avec au plus quatre processus indépendants ; toute erreur bloque toujours la suite. Les tests applicatifs restent complets et séquentiels. Pour les seules feuilles de style et images connues sous `assets/` ou `css/`, les règles Firestore sont inchangées : l'émulateur n'est pas lancé. Un mélange avec un chemin backend, une configuration ou un chemin inconnu conserve le contrôle Firestore.
- Garder les approbations et contrôles techniques exigés par GitHub. La CI cible seulement la documentation pour les Markdown de `docs/` ; `AGENTS.md`, les scripts, la configuration, les workflows et les chemins inconnus conservent actuellement leurs contrôles complets. Ne pas modifier ce classement pour accélérer une livraison documentaire.
- Aperçu facultatif : étiquette `apercu-test` sur demande explicite. Retirer l’étiquette arrête les prochains aperçus ; les canaux existants expirent. Aucun aperçu pour la documentation seule. Les aperçus partagent les services TEST et ne valent pas recette de la version commune.
- Intégrer après contrôles ; une retouche documentaire seule n’exige aucun déploiement TEST ou PROD, aucun preflight ni démonstration supplémentaire du circuit.

## 2. Publier TEST commun si nécessaire

Après la CI main réussie, `livepalmes-test-automatic.yml` classe les changements depuis la dernière preuve TEST authentifiée. Une interface autonome connue est publiée par le workflow commun avec `hosting_only=true` et le SHA CI exact : toute différence backend bloque avant Hosting. Documentation/outillage seuls ne déclenchent rien ; fonctions serveur, chemins inconnus et opérations sensibles restent manuels. Aucune exception historique n’est activée automatiquement.

Un main plus récent exige sa propre CI et sa propre classification : le lancement automatique ne suit jamais silencieusement une autre version. Les publications restent sérialisées et aucune publication engagée n’est annulée. Une preuve absente, expirée ou incompatible bloque l’automatisme, avec examen ciblé plutôt qu’élargissement des permissions.


Lancer `livepalmes-test-common.yml` depuis `main`, avec `production_commit` égal au SHA applicatif PROD prouvé. Pour une interface seule, utiliser `hosting_only=true` : sélection et lecture backend restent exécutées, toute fonction différente ou sans preuve concordante bloque avant déploiement. Les flags d’exceptions ne sont renseignés que pour leur périmètre explicitement autorisé.

Le workflow réutilise séparément `application-verification` et `publication-verification` de la CI main réussie du commit exact : première tentative, origine et SHA-256 de l’artefact vérifiés, preuve non expirée et runtime compatible. Une preuve PR ou un simple indicateur ne suffit pas. Sans preuve compatible pour une suite, ses tests sont exécutés ; la présence de l'autre preuve ne les dispense jamais. Les installations verrouillées, la sélection et le contrôle frais du backend, le contrôle Hosting et la production de la preuve TEST restent exécutés.

La sélection compare les dépendances et les révisions réelles à la dernière preuve commune et aux preuves ciblées réussies de `main`. Une source ou révision inconnue reste à vérifier ; ne jamais réduire manuellement la sélection. Les effets partagés ou dynamiques peuvent justifier un périmètre large. Mails/schedulers et opérations non ordinaires restent soumis à leurs contrats spécifiques.

Le workflow sérialise TEST et le backend TEST. Un lancement dépassé avant publication peut préparer un suivi sur `main` ; un lancement engagé termine son commit exact. Après réussite seulement, le suivi recopie toutes les restrictions, dont `hosting_only`, avec trois suivis maximum. Aucun rattrapage après échec/annulation ou en mode `verification_only`. Ne pas annuler une publication en cours pour accélérer une file.

Hosting suit les contrôles backend. Conserver le run et l’artefact `test-proof` (commit, Hosting et révisions observées). Une exécution échouée ou en cours ne constitue pas une preuve ; seules les révisions exactement concordantes d’une réussite antérieure peuvent être réutilisées. Le registre distingue déploiement et validation utilisateur.

Réutiliser cette preuve pour PROD tant que candidat et état déployé correspondent. Ne relancer TEST que pour une version changée, une publication incomplète, une preuve périmée/incompatible ou une dérive. Les artefacts expirent après 14 jours. Un outil TEST spécialisé peut modifier l’état à réconcilier ; son succès ne dispense pas des contrôles communs.

## 3. Préparer le bilan PROD

### Assembler plutôt que ressaisir

`livepalmes-release-draft.yml` assemble un brouillon sans accès Firebase, depuis le run TEST explicitement choisi, la dernière publication PROD authentifiée et les retours utilisateur exacts. L’assistant fournit pour chaque évolution `title`, `commits` (SHA complets), `status: validated` et `validation` (citation et contexte authentiques). Les chemins sont calculés depuis Git, bornés au candidat et comparés au diff complet. Aucun retour utilisateur ne peut être déduit de la CI ou du seul registre.

Une validation explicite de toute la version présentée peut être reportée par l'assistant sur chacune de ses évolutions couvertes avec la même citation et son contexte ; aucune nouvelle confirmation individuelle n'est nécessaire. Ne jamais étendre ce retour à un parcours exclu, à une modification ultérieure ou à une opération sensible non autorisée. L'assistant assemble les entrées techniques et enchaîne brouillon, revue et preflight sans demander à Antoine de gérer leurs fichiers ou numéros de runs.

L’artefact `release-draft` contient `request-draft.json`, `draft-status.json` et un bilan court. Fichier non couvert, validation absente ou revue backend manquante : le brouillon reste bloqué. Les contrats sensibles suivent leur préparation spécifique. L’assistant complète la revue nécessaire puis transmet le JSON au preflight existant, sans nouvelle PR de manifeste obligatoire. Aucun brouillon ne vaut accord PROD.

### Figer la version validée

Pour le parcours ordinaire, `freezeTestCandidate: true` conserve le candidat exact et sa preuve TEST authentifiée ; les nouvelles évolutions de main n’entrent jamais dans ce bilan. TEST peut ensuite recevoir une version descendante uniquement si sa publication réussie possède une preuve applicative exacte et que l’état TEST frais correspond intégralement à cette nouvelle preuve. Une dérive manuelle, un échec ou une preuve absente bloque toujours. Les exceptions et contrats sensibles ne peuvent pas utiliser ce gel générique.

Le contrôle frais PROD, la sélection, les exclusions, les sauvegardes, le retour arrière, les vérifications après publication et l’accord final sur le plan restent obligatoires. L’ancien candidat est publié comme un tout ; aucune sélection silencieuse de fichiers.

### Contrôler et présenter le plan


L’assistant prépare le manifeste depuis `.github/releases/example.json` et lance `livepalmes-production-preflight.yml` sur `main`. Fournir exactement une entrée : `request_json` (JSON complet, 64 Kio maximum, sans clés dupliquées) ou `request_file` (`.github/releases/<identifiant>.json` versionné). Les deux utilisent le même validateur fermé ; la PR du seul manifeste est facultative.

Renseigner le candidat complet, le commit et Hosting PROD prouvés, le run TEST, chaque évolution et ses chemins applicatifs exacts, avec le retour utilisateur authentique. Le diff est recalculé : fichier non couvert, évolution non validée ou exclusion sensible non justifiée bloque. Pour le backend partagé, examiner les consommateurs email/schedulers conservés et les divergences héritées. Un changement de configuration, secret, service, déclencheur ou une suppression demande une préparation spécifique ; les contrats datés ne deviennent pas génériques.

Le preflight réutilise la preuve CI main du candidat exact et celle du commit exact de son outillage lorsqu’elles sont compatibles (Node et plateforme compris). Sinon, il relance la suite concernée. Il authentifie TEST et les artefacts de la dernière publication PROD réussie (`release-plan`, `production-after`, `production-hosting-after`), reconstruit l’origine des révisions, calcule la sélection et écrit `baseline.json`. Ce preflight n’utilise pas Google et ne simule aucun déploiement.

La sélection ordinaire PROD utilise `release-production-function-fingerprints.js` pour comparer chaque révision prouvée au candidat : mêmes règles statiques prudentes que TEST, avec le préparateur PROD connu, les exports ordinaires et le classement de chaque fonction entre lots. Les exceptions TEST ne deviennent jamais des autorisations PROD. Un changement de préparateur inconnu ou un effet commun non isolable impose le repli large ; une source manquante ne prouve jamais une équivalence. La preuve TEST est relue avec le comparateur TEST, quelle que soit la sélection PROD.

Les empreintes historiques `release-function-fingerprints.js` restent utilisées pour les contrats datés et la revue exhaustive des fonctions conservées ; cette optimisation ne valide ni ne réduit une exclusion à leur place. Les lots supplémentaires imposés par un contrat restent imposés. Un contrat ou une revue incompatible bloque toujours le plan et exige sa préparation spécifique. La sauvegarde vérifiée, le contrôle frais de dérive, l’accord sur le plan exact, les paramètres de publication et les contrôles après publication restent obligatoires ; aucun ancien plan n’est modifié par cette adaptation.

Avant l’accord final, examiner les prérequis nécessaires au périmètre. Réutiliser les preuves encore adaptées aux mêmes identités, environnement et capacités ; une livraison ordinaire ne nécessite pas un nouvel audit général des permissions inchangées. En cas de nouveau besoin, de preuve manquante/incompatible ou de doute, utiliser `livepalmes-production-readiness.yml`, `preparation_run=<run du plan>` : dérive et permissions des identités existantes, droits runtime et quotas si backend, index seulement si le plan spécifique en contient. Lectures et tests de permissions uniquement ; aucun droit accordé. La relecture fraîche de dérive juste avant écriture reste obligatoire pour chaque publication. Une ancienne observation ne garantit pas les quotas disponibles plus tard ; vérifier une capacité nouvelle ou incertaine avant de l’annoncer comme acquise.

Présenter un bilan court : évolutions incluses et restant à valider, périmètre calculé, exclusions, preuve TEST, résultat du preflight et des prérequis, sauvegarde/retour arrière et éventuelle coupure/remise en service. L’artefact `release-plan` est identifié par run, ID et SHA-256. Un plan `verificationOnly=true` ne peut pas être déployé. L’accord d’Antoine porte sur ce périmètre exact ; aucune évolution ultérieure n’y entre automatiquement.

## 4. Publier PROD après accord

Lancer `livepalmes-production-release.yml`, `preparation_run=<run approuvé>`, `resume_run=0`, confirmation explicite. L’environnement `production` reste limité à `main`, sans déploiement sur push. L’accord Infra suffit une fois les protections configurées ; toute approbation GitHub encore requise reste obligatoire et ne doit pas être contournée.

Le workflow conserve les contrôles dans cet ordre :

1. Authentifier le plan et les preuves ; vérifier le checkout exact, relire TEST et comparer PROD au bilan. Toute dérive bloque avant écriture.
2. Sauvegarder code, configurations concernés et référence Hosting active ; chiffrer, rouvrir, comparer les fichiers et conserver l’artefact avant publication.
3. Si backend sélectionné, préparer/simuler selon le parcours autorisé puis publier les seules fonctions retenues. Vérifier états, commits et exclusions. Sans sélection backend, ne pas préparer/simuler/publier de Functions.
4. Publier Hosting en dernier depuis le checkout propre. `check-hosting-payload.js` refuse fichiers non suivis, credentials et liens sortants. Préserver cache et rewrites hors accord spécifique ; aucune préparation de données d’accueil pour une simple interface.
5. Contrôler les fichiers publiés, CSP/cache et exclusions, et les témoins spécifiques du lot. Le contrôle Hosting peut lire chaque fichier trois fois, avec attentes de cinq puis quinze secondes ; une différence persistante bloque. Aucun script applicatif n’est exécuté par ce lecteur.

Les règles/index, migrations, suppressions, générations de données, invocations métier et envois de test ne font pas partie du circuit ordinaire. Les garde-fous mail spécifiques restent obligatoires pour les fonctions autorisées ; une coupure et sa remise en service doivent figurer dans le plan approuvé, sans rattrapage ni élargissement implicite.

## 5. Conclure ou reprendre

Donner le résultat, le périmètre effectivement publié, les preuves et le blocage restant s’il y en a un. Inclure le suivi dans la PR ouverte ; après fusion, lier les nouvelles preuves dans les résultats GitHub et regrouper les mises à jour du registre. Aucun rapport HTML, nouvelle PR ou nouveau test général n’est requis par chaque contrôle terminé. Ne jamais inventer une validation utilisateur.

Si interrompu, examiner l’état et les opérations distantes avant de reprendre. Avec l’accord applicable au périmètre, utiliser `resume_run=<run interrompu>`, `preparation_run=0` ; conserver la sauvegarde initiale et comparer les révisions attestées. Ne jamais remplacer la référence par un état partiel inconnu. Hosting reste bloqué tant que les contrôles nécessaires n’ont pas réussi. Lancer un nouveau run, sans « Re-run jobs », pour conserver des artefacts non ambigus.

Le retour arrière exige une demande explicite : `livepalmes-production-rollback.yml` et `restore_hosting` selon le cas, artefacts et empreintes vérifiés, environnement protégé. Il restaure le code/Hosting, jamais les données ; il ne constitue pas un accord implicite de suppression ou de restauration métier. Les éventuelles suppressions de nouvelles Functions restent limitées au rollback expressément autorisé. Conserver la clé backend d’origine pendant la durée de conservation des sauvegardes (14 jours) afin de pouvoir les déchiffrer.

## Historique et contrats spécifiques

La [procédure archivée au 26 octobre](PROCEDURE_HISTORIQUE_20261026.md) conserve les accords datés, paires de versions, preuves de nettoyage, extensions DTN/PDF/NAP, transitions IDF/tous clubs et créations d’infrastructure. Les [anciennes consignes d’orientation](../agents/PUBLICATION_HISTORIQUE_20261026.md) sont également conservées. Consulter seulement l’exception ou la reprise concernée ; ne pas les appliquer par défaut à un nouveau lot.

Les contrats exécutables sous `.github/releases/` et `tools/` ne sont pas modifiés par cette réorganisation. Ils continuent à borner les versions, sélections et configurations. S’ils refusent un nouveau candidat, arrêter avant écriture et expliquer le point bloqué ; ne pas réutiliser un ancien accord pour élargir les permissions. Une adaptation technique réellement nécessaire fait l’objet d’un périmètre présenté et autorisé.

Les [cas particuliers](PROCEDURE_CAS_PARTICULIERS.md) conservent les détails du sélecteur, du parallélisme de builds et l’exception fermée du 27 octobre. Ne les charger que pour le cas concerné.
