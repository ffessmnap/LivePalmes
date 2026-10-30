"use strict";
const fs = require("node:fs"), path = require("node:path"), crypto = require("node:crypto");
const { inflateRawSync } = require("node:zlib");
const planner = require("./user-name-correction-plan");
const { boundedJson, readDocuments, DATABASE } = require("./check-production-user-name-correction");
const acorn = require("../tests/firestore-rules/node_modules/acorn");
const indexSource = fs.readFileSync(path.join(__dirname, "../functions/index.js"), "utf8");
const indexAst = acorn.parse(indexSource, { ecmaVersion: "latest" });
const regionNode = indexAst.body.flatMap(node => node.declarations || []).find(node => node.id?.name === "CLUB_REFERENCE_REGION_LABELS").init;
const regionLabels = Object.fromEntries(regionNode.properties.map(prop => [prop.key.value, prop.value.value]));
const reference = require("../functions/assets/club-reference.json");
const access = require("../functions/server-access-service").createAccessService({
  cleanText: value => String(value || "").trim(), CLUB_REFERENCE_REGION_LABELS: regionLabels,
  CLUB_REFERENCE_BY_ID: new Map(reference.clubs.map(row => [String(row[0]), { regionId: row[3] }]))
});
const sha = text => crypto.createHash("sha256").update(text).digest("hex");
const mailCapabilities = ["engagements.club.manage", "engagements.region.manage", "engagements.national.manage"];
function decode(value) {
  if (!value) return undefined;
  if (value.mapValue) return Object.fromEntries(Object.entries(value.mapValue.fields || {}).map(([key, item]) => [key, decode(item)]));
  if (value.arrayValue) return (value.arrayValue.values || []).map(decode);
  for (const key of ["stringValue", "booleanValue", "integerValue", "doubleValue", "timestampValue", "nullValue"]) if (Object.hasOwn(value, key)) return value[key];
  throw new Error("Unsupported projection type");
}
function projectionSpecs(doc) {
  const data = decode({ mapValue: { fields: doc.fields } }), uid = doc.name.split("/").at(-1), specs = [];
  const add = (collection, id, map, key, trimmed) => specs.push({ name: `${DATABASE}/documents/${collection}/${id}`, map, key, trimmed });
  add("accessDirectorySnapshots", "national", "entries", sha(uid).slice(0, 32), false);
  if (!data.capabilities?.["admin.full"] && !data.capabilities?.["engagements.national.manage"]) {
    const region = access.accessUserRegionIdFromData(data);
    if (region) add("accessDirectorySnapshots", `region:${encodeURIComponent(region)}`, "entries", sha(uid).slice(0, 32), false);
  }
  for (const cap of mailCapabilities.filter(cap => data.capabilities?.[cap] === true)) {
    add("engagementMailRecipientShards", `${cap.replace(/[^a-z0-9]+/gi, "_")}-${Number.parseInt(sha(uid).slice(0, 8), 16) % 32}`, "recipients", sha(uid).slice(0, 24), true);
  }
  if (data.capabilities?.["engagements.club.manage"] && data.clubId && data.email) add("engagementClubAdminDirectories", "default", "admins", sha(uid).slice(0, 24), true);
  return specs;
}
function entryAt(doc, spec) { return doc?.fields?.[spec.map]?.mapValue?.fields?.[spec.key]?.mapValue?.fields; }
async function groupedRead(names, token) {
  const unique = [...new Set(names)], result = new Map();
  for (let offset = 0; offset < unique.length; offset += 100) for (const [key, value] of await readDocuments(unique.slice(offset, offset + 100), token)) result.set(key, value);
  return result;
}
async function projectionBaseline(originals, token) {
  const specs = new Map([...originals].map(([name, doc]) => [name, projectionSpecs(doc)]));
  const docs = await groupedRead([...specs.values()].flat().map(spec => spec.name), token);
  for (const [name, list] of specs) for (const spec of list) {
    const entry = entryAt(docs.get(spec.name), spec), source = originals.get(name).fields;
    if (!entry || ["firstName", "lastName"].some(field => entry[field]?.stringValue !== (spec.trimmed ? source[field].stringValue.trim().slice(0, 80) : source[field].stringValue))) throw new Error("Existing projection missing or already inconsistent");
  }
  return { specs, docs, uniqueReads: docs.size };
}
async function verifyProjections(entries, baseline, token, direction) {
  const specs = entries.flatMap(entry => baseline.specs.get(entry.name));
  const current = await groupedRead(specs.map(spec => spec.name), token);
  let checked = 0;
  for (const entry of entries) for (const spec of baseline.specs.get(entry.name)) {
    const expected = structuredClone(entryAt(baseline.docs.get(spec.name), spec));
    const names = direction === "apply" ? entry.after : entry.before;
    for (const key of ["firstName", "lastName"]) expected[key] = { stringValue: spec.trimmed ? names[key].stringValue.trim().slice(0, 80) : names[key].stringValue };
    const actual = entryAt(current.get(spec.name), spec);
    if (!actual || planner.hash(actual) !== planner.hash(expected)) throw new Error("Projection not converged");
    checked++;
  }
  return { documentsRead: current.size, entriesChecked: checked };
}
async function napConnection(token) {
  const response = await fetch("https://secretmanager.googleapis.com/v1/projects/livepalmes/secrets/LIVEPALMES_NAP_PASSWORD/versions/latest:access", {
    method: "GET", redirect: "error", headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(30000)
  });
  const result = await boundedJson(response);
  const password = Buffer.from(result.payload.data, "base64").toString("utf8");
  const { napPoolOptions } = require("../functions/nap-mysql");
  const { connectionLimit, waitForConnections, queueLimit, ...options } = napPoolOptions(password);
  const connection = await require("../functions/node_modules/mysql2/promise").createConnection(options);
  await connection.query("SET SESSION TRANSACTION READ ONLY");
  return connection;
}
async function napRows(connection, names) {
  if (!names.length || names.length > 10 || new Set(names).size !== names.length) throw new Error("SQL read budget invalid");
  const ids = names.map(name => name.split("/").at(-1));
  const [rows] = await connection.execute({ sql: `SELECT firebase_uid, club_id, email, status, competition_notifications, source_version FROM livepalmes_club_account_emails WHERE firebase_uid IN (${ids.map(() => "?").join(",")}) LIMIT 10`, timeout: 10000 }, ids);
  if (rows.length !== names.length) throw new Error("SQL projection missing");
  return new Map(rows.map(row => [row.firebase_uid, row]));
}
function microseconds(timestamp) {
  const match = /^(.*T\d\d:\d\d:\d\d)(?:\.(\d{1,9}))?Z$/.exec(timestamp);
  if (!match) throw new Error("Invalid source timestamp");
  return BigInt(Date.parse(`${match[1]}Z`)) * 1000n + BigInt((match[2] || "").padEnd(9, "0").slice(0, 6));
}
async function verifyNap(connection, entries, baseline, receipts) {
  const rows = await napRows(connection, entries.map(entry => entry.name));
  for (const entry of entries) {
    const uid = entry.name.split("/").at(-1), row = rows.get(uid), before = baseline.get(uid), receipt = receipts.find(receipt => receipt.name === entry.name);
    if (!row || !before || BigInt(row.source_version) < microseconds(receipt.afterVersion)) throw new Error("SQL version not converged");
    const { source_version: ignoredAfter, ...afterFields } = row, { source_version: ignoredBefore, ...beforeFields } = before;
    if (planner.hash(afterFields) !== planner.hash(beforeFields)) throw new Error("SQL coordinates changed");
  }
}

