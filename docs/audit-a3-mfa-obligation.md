# A3.4b — obligation MFA des administrateurs généraux

<!-- description: Préparation du contrôle serveur TOTP limité à admin.full, configuration personnelle sans accès métier, anciens jetons, règles TEST/PROD distinctes et prérequis de publication ; aucun déploiement encore attesté. -->

## Accord, validation humaine et état

Antoine demande de continuer les autres lots pour terminer A3, avec sollicitation si nécessaire. L'accord A3 conditionnel de livraison reste soumis aux contrôles et aux protections Infra. Le périmètre annoncé et confirmé précédemment est celui des administrateurs généraux `admin.full`, sans obligation ajoutée aux clubs, régions ou comptes seulement nationaux. Aucun droit attribué ou retiré, compte ou facteur remis à zéro par ce lot.

Le 18 novembre, Antoine confirme que la double vérification fonctionne sur son compte PROD, puis répond **« Clé conservée et récupération déjà testée »** à la question précise de reconstruction depuis la clé papier propre à PROD. Source : conversation `01a1e61a-8f79-7323-8f08-03b3fa948a75`, message `01a1eec4-7414-70e0-b5f4-e050a3d519b2`, réponse `call_87b341487c6048168390b2a3d5b2ecbe/0`. Ce retour humain ne prétend pas qualifier un deuxième appareil physique ou une reconstruction complète des comptes Google. La récupération A2 des seules données exportées reste distincte : la clé TOTP n'est pas exportée par Google et une reconstruction des comptes exige une nouvelle association.

**État : application intégrée par #1000 sur `de49a1ba`, CI PR corrigée `44329833821` et CI main `44330726229` réussies. Publication des sources TEST `44331211017` en cours, sans preuve commune TEST ni livraison PROD de cette obligation encore attestée.** Les anciens contrats A3.4a et leurs empreintes restent immuables. Les succès des lots précédents ne valent pas validation du nouveau code.

## Contrôle et parcours conservés

