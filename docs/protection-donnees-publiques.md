# Protection des données publiques

<!-- description: Contrat des réponses publiques avec année de naissance seule, identités opaques, compatibilité privée et budget de lectures inchangé. -->

Le lot A1 est suivi dans [le chantier #892](https://github.com/ffessmnap/LivePalmes/issues/892), rattaché au [plan #891](https://github.com/ffessmnap/LivePalmes/issues/891). Le premier sous-lot du 15 novembre 2026, couvrant le code courant et les réponses publiques, est publié et vérifié en PROD ; preuves dans [le registre](releases/EVOLUTIONS.md). L’historique principal n’est pas purgé et A1 reste ouvert.

## Réponses publiques

Le lecteur HTTP public applique `nap-public-privacy.js` à ses réponses sportives, après les calculs et sélections existants. Recherche, fiche, TOP, résultats et Records/MPF utilisent la même projection. Le champ de compatibilité `birthDate` contient seulement l’année ; `birthYear` porte également l’année. Jour, mois et âge civil exact ne sont pas publiés par ce contrat. Les dates des compétitions et performances restent complètes.

Les identités publiques sont opaques et stables à clé serveur constante. Elles ne sont pas un simple hash public de la date. Les URL canoniques utilisent toujours les identifiants des nageurs. Les rapprochements de la fiche avec les Records conservent les comparaisons exactes et les anciens cas de référence par année au moyen de clés opaques. Deux homonymes d’une même année ne sont pas confondus par une égalité d’années ajoutée côté navigateur.

La transformation crée une réponse distincte : les lecteurs internes, données privées, sélections et calculs sportifs gardent leurs entrées complètes. Aucun schéma NAP, donnée réelle, droit, règle, PIN, mécanisme Storage, import ou scheduler n’est modifié. Le nouveau Direct publie déjà son année de naissance dans son propre modèle ; les usages privés et historiques ne sont pas remplacés par cette projection.

## Budget et vérification

Budget supplémentaire, ouverture, action, rafraîchissement et pire cas : zéro requête SQL, zéro ligne NAP parcourue supplémentaire, zéro document Firestore, zéro listener et zéro écriture. La projection travaille seulement sur la réponse déjà bornée. Les plafonds des lecteurs restent inchangés. Le calcul en mémoire est proportionnel à cette réponse, avec une copie des champs et des empreintes des identités ; aucun cache de données nominatives n’est ajouté.

Les tests hors réseau couvrent les callbacks HTTP publics, les champs imbriqués et clés dérivées, la conservation des dates sportives et des données privées, ainsi que l’affichage de l’année et les rapprochements Records. Les contrôles ordinateur/mobile et CI du candidat complètent cette preuve avant TEST. Le registre des évolutions précise séparément préparation, contrôles, déploiement et validation utilisateur.

Le raccord TEST autorisé utilise le transport standard de sources, avec un contrat A1 immuable sur la source serveur publiée. Il refuse toute autre fonction, source serveur, configuration ou donnée. Le retrait du référentiel exige son blob d’origine exact et son absence dans le candidat. Hosting est manuel, après la preuve de source, et n’effectue aucun déploiement backend. Les refus ordinaires et PROD restent inchangés ; ce raccord ne vaut aucun accord PROD.

Après la preuve de source, le correctif du coordinateur TEST accepte cette option en mode manuel Hosting seul et interdit son report automatique vers un autre candidat. La politique vérifie les deux blobs exacts de ce raccord et de son test ; le contrat et le manifeste déjà utilisés pour la source restent inchangés. Le candidat Hosting peut ainsi inclure ce seul complément d’outillage sans modifier l’application ni republier la fonction.

Après validation du premier TEST, Antoine demande de présenter l’année entre parenthèses après le nom complet : « Paul FICTIF (2004) », avec l’année en texte normal, sans ligne « Année de naissance ». Cette retouche d’affichage est bornée aux quatre blobs exacts de la page, du script client et de leurs deux tests. Les noms utilisés pour rechercher ou rapprocher les performances restent inchangés. La source serveur et sa preuve sont conservées ; seuls Hosting et le rendu modifié sont à vérifier de nouveau.

## Préparation PROD du premier sous-lot

Le candidat validé `81051966` et sa preuve TEST `43703143650` sont figés. Le contrat PROD distinct `20261115-production-public-privacy-contract.json`, raccordé au transport permanent, conserve le périmètre complet depuis la PROD authentifiée `43527301690` : une source calculée (`readNapPublicSwimmer`) et 118 fonctions conservées. Deux comparateurs indépendants doivent concorder pour toutes les origines ; aucune sélection manuelle ni ancien accord étendu. La déclaration, les configurations et le seul retrait statique sont contrôlés contre leurs blobs exacts. Les politiques ordinaires restent inchangées.

Le manifeste de préparation référence la validation TEST et l’accord de continuer la préparation. Il ne constitue pas l’accord PROD : une instruction explicite dans Infra reste nécessaire après réussite du preflight et des prérequis. Aucun push ou intégration de ce contrat ne publie Firebase. La découverte du 15 novembre est une observation en lecture seule, sans permission manquante pour Hosting et les sources ; elle ne remplace pas les contrôles frais du plan.

La publication éventuelle suit le workflow PROD existant : dérive fraîche, sauvegarde chiffrée rouverte et comparée, source/label seuls, contrôles des configurations et des autres fonctions, puis Hosting et empreintes des fichiers servis. Aucun nouveau secret, droit, règle, index, écriture métier ou envoi. Aucune reprise automatique du contrat A1.

Le retour arrière technique conserve la source précédente et la référence Hosting. Restaurer l’ancien lecteur peut rétablir les dates complètes publiques : cette conséquence doit être présentée avant une restauration. Aucun retour arrière de code ne restaure de données métier ni ne purge l’historique Git.

## Copies et historique

Le référentiel nominatif public devenu inutile est retiré du code courant et empêché de revenir par une exclusion Git et un contrôle existant de retrait des copies. Les exclusions Hosting déjà en place restent conservées. Les anciens outils nominatifs sans consommateur actif sont retirés ; aucune opération de correction de données n’est exécutée.

Le sous-lot historique conserve son inventaire local et ses preuves distinctes. Retirer le fichier courant ne retire pas les commits, branches, PR, artefacts ou copies externes associés. La préparation et l’essai de purge se font sur copie isolée ; la publication d’un historique réécrit nécessite le bilan des conséquences et l’accord spécifique avant son exécution.

Deux outils annexes inutilisés ont été supprimés à la demande d’Antoine, après retrait des sites publics et restauration vérifiée des sauvegardes locales. Cette suppression ne concerne ni les consoles du nouveau Direct dans LivePalmes, ni les données, PDF et archives du dispositif historique. Pour le dépôt principal, l’essai local conserve exactement les fichiers courants mais change les identifiants des commits : les contrats et preuves de publication qui les utilisent doivent faire l’objet d’une transition vérifiée avant toute réécriture distante. Une correspondance d’identifiants seule ne vaut pas preuve d’équivalence des sources installées.
