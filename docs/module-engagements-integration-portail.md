# Intégration des engagements dans le portail

<!-- description: Architecture actuelle NAP des compétitions, engagements, personnes, documents et notifications du portail. -->

## Parcours

`portail.html` et les modules `assets/livepalmes-admin-*.js` utilisent les Cloud Functions authentifiées. Celles-ci contrôlent compte, capacité et périmètre avant accès NAP. Ce module prépare les compétitions ; il reste distinct des consoles LivePalmes Direct conservées dans Firebase.

## Sources et écritures

Compétitions, courses, dossiers clubs, nageurs, chefs d'équipe, officiels et relais utilisent les tables natives NAP et les compléments `livepalmes_*`. Les compléments conservent les options supplémentaires LivePalmes : programme détaillé, tarifs, qualifications, statuts et historique. Les anciennes collections sportives `engagementCompetitions`, `engagementClubEntries` et leurs agrégats Firestore ne sont plus la source des parcours NAP.

Le calendrier public, les formations, stages et réunions utilisent aussi NAP. La bibliothèque eau libre repart des courses par défaut validées, sans reprise de l'ancienne bibliothèque Firebase. Les règles de dates, périmètres, temps et suppression sont précisées dans [NAP_REFERENCE.md](NAP_REFERENCE.md).

Les écritures sont bornées, vérifient l'état attendu et conservent les traces/sauvegardes requises. TEST utilise la même base réelle : aucun engagement ou suppression d'essai sans accord spécifique. Les tables natives MyISAM empêchent de promettre une transaction globale.

## Documents et diffusion

Documents/protocoles restent hébergés chez Google ; titres/liens et rattachements sont conservés dans NAP. PDF clubs et exports sont produits depuis le dossier NAP. Les PDF groupés sont téléchargeables en ZIP, en plus du téléchargement par club. En eau libre, le récapitulatif conserve le formalisme piscine sans temps ; validation TXT dans WinPalme différée.

Comptes, destinataires, préférences et jobs techniques de notification restent dans Firebase. Le réglage national permet de couper les mails automatiques sans rattrapage à la réactivation ; il ne faut pas le confondre avec tous les mails de compte ou les actions manuelles. Mails automatiques constatés désactivés dans les deux environnements le 12 octobre. Voir `functions/engagement-mail-control.js`, `nap-notification-automation.js`, `nap-mail-delivery.js`.

## Modules et vérifications

Sources principales : `functions/nap-portal-competitions.js`, `nap-portal-entries.js`, `nap-portal-workspaces.js`, `nap-individual-entry-change.js`, `nap-official-entry-change.js`, `nap-relay-entry-change.js`, `nap-relay-composition-change.js`, `nap-team-leader-change.js`, `nap-competition-documents.js` et leurs appels contrôlés dans `functions/index.js`.

Budgets : [OPTIMISATION_NAP.md](OPTIMISATION_NAP.md). Recette : [TESTS_MANUELS.md](TESTS_MANUELS.md). Publications et retour arrière : [PROCEDURE.md](releases/PROCEDURE.md). Aucune reconstruction des agrégats sportifs Firestore n'est une précondition du portail actuel.
