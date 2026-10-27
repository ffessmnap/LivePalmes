# Publication LivePalmes — choisir le parcours

<!-- description: Consignes courantes et proportionnées pour préparer, vérifier et publier TEST/PROD ; orientation vers la procédure unique. -->

## Commencer par le besoin

Lire les consignes de `main`, préserver les changements des autres conversations et choisir le parcours ci-dessous. Une demande de développement autorise la préparation, la PR, son intégration après contrôles et TEST pour le périmètre demandé. Une analyse seule ne déclenche aucun développement. Une demande explicite peut déjà contenir l’accord nécessaire à une opération sensible ; ne pas redemander un accord acquis.

| Parcours | Contrôles et publication |
| --- | --- |
| Documentation ou interface | Documentation seule : relecture et CI requise, aucun déploiement. Interface : syntaxe/tests ciblés et contrôle ordinateur/mobile pertinent ; CI requise puis TEST commun. Pour une interface seule, `hosting_only=true` conserve le contrôle de sélection backend et refuse toute fonction différente ou non attestée. |
| Backend existant, périmètre déjà autorisé | Examiner la sélection par dépendances, tester les comportements concernés, utiliser la CI et les preuves compatibles. Publier les seules fonctions sélectionnées avec les garde-fous existants ; Hosting en dernier. Une dépendance sensible ou ambiguë conduit au parcours spécifique. |
| Données, droits, mails ou infrastructure nouvelle | Accord explicite sur l’opération et ses limites avant exécution. Inclut règles/index, migrations, écritures métier réelles, envois et rattrapage, changement de destinataires/préférences/paiements, secrets/configurations/services/déclencheurs nouveaux, suppressions et changements de règles sportives. Préparation spécifique proportionnée au changement. |

Un changement de code d’authentification, de PDF/import/résultats, de DTN ou de Function reste soumis aux accords sensibles d’`AGENTS.md`, même s’il ne modifie aucune infrastructure. Un accord de préparation ne vaut jamais accord d’écriture métier ou de publication PROD.

## Chemin courant

1. Regrouper le besoin dans une PR courte depuis `main`, avec tests et documentation utiles. Attendre les contrôles obligatoires. L’aperçu `pr-N` est facultatif, uniquement avec l’étiquette `apercu-test` demandée ; il ne remplace pas TEST commun.
2. Après CI main réussie, laisser l’automatisme publier les interfaces ordinaires connues sur TEST commun, avec contrôle backend et candidat exact. Fonctions serveur, chemins inconnus et cas sensibles restent au parcours explicite. Documentation seule : aucun déploiement. Conserver la preuve TEST. Réutiliser les suites attestées du commit exact ; ne pas les répéter manuellement pour préparer PROD.
3. Recueillir le retour utilisateur sur les parcours concernés de la version commune. Une modification de ces parcours invalide leur validation ; les autres validations ne sont pas annulées par principe. Ne jamais déduire un accord utilisateur d’une CI verte.
4. Pour PROD, assembler le brouillon avec `livepalmes-release-draft.yml` depuis les preuves et retours utilisateur authentiques ; compléter les points bloquants puis utiliser le preflight existant. Figer la version ordinaire validée pour que les développements suivants ne changent pas le candidat approuvé. Préparer le bilan complet depuis les preuves, vérifier les prérequis nécessaires, présenter un résumé court et appliquer l’accord explicite d’Antoine dans Infra au seul périmètre présenté. Les modalités techniques sont dans la [procédure actuelle](../releases/PROCEDURE.md).

L’assistant gère commits, runs et manifeste. La demande ordinaire n’exige ni PR de manifeste ni adaptation du circuit. Si un contrat existant refuse le candidat, présenter le motif et le périmètre réellement bloqué avant toute écriture ; une consigne simplifiée n’autorise pas à contourner le refus.

## Garde-fous conservés

- Version exacte, diff applicatif entièrement couvert, validations authentiques et preuves GitHub vérifiées. Une évolution incluse et non validée bloque ; aucune sélection silencieuse de fichiers pour la masquer.
- En PROD : accord final sur le bilan précis, environnement `production` limité à `main`, contrôle frais de dérive, sauvegarde chiffrée rouverte et comparée avant écriture, retour arrière disponible et vérifications après publication. Une approbation GitHub encore exigée reste obligatoire.
- Aucune copie TEST→PROD, génération de données d’accueil, migration, règle/index, suppression, invocation métier ou envoi de test implicite. Les Functions email/schedulers restent hors circuit ordinaire et nécessitent leur autorisation spécifique.
- Préserver les réglages courants et les exclusions du lot. Un ancien plan IDF n’est pas la preuve du périmètre des mails actuel. Ne couper/réactiver les mails ou élargir les envois que dans un plan explicitement autorisé.
- Utiliser la sélection calculée, expliquer les replis larges et conserver les contrôles rapides. Source inconnue, preuve incompatible, dérive ou nouveau risque : arrêter l’écriture, diagnostiquer le point en cause et présenter la suite utile.

## Éviter le travail ajouté

Un correctif ordinaire n’entraîne pas un nouveau benchmark, un audit général, une refonte d’outillage ou un rapport HTML. Réutiliser les outils et preuves existants ; relancer un contrôle seulement si le code concerné change, qu’il échoue ou que sa preuve n’est plus compatible. Conserver toutes les étapes imposées par les workflows ; cette règle évite les doublons manuels.

Tenir `docs/releases/EVOLUTIONS.md` à jour sans PR documentaire par contrôle. Inclure le suivi dans la PR ouverte ; après fusion, lier les nouvelles preuves dans GitHub et regrouper le prochain suivi du registre. Donner un résultat court avec les vérifications, le blocage éventuel et les liens utiles. Mesurer le délai total de la demande au résultat, en distinguant les attentes externes.

Les [anciennes consignes](PUBLICATION_HISTORIQUE_20261026.md) et les [contrats et décisions datés](../releases/PROCEDURE_HISTORIQUE_20261026.md) servent uniquement à une reprise ancienne ou à une exception identifiée. Les contrats exécutables, leurs empreintes et leurs autorisations restent inchangés.
