# Performances, Records et MPF

<!-- description: Règles sensibles concernant les performances historiques, Records, MPF, données générées et coûts Firestore. -->

## Règles métier

Les calculs de Records, MPF, catégories, relais, classements, médailles et qualifications sont sensibles. Ne jamais inventer une règle sportive ni modifier leur logique sans validation explicite.

Les Records et MPF officiels utilisent les compléments NAP `livepalmes_records_versions` et `livepalmes_records_current`, via le lecteur public et les actions d'administration existantes. Aucun recalcul sportif ni nouvelle règle de droits.

Les anciennes données Firebase et la copie `performances/public/data/records-data.js` sont conservées temporairement pour retour arrière, sans chargement par les pages actuelles. Ne plus synchroniser cette copie depuis Firestore. Le nettoyage autorisé se déroule en deux étapes : découplage et recette TEST, puis retrait des anciens fichiers/outils après vérification.

## Pipeline public

TOP, recherche, fiches nageurs et résultats lisent directement NAP via les endpoints bornés. Aucun fichier TOP historique ni reconstruction sportive Firestore ne doit être utilisé pour rafraîchir ces pages. Records/MPF gardent leur circuit distinct décrit ci-dessus.

Les sorties générées historiques et `outputs/` restent des artefacts de travail, pas une source courante NAP. Ne jamais les modifier à la main. Pour Records/MPF, corriger la source et obtenir la validation spécifique avant génération/publication Storage.

## Lectures NAP et Firebase conservé

Les lecteurs doivent rester indexables, bornés et paginés, sans N+1 ni reconstruction silencieuse ; voir `docs/OPTIMISATION_NAP.md`. Ne pas modifier les temps natifs pour faciliter un tri : interprétation numérique obligatoire. Firestore reste utilisé pour les comptes, le technique, Direct et la source Records/MPF. TEST partage la base NAP réelle ; un test d'écriture demande un accord spécifique.

## Références

Lire seulement les sections utiles des documents dont la description correspond à la tâche, notamment `docs/gestion-base-performances.md` et `docs/pipeline-performances-publiques.md`. Pour toute publication ou migration, appliquer aussi `docs/agents/PUBLICATION.md`.
