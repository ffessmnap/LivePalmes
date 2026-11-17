# Audit A3.4a — session et annuaire coordonnés

<!-- description: Préparation compatible puis activation de la session portail 24 h et fermeture d’annuaire, contrats distincts et conditions de promotion. -->

## Accord et état

Le 17 novembre 2026, Antoine approuve le lot coordonné client/serveur/annuaire jusqu’à TEST, puis autorise la poursuite de tout A3, TEST et PROD lorsque les contrôles passent : « Je vais pas vraiment être dispo la. Tu peux continuer tout A3 en faisant toutes les vérif nécessaire mise en test mise en prod que j’autorise quand les test passe bien. C’est bon pour toi? ». Référence authentifiée : conversation `01a1e61a-8f79-7323-8f08-03b3fa948a75`, message `01a1e884-cb2f-7be1-9c94-a06b905dd1b0`.

Cet accord conditionnel couvre les périmètres définis ; il ne crée ni validation humaine fictive, ni choix de récupération MFA ou de conservation des clés encore indéterminé. Publications dans Infra, avec contrats distincts, preuves exactes, sauvegarde vérifiée, protections et contrôles après publication. Un accord déjà couvert n’est pas redemandé lorsque ses conditions sont remplies.

A3.3 et A3.6a sont clôturés en PROD ; A3.8a est intégré sans déploiement. A3.4a est en préparation locale : aucune livraison TEST ou PROD de ce nouveau lot n’est encore déclarée.

## Pourquoi deux versions

Les nombreuses fonctions se mettent à jour progressivement. Imposer la session PROD côté serveur avant de publier son client rendrait les anciens clients incompatibles pendant cette mise à jour. La bascule reste donc un ensemble coordonné, livré en deux versions explicites.

| Version | Comportement | Condition suivante |
| --- | --- | --- |
| A — préparation compatible | Serveur : ouvrir/toucher/fermer une session dans les deux environnements ; contrôle obligatoire conservé sur TEST, appels PROD historiques encore compatibles. Client : session locale de 24 h et lecteur d’annuaire serveur dans les deux modes. Règles inchangées. | TEST et PROD A vérifiés, client et bootstrap disponibles, accès administratifs conservés. |
| B — activation | Contrôle serveur obligatoire dans les deux environnements et fermeture de la lecture directe de l’annuaire, après qualification des consommateurs. | Candidat B distinct, contrôles et publication adaptés ; A seul ne clôt pas A3.4a. |

Aucune variable d’environnement ou configuration persistante nouvelle. La fabrique de session distingue disponibilité du bootstrap et enforcement ; cette option est fixée côté serveur, jamais par une entrée cliente. Son comportement par défaut reste obligatoire. Les anciens onglets peuvent nécessiter une recharge/reconnexion à la bascule finale ; une reconnexion initiale peut aussi être demandée faute d’historique fiable.

## Version A préparée

Ancre applicative `1da16ed3fae968e4ca006b90223d30098991b960`, base stable `984aef1d2c1fa48b6a2c12fcce95fc8297f7afc2`.

- Propriété client dédiée `portalSessionEnabled`, indépendante de `isTest`, limitée aux pages du portail. Les pages et protections Direct gardent leur fonctionnement.
- Fabrique serveur : bootstrap disponible pour les deux environnements connus, enforcement TEST seulement pendant A. Les 118 appels de garde déclarés restent avant délégation ; en PROD A, leur effet reste provisoirement celui des anciennes versions.
- Le dispatch de profil accepte les opérations techniques de session dans les deux modes. Le profil actif et les capacités fraîches d’A3.3 restent nécessaires ; aucune capacité n’est ajoutée.
- Le nouveau portail utilise exclusivement le lecteur serveur d’annuaire. Périmètre dérivé du profil serveur, aucune sélection de document par le client. Absence/non prêt donne `users:null`, pagination existante conservée et aucune reconstruction interactive.
- Durée locale 24 h et tolérance serveur maximale cinq minutes conservées. Lecture/restauration ou rafraîchissement d’un jeton ne prolongent pas la session. Onglets d’un navigateur partagés, appareils distincts. Même compte : saisie en mémoire conservée ; aucune écriture rejouée. Rechargement : brouillon non enregistré potentiellement perdu. Opération déjà envoyée : rapprochement explicite conservé.
- Trois URL d’assets du portail sont versionnées. Aucun nouveau SDK, framework ou dépendance. `firestore.rules`, Firebase, bindings, droits et structures métier restent inchangés dans A.

