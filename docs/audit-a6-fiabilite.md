# Audit A6 — Fiabilité des parcours actifs

<!-- description: Périmètre A6, budgets de lecture, observations d’exploitation et limites de la recette avant publication. -->

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
| EXPL-10, PERF-2, PERF-4 | Observations ci-dessous. |

## Observations du 19 novembre 2026

- File : projection limitée à la source et à l’échéance des cinq premiers événements échus par projet. PROD : un historique. TEST : cinq NAP dans cette fenêtre. Aucune remise en file et aucun envoi. L’index composé `source ASC, runAt ASC` pour la collection `engagementClosureQueue` manque dans les deux projets au relevé initial. La disponibilité de l’index devra précéder la mise en service du code.
- Supervision : aucune sonde de disponibilité ni politique Cloud Monitoring renvoyée pour ces projets. Les alertes de sauvegarde existantes sont distinctes. Antoine est le destinataire prévu pour les futures alertes techniques. Leur activation reste à décider.
- Facturation liée aux deux projets. La lecture des budgets a renvoyé `SERVICE_DISABLED` pour l’API Billing Budgets. Montants, destinataires et dépenses par projet non établis. Seuils prévus : 50 %, 90 % et 100 % une fois l’enveloppe convenue.
- Délivrabilité : le message de sauvegarde déjà reçu portait SPF, DKIM et DMARC « pass ». Un enregistrement SPF était présent pour le domaine émetteur, la clé DKIM du sélecteur observé et le TXT DMARC ont été trouvés. Aucun message de vérification envoyé. Ce contrôle ne mesure pas la délivrabilité auprès de tous les clubs.
- Lecteur public PROD, sept jours glissants : 209 721 HTTP 200, 55 HTTP 503, un HTTP 500, un HTTP 400 et deux HTTP 405. Aucun HTTP 429 dans les séries retournées. P95 journalier maximal parmi les séries : environ 160 ms. Parmi les routes filtrées par action explicite, un 5xx Records et un Direct, aucun pour TOP ni les deux routes calendrier. Les requêtes sans action explicite et les autres routes ne sont pas attribuées. TEST : 127 HTTP 200, p95 maximal par série autour de 6,3 s. Ces mesures ne justifient pas un nouveau cache partagé par défaut.
- ZIP : 256 Mio, 60 s et concurrence 80 déployés en TEST et PROD. Sur trente jours, huit requêtes PROD observées, p99 journalier maximal des latences par série autour de 2,08 s et p99 mémoire maximal de 73,85 %. Sur le poste local, la chaîne réelle d’assemblage avec données fictives (six nageurs et un relais par club) a produit 2 210 564 octets pour 40 clubs en 1,36 s, soit 2 947 420 octets en base64. Sur 500 demandés, arrêt explicite au 127e PDF en 3,68 s. Le processus de recette inclut le chargement de l’outillage de test ; sa mémoire n’est pas assimilable à celle d’une instance Cloud. Pas de mesure de pic concurrent en situation de compétition.

## Publication et points ouverts

Aucune donnée de recette réelle. La promotion des fonctions, de l’index et du Hosting suit leurs circuits respectifs. La recette technique demeure distincte d’une répétition terrain et de la compatibilité sur un appareil physique. Les contrôles locaux et les observations ci-dessus ne constituent pas des preuves de livraison.
