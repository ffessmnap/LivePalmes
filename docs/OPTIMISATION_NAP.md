# Optimisation des lectures NAP

<!-- description: Budgets actuels NAP, mesures après bascule et suivi des optimisations ; remplace les recommandations Firestore historiques. -->

## Lots regroupés : accueil et contexte des temps — 30 octobre 2026

Antoine a approuvé le contexte des temps, puis explicitement le regroupement avec l'accueil plus rapide, y compris l'authentification et les Cloud Functions jusqu'à TEST. Aucune écriture réelle de base ni aucun mail pendant la recette.

| Parcours | Avant | Après et limites |
| --- | --- | --- |
| Retour sur une session utilisant le profil serveur | Renouvellement forcé du jeton, puis lecture du profil serveur | Jeton encore valable réutilisé ; expiration gérée par Firebase ; même lecture obligatoire du profil serveur avant accès. Jusqu'à un échange Auth évité, aucun document Firestore économisé : un profil lu à chaque démarrage. Connexion explicite et consommateurs historiques fondés sur les claims : renouvellement forcé conservé. |
| Accueil club après profil | Calendrier et effectif préchargés immédiatement dans le rendu du profil | Préchargements après une opportunité de peinture puis une tâche différée ; mêmes chargeurs/cache/mutualisation et zéro lecture ajoutée. Génération, identité, club et droit vérifiés avant lancement. Un clic précoce continue à charger son écran normalement. |
| Aperçu piscine 1–50 nageurs | Plafond 20 SELECT hors accès | Plafond **16 SELECT**, dont au plus dix pour la compétition ; 14–16 dans les cas maximaux simulés. Le contexte n'interroge plus tarifs, programme détaillé, sessions et lignes WinPalme. |
| Historique des temps connus | Plafond 20 SELECT hors accès | Plafond **16 SELECT** ; 15/16 dans les cas maximaux simulés. Inscriptions multiples et seules courses enregistrées/demandées conservées. |

Les préchargements NAP club conservent un SELECT par saison (501 événements sentinelle au plus, refus au-delà de 500) et un SELECT d'effectif (801 nageurs sentinelle, refus au-delà de 800), plus les contrôles d'accès existants. Selon la période, une ou deux saisons sont demandées : deux ou trois SELECT métier après l'affichage, comme avant. Le compteur des demandes, réservé aux profils habilités, conserve ses agrégations et contrôles et n'est pas modifié par ce lot. Retour/rafraîchissement : mêmes règles de cache des chargeurs ; aucune nouvelle durée de cache ni donnée d'autorisation persistée.

Le contexte des temps économise trois SELECT systématiques et un quatrième si un programme WinPalme existe, jusqu'à 1 934 lignes acceptées de tarifs/programmes/sessions en moins ; ce plafond n'est pas un volume réellement observé. Les requêtes restantes sont un sous-ensemble inchangé du lecteur complet, avec mêmes index et bornes. Les aperçus gardent leurs lots de 50 et historiques de 20 000 lignes maximum/2 000 par nageur ; une clé valide en cache coûte zéro RPC. Après invalidation, prochaine demande fraîche sous le nouveau plafond. L'ouverture du dossier complet reste à 26 SELECT métier maximum ; fiches, écritures et contrôles de qualification conservent le lecteur complet et leurs empreintes. Aucun contexte partiel ni empreinte partielle n'est renvoyé comme fiche modifiable par les endpoints de temps.

Contrôles ciblés hors réseau : égalité de toutes les entrées sportives et résultats, lecteur complet/frais/empreintes conservés, autorisation avant lectures dépendantes, erreurs et bornes ; vraie chaîne d'historique, aperçus 1/50, participation et qualifications ; session restaurée attendant le serveur, claims en cache incapables d'élargir les droits, profil inactif/absent/panne, connexion explicite et mode historique ; rendu réel du profil et ordonnancement frame/tâche, compte/club/droit/déconnexion et appels simultanés. Navigateur à 1280/390/320 px avec vrais modules, SDK/RPC fictifs et réseau externe bloqué : aucun accueil privé avant le profil, accueil visible avant les deux préchargements et aucun débordement. Aucun chronométrage de session réelle ni gain en secondes annoncé : `getCurrentAccessUser` peut mettre à jour `lastLoginAt`, il n'est pas invoqué pendant cette recette. Les démarrages d'instances et le réseau restent des coûts distincts.

## Deuxième lot portail — 30 octobre 2026

