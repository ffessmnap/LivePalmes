# Notifications des compétitions

<!-- description: Regroupement CCI, temporisation documentaire et tâches persistantes des notifications NAP ; budgets de lecture et limites de recette TEST. -->

## TXT eau libre à la clôture — préparation du 27 octobre 2026

Antoine demande le rattrapage de la clôture d'Andernos et l'envoi du TXT informatique pour cette compétition et les prochaines clôtures. Le correctif inclut le TXT eau libre au contact informatique déclaré, avec les mêmes contrôles du réglage national, de l'audience et des doublons que pour la piscine. Il réutilise le sérialiseur du téléchargement manuel validé ; une référence native absente, périmée ou non reconnue bloque la préparation du TXT. Aucun format sportif supplémentaire n'est déduit.

Le supplément de coût est nul à l'ouverture, à l'actualisation et pour les PDF clubs. La phase d'export ajoute exactement deux SELECT groupés par TXT eau libre : une compétition par clé primaire (limite 2, exactement une ligne requise), puis les références du programme par leurs clés primaires (300 identifiants maximum, limite 301). Ce budget reste identique avec 1 ou 5 000 nageurs et s'ajoute au lecteur borné des dossiers existant. Aucun document Firestore supplémentaire par nageur, nouvelle collection ou reconstruction globale. Les nouvelles notifications utilisent ce comportement après publication spécifique des consommateurs mail ; aucun événement ancien n'est réinitialisé. Le rattrapage réel d'Andernos est une opération distincte explicitement autorisée.

Tests hors réseau : sortie identique au téléchargement manuel, inscrits sans épreuve, catégories et WID existants, absence de mutation, budget fixe à 200 nageurs, catalogue incomplet et référence absente refusés, contact informatique absent, contrôles CCI et arrêt SMTP TEST. Publication TEST et mise en production à consigner après réussite ; cette préparation n'active pas le correctif en PROD.

## Périmètre approuvé le 25 octobre 2026

Les nouvelles ouvertures et notifications documentaires utilisent des lots de 50 adresses en CCI. Les récapitulatifs de clôture regroupent les administrateurs éligibles d'un même club avec son seul PDF (division de sécurité au-delà de 50 adresses). Le pied de mail commun renvoie vers `/portail.html#mon-compte`. Les préférences restent individuelles.

Le premier dépôt notifié ouvre une fenêtre fixe de cinq minutes, sans report par les dépôts suivants. La publication des documents reste immédiate. Une tâche serveur persistante traite ensuite l'événement. Ouvertures et clôtures manuelles la déclenchent immédiatement après confirmation ; le contrôle des clôtures automatiques reste toutes les cinq minutes et assure aussi les reprises. Les anciens événements conservent leur format et ne sont pas rejoués ni migrés.

Les tâches utilisent les SDK Firebase déjà présents. Aucun nouveau framework, paquet npm, index, table NAP ou collection Firestore. Les collections techniques existantes `engagementClosureQueue`, `engagementMailJobs` et `engagementConfigurations` sont réutilisées. Le statut par destinataire distingue acceptation SMTP, rejet, annulation et résultat incertain. Aucun renvoi automatique d'une tentative SMTP commencée.

## Budget conçu avant implémentation

