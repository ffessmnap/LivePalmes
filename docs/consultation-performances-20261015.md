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

## Contre-exemple Quentin Rouillon confirmé

Le 15 octobre, Antoine confirme que Quentin Rouillon était CNHC à cette date. Écran IntraNAP TOP consulté en lecture seule : saison 2008, Île-de-France, Juniors Hommes, 50SF, ligne 5, CNHC, 03/02/2008, Le Perreux-sur-Marne, 27.80. Le lecteur TEST retrouve exactement la performance 63719, compétition 275, nageur 680, mais affiche club 659 / NDCAS / région 6 ; identité actuelle 106 / CNHC / région 3. Les résultats de compétition affichent aussi NDCAS. Avec région 3, le TOP LivePalmes exclut donc ce 27.80 et retient un autre résultat de Quentin, 28.45 à Palaiseau le 31/05/2008 (75173). L'écart concerne la sélection régionale autant que le libellé.

Cela établit un défaut de correspondance ou de source pour ce cas ; aucune conclusion sur une mutation historique n'est justifiée. Antoine n'a pas accès au PHP IntraNAP. Remplacer tous les clubs par le club actuel n'est pas une correction démontrée pour les nageurs ayant changé de club. Le diagnostic fixe de la compétition 275 ajoute un EXPLAIN et un SELECT indexé livepalmes_compet_id, plafond 5 001 / refus au-delà de 5 000 ; regroupement des couples référence performance / club actuel, sans contacts. Budget diagnostic total : 8 à 12 lectures constantes, dont un inventaire de noms de tables plafonné à 201 pour rechercher une éventuelle autre source native. Aucune modification des valeurs métier ni règle de conversion inventée.

## Preuves techniques acquises

PR #345, #346 et #347 : filtres serveur, JSON nageur et TOP complet. La compatibilité MySQL réelle est 5.7.30 : l'agrégation exacte MIN remplace ROW_NUMBER ; le remplacement JavaScript utilise une fonction pour préserver le caractère `$` du REGEXP SQL. PR #348 : sondes historiques privées. CI Linux complète réussie : 38797068350 et 38798500115. Déploiement du lot NAP 38799018251 sur 250d4f11 ; preuve commune applicative précédente 38798195818 sur 93b3dd42. Le run commun 38800162822 vérifie 250d4f11 ; son résultat reste à consigner.

Diagnostic privé 38800029511 réussi, 844 lignes Antoine / 132 références : 135 lignes CNHC, 48 lignes correspondant à d'autres clubs natifs, 661 sans correspondance directe. Aucune correspondance d'import trouvée. old_club et clubs_cnnp renvoient des collisions (106 = AC, 426 = PS), avec EnapId=0, pas une passerelle utilisable. Le plan réel du TOP complet utilise l'index course, estimation 82 517 lignes pour 100SF, puis hydratation par clés primaires ; aucun nouvel index.

Recette Chrome ordinateur/mobile 390 px : correction 100SF année 2007 accessible directement (15 lignes), compétition 220 (2 lignes), suite conservant les filtres puis réinitialisation correcte ; fiche Antoine 751 lignes natives identiques à la référence, 353 performances principales ; TOP 100SF hommes 3 512 lignes affichées au premier chargement, femmes 3 595, saison 2026 hommes 342, complete=true. Les 25 premières lignes restent strictement identiques aux références. Aucun débordement mobile, dimensions réinitialisées ; aucune action de sauvegarde/import/publication/recalcul. Captures dans C:/Users/ITIFP/Documents/Codex/livepalmes-consultation-20261015. Validation utilisateur des corrections non reçue ; problème clubs encore ouvert.

## Diagnostic ciblé terminé — compétition 275

PR #349 et #350 intégrées ; CI globale 38800671426 puis 38801926827 réussie. Le premier diagnostic 38801524568 a échoué sans résultat exploitable ; ne pas l'utiliser comme preuve. La recherche de noms de tables a ensuite été restreinte aux tables sportives, avec retour borné de l'étape/code en cas d'échec. Diagnostic final [38802602736](https://github.com/ffessmnap/LivePalmes/actions/runs/38802602736) complet, aucune erreur, aucune écriture ; lot NAP [38802467144](https://github.com/ffessmnap/LivePalmes/actions/runs/38802467144) réussi sur 5488c3162d8fa2a31e2ca69ae42b5d7b5fa849fe.

