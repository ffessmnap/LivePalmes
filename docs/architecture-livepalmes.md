# Architecture LivePalmes

## Objectif

LivePalmes doit rester simple a utiliser en competition, mais son code doit permettre de continuer a ajouter des fonctions sans fragiliser les consoles existantes.

L'architecture cible est une application composee de pages par role, appuyees sur des modules communs.

## Architecture cible

Pages principales :

- `index.html` : accueil et acces historique aux consoles.
- `live.html` : console live.
- `speaker.html` : console speaker.
- `ja.html` : console juge arbitre.
- `video.html` : console juge video.
- `bureau-perf.html` : bureau des performances.
- `secretariat.html` : secretariat.
- `series-public.html` et `resultats.html` : pages publiques.

Modules communs :

- configuration : cles, roles, delais, Firebase ;
- acces Firebase et collections ;
- etat partage de l'application ;
- navigation programme, courses, series et finales ;
- rendu des nageurs, records et fiches nageurs ;
- alertes et annonces ;
- publication publique ;
- acces commun aux resultats publies ;
- import series et resultats ;
- tests navigateur.

## Etat actuel

`app.js` est encore le point d'entree principal des consoles internes, mais il ne doit plus recevoir de nouvelle logique metier.

Les pages dediees par role reutilisent encore le moteur commun, mais elles ciblent directement leur console sans supprimer l'acces historique par `index.html`.

`app.js` sert progressivement a assembler :

- les reglages depuis `assets/livepalmes-app-settings.js` ;
- les modules depuis `assets/livepalmes-app-modules.js` ;
- les elements HTML depuis `assets/livepalmes-app-dom.js` ;
- les acces a l'etat partage depuis `assets/livepalmes-app-state.js`.

## Regles de developpement

1. Ne pas ajouter de nouvelle grosse fonction metier dans `app.js`.
2. Creer ou completer un module dedie des qu'une fonction concerne un domaine precis.
3. Garder les pages publiques isolees des consoles internes.
4. Apres chaque refactor important, lancer `node tools/verify-livepalmes.js --browser`.
5. Publier uniquement apres verification complete.

## Pages consoles

Les pages dediees (`live.html`, `speaker.html`, `ja.html`, `video.html`, `bureau-perf.html`, `secretariat.html`) sont generees depuis `index.html`.

Commande :

```powershell
node tools/build-console-pages.js
```

Le controle general verifie que les pages generees sont bien a jour.

Le controle `tools/check-console-page-loads.js` mesure les scripts charges par page dediee et bloque le retour de modules inutiles sur certains roles. Il donne un compteur utile avant chaque nouvel allegement.

## Chemin de migration conseille

1. Garder `app.js` comme assembleur court.
2. Garder les pages dediees synchronisees avec le moteur commun.
3. Extraire ensuite les modules utiles par role.
4. Faire charger a chaque page uniquement ce dont elle a besoin.
5. Garder `index.html` comme accueil et acces rapide aux consoles.

## Critere "architecture propre finale"

LivePalmes pourra etre considere comme propre quand :

- aucune console ne depend d'un fichier geant commun difficile a lire ;
- chaque page charge seulement les modules utiles a son role ;
- les imports PDF, resultats, alertes, nageurs et publication publique sont dans des modules separes ;
- les tests navigateur couvrent l'ouverture des consoles et les actions critiques ;
- `app.js` est un assembleur court, idealement autour de 1000 lignes ou moins.
