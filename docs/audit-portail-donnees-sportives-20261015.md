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

Avant correctif, les trois erreurs de chargeur ont été reproduites dans la session Chrome TEST authentifiée. Les huit ressources secondaires listées dans l'inventaire répondent HTTP 200 sur TEST.

Tests ciblés et syntaxe réussis. Vérification globale locale arrêtée au test de publication qui nécessite `bash`, absent sur le poste Windows ; suites complètes réussies ensuite en CI Linux et publication commune. Smoke navigateur général : accueil et consoles initiaux réussis, arrêt sur « Speaker : clic record KO », parcours Direct hors périmètre du correctif ; aucune modification Direct effectuée.

## Publication et recette TEST commune

- [PR #341](https://github.com/ffessmnap/LivePalmes/pull/341), commit intégré af621a4b6d6fdfe8381276c8024e2c268798dbf8 ; [CI finale](https://github.com/ffessmnap/LivePalmes/actions/runs/38786076481) réussie.
- [Publication commune 38787521124](https://github.com/ffessmnap/LivePalmes/actions/runs/38787521124) réussie pour ee96f412a8b8ed2525438b69eb8e49edbaca3633, version Hosting f9ea6e2a53bcf11f, release 1792089760598000. Preuve exacte dans l'artefact test-proof. Ce main inclut aussi accueil #340 et routage #342 ; notre correctif n'a aucun changement backend. Leurs recettes/validations restent suivies séparément.

| Parcours | Ordinateur Chrome authentifié | Mobile 390 × 844 |
| --- | --- | --- |
| Records/MPF | Table NAP affichée, éditeur ouvert sur 50 SF femmes, aucune erreur version.js | Table adaptée, éditeur et champs accessibles, aucune erreur de chargement |
| Suggestions Records | Maïwenn : six suggestions dont Maïwenn HAMON ; nom initial rétabli sans sauvegarde | Mêmes six suggestions ; champ visible et page sans débordement horizontal |
| Import | Historique borné chargé, fenêtre TXT/Excel et encodage visibles ; aucun fichier choisi | Navigation et fenêtre utilisables, fermeture fonctionnelle |
| Correction | Anthelme ROBISSON retrouvé, première page de résultats affichée, première ligne et formulaire consultés | Formulaire conservé, champs et actions accessibles sans les déclencher |

Console de l'onglet sans erreur/avertissement durant cette recette. Largeur document 375 px pour viewport 390 px ; champs correction 289 px, éditeur Records 339 px. Dimensions réinitialisées après test. Captures records-pc.jpg, records-mobile.jpg, import-mobile.jpg et correction-mobile.jpg dans C:/Users/ITIFP/Documents/Codex/livepalmes-sporting-20261015.

Zéro écriture métier : aucun clic d'enregistrement, brouillon, import/analyse de fichier, correction, masquage, suppression, publication ou recalcul. Aucun test réel de ces opérations ni comparaison exhaustive des référentiels sportifs ; erreurs réseau et réponses dépassées couvertes hors ligne. La recherche publique ne nécessite pas de droit d'import supplémentaire. Aucune ressource historique restaurée, aucune PROD modifiée. Validation utilisateur de la version publiée attendue.
