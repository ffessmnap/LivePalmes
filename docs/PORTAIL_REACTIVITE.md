# Réactivité et session du portail — 2 novembre 2026

<!-- description: Périmètre autorisé jusqu’à TEST, chargement différé, budget des sessions de 24 heures, mesures locales et contrôles du portail. -->

## Autorisation et périmètre

Antoine a validé le plan complet : « Ok je valide tout ce plan que tu peux mener de bout en bout jusqu'à TEST ». Il couvre le démarrage, les interactions, les accès serveur, la reconnexion après 24 heures et les protections nécessaires, jusqu’à TEST commun. L’activation de session est limitée à TEST ; la PROD nécessite un périmètre et un accord Infra propres. Aucune donnée sportive, index, configuration NAP, règle sportive, capacité ou envoi réel n’est modifié par la recette.

## Implémentation

- Les quatorze fabriques du portail et leurs interfaces sont conservées. Onze fichiers de `assets/portal/deferred/` contiennent 95 fonctions asynchrones ; une comparaison syntaxique avec `29ceb478` vérifie leurs corps et paramètres après normalisation des seules références aux helpers locaux. Ces fichiers sont des sources à maintenir, pas des sorties à régénérer.
- Le chargeur mutualise les téléchargements, conserve les modules chargés et permet une nouvelle tentative après échec. Les fonctions synchrones restent synchrones. Un changement de compte, club ou route pendant le chargement annule l’ancienne action ; une écriture retardée vérifie aussi la compétition. Le formulaire empêche son envoi natif immédiatement. Le retour visuel est immédiat, les erreurs sont visibles, aucun enregistrement n’est rejoué.
- Le survol, le toucher ou le focus sur un lien peuvent préparer le code de sa rubrique sans lire de données. L’accueil ne précharge plus calendrier, effectif complet ou SDK Firestore d’annuaire. Les routes conservent leurs chargeurs, bornes et exigences de fraîcheur.
- L’authentification démarre pendant le chargement des autres scripts ; le portail attend toujours le profil serveur avant l’accès privé. Huit lectures identiques simultanées sont mutualisées par opération/paramètres/identité/club ; aucun cache temporisé NAP nouveau, ni mutualisation d’écriture. Une réponse liée à une ancienne identité est rejetée.
- Les mutations métier conservent les réponses serveur, empreintes, reprises, lots et invalidations existants. Le changement d’autorisation ou de périmètre du même compte vide aussi ses anciens caches privés avant le rendu.

## Session de 24 heures

Le navigateur enregistre uniquement une référence opaque, des horodatages et l’état de verrouillage par compte. Les onglets d’un même navigateur partagent cette activité ; les appareils ont des références distinctes. Seules les interactions réelles sur une page visible prolongent l’activité ; un rechargement ou une lecture automatique ne la prolonge pas. L’expiration est vérifiée avant un appel et au réveil/retour de page. Il n’y a ni boucle de vérification à la seconde ni heartbeat pendant l’inactivité.

