# Archivage des 25 tables historiques IntraNAP

<!-- description: Périmètre des 25 tables historiques archivées le 28 octobre 2026, dépendances retirées du code, vérifications et conditions avant suppression NAP. -->

Antoine autorise l'archivage des 25 tables, la vérification de l'archive,
l'adaptation et les tests de LivePalmes avant leur suppression. Les cinq tables
d'import restent en place. NAP est commun à TEST et PROD : un succès de tests
locaux ou un déploiement TEST seul ne permet pas de supprimer ces tables tant
que les fonctions PROD concernées utilisent encore l'ancien code.

## Périmètre et archive

| Origine | Tables |
| --- | --- |
| Classement CNC | `cnc_club`, `cnc_edf`, `cnc_items`, `cnc_medailles`, `cnc_nageurs`, `cnc_summaries` |
| Référentiels historiques | `clubs_cnnp`, `old_club` |
| Qualifications historiques | `qualifs`, `qualif_types` |
| Anciennes structures | `sessions`, `open_courses`, `winpalme_serie` |
| Droits IntraNAP | `clubs_users`, `compet_access` |
| Contrôles historiques des nageurs | `documents_controles`, `nageurs_derogations`, `nageurs_enf`, `nageurs_verifications` |
| Anciennes fonctions des compétitions | `compet_enf`, `compet_file`, `compet_open`, `nbconnect`, `open_nageurs`, `outclassing` |

[ZIP vérifié dans Archives base NAP](https://drive.google.com/file/d/1TNOF0KLC2IaBj2IWAXGXTmjySMoQYERW/view)
et [rapport JSON de vérification](https://drive.google.com/file/d/18vxKCUBPlUcUYKR-LEdKey4ahOgEOu8P/view).
Le ZIP contient 25 définitions actuelles avec index/options et 25 scripts de
données : 65 930 lignes, dont deux tables vides (`documents_controles`, `sessions`).
Comptages et quatre sommes de segments SHA-256 des lignes concordent entre
MySQL et l'export ; les valeurs générées sont relues et comparées. Le ZIP est
rouvert et ses entrées vérifiées ; sa copie téléchargée depuis Drive est identique.
SHA-256 : `f331d6e99d380f9082eef020b995ec266dec9313c0e84848214225aa36254b3a`.

Une restauration sur un serveur MySQL isolé n'a pas été testée. Les champs de
chemins sont conservés, mais les fichiers externes eux-mêmes ne sont pas dans
l'archive SQL, notamment `317-20080401.pdf` référencé par `compet_file` et les
chemins de `winpalme_serie` et `open_nageurs`. Le README décrit cette limite et
les liens avec les nomenclatures du précédent ZIP IntraNAP. Après une évolution
des fiches courantes, une restauration peut demander de réconcilier leurs anciens
identifiants. Ce ZIP partiel ne remplace pas la sauvegarde générale.

## Adaptation et budget

- Fusion de nageurs : retrait des sept tables historiques de la capture, des
  verrous, des modifications et du contrôle de structure. Les références aux
  résultats, engagements, licences, dérogations actuelles et `txt_nageurs` restent
  contrôlées. Un ancien plan de fusion sauvegardé incluant les anciennes tables
  est refusé avant connexion et écriture ; sa reprise reste une opération manuelle.
- Suppression de clubs : sept anciennes références retirées ; 17 contrôles
  restent. Les anciens droits IntraNAP ne participent plus au contrôle ; les
  comptes/droits actuels gardent leur vérification distincte.
- Suppression de compétitions : 14 anciennes références retirées ; 34 restent.
  L'aperçu ne compte plus `compet_file`. Résultats, inscriptions, imports conservés
  et historiques LivePalmes continuent de bloquer les suppressions inappropriées.
- Diagnostics : les anciennes qualifications, clubs et CNC ne sont plus lus ;
  la liste de structure passe de 29 à 23 tables. Les anciens champs de réponse
  du diagnostic clubs/CNC restent des tableaux vides pour conserver sa forme.
- Préparateur de schéma de fusion : sept index conservés ; une nouvelle chaîne
  de confirmation refuse l'ancien accord de quatorze index. Aucun préparateur
  de schéma n'est exécuté par cette adaptation.

Ouverture et rafraîchissement ordinaires : aucun accès ajouté. Action de
suppression d'un club : jusqu'à sept lectures ciblées en moins ; compétition :
14 références en moins ; fusion : sept tables de moins dans la capture et les
vérifications. Les lectures conservées restent indexées et bornées ; plafonds
de 4 000 liens/500 Ko pour la fusion et de 2 000 lignes/500 Ko pour la suppression
d'une compétition maintenus. Aucune nouvelle requête ni reconstruction interactive.

## Contrôles et retrait de la base

Les fixtures des vrais exécuteurs refusent toute requête, tout verrou ou toute
demande de métadonnées ciblant une des 25 tables. Les tests vérifient aussi les
blocages par les imports conservés, les reprises de fusion, les sauvegardes
avant écriture, les pertes de réponse et les refus d'autorisation. Réseau externe
interdit pendant les tests. La CI globale requise et la livraison TEST doivent
être attestées sur le commit exact ; aucune validation utilisateur n'en est déduite.

Avant suppression réelle : suivre le bilan/accord PROD dans Infra, vérifier les
révisions en service, relire les comptages et empreintes des 25 tables et mettre
à jour l'archive si elles ont changé. Retirer uniquement ces 25 noms explicites,
puis comparer les listes avant/après. Conserver `txt_clubs`, `txt_import`,
`txt_nageurs`, `import_relais` et `winpalme_lignes` ainsi que les autres tables.
La présence de ces étapes dans ce document ne prouve pas leur exécution.
