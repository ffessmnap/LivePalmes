# Tests manuels LivePalmes

<!-- description: Checklist de tests manuels à exécuter avant une publication ou après une modification sensible. -->

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
- Verifier qu'une console affiche la connexion email/mot de passe avant le PIN.
- Verifier qu'un compte sans `consoles.access`, `consoles.manage` ou fallback actuel `admin.full` est refuse.
- Verifier qu'un compte avec `consoles.access` peut saisir le PIN speaker, referee, video, computer ou secretary sans perdre ses droits permanents.
- Verifier qu'une ancienne session anonyme ne peut plus appeler la verification du PIN.

## Series

- Importer un PDF de series complet.
- Verifier que les sessions apparaissent.
- Verifier qu'une course affiche les nageurs, lignes, categories et temps d'engagement.
- Verifier les records et pastilles MPF/RF/RFJ.
- Verifier la page publique des series.
- Verifier la recherche nageur publique.
- Verifier qu'un nouveau PDF de series s'ouvre depuis son URL de stockage public.

## Resultats sans finale

- Importer un PDF resultat sans finale.
- Verifier que le PDF est publie.
- Verifier que les temps apparaissent sur la page resultats.
- Verifier que la fiche nageur affiche le temps realise.
- Verifier que le bouton PDF fonctionne.
- Verifier dans Firestore que le nouveau document PDF contient `pdfUrl` et `storagePath`, sans `pdfDataUrl` lorsque la fonction de stockage est disponible.

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
- Verifier `archives.html` avec `public/archivesIndex`, puis son repli historique sur un environnement ou l'index est absent.
- Verifier `performances/records.html` et `performances/mpf.html` sans connexion Firestore : les donnees statiques doivent s'afficher.
- Publier une modification RF ou MPF depuis l'administration, puis verifier sans redeployer que `performance-public-firestore/records/manifest.json` change et que la valeur apparait sur la page publique.
- Verifier que Records, MPF et une fiche nageur restent utilisables si le manifeste Storage est temporairement indisponible : le fichier Hosting doit servir de secours.

## Portail LivePalmes

- Verifier qu'une connexion n'ouvre aucune liste d'administration tant que son ecran n'est pas visite.
- Ouvrir successivement Records / MPF, Correction puis Import : les deux premiers ecrans ne doivent pas charger XLSX ; l'import doit accepter un fichier Excel apres son chargement a la demande.
- Dans Records / MPF, saisir au moins deux lettres d'un nageur et verifier les suggestions, la date de naissance et le club sans chargement de `admin-reference.js`.
- Verifier la pagination et les filtres de Gestion des acces avec un profil national puis regional ; une recherche bornee doit inviter a affiner les filtres.
- Envoyer une demande d'acces publique valide, puis verifier qu'un doublon est refuse et qu'une rafale de demandes est limitee.
- Desactiver un compte de test et verifier qu'une nouvelle requete avec son ancien jeton est refusee apres actualisation.
- Ouvrir l'espace DTN sur un cache chaud, puis forcer un recalcul sur un environnement de test et verifier les metadonnees `readStats`.

- Couper Firestore dans un environnement de test et verifier que les pages Series et Resultats conservent leur dernier cache au lieu de remplacer l'affichage par une erreur.

## Diagnostic et maintenance

- Ouvrir le diagnostic technique.
- Verifier qu'il ne signale pas d'alerte grave.
- Ouvrir le diagnostic performance.
- Verifier qu'il n'y a pas de vieux PDF resultats a nettoyer.
- Verifier que les index publics restent sous 650 ko ; entre 650 et 900 ko, planifier leur decoupage par session.
- Ne lancer une RAZ que si la competition est terminee ou si c'est un vrai test.
