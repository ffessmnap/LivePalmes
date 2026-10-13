# Performances, Records et MPF

<!-- description: Règles sensibles concernant les performances historiques, Records, MPF, données générées et coûts Firestore. -->

## Règles métier

Les calculs de Records, MPF, catégories, relais, classements, médailles et qualifications sont sensibles. Ne jamais inventer une règle sportive ni modifier leur logique sans validation explicite.

Les Records et MPF officiels utilisent les compléments NAP `livepalmes_records_versions` et `livepalmes_records_current`, via le lecteur public et les actions d'administration existantes. Aucun recalcul sportif ni nouvelle règle de droits.

Le fichier historique `records-data.js` et ses outils de synchronisation Firestore ont été retirés du dépôt après recette TEST du découplage. Git conserve les versions précédentes pour retour arrière ; les nettoyages Storage font l'objet d'accords distincts et de sauvegardes, recensés dans `docs/pipeline-performances-publiques.md` et `docs/releases/EVOLUTIONS.md`. Les pages Records/MPF signalent l'échec du lecteur NAP ; la fiche nageur reste sans repères Records périmés, avec un avertissement dans la console. Aucun repli sur une copie sportive historique.

## Pipeline public

TOP, recherche, fiches nageurs et résultats lisent directement NAP via les endpoints bornés. Aucun fichier TOP historique ni reconstruction sportive Firestore ne doit être utilisé pour rafraîchir ces pages. Records/MPF gardent leur circuit distinct décrit ci-dessus.

Les sorties générées historiques et `outputs/` restent des artefacts de travail, pas une source courante NAP. Ne jamais les modifier à la main. Pour Records/MPF, toute modification de la source NAP passe par les actions d'administration existantes et une validation spécifique. Ne pas relancer de génération ou publication Storage historique pour actualiser les Records/MPF.

## Lectures NAP et Firebase conservé

Les lecteurs doivent rester indexables, bornés et paginés, sans N+1 ni reconstruction silencieuse ; voir `docs/OPTIMISATION_NAP.md`. Ne pas modifier les temps natifs pour faciliter un tri : interprétation numérique obligatoire. Firestore reste utilisé pour les comptes, le technique et Direct ; les versions officielles Records/MPF sont dans NAP. TEST partage la base NAP réelle ; un test d'écriture demande un accord spécifique.

## Références

Lire seulement les sections utiles des documents dont la description correspond à la tâche, notamment `docs/gestion-base-performances.md` et `docs/pipeline-performances-publiques.md`. Pour toute publication ou migration, appliquer aussi `docs/agents/PUBLICATION.md`.
