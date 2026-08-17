# Portail LivePalmes

<!-- description: Routage, architecture, performance et vérifications obligatoires pour toute évolution limitée au portail LivePalmes. -->

## Périmètre

Le Portail LivePalmes est le cœur métier en cours de finalisation et de test. Il couvre la préparation des compétitions, les engagements, les clubs, nageurs, officiels, comptes, droits, performances, Records/MPF et espaces autorisés.

LivePalmes Direct est un autre dispositif, réservé aux compétitions nationales concernées. Pour une demande portant sur le portail, ne pas lire ni modifier `app.js`, `pilotage-livepalmes.html`, les pages de consoles, les scripts de consoles ou `docs/LIVEPALMES_DIRECT.md`, sauf si le code démontre qu'une dépendance commune est réellement touchée.

## Fichiers à examiner en premier

- `portail.html` : structure et écrans du portail ;
- `assets/livepalmes-admin-portal.js` : assemblage principal et interactions ;
- `assets/livepalmes-admin-portal.css` : styles propres au portail ;
- `assets/livepalmes-admin-auth.js` : session et capacités ;
- `assets/livepalmes-portal-ux.js` : comportements transverses du portail ;
- `assets/livepalmes-admin-*.js` et `performances/public/admin*.js` : modules ciblés selon la fonction.

Commencer par une recherche ciblée du libellé, de l'identifiant HTML, de la fonction ou de la collection concernés. Ne pas lire entièrement les gros fichiers lorsque quelques blocs suffisent.

Si la correction touche `functions/`, lire aussi `functions/AGENTS.md`. Ne rechercher ensuite que les fonctions appelées par l'écran concerné et leurs utilitaires directs.

## Documentation métier à charger seulement si nécessaire

- engagements et préparation des compétitions : `docs/module-engagements.md` et, si l'architecture est utile, `docs/module-engagements-integration-portail.md` ;
- comptes, capacités et périmètres : `docs/droits-acces-livepalmes.md` ;
- authentification : `docs/authentification-admin-et-pins.md` ;
- imports et corrections de performances : `docs/gestion-base-performances.md` puis `docs/agents/PERFORMANCES.md` ;
- publication publique des performances : `docs/pipeline-performances-publiques.md` ;
- règles Firestore : `docs/FIREBASE_REGLES.md` ;
- architecture générale : seulement la section Portail de `docs/STRUCTURE_LIVEPALMES.md` ou `docs/ARCHITECTURE.md`.

Lire d'abord la ligne `description` de chaque document et ignorer le document si elle ne correspond pas à la demande.

## Budget de lectures obligatoire

Toute évolution du portail qui lit ou écrit des données doit inclure, avant l'implémentation, une estimation simple du coût :

| Situation | Question obligatoire |
|---|---|
| Ouverture de l'écran | Combien de documents sont lus immédiatement ? |
| Action utilisateur | Combien de lectures et écritures produit une action ? |
| Rafraîchissement ou retour sur l'écran | Le cache évite-t-il une nouvelle lecture inutile ? |
| Liste ou recherche | La requête est-elle bornée, paginée et indexable ? |
| Plusieurs lignes | Le coût est-il fixe ou groupé, sans lecture par ligne ? |
| Cache absent | Le repli reste-t-il borné sans reconstruction massive silencieuse ? |
| Croissance future | Le coût reste-t-il maîtrisé avec dix ou cent fois plus de données ? |

Règles de conception :

- réutiliser d'abord les agrégats, index, caches et fichiers publics existants ;
- charger les données seulement à l'ouverture réelle du module concerné ;
- mutualiser les demandes simultanées et regrouper les opérations rapprochées ;
- préférer une requête bornée ou un appel groupé à une lecture par résultat ;
- éviter de relire automatiquement les données qui viennent d'être enregistrées lorsque la réponse serveur suffit ;
- utiliser une durée de cache explicite lorsque la fraîcheur instantanée n'est pas nécessaire ;
- afficher un état indisponible ou proposer une reconstruction volontaire si un agrégat manque, au lieu de lancer un scan massif dans l'appel interactif ;
- prévoir la pagination dès la conception d'une liste susceptible de grandir ;
- ne jamais faire dépendre le nombre de lectures de la taille totale de `performances`, des utilisateurs, des clubs ou des engagements.

Si le coût ne peut pas être estimé ou borné, ne pas implémenter la solution telle quelle : rechercher d'abord un index, un agrégat, un cache ou un fichier pré-calculé adapté.

Les budgets déjà établis pour les principaux écrans sont recensés dans `docs/AUDIT_PERFORMANCE_COUT_PORTAIL.md`. Ils servent de plafond de référence, pas de permission pour ajouter des lectures jusqu'à ce plafond.

## Réactivité utilisateur

L'optimisation des coûts et celle de l'expérience utilisateur vont ensemble :

- afficher immédiatement les données déjà en mémoire ;
- éviter les chargements globaux au démarrage du portail ;
- charger les modules lourds à la demande ;
- conserver un cache encore utilisable pendant son actualisation lorsque le métier l'autorise ;
- empêcher les doubles appels provoqués par plusieurs événements ou clics ;
- donner un retour visuel pendant une opération réellement nécessaire.

## Vérification d'une évolution

Avant de considérer une évolution terminée :

1. indiquer le budget estimé avant et après la modification ;
2. vérifier l'absence de scan complet, de lecture N+1 et de listener inutile ;
3. tester le parcours nominal et le cas où le cache ou l'agrégat manque ;
4. contrôler l'interface sur mobile et ordinateur si elle a changé ;
5. lancer les tests ciblés, puis `node tools/verify-livepalmes.js` si plusieurs modules ou le serveur sont concernés ;
6. signaler clairement ce qui n'a pas pu être mesuré ou testé.

Tout test susceptible de lire Firebase de production ou d'écrire des données réelles doit être annoncé et validé avant exécution.