Le serveur conserve un document technique `portalSessions` par compte/navigateur, à une clé hachée, sans e-mail ni donnée sportive. Il vérifie UID, référence et `auth_time` Firebase, avec les droits métier existants ensuite. Le navigateur verrouille à 24 h ; les remontées d’activité regroupées sur cinq minutes impliquent une tolérance serveur maximale de cinq minutes. Le serveur n’accepte aucun horodatage futur fourni par le client, ne prolonge pas sur une lecture et ne permet pas de recréer une session expirée avec un ancien jeton ou une autre référence. Une nouvelle authentification récente est nécessaire. Le renouvellement d’un jeton ne suffit pas ([Firebase](https://firebase.google.com/docs/auth/admin/manage-sessions)).

Le registre est inaccessible directement aux clients par les règles existantes de refus par défaut. Les références stables sont réutilisées ; aucun scan, purge ou scheduler n’est ajouté. Les documents expirés restent techniques et invalides, sans reconstruction interactive.

Le dialogue conserve les saisies en mémoire dans la page ouverte ; elles ne sont pas persistées avec les mots de passe. La reconnexion recharge les droits, invalide les caches de consultation et ne relance aucune sauvegarde. Un périmètre différent entraîne la remise à zéro du contexte privé. Une fermeture/recharge de page peut perdre une saisie non enregistrée. Les anciennes sessions sans historique fiable demandent une reconnexion initiale.

Les opérations techniques utilisent `getCurrentAccessUser` avec un dispatch privé explicite ; l’annuaire utilise `listAccessUsers` en mode snapshot, avec périmètre dérivé côté serveur. Les consommateurs historiques du seul profil et les protections du Direct gardent leur contrat. Les 118 appels métier référencés par le portail, y compris les branches conditionnelles, ont un contrôle de session placé avant leur traitement sur TEST. Les déclarations retirées NAP restent exclues du déploiement ; elles ne sont pas recréées.

## Budget des accès

| Situation | Budget ajouté/modifié |
| --- | --- |
| Accueil club | Un RPC profil/session au lieu du profil et des deux préchargements ; zéro SELECT calendrier/effectif tant que ces écrans ne sont pas ouverts. |
| Ouverture/restauration TEST | Deux documents : profil existant et session, lus en parallèle ; zéro/une écriture de session et zéro/une mise à jour `lastLoginAt` existante. Une restauration ne décale pas l’expiration. |
| Appel métier privé TEST | Une lecture ponctuelle de session en plus du budget métier inchangé, indépendante de la base et des lignes affichées. Les lectures identiques simultanées partagent leur RPC et ce contrôle. |
| Activité continue | Au plus douze remontées/heure/onglet actif ; une lecture par remontée, au plus douze écritures/heure pour la session partagée grâce à la transaction. Aucun appel récurrent au repos ; après échec, nouvelle tentative bornée à cinq minutes. |
| Trois onglets réellement actifs | Au plus 36 remontées/heure, doublons concurrents possibles ; toujours au plus douze écritures sur le document partagé. Les transactions sont limitées à cinq tentatives ; budget de lecture multiplié par cinq au pire en cas de conflits. |
| Annuaire privé TEST | Une lecture de session, zéro/une lecture de profil de gestion et une lecture du snapshot de périmètre. Plafond de 5 000 entrées, aucun scan/reconstruction si absent ; repli paginé existant conservé. SDK Firestore non chargé pour ce parcours TEST. |
| Reconnexion | Un RPC d’ouverture puis une relecture explicite du profil : quatre lectures de documents hors réessais, écritures techniques ci-dessus ; aucune sauvegarde métier. |
| SQL / rafraîchissement NAP | Aucun SELECT ajouté, borne ni fraîcheur modifiée ; appels initiaux inutiles supprimés. |

La session ajoute donc un coût de sécurité fixe par RPC ; ce coût n’est pas présenté comme une économie de lectures Firestore.

## Mesures et contrôles

Le scénario `tests/portal-reactivity-browser-tests.js` utilise le vrai portail, Edge local, HTTPS bloqué, compte et RPC fictifs avec délai de profil fixé à 100 ms. Des rechargements complets distincts sont employés ; le premier affichage autorisé est marqué au frame suivant, séparément du chargement des ressources. Il vérifie aussi une panne du profil puis une reprise manuelle, sans afficher de contenu privé avant vérification. Les résultats locaux sont dans `tmp/portal-reactivity/`.

Comparaison au même protocole avec `29ceb478` : JavaScript local décodé observé à l’accueil de 1 773 540 à environ 1 526 000 octets, soit environ 14 % en moins ; trois RPC initiaux deviennent un. Les quatre passages locaux de référence étaient de 329 à 502 ms, le candidat intermédiaire de 285 à 488 ms. La dispersion ne prouve pas un gain uniforme de latence et n’inclut ni SDK distant, démarrage réel des instances, réseau mobile réel ni NAP. La cible initiale de 30–50 % n’est pas atteinte ; les fonctions synchrones sont conservées pour limiter les risques. Les objectifs de 100/200 ms ne sont pas une garantie globale attestée.

Tests ciblés : chargeur réel et ses onze chunks, mutualisation/erreurs/contexte, sessions client et serveur avec horloge simulée, seuil/tolérance, anciens jetons, mauvais mot de passe, onglets/appareils, brouillon, changement de périmètre, absence de rejeu, droits d’annuaire et refus Firestore. Les tests navigateur vérifient aussi dialogue, focus, largeur, compte et officiels à 1280/390 px. La syntaxe complète, la CI applicative/publication, l’émulateur Firestore et la preuve TEST du candidat exact restent obligatoires.

## Livraison spécifique et retour arrière

La restriction de lecture directe du snapshot n’autorise aucune lecture supplémentaire ; elle force le passage par la session serveur sur TEST. Le parcours manuel `approved_portal_session_rules` est limité aux empreintes avant/après exactes de `tools/test-portal-session-rules.py`, à `main` et à TEST. Avant toute publication, un contrôle frais des règles en lecture seule refuse la dérive. Après les Functions vérifiées et avant Hosting, le parcours spécifique simule/publie uniquement `firestore:rules` et relit son empreinte. Aucun index ni bootstrap minimal de `getCurrentAccessUser` n’est déployé. Une preuve dédiée est conservée ; pas de suivi automatique de cette autorisation vers un nouveau candidat. Les publications ordinaires suivantes peuvent réutiliser la restriction exacte déjà déployée après contrôle frais en lecture seule ; elles ne la déploient jamais et refusent tout autre changement de règles. La sélection des Functions, les exclusions mail/schedulers et toutes les vérifications existantes sont conservées.

Si la règle restrictive est déjà publiée, ne pas revenir au seul ancien Hosting : son annuaire direct serait refusé. Conserver le client utilisant le RPC, ou préparer un retour arrière coordonné des Functions/Hosting et de la règle de référence, après examen du périmètre. Aucun rollback de données sportives ou suppression de sessions n’est implicite. La PROD reste en dehors de ce contrat TEST.
