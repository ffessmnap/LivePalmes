# Tests manuels LivePalmes

<!-- description: Checklist de tests manuels à exécuter avant une publication ou après une modification sensible. -->

Cette checklist sert avant une publication importante ou apres une modification sensible.

## Test rapide obligatoire

- Lancer `node tools/verify-livepalmes.js`.
- Avant une publication sensible, lancer aussi `node tools/verify-livepalmes.js --browser`.
- Verifier que le controle indique aussi les tests de regression resultats, les textes HTML publics et l'architecture.
- Ouvrir `index.html`.
- Verifier qu'aucune erreur n'apparait dans la console navigateur.
- Ouvrir la page publique `resultats.html`.
- Ouvrir la page publique `series-public.html`.
- Verifier que les pages affichent bien LivePalmes.

## Consoles internes

- Ouvrir la console Live.
- Ouvrir la console Speaker.
- Ouvrir la console JA.
- Ouvrir la console Video.
- Ouvrir la console Bureau des performances.
- Ouvrir la console Secretariat.
- Verifier que les codes PIN fonctionnent si les codes sont actifs.
- Verifier qu'une console affiche la connexion email/mot de passe avant le PIN.
- Verifier qu'un compte sans `consoles.access`, `consoles.manage` ou fallback actuel `admin.full` est refuse.
- Verifier qu'un compte avec `consoles.access` peut saisir le PIN speaker, referee, video, computer ou secretary sans perdre ses droits permanents.
- Verifier qu'une ancienne session anonyme ne peut plus appeler la verification du PIN.

## Series

- Importer un PDF de series complet.
- Verifier que les sessions apparaissent.
- Verifier qu'une course affiche les nageurs, lignes, categories et temps d'engagement.
- Verifier les records et pastilles MPF/RF/RFJ.
- Verifier la page publique des series.
- Verifier la recherche nageur publique.
- Verifier qu'un nouveau PDF de series s'ouvre depuis son URL de stockage public.

## Portail - engagements club

- Avec un compte disposant de `engagements.club.manage` et du droit de changement national de club, cliquer le code club du bandeau, rechercher un club par code et par nom, puis le sélectionner. Vérifier que l&rsquo;espace Club affiche et modifie uniquement les données de ce club, que le bouton « Revenir à mon club » restaure immédiatement le club d&rsquo;appartenance et qu&rsquo;aucune recherche ne lance de lecture Firestore. Sur mobile, vérifier que « Changer de club » reste accessible depuis le menu du compte. Déconnecter puis reconnecter : le club d&rsquo;appartenance doit être restauré. Avec un compte sans ce droit, la sélection d&rsquo;un autre club doit être refusée côté Cloud Functions.

- En août, conserver la saison courante sélectionnée et vérifier que les compétitions de septembre apparaissent après celles de la saison en cours, dans un groupe « Septembre AAAA — saison suivante ». Vérifier qu’octobre n’est pas chargé, que ce groupe disparaît en choisissant une autre saison et qu’un administrateur régional n’y voit que son périmètre dans « Compétitions à administrer ».
- Vérifier « Engagements en compétition » et « Compétitions à administrer » sur ordinateur : le bandeau de filtres doit suivre directement le titre, sans carte extérieure imbriquée, et une compétition doit occuper une ligne à cinq colonnes avec le lieu sous son nom. Le décompte et l’action ne doivent jamais se chevaucher. Sous `1120 px`, les cinq colonnes doivent rester lisibles ; sous `760 px`, la ligne doit devenir une mini-fiche sans défilement horizontal ni action masquée.
- Ouvrir une fiche côté Club : vérifier que la phrase « Vous effectuez les engagements pour le club » et le seul code du club précèdent le nom de la compétition, que la date et le lieu sont sur la ligne secondaire, que le niveau et l’état des engagements sont deux badges compacts et que « Fiche compétition club » ainsi que « Consultation » sont absents. Dans Informations, la ligne « Temps d’engagement » doit préciser la période de sélection du meilleur temps et si la saisie manuelle est autorisée. Le retour doit être placé dans l’en-tête « Engagements en compétition » et rester accessible sur mobile.
- Ouvrir côté Club une compétition dont les engagements sont « À venir » : seule la rubrique Informations doit être affichée, avec Général et Programme. Participants, Engagements et Récapitulatif doivent rester masqués jusqu’à l’ouverture des engagements.
- Dans Officiels, choisir un nageur du club ayant une licence puis « Ajouter comme officiel » : vérifier que son identité n’est pas ressaisie, qu’il apparaît parmi les officiels sélectionnés et qu’il reste réutilisable après réouverture. Un nageur sans licence ne doit pas être sélectionnable comme officiel. Dans Mes officiels, la saisie manuelle doit demander Nom, Prénom, Date de naissance, Sexe et Licence ; Nom doit passer en majuscules et la licence au format `A-12-34567` pendant la saisie.

