# LivePalmes

Outil de suivi live pour la nage avec palmes : console Live, Speaker, Juge arbitre, Juge video et Informatique.

En local, double-clique sur `Demarrer la console.bat`.

Ce lanceur :

- regenere les donnees au demarrage ;
- ouvre la console dans le navigateur ;
- surveille les fichiers sources ;
- regenere automatiquement `data.generated.js` et `donnees-speaker-france-2026.json` quand une source change ;
- permet aussi de relancer la regeneration depuis le bouton `Regenerer les donnees`.

Garde la fenetre ouverte pendant l'utilisation locale de la console.

## Organisation du dossier

Les fichiers visibles en ligne restent a la racine :

- `index.html`
- `styles.css`
- `app.js`
- `data.generated.js`
- `donnees-speaker-france-2026.json`

Les fichiers de travail sont ranges dans `sources` :

- `sources/series` : PDF des series. Le plus recent est utilise comme mise a jour active.
- `sources/resultats` : resultats des meetings et protocole France 2025.
- `sources/engagements` : fichiers TXT d'engagements, utiles si aucun PDF de series n'est disponible.
- `sources/records` : pages FFESSM records et MPF.
- `sources/qualifs` : temps EDF TSP/TRP.
- `sources/edf` : membres EDF et medailles internationales.

Les scripts sont ranges dans `outils` :

- `outils/build_data.py` : regenere les donnees.
- `outils/start_console.py` : demarre la console locale.
- `outils/watch_data.py` : surveille les sources.

## Utilisation simple

Pour changer les series :

1. Depose le nouveau PDF dans `sources/series`.
2. Lance la console locale avec `Demarrer la console.bat`.
3. Clique sur `Regenerer les donnees` si la console est deja ouverte.
4. Verifie l'affichage.
5. Publie ensuite les fichiers a jour sur GitHub/Firebase.

Si plusieurs PDF sont presents dans `sources/series`, le fichier le plus recent sert de mise a jour active.

## Mise en ligne

Pour GitHub ou Firebase Hosting, publie au minimum :

- `index.html`
- `styles.css`
- `app.js`
- `data.generated.js`
- `donnees-speaker-france-2026.json`

Firebase/GitHub ne relisent pas automatiquement les PDF ou les TXT. Il faut d'abord regenerer les donnees en local, puis publier les fichiers generes.

## Historique DSQ

L'historique des disqualifications, forfaits et abandons est stocke dans le navigateur pendant l'utilisation. Le bouton `RAZ historique` est disponible sur la console Informatique.

L'export PDF de l'historique est disponible sur les consoles Juge arbitre, Juge video et Informatique.
