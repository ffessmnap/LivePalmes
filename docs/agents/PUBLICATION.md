# Publication et déploiement LivePalmes

<!-- description: Procédure et autorisations requises pour Git, GitHub, Firebase, Storage, migrations et mise en ligne. -->

## Principe commun aux conversations

Une demande de développement autorise par défaut le travail et sa mise à disposition sur TEST, avec commit/PR et intégration après contrôles. Antoine n’a pas à répéter « sur TEST ». Une demande d’analyse ne vaut pas demande de développement. Les validations sensibles restent applicables : une demande explicite précise peut déjà constituer cette validation ; ne pas la redemander inutilement.

Toutes les évolutions sont réunies sur `main`. Le site TEST commun reçoit seulement un commit exact intégré sur `main`, par le workflow `livepalmes-test-common.yml`. Les PR utilisent des canaux d’aperçu distincts ; elles ne remplacent jamais le site TEST commun.

Le registre `docs/releases/EVOLUTIONS.md` est tenu par l’assistant. Une validation utilisateur est associée à une version testée et un retour daté. Un changement de code nécessite de revérifier les parcours affectés. Aucun bot ne peut déduire un accord d’un simple test automatique réussi.

La publication PROD est regroupée dans la conversation Infra. Présenter le bilan, les travaux inachevés, la version exacte et le retour arrière avant l’accord. Exécuter ensuite uniquement cette version, même si TEST évolue. Voir `docs/releases/PROCEDURE.md` pour les workflows réutilisables.

Une opération sur les données, une migration, un envoi réel, les règles ou les index exigent un périmètre et une autorisation spécifiques ; ils sont exclus du circuit ordinaire.

## Avant publication

1. Confirmer précisément le périmètre validé par l’utilisateur.
2. Préserver et distinguer les autres changements déjà présents dans le dossier partagé.
3. Exécuter `node tools/verify-livepalmes.js` et les tests ciblés nécessaires.
4. Pour un parcours navigateur pertinent, exécuter `node tools/verify-livepalmes.js --browser`.
5. Effectuer les contrôles manuels applicables décrits dans `docs/TESTS_MANUELS.md`.
6. Signaler toute commande susceptible de contacter la production ou d’écrire des données réelles avant son lancement.

## Publication

### Circuit réutilisable

- PR : vérification technique et aperçu isolé `pr-N` sur Firebase TEST.
- `livepalmes-test-common.yml` : publication du commit main regroupé sur TEST, traitements nécessaires puis Hosting, preuve de version conservée.
- `livepalmes-production-preflight.yml` : bilan en lecture seule du candidat validé et des versions réellement observées.
- `livepalmes-production-release.yml` : publication du bilan approuvé, sauvegarde vérifiée, lots bornés, contrôles puis Hosting ; `resume_run` conserve la sauvegarde initiale si une reprise est nécessaire.
- `livepalmes-production-rollback.yml` : restauration explicite du code sauvegardé et de la release Hosting précédente.

Les anciens workflows `livepalmes-production.yml` et `livepalmes-production-resume.yml` sont archivés et ne publient plus. Les consignes et champs exacts sont dans `docs/releases/PROCEDURE.md`.

### Ordre Firebase pour le portail

Apres reauthentification explicite de la CLI et nouvelle validation utilisateur du deploiement :

1. executer le dry-run des index et Functions ;
2. si des index sont nécessaires, arrêter le circuit ordinaire et préparer leur déploiement séparé explicitement autorisé ;
3. deployer uniquement les Functions portail modifiees ;
4. executer les tests manuels avec les index actifs ;
5. deployer Hosting en dernier, puis controler les en-tetes CSP/cache et l'absence de `performances/public/data/admin-reference.js` en ligne.

Le deploiement Hosting publie le contenu du dossier, pas uniquement les fichiers stages dans Git. Si le dossier principal contient d'autres modifications, il faut faire valider l'ensemble de cette release ou preparer un checkout propre contenant exactement le perimetre autorise avant de lancer Hosting.

Un deploiement Hosting ordinaire ne synchronise plus automatiquement les donnees et ne lit pas Firestore. Lorsqu'une publication doit aussi actualiser le secours Records / MPF ou le referentiel clubs, obtenir la validation explicite de cette lecture et de ces ecritures generees, puis executer avant les verifications et le deploiement :

```powershell
node tools/prepare-hosting-data.js --write
```

Controler ensuite le diff des fichiers generes. Ne pas utiliser cette preparation pour une simple correction HTML, CSS ou JavaScript sans changement de donnees.

Sécuriser dans Git uniquement les fichiers du périmètre validé, puis pousser et déployer uniquement ce périmètre. Ne pas mélanger les changements utilisateur sans rapport. Après publication, vérifier le résultat en ligne et remettre le dossier principal sur le dernier `main` seulement si cela ne détruit aucun changement local ; nettoyer les worktrees temporaires devenus inutiles.

Préserver les paramètres de cache et les rewrites de `firebase.json` sauf validation explicite d’une modification de configuration.
