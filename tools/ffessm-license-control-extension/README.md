<!-- description: Installation, format d’échange et règles de sécurité de l’extension locale de contrôle des licences FFESSM. -->

# LivePalmes — Contrôle des licences FFESSM

Extension locale Chrome/Edge qui contrôle un lot exporté par LivePalmes depuis une session **Ma Commission FFESSM** déjà connectée. Elle compare le numéro de licence, l’identité, la date de naissance et la date finale de validité affichée par le site fédéral.

## Règle sportive appliquée

La saison sportive va du 1er septembre de l’année A au 31 août de l’année A+1. Pour être validable pendant la saison `A-A+1`, une licence doit être valable au moins jusqu’au **31 décembre A+1**.

Exemple : pour la saison `2026-2027`, y compris une compétition du 15 septembre 2026, la date minimale acceptée est `31/12/2027`. Une validité au `31/12/2026` est classée `licence_expiree`.

## Installation locale

1. Ouvrir `chrome://extensions` (ou `edge://extensions`).
2. Activer **Mode développeur**.
3. Cliquer sur **Charger l’extension non empaquetée**.
4. Sélectionner le dossier `tools/ffessm-license-control-extension`.
5. Ouvrir ou actualiser `https://macommission.ffessm.fr/pages/accueil`.

Le bouton **Contrôle licences LivePalmes** apparaît en bas à droite.

## Fichier d’entrée LivePalmes

Le séparateur peut être le point-virgule, la virgule ou la tabulation. Les colonnes suivantes sont attendues :

```csv
lot_id;saison;livepalmes_id;nom;prenom;date_naissance;licence_livepalmes;competitions_sources
lot-2026-09;2026-2027;nageur-123;DUPONT;Camille;19/03/2004;A-12-345678;Championnat national
```

Un lot contient une seule saison et un nageur ne doit apparaître qu’une fois, même s’il vient de plusieurs compétitions.

## Résultats

- `validable` : identité unique, licence concordante (ou absente dans LivePalmes) et validité suffisante ;
- `licence_expiree` : concordance exacte mais date finale antérieure au 31 décembre requis ;
- `anomalie_licence` : identité exacte, numéro fédéral différent ;
- `anomalie_identite` : candidat proche à examiner ;
- `ambigu` : plusieurs identités exactes ;
- `introuvable`, `timeout` ou `erreur` : contrôle manuel nécessaire.

L’export conserve tous les candidats et toutes les comparaisons. L’import LivePalmes devra seulement valider automatiquement les lignes `validable` non ambiguës ; les autres restent à arbitrer dans l’administration nationale.

## Sécurité et limites

- L’extension est limitée à `macommission.ffessm.fr` et n’a aucune permission réseau supplémentaire.
- Elle ne lit ni cookies, ni jetons, ni stockage navigateur et n’écrit jamais dans LivePalmes.
- Les données restent dans la page jusqu’à l’export manuel du CSV.
- Une pause minimale de 1,5 seconde est imposée entre les recherches.
- Les numéros de licence et dates de naissance sont des données personnelles : conserver puis supprimer les exports selon les règles applicables.
- Une évolution de l’interface Ma Commission peut nécessiter une adaptation des sélecteurs.
