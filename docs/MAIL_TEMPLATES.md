# Modèles de mails du Portail

<!-- description: Édition nationale des modèles, contrat de rendu et des décisions, versions figées, budgets de lecture et contrôles hors réseau. -->

## Fonctionnement

Administration nationale → Notifications → Modèles de mails. L’éditeur se charge au clic : type, objet, texte simple, variables autorisées, aperçu avec données fictives, enregistrement et retour au défaut. L’aperçu reste inerte ; le HTML d’envoi réutilise le rendu échappé existant. Le contrôle national existant est exécuté côté serveur avant toute lecture ou écriture.

Enregistrer ou rétablir un modèle n’envoie aucun mail et ne crée aucun job. Les personnalisations restent dans le seul document `engagementConfigurations/mailTemplates`, créé uniquement par un enregistrement utilisateur. Aucun amorçage ni migration nécessaire : document ou personnalisation absents = générateur actuel inchangé. Une panne de lecture ne devient jamais une absence ; elle bloque le chargement ou la préparation concernée et est signalée.

Le catalogue est fermé dans `functions/mail-template-catalog.js` (31 entrées, dont Firebase Auth géré séparément). Objet sur une ligne, 220 caractères maximum ; source texte de 5 000 caractères maximum ; document limité à 240 000 octets. Variables inconnues/mal formées et suppression/duplication d’un bloc obligatoire refusées. Les blocs multilignes et liens obligatoires restent sur une ligne distincte, pour ne pas les masquer dans une URL. Un rendu personnalisé trop long bloque sa préparation au lieu de tronquer un bloc protégé. Les bilans licences conservent leur capacité métier, avec un plafond de rendu de 750 000 caractères ; leur accompagnement reste limité à 5 000 caractères.

Les destinataires, capacités, préférences, pièces jointes, décisions et calculs restent dans les services métier. Le bloc des frais est repris du générateur existant, sans changement de politique financière. Le bilan licences conserve compteurs, anomalies, réserves et avertissements dans `{{licences.bilan}}`. Les pieds de gestion des notifications restent ajoutés par le transport existant, hors de l’éditeur.

## API nationale

Les deux callables existantes sont étendues sans nouveau droit, export Firebase ou secret :

- `getEngagementAutomaticMailControl({action: "mailTemplates"})` : catalogue et personnalisations, révision globale, auteur/date/révision par personnalisation.
- `getEngagementAutomaticMailControl({action: "previewMailTemplate", id, subject, text})` : validation et rendu de données fictives codées, aucune lecture métier, écriture ou préparation de mail.
- `updateEngagementAutomaticMailControl({action: "mailTemplate", operation: "save" | "reset", id, subject, text, expectedRevision})` : transaction avec contrôle de révision et audit atomique. Réponse complète réutilisée sans relecture.

Les appels sans `action` conservent strictement le contrôle d’activation existant. Aucune action du modèle ne modifie `notificationDelivery`. Un conflit ou une réponse perdue demande une actualisation explicite ; aucun réessai d’écriture implicite.

## Versions de préparation

Décision d’Antoine : les mails déjà préparés conservent leur texte. Une personnalisation concerne uniquement les préparations suivantes.

- Événements automatiques : le catalogue est figé dans l’événement `engagementClosureQueue` existant, sous la même prise de bail, avant la première page/PDF. Pages et reprises utilisent cette copie. Une interruption après le gel ne sélectionne pas une nouvelle version.
- Ancien événement déjà partiellement préparé : défauts du code conservés, sans appliquer une nouvelle personnalisation à ses pages restantes. Aucun job existant n’est réécrit.
- Bibliothèque nationale : snapshot dans le même magasin technique, document déterministe sans `runAt` et sans consommation par un planificateur. L’aperçu ne crée rien ; la confirmation d’envoi existante fige la version avant le premier lot. Le premier job déterministe permet de reconnaître un ancien lot avant la mise en place des snapshots.
- Bilans licences : snapshot du seul modèle concerné dans le JSON `report.mail` existant. `markMail` préserve ce snapshot et n’ajoute `sentAt` qu’après la livraison complète. Aucun changement de table/DDL ; les résumés excluent le snapshot et n’assimilent pas la préparation à un envoi. Les comparaisons des snapshots sont insensibles à l’ordre des clés JSON.

Les mails préparés portent `templateId`, `templateRevision` et `catalogRevision`. Les identifiants et protections de livraison existants restent inchangés. Un changement des modèles ne rejoue aucun événement.

## Contrat pour les mails de décision

`functions/mail-template-rendering.js` expose `requestMail(snapshot, input, original?)`. Le consommateur fournit des informations publiques : `kind`, `decision` (`approved`/`rejected`), `subject`, `greeting`, `summary`, `details`, `comment`. Aucun champ de note interne n’est lu. Un générateur existant fourni dans `original` reste le défaut exact ; les nouveaux consommateurs disposent d’un défaut générique sans annoncer d’action non réalisée.

