(function () {
  function init(context = {}) {
    const {
      ACTIVE_VIEW_KEY,
      CLIENT_ID_KEY,
      firstSeriesSelectionForCurrentRace,
      HOME_AFTER_INACTIVITY_MS,
      initialProgramPosition,
      isSpeakerView,
      LAST_ACTIVITY_KEY,
      livePalmesLocalState,
      livePalmesRoleAccess,
      livePalmesRoleState,
      ROLE_LABELS,
      ROLE_PINS,
      ROLE_STATES_KEY,
      UNLOCKED_ROLES_KEY
    } = context;
    const browserWindow = context.window || window;
    const storage = context.localStorage || browserWindow.localStorage;
    const getData = () => context.data || { events: [], notes: {} };
    const getRoleStates = () => context.roleStates || {};
    const setRoleStates = (value) => { context.roleStates = value; };
    const getState = () => context.state || {};
    const setState = (value) => { context.state = value; };
    const getUnlockedRoles = () => context.unlockedRoles || [];
    const setUnlockedRoles = (value) => { context.unlockedRoles = value; };
    const dedicatedRole = browserWindow.LivePalmesDedicatedRole || "";

    function createRoleState(role = "speaker") {
      const data = getData();
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
      const data = getData();
      const initial = initialProgramPosition();
      return livePalmesRoleState.defaultRoleStates({
        initial,
        firstEventId: data.events[0]?.id || ""
      });
    }

    function normalizeRoleState(role, savedState, fallbackState) {
      return livePalmesRoleState.normalizeRoleState(role, savedState, fallbackState, (eventId) =>
        getData().events.some((event) => event.id === eventId)
      );
    }

    function loadRoleStates() {
      const data = getData();
      const defaults = defaultRoleStates();
      const saved = storage.getItem(ROLE_STATES_KEY);
      if (!saved) return defaults;
      try {
        return livePalmesRoleState.parseRoleStates(saved, {
          initial: initialProgramPosition(),
          firstEventId: data.events[0]?.id || "",
          eventExists: (eventId) => getData().events.some((event) => event.id === eventId)
        });
      } catch {
        return defaults;
      }
    }

    function saveRoleStates() {
      storage.setItem(ROLE_STATES_KEY, JSON.stringify(getRoleStates()));
    }

    function loadUnlockedRoles() {
      return livePalmesRoleState.parseUnlockedRoles(storage.getItem(UNLOCKED_ROLES_KEY));
    }

    function saveUnlockedRoles() {
      storage.setItem(UNLOCKED_ROLES_KEY, JSON.stringify(getUnlockedRoles()));
    }

    function pinLockEnabled() {
      return livePalmesRoleAccess.pinLockEnabled(getData().notes);
    }

    function cloudPinModeEnabled() {
      return getData().notes?.pinAuthMode === "cloud";
    }

    function hasCompetitionRows(value = {}) {
      return Boolean(value.program?.length || value.series?.length || value.entrants?.length);
    }

    function isEmptyCompetitionData(value = {}) {
      return value.notes?.sourceMode === "empty-rescue" ||
        value.notes?.sourceMode === "empty" ||
        /comp[ÃƒÃ©]tition\s+[ÃƒÃ ]?\s*charger/i.test(String(value.meet?.name || ""));
    }

    function competitionModeEnabled() {
      const data = getData();
      if (Object.prototype.hasOwnProperty.call(data.notes || {}, "competitionMode")) {
        return data.notes?.competitionMode === true;
      }
      return hasCompetitionRows(data) && !isEmptyCompetitionData(data);
    }

    function realtimeSyncEnabled() {
      return competitionModeEnabled();
    }

    function publicPositionEnabled() {
      return getData().notes?.publicPositionEnabled === true;
    }

    function currentRolePins() {
      return livePalmesRoleAccess.currentRolePins(ROLE_PINS, getData().notes);
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
      livePalmesLocalState.saveActiveView(ACTIVE_VIEW_KEY, getState(), context.profileHomeActive);
    }

    function unlockRole(role) {
      setUnlockedRoles([role]);
      saveUnlockedRoles();
    }

    function roleIsUnlocked(role) {
      if (browserWindow.LivePalmesConsoleGate?.isUnlocked?.() &&
        browserWindow.LivePalmesConsoleGate?.unlockedRole?.() === role) {
        return true;
      }
      if (cloudPinModeEnabled()) {
        return Boolean((context.cloudAuthenticatedRoles || {})[role]);
      }
      return livePalmesRoleAccess.roleIsUnlocked(role, {
        notes: getData().notes,
        unlockedRoles: getUnlockedRoles()
      });
    }

    function requestRoleAccess(role) {
      if (roleIsUnlocked(role)) return true;
      return false;
    }

    function saveCurrentRoleState() {
      const state = getState();
      const roleStates = getRoleStates();
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
      const roleStates = getRoleStates();
      const nextState = cloneRoleState(roleStates[nextRole] || createRoleState(nextRole));
      nextState.role = nextRole;
      setState(nextState);
      if (!isSpeakerView() && nextState.series === "all") {
        nextState.series = firstSeriesSelectionForCurrentRace();
      }
      nextState.selectedSwimmerId = "";
      nextState.selectedRecordKey = "";
    }

    function switchRole(nextRole) {
      if (!ROLE_LABELS[nextRole]) return;
      switchRoleUnlocked(nextRole);
    }

    function initializeRoleSession() {
      const initialView = loadActiveView();
      let nextUnlockedRoles = getUnlockedRoles();
      if (initialView.profileHomeActive && shouldReturnHomeForInactivity()) {
        nextUnlockedRoles = [];
        setUnlockedRoles(nextUnlockedRoles);
        saveUnlockedRoles();
      }
      const pageRole = knownRole(dedicatedRole) ? dedicatedRole : "";
      if (pageRole && browserWindow.LivePalmesConsoleGate?.isUnlocked?.() &&
        browserWindow.LivePalmesConsoleGate?.unlockedRole?.() === pageRole) {
        context.cloudAuthenticatedRoles = {
          ...(context.cloudAuthenticatedRoles || {}),
          [pageRole]: true
        };
      }
      const initialRole = pageRole || (knownRole(initialView.role) ? initialView.role : "live");
      const loadedRoleStates = loadRoleStates();
      const initialState = cloneRoleState(loadedRoleStates[initialRole] || loadedRoleStates.live);
      initialState.role = initialRole;
      const profileHomeActive = pageRole
        ? !roleIsUnlocked(pageRole)
        : initialView.profileHomeActive;
      return {
        initialRole,
        initialView,
        profileHomeActive,
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

  window.LivePalmesRoleSessionWorkflow = { init };
}());
