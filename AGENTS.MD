# AGENTS.md — LivePalmes

## Projet et priorités

LivePalmes est une application web bénévole dédiée à la nage avec palmes : résultats et séries en direct, records et MPF, performances, classements, médailles et portail pour utilisateurs autorisés.

Priorités, dans cet ordre : fiabilité, simplicité, performance, fonctionnalités. Faire évoluer l’existant ; ne pas réécrire ni créer une nouvelle architecture lorsqu’un modèle similaire existe déjà.

## Socle technique

Application statique en HTML, CSS et JavaScript natif, sans framework frontend, bundler racine ni build React/Vue/Vite/Webpack. Les pages publiques et consoles restent à la racine pour préserver leurs URL.

- `index.html` et `public.html` : accueil public et historique.
- `pilotage-livepalmes.html` : socle des consoles dédiées.
- `portail.html` : portail séparé des consoles de compétition.
- `assets/` : modules applicatifs et scripts des pages.
- `performances/` : records, MPF, TOP et fiches nageurs.
- `functions/` : Cloud Functions Firebase Node.js 20.
- `tools/`, `tests/`, `docs/` : outils, tests et documentation.

Ne pas réintroduire le pilotage ou le portail dans l’accueil public. `app.js` est proche de la limite de 1 000 lignes utiles : placer toute nouvelle logique métier dans un module existant ou dédié.

## Documentation spécialisée

Pour tout Markdown autre qu’un fichier `AGENTS.md`, rechercher d’abord sa ligne `<!-- description: ... -->` sans charger le fichier complet. Lire seulement les documents et sections pertinents. Ignorer les Markdown des dépendances, sorties générées et dossiers tiers, sauf besoin explicite.

- Frontend, pages, consoles et responsive : `docs/agents/FRONTEND.md`.
- Backend : appliquer aussi `functions/AGENTS.md` lorsque le travail est réalisé depuis `functions/` ; sinon le lire avant toute intervention dans ce dossier.
- Records, MPF et performances : `docs/agents/PERFORMANCES.md`.
- Git, publication et déploiement : `docs/agents/PUBLICATION.md`.
- Carte générale : `docs/STRUCTURE_LIVEPALMES.md` ou `docs/ARCHITECTURE.md`.
- Tests manuels sensibles : `docs/TESTS_MANUELS.md`.

## Méthode de travail

Toujours analyser le code existant et réutiliser les conventions et composants présents. Limiter les changements au strict nécessaire, préserver la compatibilité et éviter les refactorings massifs. Ne pas ajouter de framework ou dépendance externe sans justification forte.

Pour une modification simple et localisée, agir directement. Pour une demande importante ou sensible : analyser, identifier les fichiers, expliquer l’approche et attendre la validation avant modification. Une analyse ou un diagnostic n’autorise pas une écriture sensible.

Travailler dans le dossier principal partagé. Ne pas créer de worktree sauf nécessité expliquée. Laisser les changements en local pour validation ; ne pas créer de PR, pousser, migrer, publier ou déployer sans demande explicite. Signaler avant tout test susceptible d’utiliser Firebase de production ou d’écrire dans des données réelles.

Préserver les changements utilisateur déjà présents. Conserver les fichiers texte en UTF-8.

## Zones sensibles

Validation explicite obligatoire avant toute modification concernant :

- authentification, PIN, capacités, droits administrateurs ou portail ;
- règles, configuration, variables d’environnement ou Cloud Functions Firebase ;
- structure globale des données ou nouvelle collection Firestore ;
- records, MPF, catégories sportives, classements, médailles ou qualifications DTN ;
- import, parsing ou publication des séries, résultats, PDF et archives ;
- génération des consoles dédiées ;
- migration, correction, génération ou publication des données de performances ;
- fichiers générés de `performances/public/data/` et publication Firebase Storage.

Ne jamais inventer une règle sportive. En cas de doute métier, demander validation.

## Données et performance

Les volumes Firestore peuvent atteindre plusieurs centaines de milliers de performances. Toute nouvelle lecture doit être indexable, bornée et estimée en documents lus par ouverture. Interdiction des lectures N+1, d’une lecture par ligne affichée, des scans complets non bornés et des nombreux listeners inutiles.

Les pages publiques fréquentes doivent privilégier les fichiers statiques générés, agrégats, caches et pagination. Ne jamais modifier manuellement une sortie générée : corriger la source ou le générateur.

## Interface

Concevoir mobile first tout en restant efficace sur ordinateur. Aucun contenu ou bouton essentiel ne doit devenir inaccessible. Les actions doivent fonctionner au toucher sans dépendre du survol. Prévoir une présentation adaptée ou un défilement pour les tableaux larges. Respecter le style et les composants existants.

Après toute modification qui change l’interface ou son rendu visuel, mettre à jour `docs/DESIGN_SYSTEM.md` dans la même intervention. Documenter uniquement les règles, composants, états ou variantes réellement introduits ou modifiés ; ne pas dupliquer un changement purement technique sans effet visuel.

## Vérifications

Adapter les contrôles au risque :

- documentation : relecture ciblée ;
- modification localisée : syntaxe et test ciblé ;
- interface : contrôle ordinateur/mobile, smoke test si utile ;
- architecture, consoles ou plusieurs modules : `node tools/verify-livepalmes.js` ;
- Firebase, droits, PDF, données métier, migration ou publication : validation explicite, vérification globale et tests manuels ciblés.

Commande principale :

```powershell
node tools/verify-livepalmes.js
```

Smoke test navigateur :

```powershell
node tools/verify-livepalmes.js --browser
```

Après chaque modification, signaler les fichiers touchés, résumer les changements et indiquer les vérifications manuelles restantes.

## Réponses

Répondre en français, directement et pédagogiquement. Expliquer les choix non évidents, ne pas masquer les incertitudes et signaler les risques.
