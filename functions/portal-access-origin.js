// Existing singleton, values or query bodies; no business change.
const { livePalmesEnvironment } = require("./livepalmes-environment");

const PORTAL_ORIGIN = livePalmesEnvironment().hostingOrigin;

module.exports = { PORTAL_ORIGIN };
