"use strict";
// Preparation only: no Firebase CLI, Google credentials, network or business calls.
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { prepare } = require("./prepare-production-functions");
const FUNCTIONS = Object.freeze([
  "updateCurrentEmailNotificationPreferences", "disableCompetitionEmailNotifications",
  "notifyEngagementCompetitionDocuments", "listEngagementCompetitionMailJobs",
  "prepareEngagementOpeningNotificationEmails", "prepareEngagementClubRecapEmails",
  "sendEngagementPreparedEmails", "processNapCompetitionNotifications",
  "closeDueEngagementCompetitions"
]);
const MAIL_SECRETS = Object.freeze(["LIVEPALMES_SMTP_HOST", "LIVEPALMES_SMTP_PORT",
  "LIVEPALMES_SMTP_USER", "LIVEPALMES_SMTP_PASS", "LIVEPALMES_SMTP_SECURE",
  "LIVEPALMES_MAIL_FROM", "LIVEPALMES_NOTIFICATION_LINK_SECRET"]);
function plan(candidate) {
  if (!/^[0-9a-f]{40}$/.test(candidate)) throw new Error("Commit complet requis");
  return {
    schema: 1, project: "livepalmes", candidate, mode: "preparation-only",
    productionDeploymentAuthorized: false, initialAutomaticMailEnabled: false,
    functions: [...FUNCTIONS], newFunction: "processNapCompetitionNotifications",
    expectedSecrets: Object.fromEntries(FUNCTIONS.map(name => [name,
      name === "updateCurrentEmailNotificationPreferences" ? [] :
      name === "disableCompetitionEmailNotifications" ? ["LIVEPALMES_NOTIFICATION_LINK_SECRET"] :
      ["LIVEPALMES_NAP_PASSWORD", ...(["processNapCompetitionNotifications", "closeDueEngagementCompetitions"].includes(name) ? MAIL_SECRETS : [])]])),
    excluded: ["submitEngagementAccessRequest", "resolveEngagementAccessRequest",
      "resolveEngagementSwimmerChangeRequest", "resumePerformancePublicationJobs"],
    requiredReleaseChecks: ["exact-candidate-test-proof", "source-and-configuration-backup",
      "secret-access-without-value-logging", "automatic-mail-disabled-before-and-after",
      "scheduler-configuration-preserved", "excluded-functions-unchanged",
      "new-function-rollback", "explicit-production-release-approval"]
  };
}
function approved(request) {
  const names = request.additionalNotificationFunctions || [];
  if (!Array.isArray(names) || names.some(name => !FUNCTIONS.includes(name)) || new Set(names).size !== names.length)
    throw new Error("Extension notifications interdite");
  if (names.length && (names.length !== FUNCTIONS.length || typeof request.additionalNotificationApproval !== "string" ||
      !request.additionalNotificationApproval.trim() || request.initialAutomaticMailEnabled !== false))
    throw new Error("Accord notifications et mails desactives requis");
  return names;
}
function stage(root, destination, candidate, appCheck) {
  const result = plan(candidate);
  if (execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim() !== candidate)
    throw new Error("Le candidat a changé");
  execFileSync("git", ["diff", "--quiet", "HEAD", "--", "functions", "tools"], { cwd: root });
  prepare(root, destination, appCheck);
  fs.writeFileSync(path.join(destination, "functions", "index.js"), '"use strict";\n' +
    'const { livePalmesEnvironment } = require("./livepalmes-environment");\n' +
    'if (livePalmesEnvironment().projectId !== "livepalmes") throw new Error("Code reserve a PROD");\n' +
    'const backend = require("./backend-index");\n' +
    `for (const name of ${JSON.stringify(FUNCTIONS)}) { if (!backend[name]?.__endpoint) throw new Error("Export absent: " + name); exports[name] = backend[name]; exports[name].__endpoint.labels = { ...exports[name].__endpoint.labels, "livepalmes-commit": ${JSON.stringify(candidate)} }; }\n`);
  fs.writeFileSync(path.join(destination, "selector.txt"), FUNCTIONS.map(name => "functions:" + name).join(",") + "\n");
  fs.writeFileSync(path.join(destination, "notification-plan.json"), JSON.stringify(result, null, 2) + "\n");
  return result;
}
module.exports = { FUNCTIONS, MAIL_SECRETS, plan, approved, stage };
if (require.main === module) {
  stage(...process.argv.slice(2));
  console.log("Preparation limitee a 9 traitements ; aucun deploiement ni envoi.");
}
