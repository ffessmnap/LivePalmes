# Audit A6 — Fiabilité des parcours actifs

<!-- description: Périmètre A6, budgets de lecture, observations d’exploitation et preuves de livraison TEST et PROD. -->

## Candidat

Base `023cc744`, après clôture A4. Les anciennes URL retirées par A5 sont hors périmètre. Les trois anciennes bibliothèques de rendu de résultats signalées par FRONT-11 ne sont pas chargées directement par les pages actives du nouveau Direct examinées. Le correctif porte sur l’éditeur Records du portail. Les droits, catégories, décisions et calculs sportifs ne changent pas.

| Constats | Comportement et recette |
| --- | --- |
| DON-3, BACK-5 | Une seule requête horaire indexée sur la source NAP et l’échéance, limitée à cinq documents comme avant. Zéro lecture par élément pour le filtrage. Aucun événement historique supprimé. Les erreurs par événement ont une étape et une catégorie fermée. Le traitement poursuit le lot. Reprise, concurrence et anti-doublon restent sous les contrôles existants. |
| DON-4 | Si seuls des champs étrangers à la projection changent, notamment la dernière connexion, zéro lecture Firestore supplémentaire et zéro transaction SQL. Les créations, suppressions et changements des champs utiles reprennent le verrou et la relecture courante déjà en place, sur un UID. |
| FRONT-1, FRONT-5 | Les six pages utilisant public.css citent la même version. Les textes multiligne du calendrier utilisent la feuille du portail sous sa CSP existante. |
| FRONT-2 | TOP et fiche gardent le délai de 30 s pendant le téléchargement et la lecture de la réponse. AbortController et un minuteur remplacent AbortSignal.timeout. Recette avec services fictifs. Aucun appareil iOS 15 physique qualifié. |
| FRONT-3 | Le navigateur vérifie par SRI les scripts secondaires du chargeur A6 avant exécution. Une version différente est refusée ; le brouillon reste dans la page, l’utilisateur peut réessayer ou recharger. Le mécanisme commence avec les onglets ayant chargé A6. Il ne remplace pas les scripts dans un onglet ouvert sur une version antérieure à A6. Régénérer les empreintes avec `node tools/refresh-portal-script-integrity.js` après changement de l’un de ces scripts. |
| FRONT-9, FRONT-11 | Bouton de sélection natif dans la ligne Records, rétablissement du focus clavier, texte et attributs échappés. Lien d’évitement dans la navigation commune et contraste renforcé dans Performances. Essais clavier à 390/1280 px sur données fictives et navigation tactile sur Chromium. |
| EXPL-2 | [Fiche imprimable](../direct-secours.html) accessible depuis le guide du nouveau Direct. Les responsables bureau et suppléant sont à compléter par l’organisateur. Impression sur une page contrôlée. Une répétition avec un second référent reste à organiser. |
| EXPL-3 | Le lecteur public signale les erreurs de service sans consigner l’URL, les paramètres ou l’erreur brute. Le planificateur sépare préparation, mise en file et distribution. |
| BACK-4 | Mesures ci-dessous. Plafond existant et téléchargement individuel conservés. |
| EXPL-10 | SPF, DKIM et DMARC ont réussi pour le message de sauvegarde déjà reçu. Les relevés DNS et les limites de cette observation figurent ci-dessous. |
| PERF-2 | Les deux projets sont rattachés à la facturation. Les dépenses et les budgets par projet restent à établir. |
| PERF-4 | Les mesures des réponses HTTP et des latences par route figurent ci-dessous. Elles ne justifient pas de nouveau cache partagé. |

## Observations du 19 novembre 2026

