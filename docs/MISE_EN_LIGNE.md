# Mise en ligne de LivePalmes

<!-- description: Guide simple du circuit de verification, apercu et mise en ligne de LivePalmes depuis GitHub. -->

## Le principe

Une modification ne passe plus directement de l'ordinateur au site public. Elle suit trois etapes :

1. GitHub controle automatiquement que LivePalmes fonctionne toujours.
2. GitHub fournit un lien temporaire pour voir et tester la modification.
3. Apres validation humaine, une action manuelle publie uniquement le site statique.

Le lien temporaire est public pour toute personne qui le connait et il utilise le backend Firebase reel. Il ne doit donc servir qu'a des essais prudents, sans saisie de donnees sensibles ni modification de donnees officielles.

## Parcours quotidien

1. La modification est enregistree dans une branche Git et proposee pour integration dans `main`.
2. Attendre que le controle **Verification technique** soit vert.
3. Ouvrir le lien de test ajoute a la proposition de modification.
4. Tester les pages concernees sur ordinateur et telephone.
5. Apres validation, integrer la modification dans `main`.
6. Dans GitHub, ouvrir **Actions**, choisir **Mise en ligne LivePalmes**, puis **Run workflow**.
7. Cocher la confirmation demandee et valider la mise en ligne.
8. Approuver l'environnement `production` lorsque GitHub le demande.
9. Controler le site public une fois l'action terminee.

Cette action ne publie que Firebase Hosting. Elle ne deploie ni les Functions, ni les regles ou index Firestore, ni les donnees de performances, Records, MPF, resultats ou archives.

## Activation initiale par un administrateur

Le circuit reste inactif tant que sa cle Firebase n'est pas configuree dans GitHub.

1. Creer dans GitHub le secret Actions `FIREBASE_SERVICE_ACCOUNT_LIVEPALMES` avec un compte de service limite au deploiement Firebase Hosting.
2. Creer la variable Actions `FIREBASE_PREVIEW_ENABLED` avec la valeur `true`.
3. Creer l'environnement GitHub `production` et lui affecter au moins une personne habilitee a approuver les mises en ligne.
4. Creer seulement ensuite la variable Actions `FIREBASE_PRODUCTION_ENABLED` avec la valeur `true`.
5. Proteger `main` en exigeant la reussite du controle **Verification technique** avant integration.

Cette activation modifie les acces GitHub et Firebase. Elle doit etre effectuee separement, avec l'autorisation explicite du responsable LivePalmes, et sans lancer de deploiement pendant sa configuration.

## En cas de probleme

Si la verification est rouge, ne pas publier et consulter l'etape en erreur dans GitHub Actions.

Si un probleme est decouvert apres publication, Firebase Hosting permet de remettre en service une version precedente depuis l'historique des versions de la console Firebase.
