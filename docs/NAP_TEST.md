# Consultation MySQL NAP sur TEST

<!-- description: Preparation de la connexion NAP en lecture dans LivePalmes TEST, secrets requis, budget et recette avant activation. -->

## Perimetre

`nap-test.html` consulte `perfs` pour un identifiant `nageurs.id` NAP, distinct d'un identifiant Firestore. Colonnes et temps sont affiches tels qu'enregistres, sans conversion ni calcul sportif. Les autres ecrans restent sur leur fonctionnement actuel. Cette etape n'est pas la migration complete.

L'ecran et la fonction `getNapSwimmerPerformances` sont reserves a TEST. La fonction exige une session Firebase avec `admin.full`. Aucun acces MySQL au chargement du module serveur, aucune ecriture SQL, aucun journal de secret ou de resultat.

## Preconditions

- Serveur `nap.ffessm.fr`, port `3372`, base et compte `nage-palmes`.
- Projet Firebase exclusivement `livepalmes-test`.
- Secret `LIVEPALMES_NAP_PASSWORD` : mot de passe MySQL, saisi dans Secret Manager, jamais dans Git ni dans le chat.
- Secret `LIVEPALMES_NAP_CA` : certificat CA PEM confirme par l'administrateur NAP. Verification TLS obligatoire, sans repli non chiffre ou sans verification.
- Identite d'execution : lecture de ces deux secrets seulement.
- Verifier depuis Firebase le reseau, la chaine de confiance et le nom du serveur. DBeaver ne prouve pas la connectivite Firebase.

Pilote `mysql2`, versions verrouillees, serveur MySQL 5.7 et execution Node.js 22. Le mot de passe et le certificat ne sont pas encore configures.

## Publication

Lot specialise `nap`, exclu de `all-safe` et de la publication ordinaire PROD. Le workflow backend TEST peut selectionner ce seul lot et verifier l'existence des secrets sans lire leurs valeurs. Ne pas lancer avant disponibilite des secrets.

L'export conditionnel TEST et la dependance partagee peuvent entrainer une selection conservative du backend dans le circuit commun. Examiner le bilan avant integration. Conserver la PR en brouillon : aucune integration automatique ni preuve TEST ne doit etre annoncee a ce stade. Aucune validation utilisateur du fonctionnement n'est acquise.

## Budget

Ouverture : zero lecture MySQL et Firestore ; verification de la session Auth existante. Consulter ou page suivante : une requete preparee, 51 lignes maximum retournees pour afficher 50 et detecter la suite. Pagination par identifiant, sans OFFSET ni lecture par ligne. Aucun listener, rafraichissement automatique ou reconstruction globale. Deux connexions par instance, deux instances maximum, file bornee ; delais de connexion/requete de dix secondes.

Le schema signale un index sur `perfs.nageur` et la cle primaire `perfs.id`. Confirmer le plan avec EXPLAIN avant activation : la limite des lignes retournees ne garantit pas le nombre de lignes examinees. Ne pas ajouter d'index sans analyse de l'existant et de l'impact sur l'ancien site.

## Recette

1. Tests hors reseau reussis : validation des entrees, requete preparee, pagination, TLS obligatoire ; classification des Functions ; verification complete Linux/Node.js 22 sur GitHub Actions (run 37349975542, code be930d56).
2. Controle mobile/ordinateur realise localement avec Firebase/NAP simules : refus PROD, invitation sans session, refus du compte non administrateur, pagination et affichage texte. Le refus serveur en conditions reelles reste a tester.
3. Configurer les secrets puis publier le seul lot NAP TEST apres controles. Ouvrir `/nap-test.html` avec une session administrateur TEST.
4. Comparer un nageur connu avec DBeaver ; tester absence de performances et plusieurs pages sans doublons. Confirmer le plan SQL.
5. Mauvais certificat : connexion refusee sans divulgation de l'erreur serveur. Aucune ecriture necessaire a cette recette.

Restent ensuite : recherche par nom, TOP, correspondances de clubs, ecritures, reprise Firestore et promotion PROD.
