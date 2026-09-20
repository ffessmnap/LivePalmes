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
- État : en cours, essai TEST demandé par Antoine ; validation utilisateur attendue.
- Périmètre : CSS du portail et version de chargement uniquement, aucune lecture/écriture Firebase ajoutée. Aucun déploiement PROD demandé.
- Première version : [PR #57](https://github.com/ffessmnap/LivePalmes/pull/57), TEST au commit `a72ca5f1682fa5ef381e8223b90b8ce38afdb7a9`, [run 35528729097](https://github.com/ffessmnap/LivePalmes/actions/runs/35528729097) réussi. Compte contrôlé dans les deux modes ; accueil, calendrier, formulaire et annuaire contrôlés en mode sombre. Ces contrôles ont identifié des détails à compléter : badge de niveau, dates, licences et séparateurs. Correction complémentaire en cours.
