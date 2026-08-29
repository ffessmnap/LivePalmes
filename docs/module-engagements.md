# Module engagements LivePalmes

<!-- description: Cahier des charges fonctionnel de référence du module de gestion des engagements en compétition, actuellement en finalisation et en test. -->

> **Statut du document :** ce cahier des charges a guide la construction du module integre au Portail LivePalmes. Le module existe maintenant dans le code, mais le portail complet n'est pas encore considere comme operationnel : il reste en finalisation, en test et en amelioration continue. Les formulations de conception conservees plus bas servent de reference fonctionnelle et d'historique des decisions.

## Objectif

Ce document cadre la premiere version du module d'engagements LivePalmes integre au portail.

Le module permet aux clubs d'engager leurs nageurs, relais, officiels et chefs d'equipe sur des competitions, avec une gestion regionale et nationale des competitions, des acces, des documents et des exports. Son fonctionnement reste soumis aux tests et validations necessaires avant mise en service operationnelle.

Les priorites restent celles du projet LivePalmes :

1. fiabilite ;
2. simplicite ;
3. performance ;
4. fonctionnalites.

La premiere version doit rester robuste et progressive. Elle ne doit pas introduire une nouvelle architecture si une structure existante peut etre reutilisee.

## Perimetre fonctionnel V1

Le module couvre :

- la gestion des acces club, region et national ;
- les demandes d'acces ;
- la creation et le parametrage des competitions ;
- le calendrier des competitions ;
- les engagements individuels ;
- les engagements relais ;
- la declaration du chef d'equipe ;
- la declaration des officiels lorsque la competition le demande ;
- le calcul indicatif des frais d'engagement ;
- la generation de recapitulatif PDF par club ;
- la generation d'un export TXT global ;
- une GED simple par competition ;
- les notifications mail principales.

Le format exact de l'export TXT et la configuration technique des mails seront definis plus tard.

## Droits independants du portail

Les droits du portail doivent rester des capacites metier independantes.

Un droit general d'administration du portail permet de gerer les comptes, les demandes et les droits, mais il ne doit pas etre considere comme un droit automatique sur tous les modules sensibles.

Les modules suivants doivent rester separes :

- gestion des records et MPF ;
- acces aux consoles ;
- import ou correction des competitions ;
- espace DTN ;
- module engagements.

Un meme compte peut cumuler plusieurs capacites, mais chaque capacite correspond a une casquette distincte et doit etre tracee separement.

## Hors perimetre DTN

Le droit `dtn.view` existe dans le portail LivePalmes pour l'espace DTN.

Il est independant du module engagements :

- il ne donne aucun droit pour creer ou modifier des engagements ;
- il ne donne aucun droit pour creer ou modifier une competition d'engagements ;
- il ne donne aucun droit sur les exports ou la GED des engagements.

Un meme compte peut cumuler `dtn.view` et un droit engagements, mais les deux droits correspondent a des usages separes.

Les engagements doivent utiliser des capacites dediees, par exemple :

- `engagements.club.manage` ;
- `engagements.region.manage` ;
- `engagements.national.manage`.

## Niveaux d'acces

### Niveau 1 - Club

Un utilisateur niveau 1 est rattache a un seul club.

Il peut :

- consulter le calendrier des competitions ;
- faire les engagements de son club ;
- creer ou completer des nageurs dans le cadre des engagements ;
- declarer les officiels du club ;
- declarer les chefs d'equipe ;
- consulter la liste des utilisateurs rattaches a son club ;
- telecharger le PDF recapitulatif de son club.

Il ne peut pas :

- creer directement un autre acces club ;
- valider une demande d'acces ;
- voir les engagements des autres clubs ;
- modifier une competition.

Tous les utilisateurs valides pour un club peuvent faire des engagements.

### Niveau 2 - Region

Un utilisateur niveau 2 est rattache a une seule region.

Il peut :

