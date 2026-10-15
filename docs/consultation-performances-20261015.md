# Consultation des performances — 15 octobre 2026

<!-- description: Filtres serveur de correction, diagnostic des clubs NAP, réparation fiche nageur JSON et affichage complet TOP ; budgets et preuves TEST en lecture seule. -->

## Autorisation et périmètre

Antoine autorise les Cloud Functions de consultation et l'investigation des clubs NAP en lecture seule jusqu'au TEST commun. Aucune écriture métier, migration, règle/index, droit, mail, scheduler ou PROD. Sa confirmation précédente valide l'accès aux trois modules de ee96f412 ; elle ne valide pas les nouveaux parcours de ce correctif.

## Constats et corrections

- Correction : les filtres étaient construits uniquement sur les 100 résultats déjà reçus. Ils proviennent maintenant des métadonnées de tout l'historique borné du nageur ; course/année civile/compétition sont appliqués dans la requête serveur. Les pages suivent date puis id décroissants, avec curseur composé ; compatibilité des anciens curseurs numériques conservée. Les éditions d'une compétition sont distinguées par id et affichées avec date/lieu. Une réponse dépassée ne remplace pas le filtre courant.
- Clubs : 100SF d'Antoine du 13/01/2008, performance 61423 / compétition 251 / club brut 598 → ROC. 100SF du 25/11/2007, club brut 426 → CSLG. Le formulaire privé et la fiche NAP publique concordent. Ces références sont réellement enregistrées sur les performances ; elles ne sont pas remplacées par CNHC. Cela ne prouve pas leur justesse historique. Les valeurs sans correspondance deviennent explicitement « Club non résolu (valeur) ». Le diagnostic privé fixé au nageur 912 regroupe toutes ses valeurs, compte les correspondances éventuelles avec l'id compétition et conserve trois exemples par valeur.
- Fiche nageur : l'appel par id sans action recevait text/html, l'action swimmer reçoit application/json et 751 lignes pour 912 lors du contrôle. Le client indique toujours son action ; le serveur conserve les anciens appels par id comme JSON, sans modifier l'accueil sans id.
- TOP : les 25 premiers étaient servis depuis une sélection de 5 001 performances brutes. Le 100SF hommes réel répond complete=false ; relever seulement la limite ne suffit pas. Pour la consultation complète, une agrégation SQL bornée retient le meilleur résultat admissible par id nageur, puis le code sportif existant conserve sa normalisation et son regroupement par identité. Ordre inchangé : temps compact interprété numériquement, date, id. Les autres limites partielles restent compatibles. Le navigateur demande 5 000 entrées, les affiche toutes et masque le palier de 25. Un dépassement demande explicitement d'affiner les filtres.

## Budget conçu avant implémentation

| Action | SQL / bornes, hors contrôle d'accès |
| --- | --- |
| Recherche nageur administration | Service existant, inchangé |
| Sélection du nageur en correction | 2 SELECT : métadonnées indexées nageur, sentinelle 5 001 / refus au-delà de 5 000 ; page de 101 / 100 affichées |
| Changement de filtre | 2 SELECT : comptage nageur borné à 5 001 puis page filtrée 101 ; aucune lecture par ligne |
| Page suivante / retour / rafraîchissement | Même plafond 2 SELECT, curseur et filtres envoyés ensemble ; facettes gardées en mémoire pendant la consultation, aucune reconstruction |
| TOP complet | 2 SELECT, 3 si années de naissance demandées : comptage indexé de la course borné à 150 001 ; agrégation sur ce périmètre plafonné ; au plus 5 001 meilleurs résultats natifs, au plus 5 000 affichés. Aucune pagination automatique ni lecture N+1 |
| Fiche nageur | Lecteur existant : identité et au plus 2 001 performances, refus au-delà de 2 000 ; correction du routage sans nouvelle lecture |
| Diagnostic clubs privé | 5 à 9 lectures : VERSION, EXPLAIN historique, historique de 912 plafonné à 5 001, structure des tables de clubs plafonnée à 201 colonnes, au plus deux correspondances d'import et deux correspondances historiques old_club/clubs_cnnp par ids groupés si structure et clé primaire conformes, EXPLAIN TOP complet. Aucun SQL libre, aucune écriture, endpoint IAM TEST déjà protégé |

Les LIMIT bornent les candidats/résultats, pas à eux seuls les lignes examinées par MySQL. La sélection TOP peut travailler sur toute la course dans la borne 150 000 déjà contrôlée. Le diagnostic doit vérifier le plan et la compatibilité SQL réels avant de conclure à la recette ; aucun nouvel index n'est prévu.

## Vérification et livraison

Tests hors ligne : facettes hors première page, filtres paramétrés, curseur date/id, rejet des entrées invalides, maintien des valeurs natives et empreintes, réponse dépassée, pagination conservant les filtres, routage JSON avec/sans action, TOP dépassant 25 et équivalence des résultats/ties/identités, diagnostic sans écriture. Suite globale locale arrêtée sur Bash absent ; CI Linux requise avant intégration. Recettes TEST ordinateur/mobile, diagnostic réel, SHA/PR/runs et validation utilisateur à compléter après publication.
