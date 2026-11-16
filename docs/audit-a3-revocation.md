# Audit A3.3 — contrôles actuels des droits

<!-- description: Périmètre A3.3 autorisé jusqu’à TEST, contrôles serveur des profils actifs, budget de lecture et vérifications fictives. -->

## Périmètre

Préparation, tests et livraison TEST autorisés le 16 novembre 2026. Les opérations privées concernées vérifient le profil actif et ses capacités actuelles avant leurs effets métier. Les règles métier de capacités et de périmètres sont conservées. Une identité administrative de transition ne dispense plus du profil actif et de son droit administratif actuel.

La vérification est mutualisée pour le seul objet de requête serveur, sa base et son identité. Aucune autorisation n’est conservée entre deux appels. Une lecture indisponible refuse l’opération ; elle ne réutilise pas les droits du jeton. Les consommateurs asynchrones attendent le contrôle avant d’accéder aux services métier.

Le nouveau Direct conserve son lecteur de profil existant. Cette livraison ne change ni les règles Firestore/Storage des accès directs historiques, ni leur retrait prévu, ni les données et archives associées. Elle n’active pas de session PROD, MFA ou App Check, ne tourne pas les clés et ne modifie pas A2. La PROD nécessite son propre bilan et accord Infra.

## Budget

Un appel concerné lit au plus un profil `users/{uid}` par base et identité : lecture ponctuelle, sans liste ni scan. Les contrôles simultanés et successifs de ce même appel partagent cette lecture. Le coût ne dépend pas du nombre de lignes métier. Les contextes qui lisaient déjà le profil réutilisent cette lecture ; les anciens chemins sans lecture ajoutent un document. Aucun SELECT NAP, listener, écriture métier ou collection n’est ajouté. La mise à jour technique existante de dernière connexion reste distincte.

## Vérifications et limites

Les fixtures vérifient le compte absent ou désactivé, le retrait d’une capacité, les jetons anciens, l’identité administrative de transition, l’échec de lecture, la mutualisation, l’isolation entre appels et l’attente avant tout effet métier. Les refus et scénarios métier existants sont conservés. La sélection de publication doit être calculée sur les fonctions réellement installées, sans suppression manuelle de consommateur.

La recette utilise uniquement des services fictifs. Aucune désactivation réelle, modification de compte, publication sportive, écriture NAP ou envoi de mail ne fait partie des tests de l’agent. Une opération déjà autorisée et engagée conserve sa durée normale ; cette vérification ne constitue pas une annulation transactionnelle de tous les travaux en cours. Les règles directes historiques restent un périmètre distinct et ne doivent pas être déclarées corrigées par ce seul code serveur.
