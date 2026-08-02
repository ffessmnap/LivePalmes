# Frontend LivePalmes

<!-- description: Règles ciblées pour modifier les pages HTML, styles, scripts clients et consoles LivePalmes. -->

## Architecture

LivePalmes utilise HTML, CSS et JavaScript natif, sans framework frontend ni bundler racine. Faire évoluer les composants et modules existants.

Les pages accessibles en ligne restent à la racine afin de préserver leurs URL. Leurs responsabilités doivent rester séparées :

- `index.html` et `public.html` : accueil et historique publics ;
- `pilotage-livepalmes.html` : socle des consoles ;
- `live.html`, `speaker.html`, `ja.html`, `video.html`, `bureau-perf.html`, `secretariat.html` : consoles par rôle ;
- `portail.html` : portail administratif séparé ;
- `resultats.html`, `series-public.html`, `medailles.html`, `archives.html` : pages publiques autonomes ;
- `pdf.html`, `resultat-pdf.html`, `series-pdf.html` : vues PDF.

Les scripts applicatifs sont principalement dans `assets/`. Compléter un module métier existant ou créer un module ciblé plutôt que d’ajouter une grosse logique dans `app.js`, maintenu sous 1 000 lignes utiles.

## Consoles

Les consoles dédiées sont générées depuis `pilotage-livepalmes.html`. Leur génération est sensible : obtenir une validation explicite avant de modifier ce mécanisme. Après modification validée du socle, utiliser :

```powershell
node tools/build-console-pages.js
```

Pour un contrôle sans réécriture :

```powershell
node tools/build-console-pages.js --check
node tools/check-console-page-loads.js
```

## Interface

- Concevoir mobile first et vérifier aussi l’usage sur ordinateur.
- Garder accessibles les actions et contenus essentiels à toutes les largeurs.
- Ne pas dépendre uniquement du survol ; toutes les actions doivent fonctionner au toucher.
- Adapter les tableaux larges avec défilement ou présentation responsive.
- Réutiliser les styles et composants existants.
- Préserver les paramètres de cache et rewrites de `firebase.json`.

## Vérification

Pour une modification UI localisée, contrôler la page concernée sur mobile et ordinateur, puis exécuter les tests ciblés. Pour le socle console ou plusieurs modules, lancer `node tools/verify-livepalmes.js`, avec `--browser` lorsque le parcours est couvert utilement.
