# Évolutions LivePalmes

<!-- description: Registre commun des évolutions, déploiements TEST et validations utilisateur. -->

### TOP directement lus dans NAP — 6 octobre 2026

- Besoin autorise : conserver la page TOP et ses filtres, lire NAP directement ; abandon des exports et conservation des temps bruts a la demande d'Antoine (`14200` = 1:42.00). Aucune correction de performance executee.
- Fiches/recherche : publication commune d7eb84c8 reussie, run 37436954305. Index NAP search 37435791498 et top 37435794805 verifies. Recette technique nom/prenom, cinq nageurs, filtres et mobile effectuee ; aucune nouvelle validation utilisateur deduite.
- TOP #116 : CI 37439892004 et backend 37440187733 reussis, plans 37440553058 controles (index course, jointures primaires, tri numerique dans la plage). Lectures reelles 0,6–1,2 seconde ; performance 973 toujours 1:42.00. Recette revele une saison historique 207 deja presente dans NAP : le filtre doit accepter la valeur existante sans correction de base. Ajustements de filtres et mutualisation du controle de volume en cours.
- Preparation TOP : requetes par course indexees et plafonnees, tri numerique, categories du helper existant, meilleure performance par identite, filtres saison/region/bassin/naissance, chargement de la suite. Budget detaille dans NAP_PUBLIC_MIGRATION.md. Tests cibles ; plans reels et recette navigateur encore a effectuer. TEST seulement ; autres consommateurs et Records/MPF restent a brancher.

### Pages publiques alimentees par NAP — preparation du 6 octobre 2026

- Besoin autorise : conserver les pages, liens, presentation et fonctionnalites ; changer uniquement la source de donnees, progressivement sur TEST.
- Preparation : export interne des champs publics de quatre tables NAP, pagination par index primaire, double lecture identique, construction via les generateurs existants. Aucun mot de passe transmis au compte de publication, aucune ecriture SQL, aucune publication de fichiers dans cette premiere phase.
- Budget et circuit : `docs/NAP_PUBLIC_MIGRATION.md`. Export et generation reelle, comparaison de contenu et de liens, puis bascule des pages encore a realiser. Ne pas annoncer les pages connectees avant ces controles.

### Consultation NAP dans TEST — preparation du 5 octobre 2026

