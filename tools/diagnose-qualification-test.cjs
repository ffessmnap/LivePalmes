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
    const cacheId = String(payload.cacheId || String(entry.textPayload || "").match(/cacheId:\s*['"]([a-f0-9]{40})['"]/)?.[1] || "");
    console.log(JSON.stringify({ timestamp: entry.timestamp, severity: entry.severity, service: entry.resource?.labels?.service_name || entry.resource?.labels?.function_name || "", sourceMissing: JSON.stringify(payload).includes("livepalmes.engagement.times.source_missing") || String(entry.textPayload || "").includes("livepalmes.engagement.times.source_missing"), cacheId: /^[a-f0-9]{16,64}$/.test(cacheId) ? cacheId : "not-displayed", sourceKeyCount: Number.isInteger(payload.sourceKeyCount) ? payload.sourceKeyCount : null }));
  }
} catch (error) {
  const message = String(error.stderr || "");
  console.error(/PERMISSION_DENIED|permission|logging.logEntries.list/i.test(message)
    ? "Accès aux journaux TEST refusé. Vérifier le rôle roles/logging.viewer du compte de service TEST utilisé par ce workflow."
    : "Lecture des journaux TEST impossible (authentification, API ou réponse invalide). Aucun accès aux données de production ni aucune écriture effectuée.");
  process.exitCode = 1;
}

// Exact competition lookup and a maximum of five club documents; never scan
// performances or publish identities from TEST in the workflow's public logs.
async function inspectIndex() {
  const token = execFileSync("gcloud", ["auth", "print-access-token"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  const base = "https://firestore.googleapis.com/v1/projects/livepalmes-test/databases/(default)/documents";
  const decode = (value) => value?.mapValue ? Object.fromEntries(Object.entries(value.mapValue.fields || {}).map(([k, v]) => [k, decode(v)])) : value?.arrayValue ? (value.arrayValue.values || []).map(decode) : value?.integerValue !== undefined ? Number(value.integerValue) : value?.booleanValue ?? value?.stringValue ?? null;
  const data = (doc) => Object.fromEntries(Object.entries(doc.fields || {}).map(([k, v]) => [k, decode(v)]));
  async function read(path, body) {
    const response = await fetch(base + path, { method: body ? "POST" : "GET", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}) });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`Firestore TEST HTTP ${response.status}`);
    return response.json();
  }
  const query = async (collection, field, value, limit) => (await read(":runQuery", { structuredQuery: { from: [{ collectionId: collection }], where: { fieldFilter: { field: { fieldPath: field }, op: "EQUAL", value: { stringValue: value } } }, limit } })).filter((item) => item.document).map((item) => ({ id: item.document.name.split("/").at(-1), ...data(item.document) }));
  const competitions = await query("engagementCompetitions", "name", "Championnat de France Elite (TEST)", 2);
  console.log(JSON.stringify({ diagnostic: "competition", matches: competitions.length }));
  if (competitions.length !== 1) return;
  const competition = competitions[0];
  const job = competition.qualificationJobId ? await read(`/engagementQualificationJobs/${encodeURIComponent(competition.qualificationJobId)}`) : null;
  console.log(JSON.stringify({ diagnostic: "lock", present: !!competition.qualificationJobId, state: job ? data(job).state : null, applyStarted: job ? data(job).applyStarted === true : false }));
  const clubs = await query("engagementClubEntries", "competitionId", competition.id, 5);
  const swimmers = clubs.flatMap((club) => club.swimmers || []).slice(0, 50);
  const hash = (value) => require("node:crypto").createHash("sha256").update(value).digest("hex").slice(0, 40);
  for (const swimmer of swimmers) {
    const identity = swimmer.identityKey || swimmer.swimmerIdentityKey;
    const indexId = identity ? hash(identity) : swimmer.swimmerIndexId || swimmer.id;
    if (!indexId) continue;
    const cacheId = hash([swimmer.source || "performances", identity || swimmer.swimmerIndexId || swimmer.id || swimmer.swimmerId].filter(Boolean).join("|"));
    if (cacheId === "1ad97ad49cf06fbd9c84a44531cff5c3af41efe8") {
      console.log(JSON.stringify({ diagnostic: "incident-swimmer", indexId, individualEntryCount: swimmer.individualEntries?.length || 0, source: ["reference", "performances", "engagement"].includes(swimmer.source) ? swimmer.source : "unspecified", hasIdentity: !!identity, hasSwimmerId: !!swimmer.swimmerId }));
      const sourceKeys = [...new Set([swimmer.identityKey, swimmer.swimmerIdentityKey, swimmer.swimmerId, ...(swimmer.sourceIds || [])].filter(Boolean))].slice(0, 5);
      for (const sourceKey of sourceKeys) {
        const key = hash(sourceKey);
        const object = `performance-public-firestore/swimmers/${key.slice(0, 2)}/${key}.json`;
        const response = await fetch(`https://storage.googleapis.com/storage/v1/b/livepalmes-test-public-data-206080168534/o/${encodeURIComponent(object)}`, { headers: { Authorization: `Bearer ${token}` } });
        console.log(JSON.stringify({ diagnostic: "incident-storage", key, status: response.status }));
      }
    }
    if (!swimmer.individualEntries?.length) continue;
    const doc = await read(`/performanceSwimmerIndex/${encodeURIComponent(indexId)}`);
    const index = doc ? data(doc) : {};
    const count = Number(index.pageCount);
    let rows = 0, complete = !!doc && Number.isInteger(count) && count >= 0 && count <= 20;
    if (complete) for (let page = 0; page < count; page++) {
      const snapshot = await read(`/performanceSwimmerPages/${encodeURIComponent(indexId)}_${String(page).padStart(4, "0")}`);
      const value = snapshot ? data(snapshot) : {};
      complete &&= Array.isArray(value.rows) && value.updatedAt === index.updatedAt && value.rowCount === value.rows.length;
      rows += value.rows?.length || 0;
    }
    console.log(JSON.stringify({ diagnostic: "history-index", indexId, exists: !!doc, pageCount: Number.isFinite(count) ? count : null, rowCount: index.rowCount ?? null, complete: complete && rows === index.rowCount }));
  }
}
inspectIndex().catch((error) => { console.error(/^Firestore TEST HTTP \d+$/.test(error.message) ? error.message : "Diagnostic index TEST impossible."); process.exitCode = 1; });
