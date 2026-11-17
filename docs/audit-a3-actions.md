# Audit A3.8a — épinglage borné des actions GitHub

<!-- description: Épinglage des actions en deux lots, versions officielles conservées et équivalence des workflows vérifiée avant intégration sans déploiement applicatif. -->

## Complément intégré le 17 novembre 2026

L’accord conditionnel global A3 du 17 novembre autorise la suite de l’épinglage. Après le premier lot intégré ci-dessous, le complément prépare les 224 références à tags restantes dans 34 workflows, notamment A2 et le circuit de publication jusque-là exclus. Le calcul porte sur les 56 fichiers courants de `main` `24bb82b1` : 343 références externes, dont 119 déjà figées. Deux des 36 fichiers auparavant exclus ne nécessitent aucun remplacement ; les vingt fichiers du premier lot restent identiques.

Les douze couples action/version courants ont été vérifiés dans leurs dépôts propriétaires. Les cinq références du premier lot conservent les commits confirmés le même jour ; les sept autres sont également relues, avec déréférencement du tag annoté Firebase. Les deux appels d’authentification ajoutés par la livraison A3.4a A sont inclus dans ce calcul frais. Les versions restent les mêmes :

| Action | Version | Commit |
| --- | --- | --- |
| FirebaseExtended/action-hosting-deploy | v0 | `500ac625ca2dd40cbd15f7659af953801858032a` |
| actions/cache | v4 | `0057852bfaa89a56745cba8c7296529d2fc39830` |
| actions/download-artifact | v4 | `d3f86a106a0bac45b974a628896c90dbdf5c8093` |
| actions/github-script | v8 | `ed597411d8f924073f98dfc5c65a23a2325f34cd` |
| actions/setup-java | v5 | `b6effb05e454b25005698d916606bdc6ffcbf961` |
| actions/setup-python | v6 | `ece7cb06caefa5fff74198d8649806c4678c61a1` |
| actions/upload-artifact | v7 | `cf430e030ddbb5b0abf93d22962f4752f3646cd9` |

Comparaison des arbres YAML complets des 56 workflows : égalité exacte après la seule substitution des références officielles. Permissions, commandes, événements, environnements, secrets, contrôles et versions restent conservés. Les 343 références externes du candidat sont toutes figées ; les références locales de workflows restent locales. Aucun workflow opérationnel n’est lancé pour cette vérification. Une assertion historique de checkout est adaptée à la lecture YAML et au SHA exact en conservant ref candidat, historique Git complet et absence de credentials persistés.

