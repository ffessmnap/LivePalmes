# Optimisation des lectures NAP

<!-- description: Budgets actuels NAP, mesures après bascule et suivi des optimisations ; remplace les recommandations Firestore historiques. -->

## Objectif

Lire NAP directement, conserver les règles sportives et les données fraîches, réduire le travail répété. Aucun export sportif parallèle, aucun nouveau stockage et aucun cache temporisé ajouté. Les modifications IntraNAP restent visibles à la consultation suivante.

## Budgets et protections

| Parcours | Budget SQL par appel, hors contrôle d’accès | Limites |
| --- | --- | --- |
| TOP | 2 SELECT ; 3 si années de naissance demandées | Comptage indexé borné à 150 001 ; 5 001 candidats ; jusqu’à 2 000 lignes publiques |
| Métadonnées TOP | 2 SELECT | 5 001 dates et 1 001 clubs, refus au dépassement |
| Calendrier public saisonnier | 1 SELECT avec jointures et vérifications indexées de résultats | 501 événements, refus au-delà de 500 ; aucun programme détaillé par ligne |
| Fiche nageur publique | 2 SELECT | Une identité et 2 001 performances, refus au-delà de 2 000 |
| Résultats compétition | Jusqu’à 5 SELECT, dont le pointeur de statuts d’import | 5 001 résultats, 1 001 relais, 1 000 participants ; contrôle global des historiques à 100 001 conservé |
| Consultation DTN | Configuration, résultats conservés et empreinte de fraîcheur | Aucun recalcul automatique ; pages de 500 uniquement lors du recalcul explicite, plafond 100 000 |

Ces bornes concernent les lignes renvoyées/comptées, pas une garantie sur les lignes examinées par MySQL. Le tri numérique des temps reste nécessaire pour les valeurs comme `14200` et `014200`. Ne pas substituer un tri lexical.

## Optimisations préparées le 11 octobre 2026

- TOP navigateur : regroupement des filtres pendant 100 ms, partage des demandes identiques encore en cours. Réponse supprimée de la mémoire dès achèvement, y compris en erreur ; consultation ultérieure fraîche, aucun cache de données. Les réponses dépassées restent ignorées.
- TOP SQL sans filtre régional : recherche des clubs après sélection des 5 001 candidats, années de naissance sans recherche de clubs. Filtre régional inchangé : la région doit sélectionner les candidats avant LIMIT.
- Résultats : historique transféré limité aux courses présentes dans la compétition. Le comptage préalable de tout l’historique et ses plafonds restent inchangés ; mêmes meilleurs temps personnels/saisonniers.
- Calendrier : projection `co.*` étudiée mais conservée. Sa modification touchait un helper partagé par 53 fonctions pour un gain non démontré ; ne pas élargir ce lot pour cette retouche. Les comparaisons de deux saisons établissent la référence, pas un gain de latence attribuable.
- Ancien audit Firestore marqué historique, ne pas relancer les reconstructions retirées.

## Mesures de référence

Comparaisons directes en lecture seule, échantillons séquentiels du 11 octobre ; latence incluant réseau et échauffement. Aucun percentile ni estimation financière n’est déduit de ces essais.

| Cas | Avant | Après | Équivalence |
| --- | ---: | ---: | --- |
| TOP 100SF hommes, 25 lignes | 1 212 ms | 774 ms | Réponse exacte hors date de lecture |
| Même TOP, saison 2026 / 50 m / années de naissance | 1 568 ms | 1 291 ms | Réponse exacte hors date de lecture |
| TOP 100SF femmes seniors | 928 ms | 704 ms | Réponse exacte hors date de lecture |
| TOP avec filtre régional | 790 ms | 761 ms | SQL de sélection inchangé ; variation non attribuée à la correction |
| Historique compétition 2652 | 12 426 lignes | 8 521 lignes | 153 résultats et tous les repères identiques |
| Calendrier saisons 2026 / 2027 | 121 / 77 événements | 121 / 77 événements | Réponses exactes hors date de lecture |

EXPLAIN du TOP initial : index course/relais, estimation 81 210 lignes et tri temporaire. Cette estimation n’est pas un comptage réel. Le comptage protecteur reste en place ; aucune nouvelle colonne/index ni correction de temps.

Preuves détaillées locales : `outputs/audit-optimisation-nap-20261011/` dans la session de travail. Tests : `nap-top-requests-tests.js`, `nap-direct-tops-tests.js`, `nap-direct-calendar-tests.js` et suite globale.

## Suite et validation

1. Contrôles techniques, revue et TEST commun du lot complet ; comparaison des mêmes parcours.
2. Recette utilisateur et bilan avant toute publication PROD.
3. Suivi des durées des prochaines publications représentatives. Le ciblage a été corrigé par PR #246 ; aucun nouveau repli manuel de sélection n’est autorisé.
4. Ajuster uniquement sur preuve : pas de cache temporisé sans accord sur la fraîcheur, pas de nouvel index sans accord spécifique, pas de changement de concurrence NAP sans mesure de charge. DTN inchangée, aucun recalcul d’essai.

Aucun gain permanent de coût ou de durée n’est annoncé avant observation en usage. Aucune suppression supplémentaire de fonctions justifiée par ce lot.
