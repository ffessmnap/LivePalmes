# AGENTS.md — LivePalmes

## Contexte du projet

LivePalmes est une application web dédiée à la nage avec palmes permettant notamment :

* La consultation des résultats de compétitions
* La diffusion des séries et résultats en direct
* La gestion des records et MPF
* La consultation des performances des nageurs
* La consultation des classements et tableaux des médailles
* Des fonctionnalités de portail réservées aux utilisateurs autorisés

L'application est utilisée par des nageurs, entraîneurs, chefs d'équipe, organisateurs et bénévoles.

## Philosophie du projet

LivePalmes est un projet développé bénévolement.

Les priorités sont :

1. Fiabilité
2. Simplicité
3. Performance
4. Fonctionnalités

Une solution simple et robuste est toujours préférable à une solution complexe.

Toujours privilégier l'évolution du système existant plutôt qu'une réécriture.

Ne jamais créer une nouvelle architecture si une architecture similaire existe déjà dans le projet.

## Architecture actuelle

LivePalmes est une application web statique en HTML, CSS et JavaScript natif.

Il n'y a pas de framework frontend, pas de bundler racine et pas de build applicatif type React, Vue, Vite ou Webpack.

Les pages accessibles en ligne restent à la racine du dépôt pour conserver des URL simples et stables :

* `index.html` et `public.html` : accueil public / accès historique
* `pilotage-livepalmes.html` : socle de la console de pilotage et source des consoles dédiées
* `live.html`, `speaker.html`, `ja.html`, `video.html`, `bureau-perf.html`, `secretariat.html` : consoles dédiées par rôle
* `portail.html` : portail LivePalmes séparé des consoles de compétition
* `resultats.html`, `series-public.html`, `medailles.html`, `archives.html` : pages publiques autonomes
* `pdf.html`, `resultat-pdf.html`, `series-pdf.html` : vues PDF

Les styles principaux sont :

* `styles.css`
* `console.css`
* `public.css`
* `assets/livepalmes-admin-portal.css`
* `performances/public/styles.css`

Les scripts applicatifs sont principalement dans `assets/`.

* `app.js` est l'assembleur principal des consoles internes. Il est proche de la limite de 1000 lignes utiles imposée par le garde-fou d'architecture : toute nouvelle logique métier doit être placée dans un module existant ou dédié.
* `assets/livepalmes-*.js` contient les modules métier et UI des consoles.
* `assets/pages/` contient les scripts propres aux pages publiques autonomes.
* `assets/livepalmes-admin-*.js` et `portail.html` portent le portail LivePalmes, dont les accès sont contrôlés par capacités.
* `performances/` contient l'espace public/admin des records, MPF, TOP et fiches nageurs.
* `performances/public/data/` contient des données publiques générées et optimisées.
* `functions/` contient les Cloud Functions Firebase en Node.js 20.
* `tools/` contient les scripts de génération, migration, publication et vérification.
* `tests/` contient les tests automatiques Node.js.
* `docs/` contient la documentation technique.

Les pages consoles dédiées sont générées depuis `pilotage-livepalmes.html` avec :

```powershell
node tools/build-console-pages.js
```

Après une modification du socle console dans `pilotage-livepalmes.html`, lancer la génération ou au minimum la vérification globale.

`index.html`, `pilotage-livepalmes.html` et `portail.html` ont des responsabilités différentes. Ne pas réintroduire le pilotage de compétition ou le portail dans l'accueil public.

## Méthode de travail

Pour toute demande importante :

1. Analyser le code existant.
2. Identifier les fichiers concernés.
3. Expliquer l'approche proposée.
4. Attendre validation avant toute modification si l'impact est important ou si une zone sensible est concernée.
5. Réaliser les modifications.
6. Vérifier avec les commandes adaptées au dépôt.
7. Résumer clairement les changements effectués.

Pour les demandes simples et localisées, les modifications peuvent être réalisées directement.

Les analyses, diagnostics et contrôles en lecture seule peuvent être réalisés sans validation. Une demande de vérification ou d'analyse n'autorise pas implicitement une modification sensible, un déploiement Firebase, une publication vers Storage, une migration ou une écriture dans les données officielles.

### Validation locale avant publication

Pour les évolutions habituelles, travailler directement dans le dossier principal partagé avec l'utilisateur :

```text
C:\Users\ITIFP\OneDrive - SNCF\Documents\GitHub\LivePalmes
```

* Ne pas créer de worktree séparé pour une modification courante, sauf nécessité technique ou risque particulier expliqué préalablement à l'utilisateur.
* Laisser les changements uniquement en local pendant la phase de mise au point afin que l'utilisateur puisse les vérifier sur son serveur local.
* Ne créer aucune PR, ne pousser aucun commit et ne lancer aucun déploiement avant une demande explicite de mise en ligne.
* Après validation locale et demande de publication, sécuriser les changements dans Git et GitHub, puis déployer uniquement le périmètre validé.
* Après publication, remettre le dossier principal sur le dernier `main` et supprimer les éventuels worktrees temporaires devenus inutiles.
* Si un worktree est exceptionnellement nécessaire, annoncer avant sa création sa raison et son chemin, puis indiquer clairement à l'utilisateur où tester la modification.
* Signaler avant un test local toute action susceptible d'utiliser les services Firebase de production ou d'écrire dans des données réelles.

