(function () {
  function init(context = {}) {
    with (context) {
      function createRoleState(role = "speaker") {
        const initial = initialProgramPosition();
        return livePalmesRoleState.createRoleState({
          role,
          initial,
          firstEventId: data.events[0]?.id || ""
        });
      }
      
      function cloneRoleState(nextState) {
        return livePalmesRoleState.cloneRoleState(nextState);
      }
      
      function defaultRoleStates() {
        const initial = initialProgramPosition();
        return livePalmesRoleState.defaultRoleStates({
          initial,
          firstEventId: data.events[0]?.id || ""
        });
      }
      
      function normalizeRoleState(role, savedState, fallbackState) {
        return livePalmesRoleState.normalizeRoleState(role, savedState, fallbackState, (eventId) =>
          data.events.some((event) => event.id === eventId)
        );
      }
      
      function loadRoleStates() {
        const defaults = defaultRoleStates();
        const saved = localStorage.getItem(ROLE_STATES_KEY);
        if (!saved) return defaults;
        try {
          return livePalmesRoleState.parseRoleStates(saved, {
            initial: initialProgramPosition(),
            firstEventId: data.events[0]?.id || "",
            eventExists: (eventId) => data.events.some((event) => event.id === eventId)
          });
        } catch {
          return defaults;
        }
      }
      
      function saveRoleStates() {
        localStorage.setItem(ROLE_STATES_KEY, JSON.stringify(roleStates));
      }
      
      function loadUnlockedRoles() {
        return livePalmesRoleState.parseUnlockedRoles(localStorage.getItem(UNLOCKED_ROLES_KEY));
      }
      
      function saveUnlockedRoles() {
        localStorage.setItem(UNLOCKED_ROLES_KEY, JSON.stringify(unlockedRoles));
      }
      
      function pinLockEnabled() {
        return livePalmesRoleAccess.pinLockEnabled(data.notes);
      }
      
      function competitionModeEnabled() {
        return data.notes?.competitionMode === true;
      }
      
      function realtimeSyncEnabled() {
        return competitionModeEnabled();
      }
      
      function publicPositionEnabled() {
        return data.notes?.publicPositionEnabled === true;
      }
      
      function currentRolePins() {
        return livePalmesRoleAccess.currentRolePins(ROLE_PINS, data.notes);
      }
      
      function knownRole(role) {
        return livePalmesRoleAccess.knownRole(role);
      }
      
      function lastActivityTimestamp() {
        return livePalmesLocalState.lastActivityTimestamp(LAST_ACTIVITY_KEY);
      }
      
      function saveLastActivityTimestamp(timestamp = Date.now()) {
        livePalmesLocalState.saveLastActivityTimestamp(LAST_ACTIVITY_KEY, timestamp);
      }
      
      function shouldReturnHomeForInactivity() {
        return livePalmesLocalState.shouldReturnHomeForInactivity(LAST_ACTIVITY_KEY, HOME_AFTER_INACTIVITY_MS);
      }
      
      function loadActiveView() {
        return livePalmesLocalState.loadActiveView({
          activeViewKey: ACTIVE_VIEW_KEY,
          homeAfterInactivityMs: HOME_AFTER_INACTIVITY_MS,
          knownRole,
          lastActivityKey: LAST_ACTIVITY_KEY
        });
      }
      
      function saveActiveView() {
        livePalmesLocalState.saveActiveView(ACTIVE_VIEW_KEY, state, profileHomeActive);
      }
      
      function unlockRole(role) {
        unlockedRoles = [role];
        saveUnlockedRoles();
      }
      
      function roleIsUnlocked(role) {
        return livePalmesRoleAccess.roleIsUnlocked(role, {
          notes: data.notes,
          unlockedRoles
        });
      }
      
      function requestRoleAccess(role) {
        if (roleIsUnlocked(role)) return true;
        return false;
      }
      
      function saveCurrentRoleState() {
        roleStates[state.role] = cloneRoleState(state);
        saveRoleStates();
      }
      
      function currentClientId() {
        return livePalmesLocalState.currentClientId(CLIENT_ID_KEY);
      }
      
      function protectedRole(role) {
        return livePalmesRoleAccess.protectedRole(role);
      }
      
      function roleConnectionLimit(role) {
        return livePalmesRoleAccess.roleConnectionLimit(role);
      }
      
      function switchRoleUnlocked(nextRole) {
        saveCurrentRoleState();
        state = cloneRoleState(roleStates[nextRole] || createRoleState(nextRole));
        state.role = nextRole;
        if (!isSpeakerView() && state.series === "all") {
          state.series = firstSeriesSelectionForCurrentRace();
        }
        state.selectedSwimmerId = "";
        state.selectedRecordKey = "";
      }
      
      function switchRole(nextRole) {
        if (!ROLE_LABELS[nextRole]) return;
        switchRoleUnlocked(nextRole);
      }

      function initializeRoleSession() {
        const initialView = loadActiveView();
        let nextUnlockedRoles = unlockedRoles;
        if (initialView.profileHomeActive && shouldReturnHomeForInactivity()) {
          nextUnlockedRoles = [];
          unlockedRoles = nextUnlockedRoles;
          saveUnlockedRoles();
        }
        const initialRole = knownRole(initialView.role) ? initialView.role : "live";
        const loadedRoleStates = loadRoleStates();
        const initialState = cloneRoleState(loadedRoleStates[initialRole] || loadedRoleStates.live);
        initialState.role = initialRole;
        return {
          initialRole,
          initialView,
          profileHomeActive: initialView.profileHomeActive,
          roleStates: loadedRoleStates,
          state: initialState,
          unlockedRoles: nextUnlockedRoles
        };
      }

      return {
        createRoleState,
        cloneRoleState,
        defaultRoleStates,
        normalizeRoleState,
        loadRoleStates,
        saveRoleStates,
        loadUnlockedRoles,
        saveUnlockedRoles,
        pinLockEnabled,
        competitionModeEnabled,
        realtimeSyncEnabled,
        publicPositionEnabled,
        currentRolePins,
        knownRole,
        lastActivityTimestamp,
        saveLastActivityTimestamp,
        shouldReturnHomeForInactivity,
        loadActiveView,
        saveActiveView,
        unlockRole,
        roleIsUnlocked,
        requestRoleAccess,
        saveCurrentRoleState,
        currentClientId,
        protectedRole,
        roleConnectionLimit,
        switchRoleUnlocked,
        switchRole,
        initializeRoleSession
      };
    }
  }

  window.LivePalmesRoleSessionWorkflow = { init };
})();