- Dans « Mes nageurs », vérifier que l'icône poubelle « Demander la suppression de [Nom] » apparaît uniquement pour une fiche créée depuis le portail, reste utilisable au clavier et conserve son infobulle. Sans performance ni inscription, confirmer doit supprimer immédiatement la fiche. Avec une inscription ou une correspondance dans les performances, la fiche doit disparaître de l’effectif, être désactivée et créer une demande nationale détaillée.
- Sur l’accueil Administration nationale, vérifier les trois groupes « À traiter », « Référentiels » et « Suivi ». Le compteur des demandes doit apparaître sans charger les listes détaillées et rester lisible en `390 px`.
- Dans Administration nationale > Demandes à traiter, vérifier l’absence de barre d’onglets secondaire. Les groupes Corrections de nageurs, Suppressions de données et Suppressions de comptes doivent être fermés par défaut, masquer les groupes vides et afficher un seul état vide si aucune demande n’existe. Approuver une demande nageur doit conserver sa fiche désactivée pour l’historique. Refuser doit la réactiver dans l’effectif du club. Vérifier qu’une suppression nationale directe d’une fiche utilisée est refusée.
- Dans « Mes nageurs », ouvrir le crayon de correction d’une fiche issue des performances puis d’une fiche créée par le club. La fenêtre doit être préremplie, exiger un motif, refuser une saisie inchangée ou une licence invalide et créer une seule demande en attente sans modifier immédiatement la fiche. Après l’envoi, le crayon doit être remplacé par la pastille orange « Correction en attente » sans agrandir la ligne.
- Dans Administration nationale > Demandes à traiter, ouvrir Corrections de nageurs, comparer les seules valeurs modifiées, refuser une demande avec un commentaire puis recommencer en la validant : la ligne club, les engagements existants, la recherche nationale et la fiche publique ciblée doivent reprendre l’identité corrigée. Une identité déjà existante doit être refusée et orienter vers la fusion.
- Dans Administration nationale > Nageurs, rechercher un nageur et ouvrir le menu à trois points puis « Modifier la fiche ». Vérifier que le motif est obligatoire, que Nom, Prénom, Date de naissance, Sexe et Licence sont contrôlés, que l’action demande confirmation et qu’elle apparaît dans le journal national. Activer « Gérer les doublons » : les colonnes Conserver, Fusionner et Alerte doivent apparaître sans perdre l’accès aux actions. Quitter ce mode doit les masquer et vider la sélection. Tester le tableau et la fenêtre en `390 px`, avec défilement horizontal ou interne sans bouton inaccessible.
- Dans Administration nationale > Officiels, vérifier que Nom précède Prénom, que la ligne fermée reste compacte, que les actions sont regroupées sous les trois points et que le mode doublons est masqué par défaut. Dans Journal d’activité, vérifier la recherche, le filtre de catégorie, les libellés lisibles et l’ouverture des détails techniques.
- Créer une compétition à venir sans nombre de lignes : la création doit réussir et Général doit indiquer que le nombre n'est pas renseigné. Une valeur inférieure à 4 ou supérieure à 10 doit être refusée. L'ouverture des engagements doit rester impossible tant que le bassin, un nombre de lignes compris entre 4 et 10 et le chronométrage ne sont pas renseignés. Après création, la checklist « Compétition créée » doit être visible et son bouton « Voir la compétition » doit rendre immédiatement toute l'interface utilisable.
- Supprimer directement une compétition autorisée : dès la confirmation, le bouton doit afficher « Suppression en cours... » et rester désactivé. Après la réponse du serveur, la fiche doit se fermer et la compétition doit disparaître immédiatement du calendrier, sans actualisation de la page ni réapparition lors du prochain chargement. La confirmation « Compétition supprimée » doit disparaître automatiquement après environ quatre secondes, contrairement aux erreurs qui doivent rester visibles.
- Ouvrir une compétition comme administrateur régional ou national : vérifier que la navigation non numérotée affiche « Paramétrage », « Statistiques », « GED » et « Diffusion ». Dans Statistiques, contrôler les totaux participants F/H, clubs, courses, relais et officiels, puis choisir une course et vérifier l’ordre croissant des temps, le code club et l’origine du temps. Dans GED, télécharger le TXT puis choisir un club et télécharger son PDF. Dans Diffusion, vérifier que les courriels utilisent les états « En attente d’envoi », « Envoyé », « En erreur » ou « Configuration manquante », sans statut documentaire « À générer ». Refaire le contrôle en `390 px` sans action inaccessible ni débordement global.
- Vérifier dans Statistiques, GED, Gestion des accès, demandes, corrections, alertes et suivi des courriels qu’un club est présenté par son code (`CNHC`) ou par « code — nom complet », jamais par son identifiant numérique (`106`). Le PDF club doit afficher « Code club » et conserver le numéro uniquement dans les échanges techniques qui l’exigent.
- Avec un administrateur régional, vérifier que « Compétitions à administrer » ne contient que les compétitions de sa région et qu’aucune action « Voir la fiche » n’est proposée. Tenter ensuite d’ouvrir directement l’identifiant d’une compétition régionale ou nationale hors périmètre : la fonction doit répondre `permission-denied`. Un administrateur national doit continuer à voir et administrer toutes les compétitions. Le calendrier Club doit conserver les compétitions auxquelles son club peut s’engager, y compris celles ouvertes à une région invitée.
- Avec un compte cumulant administration régionale et gestion d’un club, passer de « Compétitions à administrer » à « Engagements en compétition » : le filtre Région doit revenir à « Toutes les régions » et toutes les compétitions de la saison doivent être visibles côté Club. Revenir dans l’administration doit réappliquer la région administrée sans réutiliser le filtre du Club.
- Dans Nageurs, vérifier que les nageuses précèdent les nageurs dans « Nageurs engagés » comme dans les résultats de recherche, que chaque groupe reste alphabétique par nom puis prénom et que les repères rose/bleu accompagnent toujours le libellé F/M.
- Sous `620 px`, vérifier dans Courses que seul le nom reste fixe et que la colonne Temps défile avec le tableau. Dans Relais, réduire la largeur disponible autour de `760 px` : chaque relais doit passer en carte juste avant l'apparition d'un défilement horizontal, et ses quatre relayeurs doivent rester empilés sans masquer la suppression.

