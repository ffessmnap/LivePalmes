# Workflows historiques et diagnostics GitHub

<!-- description: Workflows d’archive désactivés, outils de reprise conservés et lecture des échecs du transfert des bilans licences. -->

## Archives désactivées le 27 octobre 2026

| Workflow | État GitHub | Motif |
| --- | --- | --- |
| `livepalmes-production.yml` | Désactivé | Ancienne mise en ligne remplacée par preflight puis production-release ; job déjà bloqué par `if: false`. |
| `livepalmes-production-rebuild-tops.yml` | Désactivé | Ancienne reconstruction des TOP, job déjà bloqué ; le parcours NAP courant ne demande pas cette reconstruction. |
| `livepalmes-test-publish-performance-public.yml` | Désactivé | Ancienne publication des performances TEST, job déjà bloqué. |

Les fichiers, preuves et historiques restent conservés. La désactivation GitHub est réversible, mais une réactivation ne vaut jamais autorisation de publier ou de reconstruire des données. Aucun workflow n’a été lancé par ce nettoyage.

`livepalmes-production-resume.yml` reste une référence historique reconnue par le lecteur de retour arrière ; ne pas le supprimer. Sa publication est déjà bloquée. Les workflows courants de publication, rollback, diagnostic et les opérations spécifiques encore utiles restent disponibles. Aucune notification d’échec importante n’est désactivée.

## Transfert des bilans licences

Avant les credentials et tout accès distant : contrôle hors réseau du chargement du SDK, puis exécution simulée des phases export, préparation et application. La CI globale exécute aussi ce test. Les sauvegardes chiffrées, confirmations, contrôle de source et vérifications existantes restent obligatoires.

Le diagnostic ne publie ni message brut, stack, token, secret ou données nominatives. Il expose la phase et une catégorie technique bornée. Le résumé final distingue : arrêt avant application, application engagée avec écritures possibles, et reprise terminée avec source vérifiée. Une application échouée ou une relecture finale échouée exige un examen des preuves avant reprise ; aucune relance automatique n’est ajoutée.

La présence de workflows archivés n’expliquait pas les quatre échecs du transfert constatés le 27 octobre : ils étaient manuels et les archives étaient déjà bloquées. Ce nettoyage réduit la confusion et les lancements accidentels ; il ne garantit pas l’absence future d’échecs techniques.
