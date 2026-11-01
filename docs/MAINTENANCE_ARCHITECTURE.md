# Maintenance de l'architecture — 28 octobre 2026

<!-- description: Découpage du portail et du serveur, garanties de conservation, budgets inchangés, contrôles hors réseau et limites Infra du chantier autorisé sur TEST. -->

## Périmètre

Antoine a autorisé le plan de maintenance jusqu'à la livraison sur TEST, y compris le découpage du portail et du serveur, avec conservation du fonctionnement et de l'affichage. PROD, opérations sur les données réelles, migrations et envois réels sont exclus. Les pages et URL restent inchangées ; aucune dépendance, aucun framework ni bundler n'est ajouté.

## Organisation

Le portail conserve son état privé et ses références DOM dans l'assembleur `assets/livepalmes-admin-portal.js`. Les fonctions sont réparties dans les quatorze modules de `assets/portal/` : navigation, chargement/références clubs, paramètres des compétitions, personnes du club, état et vues des engagements, documents/programme, actions des compétitions, demandes nationales, annuaires nationaux, journal, actions club/compétition, compte/accès, événements. Les modules utilisent les interfaces communes `state`, `config`, `actions` et les éléments DOM ; les valeurs restent vivantes, sans copie périmée du club ou de la compétition sélectionnée. Leur création ne charge aucune donnée et ne pose aucun listener. Les dépendances et noms privés sont contrôlés automatiquement.

Le serveur conserve dans `functions/index.js` les déclarations Firebase, options, secrets et exports existants. Cinq modules `portal-*-handlers.js` contiennent les corps des callables par domaine. Quinze modules `server-*-service.js` contiennent les fonctions privées. Le parsing d'import, le rendu PDF, les statistiques et l'ancien circuit public sont isolés dans leurs modules dédiés. Les fabriques sont chargées paresseusement et mutualisées dans chaque processus. Elles ne font aucune opération externe à leur création. Les déclarations mail/schedulers restent dans leur circuit spécifique ; aucune activation n'est implicite.

Les petits outils NAP partagés ont été extraits vers des modules indépendants : valeurs du calendrier, état d'activité nageur, options des personnes, témoin d'autorité de compétition, lectures/plans des officiels et validation de plan des nageurs. Les anciens chemins continuent de réexporter les mêmes fonctions. Le test d'architecture refuse les cycles d'imports serveur.

Le cloisonnement des dépendances du 1er novembre affine cette organisation : 635 corps privés dans 419 groupes de consommateurs, puis 34 composants natifs séparant connexion, valeurs, projections, lectures et vues. Les quatre fabriques à paramètres capturés conservent leurs contrats d’initialisation. Aucun état de transaction, pool, règle sportive, accès ou budget de données n’est dupliqué ou changé. Les imports des helpers sont capturés une fois, sans chargement par ligne ; le snapshot d’origine des URLs reste fixé au démarrage.

Les outils `backend-factory-model`, `isolate-backend-factories` et `isolate-backend-native-modules` servent au déplacement ponctuel et à sa preuve. Les modules déplacés sont ensuite les sources canoniques à maintenir normalement ; une correction quotidienne ne relance pas cette génération. Les preuves historiques seront liées aux commits exacts livrés. Les tests des modules réels, refus d’accès, budgets et sélecteurs restent actifs. La table `tests/helpers/backend-native-paths.json`, générée par `writeLogicalPaths`, ne restaure que les noms d’imports des tests historiques de source logique ; les tests de runtime et le circuit de déploiement n’utilisent jamais cette table.

L’inventaire `docs/releases/backend-native-inventory.json` couvre les 294 modules natifs après déplacement, leurs interfaces, états et consommateurs TEST/PROD calculés hors réseau. Il explique les composants conservés et les dépendances communes légitimes ; il ne constitue pas une sélection de publication. La configuration et les caches réellement partagés gardent tous leurs consommateurs, et un cas inconnu reste conservateur.

## Styles et cache

L'entrée CSS importe seize fragments dans l'ordre initial de la cascade. Les préchargements HTML évitent une découverte séquentielle des fragments. Une seule duplication de bloc strictement identique a été retirée ; les variantes responsive et les priorités existantes sont conservées. Aucun composant ni règle visuelle n'est redessiné, donc le design system fonctionnel reste inchangé.

Les anciens fichiers principaux avaient déjà un cache immuable ; ce réglage est conservé. La configuration Firebase reste identique à la référence publiée : les nouveaux modules suivent la politique Hosting existante, sans nouvelle règle de cache longue durée. L'ajout initial de deux en-têtes a été retiré après refus du circuit ordinaire TEST, avant tout déploiement ; aucun garde-fou de publication n'a été assoupli. Le découpage permet des mises à jour ciblées, sans promesse de chargement initial plus rapide. Le premier téléchargement ajoute des interfaces et plusieurs ressources ; la compression calculée localement montre environ 40 Ko gzip supplémentaires pour le JavaScript du portail. Les observations navigateur locales avec services bloqués ne sont pas des mesures de latence utilisateur ou de charge NAP.

Chaque script, fragment et entrée possède une version d'URL. `portal-cache-version-tests.js` vérifie les versions et refuse un contenu changé sans renouvellement de son URL par rapport au parent testé. Garder cet ordre et ce contrôle lors des retouches futures.

## Budget des données

