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

- Vérifier « Engagements en compétition » et « Compétitions à administrer » sur ordinateur : le bandeau de filtres doit suivre directement le titre, sans carte extérieure imbriquée, et une compétition doit occuper une ligne à cinq colonnes avec le lieu sous son nom. Le décompte et l’action ne doivent jamais se chevaucher. Sous `1120 px`, les cinq colonnes doivent rester lisibles ; sous `760 px`, la ligne doit devenir une mini-fiche sans défilement horizontal ni action masquée.
- Ouvrir une fiche côté Club : vérifier que le nom de la compétition est le premier intitulé, que la date et le lieu sont sur la ligne secondaire, que le niveau et l’état des engagements sont deux badges et que « Fiche compétition club » ainsi que « Consultation » sont absents. Le retour doit être placé dans l’en-tête « Engagements en compétition » et rester accessible sur mobile.
- Dans Officiels, choisir un nageur du club ayant une licence puis « Ajouter comme officiel » : vérifier que son identité n’est pas ressaisie, qu’il apparaît parmi les officiels sélectionnés et qu’il reste réutilisable après réouverture. Une personne non nageuse doit toujours pouvoir être créée manuellement. Un nageur sans licence ne doit pas être sélectionnable comme officiel.

- Dans « Mes nageurs », vérifier que l'icône poubelle « Demander la suppression de [Nom] » apparaît uniquement pour une fiche créée depuis le portail, reste utilisable au clavier et conserve son infobulle. Sans performance ni inscription, confirmer doit supprimer immédiatement la fiche. Avec une inscription ou une correspondance dans les performances, la fiche doit disparaître de l’effectif, être désactivée et créer une demande nationale détaillée.
- Dans Administration nationale > Suppressions, approuver une demande nageur doit conserver sa fiche désactivée pour l’historique. Refuser doit la réactiver dans l’effectif du club. Vérifier qu’une suppression nationale directe d’une fiche utilisée est refusée.
- Créer une compétition avec un nombre de lignes d'eau inférieur à 4, supérieur à 10 ou absent : l'enregistrement doit être refusé. Avec une valeur valide, Général et le PDF doivent afficher la longueur du bassin et le nombre de lignes. Une ancienne compétition sans cette donnée doit rester consultable et indiquer que le nombre de lignes n'est pas renseigné.
- Dans Nageurs, vérifier que les nageuses précèdent les nageurs dans « Nageurs engagés » comme dans les résultats de recherche, que chaque groupe reste alphabétique par nom puis prénom et que les repères rose/bleu accompagnent toujours le libellé F/M.
- Sous `620 px`, vérifier dans Courses que seul le nom reste fixe et que la colonne Temps défile avec le tableau. Dans Relais, réduire la largeur disponible autour de `760 px` : chaque relais doit passer en carte juste avant l'apparition d'un défilement horizontal, et ses quatre relayeurs doivent rester empilés sans masquer la suppression.

