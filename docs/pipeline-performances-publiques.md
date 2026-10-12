# Consultation publique et publication des Records/MPF

<!-- description: Lecture directe NAP des TOP et fiches ; exception statique Records/MPF et retrait du pipeline sportif Firestore. -->

## TOP, nageurs, calendrier et résultats

Les environnements TEST et PROD sélectionnent NAP. Les pages existantes appellent les lecteurs serveur, qui exécutent des requêtes SQL bornées. Aucun export intermédiaire ni fichier TOP historique n'est la source courante. Le calendrier et les fiches d'événements lisent également NAP via le serveur. Voir [NAP_REFERENCE.md](NAP_REFERENCE.md) et [OPTIMISATION_NAP.md](OPTIMISATION_NAP.md).

Les modifications NAP sont visibles à une nouvelle consultation serveur ; une interface déjà chargée peut conserver son affichage jusqu'à actualisation. La DTN est distincte : ses résultats calculés sont conservés jusqu'au recalcul explicite. Aucun cache absent ne doit lancer silencieusement une reconstruction sportive.

## Exception Records et MPF

L'administration conserve `competitions/livepalmes-active/performanceData/records` dans Firebase. La publication utilise le manifeste `performance-public-firestore/records/manifest.json` et ses versions statiques ; `performances/public/data/records-data.js` est le secours Hosting. Ce circuit validé ne doit pas être remplacé par les records NAP ni par un calcul des TOP.

`node tools/sync-records-from-firestore.js --write` lit la source Firebase et écrit un fichier généré : seulement après autorisation explicite de cette préparation. Hosting ordinaire ne lance pas automatiquement cette synchronisation ; consulter `firebase.json`, [agents/PERFORMANCES.md](agents/PERFORMANCES.md) et [agents/PUBLICATION.md](agents/PUBLICATION.md). Ne pas modifier les fichiers générés à la main.

## Ancien pipeline

Les sorties historiques TOP/nageurs, imports INTRANAP et jobs de reconstruction Firestore ne doivent pas être relancés pour rafraîchir NAP. Les déclarations conservées pour retour arrière et les fichiers résiduels ne prouvent pas un usage actuel. Les traitements retirés sont exclus des sélections de déploiement ; voir `tools/firebase-test-backend-lots.js` et [le suivi](releases/EVOLUTIONS.md).
