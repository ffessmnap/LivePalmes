# Publication LivePalmes — parcours quotidien

<!-- description: Choisir le parcours TEST/PROD actuel, préparer les prérequis et réutiliser les preuves sans modifier les protections. -->

## Choisir le parcours

Lire les consignes du dernier `main`, préserver le dossier partagé et les autres travaux. Les autorisations d’AGENTS.md s’appliquent : une analyse ne modifie rien ; une demande de développement autorise PR, CI, intégration et TEST du besoin, sous réserve de ses accords sensibles. Une modification de l’outillage seule ne déploie pas l’application. Aucun accord de code ne vaut autorisation de données réelles ou d’envoi.

| Changement | Parcours |
| --- | --- |
| Documentation seule | Contrôle documentaire et CI requise ; aucun déploiement ni preflight. |
| Outillage, tests ou workflows seuls | Contrôles du circuit et CI ; aucun déploiement applicatif. |
| Interface ordinaire | Contrôles ciblés ordinateur/mobile, CI puis TEST commun. Hosting seul exige un backend équivalent et prouvé. |
| Sources serveur existantes déjà couvertes | Accord sensible borné, sélection complète calculée, manifeste standard si éligible, sources puis Hosting et contrôle final. |
| Règles, IAM, configuration, droits, données, mails ou autre besoin sensible nouveau | Découverte précoce en lecture seule, écarts présentés et accord spécifique ; parcours fermé au besoin. |

Une retouche visuelle reste ordinaire tant qu’elle ne modifie pas les règles métier, les accès ou les informations accessibles. Les dépendances réelles déterminent les contrôles, pas seulement le nom du fichier.

## Enchaîner sans reconstruire le circuit

**PR → CI → TEST commun → validation utilisateur → bilan complet et candidat prêt → accord Infra → PROD vérifiée.** L’assistant gère les références techniques. Exécution : [PROCEDURE.md](../releases/PROCEDURE.md).

1. Terminer code, tests ciblés, documentation et contrat nécessaire avant la première CI. Après un échec, corriger sa cause et les conséquences proches dans la PR ouverte. Ne pas développer un nouveau circuit pendant une promotion.
2. Vérifier la sélection automatique. Réutiliser les preuves compatibles ; expliquer les replis complets. Un aperçu PR facultatif ne remplace pas le TEST commun intégré sur `main`.
3. Dès TEST, assembler le périmètre complet et les prérequis du futur candidat PROD. Recueillir le retour utilisateur authentique ; la CI ne le remplace pas. Une modification ultérieure invalide les parcours touchés.
4. Figer le candidat, traiter les blocages et présenter le bilan dans Infra. « Prêt PROD » signifie : périmètre complet couvert, validations et accords sensibles acquis, preuve TEST recevable, preflight et prérequis adaptés réussis. L’accord explicite d’Antoine autorise ce périmètre ; ne pas le redemander s’il est déjà acquis et ses conditions remplies.
5. Publier une fois, après protections GitHub, dérive fraîche et sauvegarde vérifiée. Confirmer le déploiement, les contrôles finaux et les limites de la validation. Une attente de runner ou de permissions n’est pas du temps de publication.

## Réutiliser et reprendre

| Situation | Action |
| --- | --- |
| Run en cours | Attendre ce run ; pas de doublon ni d’annulation injustifiée. |
| Preuve exacte compatible | Réutiliser ; absence, expiration, altération ou incompatibilité impose le contrôle concerné. |
| Nouveau besoin sensible ou prérequis incertain | Découverte ciblée avant de fermer le contrat et d’annoncer « prêt ». Aucun droit ajouté automatiquement. |
| TEST déjà publié et validé | Réutiliser sa preuve pour PROD ; ne pas republier pour aligner les SHA de fonctions et Hosting. |
| Interruption ou réduction de contexte | Relire le point de reprise unique et les opérations distantes avant toute action. Ne pas reprendre un ancien objectif. |

Le point de reprise rassemble objectif, candidat applicatif, outillage, preuves, accords, phase, opérations en cours, blocage et prochaine action. L’assembleur fournit `delivery-state.json` ; l’assistant maintient ce même point après chaque transition et indique les sources. Le registre décrit le résultat, sans devenir une seconde file d’exécution.

## Protections et clôture

Conserver synthèse CI obligatoire, preuves backend, sélection calculée sans réduction manuelle, exclusions, contrôle des identités et droits, dérive fraîche, sauvegarde chiffrée rouverte/comparée, environnement `production` limité à `main` et contrôles finaux. Pas de copie TEST vers PROD. Règles/index, migrations, données sportives, Storage, mails et schedulers conservent leurs accords et parcours propres.

Ne supprimer un contrôle qu’après preuve d’obsolescence ou de redondance ; rendre conditionnel un contrôle dont l’absence de dépendance est démontrée. Un nom historique ne prouve pas son inutilité. La sélection reste automatique et le doute conserve le contrôle. Les journaux doivent nommer la protection actuelle, expliquer exécution/réutilisation/refus et laisser les détails techniques consultables.

Mesurer demande → résultat vérifié, avec code prêt, TEST vérifié, candidat prêt, accord PROD, publication et clôture séparés. Annoter travail, attentes et reprises ; ne jamais additionner des jobs parallèles. Regrouper le suivi documentaire après fusion, sans déploiement pour cette clôture seule.

Les [références historiques](PUBLICATION_HISTORIQUE.md), [contrats et reprises spécifiques](../releases/CONTRATS_ET_REPRISES.md) et le [registre](../releases/EVOLUTIONS.md) restent consultables. Ils n’autorisent aucune nouvelle version, permission ou opération réelle.