- creer des competitions departementales ou regionales dans sa region ;
- gerer les demandes d'acces pour les clubs de sa region ;
- creer directement un acces pour un club de sa region ;
- desactiver un acces club de sa region ;
- consulter les competitions de sa region ;
- consulter les statistiques et documents des competitions de sa region ;
- rouvrir les engagements d'une competition departementale ou regionale de sa region.

Il ne peut pas :

- creer une competition nationale ;
- gerer une autre region ;
- consulter les alertes nationales de doublons valides.

### Niveau 3 - National

Un utilisateur niveau 3 a un acces global.

Il peut :

- creer des competitions departementales, regionales ou nationales ;
- gerer tous les acces ;
- traiter toutes les demandes d'acces ;
- agir comme un club avec tracabilite ;
- consulter toutes les competitions ;
- consulter les statistiques et documents de toutes les competitions ;
- gerer les derogations nationales ;
- consulter les alertes sensibles, dont les doublons valides.

Les droits niveau 3 restent geres manuellement par l'administrateur national.

## Demandes d'acces

Une personne peut demander un acces pour elle-meme.

Champs demandes :

- nom ;
- prenom ;
- role dans le club ;
- numero du club ;
- numero de licence ;
- region ;
- adresse mail du compte authentifie.

Un utilisateur deja rattache a un club peut aussi faire une demande pour un entraineur ou responsable du club.

Dans ce cas, il renseigne au minimum :

- nom ;
- prenom ;
- email ;
- role dans le club ;
- numero de licence si disponible ;
- club concerne ;
- message eventuel.

La demande ne donne aucun droit tant qu'elle n'est pas validee.

Validation :

- niveau 2 : uniquement pour les clubs de sa region ;
- niveau 3 : tous les clubs.

Un acces club peut etre desactive par un niveau 2 ou 3. La desactivation ne doit pas supprimer l'historique.

## Competitions

### Niveaux de competition

Une competition a un niveau :

- departemental ;
- regional ;
- national.

Les competitions departementales sont gerees par la region. Il n'y a pas de champ departement obligatoire : l'organisateur peut preciser le contexte dans le titre de la competition.

Creation :

- niveau 2 : competitions departementales et regionales uniquement ;
- niveau 3 : competitions departementales, regionales et nationales.

Pour un niveau 2, la region de la competition est automatiquement celle de l'administrateur regional.

L'ajout initial au calendrier est volontairement rapide : type obligatoire (`pool` ou `openWater`), nom, dates de debut et de fin, lieu, niveau et region organisatrice lorsque le niveau l'exige. Aucun type n'est preselectionne et il devient definitif apres la creation. La competition est toujours creee avec le statut `upcoming` (`A venir`), sans ouverture des engagements ni envoi de courriel. Apres validation, l'administrateur choisit de completer immediatement la fiche ou de revenir au calendrier ; tous les autres parametres sont renseignes depuis la fiche d'administration. Les competitions historiques sans type sont interpretees comme des competitions piscine.

### Parametres generaux

La configuration complete d'une competition contient notamment :

- nom ;
- date ;
- lieu ;
- region ;
- niveau de competition ;
- type de competition : piscine ou eau libre ;
- en piscine, bassin : 25 m, 33 m ou 50 m et nombre de lignes d'eau ;
- en eau libre, type de plan d'eau facultatif : mer, lac, riviere ou autre ;
- chronometrage : manuel ou electronique ;
- date et heure limite des engagements ;
- email du responsable informatique ;
- email du responsable juge ;
- lien HelloAsso si connu ;
- officiels requis : oui ou non ;
- plusieurs relais de meme categorie par club autorises : oui ou non.

Si le lien HelloAsso n'est pas encore connu, l'interface affiche que le lien est en attente de publication.

### Courses et restrictions

