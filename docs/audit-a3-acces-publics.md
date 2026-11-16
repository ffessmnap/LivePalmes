# Audit A3.2 — demandes de compte et annuaire public

<!-- description: Périmètre autorisé A3.2, budgets de lecture, contrôles fictifs et contrat TEST limité aux accès publics du portail. -->

## Périmètre et limites

Accord explicite du 16 novembre 2026 : préparation, tests fictifs et livraison TEST. Noms et prénoms acceptent les alphabets internationaux, accents, apostrophes, initiales et traits d’union ; les liens évidents, adresses électroniques, balises, caractères de contrôle et valeurs excessives sont refusés. La limite existante de huit demandes par heure et quinze secondes entre envois s’applique à l’adresse destinataire et au compte connecté. Le compteur anonyme existant reste un complément ; son en-tête réseau ne constitue pas une identité fiable. Les identifiants des compteurs sont hachés, avec des espaces de noms distincts pour éviter les collisions entre types d’identité.

Le contrôle des noms est partagé avec la validation administrative. Cette dépendance impose de livrer aussi `resolveEngagementAccessRequest`, sans changer ses droits, ses options de capacité ou lui appliquer le quota de soumission publique. Le nouveau Direct et le dispositif national historique restent inchangés. Ni rotation de clé, changement A2, activation CAPTCHA/App Check, écriture de données métier, envoi réel ou publication PROD ne sont autorisés.

## Budgets et comportement

Une demande publique lit deux documents techniques de quota et en écrit deux dans la même transaction, sans scan ni stockage des identités en clair. Une transaction refusée n’écrit rien. Le SDK peut réessayer au plus cinq fois en cas de conflit : pire cas dix lectures et deux écritures validées. Les courriels et parcours métier existants ne changent pas ; aucun appel réel de soumission n’est utilisé pour la recette.

L’annuaire public conserve sa requête NAP existante, plafonnée à 1 001 lignes et refusée au-delà de 1 000 clubs. Une instance garde la seule réponse publique trente secondes à partir du chargement terminé et regroupe les chargements simultanés. Cache chaud : zéro requête ; froid ou expiré : une requête. Les lectures privées restent fraîches. Une erreur à expiration est remontée ; aucune ancienne réponse ni source secondaire n’est utilisée comme repli. Le cache n’est pas partagé entre instances.

Les deux fonctions publiques `submitEngagementAccessRequest` et `getPublicEngagementClubDirectory` sont limitées chacune à deux instances et quatre appels simultanés par instance. Ce réglage borne ces deux portes d’entrée ; il ne représente pas un plafond global de NAP ni une protection complète contre les robots.

## Contrat de livraison TEST

Le parcours source seul ordinaire exclut les courriels et changements de configuration. L’option dédiée `public_access_guards_only` de `livepalmes-test-backend.yml` garde donc un périmètre fermé, distinct des anciens contrats. Elle exige main, une première tentative, la cible TEST et l’absence de tout autre flag sensible ou de benchmark. Elle utilise le transport et les contrôles existants : CI obligatoire, vérification globale, règles fictives, staging TEST, dry-run, déploiement ciblé et preuve backend.

Avant publication, le comparateur existant calcule toutes les dépendances depuis les origines des fonctions réellement déployées, y compris la provenance A1 scellée. La sélection complète doit être exactement les trois fonctions ci-dessus. Une différence supplémentaire bloque ; aucun nom n’est retiré à la main. Un témoin conserve sur le runner privé l’inventaire complet, les configurations et le Hosting. Aucun état détaillé ni valeur de variable n’est publié comme artefact public.

Les courriels TEST doivent être déjà désactivés. Le contrôle lit le réglage existant avant/après et compare son empreinte sans le modifier. Juste avant le déploiement, une nouvelle lecture refuse toute dérive par rapport au témoin initial. Il n’appelle aucune fonction métier. Après livraison : trois fonctions actives sur le candidat, options publiques exactes, options administratives et liaisons aux secrets conservées, autres fonctions et Hosting identiques. Une dérive fait échouer la preuve et doit être examinée ; aucun retour arrière automatique ne modifie l’état réel.

## Vérifications et suivi

Les tests fictifs couvrent noms internationaux et refus, quotas anonymes/connectés, concurrence, budgets transactionnels, absence d’identités dans les compteurs, cache/coalescence/expiration/erreur/reprise et séparation des lecteurs privés. Le manifeste découvert par le vrai SDK vérifie les trois exports TEST, leurs secrets et les capacités ; les témoins fictifs refusent dérive Hosting, fonction supplémentaire, options ou version de secret modifiées.

L’état de développement, la PR et les preuves exactes de CI/TEST sont consignés dans [le registre](releases/EVOLUTIONS.md). Une réussite des tests fictifs et du déploiement n’est pas une validation utilisateur du parcours, ni une autorisation PROD. Une recette ultérieure avec une véritable demande de compte doit recevoir un accord spécifique sur l’envoi et les données réelles.

Premier essai TEST 43900869830 : tests, sélection complète, état mail et dry-run réussis ; arrêt du témoin juste avant le déploiement effectif, qui n’a pas été exécuté. La relecture des 121 fonctions montre seulement un ordre variable dans `eventTrigger.eventFilters`, avec les mêmes attributs, valeurs et opérateurs. Le comparateur normalise uniquement cet ordre, sans retirer de critère ni fusionner les doublons ; les tests refusent toujours ajout, retrait ou modification réelle. Ces filtres forment une conjonction selon [la documentation Eventarc](https://docs.cloud.google.com/eventarc/standard/docs/run/route-trigger-cloud-firestore). Aucun réglage du service correspondant n’est modifié.