Périmètre explicitement approuvé par Antoine, Cloud Functions et livraison TEST comprises, sans modification de la base ni mail réel : réparer l'historique des temps avant d'optimiser l'annuaire national.

- **Historique des temps connus** : le premier lot avait remplacé le dossier complet par un contexte d'aperçu ne contenant ni identifiants d'inscription ni courses enregistrées. Le service d'historique les utilisait encore ; l'erreur `undefined.filter` est reproduite hors réseau. Seul ce parcours demande maintenant les inscriptions complètes et les courses du nageur concerné. Les aperçus groupés gardent leurs trois lectures de contexte et leur budget de 18–20 SELECT.
- **Budget historique** : quatre SELECT de contexte au plus (une identité, 800 inscriptions, 20 déclarations de chef, 5 000 courses) ; compétition et historique de performances inchangés. Plafond piscine de **20 SELECT hors accès**, participation comprise ; les cas maximaux simulés coûtent 19 sans présence et 20 avec présence, contre 23/24 pour l'ancien dossier complet. Cette comparaison porte sur le lecteur antérieur fonctionnel, pas sur le parcours défaillant. Historique groupé plafonné à 20 000 lignes brutes, 2 000 par nageur ; sentinelles et refus conservés. Les index existants `livepalmes_compet_nageur_id` et `engagements_clef` sont réutilisés, sans index nouveau.
- **Ouverture/action/retour** : ouvrir un historique non caché déclenche un RPC ; rouvrir une clé encore valide ne relit rien. Après invalidation, la prochaine ouverture relit le serveur, sous le même plafond. Regroupement, files de mutations/autosauvegarde, critères sportifs, dates, choix connus et invalidations restent inchangés. Les tests de ce lot n'invoquent pas les actions réelles susceptibles de vider ces files.
- **Annuaire national NAP** : la réponse nationale complète alimente déjà les références partagées. Elle suffit désormais sans prélecture publique : ouverture à froid, deux RPC/deux SELECT de clubs deviennent un RPC/un SELECT, **1 001 lignes sentinelle au plus**, refus au-delà de 1 000 clubs. Si la référence était déjà chargée, coût inchangé d'un RPC/SELECT. Retour sur l'annuaire chargé : zéro RPC ; actualisation explicite : un RPC/SELECT frais. Administrateurs et profil d'accès sont inchangés et séparés du budget SQL ; aucun appel par club. Le parcours hors NAP conserve son chargement antérieur.
- **Sécurité de la recette** : aucun endpoint réel d'annuaire n'est invoqué, car son lecteur d'administrateurs peut initialiser un index Firestore. Tests avec réseau externe bloqué, adaptateur SQL n'acceptant que SELECT et Firestore interdit. Aucun cache temporisé, nouvelle collection, reconstruction, configuration Firebase, écriture NAP/Firestore ou envoi ajouté.

Le test d'intégration assemble le vrai callable, le service, les lecteurs de compétition/contexte/performances et le formateur d'historique avec une connexion fictive. Il vérifie l'équivalence avec le dossier complet antérieur, les inscriptions multiples, les seules courses enregistrées et demandées, la période, chef/renonciation, mauvais club/fusion, qualifications, limites et refus. Les tests d'annuaire exercent les vrais modules, l'alimentation de la référence partagée, les ouvertures simultanées, cache vide, reprise, pagination et absence de prélecture. CI globale et publication TEST à attester dans le registre et la PR ; aucune latence réelle n'est annoncée.

## Premier lot portail — 30 octobre 2026

Antoine a validé explicitement les changements de Cloud Functions et la livraison jusqu'à TEST, sans modification de la base ni mail réel. Le lot garde les règles sportives, les contrôles de droits, la fraîcheur des lectures et les files d'autosauvegarde. Aucun cache supplémentaire, index, schéma ou réglage Firebase.

| Parcours | Avant | Après | Ouverture, action et retour |
| --- | --- | --- | --- |
| Aperçu piscine de 1 à 50 nageurs | Jusqu'à 25 SELECT : compétition complète, dossier complet, historique groupé, participation et exceptions | Jusqu'à 20 SELECT : mêmes règles et historique, trois lectures ciblées identités/appartenances/chef au lieu des huit lectures du dossier | Un lot non caché coûte 18 à 20 SELECT selon participation/qualifications ; une clé encore en cache coûte zéro RPC. Les lots de 50, les 80 ms de regroupement, l'attente des mutations et les invalidations sont conservés. |
| Ouverture du dossier club | Budget annoncé 25 SELECT/20 519 lignes, incomplet dans le cas maximal | Borne corrigée : 26 SELECT métier/20 520 lignes acceptées ; un SELECT de contrôle club et un document profil au plus, séparément | Même coût initial, au retour et au rafraîchissement NAP. Le cache d'affichage ne remplace pas la relecture fraîche. Les engagements et membres de relais sont regroupés en mémoire une seule fois, en conservant ordre et doublons. |
| Journal d'activité | Référentiel clubs puis page ; résolutions de références en série | Page indépendante des libellés clubs ; acteurs/compétitions/personnes résolus en parallèle | Plafond conservé de 177 documents Firestore/page, plus une lecture SQL des clubs si leur référence n'est pas en mémoire. Retour déjà chargé et filtres locaux : zéro RPC. Actualisation et suite : une nouvelle page bornée. |

