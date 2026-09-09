# Qualifications des engagements piscine

Cette évolution ajoute une grille optionnelle à la fiche compétition du calendrier. La création conserve le parcours existant : créer la compétition, puis « Compléter maintenant » pour définir les courses et la grille. Seuls les comptes disposant du droit national des engagements peuvent configurer la grille, confirmer son application ou décider des dérogations. Ces contrôles sont aussi effectués côté serveur.

## Règles implémentées

- Chaque catégorie ouverte appartient à un groupe de règles. Les groupes permettent notamment aux cadets d'utiliser les bassins 25/50 m dans toutes les compétitions de la période, et aux juniors/seniors d'utiliser une sélection de compétitions.
- Un groupe définit la période inclusive, les bassins, le chronométrage électronique obligatoire ou non, les compétitions admises et le mode « chaque course » ou « au moins une course qualifiée et engagée ».
- Les minima sont des centièmes entiers, par catégorie de la saison cible, sexe et course. Le même minimum s'applique en 25 et 50 m. L'égalité qualifie. Une case manquante interdit l'ouverture ; « Sans minimum » est explicite et ne constitue jamais une course qualifiante.
- Une course bonus exige une performance connue respectant période, bassin et chronométrage. Le National peut également exiger une compétition qualificative. En mode « au moins une », une course qualifiée doit rester engagée. Une dérogation individuelle seule n'autorise pas tous les bonus.
- Les cases impossibles sont désactivées. Cocher une course qualifiée active les bonus possibles. Décocher la dernière course qualifiée affiche les suppressions dépendantes avant enregistrement.
- Aucun minimum de relais. Une composition vide reste engagée, y compris à la clôture/export ; le contrôle nominatif est alors à effectuer lors de la compétition. Un relais composé doit contenir un nageur réellement qualifié et engagé dans une course individuelle qualifiée.
- Le club peut demander une dérogation individuelle motivée. Le formulaire rappelle l'obligation d'envoyer séparément un courriel à **secretaire@nap-ffessm.fr**. Aucun courriel n'est envoyé par ce formulaire. Une demande en attente/refusée ne crée aucun engagement. Un accord autorise uniquement la course demandée ; le club doit encore la sélectionner. Le National peut retirer l'accord, avec suppression automatique des engagements devenus invalides et alerte.
- Une modification affectant les qualifications produit un aperçu détaillé. Après confirmation, les engagements invalides sont supprimés ; aucun statut « à régulariser » n'est créé. Les performances historiques sont conservées.
- Une correction/suppression de performance recherche une autre preuve avant toute suppression. La revalidation touche les inscriptions du nageur concerné, puis les relais dépendants. Les documents récapitulatifs sont invalidés si nécessaire.

Les compétitions sans grille et les compétitions eau libre conservent leurs règles d'engagement existantes.

## Architecture et lectures

Le moteur pur `functions/engagement-qualification.js` décide des qualifications. Le service associé orchestre les droits, aperçus, demandes et revalidations ; les callables existantes restent responsables de l'enregistrement et de leurs contrôles habituels (licence, programme, nombre de courses, délais, club).

| Opération | Lectures spécifiques aux qualifications |
| --- | --- |
| Ouverture du calendrier | Aucune grille chargée pour chaque ligne |
| Fiche compétition | Grille incluse dans le document déjà lu |
| Cases d'un nageur | Un historique partagé pour toutes les courses ; calculs locaux ; aperçus groupés jusqu'à 50 nageurs |
| Historique chaud | Un document de cache par nageur, aucune requête par case |
| Dérogations | Aucun document d'accord lu tant que la compétition n'a aucun accord ; ensuite au plus un document par nageur à contrôler |
| Choix des compétitions | Pages de 50 documents, limitées aux années des périodes configurées ; recherche locale sur les pages déjà chargées |
| Aperçu/application de grille | Pages de 5 clubs, historiques traités par groupes de 10 en parallèle ; nouvelle vérification des preuves avant application |
| Correction d'une performance | Index inverse du nageur, pages de 25 inscriptions ; aucun parcours de toutes les compétitions |
| Demandes nationales/clubs | Pages de 50 ; filtre du club appliqué côté serveur |

