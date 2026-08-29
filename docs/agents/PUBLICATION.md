# Publication et déploiement LivePalmes

<!-- description: Procédure et autorisations requises pour Git, GitHub, Firebase, Storage, migrations et mise en ligne. -->

## Principe

Pendant la mise au point, travailler directement dans le dossier principal partagé et laisser les changements en local pour que l’utilisateur puisse les tester. Ne pas créer de worktree sauf nécessité technique ou risque particulier expliqué préalablement.

Aucune demande d’analyse, de diagnostic ou de vérification n’autorise une publication. Une demande explicite est obligatoire avant chacune des opérations suivantes :

- création de commit, push ou pull request ;
- déploiement Firebase ;
- publication vers Firebase Storage ;
- migration ou correction des données officielles ;
- génération suivie de publication des performances, Records ou MPF ;
- publication des archives ou résultats.

## Avant publication

1. Confirmer précisément le périmètre validé par l’utilisateur.
2. Préserver et distinguer les autres changements déjà présents dans le dossier partagé.
3. Exécuter `node tools/verify-livepalmes.js` et les tests ciblés nécessaires.
4. Pour un parcours navigateur pertinent, exécuter `node tools/verify-livepalmes.js --browser`.
5. Effectuer les contrôles manuels applicables décrits dans `docs/TESTS_MANUELS.md`.
6. Signaler toute commande susceptible de contacter la production ou d’écrire des données réelles avant son lancement.

## Publication

### Circuit GitHub pour Firebase Hosting

Les workflows `.github/workflows/livepalmes-verification-preview.yml` et `.github/workflows/livepalmes-production.yml` securisent la publication du site statique :

1. chaque proposition vers `main` execute `node tools/verify-livepalmes.js` ;
2. lorsque `FIREBASE_PREVIEW_ENABLED` vaut `true`, une URL Firebase Hosting temporaire est creee apres reussite des controles ;
3. la production reste un lancement manuel depuis `main`, protege par l'environnement GitHub `production`, et exige le numero de la proposition validee ;
4. le workflow recupere exactement le commit ayant produit l'apercu, controle ses checks et l'exclusion des donnees internes, puis relance la verification avant de deployer uniquement Hosting.

Ces workflows n'autorisent aucun deploiement de Functions, regles, index, Storage ou donnees metier. Leur activation initiale exige un secret GitHub `FIREBASE_SERVICE_ACCOUNT_LIVEPALMES` limite a Hosting, les variables d'activation `FIREBASE_PREVIEW_ENABLED` et `FIREBASE_PRODUCTION_ENABLED`, une approbation explicite et la configuration decrite dans `docs/MISE_EN_LIGNE.md`.

### Ordre Firebase pour le portail

Apres reauthentification explicite de la CLI et nouvelle validation utilisateur du deploiement :

1. executer le dry-run des index et Functions ;
2. deployer les index Firestore et attendre leur etat pret ;
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
