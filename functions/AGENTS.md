# AGENTS.md — Backend LivePalmes

## Périmètre

Ces règles complètent le fichier racine pour toute intervention dans `functions/`. Les Cloud Functions, la configuration Firebase, les règles Firestore, l’authentification, les variables d’environnement et les structures de données sont des zones sensibles : obtenir une validation explicite avant de les modifier.

## Principes backend

- Conserver Node.js 20 et l’architecture existante des fonctions.
- Étendre les fonctions et utilitaires présents avant de créer un nouveau service ou modèle.
- Ne pas ajouter de dépendance sans justification et sans vérifier son impact sur le déploiement.
- Ne jamais exposer de secret, jeton, PIN ou donnée personnelle dans le code, les logs ou les réponses.
- Ne pas modifier les capacités du portail ou les droits sans validation métier explicite.
- Ne pas lancer de migration, écriture de données officielles, publication Storage ou déploiement Firebase sans demande explicite.

## Firestore et montée en charge

Toute requête doit être indexable et bornée. Estimer le nombre de lectures et écritures par appel. Éviter les scans complets, lectures N+1, une lecture par élément retourné et les listeners multiples. Utiliser les agrégats, caches, traitements paginés et pipelines existants lorsque le volume peut croître.

Avant toute nouvelle collection ou évolution de schéma, vérifier si les structures existantes couvrent le besoin et expliquer la nécessité du changement.

## Vérification

Analyser les scripts et tests existants avant modification. Depuis la racine, lancer la vérification globale et les tests ciblés correspondant à la fonction modifiée. Consulter les sections pertinentes de `docs/TESTS_MANUELS.md` pour Firebase, les droits, les imports, les PDF ou les données métier.

`npm install` dans `functions/` ne doit être lancé que si les dépendances doivent réellement être installées ou mises à jour. Signaler avant tout test susceptible de contacter la production ou d’écrire des données réelles.
