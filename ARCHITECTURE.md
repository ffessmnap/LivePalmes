# Architecture LivePalmes

Ce document sert de carte simple du code. Il est fait pour pouvoir reprendre LivePalmes sans devoir tout comprendre d'un coup.

## Principe general

LivePalmes est une application web simple en HTML, CSS et JavaScript. Il n'y a pas de framework comme React ou Vue.

Les pages principales sont a la racine :

- `index.html` : consoles internes, bureau des performances, speaker, live, JA, video, secretariat.
- `resultats.html` et `resultats.js` : page publique des resultats.
- `series-public.html` et `series-public.js` : page publique des series.
- `styles.css`, `console.css`, `public.css` : styles visuels.
- `app.js` : coeur de la console interne.

Les modules JavaScript sont dans `assets/`. Ils servent a separer les grands domaines fonctionnels.

## Modules principaux

- `assets/livepalmes-result-parser.js` : lecture des resultats depuis les lignes extraites des PDF.
- `assets/livepalmes-app-config.js` : configuration de demarrage, codes par defaut, Firebase, donnees de secours.
- `assets/livepalmes-local-state.js` : chargement et sauvegarde du stockage local du navigateur.
- `assets/livepalmes-firestore-refs.js` : acces aux documents et collections Firestore.
- `assets/livepalmes-series-import.js` : lecture et import des PDF de series.
- `assets/livepalmes-results-admin-workflow.js` : publication des resultats cote bureau des performances.
- `assets/livepalmes-final-withdrawals-workflow.js` : finalistes, forfaits en finale, repechages, reintegrations.
- `assets/livepalmes-export-actions.js` : telechargements JSON, ouverture et impression des archives.
- `assets/livepalmes-swimmer-panel.js` : fiche nageur, records, affichage speaker/live.
- `assets/livepalmes-public-swimmers.js` : recherche nageur et fiche nageur sur les pages publiques.
- `assets/livepalmes-program-navigation.js` : sessions, courses, series, finales, navigation.
- `assets/livepalmes-diagnostics-workflow.js` : diagnostic technique et diagnostic performance.

## Evenements interface

Le fichier `assets/livepalmes-ui-events.js` est seulement un chef d'orchestre.

Les vrais branchements de boutons sont separes ici :

- `assets/livepalmes-ui-navigation-events.js` : changement de console, session, course, serie, clavier.
- `assets/livepalmes-ui-results-events.js` : boutons resultats, relecture, import PDF resultats, import PDF series.
- `assets/livepalmes-ui-admin-events.js` : fenetre codes, diagnostics, archives, RAZ.
- `assets/livepalmes-ui-alert-events.js` : alertes speaker/live, decisions JA, historique, finalistes.

## Zones sensibles

Ces zones doivent etre modifiees avec prudence :

- Import PDF series : `assets/livepalmes-series-import.js`.
- Lecture PDF resultats : `assets/livepalmes-result-parser.js`.
- Finalistes et repechages : `assets/livepalmes-final-withdrawals-workflow.js`.
- Publication Firebase : `app.js`, `assets/livepalmes-results-admin-workflow.js`, `assets/livepalmes-publication.js`.
- Regles Firestore : `firestore.rules`.

Avant de modifier ces zones, il faut faire les tests manuels du fichier `TESTS_MANUELS.md`.

## Etat actuel

Le code est nettement plus sain qu'avant :

- `app.js` est passe sous 5000 lignes.
- Les gros domaines sont separes.
- Les pages publiques partagent une partie de la logique nageur.
- Les diagnostics et la maintenance sont isoles.

Il reste encore des points a ameliorer :

- Certains modules utilisent encore `with (context)` pour recevoir leurs dependances.
- Il y a peu de tests automatiques.
- Les imports PDF restent complexes car les formats PDF changent selon les competitions.

## Regle simple pour modifier LivePalmes

1. Identifier le domaine concerne.
2. Modifier le plus petit fichier possible.
3. Lancer `node tools/verify-livepalmes.js`.
4. Faire les tests manuels importants.
5. Publier seulement quand les controles sont bons.

## Commande de verification

La commande `node tools/verify-livepalmes.js` est le controle technique rapide a lancer avant publication.

Elle verifie :

- la syntaxe de tous les fichiers JavaScript suivis dans le projet ;
- les tests automatiques de base ;
- les erreurs d'espaces detectees par Git.
