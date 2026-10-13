"use strict";
const assert = require("node:assert/strict");
const cp = require("node:child_process");
const acorn = require("./firestore-rules/node_modules/acorn");
const clean = value => JSON.parse(JSON.stringify(value));
async function prove({ root, base, candidate, source, loader }) {
  assert.equal(base, "ef96caca97f70554ee1f2c2b950cebeb5130e85e");
  assert.equal(candidate, "ac78b50759ca209cddaa15d374eb5e01dd926268");
  const changed = cp.execFileSync("git", ["diff", "--name-only", base, candidate, "--", "functions"], { cwd: root, encoding: "utf8" }).trim().split("\n").sort();
  assert.deepEqual(changed, ["functions/index.js", "functions/nap-competition-documents.js", "functions/nap-document-options-contract.js"]);
  // Every index change is the already absent Records export, its two exclusive
  // helpers and their unused import. No public-reader or notification adapter changes.
  const removed = new Set(["publishPublicRecordsSnapshot", "publishPublicRecordsManifest"]);
  function normalizedIndex(commit, retire) {
    const ast = acorn.parse(source(commit, "functions/index.js"), { ecmaVersion: "latest" });
    if (retire) ast.body = ast.body.filter(node => {
      if (node.type === "FunctionDeclaration" && removed.has(node.id.name)) return false;
      if (node.type === "ExpressionStatement" && node.expression.type === "AssignmentExpression" &&
          node.expression.left.object?.name === "exports" && node.expression.left.property?.name === "syncPublicRecordsData") return false;
      if (node.type === "VariableDeclaration" && node.declarations.length === 1 &&
          node.declarations[0].init?.callee?.name === "require" && node.declarations[0].init.arguments[0]?.value === "./public-records-data") return false;
      return true;
    });
    return JSON.stringify(ast, (key, value) => ["start", "end", "raw"].includes(key) ? undefined : value);
  }
  assert.equal(normalizedIndex(base, true), normalizedIndex(candidate, false));
  const current = loader(candidate), before = loader(base);
  const docs = current("functions/nap-competition-documents.js");
  const oldDocs = before("functions/nap-competition-documents.js");
  assert.deepEqual(clean(docs.FIELDS), clean(oldDocs.FIELDS));
  assert.deepEqual(clean(docs.OPTIONS), clean(oldDocs.OPTIONS));
  assert.ok(!docs.OPTIONS.includes("featured_rank"));
  const contract = current("functions/nap-document-options-contract.js");
  function schema(extended) {
    const columns = clean(contract.FILE_SCHEMA).map(([COLUMN_NAME, COLUMN_TYPE]) => ({ COLUMN_NAME, COLUMN_TYPE,
      IS_NULLABLE: extended && contract.NULLABLE_FILE_FIELDS.has(COLUMN_NAME) ? "YES" : "NO", COLUMN_DEFAULT: null, EXTRA: "" }));
    const indexes = [{ INDEX_NAME: "PRIMARY", COLUMN_NAME: "document_id", SEQ_IN_INDEX: 1, NON_UNIQUE: 0, SUB_PART: null }];
    if (extended) {
      columns.push({ COLUMN_NAME: "featured_rank", COLUMN_TYPE: "tinyint unsigned", IS_NULLABLE: "YES", COLUMN_DEFAULT: null, EXTRA: "" });
      indexes.unshift({ INDEX_NAME: "livepalmes_document_featured_rank", COLUMN_NAME: "featured_rank", SEQ_IN_INDEX: 1, NON_UNIQUE: 0, SUB_PART: null });
    }
    return { columns, indexes };
  }
  for (const extended of [false, true]) {
    const state = schema(extended);
    assert.equal(contract.documentOptionsContract(state.columns, state.indexes), extended ? "featured" : "original");
    for (const change of [s => s.columns.pop(), s => s.indexes.pop(), s => s.columns[0].IS_NULLABLE = "YES",
      s => s.columns.push({ ...s.columns[0], COLUMN_NAME: "unknown" }), s => s.indexes[0].NON_UNIQUE = 1]) {
      const broken = schema(extended); change(broken);
      assert.throws(() => contract.documentOptionsContract(broken.columns, broken.indexes), /incompatible/);
    }
  }
  const partial = schema(true); partial.columns = schema(false).columns.concat(partial.columns.at(-1));
  assert.throws(() => contract.documentOptionsContract(partial.columns, schema(false).indexes), /incompatible/);
  const native = { id: 42, name: "Document fixture", type: 7, location: "/documents/fixture.pdf", date: "2026-10-13", public: "Y", competition: 5140 };
  const extra = { document_id: 42, category: "results", file_name: "fixture.pdf", storage_path: "fixture.pdf", content_type: "application/pdf", size: 12,
    version: 1, created_at: "2026-10-13", updated_at: "2026-10-13", created_by: "fixture", updated_by: "fixture" };
  const nullable = { ...extra }; for (const key of contract.NULLABLE_FILE_FIELDS) nullable[key] = null;
  for (const row of [native, { ...native, ...extra }, { ...native, ...nullable, featured_rank: 1 }, { ...native, ...extra, featured_rank: 6 }]) {
    const queries = [];
    const pool = { execute: async (query, values) => { assert.ok(query.sql.startsWith("SELECT ")); assert.match(query.sql, /LIMIT 101$/);
      assert.equal(query.timeout, 10000); assert.deepEqual([...values], [5140]); queries.push(query.sql); return [[row]]; } };
    const oldView = await oldDocs.readDocuments(pool, 5140), newView = await docs.readDocuments(pool, 5140);
    assert.equal(queries.length, 2); assert.equal(queries[0], queries[1]);
    assert.doesNotMatch(queries[0], /featured_rank/); assert.deepEqual(clean(newView), clean(oldView));
    assert.deepEqual(clean(docs.item(row, { includeUploader: true })), clean(oldDocs.item(row, { includeUploader: true })));
    assert.equal(docs.item({ ...row, featured_rank: 1 }).napFingerprint, docs.item({ ...row, featured_rank: 6 }).napFingerprint);
  }
  await assert.rejects(docs.readDocuments({ execute: async () => [Array(101).fill(native)] }, 5140), /volumineux/);
}
module.exports = { prove };
