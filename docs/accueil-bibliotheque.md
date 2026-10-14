# Accueil et bibliothèque documentaire

<!-- description: Contrats techniques, budgets de lecture, migration et recette de l’accueil public et de la sélection documentaire nationale préparés le 13 octobre 2026. -->

## Périmètre

L’accueil permanent conserve les accès aux performances, présente les rendez-vous et jusqu’à six documents généraux publics choisis par les nationaux. La bibliothèque expose toutes les références générales `documents.public='Y' AND documents.competition=0`, sans filtrage d’ancienneté. Types et rubriques restent natifs ; classement absent = Autres documents. Les documents d’événements restent dans leurs fiches ; les contrôles privés des nageurs ne sont jamais interrogés. Aucun fichier original n’est copié ou déplacé.

Les routes publiques restent à la racine : `index.html`, `public.html`, `bibliotheque.html`. Les modules dédiés sont dans `assets/public/`. L’administration Documents utilise un dialogue propre chargé sans lecture au démarrage du portail ; son ouverture est réservée aux capacités nationales existantes, avec vérification effective côté serveur.

## Sources et recherches

`readNapPublicSwimmer` reçoit les actions `documents-catalogue`, `documents-featured`, `home-events`. Réponses sur liste blanche, sans uploader, acteur, chemin de stockage, coordonnées privées ou ligne SQL brute.

La recherche documentaire travaille sur une fenêtre courante indexée de NAP, et non sur une copie statique des titres. Le filtre texte et les facettes s’appliquent à cette fenêtre, puis un curseur strictement décroissant permet de poursuivre. Une fenêtre vide ne lance pas de remplissage automatique ; l’interface propose « Poursuivre la recherche ». Les nouvelles références sont immédiatement visibles, les retraits de public immédiatement exclus de chaque nouvelle réponse. Le petit fichier serveur préparé par `tools/build-nap-document-index.js` ne contient que les étiquettes de facettes. Les références sans URL restent visibles comme texte, sans lien inventé.

La date affichée vient de `documents.date`. Un timestamp civil est normalisé en Europe/Paris. Une heure ambiguë au changement d’heure conserve sa date affichable mais ne donne pas un instant de publication inventé. Nouveau exige un instant valide, non futur, âgé de strictement moins de 30 × 24 heures. La sélection ne modifie jamais la date native.

## Budgets par parcours

| Parcours | SQL métier par ouverture/action | Firestore |
|---|---|---|
| Bibliothèque initiale ou page sans filtre | 1 requête, ≤26 candidats, deux jointures PK par candidat ; ≤25 fiches rendues | 0 |
| Recherche/facette ou sa continuation | 1 requête, ≤101 candidats, deux jointures PK ; ≤25 fiches rendues ; aucun appel par ligne | 0 |
| Documents utiles publics | 1 requête, ≤7 rangs de contrôle, ≤6 documents plus deux taxonomies en PK ; erreur si structure/rangs invalides | 0 |
| Rendez-vous publics | 0 SQL sur cache cinq minutes ; sinon deux fenêtres indexées plafonnées à 501 candidats chacune avant jointures, demandes simultanées mutualisées ; 0 Storage | 0 |
| Ouverture de l’éditeur national | 1 lecture sélection ≤7 + 1 page de catalogue bornée | ≤1 lecture de profil existant |
| Ajouter/retirer/ordonner/aperçu/annuler | 0 lecture/écriture distante ; six éléments au maximum | 0 |
| Enregistrer | ≤18 appels SQL préparés, plus début/fin de transaction ; ≤32 lignes métier lues avant jointures, ≤42 jointures PK, ≤20 lignes de métadonnées de schéma ; ≤12 lignes complémentaires touchées | ≤2 lectures de profil + 1 lecture de journal, 2 écritures de journal existant |