En piscine, la bibliotheque des courses existante et les regles de temps sont conservees. En eau libre, une bibliotheque nationale de courses, commune aux regions, est chargee seulement a l'ouverture du parametrage de la competition. Une course associe une distance et une specialite (`Surface`, `Bi-palmes` ou `Support`). La bibliotheque est un tableau compact, classe par distance croissante, avec une ligne par distance et une colonne par specialite. Un bouton `+` ajoute la course au programme ; sur petit ecran, les colonnes sont abregees en `SF`, `BI` et `SP`. Un administrateur regional ou national peut ajouter une association distance-specialite depuis un formulaire aligne sur une seule ligne, qui reste disponible pour les competitions suivantes. Une course deja utilisee n'est jamais supprimee : elle peut etre desactivee pour les futurs programmes sans modifier les competitions existantes.

La bibliotheque initiale propose `1000 m`, `3000 m` et `5000 m` dans les trois specialites. Le `150 m elimination` constitue une exception et n'est propose qu'en Surface et Bi-palmes. Dans le programme Eau libre, toutes les courses sont directement nagees et n'affichent donc ni libelle « Course directe » ni choix de format ; seul le `150 m elimination` peut choisir entre Course directe et Series + finale(s). Le relais `4 x 1000 m SB mixte` impose deux femmes et deux hommes et reprend les controles du `4 x 100 m SB` piscine.

Lorsqu'un administrateur change d'onglet avec des modifications non enregistrees, une fenetre propose d'enregistrer et continuer, d'abandonner reellement les modifications et continuer, ou de rester sur l'onglet. Un echec de validation ou d'enregistrement interdit le changement d'onglet.

Le parametrage des restrictions se fait par course.

Une epreuve ouverte aux engagements n'existe qu'une seule fois, meme lorsqu'elle comporte plusieurs passages dans le programme. Son format propose seulement trois choix : course directe par defaut, `series + finale(s)` ou `series lentes / serie rapide`. Pour un format en deux passages, la premiere apparition est automatiquement la serie ou les series lentes ; la seconde est automatiquement la ou les finales ou la serie rapide et peut etre placee dans une session ulterieure. Une finale n'est jamais ouverte a l'engagement ; les series lentes et la serie rapide partagent le meme engagement et correspondent uniquement a une repartition ulterieure des nageurs. Les anciens programmes sans deroulement explicite sont interpretes comme des courses directes.

Pour chaque course, il faut pouvoir definir :

- si la course est ouverte ;
- les categories autorisees ;
- les regles de temps d'engagement ;
- le comportement si aucun temps connu n'est trouve.

Il n'y a pas d'engagement hors categorie.

### Frais d'engagement

Les frais sont informatifs. LivePalmes ne gere pas la facturation.

Parametres :

- forfait par nageur ;
- frais par course individuelle ;
- frais par relais.

Le recapitulatif indique :

- le nombre de nageurs ;
- le nombre de courses individuelles ;
- le nombre de relais ;
- le total estimatif ;
- le lien HelloAsso ou l'attente de publication du lien ;
- le rappel du paiement avant la fin de la premiere journee de competition ;
- le surplus forfaitaire de 50 euros si paiement tardif.

La facture est recue directement via HelloAsso.

### Modification apres ouverture

Une competition peut etre modifiee apres ouverture des engagements.

Si une modification impacte des engagements existants, l'administrateur doit recevoir une alerte avant confirmation.

Exemples :

- suppression d'une course avec des engages ;
- suppression d'une categorie deja utilisee ;
- modification du nombre maximum d'epreuves ;
- modification des regles de temps ;
- modification des frais ;
- modification de la date limite.

La modification est possible apres confirmation et doit etre tracee.

## Calendrier club

Un club voit le calendrier de toutes les competitions.

Filtres prevus :

- region ;
- competitions nationales ;
- competitions regionales ;
- competitions departementales ;
- engagements ouverts ;
- engagements fermes ;
- engagements a venir.

Pour chaque competition, le club voit notamment :

- nom ;
- date ;
- lieu ;
- region ;
- niveau ;
- statut des engagements ;
- date et heure limite ;
- action pour faire les engagements si les engagements sont ouverts.