- Ouvrir une fiche competition et verifier que le message permanent « Fiche chargee » n'apparait dans aucun onglet, tout en conservant les messages de chargement et d'erreur.
- Dans Chef d'equipe, verifier sur ordinateur que personne connue, prenom, nom et licence forment un formulaire compact, puis verifier le retour a une colonne sur mobile.
- Dans Courses, verifier que les nageurs sont affiches en lignes avec Nom, Prenom, Naissance et Categorie, et que les courses suivent l'ordre du programme avec une separation discrete entre les sessions.
- Verifier sur ordinateur et mobile que la matrice defile horizontalement, que Nom reste fixe a gauche et que le crayon Temps reste accessible a droite.
- Verifier que les femmes precedent les hommes dans la matrice Courses, puis que chaque groupe est trie par nom et prenom.
- Cocher puis décocher plusieurs courses d'un nageur : vérifier que chaque clic est enregistré automatiquement, que le temps renvoyé apparaît sous la case sans élargir la colonne et que la limite de courses existante reste appliquée.
- Cocher rapidement plusieurs courses d'un même nageur puis de plusieurs nageurs : vérifier qu'un seul appel groupé part environ `500 ms` après le dernier clic et que le dernier état de chaque ligne est conservé.
- Cocher une course puis quitter immédiatement la fiche avant la fin des `500 ms` : revenir dans la même compétition et ouvrir directement Courses sans passer par Nageurs ; les nageurs et leurs courses doivent être restaurés, avec le temps d'engagement enregistré.
- Faire défiler Courses horizontalement, cocher une course puis attendre la sauvegarde : la matrice doit conserver exactement sa position et le focus doit rester sur la case choisie.
- Vérifier que l'onglet Courses ne répète ni son titre, ni le nombre de courses sélectionnées, ni un bouton ou une barre d'enregistrement. Seul « Enregistrement de la course... » ou « Enregistrement des courses... » apparaît pendant l'écriture et aucun message permanent ne reste après le succès.
- Ouvrir le crayon d'un nageur et verifier qu'il reutilise les temps deja charges ; fermer puis rouvrir la fenetre et verifier que le cache evite une nouvelle lecture.
- Dans la fenêtre des temps, consulter les sources, modifier un temps autorisé, rétablir sa valeur automatique puis valider : la ligne du nageur doit être enregistrée immédiatement et les validations métier existantes doivent rester appliquées.
- Dans un temps manuel de Course puis dans un temps de Relais, saisir `5912`, `12345`, `012345` et `59,12` : a la sortie du champ, verifier respectivement `00:59.12`, `01:23.45`, `01:23.45` et `00:59.12`. Une seconde superieure a 59 ou un temps nul doit etre refuse.
- Modifier une course d'un nageur déjà enregistré : vérifier que seule cette fiche est ajoutée au prochain lot de `saveEngagementClubIndividualEntries`, sans lecture de l'effectif complet ni des licences du club.
- Enregistrer un temps automatique sur une competition autorisant la saisie manuelle : son etat doit rester automatique apres sauvegarde. Modifier ensuite explicitement ce temps et verifier que seul ce second cas prend l'etat manuel.
- Avec plusieurs nageurs sélectionnés, vérifier qu'un clic dans Courses ne traite que la ligne modifiée et que plusieurs clics rapides sont enregistrés dans l'ordre sans perdre le dernier état.
- Dans Chef d'equipe, verifier que le formulaire est replie sans choix, qu'il se deploie en choisissant « Declarer un chef d'equipe » et que la case « hors club » precede son libelle sans le chevaucher.
- Décochez un nageur déjà engagé, confirmez la suppression de ses courses, puis cochez un autre nageur : les deux actions doivent s'enregistrer automatiquement dans l'ordre, le premier ne doit pas réapparaître et sa ligne doit rester absente de Courses.
- Dans les résultats de recherche, cocher rapidement deux nageurs successifs : le premier doit rester engagé lorsque le second est coché et après les deux retours serveur. Refaire le test avec un premier nageur dont la licence doit encore être renseignée : sa sélection locale doit rester visible sans être considérée comme persistée.
- Dans Nageurs, vérifier l'ordre suivant : « Nageurs engagés » avec son compteur, recherche sans liste spontanée, puis ajout d'un nageur absent de la base. Aucun bloc « Nageurs » ni bouton « Enregistrer » ne doit précéder la liste.
- Dans « Nageurs engages » et dans les resultats de recherche, verifier que Cat. reprend la categorie calculee existante a partir de la naissance et de la date de competition, sans tiret lorsque ces donnees sont connues.
- Sur ordinateur et entre `521 px` et `700 px`, verifier que la licence reste dans sa colonne et que les lignes Nageurs restent proches de `32 px`. « Verifiee » ne doit pas etre affiche ; « Saison a controler » et les anomalies restent sous le numero. Sous `521 px` seulement, verifier le resume Nom/Sexe/Categorie, l'ouverture par `+`, la fermeture des autres lignes et l'acces a la licence dans l'accordeon.
- Dans Nageurs, tenter de retirer un nageur engagé sur une ou plusieurs courses : annuler doit conserver le nageur et ses courses ; confirmer doit déclencher immédiatement leur suppression. Simuler une erreur doit restaurer la coche et les courses.
- Coter organisateur, cocher « Aucun frais d'engagement » puis enregistrer : General doit afficher cette information et ne plus afficher HelloAsso. Verifier aussi le recapitulatif, le PDF et les mails prepares.
- Fermer puis rouvrir une competition : choisir successivement le renvoi puis l'absence de renvoi du mail et verifier que la competition est reouverte dans les deux cas.
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

- Ouvrir « Mes nageurs » et vérifier que la liste se charge automatiquement, sans bouton « Actualiser » ni heure de dernière lecture ; seuls le chargement, une erreur ou un état vide doivent produire un message.
- Vérifier que « Mes nageurs » est trié alphabétiquement avec le nom avant le prénom, que le filtre « Licences manquantes » fonctionne et qu’une licence absente est libellée « Licence à renseigner ».
- Cliquer sur le nom d’un nageur, annuler une première fois puis confirmer : la fiche publique doit s’ouvrir dans un nouvel onglet uniquement après confirmation.
- Sur une longue liste ordinateur, vérifier que l’en-tête reste visible pendant le défilement ; sur mobile, vérifier que le sexe et la catégorie apparaissent avant l’ouverture du détail.
- Dans l’onglet Nageurs d’une compétition, vérifier qu’une licence connue s’affiche comme une donnée non modifiable et avec la même taille de texte que le nom, la naissance, le sexe et la catégorie.
- Sélectionner un nageur sans licence : l’enregistrement doit imposer une valeur au format `A-12-34567` et refuser une valeur vide ou mal formée.
- Verifier qu'une connexion n'ouvre aucune liste d'administration tant que son ecran n'est pas visite.
- Ouvrir successivement Records / MPF, Correction puis Import : les deux premiers ecrans ne doivent pas charger XLSX ; l'import doit accepter un fichier Excel apres son chargement a la demande.
- Dans Records / MPF, saisir au moins deux lettres d'un nageur et verifier les suggestions, la date de naissance et le club sans chargement de `admin-reference.js`.
- Verifier la pagination et les filtres de Gestion des acces avec un profil national puis regional ; une recherche bornee doit inviter a affiner les filtres.
- Envoyer une demande d'acces publique valide, puis verifier qu'un doublon est refuse et qu'une rafale de demandes est limitee.
- Dans un environnement de test configure avec les secrets `LIVEPALMES_SMTP_*`, envoyer une demande d'acces publique valide et verifier la reception de l'accuse personnalise depuis `livepalmes@nap-ffessm.fr`.
- Dans un environnement de test sans SMTP disponible, verifier que la demande reste enregistree et que son champ `acknowledgementEmail.status` vaut `skipped_missing_config` ou `failed`.
- Desactiver un compte de test et verifier qu'une nouvelle requete avec son ancien jeton est refusee apres actualisation.
- Ouvrir l'espace DTN sur un cache chaud, puis forcer un recalcul sur un environnement de test et verifier les metadonnees `readStats`.

- Couper Firestore dans un environnement de test et verifier que les pages Series et Resultats conservent leur dernier cache au lieu de remplacer l'affichage par une erreur.

- Ajouter un nageur absent de la base proche d'une fiche existante : verifier que l'alerte affiche le nom de la fiche rapprochee et que la confirmation reste possible.
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
