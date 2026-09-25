# AGENTS.md — LivePalmes

## Principes

LivePalmes est un écosystème web bénévole dédié à la nage avec palmes. Son cœur est le Portail LivePalmes, actuellement en finalisation et en test, qui prépare les compétitions et les engagements et gère clubs, nageurs, officiels, comptes, droits, performances, Records/MPF et espaces autorisés. L'espace public diffuse les Records, MPF, TOP, performances et fiches nageurs. LivePalmes Direct est un dispositif distinct réservé aux compétitions nationales concernées, avec consoles terrain et publication en direct des séries, résultats, médailles et archives.

Priorités : fiabilité, simplicité, performance, fonctionnalités. Faire évoluer l’existant, réutiliser ses conventions et limiter les changements au nécessaire. Ne pas introduire de framework, de dépendance ou de nouvelle architecture sans justification forte.

Application statique en HTML, CSS et JavaScript natif, sans bundler racine. Les pages publiques et consoles restent à la racine pour préserver leurs URL. L’accueil public peut proposer un accès distinct et secondaire vers le Portail LivePalmes ; ne pas y réintroduire le pilotage. `app.js` étant proche de 1 000 lignes utiles, placer toute nouvelle logique métier dans un module existant ou dédié.

## Consignes spécialisées

Pour tout Markdown autre qu’un `AGENTS.md`, rechercher d’abord sa ligne `<!-- description: ... -->`, puis lire seulement les sections utiles. Ignorer les dépendances, sorties générées et dossiers tiers sauf besoin explicite.

- Portail LivePalmes : `docs/agents/PORTAIL.md`, puis uniquement la documentation métier correspondant à la demande.
- Interface commune et responsive : `docs/agents/FRONTEND.md`.
- LivePalmes Direct et consoles nationales : `docs/LIVEPALMES_DIRECT.md`, puis les seules sections utiles de `docs/agents/FRONTEND.md`.
- Backend : lire `functions/AGENTS.md` avant toute intervention dans `functions/`.
- Records, MPF et performances : `docs/agents/PERFORMANCES.md`.
- Git, publication et déploiement : `docs/agents/PUBLICATION.md`.
- Architecture : `docs/STRUCTURE_LIVEPALMES.md` ou `docs/ARCHITECTURE.md`.
- Tests sensibles : `docs/TESTS_MANUELS.md`.

Identifier avant toute lecture si la demande concerne le portail, l’espace public permanent, LivePalmes Direct ou une couche réellement partagée. Pour une tâche limitée au portail, ne pas charger la documentation, les pages, scripts ou tests du Direct. Pour une tâche limitée au Direct, ne pas charger les modules métier du portail. N’élargir la lecture que si une dépendance commune est effectivement touchée.

## Travail et sécurité

Analyser le code existant avant modification, préserver la compatibilité et les changements utilisateur, éviter les refactorings massifs et conserver l’UTF-8. Agir directement pour une modification simple et localisée. Pour une intervention importante ou sensible : analyser, présenter l’approche et attendre la validation.

Travailler dans le dossier principal partagé. Ne pas créer de worktree sauf nécessité expliquée. Pour une demande de développement LivePalmes, la destination par défaut autorisée est TEST : préparation, commit, PR, intégration après contrôles et déploiement TEST du périmètre demandé sont inclus, sans demander de répéter « sur TEST ». Une demande d’analyse seule ne déclenche aucun développement. La PROD exige une demande explicite et un bilan approuvé dans la discussion Infra. Les opérations sur les données, migrations et envois réels restent soumis à un accord spécifique. Prévenir avant tout test susceptible d’utiliser Firebase de production ou d’écrire des données réelles.

Validation explicite obligatoire avant toute modification concernant :

- authentification, PIN, capacités, droits administrateurs ou portail ;
- règles, configuration, variables d’environnement ou Cloud Functions Firebase ;
- structure globale des données ou nouvelle collection Firestore ;
- records, MPF, catégories sportives, classements, médailles ou qualifications DTN ;
- import, parsing ou publication des séries, résultats, PDF et archives ;
- génération des consoles dédiées ;
- migration, correction, génération ou publication des données de performances ;
- fichiers générés de `performances/public/data/` ou publication Firebase Storage.

