# LivePalmes

<!-- description: Présentation générale de l'écosystème LivePalmes, de son état actuel et des principaux repères du dépôt. -->

LivePalmes est un ecosysteme numerique dedie a la nage avec palmes. Il reunit un portail metier, des espaces publics de consultation et un dispositif distinct de suivi en direct pour certaines competitions nationales.

## Etat du projet

Le Portail LivePalmes est actuellement en cours de finalisation et de test. Il continue d'etre ameliore et peut recevoir de petits modules complementaires selon les besoins valides.

Le portail n'est donc pas encore considere comme operationnel, meme si ses principaux modules sont deja presents dans le code.

## Les trois composantes

### Portail LivePalmes

Le portail est le coeur fonctionnel actuel de l'ecosysteme. Il sert a preparer les competitions et les engagements, gerer les clubs, nageurs, officiels, comptes et droits, administrer les performances, Records et MPF, et acceder aux espaces DTN ou nationaux autorises.

Page principale : `portail.html`.

### Espace public LivePalmes

Cet espace permet de consulter sans connexion les Records de France, les MPF, les TOP, les performances historiques et les fiches nageurs.

L'accueil public de l'ecosysteme est porte par `index.html`. Les pages de performances sont regroupees dans `performances/`.

### LivePalmes Direct

LivePalmes Direct est un dispositif separe, utilise uniquement lors des competitions nationales qui en ont besoin. Il regroupe les consoles terrain et les pages de series, resultats, medailles et archives publiees pendant ces competitions.

Son utilisation et sa maintenance sont documentees dans `docs/LIVEPALMES_DIRECT.md`.

## Technologies principales

LivePalmes utilise :

- HTML pour structurer les pages ;
- CSS pour leur presentation ;
- JavaScript natif pour les actions et traitements dans le navigateur ;
- Firebase pour les comptes, les donnees, les traitements serveur, les fichiers et l'hebergement ;
- Node.js pour les fonctions serveur, les tests, les imports et les outils de maintenance ;
- GitHub pour conserver le code et l'historique des modifications.

Il n'utilise pas de framework comme React, Vue ou Angular et ne possede pas de bundler racine.

## Organisation du depot

- `portail.html` : Portail LivePalmes ;
- `assets/livepalmes-admin-*.js` : principaux modules du portail ;
- `performances/` : espace public et outils de gestion des performances ;
- `pilotage-livepalmes.html` et les pages de roles : LivePalmes Direct ;
- `resultats.html`, `series-public.html` et `medailles.html` : publications publiques du Direct ;
- `functions/` : traitements Firebase executes cote serveur ;
- `tools/` : scripts de verification, generation et maintenance ;
- `tests/` : tests automatiques ;
- `docs/` : documentation fonctionnelle et technique.

Certaines pages restent volontairement a la racine pour conserver des adresses web simples et stables.

## Documentation utile

- `docs/ECOSYSTEME_LIVEPALMES.md` : presentation vulgarisee de l'ensemble, des outils et des comptes ;
- `docs/ARCHITECTURE.md` : architecture generale et relations entre les composantes ;
- `docs/STRUCTURE_LIVEPALMES.md` : carte des pages et dossiers ;
- `docs/module-engagements.md` : reference fonctionnelle des engagements ;
- `docs/gestion-base-performances.md` : imports, corrections et publication des performances ;
- `docs/droits-acces-livepalmes.md` : comptes, capacites et perimetres ;
- `docs/LIVEPALMES_DIRECT.md` : utilisation et fonctionnement specifique du Direct ;
- `docs/TESTS_MANUELS.md` : controles manuels sensibles ;
- `docs/agents/PUBLICATION.md` : regles de publication et de deploiement.

## Verification technique

Avant une mise en ligne importante, lancer :

```powershell
node tools/verify-livepalmes.js
```

Cette commande verifie notamment la syntaxe JavaScript, les tests automatiques, les garde-fous d'architecture et la coherence des pages generees.

Pour ajouter le smoke test navigateur :

```powershell
node tools/verify-livepalmes.js --browser
```

Les tests manuels adaptes au changement restent necessaires apres la verification automatique.
