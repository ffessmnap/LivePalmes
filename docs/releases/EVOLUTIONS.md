# Évolutions LivePalmes

<!-- description: Registre commun des évolutions, déploiements TEST et validations utilisateur. -->

La version applicative `995ec7025e31cd147444e38a99afba69808a1406` est publiée en PROD depuis le 20 septembre 2026, run [35519443050](https://github.com/ffessmnap/LivePalmes/actions/runs/35519443050). Les commits d’infrastructure ultérieurs ne sont pas des évolutions applicatives déjà publiées.

| Besoin | PR / commit | État | Preuve TEST | Validation utilisateur | Publication PROD |
| --- | --- | --- | --- | --- | --- |
| Circuit réutilisable TEST → PROD | [PR #50](https://github.com/ffessmnap/LivePalmes/pull/50) | Circuit corrigé ; essai Hosting TEST réussi | [TEST 35525725737](https://github.com/ffessmnap/LivePalmes/actions/runs/35525725737), commit `0e936f6c5851dc70213e3b9783a0cfc2a3af0dd1`, preuve `test-proof` ; fonctions inchangées | Demande d’Antoine dans Infra ; ne vaut pas recette d’une future évolution applicative | Aucune demandée |

États : en cours → intégré → déployé sur TEST → validé par Antoine → publié en PROD. Une ligne n’est validée que sur la base d’un retour réel. Conserver l’historique, ne pas effacer les travaux inachevés pour faire passer une publication.

Le premier essai du circuit TEST a inclus des fichiers temporaires de credentials. Publication retirée puis isolation corrigée par la PR #51. Antoine a confirmé la suppression des deux anciennes clés et l’enregistrement des deux remplaçantes dans les secrets GitHub le 20 septembre 2026. Le nouvel essai 35525725737 authentifie les deux comptes avec succès, contrôle les fichiers publiés, publie Hosting et conserve la preuve de version. Les étapes de déploiement Functions sont ignorées car aucun code backend n’a changé ; cet essai ne valide donc pas un déploiement Functions réel. La preuve de l’ancien essai 35523482002 ne doit pas être réutilisée. La suppression des anciennes clés est confirmée par Antoine, sans contrôle IAM indépendant. Aucun audit d’utilisation des anciennes clés n’a été réalisé dans cet essai. Aucun workflow PROD déclenché dans cette évolution.
