# Lecture directe NAP dans LivePalmes

<!-- description: Branchement direct des pages existantes sur MySQL NAP, budgets, index autorises, preuves TEST et travaux restants. -->

## Premiere correction reelle du portail — preparation du 6 octobre

Accord explicite Antoine : nageur NAP 912, nom FAUVEAU vers FAUVAU. La base est la base habituelle, sans copie d'essai. Le diagnostic prive 37462808515 confirme UPDATE sur nageurs et les huit tables MyISAM, sans declencheur. Il ne remplace pas la verification d'une ecriture reelle.

Circuit prive reserve au compte de publication TEST existant : operation fixe, aucun identifiant/nom libre, POST uniquement ; aucun droit public ajoute. Preparation : une lecture primaire de la ligne complete, une lecture d'audit, puis creation unique de la sauvegarde dans auditLogs protege. Cette sauvegarde ne peut pas etre remplacee par une preparation concurrente. Le workflow conserve aussi un artefact prive avant l'etape d'application.

Application : deux lectures primaires maximum, une lecture d'audit, un UPDATE du seul champ nom compare atomiquement aux onze valeurs initiales (comparaison binaire et NULL compatible), une ecriture d'audit de verification. Une reprise apres correction verifie l'etat exact sans refaire l'UPDATE. Aucun scan, aucune croissance avec la taille de la base. Un echec d'audit apres UPDATE exige une reprise de verification ; aucune promesse de rollback MyISAM. Le portail general de correction n'est pas encore raccorde : ce circuit verifie la premiere operation specifiquement autorisee.

## Cible validee par Antoine

### Portail national : recherche et formulaire d'identite

Adaptation TEST du parcours existant, sans capacite nouvelle : engagementAccessContext et droit national verifies avant lecture ou correction. Recherche uniquement NAP (nom, prenom ou ID), sans fichier statique ni comparaison avec l'ancienne base. Au plus deux requetes MySQL indexees : recherche 42 candidats/21 profils, puis projection groupee de 20 fiches avec empreinte brute ; une lecture du compte et au plus 20 documents licences par getAll. Pas de licence deduite du champ NAP number. Les licences anciennes non encore associees a l'ID NAP ne sont pas migrees automatiquement ; leur reprise reste differee. L'interface signale une recherche incomplete au-dela de vingt reponses.

Correction : trois lectures MySQL bornees (ligne complete, trois candidats de doublons, verification), un UPDATE limite aux seules colonnes d'identite modifiees avec comparaison binaire/NULL des onze valeurs initiales. Aucun temps ni performance modifie, ni nouveau cache sportif. Budget Firestore : compte 1, licence 1, audit 1, au plus 201 engagements du club pour preflight ; refus au-dela de 200 AVANT mutation. Sauvegarde durable au plus 500 Ko dans auditLogs protege (creation unique), puis transaction au plus 200 documents lies et audit final. Au plus 200 ecritures dependantes ; aucune lecture par nageur ni boucle paginee. Une correction qui rencontre une ancienne reference d'engagement ambiguë est refusee avant ecriture. Les tableaux d'engagements et relais sont compares a leur etat initial ou deja corrige ; une modification concurrente bloque leur remplacement et la meme demande permet de reprendre la verification sans second UPDATE NAP. Cette limite MyISAM/Firestore est explicite, sans promesse de transaction inter-bases.

Ouverture/rechargement de recherche : meme budget ; pas de listener ni reconstruction. Saisie dans le formulaire : aucune lecture avant enregistrement. Licences en lecture seule dans ce formulaire NAP, circuit licences existant conserve. Fusion NAP non encore raccordee : selections exclues pour ces fiches et ancien circuit refuse cote serveur ; aucune fusion dans l'ancienne base sur une selection NAP. Effectifs clubs, demandes de correction et creation restent a raccorder dans les lots suivants. Recette d'ecriture hors ligne avec donnees fictives ; aucune seconde correction reelle automatiquement executee.

LivePalmes consulte directement la base NAP, comme IntraNAP. NAP fait foi pour les performances, TOP et resultats ; une modification est visible a la prochaine consultation ou au rechargement. Exception explicite d'Antoine le 6 octobre : les Records/MPF officiels restent sur leur circuit LivePalmes actuel, qu'il confirme a jour, avec fichiers publics et secours statique. Ils ne sont ni remplaces par NAP ni recalcules a partir des TOP. Les pages, URL, filtres et presentation sont conserves. Le navigateur appelle le serveur LivePalmes, qui interroge MySQL avec le secret prive. Aucun export sportif ou comparaison avec l'ancienne base ne participe aux lectures NAP.

