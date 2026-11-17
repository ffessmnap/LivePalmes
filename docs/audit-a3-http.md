# Audit A3.6a — en-têtes HTTP minimaux

<!-- description: Diff HTTP fermé sur cinq routes, contrat Hosting TEST, contrôles HTTP statiques et HEAD réels autorisés, bilan avant PROD. -->

## Périmètre autorisé

Antoine a explicitement autorisé le 17 novembre 2026 l’application d’A3.6a, son contrat TEST fermé, commit, PR, CI, intégration et publication TEST, après la clôture PROD A3.3. Ajouter seulement `X-Content-Type-Options: nosniff` et `Referrer-Policy: strict-origin-when-cross-origin` sur `/`, `/index.html`, `/direct.html`, `/direct-admin.html` et `/direct-consoles.html`. Les autres paramètres, caches, CSP, rewrites, permissions, fonctions et règles restent identiques. Aucun accord PROD A3.6a.

## Contrat et budget

Le flag `approved_a3_http_headers` du workflow TEST commun accepte exclusivement les empreintes complètes avant/après des dix couples approuvés. Lancement manuel, Hosting seul, dernier main, première tentative et aucune autre autorisation sensible. Un main plus récent n’hérite pas de cet accord et aucun suivi automatique n’est créé. Sélection backend complète, preuves CI et conservation des révisions restent obligatoires ; aucune fonction n’est publiée par ce lot. Les refus ordinaires et PROD restent inchangés.

Aucune lecture ou écriture métier ajoutée par le diff. Les deux routes d’accueil sont réécrites vers le lecteur NAP : la recette initiale utilisait un fournisseur fictif. Antoine a ensuite explicitement autorisé le contrôle HTTP réel, limité aux deux sondes HEAD TEST décrites ci-dessous. Les trois pages Direct sont contrôlables par requêtes HTTP statiques sans exécuter leur JavaScript. Aucun fichier sportif ni compte réel n’est utilisé pour la recette ; le complément HEAD consulte le lecteur public NAP sans écriture.

## Contrôles et limites

Tests hors ligne du diff entier, refus d’une route globale, d’une CSP, d’un cache, d’une autre source/configuration, d’un projet PROD ou d’un lancement automatique. CI complète requise selon le circuit actuel. Après TEST : vérifier les en-têtes et Content-Type des pages statiques ; le complément HEAD réel autorisé ci-dessous couvre désormais les en-têtes des deux réponses d’accueil, sans télécharger leur contenu. Les tests navigateur utilisent uniquement des services fictifs ; ils ne valent pas recette utilisateur ni preuve d’intégration NAP.

## Preuves TEST du 17 novembre 2026

