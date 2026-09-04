# Compte administrateur de recette Firebase TEST

## Pourquoi un bootstrap est nécessaire

L'interface « Utilisateurs et habilitations » appelle `createOrUpdateAccessUser`. Cette Function est la méthode normale et cohérente : elle synchronise le profil `users/{uid}`, les custom claims, les délégations `accessGrants`, l'annuaire et l'audit. Elle exige cependant déjà le claim `livepalmesCapabilities.admin.full` (ou un UID administrateur historique).

Le projet `livepalmes-test` ne déclare aucun administrateur historique. Le tout premier administrateur TEST ne peut donc pas se créer lui-même depuis l'interface. Une fois ce premier compte préparé, toutes les modifications ultérieures doivent passer par « Utilisateurs et habilitations ».

## Bootstrap strictement TEST

`tools/bootstrap-firebase-test-access-user.js` prépare un unique compte Firebase Authentication existant. Il ne crée pas de compte, n'envoie aucun email, ne déploie aucune Function et ne touche à aucun scheduler.

Le script refuse toute écriture sauf si les conditions suivantes sont simultanément satisfaites :

- `--project livepalmes-test` ;
- `TARGET_FIREBASE_PROJECT=livepalmes-test` ;
- credential dont le `project_id` est exactement `livepalmes-test` ;
- `--apply` accompagné de `--confirm livepalmes-test-access-bootstrap` ;
- UID, prénom, nom, club et région explicitement renseignés.

Sans `--apply`, le script effectue seulement une lecture du compte Auth TEST et affiche le plan, sans adresse email ni écriture.

## Procédure manuelle

1. Créer manuellement le compte de recette dans Firebase Authentication **du projet TEST**, sans utiliser d'adresse de production.
2. Relever son UID.
3. Préparer localement un credential de service dédié au projet TEST et limité aux permissions Auth/Firestore nécessaires.
4. Exécuter d'abord le dry-run :

```bash
TARGET_FIREBASE_PROJECT=livepalmes-test \
GOOGLE_APPLICATION_CREDENTIALS=/chemin/credential-livepalmes-test.json \
node tools/bootstrap-firebase-test-access-user.js \
  --project livepalmes-test \
  --uid UID_DU_COMPTE_TEST \
  --first-name RECETTE \
  --last-name LIVEPALMES \
  --club-id CLUB_TEST \
  --club-name "Club de recette" \
  --region-id REGION_TEST \
  --license-number LICENCE_TEST
```

5. Vérifier le projet et l'UID affichés, puis reprendre exactement la commande avec :

```text
--apply --confirm livepalmes-test-access-bootstrap
```

6. Se déconnecter puis se reconnecter afin de renouveler le token Firebase.
7. Contrôler dans « Mon compte » puis « Utilisateurs et habilitations » que les dix capacités sont visibles.

## Écritures réalisées

Le bootstrap pose les dix capacités à `true` dans `users/{uid}.capabilities` et dans le claim `livepalmesCapabilities`. Il pose aussi `livepalmesAccess`, `livepalmesConsoleAccess`, le statut actif, les périmètres club/région/national, les clés d'annuaire, les dix documents `accessGrants` et une trace `accessUser.testBootstrap`.

Si l'écriture Firestore échoue après la mise à jour Auth, le script restaure les claims précédents. Après succès, il relit Auth et Firestore et refuse de conclure si les deux cartes de capacités diffèrent.

Le bootstrap ne valide aucun PIN de console : le PIN temporaire reste un second contrôle indépendant.