`admin-mfa-policy.js` exige le champ réservé Firebase `firebase.sign_in_second_factor == "totp"` dans le jeton déjà vérifié par le SDK callable. Le [contrat officiel DecodedIdToken](https://firebase.google.com/docs/reference/admin/node/firebase-admin.auth.decodedidtoken) décrit cette preuve de connexion ; un indicateur client, une custom claim de capacité ou l'existence d'un facteur enregistré ne la remplace pas. L'identifiant facultatif du facteur n'est pas une condition supplémentaire de connexion.

La décision utilise le profil actif courant, partagé seulement au sein d'une requête. La lecture de profil destinée à la configuration personnelle ne peut pas mettre en cache une autorisation MFA : chaque garde et le lecteur synchrone recontrôlent la preuve. Une promotion vers `admin.full` impose la MFA dès l'appel suivant, indépendamment des anciennes capacités du jeton. Statut inactif, droits supprimés et erreur de lecture restent refusés.

Le profil personnel d'un administrateur sans preuve MFA retourne `adminMfaRequired: true` et **aucune capacité métier**. L'ouverture du portail ne crée ni ne rétablit de session dans cet état. Le client recharge l'état Auth personnel : un facteur existant mène à une reconnexion, sans nouvelle clé ; l'absence de facteur ouvre le dialogue d'association existant, avec mot de passe récent, adresse vérifiée et conservation locale de la clé. Après association, déconnexion puis nouvelle connexion avec Authenticator. Annulation, changement de compte ou refus ne rejouent aucune action en attente.

Le Direct passe par le même lecteur courant, avec son format d'erreur conservé et aucun passe-droit d'UID pour un profil non administrateur. Les deux fonctions PDF historiques vérifient aussi la MFA et le profil courant avant Storage ; les identités PIN ordinaires sans profil portail conservent leur grant de rôle, sans obligation MFA nouvelle. Une lecture de profil PIN ne peut pas assouplir une garde active ultérieure dans le cache.

Les anciens clients et le repli local UID/PIN ne peuvent pas transformer ce profil de configuration en accès administrateur. Les autres gardes de pages reçoivent aussi des capacités vides. Les sessions déjà ouvertes sont vérifiées contre le profil et la MFA courants avant les actions métier et le rafraîchissement d'activité. La fermeture de sa propre session reste disponible. Le mode MFA global Identity Platform reste inchangé : aucun SMS, obligation pour tous les comptes, nouvelle API Auth serveur ou envoi automatique ajouté.

## Règles et coût d'accès

Les deux sources sont dérivées séparément de bases attestées. Le générateur fermé `tools/admin-mfa-rules-policy.py` refuse un autre projet, une autre base ou tout changement supplémentaire. Les clauses de lecture publique restent identiques. Chaque permission privée ajoute une garde unique qui vérifie le profil administrateur courant et la preuve TOTP ; une ancienne claim ou identité historique n'est pas une exemption. Les rôles temporaires ordinaires de consoles et les inscriptions NAP du Direct gardent leurs contrôles.

| Projet | Base | Proposition |
| --- | --- | --- |
| TEST | `367fbf01bf3f2794727b19e6d5f5bd141bcf6baf31002500c9ffc8bb1ea98561` | `db56d009ec9f34fa0a6bb895346fe576ad31a7e1b3223c454474024b09dbf589` |
| PROD | `ef955e075af13b4de189401d3f148a807e99704fcf83651c85fe72598caf44f2` | `9c1b39d8546ae41d4a017b67563a440548e1e03eb816c4c56a4dfb7fc5902705` |

Les premiers essais ont détecté la limite Firebase de 1 000 expressions sur les anciens parcours vidéo et speaker. Les quatre autorisations alternatives `update` des résultats sont regroupées par leur disjonction équivalente, sous une seule garde commune ; trois conjonctions de création d'alertes évaluent le même libellé de source avant le même rôle. Aucun champ autorisé, règle sportive, calcul ou branche d'autorisation n'est retiré ou ajouté. Les 27 scénarios concernés passent ensuite dans l'émulateur réel, dont les refus MFA et les deux projets. Les 14 clauses de lecture publique sont inchangées ; 50 permissions privées reçoivent une garde.

| Opération | Budget ajouté ou conservé |
| --- | --- |
| Configuration avant MFA | Une lecture du profil personnel, aucune lecture/écriture de session, zéro NAP. API Auth personnelle via le SDK existant. |
| Ouverture normale | Un profil puis une transaction de session ; jusqu'à cinq lectures de session en cas de contention, une écriture de validation au plus. |
| Action privée | Une session et un profil courant mutualisé entre les gardes ; aucun document utilisateur supplémentaire par ligne. Les gardes métier réutilisent le même profil. |
| PDF historiques | Un profil courant ajouté, puis le grant existant pour une identité PIN ; aucun contenu Storage lu ou modifié avant autorisation. |
| Activité | Un profil ajouté à la transaction de session existante, toujours groupée au plus toutes les cinq minutes ; aucune boucle de fond nouvelle. |
| Règles privées | Un document utilisateur au plus, réutilisé par les accès de la requête ; grants et inscriptions existants conservés. Aucun scan ni liste de comptes. |
| Public | Aucun accès supplémentaire au profil, zéro NAP/Firestore ajouté par le client MFA. |

## Vérifications et publication à terminer

Réussis localement : politique MFA et refus avant modification, isolation du cache de configuration, promotion/démotion, sessions serveur/client, identité et droits courants, ancien repli UID/PIN, versions et consoles générées, tests de récupération/association, navigateur réel avec SDK et HTTPS externe bloqué sur ordinateur/mobile, projections immuables et 27 scénarios Firestore des parcours touchés. Les identités, clés, mots de passe et codes des fixtures sont strictement fictifs. Node local `24.16.0` ne remplace pas la CI épinglée `22.23.5`.

La [découverte PROD 44313309226](https://github.com/ffessmnap/LivePalmes/actions/runs/44313309226) réussie sur `45afdf22` est authentifiée : 119 fonctions et source Rules actuelle `ef955e07` conforme à la dernière base. Artefacts Hosting `14431371245` / ZIP `62171e1e38846ce416fe56b3539ca22ef3ca57ab8af3bd08184ff9dde7955bde`, backend `14431291733` / ZIP `254371970a9f14760c5ab9e62a52f3566f2041c2be5fb499fd103fe87b076536`. Aucune permission générique manquante ; les runtimes de la nouvelle sélection restent à qualifier précisément. Zéro écriture Google ou invocation métier par cette découverte.

Avant la première CI : terminer le lot applicatif et le contrat/parcours TEST, calculer la sélection complète depuis chaque origine avec les deux comparateurs, conserver les fonctions non installées et les exclusions. Nouveau contrat MFA fermé ; aucune réutilisation du mode de clôture B historique. Puis CI obligatoire, sources TEST attestées, dérive fraîche et delta Rules TEST, Hosting commun et contrôles finaux. Préparer dès TEST le contrat PROD propre, la qualification des runtimes, la continuité administrative et les permissions Rules existantes, sans ajout de droit par défaut.

Avant PROD : bilan complet dans Infra sous l'accord conditionnel, preflight/prérequis officiels, sauvegarde V2 du code et des seules Rules initiales rouverte/comparée, sources et archives vérifiées, delta Rules PROD dérivé séparément, Hosting en dernier et contrôles frais. Une source différente, permission manquante ou autre dérive bloque. Le retour arrière coordonné code/Rules doit conserver les facteurs et les clients MFA, sur demande explicite ; aucune reprise automatique ou restauration de données métier.

## Contrat TEST préparé

L'ancre applicative est `02454e82658278b4e3450ad229e65147b4372711`. Le contrat fermé [MFA TEST](../.github/releases/evidence/20261118-test-admin-mfa-contract.json) conserve l'inventaire de 121 fonctions de la preuve commune `44284078222` et calcule **111 sources existantes à modifier**, dix conservées et 27 exports modifiés non installés, sans création. Le Direct et les deux fonctions PDF sont inclus dans cette sélection. Les comparateurs ne sont pas changés.

Les huit divergences TEST et sept divergences PROD entre les deux comparateurs sont vérifiées indépendamment, depuis chaque origine installée : module numérique déjà revu inchangé, normalisation statique exacte, aucune exécution des modules applicatifs et aucun consommateur du quota modifié exclu. Le code du vérificateur et les preuves séparées sont épinglés ; une origine, révision, empreinte ou divergence omise/différente bloque la publication. La découverte PROD ne constitue pas la validation de la future version.

Le transport TEST réutilise le writer de sources existant sous un contrat propre. Il refuse les configurations, créations, reprises, autres projets ou mélanges d'accords. Après preuve des 111 sources et de leurs archives, le lancement manuel commun impose Hosting seul et zéro source restant à publier ; simulation des Rules, dérive fraîche, seules Rules TEST, puis Hosting. Aucun index ni donnée métier n'est déployé. Les contrôleurs de l'ancien lot B et leurs empreintes restent inchangés ; son test utilise désormais son résultat Rules historique figé.

Les tests hors ligne couvrent l'altération du contrat, de la preuve et de son vérificateur, une origine/revision absente, la dérive pendant la simulation, l'absence de sources attestées, les mauvais projets/flags et le refus de suivi automatique. Leur résultat et la CI seront consignés après exécution. Ce contrat préparé ne constitue ni une preuve TEST du nouveau candidat ni un accord technique de passage PROD.

La première CI de la [PR #1000](https://github.com/ffessmnap/LivePalmes/pull/1000), [44327789537](https://github.com/ffessmnap/LivePalmes/actions/runs/44327789537), conserve son échec applicatif : le nouveau reauth manquait le catch de chargement sûr du résolveur. Publication et navigateur réussis. La correction garde ce contrat sur les sept points exacts (deux dans la session portail) et renouvelle l’ancre front ; code backend et Rules restent identiques. Les essais ciblés et le navigateur isolé corrigé passent ; la CI complète du candidat corrigé reste requise.

## Préparation fermée du parcours PROD

Le candidat applicatif demeure celui de TEST commun : `de49a1bae71156c5e0d1fd91a0991dd786290137`, descendant de l'ancre front corrigée. L'outillage est préparé séparément ; aucune nouvelle source applicative, clé, permission, obligation globale ou donnée n'est ajoutée. L'option `adminMfaRelease` et le type `a34b-admin-mfa-existing-v1` sont distincts des contrats B. Le contrat PROD reste absent et ses deux constantes restent `UNSEALED` pendant cette préparation : les nouveaux writers refusent tout lancement réel de cette famille.

Une découverte ciblée, depuis le workflow officiel main validé, peut qualifier les droits existants avant ce contrat : sélection complète des 110 sources sur 119, neuf conservées, rôles des vrais comptes runtime mutualisés, au plus dix identités/dix rôles ; deux profils administrateurs et un lookup Auth masqué aux seuls identifiant/statut désactivé, sans facteur, graine ou connexion. Toute permission absente bloque. La preuve conserve tous ses champs de contexte, dont le candidat exact, et devra correspondre au futur ready du même candidat. La confirmation humaine Authenticator/papier reste distincte.

Les nouveaux modules réutilisent les transports et lecteurs existants sans modifier leurs fichiers historiques épinglés. Les routes ordinaires conservent leurs commandes, ainsi que les protections B/completion. Sauvegarde initiale code+Rules incluse avant V2, réouverture/comparaison, sources/archives toutes attestées, Rules PROD seules depuis leur base propre, puis Hosting. Le contrôle final relit les 119 identités après Hosting et refuse toute dérive de révision, configuration ou témoin. Le retour exige une demande explicite, la sauvegarde V2 et une coordination sources/Rules/Hosting ; code seul, réduction de sélection et reprise automatique refusés.

Les tests nouveaux sont fictifs : contrat non scellé/altéré refusé, demande et manifeste fermés, contexte complet de capacités, couverture 110/119 sans N+1, permissions absentes/conditionnelles, sauvegarde ou archive manquante, compilation différente, dérive avant PATCH et après Hosting, retour implicite et élargissement de son masque refusés. Les contrats historiques restent exercés sans assouplissement. La préparation et ces tests ne prouvent pas encore les permissions Google du nouveau lot ni sa livraison PROD.
