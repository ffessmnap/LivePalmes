# Gestion des performances

<!-- description: Imports TXT WinPalme, corrections et visibilité des résultats directement dans NAP après bascule. -->

## Source et parcours

Les performances sont lues et écrites dans NAP via les fonctions authentifiées, sans ancienne base sportive Firestore ni republication de TOP statiques. TEST utilise la vraie base NAP : les essais d'écriture exigent un accord spécifique. Voir [la référence NAP](NAP_REFERENCE.md) et [les budgets](OPTIMISATION_NAP.md).

## Import TXT WinPalme

Le parcours de première mise en production est le TXT WinPalme ; l'import Excel international n'est pas inclus dans cette validation. Le fichier est analysé, les nageurs raccordés aux identifiants NAP et les anomalies présentées avant confirmation. Les lignes sans statut ni temps ne sont pas transformées en performances : elles doivent être signalées puis écartées explicitement. Forfaits, abandons et disqualifications restent consultables avec leur statut, mais sans temps admissible pour TOP, engagements ou DTN. Les points des nouveaux résultats viennent du fichier WinPalme.

Si la compétition possède déjà des résultats, l'aperçu compare l'existant et le fichier, signale ajouts, modifications et retraits. Un administrateur habilité à importer peut confirmer le remplacement ; aucun ajout de doublons implicite. L'état courant est revérifié avant écriture ; un changement concurrent bloque le plan. Les lignes inchangées conservent leurs valeurs. Sauvegarde durable et reprise vérifiée : ne pas promettre un rollback transactionnel global des tables natives MyISAM.

Sources : `functions/nap-winpalme-results.js`, `nap-import-preview.js`, `nap-import-diff.js`, `nap-import-operation-plan.js`, `nap-import-write.js`, `nap-import-history.js`, `nap-import-status-results.js`.

## Corrections, masquage et suppression

Corriger le temps et le club depuis la fiche résultat ; corriger la date et le lieu depuis la compétition, pour tous ses résultats. Le masquage utilise le complément NAP de visibilité et les lecteurs sportifs l'excluent. La suppression définitive est une action nationale distincte avec protections, sauvegarde et confirmation. Ne pas employer les anciens jobs Firestore de publication/reconstruction.

Sources : `functions/nap-performance-administration.js`, `nap-performance-change-plan.js`, `nap-performance-write.js`, `nap-performance-visibility.js`. Le temps compact `14200` est interprété comme 1:42.00 sans changer la valeur native.

## Consultation et Records/MPF

TOP, recherche, fiches nageurs et résultats de compétition utilisent les lecteurs NAP bornés. Les Records et MPF officiels conservent leur circuit d'administration Firebase et de publication statique distinct ; ils ne sont pas recalculés depuis NAP. Voir [le circuit public](pipeline-performances-publiques.md).

## Vérification

Commencer par les tests hors ligne existants et les lectures. Toute recette de remplacement/correction/suppression réelle demande un périmètre autorisé ; sauvegarder et comparer avant/après. Une publication de code ne constitue pas un import métier. Appliquer [TESTS_MANUELS.md](TESTS_MANUELS.md) et [la procédure de livraison](releases/PROCEDURE.md).
