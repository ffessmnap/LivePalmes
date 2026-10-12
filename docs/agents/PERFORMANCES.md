# Performances, Records et MPF

<!-- description: Règles sensibles concernant les performances historiques, Records, MPF, données générées et coûts Firestore. -->

## Règles métier

Les calculs de Records, MPF, catégories, relais, classements, médailles et qualifications sont sensibles. Ne jamais inventer une règle sportive ni modifier leur logique sans validation explicite.

Les Records et MPF officiels sont stockés dans :

```text
competitions/livepalmes-active/performanceData/records
```

Le fallback statique correspondant est :

```text
performances/public/data/records-data.js
```

Après une modification publiée et validée, le fallback se synchronise avec :

```powershell
node tools/sync-records-from-firestore.js --write
```

Cette commande lit Firestore et écrit un fichier généré : ne pas la lancer sans validation de publication.

## Pipeline public

TOP, recherche, fiches nageurs et résultats lisent directement NAP via les endpoints bornés. Aucun fichier TOP historique ni reconstruction sportive Firestore ne doit être utilisé pour rafraîchir ces pages. Records/MPF gardent leur circuit distinct décrit ci-dessus.

Les sorties générées historiques et `outputs/` restent des artefacts de travail, pas une source courante NAP. Ne jamais les modifier à la main. Pour Records/MPF, corriger la source et obtenir la validation spécifique avant génération/publication Storage.

## Lectures NAP et Firebase conservé

Les lecteurs doivent rester indexables, bornés et paginés, sans N+1 ni reconstruction silencieuse ; voir `docs/OPTIMISATION_NAP.md`. Ne pas modifier les temps natifs pour faciliter un tri : interprétation numérique obligatoire. Firestore reste utilisé pour les comptes, le technique, Direct et la source Records/MPF. TEST partage la base NAP réelle ; un test d'écriture demande un accord spécifique.

## Références

Lire seulement les sections utiles des documents dont la description correspond à la tâche, notamment `docs/gestion-base-performances.md` et `docs/pipeline-performances-publiques.md`. Pour toute publication ou migration, appliquer aussi `docs/agents/PUBLICATION.md`.