| Situation | Coût ajouté par le découpage |
| --- | --- |
| Première ouverture du portail ou d'une rubrique | 0 requête SQL, 0 lecture/écriture Firestore |
| Action utilisateur | 0 accès aux données ajouté ; mêmes validations et opérations existantes |
| Rafraîchissement | 0 accès ajouté ; caches, regroupements et pagination conservés |
| Pire cas réaliste | Aucun nouveau parcours par ligne, scan global ou reconstruction ; plafonds existants inchangés |

Les extractions ne modifient ni les requêtes, ni leurs paramètres, ni leurs limites. Elles conservent les autorisations avant les lectures/écritures. Les seuils et plans NAP restent ceux de `OPTIMISATION_NAP.md` ; pas de benchmark connecté, nouvel index, modification de concurrence ou changement de fraîcheur dans ce chantier.

## Vérifications

La comparaison syntaxique locale des méthodes réelles avec la base `79d5b5d3`, après normalisation des seules références aux interfaces, couvre 1 489 fonctions/handlers déplacés : 1 488 corps et paramètres identiques, dont les contenus exacts des chaînes multilignes ; seule la correction de `loadScriptOnce` est différente. Sept petits outils utilisés au démarrage restent dans `index.js`, identiques à la source, pour conserver les dépendances d'initialisation ciblées. Les déclarations Firebase sont également conservées. Le mode d'exécution des fonctions, leurs valeurs par défaut et l'arité des délégations restent ceux de la source. La correction permet de charger un module après un premier échec réseau : l'élément en erreur est retiré et une nouvelle tentative peut créer une requête ; les demandes simultanées et succès restent mutualisés.

Les tests existants qui inspectent des déclarations utilisent `tests/helpers/source-files.js` pour retrouver la source logique aux emplacements historiques. Cet adaptateur ne modifie pas le runtime, les outils de publication ni leurs empreintes. Les nouveaux tests exécutent séparément les véritables fabriques et vérifient leurs raccordements, le refus d'autorisation avant tout accès aux données, l'absence d'accès prématuré aux services, les imports et le cache. Les futurs tests de comportement doivent privilégier les modules réels ; conserver les anciens contrats tant que leur remplacement n'apporte pas une preuve équivalente.

La suite unitaire du vérificateur précharge `tests/helpers/offline-network.js` : les connexions TCP et fetch distantes sont refusées avant connexion, les fixtures locales restent autorisées. Cela ne crée aucune base TEST et ne change aucune configuration déployée.

La comparaison navigateur utilise un profil isolé, le blocage HTTPS externe et les fixtures de présentation existantes, avec le code de la base servi en mémoire. Quarante vues sont comparées en 1280 et 390 px. Les dimensions et exceptions JavaScript sont comparées strictement. Animations/caret sont stabilisés, la bande de scrollbar native est exclue ; l'anticrénelage autorise 2/255 par canal et au maximum quatre pixels de bord à 8/255. Les captures et mesures restent dans `tmp/architecture-layout/`. Ce contrôle visuel ne vaut pas recette métier authentifiée ni validation utilisateur.

Les contrôles d'interaction historiques de capture ont révélé avant modification des recouvrements sur l'accueil mobile/tablette et la matrice de courses mobile. Ils ne sont ni corrigés ni présentés comme réussis par ce chantier ; les comparaisons avant/après vérifient la conservation du rendu.

La [CI main finale](https://github.com/ffessmnap/LivePalmes/actions/runs/40667449621) et la [livraison TEST commune](https://github.com/ffessmnap/LivePalmes/actions/runs/40668037169) sont réussies au candidat `74e3ffe5b1890dd8ca7301b8b8326b69cb356362` : 105 fonctions ordinaires sélectionnées sur 105, mises à jour et contrôlées ACTIVE en onze lots, dix fonctions conservées sans modification, puis Hosting publié au même candidat. Cette sélection large résulte des fichiers serveur et dépendances partagées déplacés ; elle n'a pas été réduite manuellement. Les exceptions TEST sans SMTP sont celles du circuit existant, sans nouvel envoi ni activation de scheduler. L'artefact `test-proof` contient le candidat, la réussite applicative et l'état final des fonctions/Hosting. Aucun test métier connecté ni validation utilisateur ne sont déduits de cette livraison.

## Limites conservées

La vérification du certificat MySQL demeure désactivée selon le choix Infra existant. L'activer sans chaîne de confiance reconnue risquerait d'interrompre NAP. Avant ce changement distinct : obtenir la CA/chaîne et le nom attendus auprès de l'exploitant, contrôler validité et rotation, vérifier les refus d'un certificat invalide, puis décider explicitement du déploiement TEST. Aucun secret, certificat ou paramètre de connexion n'est modifié ici.

TEST partage toujours la base NAP réelle. La protection de cette livraison repose sur les fixtures et le blocage réseau des contrôles. Créer une copie de données ou une nouvelle infrastructure sortirait de l'autorisation présente. Aucun test d'écriture connecté ni test de charge sur NAP n'est exécuté.

Le code historique est isolé mais ses exports et gardes de retrait restent conservés pour compatibilité et reprise. Aucune suppression de fonction déployée, archive ou outil de migration n'est effectuée sans preuve complète de retrait et autorisation adaptée. Le découpage ne signifie pas que toute dette de couplage ou tout test textuel a disparu.
