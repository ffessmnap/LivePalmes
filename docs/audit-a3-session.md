# Audit A3.4a — session et annuaire coordonnés

<!-- description: Préparation compatible puis activation de la session portail 24 h et fermeture d’annuaire, contrats distincts et conditions de promotion. -->

## Accord et état

Le 17 novembre 2026, Antoine approuve le lot coordonné client/serveur/annuaire jusqu’à TEST, puis autorise la poursuite de tout A3, TEST et PROD lorsque les contrôles passent : « Je vais pas vraiment être dispo la. Tu peux continuer tout A3 en faisant toutes les vérif nécessaire mise en test mise en prod que j’autorise quand les test passe bien. C’est bon pour toi? ». Référence authentifiée : conversation `01a1e61a-8f79-7323-8f08-03b3fa948a75`, message `01a1e884-cb2f-7be1-9c94-a06b905dd1b0`.

Cet accord conditionnel couvre les périmètres définis ; il ne crée ni validation humaine fictive, ni choix de récupération MFA ou de conservation des clés encore indéterminé. Publications dans Infra, avec contrats distincts, preuves exactes, sauvegarde vérifiée, protections et contrôles après publication. Un accord déjà couvert n’est pas redemandé lorsque ses conditions sont remplies.

A3.3 et A3.6a sont clôturés en PROD ; A3.8a est intégré sans déploiement. A3.4a phase A est vérifié sur TEST au candidat `63fb92732a448401035f24bcd0a7c466cfce4f82` ; Infra qualifie ses prérequis PROD en lecture seule. La phase B reste séparée et aucune PROD A n’est encore déclarée.

## Pourquoi deux versions

Les nombreuses fonctions se mettent à jour progressivement. Imposer la session PROD côté serveur avant de publier son client rendrait les anciens clients incompatibles pendant cette mise à jour. La bascule reste donc un ensemble coordonné, livré en deux versions explicites.

| Version | Comportement | Condition suivante |
| --- | --- | --- |
| A — préparation compatible | Serveur : ouvrir/toucher/fermer une session dans les deux environnements ; contrôle obligatoire conservé sur TEST, appels PROD historiques encore compatibles. Client : session locale de 24 h et lecteur d’annuaire serveur dans les deux modes. Règles inchangées. | TEST et PROD A vérifiés, client et bootstrap disponibles, accès administratifs conservés. |
| B — activation | Contrôle serveur obligatoire dans les deux environnements et fermeture de la lecture directe de l’annuaire, après qualification des consommateurs. | Candidat B distinct, contrôles et publication adaptés ; A seul ne clôt pas A3.4a. |

Aucune variable d’environnement ou configuration persistante nouvelle. Une fabrique dédiée rend le bootstrap disponible ; la fabrique de garde métier et le module de session restent ceux de la référence déployée. Ces choix sont fixés côté serveur, jamais par une entrée cliente. Les anciens onglets peuvent nécessiter une recharge/reconnexion à la bascule finale ; une reconnexion initiale peut aussi être demandée faute d’historique fiable.

## Version A préparée

Ancre applicative `460ca24fbffd99f66bae5e805aa9a3f869e1afa4`, base stable `984aef1d2c1fa48b6a2c12fcce95fc8297f7afc2`.

- Propriété client dédiée `portalSessionEnabled`, indépendante de `isTest`, limitée aux pages du portail. Les pages et protections Direct gardent leur fonctionnement.
- Fabriques serveur séparées : bootstrap disponible pour les deux environnements connus, garde métier inchangée (TEST seulement pendant A). Les 118 appels de garde déclarés restent avant délégation ; en PROD A, leur effet reste provisoirement celui des anciennes versions.
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

Contrat bootstrap distinct `.github/releases/evidence/20261117-test-portal-session-bootstrap-contract.json`, lot `portal_session_prepare` de `livepalmes-test-mail-sources.yml`. Il fixe les empreintes de toutes les sources concernées et l’inventaire complet de 121 fonctions TEST. Calcul complet après séparation des fabriques : une seule fonction installée concernée, `getCurrentAccessUser`, et aucune déclaration non installée concernée. Les 120 autres fonctions TEST gardent leurs sources. La sélection doit être recalculée sur les origines installées observées avant publication ; tout écart hors contrat bloque.

