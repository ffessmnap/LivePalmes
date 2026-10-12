# Consultation publique et publication des Records/MPF

<!-- description: Lecture directe NAP des TOP et fiches ; Records/MPF dans NAP et retrait du pipeline sportif Firestore. -->

## TOP, nageurs, calendrier et résultats

Les environnements TEST et PROD sélectionnent NAP. Les pages existantes appellent les lecteurs serveur, qui exécutent des requêtes SQL bornées. Aucun export intermédiaire ni fichier TOP historique n'est la source courante. Le calendrier et les fiches d'événements lisent également NAP via le serveur. Voir [NAP_REFERENCE.md](NAP_REFERENCE.md) et [OPTIMISATION_NAP.md](OPTIMISATION_NAP.md).

Les modifications NAP sont visibles à une nouvelle consultation serveur ; une interface déjà chargée peut conserver son affichage jusqu'à actualisation. La DTN est distincte : ses résultats calculés sont conservés jusqu'au recalcul explicite. Aucun cache absent ne doit lancer silencieusement une reconstruction sportive.

## Records et MPF

L’administration et les consultations publiques utilisent les versions RF/MPF dans NAP (`livepalmes_records_versions`, `livepalmes_records_current`). Le lecteur public retourne une projection sans historique privé. Les publications passent par les actions existantes avec version attendue et reprise idempotente, sans calcul à partir des TOP.

La copie statique RF/MPF et ses outils historiques ont été retirés du dépôt. Git conserve leurs anciennes versions ; les données Firebase et Storage restent intactes. Aucun repli vers ces copies en cas de panne NAP. Voir [la référence](NAP_REFERENCE.md) et [le suivi du nettoyage](releases/EVOLUTIONS.md).

## Ancien pipeline

Les sorties historiques TOP/nageurs, imports INTRANAP et jobs de reconstruction Firestore ne doivent pas être relancés pour rafraîchir NAP. Les déclarations conservées pour retour arrière et les fichiers résiduels ne prouvent pas un usage actuel. Les traitements retirés sont exclus des sélections de déploiement ; voir `tools/firebase-test-backend-lots.js` et [le suivi](releases/EVOLUTIONS.md).

## Nettoyage des exports TOP/nageurs — 12 octobre

Les exports historiques suivis dans `performance-public/{tops,tops-preview,swimmers,search,ids}` et leurs anciens manifeste/version/résumé/index ont été retirés après découplage des pages et recette TEST. `performances/public/reference.js` conserve seulement les libellés d’affichage ; les résultats restent lus dans NAP. Les copies distantes Storage et les références techniques backend ne sont pas effacées.

Les deux workflows de reconstruction sportive historique sont archivés avec jobs désactivés. Les commandes de reconstruction Firestore, publication consolidée et envoi Storage sont arrêtées avant toute action ; les générateurs nécessaires aux diagnostics hors ligne et tests restent conservés avec sortie de travail explicite. Aucun nettoyage d’historique Git, migration ou suppression distante.