Ne jamais inventer une règle sportive ; demander validation en cas de doute métier. Ne jamais modifier directement une sortie générée : corriger sa source ou son générateur.

## Données et interface

Toute lecture Firestore doit être indexable, bornée et estimée en documents lus par ouverture. Interdire les lectures N+1, lectures par ligne, scans complets non bornés et listeners nombreux ou inutiles. Pour les pages publiques fréquentes, privilégier fichiers statiques générés, agrégats, caches et pagination.

Toute évolution qui ajoute ou modifie un accès aux données doit être conçue avec un budget de lectures avant son implémentation. Estimer séparément le coût de l’ouverture initiale, d’une action utilisateur, d’un rafraîchissement et du pire cas réaliste. Vérifier que ce coût ne croît pas avec la taille totale de la base ou le nombre de lignes affichées. Réutiliser en priorité les agrégats, index, caches, fichiers publics et appels groupés existants. Une donnée absente ou un cache périmé ne doit jamais déclencher silencieusement une reconstruction massive dans un parcours interactif.

Concevoir mobile first sans rendre une action essentielle inaccessible. Les actions doivent fonctionner au toucher ; adapter ou faire défiler les tableaux larges. Respecter les composants existants. Après un changement visuel, mettre à jour `docs/DESIGN_SYSTEM.md` uniquement pour les règles, composants ou variantes réellement modifiés.

## Vérifications et réponse

- Documentation : relecture ciblée.
- Modification localisée : syntaxe et test ciblé.
- Interface : contrôle ordinateur/mobile et smoke test si utile.
- Architecture, consoles ou plusieurs modules : `node tools/verify-livepalmes.js`.
- Firebase, droits, PDF, données métier, migration ou publication : validation explicite, vérification globale et tests manuels ciblés.

Smoke test navigateur : `node tools/verify-livepalmes.js --browser`.

Après chaque modification, indiquer les fichiers touchés, le résumé des changements, les vérifications effectuées et celles restant à faire. Répondre en français, directement et pédagogiquement ; expliquer les choix non évidents, incertitudes et risques.

## Circuit commun aux conversations

- Lire `docs/agents/PUBLICATION.md` avant toute intégration ou publication et récupérer les dernières consignes de `main`. Une ancienne copie locale ne fait pas autorité.
- Travailler par PR courte depuis le dernier `main`, préserver les autres évolutions, ne jamais remplacer TEST par une branche isolée.
- TEST commun = commit intégré sur `main`, publié par `livepalmes-test-common.yml`. Les aperçus de PR sont séparés et ne constituent pas une validation de la version regroupée.
- Tenir `docs/releases/EVOLUTIONS.md` à jour : besoin, PR/commit, état, preuve du déploiement TEST, retour utilisateur. « Déployé sur TEST » ne signifie pas « validé ». Ne jamais inventer une validation utilisateur.
- Une modification ultérieure du code invalide la validation des parcours concernés ; faire vérifier la version regroupée avant PROD.
- Pour « publier tout ce qui est validé », préparer un bilan complet. Toute évolution incluse mais non validée bloque la publication : la terminer ou préparer une autre version commune, sans sélection silencieuse de fichiers.
- Aucune copie TEST vers PROD. Ne pas déployer les règles/index, migrations, fonctions email ou schedulers via le circuit ordinaire.
- Simplicité des publications : réutiliser une preuve TEST encore valide, sans republier TEST à chaque demande PROD. L'assistant gère les références techniques et présente un bilan court. Le bilan exploite les preuves GitHub sans accès Google ; une seule confirmation GitHub précède la relecture Firebase et l'écriture PROD. Respecter la protection `production` et arrêter en cas de dérive ou de preuve manquante. Voir `docs/releases/PROCEDURE.md` pour les empreintes backend et les limites de réutilisation.