Identifiant stable : `request.<kind>.<decision>`, pour `access`, `swimmer_correction`, `official_correction`, `swimmer_reactivation`, `official_reactivation`, `swimmer_ns`, `duplicate_closure`, `account_deletion`, `swimmer_deletion`, `competition_deletion`. Une clôture de doublon ne doit jamais annoncer une fusion.

Variables : `salutation`, `decision.objet`, `decision.resume`, `decision.details`, `decision.commentaire`. Les trois derniers blocs sont obligatoires dans la source ; détails/commentaire facultatifs peuvent produire un bloc vide. Le résumé, l’objet et les détails décrivent la décision réellement enregistrée. Les textes existants des refus d’accès et des corrections nageurs restent les défauts de leurs consommateurs actuels.

Le chantier suivant reste responsable des déclenchements, du commentaire obligatoire au refus même sans mail, de la case d’information du demandeur, des destinataires et de la traçabilité des envois. Ce lot n’ajoute aucun déclenchement de décision. Les modèles non encore raccordés sont signalés dans le catalogue ; les mails Firebase Auth restent indépendants.

Périmètre actif confirmé pour le lot suivant : `access`, `swimmer_correction`, `official_correction`, `swimmer_ns`, `duplicate_closure`, `account_deletion`. Les variantes de réactivation directe et d’anciennes suppressions NAP du catalogue n’ajoutent aucun parcours ni consommateur à cette livraison.

## Budget supplémentaire

| Situation | Budget du nouveau besoin |
| --- | --- |
| Ouvrir/actualiser l’éditeur | Contrôle national existant : au plus 1 document utilisateur ; puis 1 document de modèles. Zéro SQL. |
| Sélectionner, saisir, insérer une variable | Zéro accès. |
| Aperçu fictif | Contrôle national : au plus 1 document utilisateur ; aucune lecture du catalogue ni donnée métier. |
| Enregistrer/rétablir | Au plus 1 document utilisateur + 1 lecture transactionnelle du catalogue ; 1 écriture de catalogue et 1 audit atomiques. |
| Retour à l’éditeur | Cache de 30 secondes ; brouillon conservé et demandes simultanées bloquées. Sans brouillon, relecture à la réouverture après expiration ; après conflit, actualisation explicite. |
| Première page automatique | 1 lecture de catalogue, puis 1 lecture/1 mise à jour de l’événement existant pour le gel. Pages/reprises suivantes : zéro lecture de catalogue supplémentaire. |
| Bibliothèque, première préparation | 1 lecture directe du snapshot ; s’il manque, 1 catalogue ; au plus 1 premier job direct pour compatibilité ancienne ; transaction 1 lecture/1 écriture du snapshot lors de la confirmation existante. Pages suivantes : 1 snapshot direct par appel, zéro catalogue. |
| Licences | Snapshot porté par la lecture existante du bilan ; s’il manque, 1 catalogue et au plus 1 premier job direct. Premier gel seulement : transaction NAP existante de 2 SELECT par clé et 2 UPDATE des JSON/résumés, plus les 2 requêtes fixes de prise/libération du verrou nommé (ou 1 lecture/1 écriture pour compatibilité Firestore). Les pages suivantes réutilisent `report.mail`. |
| Messages de compte directs | 1 catalogue par opération d’envoi ; pour l’alerte aux responsables, lecture mutualisée avant la boucle, aucune lecture par destinataire. |

Pire cas : ces suppléments restent identiques avec 10 ou 10 000 destinataires. Catalogue borné, lectures directes par identifiant, aucun listener, scan global, appel SQL par ligne ou reconstruction implicite. Les budgets existants de l’annuaire, des dossiers, PDF et transports restent inchangés.

## Vérifications et livraison

Tests hors réseau : `mail-templates-tests.js`, `mail-template-editor-browser-tests.js`, tests existants des cinq contenus, des demandes d’accès/corrections, du contrôle d’envoi, événements/pages NAP, bibliothèque nationale et bilans licences/NAP. Vérifier absence/panne, échappement, limites, variables/blocs, droits, CAS/audit, aperçu et enregistrement sans envoi, versions entre pages/reprises et anciens jobs. Recette ordinateur/390/320 px, clavier/toucher, thèmes et erreurs.

CI obligatoire sur le candidat exact. Le complément de sources TEST est autorisé par Antoine dans la coordination du 8 novembre : contrat fermé `20261108-test-mail-sources-contract.json`, workflow `livepalmes-test-mail-sources.yml`, lot `models`. Le code est ancré au commit applicatif relu ; seules les différences d’outillage/documentation énumérées sont admises avant le main exact ayant sa propre CI. L’entrée `decisions` devra être ajoutée sur son propre candidat testé, sans inclure de code futur dans `models`. Aucun ancien contrat daté n’est modifié.

Ordre : complément des seules sources conservées réellement différentes, puis TEST commun ordinaire/Hosting et contrôle commun final. Préconditions déjà satisfaites : mails désactivés, file et planificateur suspendus. Aucun changement de configuration, secret, identité, déclencheur, permission, réglage, message ou donnée ; aucun contenu de tâche, préparation ou envoi réel lu/invoqué. Les gardes, budgets et preuves sont détaillés dans [la procédure](releases/PROCEDURE.md).
