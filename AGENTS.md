# AGENTS.md — LivePalmes

## Principes et périmètre

LivePalmes est un écosystème web bénévole dédié à la nage avec palmes :

- **Portail LivePalmes** : préparation des compétitions et engagements ; gestion des clubs, nageurs, officiels, comptes, droits, performances, Records/MPF et espaces autorisés.
- **Espace public permanent** : calendrier des compétitions, documents, Records, MPF, TOP, performances, résultats et fiches nageurs.
- **LivePalmes Direct** : suivi et diffusion des compétitions piscine de tous niveaux issues du calendrier NAP. Le parcours multi-compétitions repose sur un bureau utilisable seul ou avec des consoles selon les besoins et les accès autorisés : préparation des séries, diffusion des résultats issus de WinPalme, suivi des décisions et consultation publique, y compris des archives. La préparation des engagements reste dans le portail.

Le nouveau Direct est le parcours de référence. Distinguer ses pages, modules et données du dispositif national historique. Le retrait prévu des anciennes pages, notamment des pages séries, ne doit pas être présenté comme réalisé avant livraison et contrôle. Leur suppression n’autorise pas celle des données, PDF ou archives associés.

Priorités : fiabilité, simplicité, performance, fonctionnalités. Faire évoluer l’existant, réutiliser ses conventions et limiter les changements au besoin demandé. Ne pas introduire de framework, dépendance ou nouvelle architecture sans justification forte.

Application statique en HTML, CSS et JavaScript natif, sans bundler racine. Préserver les URL existantes hors retrait ou redirection explicitement autorisé. L’accueil public peut proposer un accès distinct et secondaire au portail ; ne pas y réintroduire le pilotage.

Placer toute nouvelle logique métier dans un module existant ou dédié. Ne pas grossir `app.js` ni y ajouter du métier portail.

## Documentation à consulter

Identifier d’abord le périmètre : portail, espace public permanent, Direct ou couche réellement partagée. Charger uniquement les fichiers, sections et tests utiles ; élargir lorsqu’une dépendance commune est effectivement touchée.

Pour tout Markdown autre qu’un `AGENTS.md`, rechercher d’abord sa ligne `<!-- description: ... -->`, puis lire les sections nécessaires. Ignorer dépendances, sorties générées et dossiers tiers sauf besoin explicite.

| Sujet | Consignes |
| --- | --- |
| Portail | `docs/agents/PORTAIL.md`, puis documentation métier nécessaire |
| Interface commune et responsive | `docs/agents/FRONTEND.md` |
| Direct, bureau et consoles | `docs/LIVEPALMES_DIRECT.md`, puis sections communes utiles du frontend |
| Backend | `functions/AGENTS.md`, avant toute intervention dans `functions/` |
| Records, MPF et performances | `docs/agents/PERFORMANCES.md` |
| Git, intégration et publication | `docs/agents/PUBLICATION.md` |
| Architecture | `docs/STRUCTURE_LIVEPALMES.md` ou `docs/ARCHITECTURE.md` |
| Tests sensibles | `docs/TESTS_MANUELS.md` |

Une tâche limitée au portail ne nécessite pas de charger le Direct, et réciproquement. Le lien du portail vers le Direct ne justifie pas, à lui seul, de charger le métier des deux espaces.

Distinguer fonctionnement actuel, évolutions prévues et historique. La présence d’un ancien fichier ou d’une autorisation passée ne prouve pas son usage actuel.

## Travail et autorisations

Analyser l’existant avant modification. Préserver compatibilité, UTF-8 et changements des autres intervenants ; éviter les refactorings massifs.

Travailler dans le dossier principal partagé, sans worktree sauf nécessité expliquée. Revérifier l’état partagé avant toute écriture ou publication.

Agir directement pour une modification simple et localisée. Pour une intervention importante ou sensible, présenter l’approche et obtenir l’accord sur le périmètre. La demande peut déjà constituer cet accord : ne pas le redemander pour les mêmes opérations. Un élargissement ou un nouveau risque impose un nouvel examen.

### Autorisation par défaut

- Une analyse ou une proposition dans le chat n’autorise aucune modification.
- Une demande de développement autorise préparation, commit, PR, intégration après contrôles et déploiement **TEST** du besoin demandé, sous réserve des accords sensibles ci-dessous.
- Une retouche documentaire seule ne déclenche aucun déploiement.
- Une autorisation de préparation ou de déploiement du code ne vaut pas autorisation d’opération réelle sur les données ou d’envoi de messages.

### Présentation et changements sensibles

Une retouche de présentation relève de l’autorisation ordinaire lorsqu’elle ne modifie ni les règles métier, ni les informations rendues accessibles, ni les accès aux données : espacement, typographie, responsive ou libellé sans portée métier.

Le classement dépend des effets du changement, pas uniquement du fichier modifié. Une correction CSS peut masquer une information essentielle ; un libellé peut modifier le sens d’une décision sportive.

Obtenir un accord explicite sur le périmètre avant de modifier :

