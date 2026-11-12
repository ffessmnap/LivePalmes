# Interface commune LivePalmes

<!-- description: Règles communes et responsive pour les pages HTML, styles et scripts clients, sans charger le métier du portail ni celui du Direct. -->

## Routage préalable

Ce document contient seulement les règles communes d'interface.

- Pour le Portail LivePalmes, lire d'abord `docs/agents/PORTAIL.md`.
- Pour LivePalmes Direct, son bureau et ses consoles, lire `docs/LIVEPALMES_DIRECT.md`.
- Pour l'espace public, identifier la page concernée : accueil, calendrier, fiche compétition, bibliothèque documentaire ou performances.
- Lire `docs/agents/PERFORMANCES.md` lorsque les données ou règles sportives sont concernées.

Ne pas lire ni modifier les fichiers d'une autre composante par simple proximité technique. Une dépendance partagée doit être identifiée dans le code avant d'élargir le périmètre.

## Principes communs

LivePalmes utilise HTML, CSS et JavaScript natif, sans framework frontend ni bundler racine. Faire évoluer les composants et modules existants.

Les pages accessibles en ligne restent à la racine lorsqu'elles doivent préserver leurs URL. Les principales responsabilités restent séparées :

- `portail.html` et ses modules : portail métier ;
- `direct-admin.html`, `direct-consoles.html`, `direct.html` et `assets/direct/` : nouveau parcours LivePalmes Direct ;
- `pilotage-livepalmes.html`, anciennes pages de rôles et leur socle : dispositif Direct historique ;
- `index.html` et `public.html` : accueil public permanent ;
- `calendrier.html` et `competition.html` : calendrier et fiches compétition ;
- `bibliotheque.html` : bibliothèque documentaire publique ;
- `performances/` : consultations publiques et outils ciblés des performances.

Certains composants sont partagés : identifier leurs consommateurs avant de modifier leur comportement.

Placer une nouvelle logique métier dans un module existant ou dédié. Ne pas grossir `app.js`, qui appartient au socle du Direct, pour une fonction du portail.

## Interface

- Concevoir mobile first et vérifier aussi l'usage sur ordinateur.
- Garder accessibles les actions et contenus essentiels à toutes les largeurs.
- Ne pas dépendre uniquement du survol ; toutes les actions doivent fonctionner au toucher.
- Adapter les tableaux larges avec défilement ou présentation responsive.
- Réutiliser les styles et composants existants.
- Préserver les paramètres de cache et rewrites de `firebase.json`.
- Ne charger un module ou des données coûteuses qu'au moment où l'écran concerné en a besoin.

## Vérification

Distinguer une retouche de présentation d'un changement de comportement, de données accessibles ou de règle métier, conformément à `AGENTS.md`. Cette distinction ne dispense pas des contrôles propres aux consoles, aux composants partagés ou aux fichiers générés.

Pour une modification visuelle localisée, contrôler la page concernée sur mobile et ordinateur, puis exécuter ses tests ciblés. Utiliser `node tools/verify-livepalmes.js` lorsqu'une évolution touche plusieurs modules ou l'architecture, et `--browser` lorsque le parcours peut être contrôlé utilement dans le navigateur.

La génération et les contrôles propres aux consoles sont décrits uniquement dans `docs/LIVEPALMES_DIRECT.md`.
