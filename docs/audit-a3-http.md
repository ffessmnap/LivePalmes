# Audit A3.6a — en-têtes HTTP minimaux

<!-- description: En-têtes A3.6a livrés, préparation CSP accueil/Direct A3.6b, contrats distincts et prérequis App Check sans activation implicite. -->

## CSP de l’accueil et du Direct en préparation — A3.6b

L’accord global conditionnel A3 du 17 novembre couvre ce lot séparé : ajouter une CSP aux cinq URL Hosting `/`, `/index.html`, `/direct.html`, `/direct-admin.html` et `/direct-consoles.html`. Pages, scripts applicatifs, caches, rewrites et sources backend restent identiques. Les en-têtes A3.6a et les CSP portail/notifications sont conservés. Le contrat TEST n'a pas encore été utilisé : son périmètre est terminé avant la première recette commune.

Les scripts proviennent du site et du chemin Firebase officiel de gstatic ; aucun `unsafe-inline` ou `unsafe-eval` pour JavaScript. L'unique bootstrap inline des consoles est autorisé par son empreinte exacte. Les quatre scripts actuels de l'accueil et de son modèle sont locaux. Les objets incorporés et les bases d'URL étrangères sont bloqués. Styles inline, images, PDF/cadres et médias HTTPS conservent leurs usages ; cette politique ne ferme pas toutes les origines de documents ni tout style inline.

Budget produit : aucune lecture métier ajoutée. Les deux URL d'accueil conservent le lecteur NAP et ses caches existants. Le contrôle HTTP réel prévu utilise trois GET statiques Direct et deux HEAD accueil, sans JavaScript ni compte, dans le budget NAP décrit ci-dessous. La [configuration Hosting](https://firebase.google.com/docs/hosting/full-config#headers) définit ces en-têtes par chemin demandé ; TEST devra confirmer leur présence sur les deux réponses réellement réécrites vers NAP, avant toute promotion. Aucune CSP de l'accueil n'est encore présentée comme livrée.

Le banc navigateur sert les cinq CSP réelles de `firebase.json`. L'accueil est produit par le vrai moteur `nap-home-page` sur des rendez-vous/documents fictifs ; ses scripts locaux et son bouton de dépliage restent fonctionnels. À 1280/390 pixels, les cinq URL refusent script inline, gestionnaire injecté, eval, script externe et base étrangère ; les modules Direct et le bootstrap haché restent exécutés. HTTPS externe est bloqué. Fournisseurs Auth/SQL fictifs, aucune session réelle, lecture ou publication sportive. Les recettes Direct précédentes à 1280/768/390/320 et six consoles à 1900/1366/1024/768/390 sont compatibles, leurs trois politiques étant inchangées ; la CI obligatoire conserve toutes ses recettes et son navigateur figé. Chrome isolé est utilisé localement ; aucun succès Edge local n'est revendiqué.

Contrat TEST distinct `test-direct-csp-policy.py`, mode historique `approved_direct_csp=true` désormais décrit comme accueil/Direct : Hosting manuel seul, sans autre accord sensible, automatisme, vérification seule ni suivi vers un autre main. Configuration complète `84cebef8…` → `89685407…`, exactement cinq valeurs CSP et aucune autre source applicative autorisée. Six tests de contrat dans publication/secours et recette CSP dans le navigateur obligatoire. Refus ordinaires et anciens contrats inchangés. CI finale, TEST commun et contrôles HTTP frais restent nécessaires ; aucun TEST/PROD CSP encore déclaré. PROD garde son bilan et son contrat distinct dans Infra.

App Check reste séparé : TEST et PROD affichent « Premiers pas ». Fournisseur, domaines, quota/coût et observation légitime restent à qualifier avant tout rejet. Aucune inscription, clé, attestation, activation ou dépense par ce lot. La CSP ne remplace ni Auth, ni droits, ni quotas A3.2.

## Périmètre autorisé

Antoine a explicitement autorisé le 17 novembre 2026 l’application d’A3.6a, son contrat TEST fermé, commit, PR, CI, intégration et publication TEST, après la clôture PROD A3.3. Ajouter seulement `X-Content-Type-Options: nosniff` et `Referrer-Policy: strict-origin-when-cross-origin` sur `/`, `/index.html`, `/direct.html`, `/direct-admin.html` et `/direct-consoles.html`. Les autres paramètres, caches, CSP, rewrites, permissions, fonctions et règles restent identiques. Cet accord initial était limité à TEST ; l’accord PROD distinct dans Infra et son exécution sont consignés ci-dessous.

## Contrat et budget

