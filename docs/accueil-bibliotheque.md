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
| Rendez-vous publics | 0 SQL ; une lecture du fichier généré sur absence du cache de processus ou après une minute, demandes simultanées mutualisées | 0 |
| Ouverture de l’éditeur national | 1 lecture sélection ≤7 + 1 page de catalogue bornée | ≤1 lecture de profil existant |
| Ajouter/retirer/ordonner/aperçu/annuler | 0 lecture/écriture distante ; six éléments au maximum | 0 |
| Enregistrer | ≤18 appels SQL préparés, plus début/fin de transaction ; ≤32 lignes métier lues avant jointures, ≤42 jointures PK, ≤20 lignes de métadonnées de schéma ; ≤12 lignes complémentaires touchées | ≤2 lectures de profil + 1 lecture de journal, 2 écritures de journal existant |

Rafraîchir reprend les mêmes bornes ; aucun listener ni reconstruction massive implicite. Les index réels et compteurs de session ont été vérifiés en lecture seule : parcours de `(competition,public,id)`, jointures `eq_ref` sur PRIMARY, aucun `Handler_read_rnd_next`. Les 263 références générales publiques présentes le 13 octobre ont été parcourues une fois sur 11 pages, sans doublon ; quatre n’ont pas de lien d’origine. Ces observations ne constituent pas une garantie de latence réseau future.

## Sélection et migration

Le complément existant reçoit `featured_rank TINYINT UNSIGNED NULL`, avec index unique de rang. NULL = non sélectionné ; le serveur impose exactement 1…N, N ≤6. Les cinq champs de métadonnées fichier deviennent nullables pour les anciennes références sans complément. Une nouvelle ligne éditoriale ne reçoit aucun hébergement, MIME, taille, fichier ou uploader historique inventé. Les dates/acteurs du complément tracent sa création technique seulement.

Enregistrement : identité nationale serveur, empreinte de toute la sélection, verrou nommé global, transaction InnoDB, vérification groupée des originaux publics/généraux et de leurs liens avant/après mutation, journal `auditLogs` existant avant écriture, vérification puis commit. Les anciens rangs passent à NULL avant permutation. Un retrait conserve l’original et son complément. Les upserts documentaires ordinaires excluent toujours le rang de leur liste de champs.

`documents` est MyISAM : le verrou éditorial n’empêche pas toutes les écritures fédérales externes. Les lectures publiques filtrent donc les originaux courants à chaque réponse ; aucune atomicité inter-moteurs n’est prétendue. La sauvegarde NAP est distincte des sauvegardes Firebase/code. Le contrôle de migration dans `tools/nap-featured-documents-migration.js` exige les preuves de sauvegarde restaurée, refuse toute dérive avant DDL et utilise un court verrou natif du complément. Le DDL exact est `tools/nap-featured-documents-migration.sql`, sans DML ni sélection initiale.

Le préalable C0 de PR #291 doit être réellement actif sur TEST et PROD avant migration commune. L’ancienne version refuse une colonne ou un index supplémentaire. La publication PROD de C0 se décide dans Infra ; elle n’autorise pas les nouvelles interfaces en PROD. Le retour privilégié conserve le schéma et revient au code C0. Un retour SQL complet exige une réconciliation des compléments créés depuis, sans suppression globale des lignes NULL et sans remplissage fictif des métadonnées.

## Jeu de rendez-vous et publication TEST

Un parcours privé paginé de `exportNapPublicPage` prépare les seuls résumés publics actuels/futurs : chevauchements compris, sans limite de saison ni filtre de région. Préparation hors parcours interactif, pages de 100 (+sentinelle), maximum explicite de 100 pages/10 000 événements et 2 Mio ; dépassement = erreur, jamais troncature. Le 13 octobre : 71 événements, une page SQL, environ 17 Ko. Les résultats sont des liens vérifiés déjà disponibles, sans invention de Direct.