Rafraîchir reprend les mêmes bornes ; aucun listener ni reconstruction massive implicite. Les index réels et compteurs de session ont été vérifiés en lecture seule : parcours de `(competition,public,id)`, jointures `eq_ref` sur PRIMARY, aucun `Handler_read_rnd_next`. Les 263 références générales publiques présentes le 13 octobre ont été parcourues une fois sur 11 pages, sans doublon ; quatre n’ont pas de lien d’origine. Ces observations ne constituent pas une garantie de latence réseau future.

## Sélection et migration

Le complément existant reçoit `featured_rank TINYINT UNSIGNED NULL`, avec index unique de rang. NULL = non sélectionné ; le serveur impose exactement 1…N, N ≤6. Les cinq champs de métadonnées fichier deviennent nullables pour les anciennes références sans complément. Une nouvelle ligne éditoriale ne reçoit aucun hébergement, MIME, taille, fichier ou uploader historique inventé. Les dates/acteurs du complément tracent sa création technique seulement.

Enregistrement : identité nationale serveur, empreinte de toute la sélection, verrou nommé global, transaction InnoDB, vérification groupée des originaux publics/généraux et de leurs liens avant/après mutation, journal `auditLogs` existant avant écriture, vérification puis commit. Les anciens rangs passent à NULL avant permutation. Un retrait conserve l’original et son complément. Les upserts documentaires ordinaires excluent toujours le rang de leur liste de champs.

`documents` est MyISAM : le verrou éditorial n’empêche pas toutes les écritures fédérales externes. Les lectures publiques filtrent donc les originaux courants à chaque réponse ; aucune atomicité inter-moteurs n’est prétendue. La sauvegarde NAP est distincte des sauvegardes Firebase/code. Le contrôle de migration dans `tools/nap-featured-documents-migration.js` exige les preuves de sauvegarde restaurée, refuse toute dérive avant DDL et utilise un court verrou natif du complément. Le DDL exact est `tools/nap-featured-documents-migration.sql`, sans DML ni sélection initiale.

Le préalable C0 de PR #291 doit être réellement actif sur TEST et PROD avant migration commune. L’ancienne version refuse une colonne ou un index supplémentaire. La publication PROD de C0 se décide dans Infra ; elle n’autorise pas les nouvelles interfaces en PROD. Le retour privilégié conserve le schéma et revient au code C0. Un retour SQL complet exige une réconciliation des compléments créés depuis, sans suppression globale des lignes NULL et sans remplissage fictif des métadonnées.

## Rendez-vous : lecture directe et cache TEST

L’accueil TEST utilise `nap-home-direct.js` : NAP est lu à la demande, puis la réponse est partagée en mémoire cinq minutes par instance. Il ne lit ni ne publie de fichier Storage. Aucun travail périodique n’est nécessaire. Les regroupements existants restent calculés à la date de Paris : événements en cours, prochaine date majeure avec ses ex aequo, puis cinq futurs hors majeurs ; annulations exclues de cette synthèse, liens et classifications existants conservés.

Le précédent mécanisme de fichier et job horaire est décrit historiquement dans EVOLUTIONS. Le fichier est conservé uniquement pour un retour arrière explicite ; il n’est pas un secours silencieux du lecteur direct. Après validation utilisateur du lecteur direct, Antoine demande la suppression du job horaire : suppression et absence vérifiées par `38536577623`, le 14 octobre. Ne pas recréer ce job sans nouvel accord explicite. Aucun autre scheduler, mail, permission IAM ou donnée de rendez-vous n’est modifié ; aucun déploiement applicatif PROD n’est inclus.

## Vérifications

### Mesure et budget du lecteur direct, 14 octobre

Demande explicite d’Antoine : mesurer puis remplacer le fichier si raisonnable, avec cache cinq minutes. Mesure initiale `38528855629` : futurs 14–29 ms ; événements en cours sans index fin prévoyaient un scan de 4 001 lignes, non exécuté. Antoine autorise explicitement le seul `competitions.livepalmes_enddate_id(enddate,id)` dans NAP commune ; ajout isolé vérifié par `38531089285`, aucune ligne métier modifiée.

