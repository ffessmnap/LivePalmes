# LivePalmes Direct

<!-- description: Périmètre, démarrage local, publication et fonctions propres aux consoles du dispositif LivePalmes Direct. -->

## Six consoles multi-compétitions — ergonomie historique et bureau unique

Une seule page bureau : `direct-admin.html?id=ID_NAP` réunit import PDF, surveillance TXT, décisions à traiter, finales et accès. L’URL du rôle bureau `direct-consoles.html?id=ID_NAP&role=computer` redirige vers ce bureau ; aucun second bureau, iframe ou second abonnement d’authentification. Les réglages et explications facultatives restent repliés ; seules les erreurs utiles sont mises en évidence. Les commandes privées ne coupent pas la surveillance TXT.

`direct-consoles.html?id=ID_NAP&role=ROLE` ouvre le JA (`referee`), la vidéo (`video`), le speaker (`speaker`), le secrétariat (`secretary`) ou le Live (`live`). JA, vidéo, speaker et Live utilisent les vues pures historiques et leurs feuilles de style : mêmes panneaux, lignes cliquables, grille de motifs, pastilles, fenêtres, files vidéo et cartes d’historique. Les sources des anciennes pages nationales générées restent inchangées ; leurs anciennes données/PIN/synchronisations Firestore ne sont pas chargés. Le secrétariat conserve une ergonomie adaptée aux nouvelles finales. Grandes tablettes : JA, vidéo, Live et secrétariat ; bureau et speaker : ordinateur, avec accès tactile maintenu. Aucun environnement métier parallèle, compte de démonstration ou PIN ajouté.