La publication statique proposee auparavant est abandonnee. Run 37429288547 annule avant Hosting ; branchement retire par #109. Les outils historiques d'export/diagnostic restent hors du parcours public et ne doivent pas etre utilises pour activer les pages. Le suivi historique se trouve dans `docs/releases/EVOLUTIONS.md`.

Les numeros de licence seront ajoutes a NAP plus tard selon le choix d'Antoine. Les associations locales restent privees. Les corrections de longueurs de bassin sont egalement suspendues ; aucune longueur inconnue n'est deduite.

## Connexion et protection

Serveur `nap.ffessm.fr:3372`, base NAP MySQL 5.7 / MyISAM. Le secret TEST existant reste exclusivement sur le serveur. TLS obligatoire, validation du certificat desactivee selon le choix explicite d'Antoine ; aucun repli en clair. Les projections publiques contiennent uniquement les champs sportifs deja utilises par les pages, sans licence, email, telephone ni mot de passe. Lecteur public en GET seulement, sans cache de reponse ; operations de maintenance reservees au compte serveur TEST existant.

TEST seulement. PROD n'est pas autorisee dans ce travail. Les apercus de PR reconnaissent leurs domaines TEST, avec refus d'une configuration explicite de production.

## Fiches et recherche

La fiche habituelle TEST utilise le lecteur direct. Deux requetes groupees par ouverture : profil avec club, puis historique avec competitions et clubs. Index nageur et jointures par cle primaire ; 2001 lignes brutes maximum, refus explicite au-dela de 2000 plutot que troncature. Le nageur le plus fourni actuellement a 1509 lignes brutes. Les filtres et la progression travaillent localement sur la fiche chargee ; nouvelle selection et rechargement relisent NAP. Les regles de temps, categories et passages intermediaires sont partagees avec le generateur existant sans changement sportif.

Recherche par nom ou prenom : deux plages indexees, 21 candidats maximum par plage, une jointure clubs groupee, 21 profils maximum en reponse. Recherche par ID : cle primaire. Saisie temporisee de 250 ms, parametres SQL et jokers echappes, pas de cache de resultats. L'index exige est impose : absence d'index = refus, jamais repli en scan complet. Une recherche peut examiner davantage de lignes de sa plage pour les noms composes ; le temps SQL reste borne a dix secondes.

## Index autorises et maintenance

Antoine autorise exactement ces index non uniques, sans modification de ligne ni ajout de colonne :

```sql
ALTER TABLE `nage-palmes`.`nageurs`
  ADD INDEX `livepalmes_prenom_nom` (`prenom`, `nom`, `date`, `id`);
ALTER TABLE `nage-palmes`.`perfs`
  ADD INDEX `livepalmes_course_relais_tps` (`course`, `relais`, `tps`, `id`);
```

Il confirme l'absence de saisie/import pour leur execution. Circuit manuel distinct de la publication : commit exact, choix d'un seul index, confirmation specifique, preparation et sauvegarde de structure avant ajout, empreinte contre changement concurrent, refus d'une ecriture active, relecture de l'index. L'operation POST passe par l'endpoint prive et sa connexion serveur existante. Aucun droit IAM ajoute, aucun mot de passe transmis a GitHub, aucun SQL libre. Relance apres succes idempotente ; verifier la structure apres tout echec ambigu. MyISAM peut bloquer brievement les ecritures pendant la creation.

## TOP et verification des temps

Antoine demande de conserver les temps bruts NAP : `14200` et `014200` representent tous deux 1:42.00. La correction envisagee pour la performance 973 a ete annulee avant toute execution. Le tri SQL utilise la valeur numerique mmsscc, monotone pour les temps valides ; la conversion et l'affichage restent ceux du helper sportif partage.

Budget du lecteur TOP prepare : aucune requete de performances a l'ouverture sans sexe/course ; deux petites lectures de referentiels (5001 competitions et 1001 clubs maximum, refus du depassement). Chaque selection, suite ou rafraichissement effectue deux requetes groupees : comptage d'une plage couvrante course/relais plafonnee a 150001 entrees, puis lecture jointe limitee a 5001 candidats. Le tri numerique peut examiner/trier la plage de cette course, au plus 150000 performances admises, avec dix secondes par requete ; il ne faut pas confondre ce cout avec le nombre de lignes affichees. Aucun scan global des 521835 performances, aucune requete par nageur, aucun export ni cache de resultats. Le plafond est fixe et son depassement refuse la lecture.

