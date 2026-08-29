# LivePalmes

<!-- description: Présentation générale de LivePalmes, démarrage local et principaux outils du dépôt. -->

Outil de suivi live pour la nage avec palmes : console Live, Speaker, Juge arbitre, Juge video et Informatique.

En local, double-clique sur `Demarrer la console.bat`.

Ce lanceur :

- regenere les donnees au demarrage ;
- ouvre la console dans le navigateur ;
- surveille les fichiers sources ;
- regenere automatiquement `data.generated.js` et `donnees-speaker-france-2026.json` quand une source change ;
- permet aussi de relancer la regeneration depuis le bouton `Regenerer les donnees`.

Garde la fenetre ouverte pendant l'utilisation locale de la console.

## Verification avant publication

Avant de mettre en ligne une mise a jour importante, lance :

```powershell
node tools/verify-livepalmes.js
```

Cette commande verifie la syntaxe JavaScript, lance les tests automatiques simples et controle les erreurs d'espaces Git.

Si la commande finit par `Verification LivePalmes OK.`, la base technique est saine. Il faut ensuite faire les tests manuels utiles de `docs/TESTS_MANUELS.md`, surtout apres une modification sur les PDF, les resultats, les finalistes ou Firebase.

## Organisation du dossier

Les pages accessibles en ligne restent a la racine pour garder des URL simples et stables :

- `index.html`, `public.html`, `resultats.html`, `series-public.html`, `archives.html`
- `live.html`, `speaker.html`, `ja.html`, `video.html`, `bureau-perf.html`, `secretariat.html`
- `pdf.html`, `resultat-pdf.html`, `series-pdf.html`

Les scripts applicatifs sont ranges dans `assets/`.

- `assets/livepalmes-*.js` : modules des consoles et du coeur LivePalmes.
- `assets/pages/` : scripts propres aux pages publiques autonomes.
- `performances/` : espace public des records, MPF, TOP et fiches nageurs.
- `functions/` : fonctions Firebase cote serveur.
- `tools/` : scripts de verification et maintenance.
- `tests/` : tests automatiques.
- `docs/` : documentation technique et notes de suivi.

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
- `assets/`
- `data.generated.js`
- `donnees-speaker-france-2026.json`

Firebase/GitHub ne relisent pas automatiquement les PDF ou les TXT. Il faut d'abord regenerer les donnees en local, puis publier les fichiers generes.

Le parcours securise de verification, apercu et mise en ligne est explique dans `docs/MISE_EN_LIGNE.md`.

## Records et MPF

Firestore est la source officielle des Records / MPF :

- document : `competitions/livepalmes-active/performanceData/records` ;
- fichier statique de secours : `performances/public/data/records-data.js` ;
- pages concernees : `performances/records.html`, `performances/mpf.html`, `performances/nageur.html` et la rubrique Records / MPF du portail.

Apres une modification publiee depuis la rubrique Records / MPF du portail, synchronise le fallback statique :

```powershell
node tools/sync-records-from-firestore.js --write
```

Sans `--write`, le script fait un dry-run. Avec `--write`, il sauvegarde l'ancien `records-data.js`, reecrit le fallback depuis Firestore et met a jour les versions de cache des pages qui chargent ce fichier.

## Historique DSQ

L'historique des disqualifications, forfaits et abandons est stocke dans le navigateur pendant l'utilisation. Le bouton `RAZ historique` est disponible sur la console Informatique.

L'export PDF de l'historique est disponible sur les consoles Juge arbitre, Juge video et Informatique.
