# Audit performance et coût du portail

<!-- description: Synthèse des lectures Firestore du portail LivePalmes, optimisations appliquées et procédure sûre de mise en service. -->

## Résultat cible

Le parcours quotidien d'un club repose sur des documents agrégés et des appels bornés. Les filtres d'affichage restent locaux, les actions rapprochées sont regroupées et les calculs lourds ne bloquent plus l'interface.

## Budget de lectures après optimisation

| Action | Lectures Firestore attendues |
| --- | ---: |
| Connexion et profil | 1, sans doublon concurrent |
| Calendrier Club d'une saison, agrégats prêts | 3 : contrôle du profil, calendrier, index « Mes engagements » ; 4 en août avec l'aperçu de septembre |
| Calendrier Organisation d'une saison, agrégat prêt | 2 : contrôle du profil et calendrier ; 3 en août avec l'aperçu de septembre |
| Calendrier Organisation avec événements non compétitifs | 3 : contrôle du profil et deux agrégats saisonniers ; 5 en août avec l'aperçu de septembre |
| Calendrier public, ouverture et filtres | 0 lecture Firestore : un manifeste puis un fichier JSON de saison ; filtres locaux |
| Fiche publique d'un événement | 0 lecture Firestore : un fichier JSON statique borné |
| Retour sur un calendrier en cache pendant 5 minutes | 0, avec affichage immédiat |
| Filtre région, niveau, statut ou « mes compétitions » | 0 |
| Ouverture initiale d'une compétition club | 4 : profil, compétition, engagement, agrégat officiels |
| Réouverture pendant 30 secondes | 0 |
| Effectif nageurs, agrégat prêt | 2 |
| Effectif officiels, agrégat prêt | 2 |
| Sélections rapprochées de nageurs | un coût fixe par lot, puis lectures de validation bornées aux nageurs ajoutés |
| Aperçu des temps de plusieurs nageurs | 3 lectures fixes, puis une entrée de cache par nageur en régime normal |
| Vue DTN, cache prêt | 2 |
| Vue DTN, cache absent ou périmé | 2 dans la requête interactive ; calcul lourd unique en arrière-plan |
| Journal d’activité, page de 50 traces | 52 lectures fixes au plus pour le profil et la page, plus jusqu’à 25 acteurs, 25 compétitions et 25 personnes historiques à résoudre en lots ; maximum absolu 127, puis les références connues sont réutilisées |
| Recherche, catégorie ou origine dans le journal déjà chargé | 0 |

Les replis de reconstruction des effectifs restent bornés pour compatibilité. Ils ne doivent plus être atteints après la préparation des agrégats.
Un cache de temps absent peut encore nécessiter la reconstruction de l'historique du nageur. Le chemin privilégié lit l'index et ses pages ; le repli historique est désormais explicitement borné à 500 documents par requête.

## Optimisations appliquées

- déduplication de la lecture du profil pendant la connexion ;
- filtrage du calendrier côté navigateur hors changement de saison ;
- caches de session séparés pour les calendriers Club et Organisation, avec préchargement du seul calendrier Club et actualisation silencieuse après cinq minutes ;
- lecture groupée du calendrier saisonnier et de l'index « Mes engagements » après le contrôle d'accès Club ;
- cache mémoire de 30 secondes pour la fiche d'engagement ;
- chargement groupé de la compétition, de l'engagement et des officiels ;
- sauvegarde par lot des sélections et aperçu par lot des temps ;
- suppression des relectures après les écritures courantes ;
- reconstruction administrative bornée des agrégats club, maintenus ensuite par les déclencheurs existants ;
- vue DTN calculée par un travail Firestore dédupliqué, jamais dans l'appel interactif ;
- chargement du module DTN uniquement à son ouverture ;
- métriques structurées `livepalmes.portal.reads`, sans donnée personnelle.

## Ordre de mise en service

1. Déployer les Functions et le portail dans un environnement de test.
2. Vérifier les index Firestore et les droits du déclencheur `buildDtnQualificationView`.
3. Exécuter `rebuildEngagementClubAggregates` par lots de 10 clubs maximum. Cette opération peut lire jusqu'à environ 2 200 documents par club et ne doit être lancée qu'une fois, hors période chargée.
4. Contrôler la présence de `generatedAt` dans les deux agrégats de chaque club.
5. Exécuter les scénarios de `docs/TESTS_MANUELS.md` et observer les métriques.
6. Déployer en production seulement après validation des volumes et de la latence.

## Garde-fous

- Aucun scan complet non borné n'a été ajouté.
- Les lots de sélection et d'aperçu sont limités respectivement à 50 nageurs.
- Une reconstruction administrative accepte au plus 10 clubs.
- Un calcul DTN est identifié par saison, sexe et empreinte : plusieurs ouvertures simultanées ne créent pas plusieurs scans.
- Le cache périmé DTN reste visible pendant le recalcul.