## Règles générales

* Toujours analyser le code existant avant toute modification.
* Réutiliser les composants existants lorsque cela est possible.
* Respecter les conventions déjà présentes dans le projet.
* Limiter les modifications au strict nécessaire.
* Éviter les refactorings massifs non demandés.
* Ne jamais supprimer du code sans justification.
* Préserver la compatibilité avec les fonctionnalités existantes.
* Expliquer les choix techniques lorsqu'ils ne sont pas évidents.
* Ne pas ajouter de framework ou de bibliothèque externe sans justification forte.
* Ne pas déplacer les pages HTML racine sans raison explicite : leurs URL sont publiques.
* Ne pas ajouter de nouvelle grosse logique métier dans `app.js`.
* Préférer compléter un module existant dans `assets/` ou `performances/public/` lorsque le domaine existe déjà.
* Préserver les paramètres de cache et les rewrites définis dans `firebase.json`.

## Zones sensibles

Ne jamais modifier sans validation explicite :

* Authentification
* Règles Firestore
* Configuration Firebase
* Variables d'environnement
* Structure globale des données
* Cloud Functions Firebase
* Gestion des PIN et des droits d'accès
* Logique de calcul des records
* Logique des catégories sportives
* Logique des classements
* Attribution des médailles
* Gestion des droits administrateurs
* Capacités du portail (`admin.full`, `records.manage`, `consoles.manage`, `competitions.import`, `dtn.view`)
* Espace DTN, temps de qualification et caches de qualification
* Import et parsing PDF des séries
* Import, parsing et publication des résultats
* Génération des pages consoles dédiées
* Publication des archives
* Migration, correction et publication des données de performances
* Fichiers publics générés dans `performances/public/data/`
* Publication des fichiers publics de performances vers Firebase Storage

## Architecture des données

Les principales entités manipulées par l'application sont :

* Compétitions
* Séries
* Résultats
* Alertes
* Archives
* Présences et verrous de rôles
* Records
* MPF
* Performances
* Nageurs
* Clubs
* Utilisateurs
* Droits d'accès
* Imports et corrections de performances

Avant de créer une nouvelle collection ou un nouveau modèle de données :

* Vérifier si le besoin peut être couvert par les structures existantes.
* Éviter les duplications inutiles.
* Justifier toute nouvelle collection Firestore.

Firestore est utilisé pour les données actives, le portail, les droits, les imports, les corrections, les archives et la source officielle des Records / MPF.

Les Records / MPF officiels sont stockés dans :

```text
competitions/livepalmes-active/performanceData/records
```

Le fallback statique correspondant est :

```text
performances/public/data/records-data.js
```

Après une modification publiée des Records / MPF, synchroniser le fallback statique avec :

```powershell
node tools/sync-records-from-firestore.js --write
```

Les performances publiques ne doivent pas dépendre de lectures Firestore massives côté visiteur. Les pages TOP et fiches nageurs s'appuient sur des fichiers publics générés et optimisés, servis statiquement ou depuis Firebase Storage.

Le pipeline public actuel distingue notamment :

* `performances/public/data/performance-public/` : fichiers publics générés disponibles dans le dépôt ;
* `performances/public/data/performance-public-firestore/` : sortie locale générée depuis Firestore, ignorée par Git puis publiée vers Firebase Storage ;
* `outputs/` : fichiers de travail et de préparation de publication, ignorés par Git.

Ne pas modifier manuellement ces sorties générées. Corriger la source ou le générateur, puis reconstruire et publier avec les outils existants. Toute publication vers Firebase Storage reste une opération sensible nécessitant une validation explicite.

## Contraintes Firestore

Les données peuvent atteindre plusieurs centaines de milliers de performances historiques.

Toujours :

* Privilégier les requêtes indexables.
* Limiter les lectures inutiles.
* Éviter les scans complets de collections.
* Prévoir la montée en charge.
* Réfléchir au coût Firebase des requêtes.

Toute évolution introduisant ou modifiant des lectures Firestore doit faire l'objet d'une estimation du nombre de lectures déclenchées par utilisateur et par ouverture de page.

Ne jamais introduire :

* des lectures en cascade de type N+1 ;
* une lecture Firestore par ligne, nageur, résultat ou élément affiché ;
* de nombreux listeners temps réel lorsque quelques lectures bornées ou une ressource agrégée suffisent ;
* une requête publique dont le nombre de documents lus augmente sans limite avec le volume historique.

Une page publique fréquemment consultée doit autant que possible lire un petit nombre de ressources statiques ou agrégées, et non une multitude de documents Firestore.

