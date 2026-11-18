# A3.4b — obligation MFA reportée, Authenticator facultatif conservé

<!-- description: Report explicite de l’obligation MFA, retour TEST facultatif à qualifier, Authenticator et récupération PROD validés conservés ; préparation obligatoire historique séparée. -->

## Accord, validation humaine et état

Antoine confirme le fonctionnement d’Authenticator et la récupération depuis la clé papier propre à PROD (réponse `call_87b341487c6048168390b2a3d5b2ecbe/0`, message `01a1eec4-7414-70e0-b5f4-e050a3d519b2`). Aucun code, secret ou facteur n’est collecté. La récupération A2 reste distincte : une reconstruction complète des comptes Google exige une nouvelle association TOTP.

Le 18 novembre, il demande explicitement : **« On reporte la double authentification obligatoire. On conserve Authenticator et la récupération déjà opérationnels. Stabilise TEST sans publier l’obligation en PROD, puis poursuis le reste d’A3. »** Message `01a1ef78-9541-7ad1-b818-6d441cafdb4a`, conversation `01a1e61a-8f79-7323-8f08-03b3fa948a75`. Il précise ensuite **« Remettre TEST en facultatif »** en réponse à `call_3194047eb87c483a8925847a0a37bcb7/0`. Cet accord remplace la trajectoire de promotion obligatoire. PROD reste à la version optionnelle `a8c63e47` (Hosting `41ec297d45f79162`) ; aucun contrat, source ou Rules MFA obligatoire PROD n’a été publié.

Les [sources TEST44331211017](https://github.com/ffessmnap/LivePalmes/actions/runs/44331211017) avaient déjà installé l’obligation sur111fonctions existantes parmi121, dix conservées. Le [commun44341362038](https://github.com/ffessmnap/LivePalmes/actions/runs/44341362038) s’est arrêté au classement avant Google et avant toute écriture Rules/Hosting. Les Rules distantes facultatives `367fbf01…` et Hosting `c75f7e7723073977` sont conservés pendant la stabilisation. Le correctif place les preuves CI et l’unique installation verrouillée du parseur avant ce classement ; les gardes avant Google demeurent.

## Stabilisation TEST facultative — préparation #1001

L’ancre `89b3efd0d52d01204d41268ac442ca8f18ff64e9` rend la politique serveur **facultative par défaut**, sans paramètre d’environnement ni champ client permettant de l’activer. Les scénarios de l’obligation restent testés avec une politique explicitement fictive ; les Rules obligatoires jamais publiées restent une fixture distincte. La source Rules TEST retrouve exactement `367fbf01…`, déjà distante. Les lecteurs de droits frais, refus des comptes inactifs, contrôles des sessions A3.4a et absence de passe-droit Direct restent actifs. Aucun compte, facteur, rôle, réglage Auth, SMS, session réelle, clé ou donnée métier n’est modifié par la préparation.

Le [contrat TEST facultatif](../.github/releases/evidence/20261118-test-admin-mfa-optional-contract.json) référence le reçu source44331211017 exact, son artefact14442319189, digest ZIP et empreinte du membre. L’état de121fonctions et les111archives sont authentifiés avant comparaison fraîche. La sélection complète recalculée donne111sources, dix conservées et27exports modifiés non installés, sans création. Huit divergences héritées sont reproduites par le vérificateur numérique indépendant inchangé ; aucun moteur de sélection n’est modifié, aucune fonction retranchée manuellement.

Le writer existant `livepalmes-test-mail-sources.yml`, lot fermé `admin_mfa_optional`, garde CI main exacte, identité TEST existante, main/première tentative, contrôles mails désactivés, file et planificateurs suspendus, témoins de messages, configurations et Hosting inchangés. Deux lectures Rules bornées à la préparation et deux fraîches avant publication exigent l’état facultatif ; aucune écriture Rules/index. Sources/labels seulement, archives et générations attestées, aucune invocation métier. Après succès, TEST commun du même candidat publiera Hosting seul, sans reconstruction des sources, puis contrôle final séparé. **La préparation n’est pas encore une preuve de stabilisation distante.**

La première CI de stabilisation44351449597 conserve son échec applicatif : une assertion du callable Records attendait encore le refus MFA obligatoire. Le test vérifie désormais explicitement l’admission facultative de l’administrateur courant, en conservant les refus sans connexion/sans droits/inactif, la source NAP fictive, l’audit et les limites de publication. Aucun code ou règle sportive modifié. Les28scénarios des Rules préparées ont réussi ; la CI complète corrigée reste requise.

La CI corrigée44352415745 est réussie ; #1001 est intégrée sur2176fb2c. Le contrôle local réel de la garde main bloque ensuite, avant tout appel Google : `tools/test-admin-mfa-rules.py`, rétabli à son code historique lors du recentrage, manquait dans les chemins d’outillage entre l’ancre applicative89b3 et le candidat intégré. L’ajout de ce seul chemin et un test de couverture du diff intégré corrigent le contrat facultatif encore jamais utilisé. L’ancre, les111sources, les empreintes, les Rules et l’accord humain sont conservés ; aucun ancien contrat modifié.

La préparation des writers PROD et ses tests de la version `04d94594` restent récupérables dans Git, hors diff final de cette stabilisation. Aucun `adminMfaRelease` n’est ajouté aux parcours PROD ; aucune publication obligatoire autorisée. Les contrats historiques B/completion sont inchangés. L’ensemble d’A3 reste ouvert.

## Préparation obligatoire historique — non autorisée à la publication PROD

Les sections suivantes décrivent le lot obligatoire préparé avant son report. Elles ne constituent ni l’état facultatif courant ni une instruction de reprise.

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
