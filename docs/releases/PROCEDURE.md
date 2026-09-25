# Livraisons regroupées LivePalmes

<!-- description: Procédure réutilisable TEST commun, bilan immuable, publication du code et retour arrière. -->

## Pour Antoine

Demander une évolution dans sa conversation suffit : TEST est la destination par défaut. L’assistant prépare et lance les opérations GitHub nécessaires ; « par défaut » ne signifie pas qu’une simple discussion ou analyse déclenche un déploiement.

Tester la version commune, puis dire ce qui est validé. Quand le regroupement convient : « Prépare la publication des évolutions validées ». Dans Infra, approuver le bilan précis. Aucune manipulation IAM normalement nécessaire pour le périmètre déjà installé ; une fonctionnalité demandant un nouveau service peut nécessiter une préparation supplémentaire.

## Coordination entre conversations

`main` est la version réunie. Chaque conversation relit les consignes actuelles, récupère main, crée une PR et attend la vérification technique. Réconcilier les conflits et les modifications concurrentes avant intégration ; aucune conversation ne remplace main par sa branche. Les aperçus `pr-N` sont isolés. Ils partagent encore les services TEST et ne sont pas des environnements backend complets.

Tenir `EVOLUTIONS.md` à jour. Une validation concerne un commit et les parcours réellement vérifiés. Les tests automatiques ne remplacent pas le retour d’Antoine. Une évolution inachevée déjà intégrée bloque le lot ; ne pas la masquer dans le bilan. Un changement ultérieur nécessite une nouvelle vérification des parcours concernés.

Les conversations n’échangent pas automatiquement leurs messages : le dépôt et ce registre sont la référence commune. Une session avec un checkout ancien doit récupérer les consignes de main avant d’agir.

## Simplification approuvée le 25 septembre 2026

Objectif utilisateur : tester sur TEST, demander la publication dans Infra, recevoir un bilan court, confirmer une seule fois dans GitHub, puis recevoir le résultat. L'assistant gère les références techniques. Les accords explicites restent valables pour leur périmètre ; tout écart ou nouveau risque doit être expliqué.

Le bilan utilise désormais uniquement les preuves GitHub des dernières publications réussies : aucun secret Google, aucune approbation d'environnement et aucun accès Firebase. Il présente des états enregistrés, pas une observation Firebase en temps réel. Après l'unique approbation `production`, le job de publication relit TEST et PROD avant toute écriture. Toute différence bloque la publication ; les contrôles et sauvegardes restent obligatoires. Aucun identifiant de publication n'est déplacé hors de sa protection.

La sélection compare une empreinte du code de chaque export Firebase avec le commit de sa dernière publication prouvée. Une correction isolée d'un export connu peut être publiée seule. Tous les helpers partagés, dépendances, fichiers backend et préparateurs entrent dans l'empreinte commune : leur modification republie largement. Les références croisées entre exports ou le code dynamique imposent également le périmètre large. Le code applicatif n'est jamais exécuté par cette analyse ; Acorn, limité aux outils de vérification, lit sa syntaxe. Les mails/schedulers conservent leur autorisation spécifique.

TEST réutilise les fonctions existantes seulement si son état correspond à une preuve antérieure valide. Sans preuve concordante, il revient à tous les lots ordinaires. Une fois une nouvelle preuve créée, les commits des fonctions inchangées peuvent rester plus anciens que le commit du site : l'équivalence est vérifiée par les empreintes. Les fonctions non sélectionnées sont contrôlées avant publication Hosting.

La sauvegarde et le retour arrière couvrent la sélection réduite ; le contrôle final compare aussi les fonctions conservées. Le contrôle de dérive PROD compare toujours l'inventaire complet. Les demandes de modification de règles/index, de données ou d'envoi réel restent distinctes.

Vérification sans déploiement : `verification_only=true` dans TEST contrôle la sélection et l'équivalence sans publier de fonction ni de page et sans remplacer la preuve TEST. Le bilan `.github/releases/20260925-circuit-check.json` sert à tester le bilan autonome ; son champ `verificationOnly` interdit son utilisation par la publication PROD. Aucun déploiement PROD ne doit être lancé pour tester cette automatisation.

Limite conservée : les artefacts expirent après 14 jours. Si une preuve manque ou expire, arrêter et rétablir une référence vérifiée ; ne pas inventer un état ni utiliser une ancienne publication après une tentative PROD échouée. Une reprise PROD autorisée conserve sa sauvegarde d'origine et son contrôle des révisions ; ne pas lui appliquer une sélection recalculée qui perdrait l'état partiel.

Constat du 25 septembre : TEST environ 23 minutes, bilan automatique moins d'une minute, PROD environ 25 minutes dont 21 minutes de publication Functions ; vérification générale PROD environ 27 secondes. Priorités : nombre d'approbations et périmètre reconstruit. Aucune durée fixe n'est garantie.

## 1. Publier TEST commun

Pour préparer PROD, réutiliser la publication TEST existante si sa preuve est valide et correspond au candidat et à l'état réellement observé. Ne relancer TEST que si nécessaire : nouvelle version, publication incomplète, preuve périmée ou état modifié.

L’assistant lance `livepalmes-test-common.yml` depuis main, avec `production_commit` égal au SHA applicatif actuellement publié. Vérification du SHA main avant publication ; si main a évolué, recommencer sur la version réunie. Workflow sérialisé avec le backend TEST ; aucune annulation forcée d’un déploiement en cours.

Le diff depuis PROD bloque les changements hors périmètre ordinaire. La sélection backend se calcule depuis le dernier TEST prouvé et les empreintes du candidat, puis se contrôle contre Firebase. Une interface seule conserve le backend lorsqu’il correspond encore à sa preuve. Les publications restent par lots de 10, avec contrôle d’état et de commit pour chaque fonction effectivement republiée.