Le lecteur public ne reconstruit rien. Après trois heures, une copie structurellement valide reste affichée avec `stale=true` et une indication de retard ; les regroupements sont toujours recalculés à la date courante de Paris. Si Storage échoue ou renvoie un contenu corrompu, la dernière copie validée en mémoire est conservée et signalée en retard. Une instance sans aucune copie valide signale l’indisponibilité ; elle ne fabrique rien. Les lectures et les échecs Storage sont mutualisés et mis en cache une minute. Les dates futures, la taille, le schéma et les champs restent contrôlés. Le module client présente tous les événements en cours, masque le prochain groupe majeur si nécessaire, conserve tous les ex aequo à la prochaine date majeure, puis cinq futurs hors majeurs. Annulés exclus de cette synthèse, mais conservés au calendrier.

Antoine autorise le 14 octobre la fiabilisation complète sur TEST après des lancements GitHub manqués. L’horloge GitHub est retirée : le seul job Google Cloud Scheduler `livepalmes-test-home-events` appelle chaque heure, minute 17 (Europe/Paris), l’action POST privée `home-events-refresh` de l’export TEST existant. OIDC avec le même compte backend déjà autorisé, aucun changement IAM ni nouveau compte. Trois reprises au maximum, délai initial 30 s, délai plafonné 300 s, tentative limitée à 180 s. Aucun scheduler sportif, mail ou de publication de performances n’est touché. Aucun job PROD n’est créé.

La préparation et la publication sont partagées par le job et le secours manuel `livepalmes-home-events-test.yml`, limité au bucket TEST et à `site-home/events-v1.json`. Projet, confirmation et destination sont contrôlés avant lecture NAP. Une exécution plus ancienne ne remplace jamais une copie plus récente ; précondition de génération et relecture SHA-256 après écriture. Échec = conservation du fichier précédent. Budget par exécution : 1 page SQL constatée pour 71 événements ; plafond 100 requêtes de 101 candidats, 10 000 résumés et 2 Mio ; 0 écriture NAP/Firestore et 1 lecture de métadonnées + 1 écriture + 1 relecture Storage. Avec trois reprises : au plus quatre tentatives par déclenchement, aucune lecture liée au nombre de visiteurs. La vérification de mise en service observe deux vrais déclenchements automatiques à une minute d’intervalle avec les données publiques courantes, puis rétablit le rythme horaire en finally et vérifie la lecture publique fraîche. Le workflow conserve aussi le lancement manuel de secours confirmé.

Ordre de mise en service : C0 PROD approuvé → sauvegarde/restauration et migration commune vérifiées → PR C1 sur main après CI → publication ciblée du lot NAP TEST (lecteur public/export privé) → préparation/publication du seul cache autorisé → circuit TEST commun pour les fonctions calculées puis Hosting → recette de la version regroupée. Ne pas remplacer TEST par une branche ou considérer l’aperçu comme la recette finale.

## Vérifications

Suites dédiées : `nap-document-options-contract`, `nap-public-documents`, `nap-document-index`, `nap-featured-documents`, `nap-featured-documents-callable`, `nap-featured-migration`, `nap-home-events`, `livepalmes-home-model`, `featured-documents-model`. Scénarios de restauration/migration exécutés sur MySQL 5.7.30 local avec les données réelles du complément chiffré, puis fixtures synthétiques sans import d’originaux. Restauration et retour au DDL/données initiaux vérifiés exactement.

Recette visuelle locale ordinateur/mobile sur fixtures : groupes majeurs, boutons 32 px, recherche/pagination, ajout/retrait, ordre, annulation, aperçu et enregistrement en mémoire. La recette connectée TEST du 14 octobre est attestée dans EVOLUTIONS : ordinateur/mobile, bibliothèque et administration nationale, sans sauvegarde réelle de sélection. Les dates antérieures à 1900 sont exclues de la synthèse selon la borne du calendrier existant ; elles ne sont pas corrigées dans NAP. Les écritures de sélection réelles ne sont pas exécutées pour simuler une recette. Voir la section dédiée de `docs/TESTS_MANUELS.md`. La CI Linux doit attester `node tools/verify-livepalmes.js` sur le commit exact ; le contrôle local Windows reste limité par Bash absent du PATH.
