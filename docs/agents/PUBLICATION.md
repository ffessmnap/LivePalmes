# Publication LivePalmes — parcours quotidien

<!-- description: Choisir le parcours TEST/PROD actuel, préparer les prérequis et réutiliser les preuves sans modifier les protections. -->

## Choisir le parcours

Lire les consignes du dernier `main`, préserver le dossier partagé et les autres travaux. Les autorisations d’AGENTS.md s’appliquent : une analyse ne modifie rien ; une demande de développement autorise PR, CI, intégration et TEST du besoin, sous réserve de ses accords sensibles. Une modification de l’outillage seule ne déploie pas l’application. Aucun accord de code ne vaut autorisation de données réelles ou d’envoi.

| Changement | Parcours |
| --- | --- |
| Documentation seule | Contrôle documentaire et CI requise ; aucun déploiement ni preflight. |
| Outillage, tests ou workflows seuls | Contrôles du circuit et CI ; aucun déploiement applicatif. |
| Interface ordinaire | Contrôles ciblés ordinateur/mobile, CI puis TEST commun. Hosting seul exige un backend équivalent et prouvé. |
| Sources serveur existantes déjà couvertes | Accord sensible borné, sélection complète calculée, manifeste standard si éligible, sources puis Hosting et contrôle final. |
| Règles, IAM, configuration, droits, données, mails ou autre besoin sensible nouveau | Découverte précoce en lecture seule, écarts présentés et accord spécifique ; parcours fermé au besoin. |

Une retouche visuelle reste ordinaire tant qu’elle ne modifie pas les règles métier, les accès ou les informations accessibles. Les dépendances réelles déterminent les contrôles, pas seulement le nom du fichier.

