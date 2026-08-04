# Regles Firebase LivePalmes

<!-- description: Périmètre des données Firestore et règles de sécurité Firebase utilisées par LivePalmes. -->

Ce fichier sert a sortir du mode test Firestore.

## Principe

LivePalmes utilise seulement ces zones dans Firestore :

- `competitions/livepalmes-active/alerts`
- `competitions/livepalmes-active/liveData/current`
- `competitions/livepalmes-active/roleLocks`
- `competitions/livepalmes-active/historyArchives`
- `competitions/livepalmes-active/resultArchives`
- `competitions/livepalmes-active/resultArchives/{archiveId}/items`
- `competitions/livepalmes-active/resultArchives/{archiveId}/resultPdfs`
- `competitions/livepalmes-active/resultArchives/{archiveId}/sessionResultsPdfs`
- `competitions/livepalmes-active/results`
- `competitions/livepalmes-active/resultPdfs`
- `competitions/livepalmes-active/sessionResultsPdfs`
- `competitions/livepalmes-active/public/resultsIndex`
- `competitions/livepalmes-active/public/seriesIndex`
- `competitions/livepalmes-active/public/archivesIndex`

Les regles dans `firestore.rules` bloquent tout le reste.

Important : comme LivePalmes n'utilise pas encore de vrais comptes Firebase Authentication, ces regles ne savent pas reconnaitre une personne. Elles limitent surtout les zones et la forme des donnees. La protection par codes reste geree par l'outil LivePalmes.

## Ce que les regles autorisent

- Lecture du programme, des alertes, des resultats publics et des archives de LivePalmes.
- Publication des series et des reperes via `liveData/current`.
- Creation et mise a jour des alertes arbitres, speaker, video, bureau des performances et secretariat.
- Reservation d'une console par role via `roleLocks`.
- Publication, remplacement et suppression des metadonnees PDF dans des collections separees ; les nouveaux fichiers sont servis par le stockage public et les anciens `pdfDataUrl` restent compatibles.
- Publication d'un index public leger pour limiter les lectures de la page resultats, avec etat public et infos de session.
- Publication d'un index public borne a 50 entrees pour afficher les archives en une lecture.
- Gestion des finalistes, forfaits, pre-forfaits et repechages dans les resultats.
- Archivage du journal d'arbitrage avant RAZ.
- Archivage public durable des resultats, des fiches nageurs et des PDF resultats avant nouvelle competition.

## Ce que les regles bloquent

- Toute autre competition que `livepalmes-active`.
- Toute collection non prevue par LivePalmes.
- L'ecriture directe sur le document racine `competitions/livepalmes-active`.
- Les documents `roleLocks` avec un role inconnu.
- Les documents `liveData` autres que `current`.

## Comment publier les regles

1. Ouvre la console Firebase.
2. Va dans `Firestore Database`.
3. Clique sur l'onglet `Regles`.
4. Remplace tout le contenu par celui du fichier `firestore.rules`.
5. Clique sur `Publier`.
6. Teste ensuite dans LivePalmes :
   - ouvrir les consoles ;
   - charger un PDF de series depuis Informatique ;
   - mettre a jour les reperes speaker depuis Google Sheet ;
   - publier un PDF resultat sans finale ;
   - publier un PDF resultat avec finale ;
   - annoncer les finalistes cote speaker ;
   - declarer un forfait finale cote secretariat ;
   - verifier le repechage cote speaker ;
   - verifier la page publique resultats ;
   - faire une fausse decision JA ;
   - confirmer cote video si besoin ;
   - traiter cote bureau des performances ;
   - exporter le journal ;
   - faire une RAZ historique ;
   - verifier que l'archive du journal est consultable depuis le portail ;
   - remettre a zero les resultats publics et verifier que l'archive des resultats apparait dans le portail.

## A retenir

Ces regles sont plus propres que le mode test, mais ce n'est pas une securite absolue. Pour une version plus verrouillee, il faudra plus tard ajouter Firebase Authentication ou une Cloud Function pour verifier les roles cote serveur.