[#950](https://github.com/ffessmnap/LivePalmes/pull/950), candidat intégré `709cd01c4cba11dde42991a19a59f2795e9432b2`. [CI PR](https://github.com/ffessmnap/LivePalmes/actions/runs/44026898717) et [CI main](https://github.com/ffessmnap/LivePalmes/actions/runs/44027564056) complètes réussies : application, publication, navigateur hors ligne et synthèse obligatoire. Les sept tests HTTP ciblés, douze de coordination et cinq de régression cache ont réussi. Le premier échec publication a conduit à corriger la liste de couverture à treize commandes, sans retirer les douze existantes.

[Publication TEST commune](https://github.com/ffessmnap/LivePalmes/actions/runs/44028122090) réussie, de 06 h 01 min 09 s à 06 h 02 min 56 s UTC ; cette durée de run ne représente pas le délai complet de livraison. Les preuves CI du candidat exact ont été réutilisées. Calcul backend complet : zéro fonction sélectionnée sur les 109 éligibles, 121 révisions prouvées et conservées, toutes ACTIVE. Aucun déploiement de fonction ou règle. Hosting `sites/livepalmes-test/versions/88a1b62af54e95b3`, release `1794895354772000`.

Artefact `test-proof` ID `14304331502`, téléchargé et authentifié par son digest GitHub : ZIP SHA-256 `27d2caa7cf605a79d64ca0e041d5bdf847f362ad2a3203c19ddfadababe4ce93`. Son candidat, sa vérification globale réussie et ses métadonnées Hosting/fonctions sont cohérents avec le run.

Contrôle HTTP frais sur `https://livepalmes-test.web.app`, sans exécution JavaScript : `/direct.html`, `/direct-admin.html`, `/direct-consoles.html` répondent 200 en `text/html; charset=utf-8`. Les deux en-têtes attendus sont présents et les trois corps sont identiques aux blobs Git du candidat exact. Les deux routes d’accueil n’avaient pas été invoquées lors de ce premier contrôle ; le complément autorisé ci-dessous lève cette limite pour leurs en-têtes.

Livraison technique TEST confirmée. Validation utilisateur reçue le 17 novembre 2026 : Antoine indique « Test 3.6 ok » après la recette demandée sur les trois pages Direct du candidat TEST ci-dessus. Les appareils et vérifications détaillées ne sont pas précisés ; aucun contrôle supplémentaire n’est attribué à ce retour. Le contrôle complémentaire ci-dessous vérifie leurs en-têtes HTTP réels ; il ne constitue pas une recette du contenu NAP. Aucun accord ni déploiement PROD A3.6a.

## Complément HTTP autorisé — accueil TEST

Le 17 novembre, Antoine indique « je donne mon accord, resoud le controle, on continue le plan ». Deux sondes HEAD séquentielles, sans paramètre, redirection, JavaScript, cookie ou identité utilisateur, ont été effectuées sur TEST à **07 h 17 min 35 s Europe/Paris**. Elles ne téléchargent aucun corps de page, document ou fichier sportif.

Les deux routes `/` et `/index.html` répondent **200**, `Content-Type: text/html; charset=utf-8`, `X-Content-Type-Options: nosniff` et `Referrer-Policy: strict-origin-when-cross-origin`. Le serveur confirme `X-LivePalmes-Home-Source: nap-server-html` et `Cache-Control: private, no-store` ; zéro octet de corps reçu. Le contrôle des en-têtes sur les cinq routes du lot est terminé, sans correctif ni redéploiement.

Budget préalablement vérifié dans le lecteur : jusqu’à deux fenêtres calendrier indexées de 501 candidats et une sélection documentaire de sept lignes par chargement à froid, cache mémoire de cinq minutes. Pour les deux sondes : au maximum six requêtes SQL, 2 018 lignes candidates retournées avant les jointures bornées ; moins si le cache est réutilisé. La base NAP réelle partagée peut être lue ; aucune écriture métier, compte, mail ou configuration n’est modifié. Aucun contenu NAP n’est conservé par la sonde.

## Bilan pour Infra et poursuite du plan

Le candidat TEST validé reste `709cd01c4cba11dde42991a19a59f2795e9432b2` ; les mises à jour suivantes sont documentaires. Les preuves TEST et la validation utilisateur ci-dessus restent celles de ce candidat. Dernière PROD authentifiée : [A3.3, run 43992942670](https://github.com/ffessmnap/LivePalmes/actions/runs/43992942670), candidat applicatif `43fbd5a9bb544199255de37dd239584f2c502d78`.

Pour A3.6a, seuls les dix couples en-tête/route sont à promouvoir. Aucun changement de fonction, règle, droit, donnée, mail ou scheduler n’est demandé. La sélection backend attendue vide doit être recalculée et prouvée par le circuit, jamais imposée manuellement. Retour arrière : retrait exact des dix couples, avec conservation des réglages plus récents.

La limite HTTP est résolue, mais le lot n’est pas annoncé « prêt PROD » : le contrat TEST ne vaut pas contrat PROD et le classificateur PROD refuse encore ce diff `firebase.json`. Infra doit préparer un contrat distinct fermé à ce seul diff, puis obtenir les preuves preflight/prérequis, sauvegarde et retour arrière selon la procédure. Aucun ancien contrat ni refus ne doit être élargi. L’accord de poursuite reçu dans cette conversation est consigné ; l’instruction de publication demeure à porter dans Infra conformément à AGENTS.md. Aucun workflow PROD n’a été lancé ici.

L’ordre du plan reste : clôturer la promotion A3.6a dans Infra, puis A3.8a (épinglage borné des workflows), avant le passage coordonné des sessions A3.4a. Les autres sous-lots sensibles gardent leurs décisions propres.

## Retour arrière et suite

Retirer uniquement les dix couples si leur état est encore celui du lot, sans écraser les réglages plus récents. Aucun retour arrière métier nécessaire. Avant PROD : bilan exact du candidat et des limites HTTP, recette/validation appropriée et accord explicite dans Infra ; ne pas étendre un ancien contrat sensible. Suivi : issue A3 #894 et registre existant.
