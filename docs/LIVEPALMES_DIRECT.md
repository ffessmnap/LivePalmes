# LivePalmes Direct

<!-- description: Périmètre, démarrage local, publication et fonctions propres aux consoles du dispositif LivePalmes Direct. -->

## Perimetre

LivePalmes Direct accompagne les compétitions piscine de tous niveaux issues du calendrier NAP. Le nouveau parcours multi-compétitions est publié sur TEST ; le dispositif national historique conserve ses pages et ses protections. La préparation des engagements reste dans le Portail LivePalmes.

## Direct multi-compétitions — livraison TEST du 6 novembre 2026

### Surveillance TXT et classements — livré sur TEST, recette attendue

Retouches lecture/suivi livrées sur TEST le 6 novembre : majuscules d'affichage des noms, tiret pour absence de référence, passages cumulés nommés et avancement des publications. Le bureau affiche les volumes importés et les résultats reçus par épreuve. Les compteurs sont calculés par un agrégat SQL groupé par épreuve/série sur au plus 15 001 participations de la seule compétition ; limite de 1 000 par épreuve conservée. Aucune table, colonne, donnée native, règle sportive de classement ou capacité d'accès ajoutée. [Publication TEST contrôlée](https://github.com/ffessmnap/LivePalmes/actions/runs/42268312513), recette authentifiée attendue.

Budget de suivi : ouverture privée/Actualiser = une lecture agrégée supplémentaire dans `detail` (cinq lectures SQL bornées avec épreuve sélectionnée, profil et délégation comme auparavant). Public = métadonnées indexées par appel, puis programme et agrégat partagés par compétition/révision/instance et participations de l'épreuve par défaut de cache ; au plus quatre lectures SQL à l'ouverture froide, une seule si la vue est encore en cache, aucune au filtrage. Changer d'épreuve réutilise programme/agrégat et ne charge que ses participations. Publication = l'agrégat final existant de contrôle des limites est enrichi et renvoie aussi les compteurs et versions ; aucun appel supplémentaire après un TXT normal. Une reprise idempotente sans compteurs peut relire `detail` pour rafraîchir le bilan. Aucun timer public ni requête par course.

Le PDF transmet le nombre attendu de séries, conservé dans le JSON de publication de l'épreuve ; les imports partiels fusionnent ce nombre et les imports complets le remplacent. Pour les anciennes publications, les horaires et séries connus servent de référence. « Terminée » exige engagements connus tous couverts, séries attendues complètes et absence de résultat non associé. Une course sans séries de référence reste « En cours ». Les retraits masquent les compteurs correspondants du public ; le bureau garde les volumes importés avec indication de masquage. Aucun résultat ancien n'est réécrit pour cette présentation.

Passages WinPalme confirmés par Antoine : temps final en premier, puis champs cumulés 100/200/400/800/1500 m ; relais par distances de relayeur. Un passage final dupliqué n'est pas répété. Les anciennes valeurs « Passage N » sont nommées à l'affichage sans migration. Auray : 168 passages présents dans 63 TXT vérifiés contre le protocole, dont 108 individuels et 60 de relais. Les champs supérieurs non présents à Auray sont testés sur données fictives selon l'ordre confirmé. Aucun rapprochement KB/M7 dans cette recette.

Version publiée et contrôlée le 6 novembre à 17 h 37 (Paris) ; [preuves de livraison et limites de validation](releases/EVOLUTIONS.md). La recette authentifiée WinPalme reste à effectuer par Antoine. Les tests automatisés et contrôles connectés n'ont publié aucune donnée réelle.

Surveillance navigateur demandée par Antoine, sans attendre un export TXT des séries : les PDF importés fournissent les identités, catégories disponibles et positions. Le bureau choisit le dossier via Chrome/Edge, associe les numéros de session/épreuve WinPalme aux épreuves Direct et confirme la répartition à jour et la publication automatique des corrections. Les fichiers déjà présents sont ignorés par défaut, ou repris après choix explicite. Une seule surveillance par poste est prévue ; utiliser un seul poste émetteur par compétition. Arrêt au changement de compétition, de compte ou lors d'une autre action du bureau ; aucune reprise silencieuse après rechargement. L'onglet doit rester ouvert et le poste éveillé ; l'arrière-plan peut retarder les contrôles. Aucun outil local installé.

Contrôle local toutes les 30 secondes, deux contenus identiques espacés d'au moins une seconde avant envoi ; en rythme normal, délai d'environ 30 à 60 secondes. Limites : 2 000 TXT, 64 Ko par fichier, 4 Mo par dossier, un seul préfixe de compétition, lots de 100 séries au maximum. Noms supportés : `<code>_AS_<session>_<épreuve>_<série>_<course>.txt`. Lignes à sept champs, séparateur `:` ou `;`, temps `MMSSCC`, forfait/absence, abandon et disqualification textuels reconnus ; contenu incomplet ou inconnu refusé. Passages individuels désignés par leur numéro, sans distance inventée ; relais : passages cumulés par distance de relayeur. Aucun classement ni identité n'est déduit du nom d'un TXT. Une suppression de fichier ne retire pas automatiquement une publication.

Le service `watchContext`, réservé au même bureau autorisé, renvoie un snapshot borné des séries publiées et une empreinte par série. Chaque publication utilise `previewBatch` / `publishBatch`, l'empreinte de répartition et les identifiants de participation ; une grille changée ou des lignes manquantes/ajoutées bloquent. Une erreur réseau met la surveillance en pause avec reprise du même lot et du reçu éventuel. Les nouvelles données restent dans les tables Direct et l'historique existants ; ni TXT brut, ni nouvelle table/colonne, ni écriture NAP native. Des équipes homonymes sont distinguées par un identifiant source de position dans l'épreuve ; une catégorie de relais absente du PDF reste vide. Un changement de grille dans WinPalme exige la réimportation des séries et leur contrôle : un TXT sans noms ne permet pas de détecter seul une permutation à effectif identique.

Budget supplémentaire : configuration = un profil Firestore, au plus une délégation SQL, puis quatre lectures NAP bornées (calendrier par clé, configuration par clé, programme limité à 301, participations limitées à 15 001). Cycle sans changement = zéro appel serveur, y compris au rafraîchissement local du dossier. Lot modifié = deux appels privés, deux profils Firestore et au plus deux délégations ; aperçu quatre lectures SQL, publication sept lectures SQL incluant reçu, verrou et agrégation bornée, plus les écritures groupées existantes. Pas d'appel par nageur ou course, ni dépendance au volume total NAP. Ouverture/Actualiser du public et budget du public inchangés ; classement et filtres calculés localement.

Classements confirmés par Antoine : scratch par temps croissant, mêmes temps = mêmes places puis saut (1, 2, 2, 4), forfait/abandon/DSQ sans rang. Avec une ou plusieurs catégories cochées, la colonne « Pl. cat. » donne le rang de chaque nageur dans sa propre catégorie, calculé sur tous les résultats publiés de cette catégorie avant filtrage. Tri commun par temps ; sans filtre, place scratch. Une catégorie absente reste sans place catégorie. Le calcul évolue avec les publications et corrections ; le compteur de publications reste global. Recette authentifiée de la surveillance TEST à effectuer par Antoine, sans publication réelle par les tests automatisés.

Maquette validée par Antoine et publiée sur TEST le 6 novembre 2026 ; [preuves et périmètre de livraison](releases/EVOLUTIONS.md). Le public et le bureau utilisent les mêmes composants que la maquette : scratch automatique résultats/engagements, séries et horaires, fenêtres nageurs, club mis en évidence, navigation colorée compacte et contrôle groupé des imports. Une seule journée masque les choix de jour. Un relais ne nécessite aucune année de naissance ; 595999 reste sans référence et sans comparaison.

Le bureau appelle `previewBatch` puis `publishBatch` : une empreinte couvre toute la sélection et la version de compétition, les remplacements sont confirmés ensemble, puis une transaction publie toutes les épreuves et une seule nouvelle révision publique. Un échec annule le lot entier. La reprise utilise un identifiant stable de sélection et un condensat du contenu, sans double écriture après une réponse perdue. Un chevauchement de documents ou des participations ambiguës bloque l'aperçu. Bornes : 300 groupes, 1 000 participations par épreuve et 15 000 par compétition. Les images avant écriture sont limitées au périmètre de chaque groupe.

Les horaires par série sont validés puis stockés dans le JSON existant `livepalmes_direct_events.publication_state_json.heatSchedule`, avec les deux indicateurs de visibilité. Aucune table ni colonne supplémentaire, aucune migration ou reprise des données déjà importées. `scheduled_at` conserve le départ de l'épreuve ; importer des résultats sans horaires conserve ceux des séries. Un import sans ordre conserve aussi la place connue dans le programme. Les séries déjà importées avec l'ancien adaptateur devront être réimportées par le bureau pour récupérer les horaires perdus ; les PDF par course n'étaient pas conservés.

Budget supplémentaire : aperçu groupé = un profil Firebase et une délégation SQL si nécessaire, métadonnées natives par clé, une configuration, un programme borné et un lot de participations borné (pas de lecture par épreuve). Publication = même contrôle, une lecture de reçu, un verrou de configuration et une agrégation bornée finale ; écritures dans les seules tables Direct, par paquets de 200 participations et journaux par groupe. Les horaires sont lus avec le programme existant, sans requête additionnelle. Fenêtre nageur et choix du club = aucun appel à l'ouverture de page, puis un appel au lot existant `view=club`, plafonné à 15 000 participations et mutualisé par révision ; Actualiser invalide le cache local. Aucune minuterie, aucun listener.

Contrôles réussis : tests de modèle, de transactions et de budgets hors réseau ; deux suites navigateur à 305, 320, 390 et 1 280 px selon le parcours, sans HTTPS externe ; MySQL 5.7 isolé et vérification globale en CI sur le candidat publié. Les fichiers servis sur TEST correspondent au candidat et le gestionnaire refuse les appels sans connexion. Aucun test connecté n'a publié de données réelles ; recette authentifiée par Antoine encore attendue.

Pour réutiliser la maquette hors connexion métier : `node tools/preview-direct.js`, puis `http://127.0.0.1:8765/` et `/bureau`. Données fictives par défaut ; publication simulée dans le stockage local du navigateur, effaçable avec Réinitialiser les exemples. Les outils de maquette restent exclus de Hosting. Contrôle dédié : `node tests/direct-preview-browser-tests.js`.

- Gestion : `direct-admin.html`, connexion LivePalmes habituelle, sélection d'une compétition du calendrier, activation et bureau des performances. Public : `direct.html?id=5220`, lien calculé depuis l'identifiant NAP, sans colonne ajoutée à `competitions`.
- Stockage : cinq tables InnoDB `livepalmes_direct_competitions`, `livepalmes_direct_events`, `livepalmes_direct_entries`, `livepalmes_direct_publications`, `livepalmes_direct_access`. Chaque clé et lecture comprend l'environnement serveur `test` ou `production`. Aucun déplacement, modification ou effacement de données natives. Les identités et clubs importés sont des instantanés ; les liens natifs éventuels n'autorisent aucune écriture de fiche ou de performance.
- Création : opération privée TEST `approved-direct-schema`, workflow manuel `nap-authorized-direct-schema.yml`, confirmation `nap-create-livepalmes-direct-tables`. Préparation, sauvegarde du plan et des empreintes, création des seules tables absentes puis vérification exacte. Aucun `ALTER`, aucune ligne insérée par cette opération ; une structure préexistante incompatible bloque.
- Autorisation : profil actif relu sans mise à jour de `lastLoginAt`. Gestion nationale explicite ou administration complète ; gestion régionale limitée aux compétitions non nationales de sa région ; délégations dans la nouvelle table, sans modifier les capacités des comptes existants. Le bureau peut régler les consoles. Les autres rôles sont prévus dans le modèle d'accès ; les consoles terrain historiques ne sont pas redirigées vers les données NAP par ce premier pilote.
- Import : parseurs PDF existants, au maximum 20 documents de 10 Mo, aperçu local, choix des lignes et contrôle serveur avec empreinte avant publication. Une épreuve complète ou une seule série peut être remplacée après confirmation ; les autres séries et l'autre facette (séries/résultats) sont conservées. Résultats sans séries autorisés. Historique structuré, demandes de publication rejouables sans doublon, transaction commune aux tables nouvelles. Les PDF par course ne sont pas stockés ; les PDF complets sont publiés séparément dans un chemin Storage TEST/PROD distinct.
- Temps : valeur reçue conservée, centièmes numériques, `595999` / `59:59.99` = absence de référence (`NULL`), sans écart ni couleur de comparaison. Les vues Direct recalculent scratch et places par catégorie selon les règles confirmées ci-dessus ; les places de la source restent conservées dans les données importées.
- Public : navigation inspirée de French Touch Taranto (jours/tous les jours, épreuves, séries/résultats, vue club), catégories multiples sur les résultats, bouton flottant Actualiser. Aucune minuterie de rafraîchissement. Métadonnées du calendrier relues lors des appels ; données sportives mises en cache par révision publiée, avec mutualisation des appels identiques en cours. Les archives restent consultables quand les consoles sont fermées.
- Références : source officielle NAP ; MPF communes aux deux bassins, sans filtrage sur `length` (distance de la course), selon confirmation explicite du 6 novembre. Bassin 25 m : MPF des catégories présentes, juniors/seniors inclus ; bassin 50 m : RF/RFJ des catégories concernées et MPF des autres catégories. Les RF/RFJ sans champ bassin restent des références 50 m selon la règle validée. Aucun calcul d'homologation.

Budget cible et bornes : ouverture publique ou Actualiser = une requête de métadonnées par clé primaire, puis au plus deux requêtes (programme et participations) lors d'un défaut de cache pour la révision/vue. Un changement d'épreuve ajoute le même lot borné ; filtres locaux sans requête. Au plus 300 épreuves, 1 000 participations par épreuve et 15 000 par compétition (phases comprises). La vue club charge un seul lot borné de la compétition, jamais un appel par course. Références RF/MPF : un appel groupé séparé. Calendrier : une requête groupée supplémentaire pour les liens Direct sur au plus 500 compétitions ; table non installée = aucun lien, sans reconstruction. Profil privé : une lecture Firestore par action ; délégation : une lecture SQL par clé pour un utilisateur non responsable. Métadonnées réutilisées dans la même action ; pas de scan des performances historiques ajouté. Historique : pages de 50, lecture de 51 lignes. Écritures par lots de 200 dans les seules nouvelles tables. Plans SQL, transactions et reprises vérifiés dans MySQL 5.7 isolé ; simulation de 400 appels identiques sans réseau externe. Charge NAP réelle non mesurée. Les cinq tables ont été créées et vérifiées par l'opération privée autorisée, sans ligne métier écrite ; voir les preuves dans `docs/releases/EVOLUTIONS.md`.

Point avant PROD : `tools/nap-backup-config.json` laisse la sauvegarde automatique du dépôt désactivée. Son outil inventorie toutes les tables, sous ses plafonds, mais cette inclusion ne prouve pas une sauvegarde effective des données du Direct. Confirmer dans Infra la couverture de l'hébergeur, la rétention et la restauration des nouvelles tables avant exploitation PROD. Aucune activation de sauvegarde, copie de données ou modification de cette configuration n'est incluse dans le pilote TEST.

Le Direct comprend les consoles :

- Live ;
- Speaker ;
- Juge arbitre ;
- Juge video ;
- Bureau des performances ;
- Secretariat.

Il comprend aussi la publication des series, resultats, medailles, PDF et archives de la competition nationale concernee.

## Pages principales

- `pilotage-livepalmes.html` : accueil et pilotage du Direct ;
- `live.html` ;
- `speaker.html` ;
- `ja.html` ;
- `video.html` ;
- `bureau-perf.html` ;
- `secretariat.html` ;
- `series-public.html` et `resultats.html` : affichage public ;
- `medailles.html` : tableau des medailles ;
- `pdf.html`, `series-pdf.html` et `resultat-pdf.html` : vues PDF.

## Demarrage local

Demarrer le serveur local depuis la racine du depot :

```powershell
node tools/serve-local.js
```

Ouvrir ensuite :

```text
http://localhost:4173/pilotage-livepalmes.html
```

Ce serveur distribue les fichiers du depot sans les publier sur Internet. Il doit rester ouvert pendant le test.

Attention : sauf utilisation explicite des emulateurs prevus, une page locale peut encore se connecter au projet Firebase configure. Ne pas effectuer d'import, de publication ou d'ecriture pendant un simple controle local sans avoir confirme l'environnement et obtenu l'autorisation necessaire.

## Mettre a jour les series

1. Ouvrir le pilotage de LivePalmes Direct avec un compte autorise.
2. Utiliser l'action `Admin series`.
3. Choisir le PDF et le mode d'import adapte.
4. Controler le contenu detecte avant de confirmer l'import.
5. Verifier l'affichage des series et les pages PDF.
6. Publier seulement selon la procedure autorisee.

L'import et la publication de series touchent aux donnees de competition. Ils ne doivent pas etre testes sur Firebase de production sans validation explicite.

## Pages consoles generees

Les pages de roles sont generees depuis `pilotage-livepalmes.html` avec :

```powershell
node tools/build-console-pages.js
```

Pages concernees :

- `live.html` ;
- `speaker.html` ;
- `ja.html` ;
- `video.html` ;
- `bureau-perf.html` ;
- `secretariat.html`.

La verification globale controle leur synchronisation.

## Historique DSQ, forfaits et abandons

Cette fonction concerne uniquement LivePalmes Direct.

L'historique des disqualifications, forfaits et abandons est conserve dans le navigateur pendant l'utilisation. Le bouton `RAZ historique` est disponible sur la console Bureau des performances.

L'export PDF de cet historique est disponible sur les consoles Juge arbitre, Juge video et Bureau des performances.

## Verification et publication

Avant publication :

```powershell
node tools/verify-livepalmes.js
```

Pour un controle navigateur :

```powershell
node tools/verify-livepalmes.js --browser
```

Les tests manuels des series, resultats, PDF, finalistes, medailles et acces Firebase restent necessaires selon le changement realise.

La publication doit suivre `docs/agents/PUBLICATION.md`. Aucun deploiement Firebase ou envoi vers GitHub ne doit etre effectue sans autorisation explicite.
