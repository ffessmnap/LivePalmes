# AGENTS.md — LivePalmes

## Contexte du projet

LivePalmes est une application web dédiée à la nage avec palmes permettant notamment :

* La consultation des résultats de compétitions
* La diffusion des séries et résultats en direct
* La gestion des records et MPF
* La consultation des performances des nageurs
* La consultation des classements et tableaux des médailles
* Des fonctionnalités d'administration réservées aux utilisateurs autorisés

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
* `live.html`, `speaker.html`, `ja.html`, `video.html`, `bureau-perf.html`, `secretariat.html`, `pilotage-livepalmes.html` : consoles dédiées par rôle
* `resultats.html`, `series-public.html`, `medailles.html`, `archives.html` : pages publiques autonomes
* `pdf.html`, `resultat-pdf.html`, `series-pdf.html` : vues PDF

Les styles principaux sont :

* `styles.css`
* `console.css`
* `public.css`
* `assets/livepalmes-admin-portal.css`
* `performances/public/styles.css`

Les scripts applicatifs sont principalement dans `assets/`.

* `app.js` est l'assembleur principal des consoles internes. Il ne doit pas redevenir un gros fichier métier.
* `assets/livepalmes-*.js` contient les modules métier et UI des consoles.
* `assets/pages/` contient les scripts propres aux pages publiques autonomes.
* `performances/` contient l'espace public/admin des records, MPF, TOP et fiches nageurs.
* `performances/public/data/` contient des données publiques générées et optimisées.
* `functions/` contient les Cloud Functions Firebase en Node.js 20.
* `tools/` contient les scripts de génération, migration, publication et vérification.
* `tests/` contient les tests automatiques Node.js.
* `docs/` contient la documentation technique.

Les pages consoles dédiées sont générées depuis `index.html` avec :

```powershell
node tools/build-console-pages.js
```

Après une modification du socle console dans `index.html`, lancer la génération ou au minimum la vérification globale.

## Méthode de travail

Pour toute demande importante :

1. Analyser le code existant.
2. Identifier les fichiers concernés.
3. Expliquer l'approche proposée.
4. Attendre validation si l'impact est important.
5. Réaliser les modifications.
6. Vérifier avec les commandes adaptées au dépôt.
7. Résumer clairement les changements effectués.

Pour les demandes simples et localisées, les modifications peuvent être réalisées directement.

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
* Import et parsing PDF des séries
* Import, parsing et publication des résultats
* Génération des pages consoles dédiées
* Publication des archives
* Migration, correction et publication des données de performances
* Fichiers publics générés dans `performances/public/data/`

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

Firestore est utilisé pour les données actives, l'administration, les droits, les imports, les corrections, les archives et la source officielle des Records / MPF.

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

Les performances publiques ne doivent pas dépendre de lectures Firestore massives côté visiteur. Les pages TOP et fiches nageurs s'appuient sur des fichiers publics générés et optimisés dans `performances/public/data/`.

## Contraintes Firestore

Les données peuvent atteindre plusieurs centaines de milliers de performances historiques.

Toujours :

* Privilégier les requêtes indexables.
* Limiter les lectures inutiles.
* Éviter les scans complets de collections.
* Prévoir la montée en charge.
* Réfléchir au coût Firebase des requêtes.

Ne jamais supposer qu'une collection restera de petite taille.

Pour les performances historiques, privilégier le pipeline existant :

1. stockage ou correction côté administration ;
2. génération ou publication de fichiers publics optimisés ;
3. lecture statique par les visiteurs.

Ne pas brancher une page publique sur une requête Firestore volumineuse sans validation explicite.

## Interface utilisateur

* Mobile first.
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

Après chaque modification :

* Lancer la vérification technique adaptée lorsque c'est pertinent.
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
