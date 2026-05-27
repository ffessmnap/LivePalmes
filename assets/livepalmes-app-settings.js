(function attachLivePalmesAppSettings(global) {
  function resolve(source = global) {
    const config = source.LivePalmesAppConfig || {};
    return {
      livePalmesAppConfig: config,
      STORAGE_KEY: config.storageKey || "napSpeakerFrance2026:v15",
      ALERTS_KEY: config.alertsKey || "napSpeakerFrance2026:alerts:v1",
      LIVE_DISMISSED_ALERTS_KEY: config.liveDismissedAlertsKey || "napSpeakerFrance2026:live-dismissed-alerts:v1",
      UNLOCKED_ROLES_KEY: config.unlockedRolesKey || "napSpeakerFrance2026:unlocked-roles:v1",
      CLIENT_ID_KEY: config.clientIdKey || "napSpeakerFrance2026:client-id:v1",
      ACTIVE_VIEW_KEY: config.activeViewKey || "napSpeakerFrance2026:active-view:v1",
      ROLE_STATES_KEY: config.roleStatesKey || "napSpeakerFrance2026:role-states:v1",
      LAST_ACTIVITY_KEY: config.lastActivityKey || "napSpeakerFrance2026:last-activity:v1",
      FIRESTORE_COMPETITION_ID: config.firestoreCompetitionId || "livepalmes-active",
      SPEAKER_SHEET_ID: config.speakerSheetId || "1osoRYSAw15iwfFnpUuR4_nNl_kUui7vQGBJFyyhmmdA",
      ADMIN_PIN: config.adminPin || "2216!",
      ROLE_PINS: config.rolePins || { live: "0000", speaker: "0001", referee: "0002", video: "0003", computer: "0004", secretary: "0005" },
      ROLE_LABELS: {
        speaker: "Speaker",
        live: "Live",
        referee: "Juge arbitre",
        video: "Juge vid\u00e9o",
        computer: "Bureau des performances",
        secretary: "Secr\u00e9tariat"
      },
      DECISION_LABELS: {
        forfait: "Forfait",
        abandon: "Abandon",
        false_start: "DSQ - faux d\u00e9part",
        relay_early_start: "DSQ - d\u00e9part anticip\u00e9",
        underwater_15m: "DSQ - coul\u00e9e sup\u00e9rieure \u00e0 15 m",
        immersion: "DSQ - passage en immersion",
        bottle_fault: "DSQ - faute de bouteille",
        interference: "DSQ - g\u00eane d'un concurrent",
        other_dsq: "DSQ - autre motif"
      },
      SPEAKER_DECISION_REASONS: {
        false_start: "faux d\u00e9part",
        relay_early_start: "d\u00e9part anticip\u00e9",
        underwater_15m: "coul\u00e9e sup\u00e9rieure \u00e0 15 m",
        immersion: "passage en immersion",
        bottle_fault: "faute de bouteille",
        interference: "g\u00eane d'un concurrent",
        other_dsq: "autre motif"
      },
      LOCK_DURATION_MS: config.lockDurationMs || 120000,
      LOCK_RECOVERY_MS: config.lockRecoveryMs || 75000,
      LOCK_HEARTBEAT_MS: config.lockHeartbeatMs || 30000,
      FIREBASE_CONNECTION_CHECK_MS: config.firebaseConnectionCheckMs || 15000,
      HOME_AFTER_INACTIVITY_MS: config.homeAfterInactivityMs || 15 * 60 * 1000,
      COMPETITION_INACTIVITY_MS: config.competitionInactivityMs || 60 * 60 * 1000,
      COMPETITION_INACTIVITY_CHECK_MS: config.competitionInactivityCheckMs || 60 * 1000,
      PRESENCE_DURATION_MS: config.presenceDurationMs || 3 * 60 * 1000,
      PRESENCE_HEARTBEAT_MS: config.presenceHeartbeatMs || 60 * 1000,
      PRESENCE_WRITE_THROTTLE_MS: config.presenceWriteThrottleMs || 30 * 1000,
      SPEAKER_INFO_SHEETS: config.speakerInfoSheets || {},
      FIREBASE_CONFIG: config.firebaseConfig || {},
      sampleData: source.SPEAKER_DATA || config.fallbackData || { meet: {}, events: [], entrants: [], qualifications: [], top2025: [], records: [], notes: {} }
    };
  }

  global.LivePalmesAppSettings = { resolve };
})(window);
