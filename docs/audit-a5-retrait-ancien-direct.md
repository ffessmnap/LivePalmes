# Retrait de l’ancien Direct — A5

<!-- description: Accord de retrait complet de l’ancien Direct, préparation de l’inventaire borné et conservation des composants du nouveau Direct. -->

## Accord et limites

Le 19 novembre 2026, Antoine autorise le retrait A5 jusqu’en PROD après réussite des contrôles TEST. Les anciennes consoles ne seront plus utilisées. Il demande ensuite de supprimer aussi les anciennes pages de consultation, sans redirection, et les PDF archivés des compétitions de cet ancien dispositif. Aucun nouvel archivage n’est demandé. Les données et documents du nouveau Direct et du calendrier NAP restent hors nettoyage.

L’accord porte sur l’ancien dispositif national : pilotage, six consoles générées, séries, résultats, médailles et trois visionneuses historiques. Les lecteurs d’import et composants de rendu consommés par le nouveau Direct restent conservés. La référence de travail est le dépôt hors OneDrive.

## Inventaire préalable

La session Google locale a expiré. Le workflow manuel `a5-legacy-direct-inventory.yml` utilise donc l’identité de sauvegarde existante, après authentification de la CI main. Aucun nouveau droit, donnée modifiée ou PDF téléchargé. Budget : 24 requêtes au plus, 400 métadonnées d’archives au plus et 8 000 métadonnées de versions Storage au plus ; aucun appel NAP. Toute pagination non terminée ou réponse hors périmètre bloque.

Les seules cibles découvertes sont les dossiers `competitions/livepalmes-active` et `competitions/livepalmes-test` des deux projets Firebase, et leurs préfixes `competition-pdfs/{identifiant}/` dans les deux buckets existants de chaque environnement. Les métadonnées d’archives sont limitées à la compétition, la date technique et le compteur ; aucune identité de nageur ni contenu de PDF n’est exporté. L’inventaire privé sert à qualifier les cibles ; sa seule production ne prouve aucune suppression.

## Inventaire vérifié et accords complémentaires