Meilleure performance par identite, egalites departagees par date comme auparavant. La limite affichee commence a 25 et augmente de 25, avec un maximum de 2000 ; si les 5001 candidats ne suffisent pas a garantir le classement demande, erreur explicite plutot que classement incomplet. Le filtre naissance charge sur demande une requete DISTINCT bornee a 10001 annees, dans la meme plage course ; il ne deduit pas les annees des seuls premiers resultats. Cette requete partage le controle de volume avec la lecture TOP : trois requetes groupees au total lorsque le filtre naissance est ouvert. Les categories SQL sont derivees des tranches et codes du helper existant, et reverifiees par ce helper avant exposition. Controle reel des plans, latences et parcours requis avant recette finale.

Le plan initial TOP parcourait 521835 lignes et n'est pas active. L'index par course est requis, puis les plans du tri doivent etre controles. Les TOP doivent conserver les categories calculees par age/saison, les filtres actuels et la meilleure performance de chaque nageur ; un simple filtre sur la categorie brute ne suffit pas.

Diagnostic prive et ponctuel : index et EXPLAIN, puis plages primaires de 10000 identifiants, au plus 100 plages. Resultat de formats 37432527182 : 520866 temps sur six caracteres, deux temps numeriques sur cinq et un sur trois ; autres formats non numeriques. Le controle complementaire applique les regles existantes aux temps numeriques courts et ne retourne que leur nombre valide, sans publier leurs valeurs. Onze candidats courts maximum par plage ; toute troncature rend le controle incomplet et bloque la conclusion. Ce diagnostic n'est pas execute a l'ouverture d'une page et ne construit aucun fichier sportif.

## Etat des preuves et suite

- #111, lecteur direct : backend 37432035467 reussi ; cinq nageurs controles HTTP 200.
- #112, fiche et recherche : Linux CI/preview 37433700174 reussis ; backend 37433997591 reussi, recherche par ID verifiee.
- #113 : correction des domaines d'apercu, CI/preview 37434267955 reussis. Fiche 7322 controlee dans le navigateur, filtres et mobile sans debordement horizontal ; rechargement reussi.
- Les essais d'index directs depuis GitHub ont echoue a l'acces au secret avant sauvegarde de structure ; aucune modification confirmee. #114 utilise desormais la connexion privee du serveur, tests de protection passes ; deploiement et verification reelle en cours.

Restent : creation/verifications des index, recette de recherche par nom/prenom, publication TEST commune de la fiche, TOP directs, puis autres consommateurs et Records/MPF avec leurs contrats NAP verifies. Les badges Records/MPF de la fiche utilisent encore la source officielle existante. Aucun bilan ne doit presenter tout LivePalmes comme deja migre.

Mise a jour : index search 37435791498 et top 37435794805 ajoutes et verifies ; plan par course confirme dans 37436400503. Recherche nom/prenom et fiches controlees dans l'apercu, puis publication TEST commune d7eb84c8 reussie (37436954305). TOP directs en preparation, aucun changement de ligne NAP.

Preuves TOP #116 : CI Linux/preview 37439892004 et backend 37440187733 reussis ; diagnostic 37440553058 confirme perfs sur index course (80948 entrees estimees pour 100SF), jointures PRIMARY eq_ref, tri numerique temporaire dans cette plage. Lectures HTTP reelles metadata/TOP/naissances reussies, 0,6 a 1,2 seconde sur les filtres testes ; performance 973 affiche toujours 1:42.00. Recette navigateur et publication commune TOP en cours.

## Reperage des prochaines sources

Le catalogue prive `source-inventory` inspecte uniquement information_schema : au plus 201 tables, puis 501 colonnes et 501 elements d'index des tables dont le nom concerne competitions, courses, categories, documents, Records/MPF. Depassement refuse. Un EXPLAIN des performances par competition complete le reperage sans lire de performance. Aucun export sportif, aucune valeur de compte/contact et aucune ecriture ; endpoint prive existant, aucun droit IAM supplementaire. Workflow manuel TEST distinct `livepalmes-test-nap-source-inventory.yml` avec commit exact. Les sept tables du CSV initial ne prouvent pas l'absence d'autres sources ; ne pas fabriquer des Records/MPF a partir des TOP.

