# Statut NS des nageurs du portail

<!-- description: Champ NS privé NAP, transitions nationales, budget borné et préparation de la migration non exécutée. -->

## Périmètre et état

Chantier 3/3 autorisé par Antoine le 29 octobre 2026, code destiné à TEST. Dans Mes nageurs, le crayon existant ouvre une section « Nageur étranger — non sélectionnable (NS) » avec son propre bouton d’enregistrement. Les droits club existants s’appliquent ; aucun nouveau droit n’est créé. Les responsables régionaux utilisent le contexte club déjà autorisé.

NAP/MySQL est la source réelle des nageurs. Le [diagnostic de métadonnées en lecture seule](https://github.com/ffessmnap/LivePalmes/actions/runs/40956880950) confirme les onze colonnes natives de `nageurs` et l’absence de champ NS. Aucun sens nouveau n’est attribué à `wc` ou `edf`. Deux colonnes facultatives sont préparées dans `functions/nap-swimmer-ns-schema.js` ; aucune migration n’est lancée par le code, une ouverture de fiche ou un déploiement.

Sans ces colonnes, les lectures et corrections existantes continuent à fonctionner. Le statut est interprété décoché et son édition seule est désactivée, avec une explication. **Code livré sur TEST ne signifie pas fonctionnalité NS activée.** L’activation nécessite un accord spécifique sur l’opération de structure de la base réelle, puis les contrôles ci-dessous. Aucune validation utilisateur ni autorisation PROD n’est déduite.

## Transitions

- Colonnes ou valeurs absentes : NS décoché, aucune normalisation ou mise à jour massive.
- Cocher : une mise à jour ciblée de `nageurs`, sauvegardée et auditée avant écriture, applique NS immédiatement.
- Décocher : crée une demande `swimmer-ns` dans la collection de demandes nationales existante. La valeur NAP reste NS ; l’écran affiche l’attente et verrouille cette demande jusqu’à sa décision.
- Refus national : aucune écriture NAP, NS conservé, commentaire national visible lors de la réouverture du crayon. Le club peut refaire une demande après lecture du refus.
- Acceptation nationale : contrôle national serveur, demande revendiquée et verrouillée selon le circuit existant, puis mise à jour d’un seul nageur. Sauvegarde durable, comparaison atomique de l’identité, du club, de NS et de sa version. Une demande devenue ancienne ne peut pas retirer un NS ultérieur.

Les demandes NS sont distinctes des corrections d’identité et des signalements de doublon. Elles ne permettent pas « Modifier et valider » l’identité. Les reprises d’une décision interrompue après SQL réutilisent la même sauvegarde et ne doublent pas l’écriture. Aucun email, migration ou recalcul sportif n’est déclenché. Aucun branchement dans WinPan, classements, records, médailles ou qualifications.

## Budget avant/après

Budgets additionnels, hors contrôles d’accès existants et fonctionnement inchangé des listes nationales de demandes :

| Situation | Coût supplémentaire maximal |
| --- | --- |
| Ouverture/rafraîchissement de Mes nageurs | Aucune requête ni lecture Firestore ajoutée. La même requête club bornée à 801 lignes lit la ligne native, dont les deux petits scalaires NS lorsqu’ils existent. Projection publique de réponse explicitement filtrée par `person()`. Cache de liste existant conservé. |
| Crayon d’un nageur | Un appel existant avec action NS, une lecture NAP par clé primaire, un document Firestore de demande à identifiant déterministe. Si structure absente : zéro lecture Firestore de demande. Aucun chargement par ligne de la liste. |
| Cocher NS | Cinq requêtes SQL au maximum : trois lectures d’un nageur, un contrôle de déclencheur borné à un résultat, une mise à jour limitée à une ligne. Une lecture d’audit et deux écritures d’audit au maximum hors mécanisme d’audit existant. La réponse actualise le cache sans relire l’effectif. |
| Demander le retrait | Une lecture NAP par clé ; une transaction sur un document de demande et une trace d’audit. Zéro écriture NAP. |
| Décision nationale | Circuit existant : verrou/release SQL ; approbation : deux lectures par clé, un contrôle de déclencheur, une mise à jour limitée à une ligne ; refus : zéro écriture NAP. Un document de demande, une sauvegarde et les traces d’audit ; reprises de transaction limitées à trois. |
| Pire cas réaliste | Même budget fixe par action ; aucun scan sportif, lecture N+1, listener ou reconstruction en cas de cache absent. Une fiche fusionnée ou transférée hors du club est refusée côté serveur. |

Le `SELECT n.*` du lecteur privé supporte la structure avant/après migration sans diagnostic de schéma par ligne ni requête supplémentaire. Les onze colonnes natives observées sont de petits scalaires ; seuls les champs autorisés quittent le serveur. Réexaminer ce choix si la table reçoit ultérieurement des colonnes volumineuses. La lecture nationale conserve ses pages de 101 lignes et la recherche sa limite de 20.

## Opération de structure préparée, à approuver séparément

Ne pas exécuter cette section sans accord spécifique. La connexion TEST utilise la source NAP réelle partagée ; l’appellation TEST ne rend pas l’opération fictive. Le diagnostic indique une table MyISAM : un ALTER peut reconstruire/verrouiller la table et perturber temporairement les accès. La durée n’a pas été mesurée ; prévoir une fenêtre avec les autres écritures suspendues, et arrêter si la disponibilité ou les privilèges ne sont pas établis.

Plan exact exporté, avec son SHA-256, par `functions/nap-swimmer-ns-schema.js` :

```sql
ALTER TABLE nageurs
  ADD COLUMN livepalmes_ns TINYINT NULL DEFAULT NULL,
  ADD COLUMN livepalmes_ns_version INT UNSIGNED NULL DEFAULT NULL;
```

1. Présenter et obtenir l’accord pour cet ALTER seul. Aucun UPDATE, backfill, nouvelle collection, activation PROD, email, règle/index Firebase ou changement des champs historiques n’en fait partie.
2. Refaire le diagnostic de métadonnées, identifier la cible exacte et confirmer moteur, colonnes, absence de déclencheur et de chacune des deux colonnes ajoutées. État partiel ou incompatible : arrêter, sans second ALTER improvisé. Confirmer les privilèges et l’absence d’écriture en cours.
3. Préparer hors parcours interactif une sauvegarde exploitable de la structure et de la table, vérifier sa réouverture et son empreinte, le nombre de lignes et les empreintes des onze colonnes natives. Ces scans de sauvegarde ne sont pas autorisés implicitement par le chantier de code. Ne pas exposer les lignes ni les secrets dans les logs ou le chat.
4. Exécuter le seul ALTER approuvé dans la fenêtre convenue. Ne pas remplir les valeurs NULL. Confirmer les types, nullabilité et défauts exacts ; comparer nombre de lignes et empreintes historiques avant/après, puis vérifier un plan de lecture par clé primaire et la requête club existante. En cas d’écart, bloquer les écritures et examiner la sauvegarde avant toute restauration.
5. Rafraîchir Mes nageurs et ouvrir le crayon : NS doit être décoché, disponible et sans écriture automatique. Toute recette créant un statut ou une demande sur un nageur réel exige aussi son accord de données spécifique ; préférer une source fictive dédiée. Tester ensuite cocher, demande, refus, nouvelle demande, acceptation, concurrence et reprise, avant de demander la validation utilisateur de la version regroupée.

Retour arrière : désactiver le parcours NS par retour du code compatible sans supprimer ses colonnes ni ses valeurs. Les colonnes facultatives n’empêchent pas l’ancien code de lire les champs historiques. Un retour du code n’annule pas une décision métier déjà enregistrée. DROP des colonnes, restauration de table ou correction des données nécessitent un accord distinct et la comparaison avec la sauvegarde ; aucune suppression automatique ni copie TEST vers PROD.

## Activation autorisée après livraison du code

Antoine a donné son accord explicite dans cette discussion après l’explication des deux colonnes. Cet accord couvre le seul ALTER préparé et ses sauvegardes/contrôles ; les changements de statut sur un nageur réel, les emails et la publication PROD restent exclus. L’authentification Google locale étant expirée, le workflow ponctuel `nap-authorized-swimmer-ns-schema.yml` utilise le compte technique TEST existant, sans modification IAM ni configuration Firebase.

Le workflow exige main, le commit exact, une confirmation nominative et une première tentative. Le script `tools/nap-swimmer-ns-migration.js` contrôle la cible TEST, reprend la version exacte du secret NAP déjà liée au lecteur TEST, vérifie SELECT/ALTER/LOCK TABLES et refuse un schéma inattendu, un déclencheur ou un écrivain actif. La sauvegarde parcourt la seule table nageurs par pages primaires de 1 000, plafond de 100 000 lignes/64 Mio et 30 s de parcours. Le verrou de table stabilise les lignes pendant la copie ; il est libéré avant l’envoi de l’artefact.

Deux copies chiffrées sont rouvertes et comparées en mémoire, puis conservées dans un artefact avant toute mutation. La clé de chiffrement est dérivée de la clé privée du compte technique TEST existant ; aucune clé ni donnée en clair n’est publiée. Conserver l’accès à cette clé pour une restauration éventuelle autorisée séparément. L’étape apply reprend le verrou, refuse toute dérive de structure ou de données, exécute le seul ALTER puis compare toutes les colonnes natives, les index et plans de lecture. Les deux nouveaux champs doivent rester NULL partout ; aucune requête INSERT/UPDATE/DELETE n’existe dans ce circuit.

Aucune relance implicite en cas d’échec ou de résultat incertain : examiner la preuve et la structure avant reprise. Une réussite sera attestée dans la PR, puis une recette de lecture et un rafraîchissement du crayon confirmeront la disponibilité sur TEST sans cocher une case réelle.

## Preuves de contrôle

Tests hors réseau : `tests/nap-swimmer-ns-tests.js`, `tests/nap-swimmer-ns-callable-tests.js` et `tests/portal-swimmer-ns-browser-tests.js`. Les deux premiers sont intégrés à `node tools/verify-livepalmes.js`. Le dernier exerce les fabriques livrées, le dialogue réel, l’attente, le refus, les colonnes absentes, le changement de club et les deux thèmes à 1280/390 px ; HTTPS externe bloqué et données fictives. La CI obligatoire du candidat exact et la preuve TEST complètent ces contrôles dans la PR. La fonctionnalité réelle reste en attente de migration autorisée puis de recette utilisateur.
