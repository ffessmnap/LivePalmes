# LivePalmes Direct

<!-- description: Périmètre, démarrage local, publication et fonctions propres aux consoles du dispositif LivePalmes Direct. -->

## Perimetre

LivePalmes Direct accompagne les compétitions piscine de tous niveaux issues du calendrier NAP. Le nouveau parcours multi-compétitions est préparé sur TEST ; le dispositif national historique conserve ses pages et ses protections. La préparation des engagements reste dans le Portail LivePalmes.

## Direct multi-compétitions — préparation du 6 novembre 2026

Maquette validée par Antoine le 6 novembre 2026, intégration demandée jusqu'à publication TEST. Le public et le bureau utilisent les mêmes composants que la maquette : scratch automatique résultats/engagements, séries et horaires, fenêtres nageurs, club mis en évidence, navigation colorée compacte et contrôle groupé des imports. Une seule journée masque les choix de jour. Un relais ne nécessite aucune année de naissance ; 595999 reste sans référence et sans comparaison.

Le bureau appelle `previewBatch` puis `publishBatch` : une empreinte couvre toute la sélection et la version de compétition, les remplacements sont confirmés ensemble, puis une transaction publie toutes les épreuves et une seule nouvelle révision publique. Un échec annule le lot entier. La reprise utilise un identifiant stable de sélection et un condensat du contenu, sans double écriture après une réponse perdue. Un chevauchement de documents ou des participations ambiguës bloque l'aperçu. Bornes : 300 groupes, 1 000 participations par épreuve et 15 000 par compétition. Les images avant écriture sont limitées au périmètre de chaque groupe.

Les horaires par série sont validés puis stockés dans le JSON existant `livepalmes_direct_events.publication_state_json.heatSchedule`, avec les deux indicateurs de visibilité. Aucune table ni colonne supplémentaire, aucune migration ou reprise des données déjà importées. `scheduled_at` conserve le départ de l'épreuve ; importer des résultats sans horaires conserve ceux des séries. Les séries déjà importées avec l'ancien adaptateur devront être réimportées par le bureau pour récupérer les horaires perdus ; les PDF par course n'étaient pas conservés.

Budget supplémentaire : aperçu groupé = un profil Firebase et une délégation SQL si nécessaire, métadonnées natives par clé, une configuration, un programme borné et un lot de participations borné (pas de lecture par épreuve). Publication = même contrôle, une lecture de reçu, un verrou de configuration et une agrégation bornée finale ; écritures dans les seules tables Direct, par paquets de 200 participations et journaux par groupe. Les horaires sont lus avec le programme existant, sans requête additionnelle. Fenêtre nageur et choix du club = aucun appel à l'ouverture de page, puis un appel au lot existant `view=club`, plafonné à 15 000 participations et mutualisé par révision ; Actualiser invalide le cache local. Aucune minuterie, aucun listener.

Contrôles : tests de modèle, de transactions et de budgets hors réseau ; deux suites navigateur à 305, 320, 390 et 1 280 px selon le parcours, sans HTTPS externe ; MySQL 5.7 isolé et vérification globale requis dans la CI avant intégration. Le dernier essai global local s'arrêtait sur Bash absent, sans preuve globale complète. Aucun test connecté ne publie de données réelles.

Pour réutiliser la maquette hors connexion métier : `node tools/preview-direct.js`, puis `http://127.0.0.1:8765/` et `/bureau`. Données fictives par défaut ; publication simulée dans le stockage local du navigateur, effaçable avec Réinitialiser les exemples. Les outils de maquette restent exclus de Hosting. Contrôle dédié : `node tests/direct-preview-browser-tests.js`.

- Gestion : `direct-admin.html`, connexion LivePalmes habituelle, sélection d'une compétition du calendrier, activation et bureau des performances. Public : `direct.html?id=5220`, lien calculé depuis l'identifiant NAP, sans colonne ajoutée à `competitions`.
- Stockage : cinq tables InnoDB `livepalmes_direct_competitions`, `livepalmes_direct_events`, `livepalmes_direct_entries`, `livepalmes_direct_publications`, `livepalmes_direct_access`. Chaque clé et lecture comprend l'environnement serveur `test` ou `production`. Aucun déplacement, modification ou effacement de données natives. Les identités et clubs importés sont des instantanés ; les liens natifs éventuels n'autorisent aucune écriture de fiche ou de performance.
- Création : opération privée TEST `approved-direct-schema`, workflow manuel `nap-authorized-direct-schema.yml`, confirmation `nap-create-livepalmes-direct-tables`. Préparation, sauvegarde du plan et des empreintes, création des seules tables absentes puis vérification exacte. Aucun `ALTER`, aucune ligne insérée par cette opération ; une structure préexistante incompatible bloque.
- Autorisation : profil actif relu sans mise à jour de `lastLoginAt`. Gestion nationale explicite ou administration complète ; gestion régionale limitée aux compétitions non nationales de sa région ; délégations dans la nouvelle table, sans modifier les capacités des comptes existants. Le bureau peut régler les consoles. Les autres rôles sont prévus dans le modèle d'accès ; les consoles terrain historiques ne sont pas redirigées vers les données NAP par ce premier pilote.
- Import : parseurs PDF existants, au maximum 20 documents de 10 Mo, aperçu local, choix des lignes et contrôle serveur avec empreinte avant publication. Une épreuve complète ou une seule série peut être remplacée après confirmation ; les autres séries et l'autre facette (séries/résultats) sont conservées. Résultats sans séries autorisés. Historique structuré, demandes de publication rejouables sans doublon, transaction commune aux tables nouvelles. Les PDF par course ne sont pas stockés ; les PDF complets sont publiés séparément dans un chemin Storage TEST/PROD distinct.
- Temps : valeur reçue conservée, centièmes numériques, `595999` / `59:59.99` = absence de référence (`NULL`), sans écart ni couleur de comparaison. Aucun classement sportif recalculé ; les places publiées restent celles de la source, y compris après filtre.
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
