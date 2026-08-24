# Structure LivePalmes

<!-- description: Carte fonctionnelle des pages, dossiers et grandes zones du dépôt LivePalmes. -->

Ce document sert de carte simple du projet. Il distingue les grandes parties fonctionnelles de l'ecosysteme LivePalmes sans imposer de deplacement de fichiers.

Le Portail LivePalmes est le coeur fonctionnel actuel. Il est en cours de finalisation et de test. Les espaces publics permanents et le dispositif Direct national sont des composantes distinctes.

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

## 1. Portail LivePalmes

Cette partie concerne la preparation des competitions et des engagements, les espaces club, region et national, ainsi que la gestion des donnees sportives, des comptes et des droits.

Page principale :

- `portail.html`

Principaux espaces fonctionnels :

- espace club : competitions, nageurs, officiels et engagements ;
- organisation des competitions : calendrier, parametrage, programme, documents et diffusion ;
- donnees sportives : Records / MPF, imports et corrections ;
- espace DTN ;
- administration nationale ;
- gestion des utilisateurs, demandes d'acces et habilitations.

Styles principaux :

- `styles.css`
- `assets/livepalmes-admin-portal.css`

Scripts principaux :

- `assets/livepalmes-admin-portal.js`
- `assets/livepalmes-admin-auth.js`
- `assets/livepalmes-admin-*.js`
- `performances/public/admin*.js`
- `performances/public/import-competitions.js`

Le portail utilise aussi les Cloud Functions de `functions/` pour les operations sensibles et les traitements serveur.

## 2. LivePalmes Direct - consoles nationales

Cette partie concerne les utilisateurs des competitions nationales equipees de LivePalmes Direct : juges, speaker, JA, video, secretariat, bureau performance et pilotage.

Ces consoles ne sont pas utilisees pour toutes les competitions et ne doivent pas etre confondues avec leur preparation dans le portail.

Pages principales :

- `live.html`
- `speaker.html`
- `ja.html`
- `video.html`
- `bureau-perf.html`
- `secretariat.html`
- `pilotage-livepalmes.html`

Styles principaux :

- `styles.css`
- `console.css`
- `assets/livepalmes-admin-session-badge.css`

Scripts principaux :

- `app.js`
- `assets/livepalmes-app-*.js`
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

## 3. Publication publique du Direct

Cette partie accompagne LivePalmes Direct pendant une competition nationale : series, resultats, medailles, archives et vues PDF.

Pages principales :

- `resultats.html`
- `series-public.html`
- `medailles.html`
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
- `assets/pages/pdf.js`
- `assets/pages/resultat-pdf.js`
- `assets/pages/series-pdf.js`
- `assets/public/livepalmes-public-*.js`

## 4. Espace public permanent

Cette partie concerne les Records, MPF, TOP, fiches nageurs et donnees publiques de performances consultables toute l'annee, sans connexion.

Dossier principal :

- `performances/`

Pages principales :

- `index.html`
- `public.html`
- `performances/index.html`
- `performances/records.html`
- `performances/mpf.html`
- `performances/tops.html`
- `performances/nageur.html`
- `performances/construction.html`

Les interfaces de gestion de ces donnees sont integrees au Portail LivePalmes :

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

## 5. Technique et maintenance

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
- `AGENTS.md`

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
