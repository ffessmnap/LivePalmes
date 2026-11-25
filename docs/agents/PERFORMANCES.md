# Performances, Records et MPF

<!-- description: Sources NAP, règles sensibles des performances et Records/MPF, budgets de lectures et limites des anciens pipelines. -->

## Règles métier

Une retouche de présentation des pages performances ou Records/MPF relève du parcours ordinaire si elle conserve les données accessibles, leur signification et les règles métier.

Modifier les catégories retenues, les références affichées, les critères de classement, l'éligibilité ou les calculs constitue un changement sensible, même si l'implémentation est uniquement côté navigateur.

Les calculs de Records, MPF, catégories, relais, classements, médailles et qualifications sont sensibles. Ne jamais inventer une règle sportive ni modifier leur logique sans validation explicite.

Les Records et MPF officiels utilisent les compléments NAP `livepalmes_records_versions` et `livepalmes_records_current`, via le lecteur public et les actions d'administration existantes. Aucun recalcul sportif ni nouvelle règle de droits.

Le fichier historique `records-data.js` et ses outils de synchronisation Firestore ont été retirés du dépôt après recette TEST du découplage. Git conserve les versions précédentes pour retour arrière ; les nettoyages Storage font l'objet d'accords distincts et de sauvegardes, recensés dans `docs/pipeline-performances-publiques.md` et `docs/releases/EVOLUTIONS.md`. Les pages Records/MPF signalent l'échec du lecteur NAP ; la fiche nageur reste sans repères Records périmés, avec un avertissement dans la console. Aucun repli sur une copie sportive historique.

## Pipeline public

Sur la fiche nageur, la courbe active à l’ouverture relie une meilleure course complète par saison parmi les points retenus par les filtres. « Tous » combine les bassins. « 25 m » et « 50 m » limitent la courbe au bassin choisi. Une seule saison donne des points seuls et les passages sont exclus de la courbe.

La carrière affiche une ligne par catégorie pour l’épreuve choisie. « Tous » retient la meilleure course complète tous bassins confondus, y compris les performances historiques de 33 m. Les boutons 25 m et 50 m filtrent les chronos personnels et la population comparée. À l’ouverture, « Toutes les saisons connues » compare les saisons documentées dans NAP et la case des MPF et records en vigueur est décochée. « Saisons du nageur » limite le repère collectif aux saisons réellement nagées dans chaque catégorie, y compris sur d’autres épreuves.

Dans les deux cas, comparer à épreuve et sexe identiques. Retenir le club représenté sur la performance, identifié dans NAP et rattaché à un comité renseigné hors regroupement étranger. Chaque nageur compte une fois avec sa meilleure course complète sur la période et les bassins retenus. À partir de 20 nageurs, le lecteur fournit la médiane et les quartiles interpolés sur les temps triés, arrondis au centième. En dessous, il fournit seulement l’effectif. La MPF individuelle de la catégorie est affichée avec son temps, y compris quand le bassin est absent du référentiel. Les juniors ont aussi le RFJ, les seniors le RF, pour l’épreuve et le sexe concernés.

TOP, recherche, fiches nageurs et résultats lisent directement NAP via les endpoints bornés. Aucun fichier TOP historique ni reconstruction sportive Firestore ne doit être utilisé pour rafraîchir ces pages. Records/MPF gardent leur circuit distinct décrit ci-dessus.

Les sorties générées historiques et `outputs/` restent des artefacts de travail, pas une source courante NAP. Ne jamais les modifier à la main. Pour Records/MPF, toute modification de la source NAP passe par les actions d'administration existantes et une validation spécifique. Ne pas relancer de génération ou publication Storage historique pour actualiser les Records/MPF.

Les records régionaux présentent le meilleur temps du TOP par épreuve individuelle et par sexe, pour une région et une catégorie ou toutes catégories. Tous les bassins et toutes les saisons sont réunis. Les ex æquo sont affichés une fois par nageur. Le comité du club de la performance est prioritaire, avec le repli du TOP sur le club de la fiche. Le résultat est calculé à la lecture. Les changements de performance sont visibles à la consultation suivante après expiration du cache de 60 secondes.

À l’ouverture, le référentiel TOP existant lit au plus 5 001 dates et 1 001 clubs. Une sélection, y compris après rechargement, appelle une fois le lecteur groupé. Hors cache, cinq SELECT au plus couvrent le référentiel (1 001 clubs), trois contrôles indexés (20 001 nageurs, 150 001 performances par chemin club et nageur), puis la recherche des minima et de leurs titulaires dans la même instruction. Les deux passages portent chacun sur au plus 300 000 identifiants régionaux avant dédoublonnage. Au-delà de 1 000 temps gagnants bruts ou du budget de lecture, la réponse signale l’indisponibilité. La présentation MPF utilise les mêmes lignes gagnantes et la ville de compétition du TOP, par jointure sur la clé primaire des options de compétition. Elle affiche l’année de naissance publique et le lien vers la fiche du nageur. Au plus 32 sélections en cache par instance. Aucune lecture Firestore.

## Lectures NAP et Firebase conservé

Les lecteurs doivent rester indexables, bornés et paginés, sans N+1 ni reconstruction silencieuse ; voir `docs/OPTIMISATION_NAP.md`. Ne pas modifier les temps natifs pour faciliter un tri : interprétation numérique obligatoire. Les versions officielles Records/MPF sont dans NAP.

Firebase conserve ses services existants, notamment les comptes, l'authentification et les usages techniques. Le nouveau Direct utilise ses tables NAP dédiées ; le dispositif historique conserve ses propres usages Firestore.

TEST partage la base NAP réelle. Une écriture de test sur cette base exige un accord spécifique.

## Références

Lire seulement les sections utiles des documents dont la description correspond à la tâche, notamment `docs/gestion-base-performances.md` et `docs/pipeline-performances-publiques.md`. Pour toute publication ou migration, appliquer aussi `docs/agents/PUBLICATION.md`.
