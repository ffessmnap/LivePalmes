# Consultation MySQL NAP sur TEST

<!-- description: Preparation de la connexion NAP en lecture dans LivePalmes TEST, secrets requis, budget et recette avant activation. -->

## Objectif final

NAP sera la source unique des donnees metier du public, du portail et du Direct, en lecture et en ecriture. Firestore sera retire progressivement du stockage metier. Firebase pourra conserver l'hebergement et l'authentification ; les caches/fichiers publics seront alimentes uniquement depuis NAP.

## Perimetre

`nap-test.html` consulte `perfs` pour un identifiant `nageurs.id` NAP, distinct d'un identifiant Firestore. Colonnes et temps sont affiches tels qu'enregistres, sans conversion ni calcul sportif. Les autres ecrans restent sur leur fonctionnement actuel. Cette etape n'est pas la migration complete.

L'ecran et la fonction `getNapSwimmerPerformances` sont reserves a TEST. La fonction exige une session Firebase avec `admin.full`. Aucun acces MySQL au chargement du module serveur, aucune ecriture SQL, aucun journal de secret ou de resultat.

## Preconditions

- Serveur `nap.ffessm.fr`, port `3372`, base et compte `nage-palmes`.
- Projet Firebase exclusivement `livepalmes-test`.
- Secret `LIVEPALMES_NAP_PASSWORD` : mot de passe MySQL, saisi dans Secret Manager, jamais dans Git ni dans le chat.
- TLS obligatoire sans verification du certificat serveur, selon le choix explicite d'Antoine le 5 octobre 2026. Aucun certificat CA requis ; aucun repli en connexion non chiffree. Le chiffrement ne garantit pas l'identite du serveur.
- Identite d'execution : lecture du seul secret de mot de passe.
- Verifier depuis Firebase le reseau et le chiffrement TLS. DBeaver ne prouve pas la connectivite Firebase.

Pilote `mysql2`, versions verrouillees, serveur MySQL 5.7 et execution Node.js 22. Le secret de mot de passe a ete cree par Antoine ; son acces depuis Firebase reste a verifier.

## Publication

Lot specialise `nap`, exclu de `all-safe` et de la publication ordinaire PROD. Le workflow backend TEST peut selectionner ce seul lot et verifier l'existence des secrets sans lire leurs valeurs. Ne pas lancer avant disponibilite des secrets.

L'export conditionnel TEST et la dependance partagee peuvent entrainer une selection conservative du backend dans le circuit commun. Examiner le bilan avant integration. Activation TEST autorisee par Antoine le 5 octobre. Avant integration, confirmer le plan SQL et les controles du commit regroupe ; deployer le lot NAP explicitement puis publier Hosting par le circuit commun. Aucun passage PROD autorise. La PR reste en brouillon pendant ces preconditions. Aucune validation utilisateur du fonctionnement n'est acquise.

## Etat de preparation du 5 octobre

- Version 1 du secret LIVEPALMES_NAP_PASSWORD active, verifiee dans la console sans lecture de sa valeur.
- Code adapte au TLS sans verification du certificat ; verification technique GitHub reussie au commit 9c295ba7, run 37361351227.
- Branche synchronisee avec main ; aucun acces SQL reel ni deploiement NAP effectue.
- EXPLAIN fourni par Antoine : nageur 12 utilise perf (ref, 1 ligne estimee) ; nageur 7322 utilise nageur (ref, 1269 lignes estimees, 1509 performances comptees). Tri filesort limite aux performances du nageur ; aucun index ajoute. Activation TEST autorisee, connexion reelle encore a verifier.

## Budget

Ouverture : zero lecture MySQL et Firestore ; verification de la session Auth existante. Consulter ou page suivante : une requete preparee, 51 lignes maximum retournees pour afficher 50 et detecter la suite. Pagination par identifiant, sans OFFSET ni lecture par ligne. Aucun listener, rafraichissement automatique ou reconstruction globale. Deux connexions par instance, deux instances maximum, file bornee ; delais de connexion/requete de dix secondes.

Le schema signale un index sur `perfs.nageur` et la cle primaire `perfs.id`. Confirmer le plan avec EXPLAIN avant activation : la limite des lignes retournees ne garantit pas le nombre de lignes examinees. Ne pas ajouter d'index sans analyse de l'existant et de l'impact sur l'ancien site.

## Recette

1. Tests hors reseau reussis : validation des entrees, requete preparee, pagination, TLS obligatoire ; classification des Functions ; verification complete Linux/Node.js 22 sur GitHub Actions (run 37349975542, code be930d56).
2. Controle mobile/ordinateur realise localement avec Firebase/NAP simules : refus PROD, invitation sans session, refus du compte non administrateur, pagination et affichage texte. Le refus serveur en conditions reelles reste a tester.
3. Configurer les secrets puis publier le seul lot NAP TEST apres controles. Ouvrir `/nap-test.html` avec une session administrateur TEST.
4. Comparer un nageur connu avec DBeaver ; tester absence de performances et plusieurs pages sans doublons. Confirmer le plan SQL.
5. Serveur sans TLS ou mauvais mot de passe : connexion refusee sans divulgation de l'erreur serveur. Verifier que la session MySQL a un Ssl_cipher non vide. Aucune ecriture necessaire a cette recette.

Restent ensuite : recherche par nom, TOP, correspondances de clubs, ecritures, reprise Firestore et promotion PROD.

## Echantillons fournis le 5 octobre

L'export de comptage contient 521 908 performances et 103 valeurs de course, dont une vide ; 486 582 lignes utilisent les 14 codes individuels bassin deja definis dans LivePalmes. Le referentiel course_dispo contient 275 entrees dont pauses/sessions et variantes ; 84 valeurs presentes dans perfs, representant 18 401 lignes, n'ont pas de correspondance exacte dans ce referentiel. Aucun rapprochement automatique LD ni correction de metadonnees n'est valide.

Les 30 premieres performances fournies contiennent des temps numeriques a six chiffres compatibles avec le parseCompactTime existant : 004686 = 46,86 secondes, 011138 = 1 minute 11,38 secondes. Cet echantillon ne valide pas les formats LD, les statuts ou les relais. Les 30 lignes ont relais=0 et passage=0.

Une performance porte id=0. Le curseur initial est donc null, traduit en borne SQL -1 ; un curseur explicite 0 demeure la borne de la page suivante. Test de regression hors reseau ajoute. Les correspondances de categories HEP/HMI/HCA/HME/FMI/FCA restent a verifier dans le referentiel categories, sans deduire les ages de leurs abreviations.