- Ouvrir une fiche competition et verifier que le message permanent « Fiche chargee » n'apparait dans aucun onglet, tout en conservant les messages de chargement et d'erreur.
- Ouvrir une compétition côté Club avec une inscription existante : vérifier que la fiche compétition et les données déjà enregistrées apparaissent ensemble, sans second écran d'attente pour l'inscription.
- Depuis un navigateur ou un profil vierge, ouvrir directement Courses sans passer par Nageurs : le chef d'équipe, les officiels, les nageurs, les courses, les temps et les relais déjà enregistrés doivent être restaurés. Cocher ensuite une course, attendre « Enregistré », rouvrir le crayon et vérifier que la fenêtre contient immédiatement les courses et leurs temps.
- Revenir au calendrier puis rouvrir la même compétition dans le même onglet : la dernière inscription connue doit apparaître immédiatement, puis rester cohérente après l'actualisation silencieuse du serveur.
- Dans Chef d'equipe, verifier sur ordinateur que personne connue, prenom, nom et licence forment un formulaire compact, puis verifier le retour a une colonne sur mobile.
- Dans Courses, verifier que les nageurs sont affiches en lignes avec Nom, Prenom, Naissance et Categorie, et que les courses suivent l'ordre du programme avec une separation discrete entre les sessions.
- Verifier sur ordinateur et mobile que la matrice defile horizontalement, que Nom reste fixe a gauche et que le crayon Temps reste accessible a droite.
- Verifier que les femmes precedent les hommes dans la matrice Courses, puis que chaque groupe est trie par nom et prenom.
- Cocher puis décocher plusieurs courses d'un nageur : vérifier que chaque clic est enregistré automatiquement, que le temps renvoyé apparaît sous la case sans élargir la colonne et que la limite de courses existante reste appliquée.
- Cocher rapidement plusieurs courses d'un même nageur puis de plusieurs nageurs : vérifier qu'un seul appel groupé part environ `500 ms` après le dernier clic et que le dernier état de chaque ligne est conservé.
- Sur un nageur dont le cache des temps est absent, cocher une course et vérifier qu’un seul calcul accompagne l’enregistrement : aucun appel séparé de prévisualisation ne doit partir. Le cache doit être reconstruit depuis le fichier public du nageur, sans requête sur la collection `performances`. Ouvrir immédiatement le crayon doit attendre cette sauvegarde puis afficher le temps renvoyé. Si le fichier public manque, une erreur explicite doit apparaître sans lancer de parcours Firestore de secours.
- Cocher une course puis quitter immédiatement la fiche avant la fin des `500 ms` : revenir dans la même compétition et ouvrir directement Courses sans passer par Nageurs ; les nageurs et leurs courses doivent être restaurés, avec le temps d'engagement enregistré.
- Faire défiler Courses horizontalement, cocher une course puis attendre la sauvegarde : la matrice doit conserver exactement sa position et le focus doit rester sur la case choisie.
- Vérifier que l'onglet Courses ne répète ni son titre, ni le nombre de courses sélectionnées, ni un bouton ou une barre d'enregistrement. Seul « Enregistrement de la course... » ou « Enregistrement des courses... » apparaît pendant l'écriture et aucun message permanent ne reste après le succès.
- Ouvrir le crayon d'un nageur et verifier qu'il reutilise les temps deja charges ; fermer puis rouvrir la fenetre et verifier que le cache evite une nouvelle lecture.
- Dans la fenêtre des temps, consulter les sources, modifier un temps autorisé, rétablir sa valeur automatique puis valider : la ligne du nageur doit être enregistrée immédiatement et les validations métier existantes doivent rester appliquées.
- Dans un temps manuel de Course puis dans un temps de Relais, saisir `5912`, `12345`, `012345` et `59,12` : a la sortie du champ, verifier respectivement `00:59.12`, `01:23.45`, `01:23.45` et `00:59.12`. Une seconde superieure a 59 ou un temps nul doit etre refuse.
- Modifier une course d'un nageur déjà enregistré : vérifier que seule cette fiche est ajoutée au prochain lot de `saveEngagementClubIndividualEntries`, sans lecture de l'effectif complet ni des licences du club.
- Enregistrer un temps automatique sur une competition autorisant la saisie manuelle : son etat doit rester automatique apres sauvegarde. Modifier ensuite explicitement ce temps et verifier que seul ce second cas prend l'etat manuel.
- Avec plusieurs nageurs sélectionnés, vérifier qu'un clic dans Courses ne traite que la ligne modifiée et que plusieurs clics rapides sont enregistrés dans l'ordre sans perdre le dernier état.
- Dans Chef d'equipe, enregistrer d'abord la renonciation puis revenir sur « Declarer un chef d'equipe » : la recherche des membres actifs du club doit réapparaître. Rechercher par nom ou licence, choisir un membre et vérifier que son identité complète est reprise et enregistrée automatiquement sans bouton supplémentaire. La saisie manuelle interne doit exiger Nom, Prénom, Date de naissance, Sexe et Licence, créer la personne commune puis enregistrer le rôle ; le mode hors club doit masquer naissance et sexe et conserver Nom, Prénom, Licence et Club. Le bouton « Valider le chef d'équipe » reste réservé à la saisie manuelle et la case « hors club » doit précéder son libellé sans le chevaucher.
- Enregistrer uniquement un chef d’équipe, sans nageur, officiel ni relais : « Retirer » doit être disponible et supprimer le dossier vide après confirmation. Recommencer avec au moins un nageur, un officiel ou un relais : « Retirer » doit être désactivé avec une explication, tandis que « Remplacer le chef d’équipe » reste disponible. Vérifier qu’un dossier contenant seulement un chef d’équipe n’apparaît ni dans le nombre de clubs engagés, ni dans la GED des récapitulatifs, ni parmi les courriels de récapitulatif préparés ou envoyés. Un club avec un officiel mais aucun nageur doit rester compté et recevoir son récapitulatif.
- Pour une création manuelle de chef d'équipe puis d'officiel, tester successivement la même licence, la même identité, le nom et le prénom inversés avec la même naissance, puis une orthographe proche avec la même naissance. Les trois premiers cas doivent empêcher une nouvelle fiche et proposer le nom existant. Le cas ressemblant doit nommer le candidat, permettre de le réutiliser ou demander une seconde confirmation avant de créer une nouvelle personne. Aucun rapprochement ne doit fusionner automatiquement les fiches.
- Décochez un nageur déjà engagé, confirmez la suppression de ses courses, puis cochez un autre nageur : les deux actions doivent s'enregistrer automatiquement dans l'ordre, le premier ne doit pas réapparaître et sa ligne doit rester absente de Courses.
- Dans les résultats de recherche, cocher rapidement deux nageurs successifs : le premier doit rester engagé lorsque le second est coché et après les deux retours serveur. Refaire le test avec un premier nageur dont la licence doit encore être renseignée : sa sélection locale doit rester visible sans être considérée comme persistée.
- Dans Nageurs, vérifier l'ordre suivant : « Nageurs engagés » avec son compteur, recherche, volet d'ajout d'un nageur absent, puis liste spontanée de tous les nageurs actifs. Une recherche doit aussi retrouver un nageur inactif. Aucun bouton « Enregistrer » ne doit précéder la liste.
- Dans Courses, vérifier que le tableau Femmes précède le tableau Hommes, que chaque tableau ne contient que les nageurs et courses de son sexe et qu’une course nagée en commun apparaît dans les deux tableaux avec la même session et le même numéro. Nom et Prénom doivent partager la colonne fixe « Nageuse » dans le tableau Femmes et « Nageur » dans le tableau Hommes, le prénom étant placé discrètement sous le nom ; Naissance et Catégorie restent resserrées afin de laisser apparaître plus tôt la première course en `390 px`. Les restrictions de catégorie doivent rester grisées, les cases doivent toujours s’enregistrer automatiquement et chaque tableau doit défiler horizontalement de façon indépendante.
- Dans « Nageurs engages » et dans les resultats de recherche, verifier que Cat. reprend la categorie calculee existante a partir de la naissance et de la date de competition, sans tiret lorsque ces donnees sont connues.
- Sur ordinateur et entre `521 px` et `700 px`, verifier que la licence reste dans sa colonne et que les lignes Nageurs restent proches de `32 px`. « Verifiee » ne doit pas etre affiche ; « Saison a controler » et les anomalies restent sous le numero. Sous `521 px` seulement, verifier le resume Nom/Sexe/Categorie, l'ouverture par `+`, la fermeture des autres lignes et l'acces a la licence dans l'accordeon.
- Dans Nageurs, tenter de retirer un nageur engagé sur une ou plusieurs courses : annuler doit conserver le nageur et ses courses ; confirmer doit déclencher immédiatement leur suppression. Simuler une erreur doit restaurer la coche et les courses.
- Coter organisateur, cocher « Aucun frais d'engagement » puis enregistrer : General doit afficher cette information et ne plus afficher HelloAsso. Verifier aussi le recapitulatif et le PDF. Le mail d'ouverture ne doit jamais afficher de frais ni de lien HelloAsso, quelle que soit la configuration.
- Fermer puis rouvrir une competition : choisir successivement le renvoi puis l'absence de renvoi du mail et verifier que la competition est reouverte dans les deux cas.
- Avec une date de clôture passée, tenter de créer une compétition directement ouverte puis de passer une compétition existante à « Ouverts » : l’interface doit refuser avant la confirmation du mail et la fonction serveur doit renvoyer la même précondition. Avec une date future, l’ouverture doit rester possible.
- Dans le choix du programme organisateur, cliquer sur l'en-tete d'une categorie et verifier que seules les cases des courses selectionnees et compatibles suivent l'etat demande ; modifier ensuite une seule ligne et verifier l'etat intermediaire de l'en-tete.
- Dans la matrice des relais, verifier que la case de la colonne « Plusieurs » reste compacte, centree et utilisable au clavier comme au toucher.
- Ajouter un relais : la distance, la categorie et le sexe doivent etre a choisir et aucune ligne incomplete ne doit disparaitre lors d'un changement. Pour une distance uniquement mixte, verifier que « Mixte » est applique automatiquement et non modifiable.
- Sur un relais renseigne en brouillon, changer la distance : le temps et les participants doivent etre effaces, la categorie et le sexe compatibles conserves, et un message local doit demander leur verification.
- Tenter d'ouvrir la composition d'un relais incomplet : aucune ligne ne doit etre envoyee ou supprimee, et le focus doit rejoindre le premier champ manquant.
- Renseigner la distance, la categorie, le sexe et le temps d'un relais, puis ouvrir le choix des participants : verifier les quatre choix dans une fenetre, sur deux colonnes sur ordinateur et une colonne sur mobile. Pour un relais Femmes, les libelles doivent employer « relayeuses » et « relayeuse ».
- Vérifier que l'onglet Relais ne répète ni son titre ni son compteur, que « Ajouter un relais » apparaît sous le dernier relais et que, dans la vue carte, Catégorie, Sexe et Temps restent sur la même rangée.
- Choisir une personne dans la fenetre Relais : elle doit disparaitre des trois autres listes. Changer le choix doit la rendre de nouveau disponible ; « RAZ » doit vider les quatre listes sans fermer la fenetre.
- Sans participant renseigné, vérifier que la ligne affiche uniquement le bouton « Choisir les relayeurs » ou « Choisir les relayeuses », sans répéter « non renseignés » ni « À valider ». Dès le premier choix, les noms doivent apparaître et le bouton doit devenir « Modifier… ».
- Apres composition, verifier que la ligne affiche les noms et l'initiale des prenoms, sans compteur `4/4`.
- Depuis le dernier champ d'un relais en cours de saisie, cliquer directement sur le choix des participants : la fenetre doit s'ouvrir au premier clic malgré la perte de focus du champ.
- Apres validation, verifier que le relais est présenté en lecture seule et que chaque participant occupe sa propre ligne au format `NOM P.`, sur ordinateur comme sur mobile. Le crayon doit repasser la ligne en modification et Annuler restaurer les valeurs enregistrées.
- Dans la vue carte d'un relais enregistré, vérifier que la liste verticale des participants reste à droite de Catégorie, Sexe et Temps tant que la zone mesure plus de `520 px`, puis passe dessous seulement sous ce seuil.
- Sur une ligne Relais enregistrée, vérifier que le crayon et la poubelle sont côte à côte sans chevauchement sur ordinateur et mobile ; la croix doit rester réservée à l'annulation d'une modification.
- Valider les relayeurs : verifier l'etat de chargement dans la fenetre, sa fermeture apres reussite et la confirmation « Relais enregistre » sans utiliser de bouton d'enregistrement global.
- Simuler une erreur d'enregistrement du relais : la fenetre doit rester ouverte, conserver les choix et afficher l'erreur sans perdre la ligne.
- A une largeur proche de 657 px, passer de Chef d'equipe a Nageurs puis Relais : la largeur globale ne doit plus varier avec l'apparition de la barre de defilement.
- Sur tablette puis mobile, verifier que les marges exterieures passent visuellement de 12 px a 8 px et que la fiche competition ne cumule plus de grands retraits imbriques.
- Dans Nageurs, verifier des lignes proches de 36 px sur ordinateur et 40 px sur mobile ; le numero et l'etat de licence doivent rester sur une seule ligne et la zone de selection doit occuper toute la hauteur.