75 résultats dans la compétition 275 : 52 couples référence 659 / fiche actuelle 106 CNHC, 6 référence 660 / fiche 50 DN, 6 référence 661 / fiches 58 PPO ou 206 CSAKB, 4 référence 662 / fiche 57 CM, 7 référence 663 / fiche 52 CASV. La jointure directe affiche respectivement NDCAS, CSC, APO, FFESSM et ASSA Subaquatique. La séquence locale 659 à 663 suggère un ancien identifiant d'import ; elle ne démontre pas une conversion fiable ni le club historique de chaque personne. Aucun correctif par nageur/compétition en dur et aucun remplacement global par le club actuel appliqué. Les tables candidates visibles n'apportent pas de passerelle documentée ; txt_clubs ne contient pas les références examinées, et les archives de clubs n'ont pas d'EnapId utilisable.

Plan compétition : perfs ref livepalmes_compet_id, estimation 71 lignes, autres jointures eq_ref PRIMARY ; 75 lignes réellement retournées, aucune requête par résultat. La correction des clubs et des filtres régionaux demeure ouverte. Décision demandée à Antoine : conserver l'objectif historique en attendant une source fiable, ou autoriser explicitement un affichage/filtrage « Club actuel » distinct, sans changer les valeurs natives. Sans sa réponse, aucune modification de sens n'est autorisée. Cette question découle de l'interdiction AGENTS.md d'inventer une règle sportive et de la nécessité de préserver les mutations historiques ; ce n'est pas une nouvelle demande d'autorisation de déploiement TEST.

## Décision et livraison finale

Antoine choisit explicitement de conserver le club historique et rechercher une source fiable ; il indique ensuite ne rien retrouver dans IntraNAP. Aucun alignement sur le club actuel autorisé ou effectué. La fiche originale IntraNAP de 275 affiche « Aucun document lié » ; action competition de TEST confirme documents=[] et pdfUrl vide. Recherches publiques ciblées sans protocole identifiable. Source nécessaire : export WinPalme original ou sauvegarde e-NAP préservant la correspondance des références de clubs de cet import. Le code PHP IntraNAP n'est pas accessible à Antoine. Le problème clubs demeure confirmé/non résolu ; les étiquettes et la sélection régionale actuelles ne constituent pas une donnée historique validée. Aucun autre document ou sauvegarde privé supposé accessible.

Version applicative finale regroupée 5488c3162d8fa2a31e2ca69ae42b5d7b5fa849fe : [TEST commun 38803207014](https://github.com/ffessmnap/LivePalmes/actions/runs/38803207014) réussi, Hosting 95db627064e42fa6 ; lot NAP 38802467144 réussi, diagnostic complet 38802602736. La dernière différence backend concerne seulement le diagnostic privé ; les parcours recette PC/mobile restent identiques à la version déjà contrôlée. Le suivi documentaire ultérieur n'impose pas une nouvelle publication Hosting. Validation utilisateur des correctifs toujours attendue, aucune PROD ni donnée métier modifiée.

## Nouvelle investigation — écarts au sein de la compétition 3589

Antoine demande de poursuivre après la capture du 07/12/2019 : 100SF 50.86, 200SF 1:44.94 et 400SF 3:34.50 portent 14743 non résolu ; 200SF 1:38.17 affiche CNHC. La fiche publique de référence contient ces quatre lignes (434019, 434020, 434021, 434390) et affiche CNHC par résolution/repli. Ne pas confondre temps de passage et résultat final ; la lecture diagnostique conserve passage, relais et pid sans transformer les valeurs.

Budget supplémentaire conçu avant exécution : aucune lecture supplémentaire pour les lignes de capture (filtrées dans les 844 lignes déjà lues), une requête de métadonnées limitée à sept tables / 301 colonnes avec refus au-delà de 300, une lecture de cinq ids maximum dans la sauvegarde sauv_lp_20261006_perfs uniquement si structure et clé primaire conformes, une lecture indexable de txt_clubs par compétition 275/3589 limitée à 1001 et refus au-delà de 1000. Zéro écriture et aucun nouveau parcours public. Le résultat devra distinguer preuve de valeurs antérieures, mécanisme d'affichage actuel et hypothèse d'import ; aucune conversion globale ni règle sportive autorisée.
