# Retrait de l’ancien Direct — A5

<!-- description: Accord de retrait complet de l’ancien Direct, préparation de l’inventaire borné et conservation des composants du nouveau Direct. -->

## Accord et limites

Le 19 novembre 2026, Antoine autorise le retrait A5 jusqu’en PROD après réussite des contrôles TEST. Les anciennes consoles ne seront plus utilisées. Il demande ensuite de supprimer aussi les anciennes pages de consultation, sans redirection, et les PDF archivés des compétitions de cet ancien dispositif. Aucun nouvel archivage n’est demandé. Les données et documents du nouveau Direct et du calendrier NAP restent hors nettoyage.

L’accord porte sur l’ancien dispositif national : pilotage, six consoles générées, séries, résultats, médailles et trois visionneuses historiques. Les lecteurs d’import et composants de rendu consommés par le nouveau Direct restent conservés. La référence de travail est le dépôt hors OneDrive.

## Inventaire préalable

La session Google locale a expiré. Le workflow manuel `a5-legacy-direct-inventory.yml` utilise donc l’identité de sauvegarde existante, après authentification de la CI main. Aucun nouveau droit, donnée modifiée ou PDF téléchargé. Budget : 24 requêtes au plus, 400 métadonnées d’archives au plus et 8 000 métadonnées de versions Storage au plus ; aucun appel NAP. Toute pagination non terminée ou réponse hors périmètre bloque.

Les seules cibles découvertes sont les dossiers `competitions/livepalmes-active` et `competitions/livepalmes-test` des deux projets Firebase, et leurs préfixes `competition-pdfs/{identifiant}/` dans les deux buckets existants de chaque environnement. Les métadonnées d’archives sont limitées à la compétition, la date technique et le compteur ; aucune identité de nageur ni contenu de PDF n’est exporté. L’inventaire privé sert à qualifier les cibles ; sa seule production ne prouve aucune suppression.

## État

Préparation de l’inventaire en cours. Retrait applicatif, nettoyage, TEST et PROD non réalisés. Les liens, identifiants, fonctions installées, règles et sauvegardes seront vérifiés avant leurs opérations respectives. Le retrait des visionneuses ne ferme A4 sur ce périmètre qu’après preuve d’absence de leurs URL et scripts publiés ; le lecteur PDF d’import du nouveau Direct reste distinct.