Hosting est publié après le backend. Un artefact `test-proof` contient le commit, la release Hosting et les révisions Functions réellement observées. Il expire après 14 jours : republier TEST si nécessaire. Les règles, index, configuration Firebase et fichiers de données générés sont bloqués par le circuit ordinaire. Prévoir ces changements séparément, avec accord spécifique, puis rétablir une base de publication connue.

Le vieux déclencheur automatique de la branche qualifications et les anciens chemins PROD sont archivés. Les outils spécialisés TEST restent disponibles pour une intervention explicitement définie ; tout usage après la preuve TEST la rend caduque.

## 2. Préparer le bilan

Créer `.github/releases/<identifiant>.json` depuis `example.json` dans une PR. Indiquer : SHA candidat complet, SHA applicatif PROD, version Hosting PROD observée, run TEST commun, chaque évolution, ses fichiers applicatifs exacts et le retour utilisateur authentique. L’exemple est volontairement invalide et ne publie rien.

Le diff Git est recalculé automatiquement. Tout fichier applicatif non couvert ou toute évolution non validée bloque. Pour le backend partagé, documenter l’analyse de dépendance des fonctions email/schedulers exclues : si elles doivent changer, traiter ce périmètre séparément. Les suppressions de Functions ou nouveaux services/variables/secrets non prévus nécessitent également un bilan spécifique.

Lancer `livepalmes-production-preflight.yml` depuis main avec ce chemin. Le workflow vérifie les empreintes SHA-256 des artefacts TEST et de la dernière publication PROD réussie (`release-plan`, `production-after`, `production-hosting-after`). Il reconstruit les révisions et l'origine du code, puis sélectionne les fonctions différentes. Il ne contacte pas Google et ne lance aucune simulation de déploiement. L'identité de la publication PROD source est enregistrée dans `baseline.json`.

Le bilan est l’artefact `release-plan`, identifié par son run, son ID et son SHA-256. Présenter à Antoine le résumé GitHub, les évolutions, les exclusions, la sauvegarde et le retour arrière. L’approbation de ce bilan est requise avant la publication.

## 3. Publier PROD après accord

Lancer `livepalmes-production-release.yml`, `preparation_run=<run approuvé>`, `resume_run=0`, confirmation cochée. La protection de l’environnement GitHub production reste active. Le workflow relit le plan immuable, vérifie le checkout exact, relit TEST puis compare toutes les révisions PROD au bilan avant sauvegarde et publication. Toute dérive bloque. Un bilan `verificationOnly` est refusé avant toute authentification Firebase.

Il sauvegarde le code et les configurations Functions concernés et la référence Hosting active, chiffre puis rouvre la sauvegarde et compare les fichiers. L’artefact doit être conservé avant toute publication. Il prépare les Functions sans secrets email, conserve App Check, simule puis publie par lots de 10. Hosting est publié en dernier, après contrôle des Functions concernées et des exclusions. Cinq fichiers du site sont comparés au commit, les en-têtes et les fichiers interdits sont contrôlés.

Aucune copie TEST→PROD, lecture de documents Firestore, migration, exécution volontaire d’une Function métier, génération de données, règle ou index ne fait partie de ce workflow. Le code des déclencheurs déployés continuera naturellement à répondre aux événements de l’application.

Après réussite, reporter le commit, le run et la version Hosting dans le registre. Les évolutions ajoutées ensuite à TEST ne sont pas incluses. Ne pas utiliser « Re-run jobs » : lancer un nouveau run pour garder des artefacts sans ambiguïté.

## 4. Reprise et retour arrière

Si une publication est interrompue, Hosting reste bloqué tant que les contrôles n’ont pas réussi. Examiner le bilan ; si la reprise est appropriée, lancer le même workflow avec `resume_run=<run interrompu>` et `preparation_run=0`. La sauvegarde d’origine est conservée ; les révisions sont comparées au dernier relevé, jamais remplacées silencieusement par une nouvelle base partielle. Une opération distante encore en cours ou une modification concurrente bloque la reprise et nécessite un nouvel examen.

Pour restaurer le code, utiliser `livepalmes-production-rollback.yml` avec le dernier run de publication/reprise et `restore_hosting` selon que Hosting a été tenté. Les artefacts sont vérifiés par leur ID et leur empreinte. La restauration est une action explicite protégée par l’environnement production ; ce n’est pas une restauration des données. Les nouvelles Functions de la publication sont supprimées seulement dans ce retour arrière explicitement demandé.

Conservation : 14 jours pour les artefacts. Conserver la clé d’origine du compte backend pendant cette durée : elle sert au déchiffrement. Un changement de clé demande de préparer le maintien de l’accès aux sauvegardes. Les sauvegardes ne sont pas des exports de la base.

## Vérification du circuit

Le circuit actuel a réussi de bout en bout le 25 septembre 2026 : TEST 36105695980, bilan 36107672710, PROD 36108577649. Les adaptations futures restent à tester séparément.

`python tests/release-cycle-tests.py`, tests de sauvegarde, tests d’état et vérification globale. Les scénarios locaux simulent les API : ils ne prétendent pas être un déploiement réel. Ne pas publier en PROD pour tester l’automatisation.

## Isolation des identifiants de publication

Les credentials des actions Google sont créés à la racine du workspace GitHub, hors du checkout `candidate` publié. Avant chaque publication Hosting, `check-hosting-payload.js` calcule la liste exacte de fichiers avec la même fonction que Firebase CLI et refuse les fichiers non suivis, les chemins de credentials et les liens sortant du checkout. Les fichiers temporaires ne doivent jamais être copiés dans le contenu Hosting. Les tests utilisent uniquement des valeurs synthétiques.
