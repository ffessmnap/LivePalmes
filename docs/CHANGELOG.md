# Changelog LivePalmes

Ce fichier sert a garder une trace simple des evolutions importantes.

## 2026-05-27

- Assainissement de `app.js` avec extraction progressive des grands domaines fonctionnels.
- Separation des evenements d'interface en modules plus petits.
- Ajout de `docs/ARCHITECTURE.md` pour comprendre l'organisation du code.
- Ajout de `docs/TESTS_MANUELS.md` pour securiser les publications.
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
- Extraction de la synchronisation temps reel dans `assets/livepalmes-realtime-sync.js`.
- Extraction de l'historique visible et des fiches alertes dans `assets/livepalmes-history-presenter.js`.
- Extraction des decisions JA et files d'alertes dans `assets/livepalmes-decision-workflow.js`.
- Extraction de la publication/relecture des resultats dans `assets/livepalmes-result-publication-workflow.js`.
- Extraction de l'import PDF series dans `assets/livepalmes-series-import-workflow.js`.
- Extraction du demarrage applicatif dans `assets/livepalmes-app-lifecycle.js`.
- Extraction de la mise a jour Google Sheets dans `assets/livepalmes-speaker-info-workflow.js`.
- Extraction de la maintenance resultats dans `assets/livepalmes-result-maintenance-workflow.js`.
- Extraction des exports/rapports dans `assets/livepalmes-export-reports-workflow.js`.
- Extraction de la session roles/codes dans `assets/livepalmes-role-session-workflow.js`.
- Extraction de la position publique et des compteurs d'accueil dans `assets/livepalmes-public-progress-workflow.js`.
- Extraction du rendu principal de console dans `assets/livepalmes-console-render-workflow.js`.
- Extraction du stockage local dans `assets/livepalmes-app-storage-workflow.js`.
- Correction du demarrage des evenements d'interface apres decoupage : les boutons des consoles depuis l'accueil repondent a nouveau.
- Remplacement de plusieurs acces implicites `with (context)` par des dependances explicites dans les modules stockage, helpers nageurs, exports, demarrage, historique, roles, maintenance resultats, progression publique et infos speaker.
- Correction du contexte de synchronisation temps reel pour eviter une erreur silencieuse sur la desactivation automatique du mode direct.
- Correction du contexte des evenements d'interface : les clics speaker utilisent de nouveau la console active.
- Remplacement des acces implicites du rendu principal de console par des dependances explicites.
- Remplacement des fleches unicode fragiles des boutons de navigation par des caracteres ASCII.
- Suppression de l'heure dans le menu deroulant des courses de la page publique series.
- Ajout d'un smoke test navigateur automatisé pour les consoles, les actions speaker et la page publique series.
- Remplacement des acces implicites `with (context)` par des dependances explicites dans les modules alertes, programme et actions admin.
- Remplacement des acces implicites `with (context)` par des dependances explicites dans les modules evenements UI, decisions JA, historique, synchronisation temps reel et import series.
- Remplacement des acces implicites `with (context)` par des dependances explicites dans le module publication/relecture des resultats.
- Suppression des derniers acces implicites `with (context)` dans les modules diagnostics, panneau nageur, administration resultats, forfaits/finales et synchronisation console.
- Stabilisation du smoke test navigateur : il attend maintenant l'ouverture effective des consoles avant de verifier les roles.
- `app.js` reste autour de 2100 lignes.