## Resultats sans finale

- Importer un PDF resultat sans finale.
- Verifier que le PDF est publie.
- Verifier que les temps apparaissent sur la page resultats.
- Verifier que la fiche nageur affiche le temps realise.
- Verifier que le bouton PDF fonctionne.
- Verifier dans Firestore que le nouveau document PDF contient `pdfUrl` et `storagePath`, sans `pdfDataUrl` lorsque la fonction de stockage est disponible.

## Resultats avec finale

- Importer un PDF resultat avec finalistes.
- Verifier les qualifies Finale A.
- Verifier les qualifies Finale B s'il y en a une.
- Verifier les non qualifies.
- Faire annoncer les finalistes par le speaker.
- Verifier que le bureau des performances et le secretariat voient le statut annonce.

## Forfaits et repechages

- Declarer un forfait en finale depuis le secretariat.
- Verifier que le nageur suivant est repeche.
- Verifier que l'alerte speaker apparait.
- Annoncer le repechage cote speaker.
- Verifier que l'alerte ne revient pas.
- Reintegrer un finaliste si besoin et verifier que la composition reste coherente.

## Alertes JA / Video / Bureau

- Creer une fausse decision JA.
- Confirmer cote video si necessaire.
- Verifier que le speaker recoit l'annonce.
- Cliquer sur Annonce cote speaker.
- Verifier que l'alerte disparait.
- Traiter cote bureau des performances.
- Verifier l'historique.

