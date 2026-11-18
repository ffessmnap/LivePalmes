# Audit A3.7 — capacité de connexion NAP

<!-- description: Qualification A3.7 des pools et plafonds SQL TEST/PROD, mesures administratives du 18 novembre 2026 et limites du budget global ; aucun réglage modifié. -->

## Décision et périmètre

Antoine confirme que NAP est dédiée à LivePalmes, avec WinPalme qui lit les adresses des clubs, et demande de ne contacter personne. Le budget de planification retient donc cet usage partagé. Aucun courriel ni demande à l'hébergeur n'est envoyé. Cette hypothèse d'usage ne vaut pas preuve d'un plafond global de connexions réservé à chaque logiciel.

L’association Authenticator et la récupération papier PROD sont validées par Antoine ; il reporte ensuite l’obligation MFA le 18 novembre. La suite indépendante d’A3 continue. Ce lot qualifie les capacités en lecture seule : aucune configuration SQL/Cloud Run, liaison, règle, compte ou donnée métier modifié. Aucun test de charge, appel de Function métier ou nouveau service.

## État observé le 18 novembre

[Lecture SQL 44292351998](https://github.com/ffessmnap/LivePalmes/actions/runs/44292351998), candidat `56e96df1080a1d4ea10f0427ea311e9d5bd36a9c`, réussie à `11:11:44.886Z` : une connexion, deux requêtes administratives fermées, zéro table métier ou verrou. Le secret n'est utilisé qu'en mémoire. Artefact `14421227709`, ZIP SHA-256 `f984522ac0511ad8a307102ddf401e1030531f44007d1b8329e55f4f0d46d0eb` authentifié.

| Mesure | Valeur | Portée |
| --- | ---: | --- |
| Plafond serveur | 151 | MySQL 5.7 partagé par TEST et PROD |
| Connexions ouvertes | 5 | Inclut celle du lecteur ; instantané |
| Pic depuis le démarrage du serveur | 52 | Historique, pas un test de charge |
| Erreurs de dépassement du plafond | 0 | Compteur observé à cet instant |
| Limite du compte collecteur / limite par défaut | 0 / 0 | Ne qualifie pas les autres sessions ou comptes |

La portée des limites par compte dépend aussi du compte MySQL effectivement sélectionné lors de la connexion, y compris son hôte : [documentation MySQL 5.7](https://dev.mysql.com/doc/mysql-security-excerpt/5.7/en/user-resources.html). Ni identité SQL exacte de chaque runtime ni réserve WinPalme/maintenance n'est déduite du seul collecteur. Le compteur de connexions abandonnées est conservé dans le reçu ; sa cause n'est pas attribuée à une saturation.

## Correspondance des fonctions et services

[Observation cloud 44292331971](https://github.com/ffessmnap/LivePalmes/actions/runs/44292331971) : le run reste **échoué**, car le lecteur backend PROD reçoit 403 pour les lectures projet et Auth. Les sous-lectures Functions et Cloud Run ont réussi ; Auth/Storage Rules PROD ont été observées avec l'autre identité existante. Aucun droit ajouté et aucune relance pour masquer cet échec.

Trois ZIP authentifiés : TEST backend `14422006749` / `5b08b1be6879a1f87ec8c09f87ccc59a3439e0c59fcf176afe03c32961b40fd9`, PROD backend `14421469136` / `17317dd38a3fc1178be48029bc00fb6df629f7e6df59f4e5bca15bb2d3363fcc`, PROD Hosting `14422002629` / `24823da3c482f914e62addec02ed22bfd0af3b2dd588c200f2c4df0f3dd536d0`.

Les 119 fonctions PROD et 121 TEST sont reliées chacune à leur service, à la révision créée/prête/courante et à son trafic 100 %, sans tag, réconciliation ou génération en retard. Les concurrences correspondent. Pour chaque ligne, le calcul utilise le minimum des plafonds **positifs réellement observés** Function/service/révision ; une valeur absente n'est jamais remplacée par un défaut supposé. Les plafonds de service observés sont 20 ; des limites de révision plus basses restent prises en compte.

## Pools et enveloppe nominale

`nap-connection.js` fixe deux connexions et une file de huit demandes par pool. Les quatre familles de caches sont le singleton portail, le pool public de `index.js`, le pool d'export TEST et le synchroniseur d'adresses, ce dernier désactivé sur TEST par son garde de projet. Trois appels de création publics partagent le même cache ; ils ne sont pas multipliés comme trois pools.

L'analyse réutilise `backend-factory-model.js` et son graphe conservateur de dépendances, sans importer l'application. Les créations directement présentes dans les exportations sont incluses. Les contextes qui échappent à une méthode sont élargis à leurs dépendances, sans les ignorer. Pour les 21 noms sans famille SQL après sélection d'environnement, les imports locaux transitifs ont été vérifiés : seul le synchroniseur TEST atteint encore un module SQL, avec le garde de projet qui empêche l'ouverture de son pool. Aucune requête métier exécutée.

| Cible | Fonctions installées | Parcours susceptibles d'ouvrir SQL | Somme nominale calculée |
| --- | ---: | ---: | ---: |
| PROD | 119 | 99 | 2 916 |
| TEST | 121 | 100 | 2 918 |
| Ensemble | 240 | 199 | 5 834 |

Cette somme additionne `plafond observé × familles de pools accessibles × 2`. Elle décrit une enveloppe théorique des réglages et du graphe de source courants, **pas la consommation, une prévision de trafic ni un budget global accepté**. La correspondance des graphes historiques à chaque révision installée n'est pas remplacée par une trace d'exécution réelle. Les sources et scripts d'analyse restent accompagnés de leurs empreintes dans le point de reprise.

Google précise aussi que les maximums d'instances peuvent être dépassés temporairement et que plusieurs révisions peuvent se chevaucher : [limites Cloud Run](https://docs.cloud.google.com/run/docs/configuring/max-instances-limits). Le total nominal n'est donc pas une borne dure globale. Anciennes révisions, sauvegardes A2, administration, WinPalme et maintenance demandent une marge distincte ; aucun nombre arbitraire n'est affecté à leurs usages.

## Suite et limites

Les mesures ne montrent pas d'erreur de saturation. Les limites actuelles sont conservées pendant la qualification ; diminuer une limite commune sans budget ferait porter un risque de disponibilité sur les parcours actifs. Le plafond global de 151 est connu, et l'absence de garantie d'admission globale reste explicite. Aucun budget global strict ni dimensionnement de montée en charge n'est déclaré prouvé. L'hypothèse dédiée demandée par Antoine est retenue, sans demande extérieure.

Les preuves locales sont regroupées dans `work/a37-refresh-artifact-authentication.json`, `work/a37-complete-budget-analysis.json` et `work/a37-transitive-zero-check.json` du dossier de travail A3. Le point de reprise A3 conserve candidat, décisions, empreintes, runs et suites ouvertes. Ce suivi ne déploie aucune version applicative et ne clôture pas tout A3.
