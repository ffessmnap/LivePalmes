# Architecture LivePalmes

Ce document sert de carte simple du code. Il est fait pour pouvoir reprendre LivePalmes sans devoir tout comprendre d'un coup.

## Principe general

LivePalmes est une application web simple en HTML, CSS et JavaScript. Il n'y a pas de framework comme React ou Vue.

Les pages principales sont a la racine :

- `index.html` : accueil historique avec acces a toutes les consoles.
- `live.html`, `speaker.html`, `ja.html`, `video.html`, `bureau-perf.html`, `secretariat.html` : pages dediees par console, avec le meme controle d'acces que l'accueil.
- `resultats.html` et `resultats.js` : page publique des resultats.
- `series-public.html` et `series-public.js` : page publique des series.
- `styles.css`, `console.css`, `public.css` : styles visuels.
- `app.js` : coeur de la console interne.

Les modules JavaScript sont dans `assets/`. Ils servent a separer les grands domaines fonctionnels.

## Modules principaux

- `assets/livepalmes-result-parser.js` : lecture des resultats depuis les lignes extraites des PDF.
- `assets/livepalmes-app-config.js` : configuration de demarrage, codes par defaut, Firebase, donnees de secours.
- `assets/livepalmes-local-state.js` : chargement et sauvegarde du stockage local du navigateur.
- `assets/livepalmes-app-storage-workflow.js` : stockage local des donnees, alertes et normalisation des donnees.
- `assets/livepalmes-firestore-refs.js` : acces aux documents et collections Firestore.
- `assets/livepalmes-console-sync.js` : presence console, verrous de roles, publication live et synchronisation Firebase.
- `assets/livepalmes-realtime-sync.js` : abonnement direct Firebase, actualisation manuelle et fin de session.
- `assets/livepalmes-role-session-workflow.js` : choix de console, codes, session locale et retour accueil.
- `assets/livepalmes-public-progress-workflow.js` : presence, compteurs d'accueil et partage de position speaker.
- `assets/livepalmes-alert-presenter.js` : libelles et affichage des alertes des consoles.
- `assets/livepalmes-series-import.js` : lecture et import des PDF de series.
- `assets/livepalmes-series-import-workflow.js` : workflow d'import des PDF de series depuis la console.
- `assets/livepalmes-results-admin-workflow.js` : publication des resultats cote bureau des performances.
- `assets/livepalmes-result-publication-workflow.js` : lecture/relecture des PDF resultats, performances et alertes finalistes.
- `assets/livepalmes-result-maintenance-workflow.js` : suppression/RAZ des resultats publics et RAZ series.
- `assets/livepalmes-admin-actions.js` : fenetres codes, RAZ, informations publiques et interrupteurs admin.
- `assets/livepalmes-final-withdrawals-workflow.js` : finalistes, forfaits en finale, repechages, reintegrations.
- `assets/livepalmes-export-actions.js` : telechargements JSON, ouverture et impression des archives.
- `assets/livepalmes-export-reports-workflow.js` : exports journal d'arbitrage et archives resultats.
- `assets/livepalmes-history-actions.js` : archivage historique, RAZ historique et alertes live masquees.
- `assets/livepalmes-history-presenter.js` : historique visible, fiche alerte et journal des annonces.
- `assets/livepalmes-decision-workflow.js` : decisions JA, file d'alertes et annulations.
- `assets/livepalmes-swimmer-panel.js` : fiche nageur, records, affichage speaker/live.
- `assets/livepalmes-speaker-info-workflow.js` : mise a jour des reperes depuis Google Sheets.
- `assets/livepalmes-public-swimmers.js` : recherche nageur et fiche nageur sur les pages publiques.
- `assets/livepalmes-program-navigation.js` : sessions, courses, series, finales, navigation.
- `assets/livepalmes-program-modals.js` : boutons et fenetres programme/import.
- `assets/livepalmes-entrant-helpers.js` : noms nageurs, recherche et affichage club court.
- `assets/livepalmes-diagnostics-workflow.js` : diagnostic technique et diagnostic performance.
- `assets/livepalmes-app-lifecycle.js` : demarrage, timers, actualisation locale et imports JSON/CSV.
- `assets/livepalmes-console-render-workflow.js` : rendu principal de la console interne.

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

- `app.js` est passe sous 2500 lignes.
- Les gros domaines sont separes.
- Les pages publiques partagent une partie de la logique nageur.
- Les diagnostics et la maintenance sont isoles.
- Les pages dediees par console existent sans supprimer l'acces historique depuis `index.html`.

Il reste encore des points a ameliorer :

- Il ne reste plus d'acces implicite `with (context)`.
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
- les regressions connues de lecture des resultats PDF ;
- les textes HTML visibles pour eviter le retour de caracteres casses ;
- les garde-fous d'architecture, dont `app.js` sous 1000 lignes utiles ;
- les erreurs d'espaces detectees par Git.

## Garde-fous automatiques

Les fichiers `tools/check-livepalmes-text.js` et `tools/check-livepalmes-architecture.js` sont volontairement simples.

Ils ne remplacent pas les tests manuels, mais ils evitent deux regressions dangereuses :

- publier une page avec des caracteres visibles casses ;
- refaire grossir `app.js` ou remettre une logique trop fragile dans le coeur de l'application.

Si l'un de ces controles bloque, il faut corriger la cause avant de publier.
