# LivePalmes Direct

<!-- description: Périmètre, démarrage local, publication et fonctions propres aux consoles du dispositif LivePalmes Direct. -->

## Perimetre

LivePalmes Direct accompagne les compétitions piscine de tous niveaux issues du calendrier NAP. Le nouveau parcours multi-compétitions est publié sur TEST ; le dispositif national historique conserve ses pages et ses protections. La préparation des engagements reste dans le Portail LivePalmes.

## Direct multi-compétitions — livraison TEST du 6 novembre 2026

Lot regroupé publié sur TEST le 6 novembre à 23 h 43 (Paris), candidat `5b76e1e37eddba618b25c41c92a8168446fe4115`, [publication commune réussie](https://github.com/ffessmnap/LivePalmes/actions/runs/42306711779). Contrôles connectés : quinze fichiers identiques au candidat, public à 1 280/390/320 px sans débordement, 119 fonctions actives avec toutes leurs révisions conservées. Tests de publication sur fixtures uniquement, aucune écriture métier réelle. [Preuves et limites](releases/EVOLUTIONS.md) ; recette de cette nouvelle version attendue.

### Lecture mobile, références et remplissage TXT — livré sur TEST, recette attendue

Complément visuel approuvé par Antoine pendant la livraison précédente : reprendre l'ancienne palette sur le seul libellé de catégorie, dans les séries et les résultats. Le code reçu reste inchangé ; codes WinPalme et libellés déjà connus sont associés à leurs teintes historiques, inconnus neutres. Pas de calcul d'âge ou de reclassement, pas de lecture supplémentaire, pas de changement backend. Pastille compacte avec texte foncé, hauteur inchangée et surbrillance du club conservée ; largeur mobile de catégorie adaptée aux codes à quatre caractères.

Complément TXT précisé ensuite : ignorer les lignes ne contenant que des séparateurs (`;;`) et celles dont le premier champ est `0000` ou `000000` (au moins quatre zéros), sans ignorer un vrai temps `002500` après un numéro de ligne. Les lignes de texte hors format de résultat sont également ignorées ; un numéro de ligne suivi de séparateurs reste contrôlé (temps, statut, passages et doublons contradictoires). Un fichier ne contenant que ce remplissage ne produit ni publication ni avertissement ; la surveillance reste active et traite une version ultérieure contenant des résultats après les deux lectures stables habituelles.

Dernier complément explicitement demandé : vérifier les codes H40+/H60+ sur mobile, regrouper les références sous un bouton Records et réserver RF/RFJ au bassin 50 m avec chronométrage électronique. Le champ calendrier `competition.timingType`, déjà lu et exposé par le service Direct, pilote ce filtre local ; manuel ou inconnu = MPF de toutes les catégories présentes, seniors/juniors compris, comme en bassin 25 m. Aucun nouveau champ, appel ou calcul sportif. Budget inchangé : une lecture Records existante à l'ouverture, zéro requête pour déplier le panneau ou changer de catégorie.

### Reprise TXT et accès public — livré sur TEST, recette attendue

Antoine confirme le 6 novembre que la remise à zéro et l'import précédent fonctionnent ; le refus de reprise provenait de la première ligne restée à 1 au lieu de 2. Nouveau lot autorisé : mémorisation locale des premières lignes et associations par origine, compte et compétition, revalidation contre le programme courant, confirmations toujours décochées et dossier choisi explicitement. Aucun préfixe à saisir : détection des noms `<préfixe>_AS_<session>_<épreuve>_<série>_<course>.txt`, y compris dossier initialement vide ; mélange de compétitions toujours bloquant.

Les lignes strictement identiques répétées dans un TXT sont ignorées (sept champs comparés après séparation et retrait des espaces périphériques). Un même numéro avec des contenus différents reste bloqué. Un TXT incompatible est signalé avec son nom et les lignes TXT, après décalage et importées ; les autres TXT stables continuent, par lots de 100, sans écriture du fichier bloqué. Les corrections compatibles sont reprises automatiquement ; erreur réseau, perte d'accès au dossier ou incohérence serveur restent bloquantes avec reprise explicite. Une correction du seul temps ne change pas l'empreinte des séries.

Budget inchangé : réglages et contrôles locaux = zéro lecture serveur ; ouverture de dossier = un `watchContext` borné existant, lot valide = `previewBatch` puis `publishBatch` existants, aucun appel pour un TXT bloqué localement et aucun appel par nageur. Aucune modification backend, schéma, droit ou donnée native. Recette du bureau sur ordinateur ; public sur ordinateur et mobile.

Colonne publique toujours « Pl. », avec nom accessible et titre précisant scratch ou catégorie. Calendrier et fiche compétition : pastille LivePalmes Direct, pulsation du seul point aux dates de compétition active non annulée ; archive et dates hors compétition fixes, préférence de réduction des animations respectée. Aucun rafraîchissement automatique ajouté.

### Remise à zéro et import des séries par session — livré sur TEST, recette attendue

[PR #742](https://github.com/ffessmnap/LivePalmes/pull/742), [publication TEST contrôlée](https://github.com/ffessmnap/LivePalmes/actions/runs/42292683226) du 6 novembre : candidat `90b77cd785746cb703fdbc2136650c444f4bb2f4`, Hosting `9e1c741fe1a6e453`. CI complète, vrais DELETE en MySQL 5.7 isolé et parcours du bureau sur données fictives réussis ; neuf fichiers servis identiques et page publique vérifiée à 1 280/390/320 px. Aucune remise à zéro ni publication de PDF réelles pendant les contrôles. Activation et accès préservés par les essais ; recette authentifiée par le pilote encore attendue.

Antoine demande l'effacement définitif des imports du Direct, sans historique conservé, et confirme le maintien de l'activation et des accès. Le bouton « Tout réinitialiser » concerne la seule compétition choisie et l'environnement serveur. Confirmation par saisie de SUPPRIMER, arrêt de la veille, contrôle des droits Storage sans les modifier, puis suppression des participations, épreuves, PDF du préfixe dédié (anciennes versions incluses), historique et reçus. Le calendrier, les performances officielles, les comptes, les délégations et les réglages du Direct sont conservés. Aucune remise à zéro réelle n'est comprise dans les contrôles de livraison.

La suppression est reprise par étapes explicites : état interne `resetting`, page publique temporairement masquée, autres écritures bloquées, verrou de configuration et version à chaque étape. Un marqueur opérationnel temporaire dans la table de publications ne contient que phase, compteurs et réglages à restaurer ; aucune copie d'import et aucun marqueur ne subsistent après réussite. Une coupure permet Reprendre la suppression après actualisation. Les versions/révisions restent croissantes pour refuser les demandes anciennes et invalider les caches. Aucune nouvelle table/colonne, règle Firebase ou modification de capacité.

Budget : début = profil privé et éventuelle délégation existants, métadonnées natives par clé, verrou de configuration et un test IAM Storage de lecture avant mutation. Étape = mêmes contrôles, un marqueur par clé, au plus 51 objets Storage listés dans le préfixe environnement/compétition et 50 suppressions (cinq simultanées maximum), au plus 1 000 participations, 301 épreuves et 1 000 entrées d'historique supprimées par requête bornée. Pas de sélection des anciennes données par ligne ni de scan global NAP/Storage. Le bureau limité à la reprise lit trois lots SQL (métadonnées/configuration/marqueur) au lieu du programme complet. Une action du navigateur est bornée à 200 étapes, puis reprise explicite si nécessaire. Hors réinitialisation, les budgets des lectures publiques/privées restent inchangés.

Le bouton Importer les séries (PDF) est dans le bloc de compétition. Le choix de fichiers lance la lecture locale ; l'import PDF de résultats n'est plus proposé dans le bureau. Les exports XML restent hors périmètre. Une option par fichier propose de publier le PDF complet choisi après publication de toutes ses épreuves, sans deuxième sélection de fichier ; un échec laisse une reprise PDF sans remettre en cause les séries publiées. Le dépôt manuel des PDF complets reste disponible. Fichiers limités à 20 × 10 Mo ; publication optionnelle = au plus un appel `document` par fichier, jamais par course. Envoi séquentiel, identifiant stable par nom de fichier et session pour conserver plusieurs PDF tout en remplaçant un fichier corrigé. Le verrou de compétition précède le téléversement pour empêcher une course avec la remise à zéro.

Filtres locaux par session/date dans le suivi et les aperçus, présents seulement à partir de deux sessions. Le filtre d'aperçu borne sélection globale, vérification et publication à la session visible ; changer de filtre invalide la vérification. Aucune épreuve cachée n'est publiée. Un PDF multisession attend toutes ses épreuves avant sa publication complète. Filtrer ne lit aucune donnée supplémentaire et n'arrête pas la veille.

### Passages à la ligne et bureau compact — livré sur TEST, recette attendue

[PR #740](https://github.com/ffessmnap/LivePalmes/pull/740), [publication TEST contrôlée](https://github.com/ffessmnap/LivePalmes/actions/runs/42280483794) du 6 novembre : candidat `722943d59f0c895ad46cdf256e57a260d29b582d`, Hosting `b04f8a27133cd6f0`. CI complète et tests locaux réussis ; dix fichiers servis identiques, page publique vérifiée à 1 280/390/320 px. Les 119 révisions serveur sont conservées. Aucun résultat réel publié pendant les contrôles ; recette WinPalme authentifiée encore attendue.

Lot autorisé par Antoine : détail des passages sous chaque ligne comme French Touch, club sur huit caractères, bandeau public avec dates, bureau compact et décalage configurable entre lignes TXT et PDF. Code exclusivement client ; aucune nouvelle table/colonne, fonction serveur, permission, donnée native ou règle de classement. Budget inchangé : déplier un détail, calculer un split ou traduire une ligne réutilise les données reçues et ne déclenche aucun appel.

Le bureau masque le bloc saison/compétition après choix et propose « Changer de compétition ». Surveillance immédiatement sous l'en-tête de compétition, avant les compteurs ; import PDF replié quand les épreuves existent. Une erreur de veille affiche une alerte persistante et l'état « En pause », avec reprise explicite.

Numérotation : l'informaticien renseigne la première ligne du TXT et celle des séries, identiques par défaut (1/1). Réglage 1/2 = +1 : TXT 1–6 associé aux lignes 2–7 des séries. Valeurs entières 0–20, traduction vérifiée avant le rapprochement et les contrôles serveur existants. Pas de décalage déduit automatiquement ; aucun nageur, club ou regroupement ne peut être deviné dans un TXT sans identité. Réglage verrouillé pendant la veille, reconfiguration via Choisir le dossier. Les résultats publiés conservent les numéros physiques des séries et leurs identifiants source ; aucune réécriture des séries ni des anciens résultats.

Affichage des passages : tableau Passage/Cumul/Split sous le résultat, uniquement si des passages sont disponibles, également utilisé dans la fiche. Arrivée ajoutée au détail lorsqu'elle est connue pour le dernier intervalle. Relais : split par distance de relayeur, calculé seulement si les deux bornes nécessaires sont connues ; dernier 100 m inclus pour un 4 × 100 complet. Passage manquant ou résultat DSQ sans temps final : pas de split inventé. Aucun rang de passage calculé. Dates et huit caractères du club restent lisibles sur téléphone, avec défilement interne du tableau si nécessaire.

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

Classements confirmés par Antoine : scratch par temps croissant, mêmes temps = mêmes places puis saut (1, 2, 2, 4), forfait/abandon/DSQ sans rang. Avec une ou plusieurs catégories cochées, la colonne « Pl. » (nom accessible « Place dans la catégorie ») donne le rang de chaque nageur dans sa propre catégorie, calculé sur tous les résultats publiés de cette catégorie avant filtrage. Tri commun par temps ; sans filtre, place scratch. Une catégorie absente reste sans place catégorie. Le calcul évolue avec les publications et corrections ; le compteur de publications reste global. Recette authentifiée de la surveillance TEST à effectuer par Antoine, sans publication réelle par les tests automatisés.

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
- Références : source officielle NAP ; MPF communes aux deux bassins, sans filtrage sur `length` (distance de la course), selon confirmation explicite du 6 novembre. Bassin 25 m ou 50 m sans chronométrage électronique déclaré : MPF des catégories présentes, juniors/seniors inclus ; bassin 50 m électronique : RF/RFJ des catégories concernées et MPF des autres catégories. Les RF/RFJ sans champ bassin restent des références 50 m selon la règle validée. Aucun calcul d'homologation.

Budget cible et bornes : ouverture publique ou Actualiser = une requête de métadonnées par clé primaire, puis au plus deux requêtes (programme et participations) lors d'un défaut de cache pour la révision/vue. Un changement d'épreuve ajoute le même lot borné ; filtres locaux sans requête. Au plus 300 épreuves, 1 000 participations par épreuve et 15 000 par compétition (phases comprises). La vue club charge un seul lot borné de la compétition, jamais un appel par course. Références RF/MPF : un appel groupé séparé. Calendrier : une requête groupée supplémentaire pour les liens Direct sur au plus 500 compétitions ; table non installée = aucun lien, sans reconstruction. Profil privé : une lecture Firestore par action ; délégation : une lecture SQL par clé pour un utilisateur non responsable. Métadonnées réutilisées dans la même action ; pas de scan des performances historiques ajouté. Historique : pages de 50, lecture de 51 lignes. Écritures par lots de 200 dans les seules nouvelles tables. Plans SQL, transactions et reprises vérifiés dans MySQL 5.7 isolé ; simulation de 400 appels identiques sans réseau externe. Charge NAP réelle non mesurée. Les cinq tables ont été créées et vérifiées par l'opération privée autorisée, sans ligne métier écrite ; voir les preuves dans `docs/releases/EVOLUTIONS.md`.

Préparation PROD autorisée le 6 novembre pour Paris 5220. Le contrat `direct-production-policy.py` reste lié au candidat `5b76e1e`, à sa preuve TEST et à la dernière PROD. Une comparaison structurelle vérifie les gestionnaires et initialisations conservés, puis limite la publication au nouveau gestionnaire Direct et au lecteur public. La configuration du lecteur reste conservée et les témoins mail et automates sont comparés avant et après.

La sauvegarde générale `tools/nap-backup-config.json` reste désactivée. Le workflow dédié `livepalmes-direct-data.yml` sauvegarde uniquement les lignes `production` des cinq tables Direct. Snapshot transactionnel borné à 200 000 lignes par table et 64 Mio, chiffré avec le mécanisme existant, rouvert, comparé et restauré dans MySQL 5.7 isolé. Les artefacts chiffrés sont conservés 14 jours. Conserver la clé backend d'origine pendant cette rétention, comme pour le retour arrière du code. Une restauration métier réelle exige une demande explicite et une revue de dérive.

Pour les sauvegardes ponctuelles de démarrage, `direct-backup-transfer.js` utilise l'accès Google existant de l'opérateur, puis chiffre le snapshot pour les clés publiques de sauvegarde CI. Le workflow le déchiffre, le contrôle et le rechiffre sous son format habituel, avec restauration isolée. Le mot de passe NAP n'est pas transféré à la CI. Ce transfert de démarrage est limité à 50 Ko chiffrés et trente minutes. La sauvegarde est ponctuelle, son activation reste manuelle. L'activation métier est limitée à Paris 5220 après vérification de ses métadonnées et des droits du compte national existant, avec les seules tables Direct.

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