Le flag `approved_a3_http_headers` du workflow TEST commun accepte exclusivement les empreintes complètes avant/après des dix couples approuvés. Lancement manuel, Hosting seul, dernier main, première tentative et aucune autre autorisation sensible. Un main plus récent n’hérite pas de cet accord et aucun suivi automatique n’est créé. Sélection backend complète, preuves CI et conservation des révisions restent obligatoires ; aucune fonction n’est publiée par ce lot. Les refus du parcours ordinaire et du contrat TEST restent inchangés ; la PROD utilise le contrat distinct décrit plus bas.

Aucune lecture ou écriture métier ajoutée par le diff. Les deux routes d’accueil sont réécrites vers le lecteur NAP : la recette initiale utilisait un fournisseur fictif. Antoine a ensuite explicitement autorisé le contrôle HTTP réel, limité aux deux sondes HEAD TEST décrites ci-dessous. Les trois pages Direct sont contrôlables par requêtes HTTP statiques sans exécuter leur JavaScript. Aucun fichier sportif ni compte réel n’est utilisé pour la recette ; le complément HEAD consulte le lecteur public NAP sans écriture.

## Contrôles et limites

Tests hors ligne du diff entier, refus d’une route globale, d’une CSP, d’un cache, d’une autre source/configuration, d’un projet PROD ou d’un lancement automatique. CI complète requise selon le circuit actuel. Après TEST : vérifier les en-têtes et Content-Type des pages statiques ; le complément HEAD réel autorisé ci-dessous couvre désormais les en-têtes des deux réponses d’accueil, sans télécharger leur contenu. Les tests navigateur utilisent uniquement des services fictifs ; ils ne valent pas recette utilisateur ni preuve d’intégration NAP.

## Preuves TEST du 17 novembre 2026

