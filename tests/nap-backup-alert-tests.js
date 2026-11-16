"use strict";
const assert = require("node:assert/strict"), fs = require("node:fs"), path = require("node:path");
const a = require("../tools/nap-backup-alert");
const run = (changes = {}) => ({ id: 123, head_branch: "main", head_repository: { full_name: "ffessmnap/LivePalmes" }, path: ".github/workflows/nap-backup-drive.yml", event: "schedule", display_title: "NAP backup", created_at: "2026-11-17T01:01:00Z", status: "completed", conclusion: "success", ...changes });
const now = new Date("2026-11-17T02:17:00Z");
function api(runs, artifacts = [{ name: "nap-backup-report", size_in_bytes: 700 }, { name: "nap-backup-encrypted-123", size_in_bytes: 16000000 }]) {
  return async endpoint => {
    if (endpoint.includes("/runs?")) { assert(endpoint.includes("per_page=100")); return { total_count: runs.length, workflow_runs: runs }; }
    assert.equal(endpoint, "/actions/runs/123/artifacts?per_page=20"); return { total_count: artifacts.length, artifacts };
  };
}
async function main() {
  for (const [date, expected] of [["2026-11-17T00:59:59Z", "2026-11-10T01:00:00.000Z"], ["2026-11-17T01:00:00Z", "2026-11-17T01:00:00.000Z"], ["2027-07-06T01:17:00Z", "2027-07-06T00:00:00.000Z"], ["2027-03-30T02:00:00Z", "2027-03-30T00:00:00.000Z"], ["2027-10-26T03:00:00Z", "2027-10-26T00:00:00.000Z"], ["2027-11-02T03:00:00Z", "2027-11-02T01:00:00.000Z"]]) assert.equal(new Date(a.slot(new Date(date)).at).toISOString(), expected);
  assert.equal((await a.inspect(() => { throw Error("not called"); }, new Date("2026-11-16T12:00:00Z"))).kind, "not-due");
  assert.equal((await a.inspect(api([]), new Date("2026-11-17T01:40:00Z"))).kind, "grace");
  const missing = await a.inspect(api([]), now); assert.equal(missing.kind, "missing"); assert.equal(missing.key, "nap-backup-alert-2026-11-17");
  assert.equal((await a.inspect(api([run()]), now)).kind, "healthy");
  assert.equal((await a.inspect(api([run()], []), now)).kind, "receipt-missing");
  assert.equal((await a.inspect(api([run()], [{ name: "nap-backup-report", size_in_bytes: 1 }, { name: "nap-backup-encrypted-123", size_in_bytes: 1, expired: true }]), now)).kind, "receipt-missing");
  assert.equal((await a.inspect(api([run({ status: "queued", conclusion: null })]), now)).kind, "late");
  assert.equal((await a.inspect(api([run({ conclusion: "failure" })]), new Date("2026-11-17T01:05:00Z"), "123")).kind, "failed");
  assert.equal((await a.inspect(api([run({ id: 124, conclusion: "failure" }), run()]), now)).kind, "healthy");
  for (const changed of [{ head_branch: "untrusted" }, { head_repository: { full_name: "fork/LivePalmes" } }, { path: ".github/workflows/other.yml" }, { event: "workflow_dispatch", display_title: "NAP check" }, { created_at: "2026-11-16T23:00:00Z" }]) assert.equal((await a.inspect(api([run(changed)]), now)).kind, "missing");
  await assert.rejects(a.inspect(async () => ({ total_count: 101, workflow_runs: [] }), now), /MONITOR_RUN_BUDGET/);
  assert.equal(a.sourceRun(run({ event: "workflow_dispatch", display_title: "NAP trial" })), true);
  let calls = 0; const sentApi = async endpoint => { calls++; return endpoint.includes("artifacts?") ? { total_count: 1, artifacts: [{ name: missing.key, workflow_run: { id: 456, head_branch: "main" } }] } : run({ id: 456, path: ".github/workflows/nap-backup-alert.yml" }); };
  assert.equal(await a.alreadySent(sentApi, missing.key), true); assert.equal(calls, 2);
  assert.equal(await a.alreadySent(async endpoint => endpoint.includes("artifacts?") ? { artifacts: [{ name: missing.key, expired: true, workflow_run: { id: 456, head_branch: "main" } }] } : assert.fail("expired receipt"), missing.key), false);
  assert.equal(await a.alreadySent(async endpoint => endpoint.includes("artifacts?") ? { artifacts: [{ name: missing.key, workflow_run: { id: 456, head_branch: "main" } }] } : run({ path: ".github/workflows/unrelated.yml" }), missing.key), false);
  const mail = a.message(missing); assert.equal(mail.to, "antoine.fauveau@nap-ffessm.fr"); assert(mail.text.includes("2026-11-17 à 2 h")); assert.equal(mail.attachments, undefined);
  const secret = JSON.stringify({ host: "smtp.invalid", port: 587, secure: false, user: "fixture", pass: "fixture", from: "livepalmes@nap-ffessm.fr" });
  let closed = 0, delivered;
  await a.sendMail(missing, secret, options => { assert.equal(options.requireTLS, true); assert.equal(options.debug, false); return { async sendMail(message) { delivered = message; return { accepted: [a.RECIPIENT] }; }, close() { closed++; } }; });
  assert.equal(delivered.to, a.RECIPIENT); assert.equal(delivered.disableFileAccess, true); assert.equal(delivered.disableUrlAccess, true); assert.equal(closed, 1);
  await assert.rejects(a.sendMail(missing, secret, () => ({ async sendMail() { throw Error("sensitive SMTP diagnostic"); }, close() { closed++; } })), error => error.safeCode === "ALERT_MAIL_NOT_ACCEPTED" && !error.message.includes("sensitive")); assert.equal(closed, 2);
  await assert.rejects(a.sendMail(missing, "{}", () => assert.fail("no credentials")), /ALERT_SMTP_REQUIRED/);
  await assert.rejects(a.main({ GITHUB_REF: "refs/heads/other", GITHUB_REPOSITORY: "ffessmnap/LivePalmes" }), /ALERT_MAIN_REQUIRED/);
  await assert.rejects(a.main({ GITHUB_REF: "refs/heads/main", GITHUB_REPOSITORY: "ffessmnap/LivePalmes", ALERT_MODE: "test", GITHUB_EVENT_NAME: "schedule" }), /ALERT_TEST_NOT_AUTHORIZED/);
  await assert.rejects(a.apiClient("fixture", async () => ({ ok: false, async text() { return "private diagnostic"; } }))("/actions/runs"), /MONITOR_READ_FAILED/);
  const workflow = fs.readFileSync(path.join(__dirname, "../.github/workflows/nap-backup-alert.yml"), "utf8");
  assert(workflow.includes("workflow_run:") && workflow.includes("cron: '17 3 * * *'") && workflow.includes("timezone: Europe/Paris"));
  assert(workflow.includes("actions: read") && !workflow.includes("actions: write") && !workflow.includes("NAP_BACKUP_SERVICE_ACCOUNT_JSON") && !workflow.includes("NAP_BACKUP_ENCRYPTION_KEY"));
  console.log("NAP alerts: winter/summer dates, missing/failed/late runs, receipts, duplicates, fixed recipient, TLS, mail errors and main-only gates verified offline.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