- File : projection limitée à la source et à l’échéance des cinq premiers événements échus par projet. PROD : un historique. TEST : cinq NAP dans cette fenêtre. Aucune remise en file et aucun envoi. L’index composé `source ASC, runAt ASC` pour la collection `engagementClosureQueue` manque dans les deux projets au relevé initial. La disponibilité de l’index devra précéder la mise en service du code.
- Supervision : aucune sonde de disponibilité ni politique Cloud Monitoring renvoyée pour ces projets. Les alertes de sauvegarde existantes sont distinctes. Antoine est le destinataire prévu pour les futures alertes techniques. Leur activation reste à décider.
- Facturation liée aux deux projets. La lecture des budgets a renvoyé `SERVICE_DISABLED` pour l’API Billing Budgets. Montants, destinataires et dépenses par projet non établis. Seuils prévus : 50 %, 90 % et 100 % une fois l’enveloppe convenue.
- Délivrabilité : le message de sauvegarde déjà reçu portait SPF, DKIM et DMARC « pass ». Un enregistrement SPF était présent pour le domaine émetteur, la clé DKIM du sélecteur observé et le TXT DMARC ont été trouvés. Aucun message de vérification envoyé. Ce contrôle ne mesure pas la délivrabilité auprès de tous les clubs.
- Lecteur public PROD, sept jours glissants : 209 721 HTTP 200, 55 HTTP 503, un HTTP 500, un HTTP 400 et deux HTTP 405. Aucun HTTP 429 dans les séries retournées. P95 journalier maximal parmi les séries : environ 160 ms. Parmi les routes filtrées par action explicite, un 5xx Records et un Direct, aucun pour TOP ni les deux routes calendrier. Les requêtes sans action explicite et les autres routes ne sont pas attribuées. TEST : 127 HTTP 200, p95 maximal par série autour de 6,3 s. Ces mesures ne justifient pas un nouveau cache partagé par défaut.
- ZIP : 256 Mio, 60 s et concurrence 80 déployés en TEST et PROD. Sur trente jours, huit requêtes PROD observées, p99 journalier maximal des latences par série autour de 2,08 s et p99 mémoire maximal de 73,85 %. Sur le poste local, la chaîne réelle d’assemblage avec données fictives (six nageurs et un relais par club) a produit 2 210 564 octets pour 40 clubs en 1,36 s, soit 2 947 420 octets en base64. Sur 500 demandés, arrêt explicite au 127e PDF en 3,68 s. Le processus de recette inclut le chargement de l’outillage de test ; sa mémoire n’est pas assimilable à celle d’une instance Cloud. Pas de mesure de pic concurrent en situation de compétition.

## Publication et points ouverts

Aucune donnée de recette réelle. La promotion des fonctions, de l’index et du Hosting suit leurs circuits respectifs. La recette technique demeure distincte d’une répétition terrain et de la compatibilité sur un appareil physique. Les preuves de livraison et le candidat exact figurent dans le [registre](releases/EVOLUTIONS.md).

Antoine a autorisé le 19 novembre la création du seul index composé de la file de notifications, d’abord sur TEST puis sur PROD après les contrôles TEST. La preuve attendue identifie le projet, la collection, les champs ordonnés et l’état READY.

Sur TEST, l’index `CICAgNiroIEK` est READY. Le reçu de publication atteste les archives des quatre fonctions, les 121 identités serveur et la conservation des messages et des réglages. Le contrôle HTTP a comparé le contenu livré du guide, de sa fiche de secours, des conditions d’utilisation, des pages TOP et nageur, du portail, de son chargeur différé et de l’éditeur Records au commit intégré.

Heure de Paris, du 19 au 20 novembre. L’autorisation conditionnelle date de 22 h 39, A4 a clôturé à 23 h 18 et la PR A6 a ouvert à 23 h 47. La fusion a eu lieu à 0 h 06, puis le contrôle final TEST a terminé à 0 h 27. Cela représente 1 h 48 depuis la demande, dont environ 39 min d’attente d’A4 et 1 h 09 entre sa clôture et le contrôle final TEST.

Le 20 novembre à 7 h 05 (Paris), la publication PROD du candidat `1deae45e` a été vérifiée. Les trois sources installées qui changent sont `closeDueEngagementCompetitions`, `readNapPublicSwimmer` et `syncNapClubAccountEmails`. La quatrième source TEST, `exportNapPublicPage`, est propre à TEST. La [publication officielle](https://github.com/ffessmnap/LivePalmes/actions/runs/44684809403) conserve les preuves de sauvegarde, d’intégrité des sources, de contrôle des 119 révisions et des fichiers servis. Environ 8 h 27 se sont écoulées entre l’autorisation conditionnelle et la fin de la publication, dont 39 min d’attente d’A4. La recette TEST, la préparation du contrat, son accord et les contrôles GitHub sont compris dans cette durée.

Trois vérifications restent ouvertes. FRONT-2 demande un essai sur un appareil iOS 15 physique. EXPL-2 demande une répétition avec le second référent de compétition. Pour PERF-2, consacré au suivi des coûts, la lecture du budget et des dépenses attend la validation de la clé d’accès dans la console Google. L’activation de nouvelles alertes et le montant de l’enveloppe dépendront d’une décision ultérieure.