[#950](https://github.com/ffessmnap/LivePalmes/pull/950), candidat intégré `709cd01c4cba11dde42991a19a59f2795e9432b2`. [CI PR](https://github.com/ffessmnap/LivePalmes/actions/runs/44026898717) et [CI main](https://github.com/ffessmnap/LivePalmes/actions/runs/44027564056) complètes réussies : application, publication, navigateur hors ligne et synthèse obligatoire. Les sept tests HTTP ciblés, douze de coordination et cinq de régression cache ont réussi. Le premier échec publication a conduit à corriger la liste de couverture à treize commandes, sans retirer les douze existantes.

[Publication TEST commune](https://github.com/ffessmnap/LivePalmes/actions/runs/44028122090) réussie, de 06 h 01 min 09 s à 06 h 02 min 56 s UTC ; cette durée de run ne représente pas le délai complet de livraison. Les preuves CI du candidat exact ont été réutilisées. Calcul backend complet : zéro fonction sélectionnée sur les 109 éligibles, 121 révisions prouvées et conservées, toutes ACTIVE. Aucun déploiement de fonction ou règle. Hosting `sites/livepalmes-test/versions/88a1b62af54e95b3`, release `1794895354772000`.

Artefact `test-proof` ID `14304331502`, téléchargé et authentifié par son digest GitHub : ZIP SHA-256 `27d2caa7cf605a79d64ca0e041d5bdf847f362ad2a3203c19ddfadababe4ce93`. Son candidat, sa vérification globale réussie et ses métadonnées Hosting/fonctions sont cohérents avec le run.

Contrôle HTTP frais sur `https://livepalmes-test.web.app`, sans exécution JavaScript : `/direct.html`, `/direct-admin.html`, `/direct-consoles.html` répondent 200 en `text/html; charset=utf-8`. Les deux en-têtes attendus sont présents et les trois corps sont identiques aux blobs Git du candidat exact. Les deux routes d’accueil n’avaient pas été invoquées lors de ce premier contrôle ; le complément autorisé ci-dessous lève cette limite pour leurs en-têtes.

Livraison technique TEST confirmée. Validation utilisateur reçue le 17 novembre 2026 : Antoine indique « Test 3.6 ok » après la recette demandée sur les trois pages Direct du candidat TEST ci-dessus. Les appareils et vérifications détaillées ne sont pas précisés ; aucun contrôle supplémentaire n’est attribué à ce retour. Le contrôle complémentaire ci-dessous vérifie leurs en-têtes HTTP réels ; il ne constitue pas une recette du contenu NAP. Ce retour validait TEST ; il ne valait pas, à lui seul, accord PROD.

## Complément HTTP autorisé — accueil TEST

Le 17 novembre, Antoine indique « je donne mon accord, resoud le controle, on continue le plan ». Deux sondes HEAD séquentielles, sans paramètre, redirection, JavaScript, cookie ou identité utilisateur, ont été effectuées sur TEST à **07 h 17 min 35 s Europe/Paris**. Elles ne téléchargent aucun corps de page, document ou fichier sportif.

Les deux routes `/` et `/index.html` répondent **200**, `Content-Type: text/html; charset=utf-8`, `X-Content-Type-Options: nosniff` et `Referrer-Policy: strict-origin-when-cross-origin`. Le serveur confirme `X-LivePalmes-Home-Source: nap-server-html` et `Cache-Control: private, no-store` ; zéro octet de corps reçu. Le contrôle des en-têtes sur les cinq routes du lot est terminé, sans correctif ni redéploiement.

Budget préalablement vérifié dans le lecteur : jusqu’à deux fenêtres calendrier indexées de 501 candidats et une sélection documentaire de sept lignes par chargement à froid, cache mémoire de cinq minutes. Pour les deux sondes : au maximum six requêtes SQL, 2 018 lignes candidates retournées avant les jointures bornées ; moins si le cache est réutilisé. La base NAP réelle partagée peut être lue ; aucune écriture métier, compte, mail ou configuration n’est modifié. Aucun contenu NAP n’est conservé par la sonde.

## Promotion PROD vérifiée dans Infra

Antoine a ensuite autorisé directement dans Infra : « J’autorise la prod une fois que c’est prêt. » Cet accord conditionnel couvre le seul A3.6a validé en TEST. Le bilan a été présenté après réussite des contrôles, avant le lancement ; aucune seconde confirmation ni validation manuelle inventée.

[#954](https://github.com/ffessmnap/LivePalmes/pull/954) ferme un contrat PROD distinct `20261117-production-http-headers-contract.json` : candidat `709cd01c`, dix couples, diff complet, arbre backend identique et référence A3.3 [43992942670](https://github.com/ffessmnap/LivePalmes/actions/runs/43992942670). La [découverte officielle](https://github.com/ffessmnap/LivePalmes/actions/runs/44032453871) a observé la configuration réelle et les permissions existantes. Les contrats TEST et historiques restent inchangés. [CI PR](https://github.com/ffessmnap/LivePalmes/actions/runs/44033895373), [CI main](https://github.com/ffessmnap/LivePalmes/actions/runs/44034517319), [preflight](https://github.com/ffessmnap/LivePalmes/actions/runs/44034798129) et [prérequis officiels](https://github.com/ffessmnap/LivePalmes/actions/runs/44035042103) réussis et authentifiés ; aucune permission ajoutée, aucune preuve TEST republiée.

[Publication PROD 44035373107](https://github.com/ffessmnap/LivePalmes/actions/runs/44035373107) réussie, Hosting `sites/livepalmes/versions/6dde6e6e2625e2e8`. La sélection calculée est vide ; le contrat la vérifie sans la forcer. Les 119 fonctions ACTIVE, leurs révisions, sources, labels, configurations et bindings ont été conservés et contrôlés avant Hosting ; les trois étapes Functions sont omises. La configuration Hosting entière après publication correspond exactement aux dix ajouts, sans autre cache, CSP, redirect ou rewrite modifié.

Sauvegarde chiffrée rouverte et comparée dans le runner avant Hosting ; aucune ouverture locale. SHA-256 du fichier chiffré : `72b1533c2f941f34b78853296f5c5e0b48d0ad26ee919a0407b567a0719a27b6`. Le contrôle frais de la référence Hosting et des configurations backend précède la publication. Les témoins avant/après des mails actifs tous clubs, scheduler, queue et modèles sont strictement identiques ; aucune pause, activation, configuration ou liaison modifiée.

Contrôle HTTP final du même run : trois GET statiques Direct avec corps identiques aux blobs Git et deux en-têtes conformes ; deux HEAD accueil, sans redirection, JavaScript, authentification ni corps reçu, jamais de GET accueil. Les cinq réponses sont conformes dès la première requête. Les HEAD consultent le lecteur public NAP existant dans le budget borné ci-dessus ; aucune donnée NAP n’est conservée par la sonde. Les cinq fichiers statiques et deux exclusions du contrôle ordinaire sont aussi conformes. Aucun compte, droit, secret, règle, index, donnée métier, migration, envoi de test, rattrapage, DTN ou nettoyage Storage ; aucune opération Paris/CNHC/Basile. Les automates TEST suspendus restent inchangés.

Délai mesuré depuis le relais dans Infra à 07 h 27 min 28 s Europe/Paris jusqu’à l’authentification des preuves PROD : 37 min 57 s, préparation et attentes CI/prérequis comprises. Le seul job PROD dure 2 min 15 s ; ce sous-job ne représente pas le délai complet. La préparation TEST antérieure et la clôture documentaire sont distinctes ; leurs jalons restent dans les suivis privés.

## Retour arrière et suite

Le retour arrière officiel reste soumis à une demande explicite. Il refuse une release plus récente et vérifie les configurations avant/après pour retirer seulement les dix couples, sans écraser un autre réglage. Aucune reprise automatique ni opération métier implicite.

A3.6a est publié et vérifié. La suite du plan reste A3.8a (épinglage borné des workflows), puis les sessions A3.4a dans leur chantier coordonné. Cette promotion n’autorise pas les autres sous-lots sensibles. La clôture du registre ne déclenche aucun test applicatif ni déploiement.
