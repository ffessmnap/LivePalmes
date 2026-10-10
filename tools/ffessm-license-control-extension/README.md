<!-- description: Installation, format d’échange et règles de sécurité de l’extension locale de contrôle des licences FFESSM. -->

# LivePalmes — Contrôle des licences FFESSM

Extension locale Chrome/Edge qui contrôle un lot exporté par LivePalmes depuis une session **Ma Commission FFESSM** déjà connectée. Elle compare le numéro de licence, l’identité, la date de naissance et la date finale de validité affichée par le site fédéral.

## Ordre des recherches

L’extension cherche d’abord par numéro de licence lorsqu’il est renseigné, puis par nom et prénom, et enfin par nom seul si aucune correspondance concluante n’a été trouvée. Elle ne recherche jamais par prénom seul, afin d’éviter de parcourir de longues listes de résultats sans nom de famille.

Les candidats restent contrôlés sur le nom, le prénom, la date de naissance, le numéro de licence et la validité requise pour la saison.

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

L’export contient exactement une ligne par nageur, avec son statut et les informations du lot. Les données fédérales sont renseignées uniquement pour la correspondance d’identité unique retenue (`validable`, `licence_expiree` ou `anomalie_licence`). Pour les cas ambigus, les identités proches sans correspondance exacte, les introuvables et les recherches interrompues, ces champs restent vides : aucun candidat n’est choisi arbitrairement. Le statut et le détail restent disponibles pour le contrôle manuel.

L’import LivePalmes peut ainsi lire une seule ligne par identifiant. Seules les lignes `validable` non ambiguës sont proposées pour validation ; les autres restent à arbitrer dans l’administration nationale.

## Bilan Excel pour l’organisateur

Après le contrôle, choisir une compétition dans « Bilan organisateur — compétition », puis cliquer sur **Exporter le bilan Excel**. Le fichier `.xlsx` contient uniquement les nageurs inscrits à cette compétition : synthèse, une ligne par nageur, filtres, en-têtes figés et écarts détaillés. Les dossiers à vérifier apparaissent avant les conformes ; les dates sont de vraies dates Excel. La colonne Contrôle utilise des couleurs sobres et les informations fédérales sont limitées aux correspondances d’identité retenues.

Si le contrôle a été arrêté, les nageurs restants sont explicitement marqués **Non contrôlé** et comptés séparément. Le sélecteur lit `competitions_sources`, où LivePalmes sépare les compétitions par ` | `. En l’absence de cette information, le bilan porte la mention « Compétition non renseignée » et concerne le lot entier.

Le CSV de retour pour LivePalmes reste disponible et inchangé. L’Excel est généré localement, sans dépendance réseau ni envoi automatique.

## Sécurité et limites

- L’extension est limitée à `macommission.ffessm.fr` et n’a aucune permission réseau supplémentaire.
- Elle ne lit ni cookies, ni jetons, ni stockage navigateur et n’écrit jamais dans LivePalmes.
- Les données restent dans la page jusqu’à l’export manuel du CSV.
- Une pause minimale de 1,5 seconde est imposée entre les recherches.
- Les numéros de licence et dates de naissance sont des données personnelles : conserver puis supprimer les exports selon les règles applicables.
- Une évolution de l’interface Ma Commission peut nécessiter une adaptation des sélecteurs.

## Club et observations (1.2.0)

Le CSV envoyé à l’extension accepte la colonne facultative `club_livepalmes` (également `club`, `club_name`, `nom_club`). L’export du lot LivePalmes transmet désormais le club déjà connu, sans nouvelle lecture. Refaire cet export pour obtenir le club de tous les nageurs ; un ancien CSV reste compatible, avec « Non renseigné » dans la colonne Club LivePalmes.

Une colonne Observations indique une piste uniquement lorsqu’un profil est le seul à concorder sur deux éléments d’identité : nom ou prénom avec une petite faute et les deux autres éléments concordants, ou date de naissance différente/manquante avec nom et prénom concordants. La comparaison tolère une à deux insertions, suppressions, substitutions ou inversions voisines selon la longueur, au maximum 25 % du nom ; les noms trop différents ne produisent aucune suggestion. Les noms composés et l’ordre nom/prénom ou prénom/nom sont pris en charge aux limites du nom affiché. Plusieurs profils plausibles restent à départager sans identité proposée arbitrairement.

L’observation montre le profil fédéral et les deux valeurs de l’élément différent. Elle ne détermine pas quelle base a raison et n’entraîne ni validation ni correction automatique. Les colonnes Licence FFESSM et Validité FFESSM restent vides pour une piste non rapprochée. Une différence d’accent ou de présentation déjà tolérée par le contrôle peut également être signalée sans changer le statut.