Le cache de temps passe à la version 4 et conserve les identifiants de compétition. Sa taille est limitée à 1 500 lignes et environ 700 ko de données ; un contrôle qualificatif relit l'historique Storage complet lorsqu'il est tronqué, sans lire individuellement les performances Firestore.

Les anciens fichiers Storage compacts peuvent omettre les identifiants de compétition. L'identifiant des imports est récupéré depuis leur identifiant technique existant ; pour les autres résultats, le contrôle réutilise les pages de nageur existantes (500 résultats par document, au plus 20 pages). L'enrichissement est mis en cache avec un contrôle transactionnel. Si cet index est absent/incomplet, le contrôle échoue explicitement et ne supprime aucun engagement sur la base de données manquantes. La préparation de TEST doit vérifier ces index. Les nouvelles publications conservent désormais ces identifiants ; les remplacements d'import conservent aussi le rattachement à la compétition d'origine.

La sélection porte sur les compétitions historiques identifiées et les imports de résultats présents. Les associations historiques déjà utilisées par le calendrier sont partagées avec le moteur, y compris les imports couvrant plusieurs compétitions par catégorie. Aucun rapprochement automatique par nom/date n'est inventé. Une compétition future sans résultats importés n'est pas encore une source sélectionnable.

## Données nouvelles et transactions

Les collections existantes ne représentaient ni les décisions de dérogation, ni les dépendances justificatives des engagements :

- `engagementQualificationRequests` : demande, auteur, motif et décision. Identifiant déterministe compétition/club/nageur/course pour éviter les doublons en attente.
- `engagementQualificationGrants` : un document par compétition/nageur, accords par course, avec contrôle du club. Évite une requête de demandes par case.
- `engagementQualificationJobs` et sous-collection `entries` : proposition, aperçu, curseur et plans d'application par club. La compétition est verrouillée pendant le traitement, y compris pour la clôture et les exports. Un aperçu peut être annulé ; une application commencée doit être reprise. Un conflit relance l'aperçu et demande une nouvelle confirmation.
- `engagementQualificationTargets/{cacheId}/entries` : index inverse des inscriptions à contrôler lors d'une invalidation d'historique. Il est établi avant la libération du verrou lors de l'activation d'une grille. Un trigger distinct avec reprise met à jour les dépendances d'effectif.

Les règles Firestore existantes refusent tout accès direct à ces collections. Les appels serveur valident systématiquement le périmètre. L'index composite des demandes est ajouté dans `firestore.indexes.json`.

## Validation et mise en service

Commandes locales :

```sh
node tests/engagement-qualification-tests.js
node tests/engagement-qualification-service-tests.js
node tools/verify-livepalmes.js
```

La suite couvre les seuils, groupes, dates, bassins, chronométrage, bonus, absence de grille, preuves alternatives, dérogations/retrait, relais, droits nationaux, pagination, reprise et conflits. Les tests de service utilisent un adaptateur Firestore en mémoire et ne valident pas le déploiement Firebase réel.

Avant mise en service, réaliser la recette ajoutée dans `docs/TESTS_MANUELS.md`, avec deux clubs et les rôles National/Région/Club. Vérifier aussi le refus des écritures directes dans l'émulateur Firestore et les index dans TEST. La recette navigateur et les callables TEST doivent être validées ensemble : un aperçu Hosting seul ne déploie pas les nouvelles Functions.

Les exports nouveaux sont déclarés dans le lot `engagement-core`. Après autorisation explicite, le workflow backend TEST accepte aussi la branche exacte `feature/qualification-engagements`, uniquement pour les lots `bootstrap`, `engagement-core` et `publications`. `bootstrap` est nécessaire pour l’index Firestore des demandes de dérogation. Les autres branches sont refusées ; les lots email et schedulers restent inaccessibles depuis cette branche. La confirmation `livepalmes-test`, le SHA exact, les tests préalables et l'environnement protégé `firebase-test` restent obligatoires. Les workflows de production ne sont pas modifiés.

Pour la recette, lancer le workflow « Deploiement backend Firebase TEST par lots » sur `feature/qualification-engagements`, avec le SHA complet de son dernier commit, pour `bootstrap`, `engagement-core`, puis `publications` (provenance conservée lors des imports/corrections). Ne pas lancer de migration ni utiliser de données officielles sans autorisation distincte. Le workflow de PR publie séparément l'interface Hosting TEST.
