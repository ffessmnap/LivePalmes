# AGENTS.md — LivePalmes

## Principes

LivePalmes est un écosystème web bénévole dédié à la nage avec palmes. Son cœur est le Portail LivePalmes, actuellement en finalisation et en test, qui prépare les compétitions et les engagements et gère clubs, nageurs, officiels, comptes, droits, performances, Records/MPF et espaces autorisés. L'espace public diffuse les Records, MPF, TOP, performances et fiches nageurs. LivePalmes Direct est un dispositif distinct réservé aux compétitions nationales concernées, avec consoles terrain et publication en direct des séries, résultats, médailles et archives.

Priorités : fiabilité, simplicité, performance, fonctionnalités. Faire évoluer l’existant, réutiliser ses conventions et limiter les changements au nécessaire. Ne pas introduire de framework, de dépendance ou de nouvelle architecture sans justification forte.

Application statique en HTML, CSS et JavaScript natif, sans bundler racine. Les pages publiques et consoles restent à la racine pour préserver leurs URL. Ne pas réintroduire le pilotage ou le portail dans l’accueil public. `app.js` étant proche de 1 000 lignes utiles, placer toute nouvelle logique métier dans un module existant ou dédié.

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

Travailler dans le dossier principal partagé. Ne pas créer de worktree sauf nécessité expliquée. Laisser les changements en local : aucune PR, migration, publication, poussée ou déploiement sans demande explicite. Prévenir avant tout test susceptible d’utiliser Firebase de production ou d’écrire des données réelles.

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