La [PR 1028](https://github.com/ffessmnap/LivePalmes/pull/1028) est intégrée en `7d2ee6d9`, après CI PR et main réussies. Le premier inventaire `44519695050` a été refusé avant accès Google, la CI main n’étant pas terminée. Le [nouveau run 44520316068](https://github.com/ffessmnap/LivePalmes/actions/runs/44520316068) réussit ; workflow, commit et digest du ZIP sont authentifiés par le lecteur existant. Aucun dossier `resultArchives` n’est présent dans les quatre cibles. Le seul objet Storage courant/non courant inventorié appartient au préfixe historique de PROD. Les métadonnées identifient Limoges 2026, et non 2025.

Antoine confirme le nettoyage de « l’ancien Direct de 2026 et ses essais », puis autorise explicitement la fermeture des seuls dossiers `livepalmes-active`/`livepalmes-test`, des callables `verifyPin`, `setRolePins`, `storeCompetitionPdf`, `deleteCompetitionPdf` et du déclencheur `syncOfficialResultToPublicIndex`. Références humaines : chat `01a1f291-e421-7240-9dc6-92eced9200de`, messages `01a1f3a2-6ad4-7d30-a382-a2492cff426e` (livraison conditionnelle), `01a1f3a3-a8ed-7242-b3a1-6674f3aae58f` (pages et PDF), `01a1f3b3-4f98-7e01-8b85-0edeb0917341` (2026), `01a1f3b6-b7e6-7bc3-916e-f998fce61e78` (accès techniques).

## Candidat de retrait en préparation

Treize anciennes pages, leur générateur et les sept scripts d’entrée sont retirés du candidat local, sans redirection. Les autres bibliothèques et leurs tests restent conservés ; les consommateurs du nouveau Direct et le module MPF `performances/public/app.js` sont attestés par leurs blobs Git dans le contrat de périmètre. Les quatre callables historiques restent déclarés pour renvoyer un refus : aucune nouvelle fonction ni suppression distante implicite. `setRolePins` conserve son contrôle de capacité actuel (au plus une lecture de profil par appel) ; les trois autres refus et le déclencheur n’accèdent à aucune donnée. Aucun droit, compte, claim, secret, table NAP ou calcul sportif modifié.

Le delta de règles est limité aux trois prédicats historiques et aux secrets des deux anciens dossiers. Les accès au portail et au signal privé NAP restent identiques. Tous les anciens tests Firestore sont conservés sur leur instantané antérieur ; les règles courantes ont une nouvelle matrice de refus, avec grants valides, comptes administratifs, tous les rôles, lectures et écritures, ainsi que les recettes du portail et du temps réel actuel. Les deux suites utilisent des projets d’émulateur distincts et les jetons fictifs portent explicitement l’audience de test déjà autorisée ; aucune règle n’est modifiée pour les besoins du banc. Les 34 scénarios réunis passent localement.

La sélection serveur statique sur la base courante calcule exactement les cinq traitements historiques. Les origines réellement déployées et les permissions doivent encore être confrontées à cette sélection ; aucune réduction manuelle n’est permise. La découverte des capacités réutilise les deux identités existantes de chaque environnement, douze appels administratifs au maximum, aucune attribution ou écriture.

## Contrôles du candidat local

Les six recettes des règles courantes passent sur l’émulateur : matrice de refus, annuaire et signal privé avec reprise/révocation. Les premiers essais ont révélé un décalage d’audience de projet fictif puis une course de nettoyage du banc après fermeture des listeners ; le projet d’émulateur autorisé et l’ordre des scénarios sont corrigés, sans modifier le signal ni les règles du nouveau Direct. Le journal final est privé. Les tests des refus serveur, des capacités en lecture seule, du delta exact règles/Hosting, des dépendances serveur, du shell public, du portail et des MPF passent localement.

Le lancement local du navigateur sort au démarrage avec le code 0, avant toute recette ; aucun succès navigateur local revendiqué. Les réponses HTTP sont vérifiées séparément hors services réels ; la recette navigateur reste obligatoire dans le runtime CI figé. Aucun test existant retiré ni ignoré pour ce blocage local.

La [première CI de la PR 1029](https://github.com/ffessmnap/LivePalmes/actions/runs/44524149405) conserve deux échecs : nettoyage concurrent du même projet fictif entre suites Firestore, et test de cache de l’ancien contrat du 10 novembre lisant les deux scripts supprimés. Le navigateur obligatoire passe. Les corrections isolent les projets de données en conservant l’audience fictive prévue et remplacent les fichiers réels du seul test historique par des octets synthétiques ; vérifications de contenu, cache et ancienne copie retirée restent conservées et renforcées. Les 34 tests Firestore et les onze tests du contrat historique passent localement après correction, sans modifier ce contrat ni le code de ses writers.

La seconde [CI 44525338475](https://github.com/ffessmnap/LivePalmes/actions/runs/44525338475) réussit pour l’application et le navigateur. Le seul échec de publication restant vient du test App Check historique, qui comparait son ancienne paire complète à la configuration courante après retrait des alias. Il lit désormais le candidat historique déjà figé et contrôle séparément que la CSP courante du portail reste identique à celle validée. Aucun contrat, empreinte ou assertion de refus élargi.

## Intégration et préparation TEST

La [CI finale 44526938908](https://github.com/ffessmnap/LivePalmes/actions/runs/44526938908) réussit pour les quatre contrôles obligatoires. La PR 1029 est intégrée en `8dc6cfa6`, puis la [CI main 44527764893](https://github.com/ffessmnap/LivePalmes/actions/runs/44527764893) réussit. Cela prouve le code intégré, pas son déploiement.

Le [contrôle des capacités 44528539431](https://github.com/ffessmnap/LivePalmes/actions/runs/44528539431) échoue avant authentification Google pour trois lecteurs : la version Node non fixée du runner ne correspond pas au runtime de la preuve CI. Le lecteur PROD Hosting seul passe ; le run global échoué ne sert pas de preuve de publication. Les deux workflows A5 de lecture seule installent désormais exactement Node 22.23.5 comme la CI avant réutilisation. Aucun contrôle de provenance n’est assoupli.

Le raccord TEST réutilise le writer `standard` de sources/labels avec un marqueur fermé A5 : cinq fonctions exactes, autorisation humaine spécifique, baseline TEST authentifiée du run 44508423630 et code applicatif figé en `8dc6cfa6`. Tout ajout applicatif ultérieur bloque. Les configurations protégées hors delta A5 restent comparées. L’éligibilité ordinaire conserve ses exclusions. Le mode manuel `approved_a5_retirement` de TEST commun exige Hosting seul, sans autre accord sensible, automatisme ou suivi vers un autre main. Les cinq sources doivent être attestées et la sélection automatiquement vide avant la seule fermeture des anciens dossiers Firestore, puis Hosting. Aucun index ni donnée n’est écrit par ce raccord.

Les primitives de nettoyage restent hors exécution : elles réutilisent le chiffrement A2, vérifient la récupération et les sommes des PDF, gardent les `performanceData`, bornent lectures et volumes aux deux anciens dossiers et à leurs quatre préfixes par projet. Les suppressions exigent les versions exactes (`updateTime`/génération), refusent toute dérive ou cible nouvelle et relèvent les échecs partiels. Seules des fixtures ont été utilisées ; le pilote protégé et les permissions réelles restent à qualifier avant toute suppression.

## Identités qualifiées avant les Rules

La PR 1030 est intégrée en `a64e3a1f` après CI PR 44529250074 et main 44529954572 réussies. Le [contrôle 44530725760](https://github.com/ffessmnap/LivePalmes/actions/runs/44530725760) réussit pour les quatre acteurs ; ses artefacts sont authentifiés. Sur TEST, backend possède les lectures et écritures Rules ainsi que les accès de nettoyage ; Hosting ne possède pas les droits Rules. Sur PROD, Hosting possède les droits Rules, backend les suppressions Firestore et celles du bucket public. Les deux acteurs PROD n’ont aucun droit sur le bucket Storage par défaut, inventorié vide pour les anciens préfixes ; sa lecture complète restera au lecteur A2 avant et après nettoyage. Aucun IAM modifié.

Le raccord TEST conserve donc backend jusqu’à la fermeture Rules. L’équivalence de sources réutilise la sélection automatiquement vide et les empreintes sur les origines installées, avec leurs reçus authentifiés : un raccord d’outillage ultérieur ne force pas une seconde publication des mêmes cinq sources. Le code applicatif reste figé en `8dc6cfa6`. Le lancement des seules sources TEST est `44530741319` ; son résultat reste à confirmer.

## Sources TEST attestées, lecture des reçus à isoler

Le [run sources TEST 44530741319](https://github.com/ffessmnap/LivePalmes/actions/runs/44530741319) réussit ; artefact authentifié, cinq archives gérées relues, configurations et autres fonctions identiques, Hosting et états techniques conservés. Le correctif d’identité de la PR 1031 est intégré en `bd1ad296` après CI PR 44531391993 et main 44532502516 réussies.

[TEST commun 44533558660](https://github.com/ffessmnap/LivePalmes/actions/runs/44533558660) s’arrête avant Rules et Hosting, sans nouvelle publication de sources. Le lecteur regroupé avait déjà authentifié les cinq reçus A5, puis un lecteur historique sans rapport échoue sur un ancien objet Git absent : son exception faisait perdre le résultat du groupe entier. La reprise isole la lecture des seuls cinq reçus installés en `a64e3a1f` et conserve toutes leurs vérifications existantes (provenance, manifeste fermé, générations, archives et révisions exactes). Aucun reçu arbitraire ou simple label n’est accepté ; absence de preuve, révision changée ou code différent bloque toujours Hosting seul. Les anciens lecteurs et leurs contrôles restent conservés.

TEST commun A5 vérifiera aussi les 22 anciennes pages/alias/scripts en HTTP 404 sans redirection et huit fichiers préservés identiques au candidat. Lectures statiques bornées à 90 requêtes avec propagation CDN, aucun script ou parcours métier exécuté. La preuve dédiée reste séparée de la preuve des Rules et de celle du déploiement.

## État

Inventaire initial vérifié et retrait applicatif intégré ; raccord TEST et nettoyage borné en préparation. Aucun nettoyage ni déploiement A5 réalisé. TEST et PROD restent à livrer. Les liens, identifiants, fonctions installées, règles et sauvegardes seront vérifiés avant leurs opérations respectives. Le retrait des visionneuses ne ferme A4 sur ce périmètre qu’après preuve d’absence de leurs URL et scripts publiés ; le lecteur PDF d’import du nouveau Direct reste distinct.