1. Lot complet et CI obligatoire : application, publication, règles sur émulateur, navigateur hors ligne et synthèse.
2. Transport source/labels existant, contrat A distinct : configurations et bindings conservés, inventaire/Hosting témoins, mails TEST désactivés, queue et scheduler suspendus, archives gérées et révisions vérifiées. Aucun ancien contrat élargi.
3. TEST commun manuel, Hosting seul, sans flag de règle : preuve source authentifiée puis sélection backend automatiquement vide obligatoire, règles existantes vérifiées en lecture seule.
4. Hosting du candidat exact, preuve commune, métadonnées fraîches et contrôles statiques. Aucun déploiement de règle/index dans A, aucune invocation métier pour la recette.

Les sept tests du contrat source conservent sélection complète, refus des consommateurs inconnus, workflow/versions exacts, intégrité des reçus et des archives, configurations hors du masque de mise à jour et témoins inchangés. Les tests de session réels couvrent seuil, tolérance, reconnexion, onglets, appareils, saisie, absence de rejeu, pannes et portée d’annuaire. La recette navigateur est étendue à la configuration PROD locale sur fournisseurs fictifs, HTTPS externe bloqué, à 1280/390/320 pixels ; résultat CI à confirmer.

## Réduction du périmètre avant publication

La première proposition de préparation modifiait la fabrique commune et sélectionnait 101 consommateurs. Avant toute mise à jour distante, le bootstrap a été isolé de la garde métier, dont le corps et le module sont restaurés exactement à la référence déployée. La fermeture complète de dépendances ne sélectionne désormais que `getCurrentAccessUser`. Aucun nom n’est retiré manuellement de la sélection : un autre consommateur calculé ou une origine inconnue bloque le transport.

Le contrat bootstrap est un nouvel objet immuable ; les deux contrats précédents sont conservés avec leur état. L’application et les tests sont revérifiés sur ce nouveau candidat avant tout lancement.

## Correction de référence avant écriture

