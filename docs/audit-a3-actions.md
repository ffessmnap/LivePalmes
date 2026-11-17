# Audit A3.8a — épinglage borné des actions GitHub

<!-- description: Sous-lot de 116 références dans vingt workflows, versions officielles figées, exclusions A2/publication conservées et vérifications sans déploiement. -->

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

Contrôle local réussi : 116 lignes remplacées dans vingt workflows ; structure YAML complète identique après résolution des seules valeurs uses ; empreintes des 36 autres workflows inchangées. Suites existantes hors réseau de sauvegarde chiffrée et de préparation IAM (cinq tests Python) réussies. CI obligatoire du candidat exact encore à confirmer avant intégration ; aucun contrôle modifié pour accepter le lot. La recette fictive de préparation ne remplace pas cette CI. Les workflows opérationnels modifiés ne sont pas déclenchés pour une vérification de convenance.

Une intégration d’outillage seule ne déclenche aucun déploiement applicatif TEST/PROD. Le résultat ne constitue pas une validation de services distants ou de règles métier. Suivi et preuves finales : [registre](releases/EVOLUTIONS.md), issue A3 #894.

Retour arrière : restaurer seulement les références et commentaires du diff, en préservant les autres évolutions récentes. La suite A3.4a reste un chantier distinct avec ses accords et recettes propres.
