# LivePalmes Direct

<!-- description: Périmètre, démarrage local, publication et fonctions propres aux consoles du dispositif LivePalmes Direct. -->

## Perimetre

LivePalmes Direct est la composante utilisee pendant certaines competitions nationales. Elle ne sert pas a preparer toutes les competitions ni a gerer les engagements des clubs : ces fonctions appartiennent au Portail LivePalmes.

Le Direct comprend les consoles :

- Live ;
- Speaker ;
- Juge arbitre ;
- Juge video ;
- Bureau des performances ;
- Secretariat.

Il comprend aussi la publication des series, resultats, medailles, PDF et archives de la competition nationale concernee.

## Pages principales

- `pilotage-livepalmes.html` : accueil et pilotage du Direct ;
- `live.html` ;
- `speaker.html` ;
- `ja.html` ;
- `video.html` ;
- `bureau-perf.html` ;
- `secretariat.html` ;
- `series-public.html` et `resultats.html` : affichage public ;
- `medailles.html` et `archives.html` : medailles et archives ;
- `pdf.html`, `series-pdf.html` et `resultat-pdf.html` : vues PDF.

## Demarrage local

Demarrer le serveur local depuis la racine du depot :

```powershell
node tools/serve-local.js
```

Ouvrir ensuite :

```text
http://localhost:4173/pilotage-livepalmes.html
```

Ce serveur distribue les fichiers du depot sans les publier sur Internet. Il doit rester ouvert pendant le test.

Attention : sauf utilisation explicite des emulateurs prevus, une page locale peut encore se connecter au projet Firebase configure. Ne pas effectuer d'import, de publication ou d'ecriture pendant un simple controle local sans avoir confirme l'environnement et obtenu l'autorisation necessaire.

## Mettre a jour les series

1. Ouvrir le pilotage de LivePalmes Direct avec un compte autorise.
2. Utiliser l'action `Admin series`.
3. Choisir le PDF et le mode d'import adapte.
4. Controler le contenu detecte avant de confirmer l'import.
5. Verifier l'affichage des series et les pages PDF.
6. Publier seulement selon la procedure autorisee.

L'import et la publication de series touchent aux donnees de competition. Ils ne doivent pas etre testes sur Firebase de production sans validation explicite.

## Pages consoles generees

Les pages de roles sont generees depuis `pilotage-livepalmes.html` avec :

```powershell
node tools/build-console-pages.js
```

Pages concernees :

- `live.html` ;
- `speaker.html` ;
- `ja.html` ;
- `video.html` ;
- `bureau-perf.html` ;
- `secretariat.html`.

La verification globale controle leur synchronisation.

## Historique DSQ, forfaits et abandons

Cette fonction concerne uniquement LivePalmes Direct.

L'historique des disqualifications, forfaits et abandons est conserve dans le navigateur pendant l'utilisation. Le bouton `RAZ historique` est disponible sur la console Bureau des performances.

L'export PDF de cet historique est disponible sur les consoles Juge arbitre, Juge video et Bureau des performances.

## Verification et publication

Avant publication :

```powershell
node tools/verify-livepalmes.js
```

Pour un controle navigateur :

```powershell
node tools/verify-livepalmes.js --browser
```

Les tests manuels des series, resultats, PDF, finalistes, medailles et acces Firebase restent necessaires selon le changement realise.

La publication doit suivre `docs/agents/PUBLICATION.md`. Aucun deploiement Firebase ou envoi vers GitHub ne doit etre effectue sans autorisation explicite.