L'aperçu conserve 20 000 performances groupées maximum et 2 000 par nageur, 50 identités et 50 appartenances regroupées, 20 déclarations de chef, 64 exceptions par nageur et les limites existantes de la compétition. Ses plafonds acceptés cumulés passent de 42 669 à 34 568 lignes, hors contrôle d'accès ; ces plafonds ne sont pas les volumes réellement lus. Les sentinelles peuvent ajouter une ligne au SELECT qui refuse un dépassement. `LIMIT`, `GROUP BY`, jointures et `EXISTS` ne bornent pas seuls le nombre de lignes examinées par MySQL.

Les lectures du journal restent réservées à `admin.full`, avec 50 traces et sentinelle, 50 contreparties maximum, puis 25 acteurs/25 compétitions/25 personnes ; un lot Auth de 25 au plus si nécessaire. Les filtres sont capturés avant les lectures. Une panne du référentiel clubs ne bloque pas la page ; une panne du journal reste signalée. Les anciennes références Firestore de compétition/personne ne sont pas remplacées dans ce lot.

Contrôles hors réseau : comparaison des lecteurs ancien/nouveau sur 1/50 nageurs et participation/qualifications, comptage de 18–20 SELECT, doublons d'inscription, fiches fusionnées et mauvais club, chef absent/ambigu/renonciation, limites et refus ; ordre des engagements et membres, empreinte inchangée ; journal, pagination, cache, droits, erreurs et plafond 177. Rendu réel du journal vérifié à 1440/390/320 px, clavier et absence de débordement. La CI du candidat exact et la preuve du déploiement TEST sont suivies dans le registre.

Plans réels vérifiés le 30 octobre dans la connexion NAP existante, avec trois `EXPLAIN SELECT` uniquement, sur 50 identifiants de contrôle : identités en `range` sur `PRIMARY` (estimation 50), jointures clubs/licences/fusions en `eq_ref` sur leurs clés primaires (estimation 1 chacune) ; appartenances en `range` sur `livepalmes_compet_nageur_id` (estimation 50) ; chefs en `ref` sur `livepalmes_compet_id` (estimation 8 pour la compétition témoin). Aucun accès `ALL` observé, aucun SELECT de données ni changement exécuté. Ce sont des estimations du plan, pas des lignes réellement examinées ni des latences applicatives.

Les traces du 30 octobre consultées pendant l'audit appartiennent à des révisions précédentes : elles montrent notamment une prérequête de 4,751 s concomitante au démarrage d'une instance, suivie d'un POST de 1,251 s. Elles ne mesurent ni ce lot ni le délai depuis le clic. Aucune latence d'aperçu n'a été retrouvée dans les fenêtres bornées du 23 au 30 octobre ; les mesures navigateur authentifiées et le SQL isolé restent à attester. Aucun gain en secondes n'est promis.

## Objectif

Lire NAP directement, conserver les règles sportives et les données fraîches, réduire le travail répété. Aucun export sportif parallèle, aucun nouveau stockage et aucun cache temporisé ajouté. Les modifications de la base NAP restent visibles à la consultation suivante.

## Budgets et protections

| Parcours | Budget SQL par appel, hors contrôle d’accès | Limites |
| --- | --- | --- |
| TOP | 2 SELECT ; 3 si années de naissance demandées | Comptage indexé borné à 150 001 ; 5 001 candidats ; jusqu’à 2 000 lignes publiques |
| Métadonnées TOP | 2 SELECT | 5 001 dates et 1 001 clubs, refus au dépassement |
| Calendrier public saisonnier | 1 SELECT avec jointures et vérifications indexées de résultats | 501 événements, refus au-delà de 500 ; aucun programme détaillé par ligne |
| Fiche nageur publique | 2 SELECT | Une identité et 2 001 performances, refus au-delà de 2 000 |
| Résultats compétition | Jusqu’à 5 SELECT, dont le pointeur de statuts d’import | 5 001 résultats, 1 001 relais, 1 000 participants ; contrôle global des historiques à 100 001 conservé |
| Consultation DTN | Configuration, résultats conservés et empreinte de fraîcheur | Aucun recalcul automatique ; pages de 500 uniquement lors du recalcul explicite, plafond 100 000 |

