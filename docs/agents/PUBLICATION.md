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

Sécuriser dans Git uniquement les fichiers du périmètre validé, puis pousser et déployer uniquement ce périmètre. Ne pas mélanger les changements utilisateur sans rapport. Après publication, vérifier le résultat en ligne et remettre le dossier principal sur le dernier `main` seulement si cela ne détruit aucun changement local ; nettoyer les worktrees temporaires devenus inutiles.

Préserver les paramètres de cache et les rewrites de `firebase.json` sauf validation explicite d’une modification de configuration.
