# Changelog LivePalmes

Ce fichier sert a garder une trace simple des evolutions importantes.

## 2026-05-27

- Assainissement de `app.js` avec extraction progressive des grands domaines fonctionnels.
- Separation des evenements d'interface en modules plus petits.
- Ajout de `ARCHITECTURE.md` pour comprendre l'organisation du code.
- Ajout de `TESTS_MANUELS.md` pour securiser les publications.
- Ajout de tests automatiques simples sur la lecture des resultats.
- Ajout de `tools/verify-livepalmes.js`, une commande unique de verification avant publication.
- Renforcement des tests automatiques sur les finales, resultats partiels, statuts DSQ/ABD et temps intermediaires.
- Extraction de la configuration de demarrage dans `assets/livepalmes-app-config.js`.
- Extraction des actions d'export et d'impression dans `assets/livepalmes-export-actions.js`.
- Extraction des references Firestore dans `assets/livepalmes-firestore-refs.js`.
- Extraction du stockage local navigateur dans `assets/livepalmes-local-state.js`.
- Extraction de la synchronisation console/Firebase dans `assets/livepalmes-console-sync.js`.
- Extraction des libelles et affichages d'alertes dans `assets/livepalmes-alert-presenter.js`.
- Extraction des fenetres programme/import dans `assets/livepalmes-program-modals.js`.
- Extraction des actions admin dans `assets/livepalmes-admin-actions.js`.
- Extraction des actions d'historique dans `assets/livepalmes-history-actions.js`.
- Suppression des anciens secours internes temps/personnes maintenant fournis par modules dedies.
- Extraction des helpers nageurs/recherche dans `assets/livepalmes-entrant-helpers.js`.