Ces bornes concernent les lignes renvoyées/comptées, pas une garantie sur les lignes examinées par MySQL. Le tri numérique des temps reste nécessaire pour les valeurs comme `14200` et `014200`. Ne pas substituer un tri lexical.

## Optimisations préparées le 11 octobre 2026

- TOP navigateur : regroupement des filtres pendant 100 ms, partage des demandes identiques encore en cours. Réponse supprimée de la mémoire dès achèvement, y compris en erreur ; consultation ultérieure fraîche, aucun cache de données. Les réponses dépassées restent ignorées.
- TOP SQL sans filtre régional : recherche des clubs après sélection des 5 001 candidats, années de naissance sans recherche de clubs. Filtre régional inchangé : la région doit sélectionner les candidats avant LIMIT.
- Résultats : historique transféré limité aux courses présentes dans la compétition. Le comptage préalable de tout l’historique et ses plafonds restent inchangés ; mêmes meilleurs temps personnels/saisonniers.
- Calendrier : projection `co.*` étudiée mais conservée. Sa modification touchait un helper partagé par 53 fonctions pour un gain non démontré ; ne pas élargir ce lot pour cette retouche. Les comparaisons de deux saisons établissent la référence, pas un gain de latence attribuable.
- Ancien audit Firestore marqué historique, ne pas relancer les reconstructions retirées.

## Mesures de référence

Comparaisons directes en lecture seule, échantillons séquentiels du 11 octobre ; latence incluant réseau et échauffement. Aucun percentile ni estimation financière n’est déduit de ces essais.

| Cas | Avant | Après | Équivalence |
| --- | ---: | ---: | --- |
| TOP 100SF hommes, 25 lignes | 1 212 ms | 774 ms | Réponse exacte hors date de lecture |
| Même TOP, saison 2026 / 50 m / années de naissance | 1 568 ms | 1 291 ms | Réponse exacte hors date de lecture |
| TOP 100SF femmes seniors | 928 ms | 704 ms | Réponse exacte hors date de lecture |
| TOP avec filtre régional | 790 ms | 761 ms | SQL de sélection inchangé ; variation non attribuée à la correction |
| Historique compétition 2652 | 12 426 lignes | 8 521 lignes | 153 résultats et tous les repères identiques |
| Calendrier saisons 2026 / 2027 | 121 / 77 événements | 121 / 77 événements | Réponses exactes hors date de lecture |

EXPLAIN du TOP initial : index course/relais, estimation 81 210 lignes et tri temporaire. Cette estimation n’est pas un comptage réel. Le comptage protecteur reste en place ; aucune nouvelle colonne/index ni correction de temps.

Preuves détaillées locales : `outputs/audit-optimisation-nap-20261011/` dans la session de travail. Tests : `nap-top-requests-tests.js`, `nap-direct-tops-tests.js`, `nap-direct-calendar-tests.js` et suite globale.

## Validation et clôture du plan initial — 12 octobre 2026

PR #247, candidat `7036940bd1c057e4fd693bf04d42bd9efba81b5c` : suite `38175665424`, Hosting TEST commun `38175818400` et lot NAP `38176119901` réussis. Antoine a validé le bilan TEST puis autorisé la publication. La PR #248 compose les preuves ciblées TEST et les nettoyages PROD vérifiés, sans assouplir la comparaison des états réels.

