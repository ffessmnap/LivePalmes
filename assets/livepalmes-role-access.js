(function attachLivePalmesRoleAccess(global) {
  const KNOWN_ROLES = ["live", "speaker", "referee", "video", "computer", "secretary"];

  function pinLockEnabled(notes = {}) {
    return notes?.pinLockEnabled === true;
  }

  function currentRolePins(defaultPins = {}, notes = {}) {
    return {
      ...(defaultPins || {}),
      ...(notes?.rolePins || {})
    };
  }

  function knownRole(role) {
    return KNOWN_ROLES.includes(role);
  }

  function protectedRole(role) {
    return knownRole(role);
  }

  function roleIsUnlocked(role, options = {}) {
    return !pinLockEnabled(options.notes || {}) || (options.unlockedRoles || []).includes(role);
  }

  function roleConnectionLimit(role) {
    return role === "live" ? 3 : 1;
  }

  function lockExpired(lock, now = Date.now()) {
    return !lock?.expiresAt || Date.parse(lock.expiresAt) <= now;
  }

  function lockLastActivityTime(lock) {
    return Date.parse(lock?.updatedAt || lock?.expiresAt || lock?.createdAt || "") || 0;
  }

  function lockLooksAbandoned(lock, recoveryMs, now = Date.now()) {
    const last = lockLastActivityTime(lock);
    return !last || now - last > recoveryMs;
  }

  function activeClients(clients = {}, now = Date.now()) {
    return Object.fromEntries(Object.entries(clients || {}).filter(([, item]) => !lockExpired(item, now)));
  }

  global.LivePalmesRoleAccess = {
    activeClients,
    currentRolePins,
    knownRole,
    lockExpired,
    lockLastActivityTime,
    lockLooksAbandoned,
    pinLockEnabled,
    protectedRole,
    roleConnectionLimit,
    roleIsUnlocked
  };
})(window);