## Pages publiques

- Verifier `resultats.html`.
- Verifier `series-public.html`.
- Verifier le bouton actualiser.
- Verifier la recherche nageur.
- Verifier qu'une fiche nageur affiche engagement, temps realise, finale, DSQ/ABD/forfait si present.
- Verifier `archives.html` avec `public/archivesIndex`, puis son repli historique sur un environnement ou l'index est absent.
- Verifier `performances/records.html` et `performances/mpf.html` sans connexion Firestore : les donnees statiques doivent s'afficher.
- Publier une modification RF ou MPF depuis l'administration, puis verifier sans redeployer que `performance-public-firestore/records/manifest.json` change et que la valeur apparait sur la page publique.
- Verifier que Records, MPF et une fiche nageur restent utilisables si le manifeste Storage est temporairement indisponible : le fichier Hosting doit servir de secours.

## Portail LivePalmes

- Ouvrir « Mes nageurs » et vérifier que la liste se charge automatiquement, sans bouton « Actualiser » ni heure de dernière lecture ; seuls le chargement, une erreur ou un état vide doivent produire un message. Le champ de recherche doit occuper seul toute la largeur disponible.
- Vérifier que « Mes nageurs » affiche les actifs avant les inactifs avec un séparateur et un tri alphabétique par groupe, toujours avec le nom avant le prénom ; changer manuellement le statut dans les deux sens et vérifier qu’il est conservé après rechargement. Une licence absente doit être libellée « Licence à renseigner ».
- Après l'import d'une nouvelle performance d'un nageur inactif, vérifier qu'il repasse automatiquement actif dans « Mes nageurs » sans recalculer le statut des autres nageurs.
- Vérifier que la petite icône placée après le nom rend l’accès à la fiche publique identifiable. Cliquer sur le nom d’un nageur, annuler une première fois puis confirmer : la fiche publique doit s’ouvrir dans un nouvel onglet uniquement après confirmation.
- En largeur mobile, vérifier que chaque ligne fermée conserve nom, pastille combinée `F · catégorie` ou `H · catégorie`, actions et chevron. Après ouverture, seuls Naissance et Licence doivent apparaître sur deux colonnes, sans répétition du nom, du sexe, de la catégorie ni des actions.
- Sur une longue liste ordinateur, vérifier que l’en-tête reste visible pendant le défilement ; sur mobile, vérifier que le sexe et la catégorie apparaissent avant l’ouverture du détail.
- Dans l’onglet Nageurs d’une compétition, vérifier qu’une licence connue s’affiche comme une donnée non modifiable et avec la même taille de texte que le nom, la naissance, le sexe et la catégorie.
- Sélectionner un nageur sans licence : l’enregistrement doit imposer une valeur au format `A-12-34567` et refuser une valeur vide ou mal formée.
- Verifier qu'une connexion n'ouvre aucune liste d'administration tant que son ecran n'est pas visite.
- Ouvrir successivement Records / MPF, Correction puis Import : les deux premiers ecrans ne doivent pas charger XLSX ; l'import doit accepter un fichier Excel apres son chargement a la demande.
- Dans Records / MPF, saisir au moins deux lettres d'un nageur et verifier les suggestions, la date de naissance et le club sans chargement de `admin-reference.js`.
- Verifier la pagination et les filtres de Gestion des acces avec un profil national puis regional ; une recherche bornee doit inviter a affiner les filtres.
- Avec une demande d’accès en attente, vérifier que le compteur rouge apparaît sur « Gestion des accès » dans le rail, sur « Gestion du portail » dans la Vue d’ensemble et sur la carte « Demandes d’accès ». Un profil régional ne doit compter que les demandes de sa région ; un profil national doit compter toutes les régions. À zéro, aucune pastille ne doit rester visible ; au-delà de 99, la pastille doit afficher `99+` tout en conservant le total exact dans son libellé accessible.
- Avec une correction ou une suppression nationale en attente, vérifier le même compteur sur « Administration nationale », sa carte de Vue d’ensemble et « Demandes à traiter ». Traiter une demande doit actualiser les compteurs sans recharger la page. Dans l’onglet Réseau, vérifier l’absence de listener Firestore et d’appel de liste déclenché uniquement par ces compteurs.
- Envoyer une demande d'acces publique valide, puis verifier qu'un doublon est refuse et qu'une rafale de demandes est limitee.
- Dans un environnement de test configure avec les secrets `LIVEPALMES_SMTP_*`, envoyer une demande d'acces publique valide et verifier la reception de l'accuse personnalise depuis `livepalmes@nap-ffessm.fr`.
- Dans un environnement de test sans SMTP disponible, verifier que la demande reste enregistree et que son champ `acknowledgementEmail.status` vaut `skipped_missing_config` ou `failed`.
- Desactiver un compte de test et verifier qu'une nouvelle requete avec son ancien jeton est refusee apres actualisation.
- Ouvrir l'espace DTN et verifier que son fichier JavaScript n'est charge qu'a l'entree dans cet espace.
- Sur un cache DTN chaud, verifier que la vue est immediate. Avec un cache absent ou perime, verifier que l'ouverture ne cree aucun document `dtnQualificationJobs` et invite a utiliser « Recalculer ». Forcer ensuite le recalcul dans un environnement de test : la derniere vue doit rester affichee, le message doit annoncer le traitement en arriere-plan, un seul document `dtnQualificationJobs` doit etre cree par saison, sexe et empreinte, et le journal doit indiquer `firestoreDocuments: 0` pour les lignes DTN.
- Preparer un mail d'ouverture puis un mail recapitulatif et verifier que `engagementMailRecipientIndexState/default` passe a `ready`. Une seconde preparation doit lire uniquement les fragments `engagementMailRecipientShards`, sans requete `users` par capacite. Si l'initialisation depasse la limite, utiliser `rebuildEngagementMailRecipientIndexNextPage` avec `reset: true`, puis par pages de 250 maximum jusqu'a `done: true`.
- Dans le calendrier des engagements, changer région, niveau et statut : aucun nouvel appel `listEngagementCompetitions` ne doit partir. Changer de saison doit en produire exactement un. Dans la vue d’administration régionale, le filtre « mes compétitions » ne doit plus apparaître puisque le périmètre est imposé par le serveur.
- Ouvrir une competition club deux fois en moins de 30 secondes : la deuxieme ouverture doit etre immediate et ne doit appeler ni `getEngagementClubEntry`, ni `listEngagementClubPeople`. Apres 30 secondes, une actualisation silencieuse est attendue.
- Selectionner rapidement plusieurs nageurs : verifier qu'un seul appel `saveEngagementClubSwimmerSelections` contient les modifications et qu'aucun engagement existant n'est perdu.
- Ouvrir rapidement les temps de plusieurs nageurs : verifier qu'un seul appel `previewEngagementClubSwimmerEventTimesBatch` est effectue et qu'il reste borne a 50 nageurs.
- Avant la premiere mise en service des agrégats, appeler `rebuildEngagementClubAggregates` uniquement dans un environnement controle, un club par appel, puis verifier `engagementClubRosters.generatedAt` et `engagementClubPeopleRosters.generatedAt`. Ne jamais lancer cette reconstruction depuis une session club.
- Dans les journaux Functions, filtrer `livepalmes.portal.reads` et verifier que `baseDocuments`, `variableDocumentsMax`, `cacheHit` et `durationMs` sont presents sans identifiant personnel.

