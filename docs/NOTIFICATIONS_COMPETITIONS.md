# Notifications des compétitions

<!-- description: Regroupement CCI, temporisation documentaire et tâches persistantes des notifications NAP ; budgets de lecture et limites de recette TEST. -->

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
