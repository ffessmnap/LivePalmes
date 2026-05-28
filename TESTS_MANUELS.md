# Tests manuels LivePalmes

Cette checklist sert avant une publication importante ou apres une modification sensible.

## Test rapide obligatoire

- Lancer `node tools/verify-livepalmes.js`.
- Avant une publication sensible, lancer aussi `node tools/verify-livepalmes.js --browser`.
- Verifier que le controle indique aussi les tests de regression resultats, les textes HTML publics et l'architecture.
- Ouvrir `index.html`.
- Verifier qu'aucune erreur n'apparait dans la console navigateur.
- Ouvrir la page publique `resultats.html`.
- Ouvrir la page publique `series-public.html`.
- Verifier que les pages affichent bien LivePalmes.

## Consoles internes

- Ouvrir la console Live.
- Ouvrir la console Speaker.
- Ouvrir la console JA.
- Ouvrir la console Video.
- Ouvrir la console Bureau des performances.
- Ouvrir la console Secretariat.
- Verifier que les codes PIN fonctionnent si les codes sont actifs.

## Series

- Importer un PDF de series complet.
- Verifier que les sessions apparaissent.
- Verifier qu'une course affiche les nageurs, lignes, categories et temps d'engagement.
- Verifier les records et pastilles MPF/RF/RFJ.
- Verifier la page publique des series.
- Verifier la recherche nageur publique.

## Resultats sans finale

- Importer un PDF resultat sans finale.
- Verifier que le PDF est publie.
- Verifier que les temps apparaissent sur la page resultats.
- Verifier que la fiche nageur affiche le temps realise.
- Verifier que le bouton PDF fonctionne.

## Resultats avec finale

- Importer un PDF resultat avec finalistes.
- Verifier les qualifies Finale A.
- Verifier les qualifies Finale B s'il y en a une.
- Verifier les non qualifies.
- Faire annoncer les finalistes par le speaker.
- Verifier que le bureau des performances et le secretariat voient le statut annonce.

## Forfaits et repechages

- Declarer un forfait en finale depuis le secretariat.
- Verifier que le nageur suivant est repeche.
- Verifier que l'alerte speaker apparait.
- Annoncer le repechage cote speaker.
- Verifier que l'alerte ne revient pas.
- Reintegrer un finaliste si besoin et verifier que la composition reste coherente.

## Alertes JA / Video / Bureau

- Creer une fausse decision JA.
- Confirmer cote video si necessaire.
- Verifier que le speaker recoit l'annonce.
- Cliquer sur Annonce cote speaker.
- Verifier que l'alerte disparait.
- Traiter cote bureau des performances.
- Verifier l'historique.

## Pages publiques

- Verifier `resultats.html`.
- Verifier `series-public.html`.
- Verifier le bouton actualiser.
- Verifier la recherche nageur.
- Verifier qu'une fiche nageur affiche engagement, temps realise, finale, DSQ/ABD/forfait si present.

## Diagnostic et maintenance

- Ouvrir le diagnostic technique.
- Verifier qu'il ne signale pas d'alerte grave.
- Ouvrir le diagnostic performance.
- Verifier qu'il n'y a pas de vieux PDF resultats a nettoyer.
- Ne lancer une RAZ que si la competition est terminee ou si c'est un vrai test.