Recette technique TOP #117 : CI 37440825533 et backend 37441186296 reussis ; 28 lectures reelles (14 courses, deux sexes) toutes HTTP 200, tri/identites/categories/minima verifies, maximum 1,365 seconde. Apercu : 25 puis 50 nageurs, filtres categorie/bassin/saison/region et naissance 1999 verifies ; mobile 390 px sans debordement. Publication commune 37441341576 au commit 84395f52 reussie ; TOP 100SF Hommes bassin 50 m charge puis suite de 25 a 50 nageurs verifiee sur le site commun. Preuve visuelle locale top-nap-test.jpg. Aucune validation utilisateur inventee.

Preparation d'un index distinct pour les pages resultats d'une competition : `livepalmes_compet_id (compet, id)` sur perfs. Les index actuels commencent par nageur ou course, aucun par compet ; le nouvel index permettra une page de 501 performances via `WHERE compet = ? AND id > ? ORDER BY id LIMIT 501`. Ajout prepare dans le circuit fixe existant, aucune execution avant accord specifique d'Antoine et confirmation d'absence de saisie/import. La table MyISAM peut bloquer ses ecritures pendant la creation. Aucun autre index ni colonne envisage.

Mise a jour #118 : serveur NAP 37445207687 et index competition 37445595850 reussis, sauvegarde de structure avant ajout et colonnes verifies. Inventaire 37445736569 reussi ; EXPLAIN par competition utilise livepalmes_compet_id, type ref, sans filesort.

## Calendrier, fiches et portail — perimetre autorise le 6 octobre

Avant implementation : calendrier par saison, une plage d'index date/id, plafond 501 evenements avec refus au-dela de 500 ; fiche par cle primaire (1 ligne), documents publics de la competition (101 maximum, refus au-dela de 100), programme via compet_courses.compet (301 maximum, refus au-dela de 300), resultats via livepalmes_compet_id (501 par page, curseur id). Jointures de referentiels par cles primaires, aucun appel par ligne. Chaque ouverture/rechargement relit NAP, aucun export. Les longueurs inconnues restent inconnues. Les marqueurs PB/SB ne doivent pas etre inventes a partir du seul lot de competition.

Deux index fixes prepares, en attente d'accord specifique : competitions.livepalmes_date_id(date,id) et documents.livepalmes_compet_public_id(competition,public,id). Le circuit sauvegarde la structure, refuse une ecriture active et verifie l'index. L'inspection privee du contrat ne lit que les libelles des quatre referentiels (51 chacun, refus >50) et compte les drapeaux de publication des documents (plafond 10001, refus >10000), sans contenu, chemin prive, compte ou valeur sportive.

Le portail doit lire NAP pour les references et temps d'engagement sans changer les droits ni les regles de qualification. LivePalmes Direct continue a gerer le dossier, les series et resultats de la competition ; aucune synchronisation d'ecriture vers NAP n'est autorisee implicitement par ce branchement.

Verification reelle du contrat 37447620531 : documents publics marques Y (2789), internes N (256), valeurs vides (20) et atypiques 1 (3). Affichage public limite a Y, aucune assimilation des trois valeurs atypiques. compet_types fournit Piscine/Eau libre/Formation/Stage/Reunion ; compet_type fournit MONDE/EUROPE/FRANCE/ZONE/REGIONAUX/AUTRE. Les documents utilisent les chemins NAP et le programme la jointure primaire course_dispo.

Implementation des resultats : une lecture groupee par competition plafonnee a 5001 lignes, refus >5000, pour conserver les filtres locaux existants sans afficher un classement tronque. Les reperes PB/SB sont compares a l'historique NAP des participants : au plus 1000 identifiants, comptage d'index nageur plafonne a 100001, puis une lecture groupee plafonnee a 100001 avec jointures primaires. Refus des reperes au-dela de 100000 lignes historiques, sans fausse etiquette PB/SB ; les resultats restent affichables. Au maximum trois requetes pour les resultats, aucune lecture par ligne ni requete sur tous les nageurs/perfs. Dates, categories et temps utilisent le helper sportif existant ; pas de reecriture dans NAP. Ouverture et rechargement produisent les memes budgets, filtres locaux sans nouvelle lecture. Saison plafonnee a 500 evenements ; fiche : trois requetes (profil/documents/programme). Manifest : deux bornes d'index de date, au plus 202 saisons.

## Portail : cible lecture et ecriture — accord du 6 octobre 2026