Les engagements des autres clubs ne sont jamais visibles par un club.

## Calendrier public

Le calendrier public est distinct du calendrier d'engagement d'un club et reste accessible sans compte. Il réunit les compétitions piscine et eau libre ainsi que les formations, stages, réunions et autres événements. Les niveaux proposés sont départemental, régional, national et international. Le niveau international suit les mêmes droits et le même périmètre qu'un niveau national.

Une compétition ou un événement n'apparaît publiquement qu'après une action explicite d'un administrateur régional ou national. La publication ne modifie pas le statut des engagements. L'affichage calcule, sur des journées complètes, les états `En cours`, `À venir`, `Annulée`, `Terminée — résultats en attente` et `Résultats publiés`, avec priorité aux événements en cours puis à venir. Un événement annulé reste consultable.

La vue initiale présente la saison courante et les événements en cours ou futurs. Les filtres saison, région, niveau et type sont locaux. La fiche publique contient les informations pratiques sans coordonnées personnelles, le programme synthétique par réunion, le lien vers les engagements du portail et les documents officiels. Elle rappelle que les engagements sont effectués par un responsable de club.

Les formations, stages, réunions et autres événements sont créés dans le calendrier par les administrateurs, jamais par les clubs. Les résultats restent réservés à une évolution ultérieure ; les champs de liaison sont néanmoins prévus.

## Parcours d'engagement club

La page d'engagement d'une competition est organisee en etapes ou onglets.

Ordre conseille :

1. chef d'equipe ;
2. officiels si requis ;
3. nageurs ;
4. courses individuelles ;
5. relais ;
6. recapitulatif.

Le choix du chef d'equipe est obligatoire avant de commencer les engagements.

Tant que le club n'a pas declare un chef d'equipe ou coche la renonciation, les autres etapes d'engagement restent bloquees.

Les actions d'engagement sont prises en compte immediatement. Il n'y a pas d'etat brouillon puis valide.

Les modifications restent possibles jusqu'a la fermeture des engagements.

## Chef d'equipe

Le club doit choisir une des options suivantes :

- declarer un chef d'equipe de son club ;
- declarer un chef d'equipe exterieur ;
- declarer qu'il n'y a pas de chef d'equipe.

Pour un chef d'equipe, le numero de licence est obligatoire.

Si le chef d'equipe n'est pas du club, son club doit etre renseigne.

Si le club ne declare pas de chef d'equipe, il doit cocher explicitement une case indiquant qu'il renonce au droit de reclamation.

Cette information apparait dans le recapitulatif.

## Officiels

Le parametrage de la competition indique si les officiels doivent etre declares.

Valeurs par defaut souhaitees :

- competition departementale : officiels requis ;
- competition regionale : officiels requis ;
- competition nationale : officiels non requis.

Ces valeurs doivent rester modifiables dans le parametrage de la competition.

Pour la V1, aucun nombre minimum d'officiels n'est impose.

Les officiels doivent avoir un numero de licence.

Il faut prevoir une base reutilisable d'officiels par club.

## Nageurs

Le module s'appuie sur la base LivePalmes.

Un nageur existant est rattache au club de sa derniere competition connue, sauf changement de club en debut ou cours de saison avant toute competition.

La saison sportive va du 1er septembre au 31 aout.

Regles :

- un nageur ne peut nager que pour un club pendant une saison ;
- si le nageur a deja nage pour un club pendant la saison, il reste rattache a ce club ;
- un autre club ne peut pas l'engager sauf derogation niveau 3 ;
- si le nageur n'a pas encore nage pendant la saison, un changement de club peut etre confirme par le club ;
- cette confirmation doit etre tracee.

Le numero de licence est obligatoire pour engager un nageur.

Si un nageur existant n'a pas de numero de licence, le club doit le renseigner avant de l'engager.

