"use strict";
const p = require("./club-merge-plan");
function inspect(plan,sql) {
  const states = new Map();
  for (const table of p.tables) {
    const pk = table === "clubs" ? ["num_club"] : p.relations.find(r => r[0] === table)[2];
    const rows = sql[table];
    if (!Array.isArray(rows)) p.fail("MISSING_TABLE_STATE");
    const current = new Map(rows.map(row => [p.key(row,pk),row]));
    if (current.size !== rows.length) p.fail("DUPLICATE_CURRENT_KEY");
    for (const g of plan.guards.filter(g => g.table === table)) {
      const k = p.key(g.row,pk);
      if (!p.equal(current.get(k),g.row)) p.fail("TARGET_OR_UNRELATED_ROW_DRIFT");
      current.delete(k);
    }
    for (const op of plan.changes.filter(op => op.table === table)) {
      const beforeKey = p.key(op.before,pk), afterKey = op.after && p.key(op.after,pk);
      const before = current.get(beforeKey), after = afterKey && current.get(afterKey);
      let state;
      if (p.equal(before,op.before) && (afterKey === beforeKey || !after)) { state="before"; current.delete(beforeKey); }
      else if (op.after && p.equal(after,op.after) && (afterKey === beforeKey || !before)) { state="after"; current.delete(afterKey); }
      else if (!op.after && !before) state="after";
      else p.fail("ROW_DRIFT_OR_KEY_REUSED");
      states.set(op,state);
    }
    if (current.size) p.fail("NEW_REFERENCE_OR_UNEXPECTED_ROW");
  }
  return states;
}
function documents(plan,current) {
  if (current.length !== plan.docs.length) p.fail("FIRESTORE_DOCUMENT_SET_CHANGED");
  for (const original of plan.docs) {
    const doc = current.find(d => d.path === original.path), change = plan.firestore.find(o => o.path === original.path);
    if (!doc || !p.equal(doc.fields,original.fields) && !(change && p.equal(doc.fields,change.after))) p.fail("FIRESTORE_PROFILE_DRIFT");
  }
}
function gate(plan,evidence,direction,now=Date.now()) {
  if (evidence?.operation !== plan.operation || evidence?.planDigest !== plan.digest || evidence?.direction !== direction || !evidence?.approval?.quote || !evidence?.approval?.context) p.fail("EXPLICIT_EXECUTION_APPROVAL_REQUIRED");
  const window = evidence.maintenance;
  if (!window?.operator || !window?.proof || Date.parse(window.startsAt) > now || Date.parse(window.endsAt) <= now || !Number.isFinite(Date.parse(window.startsAt)) || Date.parse(window.endsAt)-Date.parse(window.startsAt) > 15*60*1000) p.fail("ACTIVE_EXCLUSIVE_WINDOW_REQUIRED");
  // This is an operator-reviewed evidence reference, NOT a claim that an
  // arbitrary JSON file can prove a deployed Function is safe.
  if (!/^[a-f0-9]{40}$/.test(evidence.productionCommit || "") || !/^https:\/\/github\.com\/ffessmnap\/LivePalmes\/actions\/runs\/\d+$/.test(evidence.projectionReplayProof || "") || !evidence.projectionReview) p.fail("ALL_PROJECTION_REPLAY_PROOFS_REQUIRED");
}
function safety(plan,current) {
  if (!p.equal(plan.meta,current.meta) || !p.equal(plan.safety,current.safety)) p.fail("SCHEMA_IMPORT_OR_RESERVATION_DRIFT");
  inspect(plan,current.sql); documents(plan,current.docs);
}
function verifyProjection(plan,current,club) {
  const original = plan.projection.sql, found = current.projection.sql;
  if (original.length !== found.length) p.fail("NAP_ACCOUNT_SET_CHANGED");
  const uid = plan.firestore.find(d => d.path.startsWith("users/")).path.slice(6);
  const business = row => Object.fromEntries(Object.entries(row).filter(([f]) => !["source_version","synchronized_at"].includes(f)));
  for (const before of original) {
    const after = found.find(r => r.firebase_uid === before.firebase_uid), expected = business(before);
    if (before.firebase_uid === uid) expected.club_id = club;
    if (!after || !p.equal(business(after),expected)) p.fail("NAP_ACCOUNT_PROJECTION_NOT_CONVERGED");
  }
  const stamp = current.docs.find(d => d.path === "users/"+uid)?.updateTime;
  const match = /^(\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d)(?:\.(\d{1,9}))?Z$/.exec(stamp || "");
  if (!match) p.fail("PROFILE_VERSION_MISSING");
  const version = BigInt(Date.parse(match[1]+"Z"))*1000n+BigInt((match[2] || "").padEnd(6,"0").slice(0,6));
  if (String(found.find(r => r.firebase_uid === uid)?.source_version) !== String(version)) p.fail("NAP_PROJECTION_VERSION_NOT_CURRENT");
}
async function run({plan,sql,firestore,capture,persist,evidence,direction="apply",checkGate=gate}) {
  p.validate(plan);
  if (!["apply","restore"].includes(direction)) p.fail("INVALID_DIRECTION");
  checkGate(plan,evidence,direction);
  // Inspect the entire touched set before ANY write, including before restore.
  safety(plan,await capture());
  await persist({phase:"start",planDigest:plan.digest,direction});
  const goal = direction === "restore" ? "before" : "after";
  async function native(ops,phase) {
    checkGate(plan,evidence,direction);
    await sql.locked(async () => {
      // Never await Firestore/the projection worker under LOCK TABLES.
      const current = await sql.rows(plan.meta,{includeProjection:false});
      if (!p.equal(await sql.metadata(),plan.meta) || !p.equal(await sql.imports(current),plan.safety.imports)) p.fail("LOCKED_SCHEMA_OR_IMPORT_DRIFT");
      const states = inspect(plan,current);
      if (phase === "delete-sources" && plan.changes.some(op => op.after && states.get(op) !== "after")) p.fail("SOURCE_REFERENCES_REMAIN");
      for (const op of ops) {
        checkGate(plan,evidence,direction);
        if (states.get(op) === goal) continue;
        await persist({phase:"intent",stage:phase,planDigest:plan.digest,direction,opDigest:p.digest(op)});
        await sql.mutate(op,direction);
        await persist({phase:"receipt",stage:phase,planDigest:plan.digest,direction,opDigest:p.digest(op)});
      }
      const verified = inspect(plan,await sql.rows(plan.meta,{includeProjection:false}));
      if (ops.some(op => verified.get(op) !== goal)) p.fail("SQL_STAGE_NOT_VERIFIED");
    });
  }
  const deletes = plan.changes.filter(o => !o.after), transfers = plan.changes.filter(o => o.after);
  if (direction === "restore") await native(deletes,"recreate-sources");
  await native(transfers,"references");
  // Native locks released before atomically updating the Corbie profile, its
  // explicit grant and historical request. Both other accounts are verified.
  checkGate(plan,evidence,direction);
  safety(plan,await capture());
  await persist({phase:"firestore-intent",planDigest:plan.digest,direction});
  await firestore.commit(plan,direction);
  await persist({phase:"firestore-committed",planDigest:plan.digest,direction});
  const club = direction === "restore" ? "518" : "126";
  await firestore.projections(plan,club);
  // No busy retry, global rebuild, manual copying of snapshots or SMTP call.
  // If a worker has not converged, stop and resume this same backup later.
  const fresh = await capture(); safety(plan,fresh);
  verifyProjection(plan,fresh,club);
  for (const op of plan.firestore) if (!p.equal(fresh.docs.find(d => d.path === op.path)?.fields,direction === "restore" ? op.before : op.after)) p.fail("FIRESTORE_REVERTED_BEFORE_DELETE");
  if (direction === "apply") {
    await persist({phase:"delete-gate-verified",planDigest:plan.digest,direction});
    await native(deletes,"delete-sources");
  }
  const final = await capture(); safety(plan,final);
  verifyProjection(plan,final,club);
  await firestore.projections(plan,club);
  const states = inspect(plan,final.sql);
  if ([...states.values()].some(s => s !== goal)) p.fail("FINAL_STATE_NOT_VERIFIED");
  for (const doc of plan.docs) {
    const op = plan.firestore.find(o => o.path === doc.path), expected = op && direction === "apply" ? op.after : doc.fields;
    if (!p.equal(final.docs.find(d => d.path === doc.path)?.fields,expected)) p.fail("FINAL_FIRESTORE_STATE_NOT_VERIFIED");
  }
  checkGate(plan,evidence,direction);
  await persist({phase:"complete",planDigest:plan.digest,direction});
  return {verified:true,direction,sourceClubs:14,targetClubs:12,rolesPreserved:true};
}
module.exports = {inspect,documents,safety,gate,verifyProjection,run};