Antoine confirme que le portail doit pouvoir modifier directement NAP a terme et autorise de commencer cette adaptation. Les droits applicatifs existants restent controles cote serveur. Cette demande ne selectionne aucune ligne reelle a modifier pour une recette et ne remplace pas l'accord specifique necessaire aux migrations, licences, suppressions ou corrections de performances. Preparation et essais hors ligne autorises ; premiere ecriture reelle a rendre concrete et reviewable avant execution.

Diagnostic prive initial : cinq requetes, SHOW GRANTS puis metadonnees de huit tables fixes (nageurs, clubs, competitions, compet_parametres, compet_courses, nageursengager, perfs, documents). Plafonds : 8 tables, 400 colonnes, 200 composants d'index, 100 descriptions de declencheurs. Aucune ligne sportive, aucun scan de performances, aucun compte/texte de droits, aucune valeur de configuration par defaut exposee. Les droits SELECT/INSERT/UPDATE/DELETE sont resumes en booleens par table. Le diagnostic ne prouve pas une ecriture reelle et ne cree aucun droit.

Lecture initiale, action diagnostic et rafraichissement : meme budget de cinq requetes, sans cache ni ecriture. Le volume est independant du nombre de nageurs et de performances. Le lecteur prive existant et le compte serveur TEST actuel sont reutilises ; aucun secret ni nouvelle permission IAM.

Cible des premieres modifications de nageurs : controler le perimetre avec les fonctions d'acces actuelles, lire la fiche par cle primaire, comparer les valeurs attendues, sauvegarder l'etat initial dans le circuit d'audit protege existant, executer une mise a jour bornee par identifiant et anciennes valeurs, relire et tracer le resultat. Les tables MyISAM ne permettent pas de promettre une transaction atomique entre plusieurs tables ; aucune activation de creation d'engagement complexe avant contrat complet et strategie de reprise.

Preuve calendrier precedente : #122, version commune ebcc955c, run 37457199663 reussi (Hosting e860fd25f81ffb30), lecteur NAP 37457195054 reussi. Recette commune : 67 evenements 2026-2027, 117 en 2025-2026, filtre formations, fiche 2652/document/protocole/resultats. Antoine confirme ensuite que le calendrier semble bien fonctionner. Portail et production encore a traiter.

Premiere brique d'ecriture preparee : apercu prive de correction d'identite nageur, sans route active ni execution de modification. Deux lectures maximum : fiche par cle primaire (1 ligne) et candidats de doublons via nageurs_clef (3 identifiants). Ouverture d'apercu et rafraichissement : meme budget ; aucune lecture par ligne ni parcours de performances. Le plan SQL borne a une ligne compare les anciennes valeurs exactes et le club pour proteger contre une modification concurrente. Champs proposes limites a nom/prenom/date de naissance/sexe, longueur NAP de 64 caracteres respectee sans troncature. Licences, club, statut et resultats exclus. Integration des autorisations nationales, sauvegarde/audit et activation reelle encore a effectuer.

Antoine confirme qu'il n'existe aucune copie NAP distincte pour les essais. Les essais d'ecriture restent hors ligne ; un premier essai sur une ligne reelle exige un cas concret prepare et autorise. Ne pas utiliser une correction fictive d'un vrai nageur pour une recette.

## Effectifs clubs et abandon des identites historiques — 6 octobre

Budget avant implementation : une requete SQL indexee par club, 801 lignes maximum (refus au-dela de 800), un document d'effectif pour les seuls statuts operationnels deja lies a NAP, plus le contexte de droits existant. Aucun document licence : Antoine demande des numeros vides jusqu'a leur ajout dans NAP. Rafraichissement identique, cache memoire explicite ; ancien cache de session ignore sur TEST. Statut club : lecture NAP par cle primaire et club, document d'effectif, ecriture du statut et audit ; aucune modification de nageurs.actif dont la semantique n'est pas etablie.

La correction NAP ne depend plus des identites d'anciens engagements LivePalmes. Seules les references natives NAP deja presentes sont actualisees. Les anciennes references ne sont ni rapprochees par supposition ni migrees. Leur remplacement dans les parcours d'engagements reste a realiser avant de declarer le portail complet. Recherche nationale et effectif affichent des licences vides, sans lecture de l'ancienne collection licences. Creation, demandes, DTN et selection des engagements restent a raccorder. Pas de suppression de base ni d'essai d'ecriture sur une personne reelle.