- authentification, PIN, capacités et droits d’accès ;
- règles, configuration, variables d’environnement ou Cloud Functions Firebase ;
- structure persistante des données, notamment tables NAP/MySQL ou collections Firestore ;
- règles et calculs des Records, MPF, catégories, classements, médailles ou qualifications DTN ;
- sélection, interprétation ou publication des données sportives ;
- import et parsing des séries, résultats, PDF et archives ;
- génération des consoles dédiées ;
- traitements de migration, correction ou génération des données de performances ;
- mécanismes de publication Firebase Storage.

Une retouche visuelle d’une page Records/MPF ou d’une console ne constitue pas, à elle seule, un changement de règle sportive. Elle conserve les vérifications et précautions propres aux composants, générateurs et dépendances touchés.

L’accord peut figurer dans la demande si l’opération et ses limites sont explicites. Une autorisation historique reste bornée à son périmètre et à ses versions.

Ne jamais inventer une règle sportive : demander validation en cas de doute métier.

### Opérations réelles sur les données

Migration, correction ou suppression de données réelles, génération ou publication de données sportives, restauration métier et envoi de messages réels exigent un accord spécifique couvrant leur cible et leurs limites.

Cette exigence s’applique aussi depuis TEST. Certains parcours TEST partagent la base NAP réelle : TEST ne garantit pas l’isolation des données.

Privilégier les fixtures et services fictifs pour les tests. Prévenir avant tout test susceptible d’utiliser Firebase de production ; obtenir l’accord spécifique avant toute écriture réelle, quel que soit le service utilisé.

Ne jamais modifier directement une sortie générée : corriger sa source ou son générateur. Un ancien fichier ou outil n’autorise ni régénération ni publication. Le retrait de code et le nettoyage des données ou de Storage sont des opérations distinctes.

### Accord PROD

La PROD nécessite une instruction explicite d’Antoine dans Infra couvrant le périmètre présenté. Un accord déjà donné, éventuellement conditionné à la réussite des contrôles, suffit pour ce périmètre.

L’assistant prépare et présente le bilan utile : contenu, validations, preuves, risques et éventuels blocages. Ne pas demander une seconde approbation lorsque l’accord couvre déjà la version présentée et que ses conditions sont remplies.

Une validation TEST seule ne vaut pas accord PROD. Un changement de périmètre, une condition non remplie ou un risque nouveau impose un nouvel examen avant publication.

Toute protection ou approbation GitHub encore requise reste obligatoire.

## Données et interface

Utiliser la source réelle : NAP/MySQL pour les données qui y résident, Firestore pour celles qui y restent. Le nouveau Direct utilise ses tables NAP dédiées ; le dispositif historique conserve ses propres usages Firestore. Firebase reste utilisé pour ses services existants.

Avant toute évolution d’un accès aux données, établir un budget de lectures : ouverture initiale, action utilisateur, rafraîchissement et pire cas réaliste. Estimer les documents Firestore, les requêtes et les lignes parcourues NAP.

Les lectures doivent être bornées et indexables, sans requête supplémentaire par ligne, N+1, scan complet non borné ni multiplication inutile des listeners. Le coût d’un écran ou d’une action ne doit pas dépendre de la taille totale de la base ; borner et paginer les listes.

Réutiliser agrégats, index, caches, fichiers publics et appels groupés existants lorsqu’ils correspondent à la source courante. Pour une petite liste NAP, privilégier une lecture serveur directe, ciblée et mesurée, avec cache court mutualisé si utile.

Conserver fichiers statiques, agrégats et pagination lorsque volume, fréquence ou disponibilité le justifient. Ne pas réintroduire une ancienne source comme repli implicite. Un cache absent ou périmé ne doit jamais déclencher silencieusement une reconstruction massive dans un parcours interactif.

Concevoir mobile first, avec actions essentielles accessibles au toucher et sur ordinateur. Adapter les tableaux larges et réutiliser les composants existants.

Mettre à jour `docs/DESIGN_SYSTEM.md` seulement lorsque ses règles, composants ou variantes changent réellement.

## Vérifications

Adapter les contrôles au changement, sans retirer ceux imposés par les workflows :

- **Documentation seule** : cohérence, UTF-8, liens et descriptions ; CI requise selon le classement courant. Aucun test applicatif manuel ni déploiement pour cette seule retouche.
- **Modification localisée** : syntaxe et test du comportement modifié ; pour l’interface, contrôle ordinateur/mobile et smoke test pertinent.
- **Architecture, consoles, plusieurs modules ou code sensible** : vérification globale `node tools/verify-livepalmes.js`, en priorité par la CI obligatoire, et contrôles ciblés nécessaires.

Smoke test navigateur : `node tools/verify-livepalmes.js --browser`.

Avant la première CI, terminer le lot cohérent : code, tests ciblés et dépendances immédiates, documentation et contrat lorsqu’il est requis. Après un échec, corriger la cause et ses conséquences proches avant de relancer.

