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
