# Source NAP pour les pages existantes

<!-- description: Migration transparente des pages publiques vers NAP, export prive borne, fichiers compatibles et controles avant bascule TEST. -->

## Objectif autorise le 6 octobre 2026

Antoine confirme la lecture NAP avec plusieurs nageurs et demande de conserver les pages, liens, presentation et fonctionnalites actuels. NAP devient progressivement la source unique ; aucune nouvelle interface de recherche par identifiant ne remplace les pages publiques. Aucun passage PROD autorise dans cette livraison.

## Preparation de la source

Le lot TEST `nap` expose un export HTTP uniquement au compte `github-livepalmes-test-backend@livepalmes-test.iam.gserviceaccount.com`. L'API n'est pas publique. L'execution conserve le secret NAP existant ; le compte de publication n'obtient jamais le mot de passe MySQL.

Les projections fixes couvrent les seuls champs sportifs publics de `nageurs`, `clubs`, `competitions` et `perfs`. Aucun email, telephone, adresse, licence ou mot de passe n'est exporte. Les cles de pagination entieres et leurs index primaires simples sont controles avant export. Aucun index ni schema NAP n'est modifie.

L'export fixe les bornes superieures, lit chaque table dans l'ordre de sa cle primaire, puis effectue une seconde lecture des memes bornes. Les empreintes doivent etre identiques. Toute modification pendant les lectures refuse la construction ; aucune transaction MyISAM ou verrou global n'est simule.

## Budget de lectures

Ce traitement est reserve a la preparation en arriere-plan ; aucune reconstruction dans une recherche ou ouverture de fiche. Inspection : deux requetes de diagnostic puis deux requetes de validation de structure sur quatre tables et quatre MAX utilisant leur index primaire. Chaque page : une requete preparee, au plus 2001 lignes retournees, 2000 conservees, dix secondes maximum. Plafond : 500 pages par table et par passe. Deux connexions par instance et deux instances maximum, file bornee a huit requetes.

Pour environ 522000 performances, les deux passes representent environ 524 requetes de pages et 1,044 million de lignes, plus les referentiels. Il s'agit d'une preparation controlee, pas du cout d'une visite. Les CSV restent dans le dossier ephemere de travail ; les artefacts GitHub ne contiennent que les empreintes et compteurs.

La recherche et les fiches conserveront leurs fichiers publics : zero lecture MySQL ou Firestore par visite, un index de recherche par prefixe, un index d'identifiants et un fichier de fiche, avec les caches existants. Filtres et graphiques sont calcules localement. La mesure du poids des fichiers et la comparaison avec la publication actuelle restent obligatoires avant activation.

## Construction compatible

`export-nap-public-source.js` utilise un jeton Google de courte duree uniquement pour l'endpoint TEST prive. `build-nap-public-files.js` verifie les empreintes des deux exports et reutilise les generateurs existants, puis le controle exhaustif des fiches et TOP.

Le mode NAP travaille exclusivement dans un dossier neuf sous `outputs`. Aucun fichier genere du depot n'est modifie. Les anciennes surcharges de competitions ne sont pas appliquees a NAP. Les performances de piscine dont la longueur est inconnue sont conservees avec un bassin vide ; aucune valeur 25/50 n'est deduite. Les competitions marquees `ld=1` restent hors des pages piscine. Les autres regles de normalisation et calcul restent celles du generateur existant.

## Etapes restantes avant bascule

1. Verifier la structure et produire l'export reel par `livepalmes-test-nap-public-source.yml` ; ce workflow ne publie rien et n'ecrit pas dans NAP.
2. Comparer les identites, anciens liens et historiques avec les fichiers actuellement publies sur TEST ; expliquer chaque ecart, traiter les pertes avant activation.
3. Publier une version NAP immuable sur le seul bucket TEST, puis connecter les pages existantes a cette version. Ne pas masquer une panne NAP par un retour silencieux aux donnees Firestore.
4. Controler recherche, fiches, filtres, progression, liens et mobile avec les memes parcours utilisateur. La validation de `nap-test.html` ne vaut pas validation de ces pages.
5. Poursuivre les autres consommateurs, Records/MPF, portail et Direct selon leurs contrats existants et les referentiels NAP verifies.

## Suivi du 6 octobre

PR #105 integree : export prive et construction compatibles. Le run backend 37382627387 a ete arrete avant deploiement par le classement statique des exports indentes. Le correctif ajoute ce controle aux verifications de PR. La comparaison automatique conserve les doublons, signale les changements de metadonnees et les anciens liens a reprendre. Les fichiers TEST actuels sont captures avec leurs generations Storage ; aucune bascule ni ecriture NAP dans ce workflow.

## Comparaison reelle du 6 octobre — run 37420371570

Deux lectures identiques : 18241 nageurs, 672 clubs, 3977 competitions, 521835 performances NAP. Construction compatible et controle exhaustif reussis. Candidat : 477529 lignes et 9851 fiches ; publication TEST actuelle : 469220 lignes et 9552 fiches. La comparaison signale 3290 lignes sans correspondance exacte, 32286 lignes avec metadonnees differentes, six identites absentes, quatre liens absents, cinq liens conflictuels et 22 liens recuperables. Ces nombres ne prouvent pas une perte NAP : corrections, normalisation et doublons restent a diagnostiquer. Aucune bascule autorisee par ce rapport incomplet. Le diagnostic detaille regroupe par annee/source/competition et distingue les champs modifies ; aucun nom ni date de naissance dans le rapport.

## Cible corrigee par Antoine le 6 octobre : lecture directe

Antoine precise que LivePalmes doit interroger NAP directement lors des consultations pour voir les modifications sans export a relancer. La publication statique de la PR #108 est annulee : run 37429288547 cancelled avant toute publication Hosting. Les fichiers eventuellement crees dans le prefixe de travail immuable ne sont pas utilises par les pages. Le branchement statique est retire. La cible est une API serveur de lecture NAP pour les pages existantes, avec budgets bornes, pagination et index verifies. Aucun acces MySQL ni mot de passe depuis le navigateur. Les TOP demandent un controle des index et du tri avant implementation ; aucune lecture exhaustive interactive. Aucun index NAP n'est ajoute sans proposition precise et validation.

NAP seule fait foi ; aucune comparaison avec les anciennes performances LivePalmes. Les licences seront ajoutees plus tard, selon le choix explicite d'Antoine : 7931 associations locales trouvees sans doublons, concordant avec les identifiants et identites de l'export NAP de mai 2026. Elles restent privees et ne sont pas publiees.

## Preparation des lectures directes

Le retrait #109 est integre. Le diagnostic prive utilise uniquement une lecture des index et trois EXPLAIN (recherche par prefixe du nom, fiche paginee avec competition, TOP par course/categorie/bassin). Quatre requetes au maximum, chacune bornee a dix secondes ; aucune execution des SELECT de performances, aucune ecriture ni export sportif. Les plans restent reserves au compte de publication TEST. La recherche publique devra rester indexable ; le tri des TOP ne sera active qu'apres verification des index et du format des temps.
