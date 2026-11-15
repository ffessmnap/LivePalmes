"use strict";
require("./helpers/offline-network");
const assert = require("node:assert/strict"), fs = require("node:fs"), vm = require("node:vm");
const { publicSportingPayload } = require("../functions/nap-public-privacy");
const secret = "fictitious-server-key-for-offline-tests";
const birthday = "2004-06-17", identity = "FICTIF|PAUL|" + birthday;
const profile = { id: "1", name: "Paul FICTIF", firstName: "Paul", lastName: "FICTIF", birthDate: birthday, sex: "M", identityKey: identity,
  rows: [{ id: "performance-1", swimmerId: "1", swimmerIdentityKey: identity, birthDate: birthday, date: "2025-05-01", category: "S", timeValue: 2000 }] };
const records = [birthday, "2004-06-18", "2004-01-01", "2003-01-01", "invalid", "17/06/2004", ""].map(birthDate => ({ swimmer: "Paul FICTIF", birthDate, sex: "M", course: "50SF" }));
const source = { swimmer: profile, data: { records, franceRecords: records }, metadata: { birth_date: birthday, dateNaissance: birthday },
  swimmers: [profile], aliases: ["OLD|" + birthday], searchText: identity, date: "2025-05-01" };
const before = JSON.stringify(source), result = publicSportingPayload(source, secret);
assert.equal(JSON.stringify(source), before, "Private reader values are never mutated");
assert.equal(result.swimmer.birthDate, "2004");
assert.equal(result.swimmer.birthYear, "2004");
assert.equal(result.swimmer.rows[0].birthDate, "2004");
assert.equal(result.metadata.birth_date, "2004");
assert.equal(result.metadata.dateNaissance, "2004");
assert.equal(result.date, "2025-05-01", "Competition dates remain complete");
assert.equal(result.swimmer.rows[0].category, "S");
assert.equal(result.swimmer.rows[0].timeValue, 2000);
assert.equal(result.swimmer.rows[0].swimmerIdentityKey, result.swimmer.identityKey);
assert.equal(result.swimmer.identityKey, result.swimmers[0].identityKey);
assert.match(result.swimmer.identityKey, /^public-v1:[a-f0-9]{64}$/);
assert.equal(JSON.stringify(result).includes(birthday), false);
assert.equal(JSON.stringify(result).includes(identity), false);
assert.equal(JSON.stringify(result).includes(secret), false);
assert.equal(Object.hasOwn(result, "searchText"), false);
assert.notEqual(publicSportingPayload(source, "another-fictitious-key").swimmer.identityKey, result.swimmer.identityKey);
assert.throws(() => publicSportingPayload(source, ""), /indisponible/);
assert.deepEqual(publicSportingPayload({ swimmer: null, rows: [], birthDate: "" }, secret), { swimmer: null, rows: [], birthDate: "" });

const client = fs.readFileSync("performances/public/swimmer.js", "utf8"), context = {};
vm.createContext(context);
const acorn = require("./firestore-rules/node_modules/acorn");
const clientAst = acorn.parse(client, { ecmaVersion: "latest" });
const clientFunctions = clientAst.body[0].expression.callee.body.body;
for (const name of ["normalize", "displayName", "isIndividualRecord", "swimmerMatchesRecord", "swimmerBirthSummary"]) {
  const node = clientFunctions.find(node => node.type === "FunctionDeclaration" && node.id.name === name);
  assert.ok(node, name); vm.runInContext(client.slice(node.start, node.end), context);
}
assert.equal(context.swimmerBirthSummary(profile), "Année de naissance : 2004", "Even an old browser fixture must display only the year");
assert.equal(context.swimmerBirthSummary(result.swimmer), "Année de naissance : 2004");
for (let index = 0; index < records.length; index++) {
  const expected = context.swimmerMatchesRecord(profile, records[index]);
  assert.equal(context.swimmerMatchesRecord(result.swimmer, result.data.records[index]), expected, "Existing exact/placeholder record matching is preserved");
}
const homonym = { ...profile, birthDate: "2004-06-18" };
const reducedHomonym = publicSportingPayload({ swimmer: homonym }, secret).swimmer;
assert.equal(context.swimmerMatchesRecord(reducedHomonym, result.data.records[0]), false, "Same name and year do not merge different birthdays");

// Exercise the actual public HTTP callback, rather than only its projection.
const backend = fs.readFileSync("functions/index.js", "utf8");
const ast = acorn.parse(backend, { ecmaVersion: "latest" });
let declaration;
function findDeclaration(node) {
  if (!node || typeof node !== "object") return;
  if (node.type === "ExpressionStatement" && node.expression.type === "AssignmentExpression"
    && node.expression.left.object?.name === "exports" && node.expression.left.property?.name === "readNapPublicSwimmer") declaration = node;
  for (const value of Object.values(node)) if (Array.isArray(value)) value.forEach(findDeclaration); else if (value && typeof value === "object") findDeclaration(value);
}
findDeclaration(ast);
assert.ok(declaration, "Public HTTP declaration remains present");
const callback = declaration.expression.right.arguments[1];
const routes = ["search", "swimmer", "top", "records", "competition-results", "competition"];
const readers = new Proxy({}, { get: () => async () => source });
const handler = vm.runInNewContext(backend.slice(callback.start, callback.end), {
  napPool: {}, napPassword: { value: () => secret }, ENVIRONMENT: { name: "test" },
  require: id => id === "./nap-public-privacy" ? require("../functions/nap-public-privacy") : readers
});
(async () => {
  for (const action of routes) {
    let sent;
    const response = { set() {}, json(value) { sent = value; }, status(code) { throw Error("Unexpected HTTP " + code); } };
    await handler({ method: "GET", query: { action, id: "1", q: "Paul" }, path: "/" }, response);
    assert.equal(sent.swimmer.birthDate, "2004", action);
    assert.equal(JSON.stringify(sent).includes(birthday), false, action);
    assert.equal(sent.swimmer.rows[0].timeValue, 2000);
  }
  console.log("Public privacy: HTTP routes, year-only responses, opaque identities, unchanged private inputs and exact record matching verified offline.");
})().catch(error => { console.error(error); process.exitCode = 1; });