- Couper Firestore dans un environnement de test et verifier que les pages Series et Resultats conservent leur dernier cache au lieu de remplacer l'affichage par une erreur.

- Ajouter un nageur absent de la base proche d'une fiche existante : verifier que l'alerte affiche le nom de la fiche rapprochee et que la confirmation reste possible.
- Saisir la licence d’un nageur rattaché à un autre club sans résultat publié depuis le 1er septembre : vérifier que « Récupérer ce nageur » est proposé, que le nageur rejoint l’effectif du club courant et que son ancien club ne le propose plus.
- Recommencer avec un nageur ayant un résultat publié pendant la saison en cours : vérifier que la récupération est bloquée et que le message mentionne la dérogation nationale.
- Recommencer avec le nom et le prenom exactement inverses et la meme date de naissance : verifier que le nom existant est affiche, qu'aucune confirmation n'est proposee et que la creation est refusee cote serveur.
- Dans ce formulaire, verifier que Nom precede Prenom, que ces champs puis Date de naissance et Sexe restent par paires, que le nom saisi ou colle devient immédiatement majuscule et que la licence saisie comme `A1234567` devient `A-12-34567`.
- Cliquer sur « RAZ » apres avoir rempli les champs et obtenu une alerte : les champs et l'alerte doivent etre effaces, le volet doit rester ouvert et le focus revenir sur Nom.

## Diagnostic et maintenance

- Ouvrir le diagnostic technique.
- Verifier qu'il ne signale pas d'alerte grave.
- Ouvrir le diagnostic performance.
- Verifier qu'il n'y a pas de vieux PDF resultats a nettoyer.
- Verifier que les index publics restent sous 650 ko ; entre 650 et 900 ko, planifier leur decoupage par session.
- Ne lancer une RAZ que si la competition est terminee ou si c'est un vrai test.
