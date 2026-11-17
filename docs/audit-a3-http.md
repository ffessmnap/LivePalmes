# Audit A3.6a — en-têtes HTTP minimaux

<!-- description: Diff HTTP fermé sur cinq routes, contrat Hosting TEST manuel, vérifications sans appel métier et limites avant PROD. -->

## Périmètre autorisé

Antoine a explicitement autorisé le 17 novembre 2026 l’application d’A3.6a, son contrat TEST fermé, commit, PR, CI, intégration et publication TEST, après la clôture PROD A3.3. Ajouter seulement `X-Content-Type-Options: nosniff` et `Referrer-Policy: strict-origin-when-cross-origin` sur `/`, `/index.html`, `/direct.html`, `/direct-admin.html` et `/direct-consoles.html`. Les autres paramètres, caches, CSP, rewrites, permissions, fonctions et règles restent identiques. Aucun accord PROD A3.6a.

## Contrat et budget

Le flag `approved_a3_http_headers` du workflow TEST commun accepte exclusivement les empreintes complètes avant/après des dix couples approuvés. Lancement manuel, Hosting seul, dernier main, première tentative et aucune autre autorisation sensible. Un main plus récent n’hérite pas de cet accord et aucun suivi automatique n’est créé. Sélection backend complète, preuves CI et conservation des révisions restent obligatoires ; aucune fonction n’est publiée par ce lot. Les refus ordinaires et PROD restent inchangés.

Aucune lecture ou écriture métier ajoutée par le diff. Les deux routes d’accueil sont réécrites vers le lecteur NAP : leur test utilise un fournisseur fictif et ne doit pas invoquer le lecteur réel. Les trois pages Direct sont contrôlables par requêtes HTTP statiques sans exécuter leur JavaScript. Aucun fichier sportif ni compte réel n’est utilisé pour la recette.

## Contrôles et limites

Tests hors ligne du diff entier, refus d’une route globale, d’une CSP, d’un cache, d’une autre source/configuration, d’un projet PROD ou d’un lancement automatique. CI complète requise selon le circuit actuel. Après TEST : vérifier les en-têtes et Content-Type des pages statiques ; les deux réponses d’accueil réelles restent non vérifiées dans ce périmètre sans appel métier autorisé. Les tests navigateur utilisent uniquement des services fictifs ; ils ne valent pas recette utilisateur ni preuve d’intégration NAP.

## Retour arrière et suite

Retirer uniquement les dix couples si leur état est encore celui du lot, sans écraser les réglages plus récents. Aucun retour arrière métier nécessaire. Avant PROD : bilan exact du candidat et des limites HTTP, recette/validation appropriée et accord explicite dans Infra ; ne pas étendre un ancien contrat sensible. Suivi : issue A3 #894 et registre existant.
