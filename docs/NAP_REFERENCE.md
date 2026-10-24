# Référence actuelle après bascule NAP

<!-- description: Sources de données et fonctionnement actuel du portail/public après bascule NAP ; index des références et documents historiques. -->

## Clubs historiques pendant une récupération — 24 octobre 2026

Règle validée par Antoine pour les prochaines récupérations : avant de rattacher une fiche à son nouveau club, conserver les clubs reconnus de `perfs` et `perfs_relais` et remplacer uniquement leurs références absentes/non reconnues par le club initial de la fiche. Si ce club initial n'est pas reconnu, laisser ces performances inchangées. Aucun temps, point, membre de relais ou autre champ sportif n'est modifié. Les récupérations anciennes ne sont pas corrigées rétroactivement.

La sauvegarde d'audit existante contient les images avant/après et une empreinte du plan ; le reçu final contient le nombre de clubs fixés. Verrous natifs de tables, mises à jour groupées conditionnelles, relecture puis changement de la fiche en dernier. Les reprises acceptent uniquement les images sauvegardées avant/après, sans doubler les changements. Une ancienne préparation sans historique ne peut plus être exécutée ; une ancienne récupération déjà appliquée reste acquittable sans correction rétroactive.

Budget : ouverture/rafraîchissement et aperçu inchangés (deux lectures SQL bornées pour l'aperçu). Confirmation : plafond de 50 appels SQL, plus deux commandes fixes de verrouillage de tables ; cinq lectures indexées par capture des performances, reconnaissance groupée des clubs par clés primaires, aucune requête par ligne. Au maximum 4 000 performances/relais distincts, avec le contrôle antérieur de 2 000 lignes individuelles pour l'éligibilité, et sauvegarde totale de 500 Ko. Une lecture d'audit, une création avant mutation et un reçu final idempotent ; aucune nouvelle collection, aucun index ni migration. Les contrôles de saison et les droits restent en vigueur.

Les quatre index de membres de relais peuvent renvoyer la même ligne : au pire 16 000 témoins retournés par capture, dédupliqués à 4 000 lignes distinctes, et trois captures lors d'une première confirmation réussie. Cette borne ne dépend pas du volume total de NAP ; le dépassement est refusé, sans troncature silencieuse. Après une interruption, deux captures suffisent, le plan initial étant déjà sauvegardé.

## Clubs historiques pendant une fusion — 24 octobre 2026

Règle explicitement validée par Antoine : dans `perfs` et `perfs_relais`, un club reconnu par l'annuaire NAP reste inchangé. Une référence absente ou non reconnue reçoit le club de la fiche qui possédait cette ligne avant la fusion ; les performances déjà sur la cible utilisent son club initial, jamais le nouveau club final choisi. Si la provenance ou le club initial sont inconnus, aucune fusion destructrice n'est effectuée. Temps, points, catégories, compétitions et autres champs restent identiques. Le plan avant/après conserve la politique versionnée et chaque valeur de club modifiée. Les anciens journaux complets restent lisibles sans réinterprétation ; une préparation ancienne encore inachevée sans cette politique exige une reprise spécifique.

Budget fusion : aucune lecture ajoutée à l'ouverture/recherche/rafraîchissement ; une requête groupée par clés primaires de clubs au moment de la préparation, au maximum 4 002 références issues des 4 000 liens déjà bornés et des deux fiches. Écriture intégrée aux mises à jour groupées déjà prévues, aucune requête par performance ; plafond global de 160 appels conservé. Audit existant borné à 500 Ko, ni nouvelle collection ni index. Le sélecteur de club final rappelle la règle.

Reprise Nora, accord spécifique du 24 octobre : outil privé TEST fixé à Nora LOISEL (13787, 11/12/2000), deux fusions terminées, aucun identifiant ou club arbitraire fourni par le client. Lecture des deux pointeurs source, des sauvegardes et des reçus exacts (six documents), plus le journal propre de réparation. Les instantanés les plus anciens fixent la provenance ; les lignes déjà transférées dans un audit ultérieur ne deviennent pas artificiellement des performances du club cible. Seules les lignes inchangées depuis l'audit et dont le club actuel est non reconnu sont réparées ; les lignes ambiguës, nouvelles ou modifiées sont listées sans écriture. Les clubs déjà reconnus restent intacts. Sauvegarde durable avant toute écriture, artefact privé conservé avant l'étape d'application, verrou natif, une mise à jour conditionnelle groupée par table, contrôle du plan indexé, relecture complète et reçu idempotent. Reprise après réponse SQL ou audit perdus sans réécriture des lignes déjà corrigées.

Budget de cette intervention unique, sans parcours interactif : préparation neuf lectures SQL bornées et deux commandes de verrouillage, sept documents d'audit lus et une sauvegarde créée ; application jusqu'à dix-sept appels SQL bornés et deux commandes de verrouillage, une lecture du plan et un reçu écrit. Plafond de 4 000 lignes et 500 Ko, aucune recherche globale dans les audits ou les performances. TEST partage NAP réelle : cette correction explicitement autorisée devient visible aux lecteurs publics, sans déploiement de code PROD. Aucun autre nageur ni recalcul de Records/MPF/DTN.

## Licence depuis la fiche nationale — 24 octobre 2026

La correction nationale permet aussi de changer `nageurs.number`, dans la même écriture conditionnelle que l'identité et le club. Le motif et le numéro initial affiché sont obligatoires ; une fiche ou licence modifiée depuis l'ouverture impose un rechargement. Le contrôle du propriétaire utilise l'index existant `livepalmes_license_number_id`, avec `LIMIT 2`, en excluant la fiche courante et les anciennes sources fusionnées. Le verrou natif `nageurs WRITE, clubs READ, livepalmes_swimmer_merges READ` couvre la lecture, le contrôle et l'écriture, sur une connexion dédiée libérée en fin d'opération. L'audit existant conserve l'image avant/après et le reçu avec ancien/nouveau numéro ; une réponse perdue se reprend sans réécriture. Aucune validation fédérale/saisonnière n'est accordée par cette correction, aucune performance ni inscription historique n'est réécrite. Les modes demande club et signalement gardent leur licence verrouillée.

Budget : zéro lecture supplémentaire à l'ouverture ou au rafraîchissement. Correction avec changement de licence : quatre lectures SQL (fiche, club, propriétaire, vérification), cinq si l'identité change aussi ; une écriture native et deux commandes de verrouillage. Reprise : mêmes lectures sauf contrôle d'identité déjà sauvegardé, zéro écriture native si appliqué. Audit : une lecture du journal, une création préalable et un reçu final ; contrôles d'accès existants inchangés. Coût fixe, sans scan ni lecture par ligne/performance. Les numéros NAP historiques restent acceptés comme dans le contrôle national existant (chaîne bornée à 100 caractères sans caractères de contrôle), sans conversion silencieuse de leur format.

## Affectation nationale du nageur — 24 octobre 2026

Le national peut modifier `nageurs.club` avec un motif, une empreinte native et un journal avant/après. Le service dédié `nap-national-swimmer-correction.js` peut corriger identité et club dans une seule écriture conditionnelle. Les demandes club et les droits restent inchangés. Les courses/inscriptions et les lignes `perfs` ne sont pas réécrites : leurs clubs historiques explicites sont conservés. Les lecteurs qui n'ont pas de club historique continuent leur repli existant sur la fiche actuelle ; aucune valeur historique n'est inventée. Les vues d'engagements dépendant de `nageurs.club` peuvent changer de périmètre après réaffectation.

La fusion accepte un `finalClubId` vérifié par clé primaire et conservé dans le plan d'audit. En cas de clubs différents, ce choix est obligatoire pour une nouvelle opération. Il participe à l'identifiant de l'opération et doit rester identique à la reprise. Le club final peut être celui de la source, de la cible ou un autre club existant ; les anciennes sauvegardes sans ce choix conservent leur interprétation. La fiche conservée reçoit ce club avant la suppression vérifiée de la source, sans changer les clubs des performances transférées.

Budget supplémentaire : aucun chargement au démarrage/à l'ouverture de l'annuaire ; à l'ouverture du sélecteur seulement, un appel mutualisé à l'annuaire existant (une requête NAP, 1 001 lignes au maximum, refus au-delà de 1 000), cache une minute et filtrage client sans nouvel appel par frappe. Une correction nationale utilise quatre requêtes SQL, cinq avec changement d'identité et contrôle de doublon ; reprise déjà appliquée : trois lectures. Audit existant : un document lu, une sauvegarde créée et un reçu final écrit. Une fusion ajoute une lecture de club par clé primaire sous les verrous existants ; plafond global inchangé de 160 appels, 4 000 liens et 100 saisons. Aucune reconstruction, lecture par performance, nouvelle collection, migration ou index.

## Fusion définitive des nageurs

La fusion nationale transfère les références natives prévues par `nap-swimmer-merge-plan.js` et toutes les validations de licence par saison, vérifie leurs valeurs sous verrou, puis supprime définitivement la fiche source de `nageurs`. Une collision de validations sur une même saison bloque l'opération avant écriture, sans arbitrage automatique. Les performances conservent leurs identifiants, temps et points. Les versions officielles Records/MPF et les sauvegardes historiques ne sont pas réécrites ; leurs anciens liens restent résolus par la correspondance technique vers la fiche conservée.

`livepalmes_swimmer_merges` conserve seulement la correspondance d'identifiants et sa provenance, pas une seconde fiche nageur. Les lecteurs publics résolvent celle-ci même après suppression de la source. Le journal technique Firestore avant/après est conservé ; après interruption, la même demande peut vérifier les transferts puis reprendre, y compris si la suppression a déjà abouti. Les anciennes fusions terminées peuvent être finalisées explicitement depuis leur fiche inactive. Un ancien journal de préparation non compatible reste bloqué pour reprise spécifique.

Budget : ouverture/rafraîchissement de l'écran inchangés, annuaire paginé à 101 lignes ; recherche explicite inchangée, trois requêtes au maximum. Fusion : plafond existant de 160 appels SQL exécutés par le service (plus les trois lectures fixes de structure), 4 000 liens et 100 saisons, sauvegarde de 500 Ko au maximum ; deux relectures fixes supplémentaires pour contrôler l'absence de liens et la suppression. Aucun scan global, lecture par performance ou reconstruction publique. Le lecteur public dédié ajoute une résolution indexée fixe : trois requêtes bornées par fiche, deux par recherche numérique ; recherche par nom et lecteurs partagés inchangés. Aucun changement de schéma/index, de droits ou de collection.

## Périmètre et état — 13 octobre 2026

Le portail et les consultations sportives publiques utilisent directement MySQL NAP via les Cloud Functions. Le navigateur ne possède ni mot de passe MySQL ni accès SQL direct. `assets/livepalmes-environment.js` et `functions/livepalmes-environment.js` sélectionnent `sportingDataSource: "nap"` pour TEST et PROD. Aucun export sportif intermédiaire ni synchronisation entre deux bases métier n'est nécessaire à la lecture.

**TEST utilise la même base NAP habituelle que PROD et IntraNAP.** Un essai d'écriture sur TEST est une opération réelle. Les changements de données et de structure exigent une autorisation spécifique ; aucune recette ne doit fabriquer de résultats, engagements ou personnes sans cet accord. IntraNAP n'a pas été modifié et son arrêt n'est pas réalisé par ce projet.

## RF/MPF dans NAP — 12 octobre

La reprise à l'identique dans `livepalmes_records_versions` et `livepalmes_records_current` est publiée sur TEST et PROD ; les preuves figurent dans `releases/EVOLUTIONS.md`. Les lectures publiques et l'administration utilisent NAP, avec les droits Records existants. Le fichier statique RF/MPF et les anciens chargements ont été retirés du dépôt ; aucun repli sportif Firestore ou Storage n'est utilisé en mode NAP. Les anciennes versions de code restent dans Git. Les sauvegardes et le nettoyage distinct des exports Storage sont décrits dans [le circuit public](pipeline-performances-publiques.md). Aucune correction sportive n'est impliquée par ce retrait.

## Où sont les données ?

| Données | Source actuelle | Référence de code |
| --- | --- | --- |
| Clubs, nageurs et licences | NAP : `clubs`, `nageurs`, licence `nageurs.number`, activité `nageurs.actif` | `nap-club-directory.js`, `nap-portal-swimmers.js`, `nap-license-state.js`, `nap-swimmer-activity.js` |
| Compétitions, calendrier, courses et engagements | Tables natives NAP et compléments `livepalmes_*` pour les options supplémentaires | `nap-portal-competitions.js`, `nap-calendar-event-details.js`, `nap-portal-entries.js`, `nap-portal-workspaces.js` |
| Officiels, chefs d'équipe, relais | NAP, avec compléments de rôles, composition et historique | `nap-club-people.js`, `nap-team-leader-change.js`, `nap-official-entry-change.js`, `nap-relay-entry-change.js` |
| Résultats, TOP, recherche et fiches nageurs | NAP : notamment `perfs`, `perfs_relais`, compétitions associées et compléments de visibilité/statut | `nap-direct-tops.js`, `nap-direct-swimmer.js`, `nap-direct-search.js`, `nap-direct-competition-results.js` |
| DTN : paramètres et résultats calculés | Compléments NAP, calcul explicite à partir des performances NAP | `nap-dtn-season-service.js`, `nap-dtn-calculation.js`, `nap-dtn-source.js` |
| Documents/protocoles | Fichiers hébergés chez Google ; titres/liens et rattachements NAP | `nap-competition-documents.js` |
| Comptes, capacités, demandes d'accès, réglages, audits et jobs techniques | Firebase Auth / Firestore ; les recherches et créations de clubs des demandes d'accès lisent/écrivent NAP | `functions/index.js`, `nap-club-access-request.js` |
| LivePalmes Direct | Circuit Firebase distinct, consoles, séries, résultats en direct et archives conservés | `architecture-livepalmes.md`, `LIVEPALMES_DIRECT.md` |
| Records et MPF officiels | NAP : `livepalmes_records_versions`, `livepalmes_records_current` ; lecture publique sans repli sur les copies historiques | `nap-records-store.js`, `performances/public/store.js`, `performances/public/admin-records.js` |

Les noms de modules du tableau sont relatifs à `functions/`, sauf chemin explicite. Firestore conserve des anciennes données Records/MPF et des traces techniques ; il n’est plus la source officielle RF/MPF. La présence d'un ancien module ou d'une déclaration dans le dépôt ne prouve pas qu'une fonction est déployée ou utilisée.

## Commentaires de compétition

Le champ natif `competitions.comments` est la source commune INTRANAP, portail et calendrier public. Les futures modifications LivePalmes ciblent ce champ ; `competitions.description` reste conservé et visible séparément lorsqu’il contient un ancien texte distinct. Aucun transfert, effacement ou fusion automatique. Les écritures restent ciblées sur une compétition, avec sauvegarde et comparaison de la valeur native avant enregistrement.

## Règles conservées dans le portail

- Une compétition et ses engagements sont partagés avec IntraNAP par les tables NAP. Programme détaillé, tarifs, restrictions et dérogations propres à LivePalmes restent dans les compléments ; ne pas reproduire ces fonctions dans IntraNAP. Les restrictions supplémentaires de LivePalmes ne sont pas garanties par l'ancienne interface.
- Le régional agit dans son périmètre jusqu'au dernier jour de l'événement ; dès le lendemain, les modifications sont réservées au national, sauf documents encore accessibles au régional. Les mêmes règles s'appliquent aux formations, stages et réunions. Suppression d'une compétition uniquement sans engagements ni résultats, avertissement et confirmation pour ses documents/programme.
- Les temps suivent les trois modes NAP : saisie possible par le club ; aucune saisie avec meilleur temps admissible obligatoire ; aucune saisie avec choix d'un temps connu et valeur native `599999` si absent. Une période paramétrée borne les performances admissibles ; sans période, toute l'histoire admissible est considérée. Une grille de qualification active impose le calcul automatique, même en mode de saisie possible. Voir `nap-entry-time-policy.js`, `nap-entry-time-rules.js` et `nap-entry-qualification-policy.js`.
- Les temps compacts sont interprétés depuis la droite : centièmes, secondes, minutes. `14200` vaut 1:42.00 ; ne pas normaliser les données natives ni remplacer le tri numérique par un tri lexical. Le format historique des temps de relais est traité séparément (`nap-relay-resolution.js`).
- Les limites de naissance incluent les deux dates. Une condition de participation préalable requiert un résultat NAP dans au moins une compétition de la liste (`nap-entry-birth-policy.js`, `nap-entry-participation-rules.js`).
- Les 25 m Surface et Apnée sont disponibles aux engagements, sans ajout aux TOP/fiches publiques. En eau libre, une course sans suffixe est Surface ; le récapitulatif club présente les inscriptions sans temps. Validation WinPalme du TXT eau libre reportée par Antoine, à ne pas annoncer comme acquise.

## Licences

`nageurs.number` est une chaîne : lettres et tirets sont conservés ; NULL ou vide signifie non renseigné. Posséder un numéro ne valide jamais la saison. `livepalmes_swimmer_license_seasons` conserve la validation par nageur/saison/numéro ; un numéro changé n'hérite pas automatiquement d'une validation incompatible.

La création d'un nageur exige une licence ; un engagement peut être autorisé sans numéro selon le fonctionnement validé. L'administration nationale peut corriger le numéro. Le contrôle CSV propose tous les nageurs sélectionnés ou seulement ceux dont la saison n'est pas validée. La validation partielle enregistre les fiches admissibles, renvoie les fiches bloquées et ne les affiche pas comme validées (`nap-license-control.js`, `assets/livepalmes-license-administration.js`). Les doublons sont signalés ; ne pas fusionner automatiquement sur un numéro.

## Résultats et DTN

La première mise en production couvre l'import TXT WinPalme. Avant remplacement : aperçu des différences, lignes retirées signalées, confirmation et vérification de l'état courant ; sauvegarde durable avant écriture. Les administrateurs habilités à importer peuvent confirmer ce remplacement. Les points viennent de WinPalme. Lignes sans temps ni statut : signalement et exclusion explicite ; forfaits/abandons/disqualifications conservés sans temps sportif valable. Voir [Gestion des performances](gestion-base-performances.md).

La date et le lieu sont corrigés sur la compétition entière ; le temps et le club sur le résultat. Masquage et suppression définitive sont distincts, suppression définitive réservée au national. La consultation DTN affiche le dernier calcul réussi avec sa date tant que les paramètres DTN sont compatibles. Les modifications générales de clubs, compétitions, nageurs et performances NAP ne masquent pas ces résultats et ne déclenchent aucun avertissement ni recalcul. Un changement de minima ou de règles conserve le contrôle de cohérence avec la configuration du calcul. Les trois vues sont remplacées ensemble uniquement après un recalcul volontaire réussi ; « Actualiser l'affichage » ne recalcule pas. « Recalculer » est une écriture métier explicite, pas un test de lecture.

## Mails et fichiers

Les notifications sont gérées par LivePalmes, avec les destinataires issus des comptes Firebase ; ne pas utiliser la messagerie IntraNAP comme moteur LivePalmes. Le réglage national `engagementConfigurations/notificationDelivery` contrôle les mails automatiques. Absent ou `enabled != true` : coupure. Les dates `enabledSince` et `discardThrough` empêchent le rattrapage des notifications antérieures à la réactivation (`engagement-mail-control.js`, `nap-mail-delivery.js`). Ne pas confondre cette coupure avec la totalité des messages de compte/sécurité ou des envois manuels.

Au contrôle du 12 octobre, mails automatiques désactivés dans TEST et PROD. C'est un constat daté, à relire avant une opération ; aucune activation implicite. Si les notifications TEST sont activées ultérieurement, le contrôle les redirige uniquement vers `livepalmes@nap-ffessm.fr`.

## Publication, sauvegarde et retour arrière

Appliquer [la procédure de livraison](releases/PROCEDURE.md). PR courte depuis main, contrôles techniques ; pas de déploiement pour une PR exclusivement documentaire. Réutiliser les preuves TEST exactes compatibles et la sélection calculée par dépendances, jamais une liste réduite à la main. Accord PROD et bilan immuable obligatoires ; relecture des états réels, sauvegarde du code chiffrée puis rouverte/vérifiée avant modification, Hosting en dernier, contrôle final et arrêt en cas d'écart.

Une sauvegarde de publication du code n'est **pas une sauvegarde de la base NAP**, et un rollback du code n'annule pas les écritures métier déjà effectuées. Les tables natives MyISAM ne permettent pas de promettre une transaction générale : les circuits d'écriture utilisent sauvegardes ciblées, comparaisons et reprise vérifiée. Ne lancer aucune restauration NAP dans un retour arrière applicatif sans accord distinct.

Les 41 anciennes fonctions puis trois sans appel ont été retirées après sauvegardes vérifiées. Leurs déclarations sont conservées pour l'historique/retour arrière et exclues par `NAP_RETIRED_FUNCTIONS` / `NAP_UNUSED_FUNCTIONS` dans `tools/firebase-test-backend-lots.js`. Inventaire daté après contrôle : 111 PROD, 113 TEST ; ce n'est pas un nombre à imposer aux évolutions futures.

## Documents de référence et archives

- Architecture actuelle : [ARCHITECTURE.md](ARCHITECTURE.md), ce document et [intégration des engagements](module-engagements-integration-portail.md).
- Exploitation : [procédure](releases/PROCEDURE.md), [tests manuels](TESTS_MANUELS.md), [optimisation NAP](OPTIMISATION_NAP.md), [évolutions et preuves](releases/EVOLUTIONS.md).
- Historiques avant bascule : `base-livepalmes-unique.md`, `base-performances-consolidee.md`, `fonctionnement-base-donnees-livepalmes.md`, `reprise-performances-historiques-manquantes.md`, `NAP_TEST.md`, `NAP_PUBLIC_MIGRATION.md`, `SYNCHRONISATION_DONNEES_PROD_VERS_TEST.md`, `MISE_A_NIVEAU_FIREBASE_TEST.md`. Conservés avec avertissement ; leurs commandes de migration/copie/reconstruction ne constituent plus une procédure actuelle.
- Documents mixtes : `AUDIT_PERFORMANCE_COUT_PORTAIL.md` garde des informations sur les comptes Firebase ; ses recommandations sportives Firestore sont historiques. `DEPLOIEMENT_BACKEND_TEST.md` décrit des lots antérieurs : la sélection versionnée et la procédure actuelle font foi. `ENGAGEMENT_QUALIFICATIONS.md` et `module-engagements.md` gardent des règles/conceptions utiles, mais leurs stockages et étapes de mise en service antérieurs sont signalés comme dépassés.

Cette consolidation a été vérifiée contre le code de main `807dce65e5e9b65d42b4e1bf54488c7d75b35793`. Elle ne déclenche ni publication, accès à NAP, migration, reconstruction, suppression ou envoi.