Les contrôles du candidat et le secours complet du circuit précèdent l’accès aux comptes de publication. La [procédure courante](../releases/PROCEDURE.md#4-publier-prod-après-accord) décrit le raccordement et la récupération des archives.

## Enchaîner sans reconstruire le circuit

**PR → CI → TEST commun → validation utilisateur → bilan complet et candidat prêt → accord Infra → PROD vérifiée.** L’assistant gère les références techniques. Exécution : [PROCEDURE.md](../releases/PROCEDURE.md).

1. Terminer code, tests ciblés, documentation et contrat nécessaire avant la première CI. Après un échec, corriger sa cause et les conséquences proches dans la PR ouverte. Ne pas développer un nouveau circuit pendant une promotion.
2. Vérifier la sélection automatique. Réutiliser les preuves compatibles ; expliquer les replis complets. Un aperçu PR facultatif ne remplace pas le TEST commun intégré sur `main`.
   La CI répartit désormais les tests nécessaires dans des copies isolées ; aucune sélection manuelle ni perte de couverture. Un dossier de préparation bloqué est rouge avec diagnostic conservé, même si son résumé a pu être produit.
3. Dès TEST, assembler le périmètre complet et les prérequis du futur candidat PROD. Recueillir le retour utilisateur authentique ; la CI ne le remplace pas. Une modification ultérieure invalide les parcours touchés.
4. Figer le candidat, traiter les blocages et présenter le bilan dans Infra. « Prêt PROD » signifie : périmètre complet couvert, validations et accords sensibles acquis, preuve TEST recevable, preflight et prérequis adaptés réussis. L’accord explicite d’Antoine autorise ce périmètre ; ne pas le redemander s’il est déjà acquis et ses conditions remplies.
5. Publier une fois, après protections GitHub, dérive fraîche et sauvegarde vérifiée. Confirmer le déploiement, les contrôles finaux et les limites de la validation. Une attente de runner ou de permissions n’est pas du temps de publication.

## Réutiliser et reprendre

| Situation | Action |
| --- | --- |
| Run en cours | Attendre ce run ; pas de doublon ni d’annulation injustifiée. |
| Preuve exacte compatible | Réutiliser ; absence, expiration, altération ou incompatibilité impose le contrôle concerné. |
| Nouveau besoin sensible ou prérequis incertain | Découverte ciblée avant de fermer le contrat et d’annoncer « prêt ». Aucun droit ajouté automatiquement. |
| TEST déjà publié et validé | Réutiliser sa preuve pour PROD ; ne pas republier pour aligner les SHA de fonctions et Hosting. |
| Interruption ou réduction de contexte | Relire le point de reprise unique et les opérations distantes avant toute action. Ne pas reprendre un ancien objectif. |

Le point de reprise rassemble objectif, candidat applicatif, outillage, preuves, accords, phase, opérations en cours, blocage et prochaine action. L’assembleur fournit `delivery-state.json` ; l’assistant maintient ce même point après chaque transition et indique les sources. Le registre décrit le résultat, sans devenir une seconde file d’exécution.

## Mails et périmètre courant

Décision d’Antoine dans Infra du 21 novembre 2026 : l’état actif/inactif des mails automatiques ne conditionne plus une nouvelle publication, quel que soit le changement. Ne pas lire `notificationDelivery`, les modèles de mails, la file ou le planificateur pour établir un témoin de publication. Ne pas activer/désactiver les mails à cette occasion. Les tests fonctionnels de messagerie sur fixtures restent requis lorsque le code correspondant change.

Le parcours courant de sources existantes utilise `standardSources.schema: 2` en PROD et le manifeste standard TEST de schéma 2. Il ne demande ni `controlsRun`, ni artefact `production-idf-preservation`, y compris en reprise. Les contrats de schéma 1 et contrats nommés restent bornés à leurs anciennes versions pour relire leurs preuves et retours arrière ; ne pas les élargir ni les choisir pour une nouvelle évolution. Un futur besoin sensible conserve son accord propre, sans réintroduire un contrôle opérationnel des mails par défaut.

Présenter le périmètre calculé (sources modifiées, ressources conservées, éventuelle opération sensible séparée). Les anciennes listes Paris/CNHC/Basile ou autres exceptions de lots ne constituent pas de nouvelles étapes. Une publication de code n’autorise toujours pas des modifications de données, migrations ou envois réels.

## Protections et clôture

Conserver synthèse CI obligatoire, preuves backend, sélection calculée sans réduction manuelle, exclusions, contrôle des identités et droits, dérive fraîche, sauvegarde chiffrée rouverte/comparée, environnement `production` limité à `main` et contrôles finaux. Pas de copie TEST vers PROD. Règles/index, migrations, données sportives, Storage, mails et schedulers conservent leurs accords et parcours propres.

Ne supprimer un contrôle qu’après preuve d’obsolescence ou de redondance ; rendre conditionnel un contrôle dont l’absence de dépendance est démontrée. Un nom historique ne prouve pas son inutilité. La sélection reste automatique et le doute conserve le contrôle. Les journaux doivent nommer la protection actuelle, expliquer exécution/réutilisation/refus et laisser les détails techniques consultables.

Mesurer demande → résultat vérifié, avec code prêt, TEST vérifié, candidat prêt, accord PROD, publication et clôture séparés. Annoter travail, attentes et reprises ; ne jamais additionner des jobs parallèles. Regrouper le suivi documentaire après fusion, sans déploiement pour cette clôture seule.

Les [références historiques](PUBLICATION_HISTORIQUE.md), [contrats et reprises spécifiques](../releases/CONTRATS_ET_REPRISES.md) et le [registre](../releases/EVOLUTIONS.md) restent consultables. Ils n’autorisent aucune nouvelle version, permission ou opération réelle.

L’obligation MFA est reportée par Antoine. Le retour TEST facultatif utilise le lot fermé `admin_mfa_optional` du writer de sources existant, puis TEST commun Hosting seul après preuve des111sources ; Rules facultatives déjà distantes et index inchangés. Aucun lancement du contrat obligatoire ni promotion PROD. [Accord, contrôles et état](../audit-a3-mfa-obligation.md).

App Check en observation : `approved_app_check_csp=true` dans TEST commun, manuel Hosting seul, aucun autre accord ni suivi automatique. Paire CSP portail complète et arbre backend facultatif figés ; CI et sélection vide prouvée obligatoires. Aucun enforcement, Rules ou exception PROD. [Accord, fournisseur et limites](../audit-a3-acces-publics.md#app-check-en-observation--préparation-du-18-novembre-2026).

Le lot PROD facultatif `optionalAccessObservationRelease` reste distinct des anciens contrats MFA : candidat TEST figé, sélection complète des sources existantes et App Check en observation. Il conserve les Rules PROD observées, sans writer de règles ni obligation MFA. Préflight/prérequis, sauvegarde vérifiée et contrôles frais restent obligatoires ; aucune reprise automatique. [Périmètre et preuves](../audit-a3-acces-publics.md#contrat-prod-facultatif--préparation-du-18-novembre-2026).

Après l’arrêt du run facultatif `44405688714`, ne pas relancer les110sources ni utiliser la reprise générique. Le complément fermé `optional_access_completion` conserve le même candidat TEST, la sélection et la sauvegarde initiales ; seuls de nouveaux contrôles officiels puis Hosting sont autorisés. L’échec initial reste tracé, les Rules et configurations sont conservées. [Procédure et preuves](../audit-a3-acces-publics.md#complément-hosting-après-larrêt-du-18-novembre-2026).

La qualification complémentaire `a3-private-storage-acl.yml` est une observation manuelle de métadonnées, pas une livraison : CI main exacte avant le seul lecteur Hosting existant, dix GET bornés, aucun contenu, jeton documentaire ou droit ajouté. L’ancien lecteur A2 reste intact ; un refus de permissions reste un échec explicite. [Périmètre et limites](../audit-a3-acces-publics.md#acl-privées--qualification-complémentaire-préparée-le-19-novembre-2026).

`a3-production-wif-qualification.yml` prépare exclusivement un contrôle manuel des deux identités existantes, après CI main exacte. Nouveau fournisseur et deux liens précis exigent leur accord d’installation séparé ; aucun workflow de publication ni lecteur historique n’est converti par cette préparation. Le contrôle conserve le type ADC externe, qualifie les consommateurs verrouillés/renouvellements et ne publie rien. [Plan, budgets et limites](../audit-a3-identifiants-github.md#consommateurs-de-publication--qualification-séparée-préparée-le-19-novembre-2026).

A5 : `a5Retirement` ferme le manifeste TEST aux cinq sources historiques et `approved_a5_retirement=true` réserve TEST commun au retrait exact, manuel Hosting seul après sources attestées. Les seuls prédicats et secrets historiques changent ; aucun index ni donnée. Aucun de ces marqueurs ne vaut contrat PROD ou autorisation IAM. [Périmètre et état](../audit-a5-retrait-ancien-direct.md).

Le contrat PROD `a5RetirementRelease` demeure séparé du raccord TEST : cinq sources/labels existantes, delta Rules dérivé de la base PROD réellement observée, retrait Hosting exact, aucune donnée ou permission ajoutée. Le workflow officiel conserve prérequis, dérive et sauvegarde vérifiée. Le nettoyage réel manuel A5 a son propre accord, sa sauvegarde temporaire et son contrôle A2 complet ; il ne relève pas du déploiement de code. [Contrat et preuves](../audit-a5-retrait-ancien-direct.md#préparation-prod-fermée).

Après l’arrêt A5 `44554846479`, les cinq sources sont déjà attestées : seul le complément scellé de ce run exact autorise une finition Rules/Hosting avec zéro nouvelle source, sauvegarde originale et contrôles frais. Toute autre reprise A5 reste refusée. [Examen et limites](../audit-a5-retrait-ancien-direct.md#finition-prod-après-les-cinq-sources-attestées).