## Budget des lectures

| Situation | Budget |
| --- | --- |
| Ouverture/restauration par le nouveau client | Profil et session : deux documents ; zéro/une écriture de session et mise à jour lastLoginAt existante éventuelle. |
| Appel privé avec enforcement | Une lecture ponctuelle de session ; profil frais A3.3 réutilisé dans la requête, sans lecture par ligne métier. TEST A applique déjà ce budget ; PROD A garde provisoirement son contrôle antérieur. |
| Activité réelle | Au plus douze remontées/h/onglet actif ; aucune au repos ; au plus douze écritures/h du document partagé. Trois onglets : jusqu’à 36 lectures de remontée/h. Transactions limitées à cinq tentatives. |
| Annuaire serveur | Zéro/une lecture de profil de gestion et un snapshot borné à 5 000 entrées ; lecture de session supplémentaire lorsque l’enforcement est actif. |
| Reconnexion | Quatre lectures de documents hors réessais selon le parcours existant ; aucune sauvegarde métier. |
| NAP | Aucun budget SQL modifié. |

La recette utilise identités, DB, horloges et services fictifs, puis les émulateurs et le navigateur isolé de la CI. Aucun compte réel, connexion réelle, invocation métier, document sportif ou envoi n’est nécessaire pour ces tests. Une lecture réelle du profil peut actualiser lastLoginAt : elle n’est pas qualifiée de lecture sans effet.

## Contrat et ordre TEST A

Contrat distinct `.github/releases/evidence/20261117-test-portal-session-prepare-contract.json`, lot `portal_session_prepare` de `livepalmes-test-mail-sources.yml`. Il fixe les empreintes de toutes les sources concernées et l’inventaire complet de 121 fonctions TEST. Calcul statique : 101 consommateurs installés, 18 déclarations concernées mais non installées non créées. La sélection doit être recalculée sur les origines installées observées avant publication ; tout écart hors contrat bloque.

1. Lot complet et CI obligatoire : application, publication, règles sur émulateur, navigateur hors ligne et synthèse.
2. Transport source/labels existant, contrat A distinct : configurations et bindings conservés, inventaire/Hosting témoins, mails TEST désactivés, queue et scheduler suspendus, archives gérées et révisions vérifiées. Aucun ancien contrat élargi.
3. TEST commun manuel, Hosting seul, sans flag de règle : preuve source authentifiée puis sélection backend automatiquement vide obligatoire, règles existantes vérifiées en lecture seule.
4. Hosting du candidat exact, preuve commune, métadonnées fraîches et contrôles statiques. Aucun déploiement de règle/index dans A, aucune invocation métier pour la recette.

Les six tests du contrat source conservent sélection complète, refus des consommateurs inconnus, workflow/versions exacts, intégrité des reçus et des archives, configurations hors du masque de mise à jour et témoins inchangés. Les tests de session réels couvrent seuil, tolérance, reconnexion, onglets, appareils, saisie, absence de rejeu, pannes et portée d’annuaire. La recette navigateur est étendue à la configuration PROD locale sur fournisseurs fictifs, HTTPS externe bloqué, à 1280/390/320 pixels ; résultat CI à confirmer.

## Promotion et suite

Avant PROD A : contrat distinct dans Infra, preuves TEST recevables, contrôle des capacités déjà existantes du runtime pour le registre technique et continuité administrative, sans créer de compte ni ajouter de droit. Sauvegarde rouverte/comparée, dérive fraîche, sources conservant les configurations puis Hosting et contrôles finaux. Le résultat de A ne doit jamais être présenté comme enforcement serveur PROD complet.

Après A vérifié en PROD, préparer B depuis cet état : ancre et contrat nouveaux, serveur obligatoire, règle d’annuaire fermée et tests des deux audiences. Ne pas publier le brouillon initial d’activation tel quel et ne pas étendre le contrat A. Les contrôles encore manquants restent des blocages malgré l’accord conditionnel.

Retour arrière A : version compatible précédente, sans suppression de session ou de snapshot. Retour arrière B : ensemble coordonné ; un retour au seul ancien Hosting peut casser l’annuaire après fermeture. Ne pas rouvrir l’accès direct par réflexe. Comptes, données sportives, snapshots et archives ne sont pas nettoyés comme retour arrière de code.

Suivi : issue A3 #894 et [registre des évolutions](releases/EVOLUTIONS.md). Preuves et état distant sont renseignés après livraison, séparément d’un éventuel retour humain.