Un nouveau nageur cree par un club est automatiquement utilisable.

## Detection des doublons nageurs

Le module doit eviter les doublons sans bloquer a tort.

La detection doit comparer notamment :

- numero de licence ;
- nom ;
- prenom ;
- date de naissance ;
- variantes proches du nom ou prenom ;
- erreurs possibles sur le mois ou l'annee de naissance.

Si un nageur ressemble fortement a un nageur existant, le club voit une alerte.

Le club peut :

- selectionner le nageur existant ;
- confirmer qu'il s'agit bien d'un nouveau nageur.

Une confirmation malgre alerte doit etre tracee.

Les alertes de doublons validees sont visibles par le niveau 3.

## Engagements individuels

Le nombre maximum d'epreuves est defini par nageur sur la competition.

Les courses disponibles dependent :

- des courses ouvertes ;
- des categories autorisees par course ;
- du nombre maximum d'epreuves ;
- des regles de temps d'engagement.

Si un club retire un nageur de la competition, les courses individuelles et participations relais liees a ce nageur sont supprimees automatiquement.

## Temps d'engagement individuels

Cette section concerne uniquement les competitions piscine. Une competition eau libre enregistre les nageurs et leurs courses sans temps d'engagement, sans recherche dans les performances et sans controle Records/MPF.

Les temps d'engagement viennent d'abord de la base LivePalmes.

Pour chaque nageur et chaque course, le module recherche les temps compatibles avec :

- la course ;
- la periode des temps de qualification ;
- la categorie ;
- les parametres de la competition.

Si aucun temps connu n'est trouve, le comportement depend du parametrage de la course :

- engagement interdit ;
- saisie manuelle autorisee ;
- engagement autorise avec le temps par defaut 59:59.99.

Le temps par defaut est stocke sous la forme `595999`.

### Saisie manuelle

La saisie manuelle est autorisee uniquement si la course le permet.

Formats compacts acceptes :

- `5912` devient `00:59.12` ;
- `12345` devient `01:23.45` ;
- `012345` devient `01:23.45` ;
- `595999` devient `59:59.99`.

Regle d'interpretation :

- 1 a 4 chiffres : format SSCC ;
- 5 a 6 chiffres : format MMSSCC.

L'affichage final est toujours normalise en `MM:SS.CC`.

Dans le portail, cette normalisation est appliquée dès la sortie du champ et avant toute validation : les séparateurs peuvent être omis pendant la saisie, aussi bien pour une course individuelle que pour un relais.

### Controle des temps

Un temps sous le record ou la MPF applicable est bloquant.

Un temps anormalement lent declenche une alerte non bloquante.

Referentiels :

- records de France : uniquement bassin 50 m avec chronometrage electronique ;
- MPF : tous les bassins en chronometrage manuel, et bassins 25 m et 33 m en chronometrage electronique.

Les temps et records doivent venir des donnees connues dans LivePalmes. Aucune regle sportive ne doit etre inventee.

## Relais

Les relais sont prevus dans la V1.

Regles :

- le club choisit la categorie du relais parmi les categories autorisees par la competition ;
- les relayeurs peuvent etre renseignes, mais ce n'est pas obligatoire avant fermeture ;
- si les relayeurs sont renseignes, la composition doit correspondre a la categorie declaree ;
- si la composition ne correspond pas, l'engagement relais est bloque ;
- apres fermeture des engagements, la categorie du relais ne peut plus etre changee ;
- plusieurs relais de meme categorie sont possibles uniquement si l'admin l'a autorise ;
- un nageur ne peut pas etre dans plusieurs relais de meme distance et meme nature ;
- un nageur peut participer a des relais differents, par exemple 4x100 SF et 4x100 SB.

Les relayeurs doivent :

- etre licencies du club ;
- etre ajoutes a la competition par le club ;
- ne pas obligatoirement avoir une course individuelle.

Le temps d'engagement relais est saisi manuellement.

