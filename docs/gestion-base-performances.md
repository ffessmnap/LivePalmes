# Gestion des performances

<!-- description: Imports TXT WinPalme, corrections et visibilité des résultats directement dans NAP après bascule. -->

## Source et parcours

Les performances sont lues et écrites dans NAP via les fonctions authentifiées, sans ancienne base sportive Firestore ni republication de TOP statiques. TEST utilise la vraie base NAP : les essais d'écriture exigent un accord spécifique. Voir [la référence NAP](NAP_REFERENCE.md) et [les budgets](OPTIMISATION_NAP.md).

## Import TXT WinPalme

### Dépôt ZIP en aperçu uniquement — 23 octobre 2026

Le portail accepte les ZIP WinPalme (30 Mo maximum), sans les envoyer au stockage. Il décompresse localement uniquement le TXT de `ExportTxt` (5 Mo maximum) et le dernier `ProtocoleComplet` correspondant dans `Protocoles` (10 Mo maximum), sélectionné par l’horodatage du nom. Chemins, doublons, tailles annoncées/réelles et CRC sont contrôlés ; les archives ambiguës ou les membres sélectionnés chiffrés sont refusés. Le PDF est consultable par une URL locale temporaire, libérée à la fermeture ou au changement de fichier.

Seul le TXT est envoyé à `previewCompetitionImport`, avec `sourceType=winpalme-zip-preview`. Ce parcours exige la capacité d’import et l’autorité nationale existantes. Il reprend le choix de compétition, les rattachements explicites et l’aperçu paginé ; aucune nouvelle capacité ni collection. Le club représenté dans le fichier est rapproché séparément de l’identité du nageur : automatisme seulement si l’abréviation est unique et le numéro fédéral source sur huit chiffres identique à NAP, sinon choix national explicite. Le club actuel du nageur n’est pas utilisé pour ce choix.

Les décisions restent dans la session ; le rapport JSON téléchargeable conserve les empreintes TXT/PDF, la sélection, le dernier aperçu et les choix. Ce rapport privé n’est ni une publication ni une validation persistée et n’est pas réimportable automatiquement. Modifier un choix invalide son état « contrôlé » jusqu’au nouvel aperçu. Aucun résultat ou PDF n’est enregistré : refus dans le client, la callable d’écriture et le writer NAP. Les imports TXT antérieurs conservent leur parcours existant.

Budget : zéro requête distante pour lire le ZIP/PDF ; une requête NAP par date pour proposer au maximum 21 compétitions ; cinq requêtes groupées pour un aperçu choisi, six avec identifiants explicites (compétition 1, candidats 10 001 maximum avec refus au-delà de 10 000, identifiants 7 001 maximum, référentiel clubs 1 001 maximum avec refus au-delà de 1 000, performances 5 001 et relais 1 001 avec refus au-delà de leurs plafonds). Navigation locale et téléchargement du rapport : zéro requête. Actualiser relit le même lot borné ; aucune reconstruction ni lecture par résultat. L’historique du module conserve son chargement existant.

Limites de cette première préparation : correspondances des codes eau libre `LD…` et encodage natif des temps avec heures restent bloquants, à vérifier métier avant activation de l’écriture. Les temps avec heures sont distingués des temps invalides et affichés sans altération. Les compositions de relais absentes exigent un complément ; aucune composition ou règle sportive n’est inventée. La reprise entre administrateurs et la publication coordonnée du PDF/résultats restent à préparer après recette de cet aperçu.

Le parcours de première mise en production est le TXT WinPalme ; l'import Excel international n'est pas inclus dans cette validation. Le fichier est analysé, les nageurs raccordés aux identifiants NAP et les anomalies présentées avant confirmation. Les lignes sans statut ni temps ne sont pas transformées en performances : elles doivent être signalées puis écartées explicitement. Forfaits, abandons et disqualifications restent consultables avec leur statut, mais sans temps admissible pour TOP, engagements ou DTN. Les points des nouveaux résultats viennent du fichier WinPalme.

Si la compétition possède déjà des résultats, l'aperçu compare l'existant et le fichier, signale ajouts, modifications et retraits. Un administrateur habilité à importer peut confirmer le remplacement ; aucun ajout de doublons implicite. L'état courant est revérifié avant écriture ; un changement concurrent bloque le plan. Les lignes inchangées conservent leurs valeurs. Sauvegarde durable et reprise vérifiée : ne pas promettre un rollback transactionnel global des tables natives MyISAM.

Sources : `functions/nap-winpalme-results.js`, `nap-import-preview.js`, `nap-import-diff.js`, `nap-import-operation-plan.js`, `nap-import-write.js`, `nap-import-history.js`, `nap-import-status-results.js`.

## Corrections, masquage et suppression

Corriger le temps et le club depuis la fiche résultat ; corriger la date et le lieu depuis la compétition, pour tous ses résultats. Le masquage utilise le complément NAP de visibilité et les lecteurs sportifs l'excluent. La suppression définitive est une action nationale distincte avec protections, sauvegarde et confirmation. Ne pas employer les anciens jobs Firestore de publication/reconstruction.

Sources : `functions/nap-performance-administration.js`, `nap-performance-change-plan.js`, `nap-performance-write.js`, `nap-performance-visibility.js`. Le temps compact `14200` est interprété comme 1:42.00 sans changer la valeur native.

## Consultation et Records/MPF

TOP, recherche, fiches nageurs et résultats de compétition utilisent les lecteurs NAP bornés. Les Records et MPF officiels utilisent leurs versions dédiées dans NAP (`livepalmes_records_versions`, `livepalmes_records_current`), consultées et administrées via les fonctions serveur existantes. Ils ne sont pas recalculés automatiquement depuis les performances ou les TOP. Aucun fichier statique ni copie sportive Firestore ne sert de repli en cas de panne NAP. Voir [le circuit public](pipeline-performances-publiques.md).

## Vérification

Commencer par les tests hors ligne existants et les lectures. Toute recette de remplacement/correction/suppression réelle demande un périmètre autorisé ; sauvegarder et comparer avant/après. Une publication de code ne constitue pas un import métier. Appliquer [TESTS_MANUELS.md](TESTS_MANUELS.md) et [la procédure de livraison](releases/PROCEDURE.md).