Le run TEST [44051922375](https://github.com/ffessmnap/LivePalmes/actions/runs/44051922375) a été refusé à l’authentification de la preuve, avant publication de sources (étapes publier/vérifier ignorées). Le contrat initial confondait main de comparaison `984aef1d` et candidat porté par test-proof `709cd01c`. Il reste intact et cet échec reste tracé.

Le contrat corrigé fixe `baseCommit` au candidat de la même preuve 44028122090 et `comparisonBaseCommit` au main préparatoire. Leurs empreintes backend complètes doivent être identiques ; toute différence bloque. Artefact, digest, Hosting, inventaire et origines attestées restent inchangés : aucune baseline observée n’est réinitialisée. Le test ajouté exerce le vrai lecteur de baseline avec la bonne version, la mauvaise version et un digest altéré.

## Promotion et suite

Avant PROD A : contrat distinct dans Infra, preuves TEST recevables, contrôle des capacités déjà existantes du runtime pour le registre technique et continuité administrative, sans créer de compte ni ajouter de droit. Sauvegarde rouverte/comparée, dérive fraîche, sources conservant les configurations puis Hosting et contrôles finaux. Le résultat de A ne doit jamais être présenté comme enforcement serveur PROD complet.

Après A vérifié en PROD, préparer B depuis cet état : ancre et contrat nouveaux, serveur obligatoire, règle d’annuaire fermée et tests des deux audiences. Ne pas publier le brouillon initial d’activation tel quel et ne pas étendre le contrat A. Les contrôles encore manquants restent des blocages malgré l’accord conditionnel.

Retour arrière A : version compatible précédente, sans suppression de session ou de snapshot. Retour arrière B : ensemble coordonné ; un retour au seul ancien Hosting peut casser l’annuaire après fermeture. Ne pas rouvrir l’accès direct par réflexe. Comptes, données sportives, snapshots et archives ne sont pas nettoyés comme retour arrière de code.

Suivi : issue A3 #894 et [registre des évolutions](releases/EVOLUTIONS.md). Preuves et état distant sont renseignés après livraison, séparément d’un éventuel retour humain.

## TEST A vérifié et qualification des capacités PROD

[Sources TEST 44058959395](https://github.com/ffessmnap/LivePalmes/actions/runs/44058959395) : une source/label `getCurrentAccessUser`, archive et génération attestées ; les 120 autres fonctions, configurations, liaisons et témoins sont conservés. [TEST commun 44059607468](https://github.com/ffessmnap/LivePalmes/actions/runs/44059607468), candidat `63fb9273`, Hosting `589bcfe0b95f2722` : sélection backend vide, 121 révisions ACTIVE identiques à la preuve source et règles inchangées observées sans déploiement. Les artefacts source et commun ont été authentifiés ; aucun TEST répété dans Infra.

Contrôle technique délégué du 17 novembre à 10 h 55 min 59 s Europe/Paris : quatre GET statiques, octets Git exacts, protection noindex TEST et en-têtes conservés ; le bootstrap anonyme est refusé avant accès DB. Les parcours positifs, expiration, reconnexion et configuration PROD passent sur fournisseurs fictifs et navigateur isolé de la CI. Aucun compte ou session réelle créé pour la recette ; aucune validation humaine supplémentaire n’est attribuée à ces résultats.

Le diagnostic officiel existant est complété pour ce seul candidat. Les deux identités existantes sont conservées : Hosting vérifie au plus deux profils administratifs actifs et deux UID Auth (statut désactivé seulement), le backend lit le compte runtime de `getCurrentAccessUser`, une politique IAM et dix rôles au maximum. Aucun UID, compte, clé ou valeur de secret dans les reçus ; aucune impersonation ni transaction réelle.

Les permissions nécessaires sont `datastore.entities.get`, `datastore.entities.create`, `datastore.entities.update` et `datastore.databases.get` pour débuter/annuler une transaction ([table officielle Firebase](https://firebase.google.com/docs/firestore/security/iam)). Le diagnostic prouve leur présence dans les rôles projet existants sans condition ; une permission manquante reste un refus, aucun droit n’est ajouté. Les anciens contrôles A3.3 et contrats ne sont pas élargis. La qualification puis le contrat PROD A, la CI, le preflight et les prérequis restent à conclure avant publication.

Le [premier diagnostic 44063914208](https://github.com/ffessmnap/LivePalmes/actions/runs/44063914208) a confirmé deux profils administratifs et deux comptes Auth actifs, sans écriture. La qualification backend est restée incomplète : `iam.roles.get` avait été sondé sur le projet, et aucune lecture de rôle n’a été tentée. Ce résultat reste conservé. Le même lecteur avait déjà réussi une lecture de rôle dans la preuve A3.3 ; cela ne vaut pas preuve fraîche des quatre permissions de session.

Correction de portée du diagnostic : [projects.testIamPermissions](https://docs.cloud.google.com/resource-manager/reference/rest/v1/projects/testIamPermissions) reste appliqué aux permissions du projet ; [roles.get](https://docs.cloud.google.com/iam/docs/reference/rest/v1/roles/get) est attesté par la réussite de chaque GET sur le rôle exact. La permission n’est ni accordée ni supposée présente : un refus de lecture, rôle inconnu, attribution conditionnelle ou permission de transaction manquante bloque toujours. Le test ajouté impose ce refus. Aucun contrat ni baseline n’est réinitialisé.


## Contrat PROD A fermé au candidat TEST

La qualification corrigée [44066232432](https://github.com/ffessmnap/LivePalmes/actions/runs/44066232432) atteste quatre lectures de rôles et les quatre permissions du runtime existant, deux profils administratifs et deux comptes Auth actifs, sans écriture ni droit ajouté. Le contrat `20261117-production-portal-session-prepare-contract.json` et l’option `portalSessionPrepareRelease` restent fermés à `63fb9273` : sélection complète des 119 origines, une source/label `getCurrentAccessUser`, 118 conservées. Les dix écarts bruts hérités réutilisent uniquement les paires et révisions qualifiées par l’artefact authentifié A3.3 ; les deux empreintes restent inchangées depuis la dernière PROD. Aucun moteur modifié ni nom retiré manuellement.

Le client et le bootstrap compatibles sont publiables en A ; le garde métier PROD et `functions/portal-session.js` restent inchangés. Les règles Git/TEST (`435cec31`) et la source PROD historique Direct (`285dd688`) sont distinguées : aucune copie ni publication de règles. Les prérequis et contrôles frais relisent la source PROD attendue puis sa même release/ruleset avant et après. Une dérive, lecture refusée, preuve absente ou tentative de reprise automatique bloque.

La continuité administrative est relue avec l’identité Hosting existante avant sauvegarde, le lecteur backend restauré avant sources, puis la continuité recontrôlée après sources. Témoins mails actifs tous clubs, modèles, file et scheduler strictement comparés, sauvegarde chiffrée rouverte/comparée avant PATCH, configs et six bindings SMTP conservés. Les tests du contrat utilisent des fixtures ; aucune session réelle, compte, donnée métier, message ou transaction n’est créé pour la recette. CI, preflight et prérequis officiels restent requis avant le bilan PROD et l’unique publication. Aucune activation B ni clôture complète A3.4a revendiquée.
