# Livraisons regroupées LivePalmes

<!-- description: Procédure réutilisable TEST commun, bilan immuable, publication du code et retour arrière. -->

## Pour Antoine

Demander une évolution dans sa conversation suffit : TEST est la destination par défaut. L’assistant prépare et lance les opérations GitHub nécessaires ; « par défaut » ne signifie pas qu’une simple discussion ou analyse déclenche un déploiement.

Tester la version commune, puis dire ce qui est validé. Quand le regroupement convient : « Prépare la publication des évolutions validées ». Dans Infra, approuver le bilan précis. Aucune manipulation IAM normalement nécessaire pour le périmètre déjà installé ; une fonctionnalité demandant un nouveau service peut nécessiter une préparation supplémentaire.

## Coordination entre conversations

`main` est la version réunie. Chaque conversation relit les consignes actuelles, récupère main, crée une PR et attend la vérification technique. Réconcilier les conflits et les modifications concurrentes avant intégration ; aucune conversation ne remplace main par sa branche. Les aperçus `pr-N` sont isolés. Ils partagent encore les services TEST et ne sont pas des environnements backend complets.

Tenir `EVOLUTIONS.md` à jour. Une validation concerne un commit et les parcours réellement vérifiés. Les tests automatiques ne remplacent pas le retour d’Antoine. Une évolution inachevée déjà intégrée bloque le lot ; ne pas la masquer dans le bilan. Un changement ultérieur nécessite une nouvelle vérification des parcours concernés.

Les conversations n’échangent pas automatiquement leurs messages : le dépôt et ce registre sont la référence commune. Une session avec un checkout ancien doit récupérer les consignes de main avant d’agir.

## 1. Publier TEST commun

L’assistant lance `livepalmes-test-common.yml` depuis main, avec `production_commit` égal au SHA applicatif actuellement publié. Vérification du SHA main avant publication ; si main a évolué, recommencer sur la version réunie. Workflow sérialisé avec le backend TEST ; aucune annulation forcée d’un déploiement en cours.

Le diff depuis PROD détermine si des Functions doivent être publiées. Un changement du backend partagé sélectionne de façon conservatrice tous les exports des lots ordinaires, hors email/schedulers. Lots de 10, cadence limitée et contrôle d’état et de l’étiquette de commit après chacun. Une simple évolution d’interface ne publie pas les Functions.

Hosting est publié après le backend. Un artefact `test-proof` contient le commit, la release Hosting et les révisions Functions réellement observées. Il expire après 14 jours : republier TEST si nécessaire. Les règles, index, configuration Firebase et fichiers de données générés sont bloqués par le circuit ordinaire. Prévoir ces changements séparément, avec accord spécifique, puis rétablir une base de publication connue.

Le vieux déclencheur automatique de la branche qualifications et les anciens chemins PROD sont archivés. Les outils spécialisés TEST restent disponibles pour une intervention explicitement définie ; tout usage après la preuve TEST la rend caduque.

## 2. Préparer le bilan

Créer `.github/releases/<identifiant>.json` depuis `example.json` dans une PR. Indiquer : SHA candidat complet, SHA applicatif PROD, version Hosting PROD observée, run TEST commun, chaque évolution, ses fichiers applicatifs exacts et le retour utilisateur authentique. L’exemple est volontairement invalide et ne publie rien.

Le diff Git est recalculé automatiquement. Tout fichier applicatif non couvert ou toute évolution non validée bloque. Pour le backend partagé, documenter l’analyse de dépendance des fonctions email/schedulers exclues : si elles doivent changer, traiter ce périmètre séparément. Les suppressions de Functions ou nouveaux services/variables/secrets non prévus nécessitent également un bilan spécifique.

Lancer `livepalmes-production-preflight.yml` depuis main avec ce chemin. Le workflow lit les preuves GitHub et les métadonnées TEST/PROD ; il ne lance aucun `firebase deploy`, même en dry-run, car la CLI peut activer des API pendant une simulation. TEST doit encore correspondre exactement à sa preuve. Le commit PROD est rapproché du message de release Hosting ; l’unique point de départ historique reconnu est la publication 995ec702 / 61bbdb3230029827 du 20 septembre.

Le bilan est l’artefact `release-plan`, identifié par son run, son ID et son SHA-256. Présenter à Antoine le résumé GitHub, les évolutions, les exclusions, la sauvegarde et le retour arrière. L’approbation de ce bilan est requise avant la publication.

## 3. Publier PROD après accord

Lancer `livepalmes-production-release.yml`, `preparation_run=<run approuvé>`, `resume_run=0`, confirmation cochée. La protection de l’environnement GitHub production reste active. Le workflow relit le plan immuable, vérifie le checkout exact, compare toutes les révisions PROD au bilan et bloque toute dérive.

Il sauvegarde le code et les configurations Functions concernés et la référence Hosting active, chiffre puis rouvre la sauvegarde et compare les fichiers. L’artefact doit être conservé avant toute publication. Il prépare les Functions sans secrets email, conserve App Check, simule puis publie par lots de 10. Hosting est publié en dernier, après contrôle des Functions concernées et des exclusions. Cinq fichiers du site sont comparés au commit, les en-têtes et les fichiers interdits sont contrôlés.

Aucune copie TEST→PROD, lecture de documents Firestore, migration, exécution volontaire d’une Function métier, génération de données, règle ou index ne fait partie de ce workflow. Le code des déclencheurs déployés continuera naturellement à répondre aux événements de l’application.

Après réussite, reporter le commit, le run et la version Hosting dans le registre. Les évolutions ajoutées ensuite à TEST ne sont pas incluses. Ne pas utiliser « Re-run jobs » : lancer un nouveau run pour garder des artefacts sans ambiguïté.

## 4. Reprise et retour arrière

Si une publication est interrompue, Hosting reste bloqué tant que les contrôles n’ont pas réussi. Examiner le bilan ; si la reprise est appropriée, lancer le même workflow avec `resume_run=<run interrompu>` et `preparation_run=0`. La sauvegarde d’origine est conservée ; les révisions sont comparées au dernier relevé, jamais remplacées silencieusement par une nouvelle base partielle. Une opération distante encore en cours ou une modification concurrente bloque la reprise et nécessite un nouvel examen.

Pour restaurer le code, utiliser `livepalmes-production-rollback.yml` avec le dernier run de publication/reprise et `restore_hosting` selon que Hosting a été tenté. Les artefacts sont vérifiés par leur ID et leur empreinte. La restauration est une action explicite protégée par l’environnement production ; ce n’est pas une restauration des données. Les nouvelles Functions de la publication sont supprimées seulement dans ce retour arrière explicitement demandé.

Conservation : 14 jours pour les artefacts. Conserver la clé d’origine du compte backend pendant cette durée : elle sert au déchiffrement. Un changement de clé demande de préparer le maintien de l’accès aux sauvegardes. Les sauvegardes ne sont pas des exports de la base.

## Vérification du circuit

`python tests/release-cycle-tests.py`, tests de sauvegarde, tests d’état et vérification globale. Les scénarios locaux simulent les API : ils ne prétendent pas être un déploiement réel. La première utilisation sur une prochaine évolution validera les accès et la publication TEST de bout en bout. Ne pas publier en PROD pour tester l’automatisation.
