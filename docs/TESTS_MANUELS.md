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

- Dans « Mes nageurs », vérifier que l'icône poubelle « Demander la suppression de [Nom] » apparaît uniquement pour une fiche créée depuis le portail, reste utilisable au clavier et conserve son infobulle. Sans performance ni inscription, confirmer doit supprimer immédiatement la fiche. Avec une inscription ou une correspondance dans les performances, la fiche doit disparaître de l’effectif, être désactivée et créer une demande nationale détaillée.
- Dans Administration nationale > Suppressions, approuver une demande nageur doit conserver sa fiche désactivée pour l’historique. Refuser doit la réactiver dans l’effectif du club. Vérifier qu’une suppression nationale directe d’une fiche utilisée est refusée.
- Créer une compétition avec un nombre de lignes d'eau inférieur à 4, supérieur à 10 ou absent : l'enregistrement doit être refusé. Avec une valeur valide, Général et le PDF doivent afficher la longueur du bassin et le nombre de lignes. Une ancienne compétition sans cette donnée doit rester consultable et indiquer que le nombre de lignes n'est pas renseigné.
- Dans Nageurs, vérifier que les nageuses sélectionnées précèdent les nageurs, que chaque groupe reste alphabétique et que les repères rose/bleu accompagnent toujours le libellé F/M.
- Sous `620 px`, vérifier dans Courses que seul le nom reste fixe et que la colonne Temps défile avec le tableau. Sous `700 px`, vérifier dans Relais que chaque relais devient une carte et que ses quatre relayeurs sont empilés sans masquer la suppression.

- Ouvrir une fiche competition et verifier que le message permanent « Fiche chargee » n'apparait dans aucun onglet, tout en conservant les messages de chargement et d'erreur.
- Dans Chef d'equipe, verifier sur ordinateur que personne connue, prenom, nom et licence forment un formulaire compact, puis verifier le retour a une colonne sur mobile.
- Dans Courses, verifier que les nageurs sont affiches en lignes avec Nom, Prenom, Naissance et Categorie, et que les courses suivent l'ordre du programme avec une separation discrete entre les sessions.
- Verifier sur ordinateur et mobile que la matrice defile horizontalement, que Nom reste fixe a gauche et que le crayon Temps reste accessible a droite.
- Verifier que les femmes precedent les hommes dans la matrice Courses, puis que chaque groupe est trie par nom et prenom.
- Cocher plusieurs courses d'un nageur : verifier que le temps apparait sous chaque case sans elargir la colonne, qu'une seule lecture groupee est declenchee pour ce nageur et que la limite de courses existante reste appliquee.
- Verifier que l'onglet Courses ne repete ni son titre ni le nombre de courses selectionnees ; la barre « Modifications non enregistrees » doit apparaitre au premier changement, rester visible pendant un echec et disparaitre apres un enregistrement reussi.
- Ouvrir le crayon d'un nageur et verifier qu'il reutilise les temps deja charges ; fermer puis rouvrir la fenetre et verifier que le cache evite une nouvelle lecture.
- Dans la fenetre des temps, consulter les sources, modifier un temps autorise, retablir sa valeur automatique, valider le brouillon puis enregistrer les courses ; verifier que les validations metier existantes restent appliquees.
- Modifier les courses d'un seul nageur deja enregistre puis sauvegarder : verifier que seule cette fiche est envoyee a `saveEngagementClubIndividualEntries`, sans lecture de l'effectif complet ni des licences du club.
- Enregistrer un temps automatique sur une competition autorisant la saisie manuelle : son etat doit rester automatique apres sauvegarde. Modifier ensuite explicitement ce temps et verifier que seul ce second cas prend l'etat manuel.
- Avec plusieurs nageurs selectionnes, verifier qu'une sauvegarde Courses lit au plus les documents fixes utilisateur, competition et inscription, puis un cache par nageur modifie ; une absence de cache peut declencher sa reconstruction bornee.
- Dans Chef d'equipe, verifier que le formulaire est replie sans choix, qu'il se deploie en choisissant « Declarer un chef d'equipe » et que la case « hors club » precede son libelle sans le chevaucher.
- Decochez un nageur deja engage, confirmez la suppression de ses courses, puis cochez un autre nageur : le premier ne doit pas reapparaitre et sa ligne doit rester absente de Courses.
- Dans Nageurs, verifier l'ordre suivant : nageurs selectionnes avec leur compteur, recherche, autres nageurs sans compteur, puis ajout d'un nageur absent de la base.
- Dans Nageurs, tenter de retirer un nageur engage sur une ou plusieurs courses : annuler doit conserver le nageur et ses courses ; confirmer puis enregistrer doit supprimer le nageur et ses engagements individuels.
- Coter organisateur, cocher « Aucun frais d'engagement » puis enregistrer : General doit afficher cette information et ne plus afficher HelloAsso. Verifier aussi le recapitulatif, le PDF et les mails prepares.
- Fermer puis rouvrir une competition : choisir successivement le renvoi puis l'absence de renvoi du mail et verifier que la competition est reouverte dans les deux cas.
- Dans le choix du programme organisateur, cliquer sur l'en-tete d'une categorie et verifier que seules les cases des courses selectionnees et compatibles suivent l'etat demande ; modifier ensuite une seule ligne et verifier l'etat intermediaire de l'en-tete.
- Dans la matrice des relais, verifier que la case de la colonne « Plusieurs » reste compacte, centree et utilisable au clavier comme au toucher.

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
