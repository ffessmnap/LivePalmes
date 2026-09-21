# Évolutions LivePalmes

<!-- description: Registre commun des évolutions, déploiements TEST et validations utilisateur. -->

La version applicative `995ec7025e31cd147444e38a99afba69808a1406` est publiée en PROD depuis le 20 septembre 2026, run [35519443050](https://github.com/ffessmnap/LivePalmes/actions/runs/35519443050). Les commits d’infrastructure ultérieurs ne sont pas des évolutions applicatives déjà publiées.

| Besoin | PR / commit | État | Preuve TEST | Validation utilisateur | Publication PROD |
| --- | --- | --- | --- | --- | --- |
| Circuit réutilisable TEST → PROD | [PR #50](https://github.com/ffessmnap/LivePalmes/pull/50) | Circuit corrigé ; essai Hosting TEST réussi | [TEST 35525725737](https://github.com/ffessmnap/LivePalmes/actions/runs/35525725737), commit `0e936f6c5851dc70213e3b9783a0cfc2a3af0dd1`, preuve `test-proof` ; fonctions inchangées | Demande d’Antoine dans Infra ; ne vaut pas recette d’une future évolution applicative | Aucune demandée |

États : en cours → intégré → déployé sur TEST → validé par Antoine → publié en PROD. Une ligne n’est validée que sur la base d’un retour réel. Conserver l’historique, ne pas effacer les travaux inachevés pour faire passer une publication.

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