Pour les volumes importants, utiliser en priorité les fichiers publics générés, les agrégats existants, la mise en cache, les requêtes bornées et indexables, ainsi que la pagination. Si le nombre de lectures ne peut pas être raisonnablement estimé et borné, demander une validation avant implémentation.

Ne jamais supposer qu'une collection restera de petite taille.

Pour les performances historiques, privilégier le pipeline existant :

1. stockage ou correction depuis le portail ;
2. génération ou publication de fichiers publics optimisés ;
3. lecture statique par les visiteurs.

Ne pas brancher une page publique sur une requête Firestore volumineuse sans validation explicite.

## Interface utilisateur

* LivePalmes doit être pleinement utilisable sur ordinateur comme sur mobile.
* Concevoir en mobile first, tout en conservant une présentation efficace sur les écrans d'ordinateur.
* Préserver une interface responsive : aucun contenu ou bouton essentiel ne doit devenir inaccessible selon la largeur de l'écran.
* Ne pas dépendre uniquement du survol de la souris ; les actions doivent aussi fonctionner au toucher.
* Prévoir le défilement ou une présentation adaptée pour les tableaux et contenus larges sur mobile.
* Interface simple et accessible aux utilisateurs non techniques.
* Respecter le style visuel existant.
* Réutiliser les composants graphiques existants.
* Ne pas ajouter de bibliothèque externe sans justification.

## Performance

Privilégier :

* Temps de chargement rapides.
* Nombre minimal de requêtes Firestore.
* Pagination lorsque nécessaire.
* Mise en cache lorsque pertinent.

Éviter les calculs lourds côté client lorsque les volumes de données peuvent devenir importants.

## Données métier

Ne jamais inventer les règles sportives.

En cas de doute concernant :

* Catégories
* MPF
* Records
* Relais
* Classements
* Médailles
* Règlements FFESSM
* Historique des performances

Demander une validation avant implémentation.

## Qualité

Après chaque modification, lancer une vérification proportionnée au risque et au périmètre. Ne pas lancer la vérification globale pour une modification documentaire ou purement rédactionnelle, sauf si elle modifie une commande, une règle d'architecture ou une procédure sensible.

Dans tous les cas :

* Signaler les fichiers modifiés.
* Résumer les changements réalisés.
* Mentionner les points nécessitant une vérification manuelle.

La commande principale de vérification est :

```powershell
node tools/verify-livepalmes.js
```

Elle vérifie notamment :

* la syntaxe JavaScript ;
* les tests automatiques ;
* les textes visibles cassés ;
* les garde-fous d'architecture ;
* la synchronisation des pages consoles générées ;
* les scripts chargés par rôle ;
* les erreurs d'espaces Git lorsque Git est disponible.

Pour inclure le smoke test navigateur :

```powershell
node tools/verify-livepalmes.js --browser
```

Le garde-fou d'architecture maintient `app.js` sous 1000 lignes utiles et interdit notamment `with`, `eval` et `new Function`.

Après une modification touchant les PDF, les résultats, les finalistes, Firebase, les droits ou les données métier, prévoir aussi les tests manuels utiles décrits dans `docs/TESTS_MANUELS.md`.

Adapter la vérification à la zone modifiée :

* documentation ou rédaction uniquement : relecture ciblée, sans test applicatif obligatoire ;
* modification simple et localisée : contrôle de syntaxe ou test ciblé sur le périmètre concerné ;
* interface ou parcours utilisateur : contrôler la page concernée sur ordinateur et mobile, et utiliser le smoke test navigateur lorsqu'il couvre utilement le parcours ;
* architecture, socle console, pages générées ou modification de plusieurs modules : lancer `node tools/verify-livepalmes.js` et les contrôles ciblés nécessaires ;
* performances publiques : contrôler le pipeline avant toute publication ;
* modification des accès Firestore : mesurer ou contrôler le nombre réel de requêtes et de documents lus lors d'un chargement normal, puis vérifier qu'il ne se multiplie pas avec le nombre de résultats affichés ;
* Firebase, droits, PDF, données métier, migration ou publication : lancer la vérification globale et compléter avec les tests manuels ciblés.

Réexaminer ce fichier lorsqu'une nouvelle page structurante, une capacité d'accès, une source de données ou une commande de génération ou de publication est introduite.

Conserver les fichiers texte en UTF-8.

## Style de réponse attendu

* Répondre en français.
* Être direct et pédagogique.
* Expliquer clairement les choix effectués.
* Ne pas masquer les incertitudes.
* Signaler les risques potentiels.

## Commandes utiles

Exemples :

```powershell
node tools/verify-livepalmes.js
node tools/verify-livepalmes.js --browser
node tools/build-console-pages.js
node tools/build-console-pages.js --check
node tools/check-console-page-loads.js
node tools/sync-records-from-firestore.js --write
```

Pour les Cloud Functions uniquement :

```powershell
cd functions
npm install
```

Adapter ces commandes si la configuration du projet évolue.
