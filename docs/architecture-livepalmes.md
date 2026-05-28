# Architecture LivePalmes

## Objectif

LivePalmes doit rester simple à utiliser en compétition, mais son code doit permettre de continuer à ajouter des fonctions sans fragiliser les consoles existantes.

L'architecture cible est une application composée de pages par rôle, appuyées sur des modules communs.

## Architecture cible

Pages principales :

- `speaker.html` : console speaker.
- `live.html` : console live.
- `ja.html` : console juge arbitre.
- `video.html` : console juge vidéo.
- `bureau-perf.html` : bureau des performances.
- `secretariat.html` : secrétariat.
- `index.html` : accueil et accès aux consoles.
- `speaker.html` : première page dédiée, avec ouverture sécurisée de la console speaker.
- `series-public.html` et `resultats.html` : pages publiques.

Modules communs :

- configuration : clés, rôles, délais, Firebase ;
- accès Firebase et collections ;
- état partagé de l'application ;
- navigation programme, courses, séries et finales ;
- rendu des nageurs, records et fiches nageurs ;
- alertes et annonces ;
- publication publique ;
- import séries et résultats ;
- tests navigateur.

## Etat actuel

`app.js` est encore le point d'entrée principal des consoles internes, mais il ne doit plus recevoir de nouvelle logique métier.

`speaker.html` est le premier palier de page dédiée. Elle réutilise encore le moteur commun, mais elle cible directement le rôle speaker sans supprimer l'accès historique par `index.html`.

Il sert progressivement à assembler :

- les réglages depuis `assets/livepalmes-app-settings.js` ;
- les modules depuis `assets/livepalmes-app-modules.js` ;
- les éléments HTML depuis `assets/livepalmes-app-dom.js` ;
- les accès à l'état partagé depuis `assets/livepalmes-app-state.js`.

## Règles de développement

1. Ne pas ajouter de nouvelle grosse fonction métier dans `app.js`.
2. Créer ou compléter un module dédié dès qu'une fonction concerne un domaine précis.
3. Garder les pages publiques isolées des consoles internes.
4. Après chaque refactor important, lancer `node tools/verify-livepalmes.js --browser`.
5. Publier uniquement après vérification complète.

## Chemin de migration conseillé

1. Stabiliser `app.js` comme assembleur sous 2000 lignes.
2. Sortir les options des workflows dans des modules d'assemblage.
3. Créer une première page dédiée, probablement `speaker.html`.
4. Une fois `speaker.html` validée, répéter pour `live`, `ja`, `video`, `bureau-perf`, puis `secretariat`.
5. Garder `index.html` comme accueil et accès rapide aux consoles.

## Critère "architecture propre finale"

LivePalmes pourra être considéré comme propre quand :

- aucune console ne dépend d'un fichier géant commun difficile à lire ;
- chaque page charge seulement les modules utiles à son rôle ;
- les imports PDF, résultats, alertes, nageurs et publication publique sont dans des modules séparés ;
- les tests navigateur couvrent l'ouverture des consoles et les actions critiques ;
- `app.js` est un assembleur court, idéalement autour de 1000 lignes ou moins.
