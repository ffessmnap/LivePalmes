# Audit A3 — cloisonnement des identifiants GitHub

<!-- description: Contrat du premier sous-lot A3 : environnements GitHub des clés existantes, transfert chiffré ponctuel, contrôles et préservation des sauvegardes A2. -->

## Résultat vérifié le 16 novembre 2026

**A3.1 livré et vérifié ; le chantier A3 complet reste ouvert.** Les quatre secrets de compte de service ont été retirés du niveau dépôt après copie dans les six destinations du tableau ci-dessous. `production` et `firebase-test` n'acceptent que `main`. `firebase-preview` n'accepte que les références de PR et exige l'approbation du propriétaire, sans contournement administrateur.

- Préparation intégrée dans [#930](https://github.com/ffessmnap/LivePalmes/pull/930), [CI PR complète réussie](https://github.com/ffessmnap/LivePalmes/actions/runs/43878946427). [CI complète main, tentative 2 réussie](https://github.com/ffessmnap/LivePalmes/actions/runs/43879841676/attempts/2), après annulation automatique de la première tentative par l'avancement documentaire A2. [CI de la tête documentaire suivante réussie](https://github.com/ffessmnap/LivePalmes/actions/runs/43880302171).
- Accord spécifique obtenu pour le transfert temporaire chiffré vers un dossier local hors OneDrive, le déchiffrement uniquement en mémoire, la copie inchangée des identifiants et le nettoyage final. [Transfert initial réussi](https://github.com/ffessmnap/LivePalmes/actions/runs/43882836034). Aucun JSON de compte en clair écrit ou affiché.
- Comparaisons avant retrait réussies pour [PROD](https://github.com/ffessmnap/LivePalmes/actions/runs/43883145997) et [TEST](https://github.com/ffessmnap/LivePalmes/actions/runs/43883152359), puis après retrait pour [PROD](https://github.com/ffessmnap/LivePalmes/actions/runs/43884072790) et [TEST](https://github.com/ffessmnap/LivePalmes/actions/runs/43884079549). Chaque paquet a été authentifié et rattaché au run et aux sources contrôlés avant comparaison en mémoire. Le CLI a retiré des blancs externes autour de certains JSON ; le contrôle conserve une égalité stricte de tous les champs, y compris la clé privée complète et son identifiant. Une différence interne est refusée. Aucun contenu de clé n'a été normalisé ou renouvelé.
- Métadonnées finales : zéro copie des quatre noms au niveau dépôt, six copies attendues dans les trois coffres, cinq artefacts de transfert supprimés, interrupteur `A3_SECRET_TRANSFER_ENABLED=false`, workflow ponctuel `disabled_manually`. Paquets locaux, source temporaire protégée et clé de transport retirés ; seuls des reçus sans valeurs de secrets sont conservés.

Aucun déploiement applicatif ni changement des comptes, rôles Google, données ou sauvegardes A2. La clé privée backend PROD reste identique : le chiffrement historique des archives de retour arrière est préservé. L'aperçu facultatif des PR demandera désormais une approbation ; sa configuration a été vérifiée sans publier de site ni approuver automatiquement une exécution.

## Périmètre et accord

Antoine autorise le premier sous-lot A3 : cloisonner les identifiants et les accès GitHub, sans rotation de clé ni perturbation des sauvegardes A2. Les constats concernés sont DEV-1 et DEV-4. Le code applicatif, les rôles Google, les données NAP/Firebase, les déploiements et la clé de chiffrement du retour arrière restent inchangés.

La livraison des workflows et la configuration effective des coffres sont deux étapes distinctes. Leur état et leurs preuves sont suivis dans [A3 #894](https://github.com/ffessmnap/LivePalmes/issues/894). Une PR fusionnée ne prouve pas le déplacement des secrets.

## Répartition des quatre clés existantes

| Secret Actions | Environnements autorisés |
| --- | --- |
| `FIREBASE_SERVICE_ACCOUNT_LIVEPALMES` | `production` |
| `FIREBASE_SERVICE_ACCOUNT_LIVEPALMES_BACKEND` | `production` |
| `FIREBASE_SERVICE_ACCOUNT_LIVEPALMES_TEST_BACKEND` | `firebase-test` et `production` pour les traitements mixtes existants |
| `FIREBASE_SERVICE_ACCOUNT_LIVEPALMES_TEST` | `firebase-test` et `firebase-preview` |

Les quatre clés sont retirées du niveau dépôt seulement après copie et vérification des destinations. L'éventuel secret `FIREBASE_SERVICE_ACCOUNT_LIVEPALMES_PROD_READONLY` reste autorisé uniquement dans `production` ; aucun nouveau secret ou rôle de lecture PROD n'est créé dans ce lot.

`production` garde sa restriction à `main`. `firebase-test` est limité à `main` ; l'ancienne exception de branche de qualification est retirée du workflow backend, sans réactiver son automate historique. Les treize migrations NAP et les deux traitements mixtes auparavant classés TEST utilisent désormais `production`, car ils concernent des données réelles. Leurs confirmations, versions attendues, sauvegardes et limitations métier restent conservées. Ce déplacement n'autorise pas leur exécution.

L'aperçu facultatif des PR utilise `firebase-preview`, limité à `refs/pull/*/merge` et soumis à l'approbation du propriétaire avant accès à sa seule clé TEST. Le label existant, la réussite de la vérification et la restriction aux PR du même dépôt restent exigés. La CI et TEST commun ne demandent pas cette approbation. Le nettoyage des aperçus terminés conserve le code de `main`, sans checkout de PR, dans `firebase-test` ; un push de ce fichier ne déclenche aucune suppression Hosting.

## Déplacement sans rotation

GitHub permet de consulter les noms et dates des secrets, pas de relire leur valeur. Le workflow ponctuel `a3-github-secret-confinement.yml` chiffre les valeurs existantes pour un destinataire public fixe dont l'empreinte est vérifiée. La clé privée de transport reste protégée par DPAPI sur le PC de l'opérateur et n'est jamais publiée. Il ne s'agit pas d'une nouvelle clé de compte Google.

Le transfert exige `main`, un lancement manuel, la première tentative et `A3_SECRET_TRANSFER_ENABLED=true`. Il n'appelle aucun service métier, ne déploie rien et n'authentifie aucun compte Google. Il n'installe aucune dépendance ; ses trois actions sont fixées à des commits complets. Seul un paquet RSA-OAEP-SHA256/AES-256-GCM authentifié est déposé comme artefact, conservé un jour. Aucun JSON de compte en clair n'est écrit ou affiché.

L'opérateur vérifie la provenance du run, le destinataire, l'intégrité et les identités des quatre valeurs. Il les transmet en mémoire à `gh secret set --env`, compare les mêmes valeurs via un second transfert des environnements `production` et `firebase-test`, puis retire les copies au niveau dépôt. Les métadonnées doivent confirmer les six copies attendues dans les trois environnements et l'absence des quatre noms au niveau dépôt. La clé utilisée par `production-backup-crypto.js` doit rester strictement identique.

À la fin, l'interrupteur est remis à `false`, le workflow de transfert désactivé et ses artefacts supprimés. Le paquet privé et la clé de transport protégée ne sont utiles qu'à la reprise de cette opération ; ne jamais réactiver ce transfert comme outil d'exploitation courant.

## Préservation d'A2

Les environnements `nap-backup`, `nap-backup-alerts` et `a2-firebase-backup`, leurs secrets dédiés, les dossiers Drive et les clés de chiffrement A2 ne sont pas modifiés. Les workflows A2 n'utilisent pas les quatre clés déplacées. Aucun changement de rôle ou de compte Google, aucune suppression d'archive et aucun essai de restauration réel ne sont inclus.

Les anciennes archives de retour arrière du code restent liées à la clé backend PROD existante : son déplacement de coffre conserve ses octets. Leur découplage et une éventuelle fédération d'identité appartiennent à un sous-lot ultérieur.

## Contrôles

`tests/github-credential-scope-tests.js`, inscrit dans le parcours publication existant, vérifie les environnements des jobs consommateurs, les refus de portée incorrecte, les identités, le destinataire et l'authentification du paquet chiffré. Les tests du backend TEST vérifient aussi le refus de l'ancienne branche de qualification. La CI obligatoire reste complète selon la sélection calculée, sans déploiement applicatif pour ces changements d'outillage.

Avant suppression des secrets dépôt, vérifier les traitements en cours et toutes les destinations ; après suppression, confirmer à nouveau les valeurs PROD/TEST et les restrictions GitHub. La seule configuration de l'aperçu est vérifiée sans publier un site ni approuver automatiquement un déploiement.
