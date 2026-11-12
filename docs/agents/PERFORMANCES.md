# Performances, Records et MPF

<!-- description: Sources NAP, règles sensibles des performances et Records/MPF, budgets de lectures et limites des anciens pipelines. -->

## Règles métier

Une retouche de présentation des pages performances ou Records/MPF relève du parcours ordinaire si elle conserve les données accessibles, leur signification et les règles métier.

Modifier les catégories retenues, les références affichées, les critères de classement, l'éligibilité ou les calculs constitue un changement sensible, même si l'implémentation est uniquement côté navigateur.

Les calculs de Records, MPF, catégories, relais, classements, médailles et qualifications sont sensibles. Ne jamais inventer une règle sportive ni modifier leur logique sans validation explicite.

Les Records et MPF officiels utilisent les compléments NAP `livepalmes_records_versions` et `livepalmes_records_current`, via le lecteur public et les actions d'administration existantes. Aucun recalcul sportif ni nouvelle règle de droits.

Le fichier historique `records-data.js` et ses outils de synchronisation Firestore ont été retirés du dépôt après recette TEST du découplage. Git conserve les versions précédentes pour retour arrière ; les nettoyages Storage font l'objet d'accords distincts et de sauvegardes, recensés dans `docs/pipeline-performances-publiques.md` et `docs/releases/EVOLUTIONS.md`. Les pages Records/MPF signalent l'échec du lecteur NAP ; la fiche nageur reste sans repères Records périmés, avec un avertissement dans la console. Aucun repli sur une copie sportive historique.

## Pipeline public

TOP, recherche, fiches nageurs et résultats lisent directement NAP via les endpoints bornés. Aucun fichier TOP historique ni reconstruction sportive Firestore ne doit être utilisé pour rafraîchir ces pages. Records/MPF gardent leur circuit distinct décrit ci-dessus.

Les sorties générées historiques et `outputs/` restent des artefacts de travail, pas une source courante NAP. Ne jamais les modifier à la main. Pour Records/MPF, toute modification de la source NAP passe par les actions d'administration existantes et une validation spécifique. Ne pas relancer de génération ou publication Storage historique pour actualiser les Records/MPF.

## Lectures NAP et Firebase conservé

Les lecteurs doivent rester indexables, bornés et paginés, sans N+1 ni reconstruction silencieuse ; voir `docs/OPTIMISATION_NAP.md`. Ne pas modifier les temps natifs pour faciliter un tri : interprétation numérique obligatoire. Les versions officielles Records/MPF sont dans NAP.

Firebase conserve ses services existants, notamment les comptes, l'authentification et les usages techniques. Le nouveau Direct utilise ses tables NAP dédiées ; le dispositif historique conserve ses propres usages Firestore.

TEST partage la base NAP réelle. Une écriture de test sur cette base exige un accord spécifique.

## Références

Lire seulement les sections utiles des documents dont la description correspond à la tâche, notamment `docs/gestion-base-performances.md` et `docs/pipeline-performances-publiques.md`. Pour toute publication ou migration, appliquer aussi `docs/agents/PUBLICATION.md`.