- Besoin : MySQL NAP comme base unique a terme ; coexistence avec l'ancien site pendant les essais, Firebase conserve pour l'hebergement. Antoine autorise les essais d'ecriture dans NAP ; cette premiere livraison reste en lecture.
- Perimetre : connexion MySQL TLS obligatoire sans verification du certificat (choix explicite d'Antoine le 5 octobre), consultation administrateur TEST paginee de `perfs`, ecran `/nap-test.html`, lot specialise `nap` hors `all-safe`, tests hors reseau. Voir `docs/NAP_TEST.md`.
- Activation : PR #102 et #103 integrees ; backend TEST 37367287408 reussi, fonction NAP creee. Droits Lecteur pour le compte GitHub et Accesseur pour le compte d'execution limites au secret NAP, confirmes par Antoine. Lecture reelle depuis Firebase verifiee dans le navigateur avec la session administrateur TEST d'Antoine : nageur 7322, 50 lignes (87799 a 128079), puis 50 lignes (128080 a 146247), aucune ecriture NAP.
- Publication commune : Antoine autorise le 5 octobre l'inclusion sur TEST des deux fichiers TOP 200BI M-S deja modifies dans main. Exception explicite limitee a leurs empreintes Git exactes ; aucune exception PROD, regles, index ou autre fichier genere. PR #104 integree ; publication TEST commune reussie au commit 78a16278e894b6c142ea94444845302c7feb27a0, run 37376750137, Hosting f396f85fa6b769fd. Les 138 fonctions ordinaires ont ete republiees apres divergence de l'inventaire precedent ; NAP conserve.
- Validation : activation TEST explicitement autorisee le 5 octobre ; EXPLAIN du nageur 7322 confirme l'index nageur (1269 lignes estimees pour 1509 performances). Recette technique de lecture et pagination reussie ; validation utilisateur recue le 6 octobre : Antoine confirme le fonctionnement avec d'autres nageurs. Les autres modules restent sur Firestore. Hors bilan PROD.

La version applicative `4b1c6937c01dd71822d46d9a8ff23508d43d2309` est publiée en PROD depuis le 25 septembre 2026, run [36108577649](https://github.com/ffessmnap/LivePalmes/actions/runs/36108577649), Hosting `e3186cfe0bdb29e8`. Les commits d’infrastructure ultérieurs ne sont pas des évolutions applicatives déjà publiées.

| Besoin | PR / commit | État | Preuve TEST | Validation utilisateur | Publication PROD |
| --- | --- | --- | --- | --- | --- |
| Circuit réutilisable TEST → PROD | [PR #50](https://github.com/ffessmnap/LivePalmes/pull/50) | Circuit corrigé ; essai Hosting TEST réussi | [TEST 35525725737](https://github.com/ffessmnap/LivePalmes/actions/runs/35525725737), commit `0e936f6c5851dc70213e3b9783a0cfc2a3af0dd1`, preuve `test-proof` ; fonctions inchangées | Demande d’Antoine dans Infra ; ne vaut pas recette d’une future évolution applicative | Aucune demandée |

États : en cours → intégré → déployé sur TEST → validé par Antoine → publié en PROD. Une ligne n’est validée que sur la base d’un retour réel. Conserver l’historique, ne pas effacer les travaux inachevés pour faire passer une publication.

### Reprise de publication — 25 septembre 2026

- Publication PROD terminee le 25 septembre a 10:05 (Paris), run [36108577649](https://github.com/ffessmnap/LivePalmes/actions/runs/36108577649), candidat exact `4b1c6937c01dd71822d46d9a8ff23508d43d2309`, Hosting `sites/livepalmes/versions/e3186cfe0bdb29e8`. Bilan prealable 36107672710 reussi ; preuve TEST 36105695980, Hosting TEST `916bd0b447bf95f1`. Les 136 fonctions selectionnees ont ete publiees ; inventaire final de 146 fonctions actives, aucun ecart et exclusions preservees. Deux traitements PDF actualises uniquement en source, configurations controlees identiques.
- Sauvegarde chiffrée creee et rouverte avec comparaison reussie avant publication : artefact `production-code-backup` 10851868193 du run PROD, disponible jusqu’au 9 octobre 2026. Retour arriere par le workflow dedie avec ce run ; ancienne version Hosting `61bbdb3230029827`. Ne pas changer la cle backend necessaire au dechiffrement pendant cette retention. Aucune copie TEST/PROD, migration, regle/index ou invocation metier manuelle.
- Controle apres publication : cinq fichiers conformes au candidat, CSP/cache presents, ancien analytics et fichier interne en 404 ; accueil, connexion portail, calendrier, records, MPF, TOP et recherche nageur ouverts dans le navigateur. Consultation des records controlee. Limite : session portail non authentifiee, pas de generation PDF ni envoi/cloture en PROD pour la recette ; tests PDF hors ligne reussis. Suivi documentaire a regrouper avec la prochaine mise a jour, sans nouvelle PR pour ce seul controle.

- Antoine autorise dans Infra la publication de toutes les évolutions présentes sur TEST, puis la correction ciblée du blocage TEST et la reprise PROD si les contrôles réussissent. Aucune copie ni modification des données n'est autorisée. Cet accord ne constitue pas une déclaration de recette manuelle exhaustive.
- Le run TEST 35995042484 a publié et contrôlé les 134 Functions ordinaires du commit `1554db370fd303a9973bd422e8305355d1987027`, puis bloqué Hosting avant publication. La préparation backend créait des fichiers non suivis sous `.firebase-test-functions` dans le dossier du site ; le contrôle de sécurité les a refusés. La dernière publication complète précédente est le run 35580349213, commit `5edd066bff228df734a1bfc0db28537210c82422`.
- Correction limitée à la préparation : dossier Functions temporaire placé hors du checkout publié, sous RUNNER_TEMP ; contrôle Hosting conservé. Reproduction locale du défaut (33 fichiers non suivis), puis contrôle Hosting réussi avec staging externe et test de non-régression ajouté. Aucun changement applicatif, règle, index ou configuration Firebase.
- État : correction en préparation ; nouvelle preuve TEST et bilan PROD à obtenir avant toute publication. La PR #37 de synchronisation des données reste exclue.
- Suite du 25 septembre : correction intégrée par PR #75, commit `4b1c6937c01dd71822d46d9a8ff23508d43d2309`. Audit 36103299598 réussi après approbation d'Antoine : Hosting PROD toujours `sites/livepalmes/versions/61bbdb3230029827`, 146 Functions ; TEST 134 Functions et Hosting du 21 septembre. Reprise TEST 36105695980 lancée, résultat à confirmer.
- Blocage découvert pendant la revue backend : `prepareEngagementClubRecapEmails` et `closeDueEngagementCompetitions`, exclus des lots ordinaires, utilisent aussi `getOrCreateEngagementClubRecapPdf` via `prepareEngagementClubRecapEmailJobs`. Leur ancien code peut régénérer l'ancien modèle et écraser le PDF stocké. La correction complète du PDF exige donc une publication spécifique de ces deux traitements, avec conservation de leurs paramètres/secrets et du calendrier existants, sauvegarde et contrôle, sans appel métier ni envoi manuel. Ne pas déclarer la revue des exclusions sans impact et ne pas publier le lot PROD incomplet.
- Accord spécifique reçu d'Antoine le 25 septembre à 09:05 (Paris) pour ces deux traitements, paramètres conservés, sans déclencher d'envoi ou de clôture ni copier les données. Exception bornée dans le bilan : sauvegarde des deux sources/configurations, mise à jour de la source seule par API Functions (aucune API Scheduler), contrôle des configurations après publication. Les lots ordinaires et leurs exclusions restent inchangés. Le générateur commun est testé sur TEST et hors ligne ; les deux automatisations PROD ne seront pas invoquées pour la recette.

### PDF club : tous les nageurs inscrits — 24 septembre 2026

- Besoin : afficher les inscrits sans course individuelle ni relais, avec « Aucune course engagée », sans statut de remplaçant automatique.
- Branche `fix/club-recap-all-swimmers`. État : en cours ; intégration et déploiement TEST à confirmer. Aucune publication PROD demandée ; recette utilisateur attendue.
- Correction dans `functions/index.js` : tableau complémentaire des nageurs sans course individuelle, distinction « Relais uniquement », invalidation du cache des anciens PDF. Les effectifs et frais existants comptent déjà tous les inscrits : leurs calculs sont conservés.
- Budget : aucune lecture Firestore supplémentaire, à l'ouverture, au téléchargement ou au rafraîchissement. Les données du document club déjà chargé suffisent ; aucune requête par nageur. Un ancien PDF est régénéré à la demande, sans migration ni reconstruction massive.
- Vérification : `tests/engagement-club-recap-pdf-tests.js` couvre les effectifs, frais, relais, absence de courses, pagination et cache. Exemple fictif reproductible : `node tests/engagement-club-recap-pdf-tests.js /tmp/Exemple_recap_engagements_TEST.pdf` (6 nageurs, 3 courses, 1 relais, 77 EUR avec les tarifs d'exemple).

Le premier essai du circuit TEST a inclus des fichiers temporaires de credentials. Publication retirée puis isolation corrigée par la PR #51. Antoine a confirmé la suppression des deux anciennes clés et l’enregistrement des deux remplaçantes dans les secrets GitHub le 20 septembre 2026. Le nouvel essai 35525725737 authentifie les deux comptes avec succès, contrôle les fichiers publiés, publie Hosting et conserve la preuve de version. Les étapes de déploiement Functions sont ignorées car aucun code backend n’a changé ; cet essai ne valide donc pas un déploiement Functions réel. La preuve de l’ancien essai 35523482002 ne doit pas être réutilisée. La suppression des anciennes clés est confirmée par Antoine, sans contrôle IAM indépendant. Aucun audit d’utilisation des anciennes clés n’a été réalisé dans cet essai. Aucun workflow PROD déclenché dans cette évolution.

### Colonne continue du portail — 20 septembre 2026

- Besoin : réunir le bandeau et la navigation sur ordinateur, conserver le bandeau compact sur mobile.
- [PR #53](https://github.com/ffessmnap/LivePalmes/pull/53), commit intégré `bbd2383aca7c84176e293a790ad68cdae40b2bdd`. État : déployé sur TEST, recette utilisateur attendue.
- Périmètre : présentation du portail uniquement ; aucune lecture/écriture Firebase ajoutée, aucun changement de droits.
- Validation utilisateur : essai TEST demandé ; rendu final non encore validé.
- Preuve TEST : [run 35526684868](https://github.com/ffessmnap/LivePalmes/actions/runs/35526684868), réussi ; artefact `test-proof`. Aucun changement backend. Aucune publication PROD demandée.
- Vérifications : vérification globale locale et GitHub réussies ; chargement du portail hors connexion contrôlé. Rendu connecté ordinateur/mobile non contrôlé faute de session authentifiée dans le navigateur de vérification.

### Correction du pied de navigation — 20 septembre 2026

Retour utilisateur : liens Mon compte et Aide comprimés verticalement. Cause confirmée dans la session TEST connectée : une ancienne grille répartissait les trois éléments sur trois colonnes (35 px pour chaque lien). Correction : pile verticale explicite, chaque accès sur toute la largeur. [PR #55](https://github.com/ffessmnap/LivePalmes/pull/55), déployée sur TEST au commit `f6872a01826740fe4af8f6bd91852132dbd9c03c`, [run réussi 35527165965](https://github.com/ffessmnap/LivePalmes/actions/runs/35527165965). Contrôle dans la session connectée à 1363 px : chaque lien mesure 231 px, tient sur une ligne et reste visible ; menu du profil ouvert entièrement visible, Déconnexion présente (sans la déclencher). Vérification globale locale et GitHub réussie. Validation utilisateur encore attendue.

### Harmonisation du thème sombre du portail — 20 septembre 2026

- Besoin : supprimer les surfaces blanches résiduelles du compte, du contexte club, des filtres et des tableaux ; préserver les couleurs utiles et le mode clair.
- État : déployé sur TEST, essai demandé par Antoine ; validation utilisateur attendue.
- Périmètre : CSS du portail et version de chargement uniquement, aucune lecture/écriture Firebase ajoutée. Aucun déploiement PROD demandé.
- Première version : [PR #57](https://github.com/ffessmnap/LivePalmes/pull/57), TEST au commit `a72ca5f1682fa5ef381e8223b90b8ce38afdb7a9`, [run 35528729097](https://github.com/ffessmnap/LivePalmes/actions/runs/35528729097) réussi. Compte contrôlé dans les deux modes ; accueil, calendrier, formulaire et annuaire contrôlés en mode sombre. Ces contrôles ont identifié des détails à compléter : badge de niveau, dates, licences et séparateurs. Correction complémentaire en cours.
- Version finale : [PR #58](https://github.com/ffessmnap/LivePalmes/pull/58), commit applicatif `61c12aeddac1b789ad4636fb3208e5dc72b33b85`, [run TEST 35529133654](https://github.com/ffessmnap/LivePalmes/actions/runs/35529133654) réussi avec preuve conservée ; étapes backend ignorées.
- Vérifications finales : version CSS `appearance-3` chargée ; compte dans les deux modes, accueil sombre, calendrier et formulaire ouvert puis annulé, annuaire et habilitations dans la session connectée sur ordinateur. Plus de surface blanche visible dans ces vues sombres, hors logo fédéral volontairement conservé sur blanc. Dates, licences et avertissements lisibles ; séparateurs du formulaire atténués. Contrastes de la palette de texte principale/secondaire et des statuts mesurés entre 6,67:1 et 12,73:1. Vérification globale locale et GitHub réussie ; tests de préférence et isolation publique réussis.
- Limites : contrôle visuel réalisé sur ordinateur ; pas de recette mobile ni de contrôle exhaustif de chaque sous-écran métier. Aucune donnée enregistrée pendant la recette. Aucune validation utilisateur du rendu final encore reçue.

### Bandeaux des espaces en thème sombre — 20 septembre 2026

- Retour Antoine : bandeaux illisibles sur les pages d’accueil des espaces, notamment Administration nationale et la carte Demandes à traiter. La recette précédente ne couvrait pas ces dégradés ; la couleur de fond sombre était masquée par une image de fond claire.
- Correction : remplacer le fond complet des bandeaux et de la carte prioritaire, adapter les surtitres et libellés, conserver la variante mobile transparente. Périmètre CSS portail, aucun accès Firebase ajouté.
- État : déployé sur TEST ; validation utilisateur attendue. Aucun déploiement PROD.
- [PR #60](https://github.com/ffessmnap/LivePalmes/pull/60), commit applicatif `3afe370948ddaf08230fa23883e5e1accc99684c`, [run TEST 35530032111](https://github.com/ffessmnap/LivePalmes/actions/runs/35530032111) réussi.
- Recette connectée ordinateur : espaces Club, Compétitions (calendrier), Données sportives, DTN, Administration nationale et Gestion des accès parcourus après publication. Bandeaux affichés : fond sombre `rgb(25,38,48)`, image de fond `none`, titres clairs. Aucun dégradé résiduel sur les éléments rendus de ces six vues. Captures vérifiées pour Club, Données sportives, DTN et Administration nationale ; carte Demandes à traiter lisible sur surface sombre secondaire.
- Tests de préférence et vérification globale locale/GitHub réussis. Le contrôle mobile reste à réaliser dans un navigateur de cette taille ; les règles compactes sont préservées dans le CSS. Pas de validation utilisateur du nouveau rendu à ce stade.
- Comparaison finale Administration nationale : le mode clair conserve ses deux dégradés et ses textes foncés ; retour au mode sombre effectué après vérification.


### Harmonisation des écrans de travail — 20 septembre 2026

- Antoine approuve les cinq points : titres précis, filtres et actions, lisibilité des tableaux, couleurs sémantiques, détails du thème sombre.
- Correction des titres Clubs/DTN, des barres de filtres des annuaires, des boutons de temps DTN, du compteur de clubs et des contrastes clubs/DTN. Aucune lecture/écriture Firebase ajoutée, aucune règle métier modifiée.
- État : déployé sur TEST ; validation du rendu final attendue.
- [PR #63](https://github.com/ffessmnap/LivePalmes/pull/63), commit applicatif `696709c20789205b6665a324b6893eff698a011a`, [run TEST 35531191790](https://github.com/ffessmnap/LivePalmes/actions/runs/35531191790) réussi.
- Recette connectée ordinateur : captures Clubs et Championnats de France dans les deux thèmes ; titres des trois rubriques DTN vérifiés ; temps activé par Entrée avec sélection et résultats visibles ; filtre CNHC puis réinitialisation (48 lignes et recherche vide) ; filtres d’habilitation inspectés. Aucun enregistrement métier.
- Tests : préférence/isolation publique et vérification globale locale/GitHub réussis. Contrôle mobile à réaliser ; dispositions flexibles et règles sous 760 px prévues. L’annuaire des administrateurs de clubs affiche « temporairement indisponible » dans TEST, hors correction de présentation. Aucune publication PROD.

### Navigation Compétitions — 20 septembre 2026

- Accord Antoine : supprimer le niveau artificiel Calendrier et afficher la compétition ouverte dans le fil d’Ariane. Accès direct dans le menu, lien de retour utilisant la fermeture existante de fiche. Aucun droit ni accès aux données modifié.
- État : déployé sur TEST ; validation utilisateur du rendu final attendue.
- [PR #65](https://github.com/ffessmnap/LivePalmes/pull/65), commit applicatif `04e33bfb3d97563c9a9d2443dbf00802563e6aeb`, [run TEST 35532089990](https://github.com/ffessmnap/LivePalmes/actions/runs/35532089990) réussi, preuve de version conservée ; étapes backend ignorées. Aucune publication PROD.
- Recette connectée ordinateur : accès direct depuis Espace club ; liste avec deux niveaux ; ouverture de Championnat de France Elite (TEST) avec son nom dans le fil ; retour à la liste par le fil et par le menu latéral. Capture sombre contrôlée, sans sous-menu Calendrier ; fil de l’espace club conservé. Aucun enregistrement métier.
- Vérification globale locale et GitHub réussie. Le retour réutilise la fermeture de fiche existante avec contrôle des modifications non enregistrées ; ce scénario de saisie n’a pas été déclenché en ligne. Contrôle mobile non réalisé.

### Cohérence UX des espaces — 20 septembre 2026

- Accord Antoine : six améliorations de la revue UX et harmonisation du bandeau Compétitions avec les autres modules.
- Périmètre : statuts effectifs et date limite des engagements ; fil d’Ariane club et exclusion des badges ; filtre local et libellés des licences ; tableau neutre ; titre Gestion des accès ; date des calculs DTN existants ; bandeau Compétitions.
- Budget supplémentaire : zéro lecture et zéro écriture Firebase à l’ouverture, au filtrage ou à l’affichage des dates. Réutilisation des données déjà chargées et du champ cache.generatedAt, aucun recalcul automatique ajouté.
- État : déployé sur TEST ; validation utilisateur finale attendue. Aucune publication PROD.
- [PR #67](https://github.com/ffessmnap/LivePalmes/pull/67), commit applicatif `9160e7f8c0fe07cd6a81e585dac6b3efa2449dd1`, [run TEST 35533405303](https://github.com/ffessmnap/LivePalmes/actions/runs/35533405303) réussi ; preuve conservée et étapes backend ignorées.
- Recette connectée ordinateur : bandeau Compétitions et tableau Mes nageurs capturés dans les deux thèmes ; fiche club affichant Date limite dépassée et date ; retour par le fil d’Ariane vers la liste ; filtre Licences à contrôler combiné avec Femmes (175 actives), puis réinitialisé ; titres et fils nationaux/access sans compteur parasite ; dates DTN contrôlées pour Mise en liste et Équipe de France. Aucune donnée métier enregistrée, aucun recalcul déclenché.
- Vérification globale locale/GitHub réussie ; tests ciblés des statuts ouverts/fermés/expirés/annulés, licences à contrôler et dates de calcul présentes/absentes. Règle compacte sous 760 px ajoutée ; recette mobile non réalisée dans le navigateur disponible.

### Retour à la présentation des nageurs — 20 septembre 2026

- Antoine demande de revenir sur les points 3 et 4 : retrait du filtre Licences à contrôler, retour aux indicateurs compacts et aux lignes colorées selon le sexe. Les autres améliorations UX et le bandeau Compétitions sont conservés.
- Périmètre interface uniquement ; aucun accès aux données ajouté. Déployé sur TEST, validation finale attendue.
- [PR #70](https://github.com/ffessmnap/LivePalmes/pull/70), commit applicatif `6c704b83dffceca4081187bee17cef7af28efa20`, [run TEST 35534631647](https://github.com/ffessmnap/LivePalmes/actions/runs/35534631647) réussi avec preuve conservée ; backend ignoré. Aucun déploiement PROD.
- Vérification globale locale/GitHub réussie. Recette connectée ordinateur : capture de Mes nageurs en sombre, lignes colorées rétablies, indicateurs ! visibles et filtre de licences absent. Autres modifications UX conservées par retour ciblé. Pas de nouvelle recette mobile.
- Suivi documentaire après publication conservé pour regroupement avec la prochaine mise à jour, conformément à la consigne de ne pas ouvrir de PR documentaire à chaque contrôle.

### Cohérence visuelle et Mon compte — 20 septembre 2026

- Antoine approuve les cinq points de la revue design : contrastes sombres résiduels, cartes, boutons, densité et tableaux. Demande complémentaire : icône Apparence, préférences d’apparence et de notifications toujours déployées, réorganisation de Mon compte.
- Changements HTML/CSS limités au portail ; aucune logique métier ni lecture/écriture de données ajoutée. Lignes colorées et indicateurs de licence conservés ; pages publiques inchangées.
- Première publication : [PR #71](https://github.com/ffessmnap/LivePalmes/pull/71), commit `bbd21c6d17a36d3535b508f815e070f6d709fe09`, [run TEST 35535689635](https://github.com/ffessmnap/LivePalmes/actions/runs/35535689635) réussi, backend ignoré.
- Recette connectée : Mon compte dans les deux thèmes ; cartes Données sportives et Administration nationale, historique imports, Records, DTN Mise en liste et Mes officiels en sombre. Les surfaces principales sont corrigées, préférences déployées et icône Apparence visible.
- Finitions issues de cette recette : contraste du descriptif des notifications et des petites flèches/étiquettes, alignement des deux cartes de préférences, colonnes du tableau officiels et actions de l’historique imports. Nouvelle vérification avant publication de ces finitions ; pas de validation utilisateur finale ni de recette mobile.
- Finitions publiées le 21 septembre 2026 : [PR #72](https://github.com/ffessmnap/LivePalmes/pull/72), commit `a35be412f34b8e19ed643ee41e292b0178f0b8fd`, [run TEST 35575511239](https://github.com/ffessmnap/LivePalmes/actions/runs/35575511239) réussi ; backend ignoré, preuve de version conservée. Vérifications locales et GitHub réussies.
- Limite finale : la session authentifiée du navigateur a expiré entre la recette initiale et cette publication ; le rendu connecté de ces dernières finitions et le mobile restent à confirmer. Aucun changement de préférence de notifications ni de donnée métier effectué. Pas de validation utilisateur finale. Suivi regroupé avec la prochaine PR applicative selon la consigne commune.

### Graisse commune des boutons — 21 septembre 2026

- Antoine valide la proposition issue de l’inventaire : tous les textes de boutons du portail en graisse 500, en clair et sombre, y compris fenêtres de saisie et onglets.
- Règle CSS limitée au portail avec héritage des libellés imbriqués ; titres et libellés de formulaires conservés. Aucun changement métier, données ou pages publiques.
- État : vérification et publication TEST en préparation. Validation utilisateur du rendu final attendue.

### Simplification technique du circuit — 25 septembre 2026

- Antoine demande l’application de la procédure simplifiée : bilan sans première approbation, réutilisation TEST et réduction des Functions lorsque possible.
- Bilan sans secret ni accès Google, fondé sur les artefacts vérifiés de publication ; relecture TEST/PROD après l’unique approbation de publication. Empreintes syntaxiques des exports, repli conservateur pour dépendances partagées et code dynamique, contrôle des fonctions conservées.
- Tests hors ligne : correction isolée, changement partagé, identité ancienne mais équivalente, dérive TEST/PROD, tentative précédente échouée, artefact altéré, bilan de diagnostic interdit en publication. Contrôles GitHub et diagnostics en lecture seule à exécuter après intégration ; aucun déploiement PROD demandé pour tester le circuit.

### DTN : proximité des minima — 29 septembre 2026

- Besoin et approche approuvés par Antoine : option facultative TSP/TRP, seuil strict réglable, 2 % par défaut ; minima officiels inchangés. [PR #79](https://github.com/ffessmnap/LivePalmes/pull/79), branche `feat/dtn-near-minima`. État : proposition créée, contrôles GitHub en attente ; aucune validation utilisateur de la réalisation ni publication PROD.
- Calcul : meilleures performances admissibles avant exclusion des minima atteints, marge préchargée strictement inférieure à 5 %, réglage de 0,1 à 5 %. Cache versionné, message explicite si l'ancien cache ne contient pas cette analyse, recalcul volontaire existant.
- Budget avant/après : ouverture = 2 documents métier fixes par sexe sur cache chaud (contrôle d'accès existant conservé) ; réglage/pagination = 0 lecture/écriture ; retour = mémoire existante ; rafraîchissement volontaire = pipeline existant, mêmes fichiers TOP bornés, aucune lecture Firestore par performance. Pire cas borné par les limites de lignes existantes et le plafond de cache de 900 ko ; aucune reconstruction interactive automatique. La taille du cache augmente avec les seules meilleures performances dans la marge.
- Backend partagé : helpers DTN et version de cache seulement ; aucun appel de ces helpers depuis les fonctions email/schedulers exclues. Le circuit de publication peut sélectionner largement les fonctions ordinaires à cause de l'empreinte partagée ; droits, règles, index et données officielles inchangés.
- Vérifications : `node tools/verify-livepalmes.js` et tests ciblés réussis ; navigateur hors ligne à 390 et 1280 px avec données fictives : activation, filtre, absence d'appels supplémentaires, saisie invalide, désactivation et défilement horizontal contrôlés. Thème sombre contrôlé hors ligne aux mêmes largeurs ; contraste de la légende adapté aux couleurs du portail. Recette connectée et validation Antoine attendues.
- Preuve TEST : aucune à ce stade. Le connecteur GitHub disponible ne propose pas de déclenchement `workflow_dispatch` ; publication commune restant à lancer par une voie autorisée après intégration.

### Publication ciblée pour tous les modules — 29 septembre 2026

- Antoine autorise dans Infra l’optimisation générale TEST/PROD : sélectionner les traitements concernés, éviter les vérifications répétées du même commit et conserver la protection des données. Aucune publication applicative PROD demandée.
- L’analyse statique suit les dépendances auxiliaires directes/indirectes dans le fichier serveur commun, sans exécuter le métier ; effets globaux et cas incertains restent conservateurs. Les nouvelles preuves TEST permettent la réutilisation des tests applicatifs en PROD. Cache npm activé pour les deux circuits.
- Comparaison hors ligne sur les changements réels : DTN = 2 traitements au lieu de 134 ; PDF = 5 dont les deux automatismes indirectement concernés ; interface = aucun. Ces simulations ne constituent pas une mesure du temps de publication Firebase.
- État : vérification technique et intégration en préparation. Les résultats GitHub et le diagnostic en lecture seule seront consignés dans la PR, sans PR documentaire supplémentaire. Aucun changement métier, de droits, de données, de règles/index ou de configuration Firebase.

### Publication DTN demandée — 29 septembre 2026

- Antoine confirme dans Infra le 29 septembre à 18:30 (Paris) avoir validé l’évolution DTN sur TEST et demande sa publication PROD.
- TEST réussi : run [36593067041](https://github.com/ffessmnap/LivePalmes/actions/runs/36593067041), commit exact `84d36c31ffad84bbefc515aff08935062f9c52a1`, preuve `test-proof` 11046062119. Publication terminée en 22 min 22 avec l’ancien périmètre large.
- Optimisation du circuit intégrée par PR #80, commit `bf07a3bc59d151ddd91680509877c81a800947b3`. CI 36597052840 et diagnostic sans publication 36597395817 réussis ; la version applicative TEST est conservée.
- Bilan `.github/releases/20260929-dtn.json` : seulement `buildDtnQualificationView` et `getDtnQualificationOverview`, puis Hosting du candidat TEST. Ancienne base PROD : `4b1c6937c01dd71822d46d9a8ff23508d43d2309`, Hosting `e3186cfe0bdb29e8`. Relecture Firebase, sauvegarde et retour arrière par le circuit protégé ; aucune donnée TEST copiée, migration, règle/index ou invocation métier.
- État : préparation et publication PROD autorisées, résultats à consigner dans la PR de bilan. Les anciens caches DTN nécessitent le recalcul volontaire existant ; aucun recalcul lancé par le déploiement.

### DTN configurable par saison — 30 septembre 2026

- Demande et proposition validées par Antoine : saison concernée uniquement, âge à l’année de fin, seniors incluant masters, bassin 50 m électronique, étrangers comptés dans les Top, tous les ex æquo au dernier rang, minima sur courses distinctes et temps intermédiaires admis. Destination TEST uniquement ; aucune validation utilisateur de la réalisation ni autorisation PROD.
- État : [PR #83](https://github.com/ffessmnap/LivePalmes/pull/83) intégrée en `98269d1c4d8033f171fbcdfa6653aa9a7c37d919`, CI 36732431363 réussie, TEST commun 36732784677 en cours. La finition de référence du script portail renouvelle son cache navigateur immuable ; elle sera intégrée après ce déploiement. Reprise historique 2025–2026 conservée ; saisons indépendantes, trois dispositifs, imports avec comparaison et droit `dtn.manage` explicite. Nouvelle configuration serveur `dtnSeasons` (catalogue et une fiche par saison), inaccessible en accès Firestore direct avec les règles existantes ; vues/états/travaux DTN réutilisés. Aucun index composite nouveau nécessaire : lecture par saison et identifiant de document.
- Calcul : filtrage des performances actives de la saison avant meilleure performance par nageur/course, Top avec rang partagé et minimum OU Top. Le recalcul explicite lit la base de performances de la seule saison par pages de 500, une fois pour les trois dispositifs, au plus 100 500 documents examinés (échec au dépassement de 100 000, sans résultat partiel), 450 secondes et 900 ko par vue. Aucune publication Storage ni modification des données sportives sources. Les résultats de la précédente sont figés et datés.
- Budget métier hors contrôle d’accès : catalogue + configurations = 2 à 4 documents ; chaque nouvelle vue chargée = 4 documents sur cache prêt, 5 sinon ; mémoire réutilisée pour filtres/onglets déjà chargés. Paramètres/imports/filtres locaux = 0 lecture par ligne. Choix des compétitions = catalogue + pages de 50, recherche locale. Enregistrement/activation transactionnels bornés ; recalcul volontaire uniquement, sans scan à l’ouverture, un verrou par saison contre les demandes simultanées.
- Tests moteur/service hors réseau réussis : admissibilité avant meilleure performance, égalités, Top 8/16 avec ex æquo, étrangers, âges, intermédiaires, minima distincts ET/OU, priorité des listes, conflits, droits, pagination, activation, retrait sans suppression, import et seuils stricts. Vérification globale réussie ; contrôles ciblés après retouches réussis. Recette navigateur fictive à 390 et 1280 px, clair/sombre : édition, trame puis réimport avec aperçu, choix des compétitions, filtre de proximité et pagination sans appels supplémentaires. Recette connectée et validation utilisateur attendues ; preuve TEST à compléter dans la PR.

### Paramètres DTN compacts — 30 septembre 2026

- Demande : réduire les cases à cocher, la hauteur des champs et les espacements de la configuration saisonnière.
- Branche `fix/dtn-compact-interface` ; CSS limitée au DTN, version du cache actualisée. Aucune modification des règles sportives ni des données ; coût Firebase supplémentaire nul.
- Vérifications : rendu ordinateur/mobile et thèmes clair/sombre, interactions existantes et contrôle portail ciblé. Résultats et preuve TEST consignés dans la PR associée après exécution.
- État : en préparation pour TEST ; recette visuelle utilisateur attendue. Aucune publication PROD autorisée.

### Présentation historique des résultats DTN — 30 septembre 2026

- Retour d’Antoine : conserver la lisibilité des trois onglets PROD avec la configuration saisonnière. La retouche des paramètres (PR #85, `1217d128`) est sur TEST, run 36739087586 ; recette utilisateur non acquise.
- Branche `fix/dtn-restore-results-layout` : matrice France avec catégories actives et minima/Top, onglets EDF et sélection F/H, tableau de mise en liste avec filtres, compteurs et détails repliables. Réutilisation des composants visuels existants ; paramètres et résultats proviennent de la saison sélectionnée.
- Budget : zéro lecture/écriture Firebase supplémentaire ; filtres, onglets, détails, compteurs et pagination utilisent la vue déjà chargée. Aucun moteur de calcul, périmètre sportif ou donnée modifié.
- Vérifications ciblées : affichage cadets activés/désactivés selon la saison, minimum/Top, détails, filtres EDF et proximité, regroupement des sportifs, filtres de mise en liste, état périmé et responsive clair/sombre. Preuve finale et PR à consigner dans la PR associée.
- État : en préparation TEST uniquement ; retour visuel utilisateur attendu. Pas d’accord PROD.

### Synthèse EDF en blocs — 30 septembre 2026

- Demande finale : modifier uniquement la présentation de la synthèse des sportifs comme en PROD ; conserver les temps proches et la meilleure performance par course.
- Branche `fix/dtn-summary-groups` : blocs repliables par référentiel actif, effectifs F/H, tableau Sportif/Sexe/Club/Temps réalisés, détails au clic et export repliable. Aucune modification du calcul ni du backend ; zéro lecture/écriture Firebase supplémentaire.
- Contrôles ciblés ordinateur/mobile, effectifs, ouverture des blocs et détails, saison et état périmé ; preuve finale dans la PR associée. TEST uniquement, recette utilisateur attendue ; aucune autorisation PROD.

### Lisibilité et recherche DTN — 30 septembre 2026

- Antoine autorise les suggestions de l’audit visuel, sauf l’agrandissement des informations compétition/date en mise en liste.
- Branche `fix/dtn-reading-search` : en-têtes compacts, recherche locale nom/prénom dans la synthèse et les listes, titres de synthèse à gauche, matrice France resserrée avec catégories explicites, tiret sans qualifié EDF et ligne de fraîcheur allégée. Le libellé « par sportif et par course » est déjà présent dans le module saisonnier et conservé.
- Budget avant/après identique : zéro lecture/écriture Firebase ajoutée à l’ouverture, recherche, filtres, pagination ou export. Calculs, règles sportives, données et taille des détails de mise en liste inchangés.
- Recette fictive réussie à 390 et 1440 px, clair/sombre : recherche accents/casse/nom/prénom, zéro résultat, réinitialisation, compteurs, détails, absence de débordement de page ; parcours saison/France/EDF/proximité/listes et cache absent vérifiés. Contrôle global et preuve TEST à consigner dans la PR associée.
- TEST uniquement ; validation utilisateur de cette nouvelle version attendue. Aucun accord PROD.

### Filtres de mise en liste fluides — 30 septembre 2026

- Retour utilisateur après PR #88 : Tous/Femmes/Hommes tronqués par les colonnes fixes après ajout de la recherche.
- Branche `fix/dtn-fluid-filters` : barre flexible avec retour à la ligne, groupe sexe non comprimé et champs extensibles ; uniquement CSS et cache. Aucun changement métier ni lecture Firebase supplémentaire.
- Vérifications ciblées Relève/Espoir sur mobile, largeur intermédiaire et ordinateur : boutons entièrement visibles, sans chevauchement ; filtres et recherche conservés. Preuve de publication TEST à consigner dans la PR ; validation utilisateur attendue, aucune autorisation PROD.

### Navigation DTN et accord de publication — 30 septembre 2026

- Antoine demande à 22:44 Paris de corriger le surlignage de Paramètres DTN puis de publier en PROD toutes les évolutions de l’espace DTN développées dans cette discussion. Cet accord couvre les saisons, paramètres, règles configurables et les retouches d’affichage jusqu’à cette correction ; aucun autre domaine, copie de données ou recalcul n’est demandé.
- Correction ciblée : le lien Paramètres DTN possède maintenant son identifiant de sous-page, comme les trois autres liens. Seule la page réellement consultée doit être active. Aucun calcul ni droit modifié ; zéro lecture/écriture Firebase supplémentaire.
- Branche `fix/dtn-settings-active` ; vérification des quatre liens et publication TEST avant préparation du bilan PROD. Preuves exactes et bilan de publication dans les PR associées.

### Extension de publication DTN — 30 septembre 2026

- Antoine autorise à 22:55 Paris les deux dépendances partagées et l’adaptation du circuit, après l’accord PROD de 22:44.
- Extension nominative : `resumePerformancePublicationJobs` et `resolveEngagementSwimmerChangeRequest`, nécessaires à l’invalidation des caches par saison. Les groupes ordinaires ne sont pas élargis.
- Publication de source seulement, sans invocation, modification de secrets, programmation ou IAM. Contrôle des configurations conservées, sauvegarde PROD et retour arrière existants ; preuve TEST obligatoire pour les deux fonctions.
- Correction du menu PR #90 intégrée dans `a380d7f8dd118a0d8363a68e1c207c05f6920ed1`, TEST `36775250093` réussi ; les quatre liens ont été vérifiés avec un seul onglet actif.
- Branche `release/dtn-season-production` : validation de l’extension et préparation de la promotion complète ; preuves finales consignées dans la PR.

- TEST `36776745747` bloqué avant toute mutation : les deux fonctions n’existent pas dans TEST. Adaptation du contrôle à cet environnement : exécution des helpers modifiés avec une base simulée et vérification des chaînes d’appel, preuve dédiée au commit exact. Aucune activation d’automatisme TEST ; cette limite d’intégration est explicitement conservée dans le bilan.

### TOP : conserver les meilleurs temps par bassin — 4 octobre 2026

- Demande explicite d'Antoine : correction structurelle, reconstruction des seuls index/fichiers dérivés sur TEST, contrôle Clément BECQ 200 BI Senior Hommes 2017 ; aucune modification des performances sources ni publication PROD.
- Clés de candidats complétées par le bassin, champ conservé dans les vues Firestore, previews limités à 100 nageurs distincts. Page TOP conservée : filtrage avant sélection par nageur.
- Constructeurs historiques recensés et scripts de réparation depuis des données tronquées archivés. Workflow TEST existant complété d'un mode TOP seuls avec sauvegarde préalable et contrôle après écriture.
- Tests automatiques : générateur, contrôle de cohérence, index, mise à jour progressive, filtre 25/50/tous, saison/région/catégorie et TOP 25 distinct. Vérification globale locale réussie ; contrôles GitHub et reconstruction réelle TEST en attente. Recette utilisateur non acquise. Preuves à consigner dans la PR et les runs associés.

- PR #94 intégrée dans `6299520cecb387553fbeda245624f05ebfef1e95`. Déploiement du code TEST réussi : run `37220457816`, 8 fonctions sur 138 sélectionnées et Hosting contrôlé. La première reconstruction `37220710124` s'est arrêtée AVANT écriture : bucket 200BI Hommes toutes catégories/saisons trop volumineux avec les deux bassins. Les anciens index/fichiers sont restés en place.
- Complément : compression sans perte des seules grandes vues Firestore, décodage compatible dans tous les lecteurs/writers actifs, contrôle croisé des codecs et conservation des 500 candidats par bassin. Nouvelle reconstruction TEST à confirmer ; aucun changement des sources ni de PROD.

### TOP et progression par bassin — préparation PROD du 4 octobre 2026

- PR #94, #95 et #96, candidat `58df08dd27a05880585ba68ce78f65a8c2ca47da`. TOP reconstruits sur TEST avec succès : run `37221659232` (1 h 18 min 32 s). Graphiques publiés par TEST `37229607916` et contrôlés sur Clément BECQ (Tous bassins/25/50, cas une saison sans courbe).
- Validation et demande PROD explicites d’Antoine : « ok j’ai testé en test tout est bon. Peux tu pousser en prod toutes les modif qu’on a fait? sur les top reconstruit, sur les graphe mis à jour en fonction d ubassin ».
- Bilan `.github/releases/20261004-top-pools.json`; preuve complémentaire TEST `37230870893` sur le même candidat pour les deux dépendances partagées. Publication de dix fonctions modifiées et Hosting prévue. Paramètres, secrets et calendriers conservés; aucune invocation métier manuelle.
- Reconstruction TOP PROD séparée à préparer avec sauvegarde préalable, depuis les seules sources PROD en lecture seule. Aucune copie TEST→PROD, aucune règle/index Firestore. Résultats PROD encore à confirmer.

### Résultat PROD — 4 octobre 2026

- Code publié avec succès : run PROD #29 `37231461002`, durée 5 min 56 s, candidat applicatif `58df08dd27a05880585ba68ce78f65a8c2ca47da`, Hosting `sites/livepalmes/versions/7c39e53924a27a15`. Bilan #31 `37231214819`, TEST complémentaire #33 `37230870893`. Dix fonctions sélectionnées; sauvegarde chiffrée `production-code-backup` 11313882217 conservée jusqu’au 18 octobre. Contrôles fonctions/exclusions et Hosting réussis.
- Vérification navigateur PROD : Clément BECQ id 8712, 200 BI Tous/25/50; courbes et sous-titres mis à jour immédiatement (3 saisons en 25 m, 5 en 50 m); listes Meilleures et Toutes les perfs fonctionnelles. 50 BI en 25 m : une seule saison 2015, courbe absente; retour Tous : courbe rétablie.
- TOP PROD NON reconstruits : workflow dédié #1 `37231762915`, échec avant toute écriture à la première requête Firestore sources : `7 PERMISSION_DENIED: Missing or insufficient permissions`. Compte `github-actions-livepalmes-back@livepalmes.iam.gserviceaccount.com`. Aucun droit élargi, aucune identité alternative utilisée. PR #98 fournit l’outil borné/sauvegardé, mais l’accès de maintenance doit être autorisé avant reprise.
- Aucun changement des sources, aucune copie TEST→PROD, aucun déploiement de règles/index Firestore. Les TOP existants sont restés en place. Ne pas déclarer la demande terminée tant que la reconstruction n’a pas réussi.

### Reprise TOP PROD — 5 octobre 2026

- Après ajout manuel des droits par Antoine, run #2 `37276414186` : lecture autorisée, 469 364 sources lues dont 469 219 publiables, cohérence validée, sauvegarde chiffrée rouverte et enregistrée, empreinte sources inchangée.
- Arrêt avant toute écriture par la garde anti-suppression : des vues existantes sont absentes du nouveau plan. Aucun TOP ni fichier public modifié par ce run.
- Diagnostic dédié de la seule sauvegarde du run #2, sans connexion aux données Firebase et sans nouvelle lecture des performances : comparaison des identifiants et métadonnées des vues, sans journaliser les lignes nageurs. La garde anti-suppression reste inchangée.

- Diagnostics #1 `37278081091` et #2 `37278820281` réussis. Sept vues historiques absentes du plan : cinq vides, deux caches 800SF dont les sources actives ont changé de catégorie (2010 région 2 : J→S ; 2008 région 22 : C→J). Aucune source modifiée par le diagnostic.
- Reconstructeur complété pour conserver les cinq documents vides et recalculer à vide les deux caches obsolètes, sans supprimer de document. Sept clés nominatives seulement ; sources et nouvelle catégorie contrôlées, tout cas inconnu bloque. Sauvegarde, empreintes, protection des écritures concurrentes et relecture intégrale maintenues. Tests ciblés de conservation/refus réussis ; nouveau run PROD à confirmer.

### Migration NAP des pages publiques — 6 octobre 2026

PR #105 integree pour preparer l'export prive et les fichiers compatibles. Backend 37382627387 arrete avant activation : declaration indentee absente du classement statique. Correctif et comparaison des historiques/liens en cours ; aucune page habituelle basculee. Lecture NAP sur la page de verification validee par Antoine, validation des pages publiques encore a faire. Hors PROD.

- Suite migration NAP : PR #106 integree au commit cb17adbc6cf0edafca09bbb71799a63986f4d7f8 ; backend TEST 37386048548 reussi. Export prive refuse sans authentification (HTTP 403). Audit 37420371570 reussi techniquement, mais comparaison non prete pour bascule : 3290 lignes sans correspondance exacte, 32286 avec metadonnees differentes, quelques anciens liens a reprendre. Diagnostic approfondi en cours ; aucune page habituelle basculee et aucune ecriture NAP.

### Correction de la cible NAP directe — 6 octobre 2026

Antoine precise une lecture directe NAP, sans export a relancer. Run de publication statique 37429288547 annule ; aucun Hosting TEST active sur cette source. Retrait du branchement statique de la PR #108 et preparation d'une API de lecture directe, paginee/indexee. Les pages habituelles restent sur la publication TEST precedente en attendant ce branchement. Licences differees ; PROD inchangee.

- Lecture NAP directe : retrait #109 integre, aucune bascule Hosting par exports. Diagnostic des index et plans de recherche/fiche/TOP en preparation, quatre requetes de structure ou EXPLAIN sans ecriture. Activation des pages encore a faire.

- Lecture directe : #110 integre et lot NAP TEST 37430938244 reussi. Plans 37431247753 : recherche nom et fiche indexees, TOP en scan complet (521835 lignes) non active. Lecteur public de fiche TEST prepare, deux requetes groupees sans cache ; regles de presentation partagees avec le generateur sans changement. Raccordement des pages et adaptation des index TOP encore a faire.

- #111 integre ; lot NAP 37432035467 reussi. Lecteur public direct du nageur 7322 controle HTTP 200 : 1468 lignes normalisees, dont 843 performances hors passages intermediaires. Les pages habituelles ne sont pas encore raccordees. Diagnostic 37432527182 reussi : temps numeriques majoritairement sur six caracteres, deux sur cinq et un sur trois ; le tri direct devra conserver les largeurs valides sans correction des donnees. Antoine autorise explicitement l'index recherche `nageurs(prenom,nom,date,id)` et l'index TOP `perfs(course,relais,tps,id)`, ce dernier hors saisie de resultats. Circuit dedie prepare : confirmation et commit exact, sauvegarde de structure, ajout non unique fixe, relecture ; aucun export sportif, aucune modification de ligne, aucun changement Hosting. Execution et preuves encore a renseigner ; accord TOP ne vaut pas confirmation d'une fenetre sans saisie.

- Suite #112 : Antoine confirme l'absence de saisie/import pour executer les deux index maintenant. Recherche serveur par nom/prenom (deux plages indexees, 42 candidats maximum, 21 profils maximum, jointure clubs groupee) ou identifiant (cle primaire) ; index impose pour refuser un scan si absent. Fiche habituelle TEST raccordee a la lecture directe : deux requetes par ouverture ou selection, 2001 lignes brutes maximum pour refuser toute troncature ; les filtres locaux n'ajoutent pas de lecture, reselection et rechargement relisent NAP. Recherche : un appel par saisie, relecture sans cache ; maintien des pages/styles/URL et de la presentation sportive. Records/MPF et TOP restent a raccorder, aucune validation navigateur ou publication commune encore revendiquee. Syntaxe et tests recherche/fiche reussis ; verification globale Windows arretee sur le test CRLF preexistant des workflows, resultat Linux CI requis.

- #112 integre au commit ad5032865cf452db0fac80bf6676501794f2e444, verification Linux et apercu 37433700174 reussis. Recette navigateur detecte que le domaine d'apercu n'etait pas reconnu TEST : correction de l'identification des domaines TEST et tests de non-confusion avec un domaine tiers prepares. Index recherche 37433990412 en echec avant sauvegarde de structure, aucun ajout confirme ; index TOP 37433993931 annule en file par concurrence avec le deploiement backend. Diagnostic d'etape sans detail sensible et file separee pour les index prepares. Aucun Hosting commun publie.

- #113 integre au commit dc394f7a6a0e15cca27d8c6d65f1dbaf03970592 ; controles 37434267955 reussis, fiche 7322 affichee dans l'apercu avec filtres (19 saisons, 14 courses). Backend recherche/fiche 37433997591 reussi, recherche par ID HTTP 200. Nouvel essai index 37434625625 confirme l'echec d'acces direct au secret depuis GitHub : aucun ajout confirme. Correction utilise l'endpoint deja prive et la connexion serveur existante, sans nouvelle permission IAM : POST uniquement, deux index fixes, preparation de structure sauvegardee avant ajout, empreinte contre modification concurrente, refus si ecriture active et verification idempotente. La voie GET et le lecteur public restent en lecture seule. Tests de ces protections passes ; execution reelle et publication commune encore a faire.

- Preparation TOP directe : controle complementaire de validite des rares temps numeriques courts selon les regles existantes, par les memes plages primaires de 10000 identifiants. Seuls des compteurs reviennent ; plus de dix temps courts dans une plage refuse une conclusion incomplete. Aucun temps corrige ni ignore sur la seule base de sa largeur. Documentation active reecrite autour de la lecture directe, avec budgets et travaux restant a faire ; ancienne approche par exports explicitement abandonnee.
