# Protection des données publiques

<!-- description: Contrat des réponses publiques avec année de naissance seule, identités opaques, compatibilité privée et budget de lectures inchangé. -->

Le lot A1 est suivi dans [le chantier #892](https://github.com/ffessmnap/LivePalmes/issues/892), rattaché au [plan #891](https://github.com/ffessmnap/LivePalmes/issues/891). La préparation du 15 novembre 2026 couvre le code courant et les réponses publiques ; elle ne constitue pas une purge de l’historique Git ni un déploiement PROD.

## Réponses publiques

Le lecteur HTTP public applique `nap-public-privacy.js` à ses réponses sportives, après les calculs et sélections existants. Recherche, fiche, TOP, résultats et Records/MPF utilisent la même projection. Le champ de compatibilité `birthDate` contient seulement l’année ; `birthYear` porte également l’année. Jour, mois et âge civil exact ne sont pas publiés par ce contrat. Les dates des compétitions et performances restent complètes.

Les identités publiques sont opaques et stables à clé serveur constante. Elles ne sont pas un simple hash public de la date. Les URL canoniques utilisent toujours les identifiants des nageurs. Les rapprochements de la fiche avec les Records conservent les comparaisons exactes et les anciens cas de référence par année au moyen de clés opaques. Deux homonymes d’une même année ne sont pas confondus par une égalité d’années ajoutée côté navigateur.

La transformation crée une réponse distincte : les lecteurs internes, données privées, sélections et calculs sportifs gardent leurs entrées complètes. Aucun schéma NAP, donnée réelle, droit, règle, PIN, mécanisme Storage, import ou scheduler n’est modifié. Le nouveau Direct publie déjà son année de naissance dans son propre modèle ; les usages privés et historiques ne sont pas remplacés par cette projection.

## Budget et vérification

Budget supplémentaire, ouverture, action, rafraîchissement et pire cas : zéro requête SQL, zéro ligne NAP parcourue supplémentaire, zéro document Firestore, zéro listener et zéro écriture. La projection travaille seulement sur la réponse déjà bornée. Les plafonds des lecteurs restent inchangés. Le calcul en mémoire est proportionnel à cette réponse, avec une copie des champs et des empreintes des identités ; aucun cache de données nominatives n’est ajouté.

Les tests hors réseau couvrent les callbacks HTTP publics, les champs imbriqués et clés dérivées, la conservation des dates sportives et des données privées, ainsi que l’affichage de l’année et les rapprochements Records. Les contrôles ordinateur/mobile et CI du candidat complètent cette preuve avant TEST. Le registre des évolutions précise séparément préparation, contrôles, déploiement et validation utilisateur.

## Copies et historique

Le référentiel nominatif public devenu inutile est retiré du code courant et empêché de revenir par une exclusion Git et un contrôle existant de retrait des copies. Les exclusions Hosting déjà en place restent conservées. Les anciens outils nominatifs sans consommateur actif sont retirés ; aucune opération de correction de données n’est exécutée.

Le sous-lot historique conserve son inventaire local et ses preuves distinctes. Retirer le fichier courant ne retire pas les commits, branches, PR, artefacts ou copies externes associés. La préparation et l’essai de purge se font sur copie isolée ; la publication d’un historique réécrit nécessite le bilan des conséquences et l’accord spécifique avant son exécution.