Publication PROD protégée [38179490926](https://github.com/ffessmnap/LivePalmes/actions/runs/38179490926) réussie après sauvegarde chiffrée rouverte et vérifiée : une fonction actualisée, 110 conservées, Hosting publié en dernier. Durée totale observée : 229 s, sauvegarde et contrôles inclus ; cette observation unique ne prédit pas les publications futures.

Mesures du 12 octobre, session TEST authentifiée, latences HTTP serveur Cloud Run :

| Lecture | Appels | Min / médiane / max |
| --- | ---: | --- |
| Calendrier des événements | 1 | 673 / 673 / 673 ms |
| Liste des compétitions | 1 | 616 / 616 / 616 ms |
| Nageurs du club | 1 | 873 / 873 / 873 ms |
| Catalogue des saisons DTN | 1 | 316 / 316 / 316 ms |
| Consultation des résultats DTN | 7 | 175 / 238 / 541 ms |

Toutes les réponses sont HTTP 200. Le calendrier et la liste des compétitions peuvent être chargés en parallèle : ne pas additionner leurs durées. Effectif CNHC : 503 nageurs, dont 180 actifs et 323 inactifs. Les trois dispositifs DTN s'affichent depuis les résultats conservés ; actualiser l'affichage conserve la date du calcul `11/10/2026 20:25:49`. Aucun recalcul déclenché.

Ces mesures incluent le traitement serveur et l'accès NAP, pas le temps utilisateur complet ni le SQL isolé. La navigation peut réutiliser un contenu déjà chargé ; ses chronométrages ne sont pas assimilés à une lecture fraîche. Petit échantillon, aucune charge concurrente simulée, aucun percentile représentatif.

État réel relu après les mesures : 111 fonctions PROD, 113 TEST ; révisions, Hosting, déclencheurs et configuration des planifications inchangés par rapport au bilan de publication. Mails automatiques toujours désactivés dans les deux environnements. Aucune écriture NAP, aucun envoi, aucune nouvelle publication.

Le plan initial est terminé. Preuves locales : `outputs/cloture-plan-optimisation-nap-20261012/` (bilan HTML/JSON, journaux de durées sans contenu métier, états relus, durées du run et empreintes SHA-256). La projection calendrier reste volontairement différée faute de gain démontré ; la surveillance en usage et lors des futures publications relève du suivi habituel.

Ajuster uniquement sur preuve : pas de cache temporisé sans accord sur la fraîcheur, pas de nouvel index sans accord spécifique, pas de changement de concurrence NAP sans mesure de charge. Le ciblage a été corrigé par PR #246 ; aucun nouveau repli manuel de sélection n’est autorisé.

Aucun gain permanent de coût ou de durée n’est annoncé avant observation en usage. Aucune suppression supplémentaire de fonctions justifiée par ce lot.


## Réactivité DTN et calendriers — 20 octobre 2026

Le chargement DTN initial regroupe catalogue, paramètres autorisés et résultat demandé dans un seul appel de lecture (`getDtnSeasons`), soit trois SELECT au lieu de cinq lorsque le résultat est compatible. Les consultations suivantes utilisent le même service ; seules les vues demandées sont lues, par la clé existante saison/dispositif. Sans résultat, une lecture technique du calcul peut s’ajouter, sans reconstruction. Le recalcul explicite et la date du calcul ne changent pas.

Le calendrier administrateur peut recevoir les compétitions et les autres événements depuis un unique appel et un unique SELECT par saison, au lieu de deux lectures de la même saison. Le calendrier club reste inchangé côté SQL. Le cache d’affichage existant est réaffiché immédiatement, y compris pour une liste vide ; une lecture NAP fraîche reste effectuée à chaque retour. Aucun nouveau cache temporisé ni maintien d’instance active. Les appels identiques en cours restent mutualisés et les réponses dépassées ne remplacent pas le périmètre courant.

Les mesures de démarrage à froid observées sur TEST avant optimisation (environ 4,8 puis 7,9 secondes pour les deux services DTN, contre 0,4 et 0,7 seconde de traitement) sont des observations ponctuelles, pas des moyennes ni une promesse de délai. Une première ouverture conserve le démarrage du service de lecture ; les éventuelles instances minimales et leur coût demanderaient une décision distincte.


### Recette TEST du regroupement

Version applicative `a26afb44`, publiée par TEST commun `39438188432` sur `f798d8fb` (complément documentaire), Hosting `44c43c76d65c4ef5`. Vérification globale et contrôles ciblés réussis ; cinq fonctions du portail publiées, autres révisions conservées. Trois dispositifs, actualisation clavier et calendriers club/admin vérifiés sur ordinateur et viewport mobile 390 px. Date de calcul et effectifs identiques avant/après ; aucune écriture ni recalcul.

Observations ponctuelles après publication : rechargement complet du portail vers DTN 2,4 s, France 0,44 s, EDF 0,20 s, retour Mise en liste 0,11 s ; retours calendriers club/admin 0,13/0,20 s pendant relecture. Quatre lectures serveur DTN de la nouvelle révision réussies entre 0,064 et 0,463 s. Ces mesures incluent des conditions différentes des démarrages initiaux du diagnostic : ne pas en déduire un facteur de gain garanti, un percentile, ni un temps après longue inactivité. Téléphone physique et Safari non testés. Validation utilisateur encore attendue.