Il est impossible de saisir un temps inferieur au record de France club applicable :

- junior pour les relais juniors ;
- toutes categories pour les relais seniors.

## Gestion des competitions

Pour une competition, un niveau 2 ou 3 peut consulter :

- les parametres ;
- les engagements par club ;
- les engagements par course ;
- les relais ;
- les officiels ;
- les statistiques ;
- les alertes ;
- les documents.

Statistiques utiles :

- nombre de clubs engages ;
- nombre de nageurs ;
- nombre de courses individuelles ;
- nombre de relais ;
- repartition par course ;
- repartition par categorie ;
- temps manuels ;
- temps anormalement lents ;
- licences completees ;
- changements de club confirmes.

Les alertes nationales de doublons valides sont visibles uniquement par le niveau 3.

## GED de competition

Chaque competition dispose d'une GED simple.

Documents prevus :

- export TXT global ;
- PDF recapitulatif de chaque club ;
- documents d'information mis en ligne par l'organisation : affiche, circulaire, reglement, note d'information, plan ou autre document utile.

Les niveaux 2 et 3 peuvent telecharger :

- le TXT global ;
- les PDF clubs.

Chaque club peut telecharger uniquement son propre PDF.

Tous les documents d'information d'une compétition publiée sont publics et accessibles sans connexion, quelle que soit la région du visiteur. Un administrateur régional peut mettre en ligne ces documents pour une compétition de sa région ; un administrateur national peut le faire pour toutes les compétitions. Les exports TXT et les PDF récapitulatifs des clubs restent privés.

Un depot peut contenir plusieurs fichiers. Les formats PDF, bureautiques, images et ZIP sont acceptes dans la limite de 10 Mo par fichier et de 20 documents actifs par competition. Le titre est obligatoire ; la categorie et une description facultative facilitent la consultation. L'identite de l'auteur est visible uniquement par les administrateurs regionaux et nationaux.

Le remplacement du fichier d'un document conserve son chemin et son jeton de téléchargement : son URL publique reste donc stable.

La GED conserve seulement la derniere version des documents. Un remplacement supprime l'ancien fichier et une suppression ne produit pas de notification.

## Exports et PDF

### Export TXT

L'export TXT global contient les engagements de la competition.

Le format exact sera fourni plus tard.

L'export piscine conserve le format WinPalme existant. L'export eau libre reste indisponible tant que son exemple TXT n'a pas ete valide ; sa fermeture automatique ne doit donc ni generer ni envoyer de TXT.

Il doit etre :

- genere automatiquement a la fermeture des engagements ;
- envoye par mail au responsable informatique ;
- telechargeable dans la GED par les niveaux 2 et 3.

### PDF club

Le PDF club est genere :

- a la demande ;
- a la fermeture des engagements.

Il contient :

- chef d'equipe ou renonciation ;
- officiels si requis ;
- nageurs ajoutes a la competition ;
- courses individuelles ;
- relais ;
- frais indicatifs ;
- lien HelloAsso ou attente de publication du lien ;
- rappel du paiement avant la fin de la premiere journee ;
- rappel du surplus forfaitaire de 50 euros si paiement tardif ;
- mention que le recapitulatif est sous reserve de modifications ulterieures.

A la fermeture des engagements, le PDF est envoye a toutes les adresses mail admin du club.

Apres reouverture puis nouvelle fermeture, les documents sont regeneres et les mails sont renvoyes.

## Notifications mail

### Ouverture des engagements

Lors de l'ouverture des engagements :

- competition nationale : notification a tous les clubs ;
- competition regionale ou departementale : notification aux clubs de la region concernee.

### Fermeture des engagements

A la fermeture :

- le responsable informatique recoit l'export TXT ;
- lorsque la declaration des officiels est requise, le responsable juge recoit un PDF unique regroupant tous les officiels, classe par club puis par nom et prenom, avec leur date de naissance et leur numero de licence ; aucun PDF ni courriel n'est prepare lorsque les officiels ne sont pas requis ;
- chaque club engage recoit son PDF recapitulatif ;
- le PDF est envoye a toutes les adresses mail admin du club.