Deux fenêtres indexées (dates de début, dates de fin) sont limitées à 501 candidats avant les jointures et en sortie ; 501 signifie dépassement explicite, jamais troncature. Doublons de jointure refusés, fenêtres dédupliquées puis dates filtrées sans corriger les originaux. Plans vérifiés avant activation ; mesures complètes connectées `38532916660` : fenêtre future 70 candidats en 50,92 / 16,78 / 21,82 ms, fenêtre fin 63 candidats en 33,74 / 19,80 / 18,51 ms. Accès calendrier en range, jointures/recherches par clés ; seul le référentiel de cinq types et les fenêtres matérialisées bornées sont parcourus. Les compteurs `Handler_read_rnd_next` de ces petites structures ne constituent pas un scan historique. Réponse finale : 70 résumés valides, groupes affichés identiques à l’ancien fichier. Ces mesures ne garantissent pas une latence réseau future.

Budget : ouverture sur cache froid/périmé = deux SELECT, au plus 1 002 candidats et jointures/recherches de résultats existantes indexées, toutes les réponses plafonnées ; zéro Firestore/Storage et zéro écriture métier. Ouverture/rafraîchissement des rendez-vous sur cache valide = zéro SQL. Demandes simultanées mutualisées par instance ; réponse et échecs conservés cinq minutes. Une instance ayant une réponse validée la conserve avec `stale=true` en cas d’échec ; une instance froide sans donnée valide signale l’indisponibilité. Avec deux instances continuellement chaudes, au plus 24 renouvellements/48 SELECT métier par heure ; les redémarrages et démarrages à froid ajoutent leurs propres lectures et ne permettent pas de prétendre à un plafond global absolu. Aucun trafic = aucune lecture déclenchée par les rendez-vous.

Recette du cache : quatre requêtes rapprochées partagent une génération ; expiration réelle observée après 331 566 ms, génération du `2026-10-14T08:07:15.228Z` remplacée par `08:12:46.467Z`, 70 résumés et `stale:false`. Header de source `X-LivePalmes-Home-Source: nap-direct`. Recette ordinateur/mobile et version commune attestées dans EVOLUTIONS ; Antoine valide ensuite ce fonctionnement le 14 octobre. Le script de retrait exige d’abord une réponse fraîche de ce lecteur TEST. L’ancien job étant supprimé à sa demande, un retour au lecteur précédent nécessitant une génération périodique exige un nouvel accord pour recréer le job. Conserver l’index commun : aucun DROP implicite avec un rollback de code.

Suites dédiées : `nap-document-options-contract`, `nap-public-documents`, `nap-document-index`, `nap-featured-documents`, `nap-featured-documents-callable`, `nap-featured-migration`, `nap-home-events`, `livepalmes-home-model`, `featured-documents-model`. Scénarios de restauration/migration exécutés sur MySQL 5.7.30 local avec les données réelles du complément chiffré, puis fixtures synthétiques sans import d’originaux. Restauration et retour au DDL/données initiaux vérifiés exactement.

Recette visuelle locale ordinateur/mobile sur fixtures : groupes majeurs, boutons 32 px, recherche/pagination, ajout/retrait, ordre, annulation, aperçu et enregistrement en mémoire. La recette connectée TEST du 14 octobre est attestée dans EVOLUTIONS : ordinateur/mobile, bibliothèque et administration nationale, sans sauvegarde réelle de sélection. Les dates antérieures à 1900 sont exclues de la synthèse selon la borne du calendrier existant ; elles ne sont pas corrigées dans NAP. Les écritures de sélection réelles ne sont pas exécutées pour simuler une recette. Voir la section dédiée de `docs/TESTS_MANUELS.md`. La CI Linux doit attester `node tools/verify-livepalmes.js` sur le commit exact ; le contrôle local Windows reste limité par Bash absent du PATH.