Les 67 tests du cycle de livraison et le test de checkout adapté passent localement, après ajout à la copie isolée du parseur déjà verrouillé manquant. Aucun test ni garde-fou retiré. Après clôture A3.4a A, [#964](https://github.com/ffessmnap/LivePalmes/pull/964) est intégrée au commit `977db98c` : [CI PR complète](https://github.com/ffessmnap/LivePalmes/actions/runs/44074336205), [CI main complète](https://github.com/ffessmnap/LivePalmes/actions/runs/44075635270) et [coordinateur](https://github.com/ffessmnap/LivePalmes/actions/runs/44076349803) réussis, sans déploiement applicatif. Les deux workflows de collecte administrative ajoutés ensuite par #963 utilisent déjà leurs dix actions figées : 353 références externes sur 58 workflows à ce stade. Après les contrôles Infra B intégrés sur `5d82dc47`, une lecture YAML complète relève 382 références externes dans les mêmes 58 workflows, toutes figées sur des commits complets ; les ajouts Infra conservent les versions déjà qualifiées. L’identité WIF et la séparation des clés d’archives A3.8b restent un besoin distinct.

Les sections suivantes conservent la preuve du premier lot et ses exclusions initiales.

## Périmètre

Après la clôture PROD A3.6a, Antoine demande de poursuivre le plan préparé. Le lot reprend les vingt fichiers ci-dessous, inchangés depuis la préparation privée au commit `43fbd5a9bb544199255de37dd239584f2c502d78`, sur le main stable `07e8abba0ece0ca07128e2065075cd532251765d`. Les exclusions A2 et celles du circuit potentiellement mobilisé par A3.3 sont conservées même après sa clôture.

Remplacer seulement 116 références de tags par les commits complets correspondants, avec un commentaire de version. Propriétaires, actions et versions demandées sont conservés ; aucun autre octet logique des workflows ne change. Inventaire courant avant modification : 341 références externes, dont 3 déjà épinglées ; 222 références à tags restent hors lot. Ce sous-lot ne clôt pas à lui seul tout A3.8.

## Références confirmées le 17 novembre 2026

Les cinq tags effectivement utilisés par le sous-lot ont été relus par GET sur `api.github.com/repos/<owner>/<repo>/git/ref/tags/<tag>`, dans leurs dépôts propriétaires, et pointent directement sur les commits ci-dessous. Toute divergence aurait bloqué l’application ; aucune sélection de nouvelle version.

| Action | Version conservée | Commit |
| --- | --- | --- |
| actions/checkout | v7 | `3d3c42e5aac5ba805825da76410c181273ba90b1` |
| actions/setup-node | v7 | `949feb2413d6458794dcd2491c4babbbce0c15c1` |
| actions/upload-artifact | v4 | `ea165f8d65b6e75b540449e92b4886f43607fa02` |
| google-github-actions/auth | v3 | `7c6bc770dae815cd3e89ee6cdf493a5fab2cc093` |
| google-github-actions/setup-gcloud | v3 | `aa5489c8933f4cc7a4f7d45035b3b1440c9c10db` |

L’épinglage rend la référence immuable ; il ne constitue pas un audit du contenu complet de ces actions. Lors d’une future mise à jour, relire la provenance et la version proposée plutôt que déplacer silencieusement un SHA.

## Vingt workflows concernés

- `.github/workflows/livepalmes-direct-data.yml`
- `.github/workflows/livepalmes-document-themes-inspect.yml`
- `.github/workflows/livepalmes-home-events-test-retire.yml`
- `.github/workflows/livepalmes-home-events-test.yml`
- `.github/workflows/livepalmes-home-nap-measure.yml`
- `.github/workflows/livepalmes-scheduler-iam-prepare.yml`
- `.github/workflows/nap-authorized-closure-schema.yml`
- `.github/workflows/nap-authorized-direct-schema.yml`
- `.github/workflows/nap-authorized-dtn-schema.yml`
- `.github/workflows/nap-authorized-dtn-settings.yml`
- `.github/workflows/nap-authorized-index.yml`
- `.github/workflows/nap-authorized-license-reports.yml`
- `.github/workflows/nap-authorized-nora-performance-clubs.yml`
- `.github/workflows/nap-authorized-people-schema.yml`
- `.github/workflows/nap-authorized-portal-indexes.yml`
- `.github/workflows/nap-authorized-portal-schema.yml`
- `.github/workflows/nap-authorized-swimmer-correction.yml`
- `.github/workflows/nap-authorized-swimmer-ns-schema.yml`
- `.github/workflows/nap-authorized-team-entry-schema.yml`
- `.github/workflows/nap-club-account-emails.yml`

## Exclusions et garanties

A2 : `a2-firebase-backup.yml`, `a2-nap-documents.yml`, `nap-backup-alert.yml`, `nap-backup-drive.yml`. Sont aussi conservés tous les workflows `a3-*`, `livepalmes-production*`, `livepalmes-test-*`, `livepalmes-verification*`, `livepalmes-qualification*`, `livepalmes-release*` et `livepalmes-preview*`.

Permissions, événements, environnements, conditions, concurrence, entrées, commandes, secrets référencés, gardes de version et contrôles restent identiques. Aucun contrat scellé, empreinte de garantie, sélecteur CI, politique ou workflow de publication n’est modifié. Les nouvelles références ne lancent pas les workflows opérationnels : aucune migration, sauvegarde métier, opération IAM, envoi ou écriture de données n’est déclenché pour ce lot.

## Vérifications et livraison

Contrôle local réussi : 116 lignes remplacées dans vingt workflows ; structure YAML complète identique après résolution des seules valeurs uses ; empreintes des 36 autres workflows inchangées. Suites existantes hors réseau de sauvegarde chiffrée et de préparation IAM (cinq tests Python) réussies. Les contrôles du candidat exact ont ensuite réussi ; l’assertion Auth adaptée est décrite ci-dessous, sans suppression de garde-fou. La recette fictive de préparation ne remplace pas cette CI. Les workflows opérationnels modifiés ne sont pas déclenchés pour une vérification de convenance. La première CI a révélé une assertion encore liée au texte auth@v3 : elle vérifie désormais la structure YAML, l’unicité de l’étape d’authentification et son commit exact. Les contrôles du compte TEST, de la confirmation et des secrets restent conservés ; aucun garde-fou n’est retiré.

[#956](https://github.com/ffessmnap/LivePalmes/pull/956) intégrée sur `c28c3ebc390e5d5e53ce38543b7a27a801efdabd`. [CI PR corrigée](https://github.com/ffessmnap/LivePalmes/actions/runs/44039269791) et [CI main](https://github.com/ffessmnap/LivePalmes/actions/runs/44039914924) réussies : application, publication, navigateur hors ligne et synthèse obligatoire. Le premier run [44038597231](https://github.com/ffessmnap/LivePalmes/actions/runs/44038597231) conserve son échec initial ; la correction a été réalisée dans la même PR. [Coordination automatique 44040112181](https://github.com/ffessmnap/LivePalmes/actions/runs/44040112181) réussie, avec décision « Documentation/outillage uniquement : aucun deploiement TEST applicatif ». Aucun lancement des workflows opérationnels épinglés.

Une intégration d’outillage seule ne déclenche aucun déploiement applicatif TEST/PROD. Le résultat ne constitue pas une validation de services distants ou de règles métier. Suivi et preuves finales : [registre](releases/EVOLUTIONS.md), issue A3 #894.

Retour arrière : restaurer seulement les références et commentaires du diff, en préservant les autres évolutions récentes. La suite A3.4a reste un chantier distinct avec ses accords et recettes propres.