function zipMembers(bytes) {
  const files = new Map();
  let end = bytes.length - 22;
  for (; end >= Math.max(0, bytes.length - 65557); end--) if (bytes.readUInt32LE(end) === 0x06054b50) break;
  if (end < 0) throw new Error("ZIP directory missing");
  let cursor = bytes.readUInt32LE(end + 16);
  const count = bytes.readUInt16LE(end + 10);
  if (count > 2000) throw new Error("Source archive too large");
  for (let index = 0; index < count; index++) {
    if (bytes.readUInt32LE(cursor) !== 0x02014b50) throw new Error("Invalid ZIP entry");
    const method = bytes.readUInt16LE(cursor + 10), length = bytes.readUInt32LE(cursor + 20), size = bytes.readUInt32LE(cursor + 24);
    const nameLength = bytes.readUInt16LE(cursor + 28), extra = bytes.readUInt16LE(cursor + 30), comment = bytes.readUInt16LE(cursor + 32), offset = bytes.readUInt32LE(cursor + 42);
    const name = bytes.subarray(cursor + 46, cursor + 46 + nameLength).toString("utf8");
    if (/^(?:backend-index|index|server-mail-service|server-access-service|server-directory-service|nap-club-account-emails)\.js$/.test(name)) {
      if (size > 5 * 1024 * 1024 || bytes.readUInt32LE(offset) !== 0x04034b50) throw new Error("Source member invalid");
      const start = offset + 30 + bytes.readUInt16LE(offset + 26) + bytes.readUInt16LE(offset + 28), packed = bytes.subarray(start, start + length);
      const plain = method === 0 ? packed : method === 8 ? inflateRawSync(packed, { maxOutputLength: 5 * 1024 * 1024 }) : null;
      if (!plain || plain.length !== size) throw new Error("Source decompression invalid");
      files.set(name, plain.toString("utf8").replace(/\r\n/g, "\n"));
    }
    cursor += 46 + nameLength + extra + comment;
  }
  return files;
}
async function sourceProof(trigger, token) {
  if (!trigger.present || trigger.state !== "ACTIVE" || trigger.eventType !== "google.cloud.firestore.document.v1.written" || !trigger.filters.some(filter => filter.attribute === "document" && filter.value === "users/{uid}") || !trigger.filters.some(filter => filter.attribute === "database" && filter.value === "(default)")) throw new Error("Trigger scope changed");
  const source = trigger.source.storageSource;
  if (source.bucket !== "gcf-v2-sources-718081132564-europe-west1" || source.object !== `${trigger.name}/function-source.zip` || !/^\d+$/.test(source.generation)) throw new Error("Unexpected deployed source");
  const url = `https://storage.googleapis.com/download/storage/v1/b/${source.bucket}/o/${encodeURIComponent(source.object)}?alt=media&generation=${source.generation}`;
  const response = await fetch(url, { method: "GET", redirect: "error", headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`HTTP-${response.status}`);
  const chunks = []; let length = 0;
  for await (const chunk of response.body) { length += chunk.length; if (length > 32 * 1024 * 1024) throw new Error("Source download budget exceeded"); chunks.push(chunk); }
  const files = zipMembers(Buffer.concat(chunks));
  const modules = trigger.name === "syncNapClubAccountEmails" ? ["nap-club-account-emails.js"] : ["server-mail-service.js", "server-directory-service.js", "server-access-service.js"];
  const unrelatedDifferences = [];
  function withoutUnrelatedAccessFunctions(text) {
    const tree = acorn.parse(text, { ecmaVersion: "latest" }), found = [];
    function visit(node) {
      if (!node || typeof node !== "object") return;
      if (node.type === "FunctionDeclaration" && ["engagementClubAccessContext", "userByEmailOrCreate"].includes(node.id?.name)) { found.push(node); return; }
      for (const value of Object.values(node)) if (Array.isArray(value)) value.forEach(visit); else if (value && typeof value === "object") visit(value);
    }
    visit(tree);
    if (found.length !== 2) throw new Error("Independent function boundary changed");
    for (const node of found.sort((a, b) => b.start - a.start)) text = text.slice(0, node.start) + `function ${node.id.name}(){}` + text.slice(node.end);
    return text;
  }
  for (const file of modules) {
    const deployed = files.get(file), local = fs.readFileSync(path.join(__dirname, "../functions", file), "utf8").replace(/\r\n/g, "\n");
    if (deployed === local) continue;
    // Reviewed diff: these two account/club callable paths are never called by
    // the users trigger. Every other byte in the helper module must match.
    if (file !== "server-access-service.js" || withoutUnrelatedAccessFunctions(deployed) !== withoutUnrelatedAccessFunctions(local)) throw new Error("Deployed helper differs from reviewed source");
    unrelatedDifferences.push("engagementClubAccessContext", "userByEmailOrCreate");
  }
  const body = files.get("backend-index.js") || files.get("index.js"), ast = acorn.parse(body, { ecmaVersion: "latest" });
  function handler(tree, text) {
    const node = tree.body.find(node => node.type === "ExpressionStatement" && node.expression?.left?.object?.name === "exports" && node.expression.left.property?.name === trigger.name);
    if (!node) throw new Error("Trigger handler missing");
    return text.slice(node.start, node.end).replace(/\r\n/g, "\n");
  }
  if (handler(ast, body) !== handler(indexAst, indexSource)) throw new Error("Deployed trigger differs from reviewed source");
  return { name: trigger.name, revision: trigger.revision, archiveBytes: length, reviewedModules: modules, unrelatedDifferences, handlerHash: sha(handler(ast, body)), matched: true };
}
module.exports = { projectionSpecs, projectionBaseline, verifyProjections, groupedRead, napConnection, napRows, verifyNap, microseconds, sourceProof, decode, zipMembers };
