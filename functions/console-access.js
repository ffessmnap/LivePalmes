const CONSOLE_PORTAL_CAPABILITIES = [
  "admin.full",
  "consoles.manage",
  "consoles.access"
];

function hasConsolePortalCapability(capabilities = {}) {
  return CONSOLE_PORTAL_CAPABILITIES.some((capability) => capabilities?.[capability] === true);
}

function consoleRoleClaims(existingClaims = {}, role, competitionId) {
  return {
    ...existingClaims,
    livepalmesConsoleAccess: true,
    livepalmesRole: role,
    livepalmesCompetition: competitionId,
    livepalmesConsole: true
  };
}

module.exports = {
  CONSOLE_PORTAL_CAPABILITIES,
  consoleRoleClaims,
  hasConsolePortalCapability
};
