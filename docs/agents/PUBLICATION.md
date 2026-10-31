# Publication LivePalmes — parcours quotidien

<!-- description: Parcours court TEST/PROD, réutilisation des preuves et protections à conserver ; exécution technique dans PROCEDURE.md. -->

## Choisir le parcours

Lire les consignes du dernier `main` et préserver le travail des autres conversations. Une demande de développement autorise PR, intégration après contrôles et TEST dans son périmètre. Une analyse seule ne déclenche aucun développement. Les accords sensibles d'`AGENTS.md` restent nécessaires ; un accord explicite déjà acquis ne se redemande pas.

| Changement | Parcours |
| --- | --- |
| Documentation seule | Relecture et CI requise. Aucun déploiement ni preflight. |
| Interface seule | Tests ciblés, contrôle ordinateur/mobile pertinent, CI puis TEST commun. Hosting seul si le backend est équivalent et prouvé ; toute différence ou preuve absente bloque ce mode. |
| Backend existant autorisé | Tests concernés, CI, sélection calculée des fonctions différentes, contrôles backend puis Hosting. Expliquer les dépendances qui élargissent la sélection. |
| Données, droits, mails, infrastructure ou autre opération sensible | Accord explicite sur l'opération et ses limites, puis parcours spécifique. Aucun ancien accord ne s'étend à un nouveau besoin. |

## Enchaîner les étapes autorisées

**PR → CI → TEST commun → retour utilisateur → bilan PROD → accord Infra → PROD.** L'assistant gère les commits, runs, preuves et manifestes. Les commandes et contrats techniques figurent dans la [procédure actuelle](../releases/PROCEDURE.md).

1. Une PR courte par besoin depuis `main`, avec les tests et la documentation utiles. Attendre les contrôles GitHub obligatoires. L'aperçu `pr-N` est facultatif, sur demande via `apercu-test` ; il ne remplace pas TEST commun.
2. Après CI main réussie, laisser l'automatisme publier les interfaces ordinaires connues sur TEST. Backend, chemins inconnus et cas sensibles suivent le parcours explicite. TEST commun reste un commit intégré de `main`, jamais une branche isolée. Conserver la preuve de réussite.
3. Recueillir le retour utilisateur sur la version commune présentée. Une validation explicite de toute cette version couvre ses évolutions présentées, sans confirmation individuelle répétée ; une validation partielle reste partielle. Une modification ultérieure invalide les parcours concernés. Une CI verte ne vaut pas validation utilisateur.
4. Assembler le bilan PROD depuis les preuves et retours authentiques, compléter les points bloquants et exécuter le preflight existant. Figer le candidat validé pour exclure les ajouts suivants. Présenter un bilan court dans Infra ; l'accord explicite d'Antoine autorise uniquement ce périmètre. La PR d'un manifeste seul n'est pas obligatoire.
5. Publier après cet accord, vérifier le résultat et fournir les liens utiles. Une approbation GitHub encore requise reste obligatoire.

## Réutiliser le travail déjà fait

| Situation | Action attendue |
| --- | --- |
| CI ou publication en cours | Attendre le run existant avec une attente bornée. Aucun second lancement identique ni annulation d'une publication engagée. |
| Preuve CI exacte compatible | Réutiliser les suites applicative et publication attestées ; sans preuve compatible, exécuter la suite concernée. Garder les contrôles frais de l'état déployé. |
| Petite interface, backend équivalent et prouvé | Hosting seul. Ne pas redéployer les fonctions pour aligner leur SHA sur celui de Hosting. |
| Version TEST déjà publiée et validée | Réutiliser sa preuve pour PROD. Ne relancer TEST que si la version, son état ou la validité de la preuve l'exige. |
| Permissions et capacités inchangées, déjà attestées | Réutiliser les preuves compatibles. Nouveauté, doute ou preuve manquante : contrôle ciblé des prérequis. |
| Sélection backend large | Expliquer la dépendance commune ou la preuve manquante. Ne pas réduire la sélection à la main ; une amélioration du sélecteur ou une extraction métier constitue un besoin distinct. |

Pas de benchmark, audit général, rapport HTML ou refonte d'outillage ajouté à une livraison ordinaire. Ne répéter un contrôle que si un changement, un échec ou une preuve incompatible le justifie. Inclure le suivi dans la PR ouverte ; après fusion, lier les preuves GitHub et regrouper la mise à jour de `docs/releases/EVOLUTIONS.md`, sans PR par résultat de contrôle. Distinguer déploiement et validation, durée totale et attentes externes.

## Protections conservées

- Version exacte, diff applicatif entièrement couvert, validations authentiques et preuves GitHub vérifiées. Une évolution incluse et non validée bloque ; aucune sélection silencieuse de fichiers.
- PROD : accord Infra sur le bilan précis, environnement `production` limité à `main`, contrôle frais de dérive, sauvegarde chiffrée rouverte et comparée avant écriture, retour arrière disponible et vérifications finales.
- Aucune copie TEST→PROD, migration, correction/génération de données, publication Storage, règle/index, suppression, invocation métier ou envoi de test implicite. Fonctions email/schedulers et opérations sensibles restent dans leurs contrats autorisés.
- Préserver exclusions et réglages mail courants. Ne pas couper, réactiver ou élargir les envois sans plan explicite. Un ancien plan IDF ne prouve pas le périmètre mail actuel.
- Source inconnue, preuve incompatible, dérive ou contrat refusé : arrêter l'écriture et expliquer le point bloqué. Ne pas élargir les permissions pour débloquer une livraison.

Les [anciennes consignes](PUBLICATION_HISTORIQUE_20261026.md) et les [contrats datés](../releases/PROCEDURE_HISTORIQUE_20261026.md) servent uniquement à une reprise ou exception identifiée. Leurs autorisations restent bornées à leurs versions.
