"use strict";
const { execFileSync } = require("node:child_process");
// Incident reported 9 September 2026 around 10:05 Europe/Paris (08:05 UTC).
// No Firestore writes, Storage writes, IAM changes or deployment commands.
const filter = 'timestamp>="2026-09-09T08:00:00Z" AND timestamp<="2026-09-09T08:20:00Z" AND ("livepalmes.engagement.times.source_missing" OR "Historique des performances momentanement indisponible" OR "Un contrôle de qualification est déjà en cours")';
try {
  const raw = execFileSync("gcloud", ["logging", "read", filter, "--project=livepalmes-test", "--limit=50", "--order=asc", "--format=json"], { encoding: "utf8", maxBuffer: 2 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] });
  const entries = JSON.parse(raw);
  console.log(JSON.stringify({ project: "livepalmes-test", fromUTC: "2026-09-09T08:00:00Z", toUTC: "2026-09-09T08:20:00Z", count: entries.length }));
  for (const entry of entries) {
    const payload = entry.jsonPayload || {};
    // Explicit allowlist: never publish full payloads, tokens, emails or swimmer names.
    const cacheId = String(payload.cacheId || "");
    console.log(JSON.stringify({ timestamp: entry.timestamp, severity: entry.severity, service: entry.resource?.labels?.service_name || entry.resource?.labels?.function_name || "", sourceMissing: JSON.stringify(payload).includes("livepalmes.engagement.times.source_missing") || String(entry.textPayload || "").includes("livepalmes.engagement.times.source_missing"), cacheId: /^[a-f0-9]{16,64}$/.test(cacheId) ? cacheId : "not-displayed", sourceKeyCount: Number.isInteger(payload.sourceKeyCount) ? payload.sourceKeyCount : null }));
  }
} catch (error) {
  const message = String(error.stderr || "");
  console.error(/PERMISSION_DENIED|permission|logging.logEntries.list/i.test(message)
    ? "Accès aux journaux TEST refusé. Vérifier le rôle roles/logging.viewer du compte de service TEST utilisé par ce workflow."
    : "Lecture des journaux TEST impossible (authentification, API ou réponse invalide). Aucun accès aux données de production ni aucune écriture effectuée.");
  process.exitCode = 1;
}