- Ouverture d'écran et rafraîchissement : liste existante paginée à 100 courriels techniques, sans lecture des comptes par ligne ; aucun listener ajouté.
- Dépôt notifié : lectures ciblées existantes de la compétition et de l'annuaire (96 fragments maximum, 32 pour chacune des trois capacités, plafond de 10 000 destinataires), puis transaction de fenêtre bornée à trois documents techniques. Aucune lecture des compétitions de la base. Fusion de 20 documents maximum par fenêtre ; au-delà, nouvelle fenêtre.
- Préparation d'un événement : annuaire mutualisé par invocation, une lecture groupée native des clubs (1 000 maximum), compétition mutualisée, dossiers de clôture bornés à 500 clubs via l'adaptateur existant. Pages de 1 000 destinataires ou cinq PDF ; au plus 250 groupes créés par transaction, sous la limite de 500 écritures. Pas de requête SQL par destinataire.
- Livraison : références des groupes conservées sur l'événement (plafond 1 000), lecture directe par lot de 20. Pour chaque groupe, transaction sur le mail, le réglage, l'état de compétition et au plus 50 comptes via un seul `getAll`. Le coût dépend de l'audience autorisée et des limites de lot, jamais du volume total de la base. Vérification fraîche des préférences, statut, adresse et club avant SMTP.
- Pire cas réaliste : 10 000 destinataires, 200 envois techniques pour un contenu identique ; clôture de 500 clubs, au plus 702 groupes avec division à 50. Pour le cas audité (246 adresses, deux dépôts dans la même fenêtre), cinq envois techniques au lieu de 492. Le quota du fournisseur reste compté en destinataires.
- Reprise périodique : requête existante `runAt <= maintenant`, cinq événements maximum ; pas d'accélération du planificateur. Budget temporel borné pour chaque invocation, continuation persistante si nécessaire.

## Vérification et publication

Recette sur fixtures et transport SMTP simulé uniquement : regroupement, isolation des PDF, absence de destinataires visibles, préférences modifiées pendant l'attente, rejets partiels, interruptions, doublons de tâches et échéance fixe. Le nouveau transport groupé refuse tout SMTP sur TEST, même si le réglage y était activé. Le réglage national doit rester strictement identique pendant la publication TEST. Aucune activation, donnée sportive ou publication PROD n'est incluse.

Le workflow backend propose `notification_bcc_tasks=true` avec `notification_final_check=true`, lot email et `main`. La sélection exacte comprend les notifications documentaires, leur suivi, le traitement manuel, le contrôle périodique, le nouveau worker et les deux modifications de compétition qui arment les événements. L'inventaire ne peut gagner que `processNapNotificationTask` ; les traitements hors sélection restent inchangés. Précondition supplémentaire : API Cloud Tasks activée sur TEST, droits de création de tâches limités à sa file et droit d'invocation du worker pour le compte d'exécution existant. Les permissions des utilisateurs du portail ne changent pas. Après ce déploiement ciblé, le circuit commun publie la version intégrée et conserve les preuves backend.

La bibliothèque documentaire nationale conserve son circuit existant et son arrêt SMTP strict sur TEST. Le présent lot porte sur les notifications des compétitions, objet de l'incident audité.

Recette technique du 25 octobre : `19879142` (PR #507), publication ciblée `40172214744` tentative 2, sept fonctions actives. Réglage TEST désactivé/révision 4 conservé sans écriture. Le compte CI a reçu `roles/cloudtasks.queueAdmin` uniquement sur la file TEST nouvellement créée après le refus initial `queues.get` ; le runtime avait déjà les droits nécessaires. Tâche témoin planifiée à +300 s, réception à +300,146 s et HTTP 204, sans accès métier ni SMTP. Accès anonyme au worker refusé (HTTP 403), aucune autorisation publique sur son service. Il s'agit d'une mesure de recette unique, pas d'une garantie de délai de réception en boîte mail. Le quota du fournisseur reste compté en destinataires.

Références IAM : [rôles Cloud Tasks](https://docs.cloud.google.com/iam/docs/roles-permissions/cloudtasks) et [politique d'accès propre à une file](https://docs.cloud.google.com/tasks/docs/reference/rest/v2/projects.locations.queues/setIamPolicy). Conserver les bindings existants et l'etag lors d'une mise à jour ; ne pas remplacer cette permission de file par un rôle Cloud Tasks sur tout le projet.

Version commune TEST publiée par `40172919385` : candidat `19879142`, Hosting `8d06cc00f652dd1f`, suite globale Linux réussie, 115 fonctions actives dont 108 au candidat et sept exclusions conservées. La sélection ordinaire calculée de 105 fonctions a été conservée en entier ; aucun redéploiement email/scheduler par cette voie. Réglage mail encore désactivé/révision 4 et inchangé après publication. Le portail et le script CCI sont servis au bon cache ; référence privée refusée en 404. Recette utilisateur de cette version attendue, aucune publication PROD.
