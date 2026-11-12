# Structure LivePalmes

<!-- description: Carte fonctionnelle des pages, dossiers et grandes zones du dépôt LivePalmes. -->

> **Sources courantes :** NAP pour les données métier portail/public, les versions officielles Records/MPF et les tables du nouveau Direct. Firebase conserve les comptes, l'authentification, les services techniques et les usages historiques encore présents. Distinguer les sources actives des anciens fichiers et outils. Voir [NAP_REFERENCE.md](NAP_REFERENCE.md) et [LIVEPALMES_DIRECT.md](LIVEPALMES_DIRECT.md).

Ce document sert de carte simple du projet. Il distingue les grandes parties fonctionnelles de l'ecosysteme LivePalmes sans imposer de deplacement de fichiers.

Le Portail LivePalmes est le coeur fonctionnel actuel. Il est en cours de finalisation et de test. L'espace public permanent et LivePalmes Direct sont des composantes distinctes. Le nouveau Direct multi-compétitions et l'ancien dispositif national doivent être distingués.

## Principe important

Les pages HTML publiques principales restent a la racine du projet pour conserver des URL simples et stables.

Exemples actuels : `/`, `calendrier.html`, `competition.html`, `bibliotheque.html`, `direct-admin.html`, `direct-consoles.html` et `direct.html`.

Les URL historiques ci-dessous restent à préserver tant que leur retrait ou redirection n'a pas été explicitement autorisé :

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

## 2. LivePalmes Direct — bureau et consoles

Le parcours multi-compétitions concerne les compétitions piscine de tous niveaux issues du calendrier NAP. Le bureau fonctionne seul ou avec des consoles selon les besoins et les accès autorisés. La préparation des engagements reste dans le portail.

Entrées principales :

- `direct-admin.html` : bureau ;
- `direct-consoles.html` : consoles complémentaires ;
- `assets/direct/` : modules et styles du nouveau parcours ;
- `direct-guide.html` : guide utilisateur.

### Dispositif national historique

L'ancien pilotage national, ses pages de rôles, ses générateurs et son socle sont inventoriés ci-dessous. Certains composants sont réutilisés par le nouveau Direct ; vérifier les dépendances avant tout retrait.

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

`direct.html?id=ID_NAP` est l'entrée publique du nouveau parcours : séries, résultats, documents et archives.

### Pages publiques du dispositif historique

Les anciennes pages `/series`, `/resultats` et leurs vues associées appartiennent au dispositif historique. Leur retrait suit son périmètre explicite ; il ne signifie pas suppression des archives ou des données.

Pages historiques :

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

- `assets/pages/resultats.js`
- `assets/pages/series-public.js`
- `assets/pages/medailles.js`
- `assets/pages/pdf.js`
- `assets/pages/resultat-pdf.js`
- `assets/pages/series-pdf.js`
- `assets/public/livepalmes-public-*.js`

## 4. Espace public permanent

Cette partie permet de consulter sans connexion l'accueil, le calendrier, les documents, les Records/MPF, les TOP, les performances, les résultats et les fiches nageurs. La gestion privée de ces contenus reste dans les modules autorisés du portail.

Dossier des performances :

- `performances/`

Pages principales :

- `index.html`
- `public.html`
- `calendrier.html`
- `competition.html?id=...`
- `bibliotheque.html`
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

- `assets/pages/calendrier.js` et `assets/pages/competition.js`
- `assets/public/livepalmes-public-calendar.js`
- `assets/public/livepalmes-public-documents.js`
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

Les performances publiques (TOP et fiches nageurs) et les versions officielles Records/MPF sont lues depuis NAP. Les anciens exports sportifs statiques ont été retirés du dépôt ; `performances/public/reference.js` conserve seulement les libellés et l'ordre des courses/catégories. Les générateurs historiques utiles aux tests hors ligne sont conservés avec une sortie explicite hors publication. Le retrait du code et le nettoyage Storage sont deux opérations distinctes ; voir [le circuit public et l'état du nettoyage](pipeline-performances-publiques.md).

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
