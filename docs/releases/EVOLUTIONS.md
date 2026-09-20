# Évolutions LivePalmes

<!-- description: Registre commun des évolutions, déploiements TEST et validations utilisateur. -->

La version applicative `995ec7025e31cd147444e38a99afba69808a1406` est publiée en PROD depuis le 20 septembre 2026, run [35519443050](https://github.com/ffessmnap/LivePalmes/actions/runs/35519443050). Les commits d’infrastructure ultérieurs ne sont pas des évolutions applicatives déjà publiées.

| Besoin | PR / commit | État | Preuve TEST | Validation utilisateur | Publication PROD |
| --- | --- | --- | --- | --- | --- |
| Circuit réutilisable TEST → PROD | [PR #50](https://github.com/ffessmnap/LivePalmes/pull/50) | Intégré ; correction de sécurité TEST en cours | [Essai TEST 35523482002](https://github.com/ffessmnap/LivePalmes/actions/runs/35523482002), code applicatif inchangé ; ne pas réutiliser cette preuve après correction | Demande d’Antoine dans Infra ; ne vaut pas recette d’une future évolution applicative | Aucune demandée |

États : en cours → intégré → déployé sur TEST → validé par Antoine → publié en PROD. Une ligne n’est validée que sur la base d’un retour réel. Conserver l’historique, ne pas effacer les travaux inachevés pour faire passer une publication.

Le premier essai du circuit TEST a inclus des fichiers temporaires de credentials. Publication retirée et isolation à corriger ; remplacement/révocation des clés TEST concernées requis avant remise en service normale. Aucun workflow PROD déclenché dans cette évolution.
