(function attachLivePalmesRoleState(global) {
  const ROLE_ORDER = ["speaker", "live", "referee", "video", "computer", "secretary"];

  function createRoleState(options = {}) {
    const {
      role = "speaker",
      initial = {},
      firstEventId = ""
    } = options;
    return {
      eventId: initial.eventId || firstEventId || "",
      sex: initial.sex || "F",
      search: "",
      category: "all",
      series: initial.series || "all",
      session: initial.session || "all",
      programKey: initial.programKey || "",
      lineOrder: "asc",
      selectedSwimmerId: "",
      selectedRecordKey: "",
      liveMode: true,
      role
    };
  }

  function cloneRoleState(nextState = {}) {
    return { ...nextState, search: "", selectedSwimmerId: "", selectedRecordKey: "" };
  }

  function defaultRoleStates(options = {}) {
    return Object.fromEntries(ROLE_ORDER.map((role) => [role, createRoleState({ ...options, role })]));
  }

  function normalizeRoleState(role, savedState, fallbackState, eventExists = () => true) {
    const nextState = cloneRoleState({ ...fallbackState, ...(savedState || {}), role });
    if (nextState.eventId && !eventExists(nextState.eventId)) {
      return cloneRoleState(fallbackState);
    }
    return nextState;
  }

  function parseUnlockedRoles(value) {
    if (!value) return [];
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function parseRoleStates(value, options = {}) {
    const defaults = defaultRoleStates(options);
    if (!value) return defaults;
    try {
      const parsed = JSON.parse(value);
      return Object.fromEntries(Object.keys(defaults).map((role) => [
        role,
        normalizeRoleState(role, parsed?.[role], defaults[role], options.eventExists)
      ]));
    } catch {
      return defaults;
    }
  }

  global.LivePalmesRoleState = {
    cloneRoleState,
    createRoleState,
    defaultRoleStates,
    normalizeRoleState,
    parseRoleStates,
    parseUnlockedRoles
  };
})(window);