Réutiliser les preuves compatibles et traçables du commit exact. Ne pas doubler localement une suite déjà réussie en CI ni refaire la recette des parcours inchangés pour une simple promotion.

Un changement, un échec ou une preuve incompatible justifie une nouvelle exécution. Conserver les contrôles frais de l’état déployé exigés par la procédure.

Ne pas contourner un contrôle ni modifier manuellement une sélection CI ou de publication pour gagner du temps. Signaler le blocage.

## Intégration et publication

Avant toute intégration ou publication, récupérer les dernières consignes de `main` et lire le parcours utile dans `docs/agents/PUBLICATION.md`.

`docs/agents/PUBLICATION.md` indique le parcours ; `docs/releases/PROCEDURE.md` décrit son exécution actuelle. Les archives servent uniquement à une reprise ou exception identifiée.

- Travailler par PR courte depuis le dernier `main`, avec code, tests et documentation du même besoin. Préserver les autres évolutions.
- TEST commun est un commit intégré sur `main`, publié par `livepalmes-test-common.yml`. Un aperçu de PR ne remplace pas la validation de cette version commune.
- Suivre les automatismes et sélections par dépendances du circuit existant. Examiner la sélection calculée et expliquer les replis larges. Backend et opérations sensibles suivent leurs parcours autorisés.
- Réutiliser une preuve TEST encore valide pour PROD ; ne republier TEST que si la version, l’état ou la validité de la preuve l’exige.
- Tenir `docs/releases/EVOLUTIONS.md` à jour : besoin, PR/commit, état, preuve TEST et retour utilisateur.
- Distinguer développement terminé, contrôles réussis, déploiement confirmé et validation utilisateur. Ne jamais inventer une validation.
- Une modification ultérieure du code invalide la validation des parcours concernés. Faire vérifier la version regroupée avant PROD et figer le candidat validé pour exclure les ajouts suivants.
- Pour « publier tout ce qui est validé », couvrir le périmètre complet. Une évolution incluse mais non validée bloque : la terminer ou préparer une autre version commune, sans sélection silencieuse de fichiers.
- Aucune copie TEST vers PROD. Règles/index, migrations, fonctions email et schedulers restent hors du circuit ordinaire, sauf parcours explicitement autorisé.

Conserver les protections exigées : CI et synthèse obligatoires, preuves backend, exclusions, contrôle de dérive, sauvegarde vérifiée, retour arrière et contrôles finaux.

Garder l’environnement `production` limité à `main`. Un accord dans le chat n’autorise pas à contourner une protection technique ni à élargir les permissions.

Préparer le bilan depuis les preuves GitHub et les validations authentiques, sans dépendre d’un accès Google. L’assistant gère les références techniques nécessaires à la publication.

## Exécution et restitution

Réduire les étapes redondantes, jamais les garanties :

- Garder le parcours courant lisible dans PUBLICATION.md et PROCEDURE.md ; consulter les contrats historiques seulement pour une reprise identifiée. Ne pas développer le circuit pendant une promotion ordinaire.
- Dès TEST, préparer le périmètre complet et les prérequis du candidat PROD. Avant de dire « prêt », résoudre les droits/capacités nouveaux ou incertains. Après interruption ou réduction de contexte, relire le point de reprise unique et les opérations distantes.
- Supprimer les contrôles démontrés obsolètes ou redondants ; conditionner les autres selon leurs dépendances prouvées. Ne jamais choisir manuellement les tests pour accélérer un run. Un intitulé historique ne prouve pas l’inutilité du contrôle.

- Chercher et lire de façon ciblée, borner les sorties et regrouper les commandes indépendantes. Garder séquentielles les opérations dépendantes ou modifiant le même état.
- Utiliser les outils existants. Ne pas ajouter benchmark, audit général, rapport HTML, contrôle ou refonte du circuit sans nécessité démontrée.
- Si une CI ou publication est en cours, attendre le traitement existant par attente bornée ou notification. Éviter interrogations rapprochées, doubles lancements et annulations injustifiées ; confirmer le résultat final.
- Garder les corrections dans la PR ouverte. Après fusion, regrouper le suivi documentaire plutôt que créer une PR par résultat de contrôle.
- Adapter l’effort à la difficulté sans changer silencieusement le modèle choisi.
- Conserver le chat tant que son contexte reste utile. À la clôture ou avant une reprise encombrée, préparer un résumé court : besoin, version, décisions, fichiers, preuves, autorisations et points ouverts.

Répondre en français, directement et pédagogiquement. Après modification, donner un bilan court : résultat, fichiers touchés, contrôles effectués, vérifications restantes et éventuel blocage.

Expliquer les choix non évidents et les risques réels ; laisser les références techniques consultables dans GitHub et le registre. Ne pas demander à Antoine de gérer SHA, manifestes ou numéros de runs.

Suivre le délai complet entre demande et résultat, en distinguant travail, attentes externes et reprises. Ne pas présenter la durée d’un sous-job comme celle de toute la livraison.
