# Consultation publique et publication des Records/MPF

<!-- description: Lecture directe NAP des TOP et fiches ; Records/MPF dans NAP et retrait du pipeline sportif Firestore. -->

## TOP, nageurs, calendrier et résultats

Les environnements TEST et PROD sélectionnent NAP. Les pages existantes appellent les lecteurs serveur, qui exécutent des requêtes SQL bornées. Aucun export intermédiaire ni fichier TOP historique n'est la source courante. Le calendrier et les fiches d'événements lisent également NAP via le serveur. Voir [NAP_REFERENCE.md](NAP_REFERENCE.md) et [OPTIMISATION_NAP.md](OPTIMISATION_NAP.md).

Les modifications NAP sont visibles à une nouvelle consultation serveur ; une interface déjà chargée peut conserver son affichage jusqu'à actualisation. La DTN est distincte : ses résultats calculés sont conservés jusqu'au recalcul explicite. Aucun cache absent ne doit lancer silencieusement une reconstruction sportive.

## Records et MPF

L’administration et les consultations publiques utilisent les versions RF/MPF dans NAP (`livepalmes_records_versions`, `livepalmes_records_current`). Le lecteur public retourne une projection sans historique privé. Les publications passent par les actions existantes avec version attendue et reprise idempotente, sans calcul à partir des TOP.

La copie statique RF/MPF et ses outils historiques ont été retirés du dépôt. Git conserve leurs anciennes versions ; les données Firebase et Storage restent intactes. Aucun repli vers ces copies en cas de panne NAP. Voir [la référence](NAP_REFERENCE.md) et [le suivi du nettoyage](releases/EVOLUTIONS.md).

## Ancien pipeline

Après inventaire et accord du 12 octobre, les déclarations des trois anciennes fonctions calendrier déjà absentes de TEST/PROD et leurs auxiliaires isolés sont retirés du code. Leurs noms restent dans les exclusions de déploiement. Les 3 587 objets `calendar/` TEST ont été archivés localement avec générations et empreintes vérifiées puis supprimés ; PROD, autres préfixes, documents et PDF restent conservés. Voir `releases/EVOLUTIONS.md` pour la preuve et la recette. Aucun déploiement de fonction n'accompagne ce retrait.

Le lecteur calendrier public utilise exclusivement les actions NAP `calendar-manifest`, `calendar-season`, `competition` et `competition-results`. Les chemins `results/*.json` sont des routes logiques vers NAP, pas des fichiers Storage à supprimer. En cas d'erreur NAP, aucun repli vers Storage n'est effectué.

Pour une recette locale hors ligne, définir `window.LIVEPALMES_PUBLIC_CALENDAR_FIXTURES = true` avant le lecteur, uniquement sur `localhost` ou `127.0.0.1`. Les fixtures sont alors lues sous `/tests/fixtures/public-calendar/` ; aucune URL distante personnalisée n'est acceptée. Sans cette option, localhost conserve le lecteur NAP configuré. L'ancienne option `LIVEPALMES_PUBLIC_CALENDAR_BASE` n'est plus utilisée.

Les quatre commandes historiques `build-public-calendar-results.js`, `publish-public-calendar-results.js`, `repair-legacy-calendar-public-season.js` et `repair-legacy-calendar-practical-public-data.js` refusent toute exécution. Leurs sources sont conservées en texte dans `tools/archives/calendar-storage/`, avec un arrêt immédiat même si ces archives sont passées directement à Node. Ce retrait ne supprime aucun objet Storage et ne change ni les fonctions distantes, ni `functions/public-calendar.js`, encore partagé avec NAP.

Les sorties historiques TOP/nageurs, imports INTRANAP et jobs de reconstruction Firestore ne doivent pas être relancés pour rafraîchir NAP. Les déclarations conservées pour retour arrière et les fichiers résiduels ne prouvent pas un usage actuel. Les traitements retirés sont exclus des sélections de déploiement ; voir `tools/firebase-test-backend-lots.js` et [le suivi](releases/EVOLUTIONS.md).

## Nettoyage des exports TOP/nageurs — 12 octobre

Les exports historiques suivis dans `performance-public/{tops,tops-preview,swimmers,search,ids}` et leurs anciens manifeste/version/résumé/index ont été retirés après découplage des pages et recette TEST. `performances/public/reference.js` conserve seulement les libellés d’affichage ; les résultats restent lus dans NAP. Les copies distantes Storage et les références techniques backend ne sont pas effacées.

Les deux workflows de reconstruction sportive historique sont archivés avec jobs désactivés. Les commandes de reconstruction Firestore, publication consolidée et envoi Storage sont arrêtées avant toute action ; les générateurs nécessaires aux diagnostics hors ligne et tests restent conservés avec sortie de travail explicite. Aucun nettoyage d’historique Git, migration ou suppression distante.