### Mise en ligne de documents

Lors d'un ajout ou d'un remplacement, l'administrateur peut choisir d'informer les clubs. Un depot groupe produit un seul courriel recapitulatif par destinataire, sans piece jointe, avec la liste des documents et un lien vers la competition.

- competition nationale : notification a tous les administrateurs actifs des clubs ;
- competition regionale ou departementale : notification aux administrateurs actifs des clubs de la region organisatrice et des regions invitees.

Les fichiers possedent une URL techniquement publique afin de preparer leur future diffusion dans le calendrier public. Tant que ce calendrier n'existe pas, leur liste est affichee uniquement dans le portail connecte.

L'adresse d'expedition souhaitee est :

```text
livepalmes@nap-ffessm.fr
```

La configuration technique d'envoi mail sera definie plus tard.

## Reouverture des engagements

Un niveau 2 ou 3 peut rouvrir les engagements selon son perimetre.

Regles :

- niveau 2 : competitions departementales ou regionales de sa region ;
- niveau 3 : toutes les competitions.

La reouverture doit etre tracee.

Apres nouvelle fermeture :

- l'export TXT est regenere ;
- les PDF clubs sont regeneres ;
- le PDF consolide des officiels est regenere et renvoye au responsable juge ;
- les mails sont renvoyes ;
- la GED conserve seulement la derniere version.

## Tracabilite

Les actions sensibles doivent etre tracees :

- validation d'une demande d'acces ;
- creation directe d'un acces ;
- desactivation d'un acces ;
- creation ou modification d'une competition ;
- modification impactant des engagements existants ;
- ouverture et fermeture des engagements ;
- reouverture des engagements ;
- action niveau 3 effectuee comme un club ;
- creation d'un nageur ;
- confirmation de changement de club ;
- confirmation de creation malgre alerte doublon ;
- saisie d'un temps manuel ;
- generation des PDF ;
- generation de l'export TXT ;
- envoi ou tentative d'envoi mail.

## Confidentialite

Un club ne voit que ses propres engagements.

Il ne peut pas consulter :

- les nageurs engages par les autres clubs ;
- les relais des autres clubs ;
- les officiels des autres clubs ;
- les statistiques detaillees des autres clubs.

Les niveaux 2 et 3 peuvent consulter les engagements selon leur perimetre.

## Points techniques sensibles

Les sujets suivants devront etre valides avant implementation :

- modele Firestore final ;
- regles de securite Firestore ;
- integration avec les droits existants ;
- generation PDF ;
- generation TXT ;
- stockage des documents de GED ;
- envoi mail depuis `livepalmes@nap-ffessm.fr` ;
- declenchement automatique a la fermeture des engagements ;
- controle fiable des records et MPF ;
- detection de doublons nageurs ;
- performance des recherches dans la base de performances.

## Points reportes apres V1

Sont volontairement reportes :

- quotas automatiques d'officiels selon le nombre de nageurs ;
- paiement integre dans LivePalmes ;
- facturation LivePalmes ;
- versioning complet des documents de GED ;
- format definitif de l'export TXT ;
- regles avancees de derogation sportive ;
- statistiques avancees multi-saisons.

## Etat actuel et prochaines etapes

Le socle decrit dans ce document est maintenant integre au Portail LivePalmes. La phase actuelle consiste a :

- finaliser les parcours existants ;
- les tester avec les differents profils et perimetres ;
- corriger les ecarts constates ;
- ameliorer progressivement l'ergonomie et la fiabilite ;
- ajouter seulement les petits modules complementaires confirmes par l'usage.

Les fonctions presentes dans le code et les tests constituent la reference technique de l'etat reel. Les elements explicitement reportes restent hors du perimetre operationnel tant qu'ils n'ont pas ete developpes et valides.
