# Dépendances des données sportives du portail — 15 octobre 2026

<!-- description: Correctif des chargeurs NAP et suggestions Records/MPF, inventaire ciblé, budget de lecture et recette TEST sans écriture métier. -->

## Périmètre et correctifs

Autorisation Antoine : correctif client jusqu'au TEST commun, aucune PROD, migration, écriture NAP/Firestore/Storage, import réel, correction ou publication sportive. Aucun changement serveur, droits, PIN, règles, index, mails ou scheduler.

| Zone auditée | Dépendance et conclusion |
| --- | --- |
| Chargeur Records/MPF | Retrait du prérequis `performance-public/version.js` absent. Le store actuel impose déjà NAP. Placeholders, référentiel clubs et store présents conservés. |
| Chargeur import/correction partagé | Résumé `intranap-summary.js` et version historique exclus en mode NAP ; compatibilité du chemin historique conservée. |
| Suggestions de l'éditeur Records/MPF | Recherche via `napReaderUrl?action=search&q=…`, service public existant ; aucun shard historique en mode NAP. Identifiants, sexe, naissance, club et filtrage individuel/relais conservés. |
| Import/correction, dépendances secondaires | `ensureCorrectionReference`, overlay, recherche et fiche nageur court-circuitent déjà les fichiers historiques en mode NAP. Aucun autre défaut statique actif constaté. XLSX reste chargé à la demande et présent. |
| Records, store et placeholders | Store NAP public/authentifié existant ; placeholders sans accès réseau. Aucun repli sportif statique ajouté. |
| DTN réellement chargé | `assets/livepalmes-dtn-seasons.js` ; dépendances XLSX et `livepalmes-dtn-import.js` présentes, aucun export sportif retiré requis. Aucun recalcul exécuté. |
| Recherche administration engagements | Les deux appels connus de shards sont déjà exclus en mode NAP ; inchangés. |

Cet inventaire cible les modules sportifs chargés par le portail et leurs accès secondaires ; ce n'est pas une recette exhaustive de tous les parcours. Les suggestions initiales étaient inaccessibles derrière l'erreur du chargeur : leur panne n'est pas déclarée reproduite avant déblocage.

## Budget conçu avant implémentation

Le lecteur existant `searchDirectSwimmers` exécute un SELECT avec deux plages d'index et jointure groupée : au plus 21 candidats par plage, 21 lignes finales, 20 suggestions renvoyées. Recherche numérique : identifiant exact. Ces limites bornent les candidats/résultats, pas le nombre réel de lignes examinées par MySQL ; aucun nouvel EXPLAIN exécuté.

| Situation | Appels et coût ajouté |
| --- | --- |
| Ouverture module, nom vide | 0 recherche, 0 écriture. Les lectures Records existantes restent inchangées. |
| Ouverture éditeur avec nom de 2 à 80 caractères | Au plus 1 HTTP, 1 SELECT ; aucun appel par suggestion. |
| Saisie | Temporisation 250 ms, 1 HTTP/SELECT après pause ; demandes identiques simultanées mutualisées. |
| Retour/rafraîchissement | Lecture fraîche si recherche nécessaire ; aucune conservation après achèvement. |
| Pire cas réaliste | Une recherche par pause de saisie ; plafond fixe de résultats, aucune reconstruction ni lecture par ligne. |
| Erreur ou réponse dépassée | Suggestions et références invalidées ; message d'indisponibilité, nouvelle tentative possible, aucun repli historique. |

## Vérification

`tests/nap-portal-sporting-dependencies-tests.js` exécute les chargeurs en VM et refuse un chemin manquant ou un export historique en mode NAP. Il vérifie aussi les suggestions bornées, sexe, identité, relais mixtes, mutualisation, effacement pendant requête et erreur réseau. Ajout à la suite globale.

Recette TEST commune ordinateur/mobile, références exactes PR/commit/run et validation utilisateur : à compléter après publication. Toute recette reste en lecture seule ; aucun clic d'enregistrement, import, correction, publication ni recalcul.
