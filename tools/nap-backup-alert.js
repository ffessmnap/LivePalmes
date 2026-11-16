"use strict";
// No SQL, Drive or Google credentials: inspect GitHub metadata and send one fixed-recipient alert.
const fs = require("node:fs"), path = require("node:path");
const REPO = "ffessmnap/LivePalmes", RECIPIENT = "antoine.fauveau@nap-ffessm.fr";
const BACKUP = "nap-backup-drive.yml", WATCH = "nap-backup-alert.yml";
const SOURCES = {
  nap: { workflow: BACKUP, label: "NAP", prefix: "nap-backup", title: /^NAP (backup|trial)$/, artifacts: id => ["nap-backup-report", "nap-backup-encrypted-" + id] },
  firebase: { workflow: "a2-firebase-backup.yml", label: "Firebase", prefix: "a2-firebase-backup", title: /^A2 Firebase (backup|trial)$/, enabledVariable: "A2_BACKUP_SCHEDULE_ENABLED", artifacts: id => ["a2-firebase-report", "a2-firebase-encrypted-" + id] }
};
const START = Date.parse("2026-11-17T01:00:00Z");
const paris = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });
function fail(code) { throw Object.assign(new Error(code), { safeCode: code }); }
function parts(date) { return Object.fromEntries(paris.formatToParts(date).filter(p => p.type !== "literal").map(p => [p.type, Number(p.value)])); }
function slot(now) {
  const p = parts(now), day = new Date(Date.UTC(p.year, p.month - 1, p.day));
  day.setUTCDate(day.getUTCDate() - (day.getUTCDay() + 5) % 7);
  let target = Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), 2), guess = target;
  for (let i = 0; i < 3; i++) { const q = parts(new Date(guess)); guess += target - Date.UTC(q.year, q.month - 1, q.day, q.hour, q.minute, q.second); }
  if (guess > now.getTime()) return slot(new Date(now.getTime() - 86400000));
  return { at: guess, date: day.toISOString().slice(0, 10) };
}
function sourceRun(run, source = SOURCES.nap) {
  return run && /^\d+$/.test(String(run.id)) && run.head_branch === "main" && run.head_repository?.full_name === REPO && run.path === ".github/workflows/" + source.workflow && ["schedule", "workflow_dispatch"].includes(run.event) &&
    (run.event === "schedule" || source.title.test(run.display_title));
}
function apiClient(token, request = fetch) {
  if (!token) fail("GITHUB_TOKEN_REQUIRED");
  return async endpoint => {
    if (!endpoint.startsWith("/actions/")) fail("GITHUB_READ_SCOPE_REQUIRED");
    let response, raw;
    try { response = await request("https://api.github.com/repos/" + REPO + endpoint, { headers: { Authorization: "Bearer " + token, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" }, signal: AbortSignal.timeout(15000) }); raw = await response.text(); }
    catch { fail("MONITOR_READ_FAILED"); }
    if (!response.ok || raw.length > 4 * 1024 * 1024) fail("MONITOR_READ_FAILED");
    try { return JSON.parse(raw); } catch { fail("MONITOR_READ_FAILED"); }
  };
}
async function inspect(api, now, failureId, source = SOURCES.nap) {
  const expected = slot(now), key = source.prefix + "-alert-" + expected.date;
  if (expected.at < START) return { kind: "not-due", expected };
  const query = new URLSearchParams({ branch: "main", per_page: "100", created: ">=" + new Date(expected.at).toISOString() });
  const result = await api("/actions/workflows/" + source.workflow + "/runs?" + query);
  if (!Array.isArray(result.workflow_runs) || result.total_count > 100) fail("MONITOR_RUN_BUDGET_EXCEEDED");
  const runs = result.workflow_runs.filter(run => sourceRun(run, source) && Date.parse(run.created_at) >= expected.at && Date.parse(run.created_at) <= now.getTime());
  const successful = runs.filter(run => run.status === "completed" && run.conclusion === "success");
  for (const run of successful.slice(0, 3)) {
    const artifacts = await api("/actions/runs/" + run.id + "/artifacts?per_page=20");
    if (!Array.isArray(artifacts.artifacts) || artifacts.total_count > 20) fail("MONITOR_ARTIFACT_BUDGET_EXCEEDED");
    if (source.artifacts(run.id).every(name => artifacts.artifacts.filter(a => a.name === name && !a.expired && a.size_in_bytes > 0).length === 1)) return { kind: "healthy", expected, runId: run.id };
  }
  const failed = runs.find(run => run.status === "completed" && run.conclusion !== "success" && (run.event === "schedule" || String(run.id) === failureId));
  if (failed) return { kind: "failed", key, expected, runId: failed.id };
  if (now.getTime() < expected.at + 3600000) return { kind: "grace", expected };
  return { kind: successful.length ? "receipt-missing" : runs.length ? "late" : "missing", key, expected, runId: runs[0]?.id };
}
async function alreadySent(api, key) {
  const result = await api("/actions/artifacts?" + new URLSearchParams({ name: key, per_page: "20" }));
  if (!Array.isArray(result.artifacts) || result.total_count > 20) fail("MONITOR_ALERT_BUDGET_EXCEEDED");
  for (const artifact of result.artifacts) {
    if (artifact.name !== key || artifact.expired || artifact.workflow_run?.head_branch !== "main") continue;
    const run = await api("/actions/runs/" + artifact.workflow_run.id);
    if (run.path === ".github/workflows/" + WATCH && run.head_branch === "main" && run.head_repository?.full_name === REPO && run.status === "completed" && run.conclusion === "success") return true;
  }
  return false;
}
function message(incident) {
  const source = SOURCES[incident.source || "nap"]; if (!source) fail("ALERT_SOURCE_INVALID");
  const labels = { test: "Test de l’alerte sauvegarde NAP", failed: "Échec de la sauvegarde NAP", missing: "Sauvegarde NAP non lancée", late: "Sauvegarde NAP toujours en attente", "receipt-missing": "Sauvegarde NAP sans reçu vérifiable", "monitor-unavailable": "Contrôle de la sauvegarde NAP impossible" };
  const title = labels[incident.kind]?.replaceAll("NAP", source.label); if (!title) fail("ALERT_KIND_INVALID");
  const text = incident.kind === "test" ? "Ceci est le test demandé de l’alerte par mail. Aucune sauvegarde n’a été déclenchée et aucun échec réel n’est simulé sur NAP." :
    "La sauvegarde " + source.label + " prévue le " + incident.expected.date + " à 2 h (heure de Paris) demande une vérification.\nMotif : " + title + ".\nCette alerte ne relance pas la copie et ne modifie pas la base.";
  const link = incident.runId ? "https://github.com/" + REPO + "/actions/runs/" + incident.runId : "https://github.com/" + REPO + "/actions/workflows/" + source.workflow;
  return { to: RECIPIENT, subject: "[LivePalmes] " + title, text: text + "\n\nConsulter : " + link + "\nDossier : https://drive.google.com/drive/folders/1EmLc7dmUWwf5jK3pYYQ7j4XPmfSrlIW3\n\nAucune donnée de la base ni pièce jointe dans ce message." };
}
async function sendMail(incident, secret, createTransport) {
  let config; try { config = JSON.parse(secret || ""); } catch { fail("ALERT_SMTP_REQUIRED"); }
  if (!config || !config.host || !config.user || !config.pass || !config.from || /[\r\n]/.test(config.from) || !Number.isInteger(config.port) || ![465, 587].includes(config.port) || typeof config.secure !== "boolean") fail("ALERT_SMTP_REQUIRED");
  const factory = createTransport || require("../functions/node_modules/nodemailer").createTransport;
  const transport = factory({ host: config.host, port: config.port, secure: config.secure, requireTLS: !config.secure, auth: { user: config.user, pass: config.pass }, connectionTimeout: 15000, greetingTimeout: 15000, socketTimeout: 30000, logger: false, debug: false });
  try { const result = await transport.sendMail({ from: config.from, ...message(incident), disableFileAccess: true, disableUrlAccess: true }); if (!result.accepted?.some(address => address.toLowerCase() === RECIPIENT)) fail("ALERT_MAIL_NOT_ACCEPTED"); }
  catch { fail("ALERT_MAIL_NOT_ACCEPTED"); }
  finally { transport.close(); }
}
async function main(env = process.env) {
  if (env.GITHUB_REF !== "refs/heads/main" || env.GITHUB_REPOSITORY !== REPO) fail("ALERT_MAIN_REQUIRED");
  const mode = env.ALERT_MODE || "check", now = new Date(), expected = slot(now);
  const sourceName = env.ALERT_SOURCE || "nap", source = SOURCES[sourceName]; if (!source) fail("ALERT_SOURCE_INVALID");
  if ((source.enabledVariable && env[source.enabledVariable] !== "true") || (sourceName !== "nap" && mode === "test")) { console.log(JSON.stringify({ source: sourceName, kind: "inactive", sent: false })); return; }
  if (!["check", "monitor", "test"].includes(mode)) fail("ALERT_MODE_INVALID");
  let incident, api;
  if (mode === "test") {
    if (env.GITHUB_EVENT_NAME !== "workflow_dispatch" || env.ALERT_CONFIRMATION !== "NAP-ALERTE-TEST-AUTORISEE" || !/^\d+$/.test(env.GITHUB_RUN_ID || "")) fail("ALERT_TEST_NOT_AUTHORIZED");
    incident = { kind: "test", key: "nap-backup-alert-test-" + env.GITHUB_RUN_ID, expected };
  } else {
    api = apiClient(env.GITHUB_TOKEN);
    let failureId;
    if (env.GITHUB_EVENT_NAME === "workflow_run") {
      const payload = JSON.parse(fs.readFileSync(env.GITHUB_EVENT_PATH, "utf8"));
      if (!sourceRun(payload.workflow_run, source) || payload.workflow_run.conclusion === "success") { console.log("Surveillance : evenement hors echec de copie, ignore."); return; }
      failureId = String(payload.workflow_run.id);
    }
    try { incident = await inspect(api, now, failureId, source); }
    catch { incident = { kind: "monitor-unavailable", key: source.prefix + "-alert-monitor-" + expected.date, expected }; }
  }
  incident.source = sourceName;
  if (["healthy", "not-due", "grace"].includes(incident.kind) || mode === "check") { console.log(JSON.stringify({ kind: incident.kind, expected: incident.expected.date, sent: false })); return; }
  if (env.NAP_BACKUP_ALERTS_ENABLED !== "true" && mode !== "test") fail("ALERT_DISABLED");
  let duplicate = false;
  if (api) { try { duplicate = await alreadySent(api, incident.key); } catch { console.log("Journal des alertes indisponible : priorite a l envoi, repetition possible."); } }
  if (duplicate) { console.log("Surveillance : alerte deja envoyee pour cet incident."); return; }
  await sendMail(incident, env.NAP_BACKUP_ALERT_SMTP_JSON);
  const directory = path.resolve("outputs/nap-backup-alert"); fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, "report.json"), JSON.stringify({ schema: 1, sentAt: new Date().toISOString(), recipient: RECIPIENT, ...incident }, null, 2) + "\n", { flag: "wx", mode: 0o600 });
  fs.appendFileSync(env.GITHUB_OUTPUT, "sent=true\nkey=" + incident.key + "\n");
  console.log("Alerte acceptee par le serveur mail pour le destinataire autorise.");
}
module.exports = { slot, sourceRun, apiClient, inspect, alreadySent, message, sendMail, main, RECIPIENT, SOURCES };
if (require.main === module) main().catch(error => { console.error("Surveillance NAP arretee : " + (error.safeCode || "ALERT_FAILED") + ". Aucun secret ni contenu SQL journalise."); process.exitCode = 1; });
