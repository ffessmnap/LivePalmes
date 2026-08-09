# AGENTS.md — LivePalmes

## Principes

LivePalmes est une application web bénévole de nage avec palmes : direct, résultats, records, MPF, performances, classements, médailles et espaces autorisés.

Priorités : fiabilité, simplicité, performance, fonctionnalités. Faire évoluer l’existant, réutiliser ses conventions et limiter les changements au nécessaire. Ne pas introduire de framework, de dépendance ou de nouvelle architecture sans justification forte.

Application statique en HTML, CSS et JavaScript natif, sans bundler racine. Les pages publiques et consoles restent à la racine pour préserver leurs URL. Ne pas réintroduire le pilotage ou le portail dans l’accueil public. `app.js` étant proche de 1 000 lignes utiles, placer toute nouvelle logique métier dans un module existant ou dédié.

## Consignes spécialisées

Pour tout Markdown autre qu’un `AGENTS.md`, rechercher d’abord sa ligne `<!-- description: ... -->`, puis lire seulement les sections utiles. Ignorer les dépendances, sorties générées et dossiers tiers sauf besoin explicite.

- Frontend, consoles et responsive : `docs/agents/FRONTEND.md`.
- Backend : lire `functions/AGENTS.md` avant toute intervention dans `functions/`.
- Records, MPF et performances : `docs/agents/PERFORMANCES.md`.
- Git, publication et déploiement : `docs/agents/PUBLICATION.md`.
- Architecture : `docs/STRUCTURE_LIVEPALMES.md` ou `docs/ARCHITECTURE.md`.
- Tests sensibles : `docs/TESTS_MANUELS.md`.

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

Concevoir mobile first sans rendre une action essentielle inaccessible. Les actions doivent fonctionner au toucher ; adapter ou faire défiler les tableaux larges. Respecter les composants existants. Après un changement visuel, mettre à jour `docs/DESIGN_SYSTEM.md` uniquement pour les règles, composants ou variantes réellement modifiés.

## Vérifications et réponse

- Documentation : relecture ciblée.
- Modification localisée : syntaxe et test ciblé.
- Interface : contrôle ordinateur/mobile et smoke test si utile.
- Architecture, consoles ou plusieurs modules : `node tools/verify-livepalmes.js`.
- Firebase, droits, PDF, données métier, migration ou publication : validation explicite, vérification globale et tests manuels ciblés.

Smoke test navigateur : `node tools/verify-livepalmes.js --browser`.

Après chaque modification, indiquer les fichiers touchés, le résumé des changements, les vérifications effectuées et celles restant à faire. Répondre en français, directement et pédagogiquement ; expliquer les choix non évidents, incertitudes et risques.
