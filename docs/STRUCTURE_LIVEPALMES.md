# Structure LivePalmes

<!-- description: Carte fonctionnelle des pages, dossiers et grandes zones du dépôt LivePalmes. -->

Ce document sert de carte simple du projet. Il distingue les grandes parties fonctionnelles de LivePalmes sans imposer de deplacement de fichiers.

## Principe important

Les pages HTML publiques principales restent a la racine du projet pour conserver des URL simples et stables.

Exemples :

- `/`
- `/resultats`
- `/series`
- `/live.html`
- `/speaker.html`
- `/ja.html`
- `/video.html`
- `/bureau-perf.html`
- `/secretariat.html`

Le dossier peut donc paraitre charge a la racine, mais une partie de cette organisation est volontaire.

## 1. Console competition

Cette partie concerne les utilisateurs en competition : juges, speaker, JA, video, secretariat, bureau performance et pilotage.

Pages principales :

- `index.html`
- `live.html`
- `speaker.html`
- `ja.html`
- `video.html`
- `bureau-perf.html`
- `secretariat.html`
- `pilotage-livepalmes.html`
- `portail.html`

Styles principaux :

- `styles.css`
- `console.css`
- `assets/livepalmes-admin-portal.css`
- `assets/livepalmes-admin-session-badge.css`

Scripts principaux :

- `app.js`
- `assets/livepalmes-app-*.js`
- `assets/livepalmes-admin-*.js`
- `assets/livepalmes-alert-*.js`
- `assets/livepalmes-console-*.js`
- `assets/livepalmes-decision-*.js`
- `assets/livepalmes-final-*.js`
- `assets/livepalmes-history-*.js`
- `assets/livepalmes-pdf-import.js`
- `assets/livepalmes-pin-auth.js`
- `assets/livepalmes-program-*.js`
- `assets/livepalmes-result-*.js`
- `assets/livepalmes-results-*.js`
- `assets/livepalmes-role-*.js`
- `assets/livepalmes-secretary-*.js`
- `assets/livepalmes-series-*.js`
- `assets/livepalmes-speaker-*.js`
- `assets/livepalmes-swimmer-*.js`
- `assets/livepalmes-ui-*.js`

Generation des pages consoles :

- `tools/build-console-pages.js`
- `tools/check-console-page-loads.js`

## 2. Live public competition

Cette partie concerne le public pendant une competition : series, resultats, medailles, archives et vues PDF.

Pages principales :

- `public.html`
- `resultats.html`
- `series-public.html`
- `medailles.html`
- `archives.html`
- `pdf.html`
- `resultat-pdf.html`
- `series-pdf.html`

Routes Firebase associees :

- `/resultats` vers `resultats.html`
- `/series` vers `series-public.html`

Styles principaux :

- `public.css`

Scripts principaux :

- `assets/pages/public-home.js`
- `assets/pages/resultats.js`
- `assets/pages/series-public.js`
- `assets/pages/medailles.js`
- `assets/pages/archives.js`
- `assets/pages/pdf.js`
- `assets/pages/resultat-pdf.js`
- `assets/pages/series-pdf.js`
- `assets/public/livepalmes-public-*.js`

## 3. Performances consultables tout le temps

Cette partie concerne les records, MPF, TOP, fiches nageurs, imports et donnees publiques de performances.

Dossier principal :

- `performances/`

Pages principales :

- `performances/index.html`
- `performances/records.html`
- `performances/mpf.html`
- `performances/tops.html`
- `performances/nageur.html`
- `performances/construction.html`

Les interfaces de gestion des performances sont integrees au portail principal :

- `portail.html#records-mpf`
- `portail.html#import-competitions`

Scripts et styles principaux :

- `performances/public/app.js`
- `performances/public/records.js`
- `performances/public/tops.js`
- `performances/public/swimmer.js`
- `performances/public/store.js`
- `performances/public/admin.js`
- `performances/public/admin-records.js`
- `performances/public/import-competitions.js`
- `performances/public/styles.css`
- `performances/public/import-competitions.css`

Donnees publiques :

- `performances/public/data/records-data.js`
- `performances/public/data/performance-public/`
- `performances/public/data/performance-public-firestore/`

Attention : ce dossier contient beaucoup de fichiers generes. Ce volume est normal.

## 4. Technique et maintenance

Firebase :

- `firebase.json`
- `.firebaserc`
- `firestore.rules`
- `functions/`

Scripts de maintenance :

- `tools/`

Tests :

- `tests/`

Documentation :

- `docs/`
- `README.md`
- `AGENTS.MD`

Sauvegardes et traces locales :

- `.firebase/`
- `firebase-backups/`

## Regle de rangement recommandee

Pour garder LivePalmes fiable :

1. Ne pas deplacer les pages HTML racine sans vraie raison.
2. Ranger d'abord la documentation et les nouveaux fichiers.
3. Pour les scripts existants, deplacer seulement par petites etapes verifiees.
4. Apres chaque deplacement de script, verifier toutes les pages qui le chargent.
5. Relancer `node tools/verify-livepalmes.js`.

## Evolution possible

Une evolution raisonnable serait de mieux separer les scripts dans `assets/` a long terme :

- `assets/console/`
- `assets/public/`
- `assets/shared/`

Mais ce deplacement doit etre progressif, car beaucoup de pages chargent actuellement les fichiers directement depuis `assets/`.
