"use strict";
const planner = require("./user-name-correction-plan");

function proposedBatch(plan, entries, current, direction = "apply", receipts = []) {
  if (!Array.isArray(entries) || !entries.length || entries.length > 10 || new Set(entries.map(e => e.name)).size !== entries.length) throw new Error("Invalid batch");
  const writes = entries.map(entry => {
    const receipt = receipts.find(row => row.name === entry.name) || null;
    const proposal = planner.proposedWrite(plan, entry.name, current.get(entry.name), receipt, direction);
    if (proposal.status !== "proposed-only") throw new Error("Concurrent or previously processed profile");
    return proposal.write;
  });
  if (writes.some(write => Object.keys(write.update.fields).sort().join(",") !== "firstName,lastName" ||
    write.updateMask.fieldPaths.join(",") !== "firstName,lastName" || !write.currentDocument.updateTime)) throw new Error("Write mask invalid");
  return writes;
}

async function runBatch({ plan, entries, originals, read, commit, persist, observe, direction = "apply", receipts = [] }) {
  const current = await read(entries.map(entry => entry.name));
  const writes = proposedBatch(plan, entries, current, direction, receipts);
  const intent = { planDigest: plan.digest, direction, names: entries.map(entry => entry.name), writes };
  await persist("intent", intent); // Must succeed durably BEFORE sending a write.
  let response;
  try {
    response = await commit(writes);
  } catch {
    await persist("uncertain", { planDigest: plan.digest, direction, names: intent.names });
    throw new Error("Commit uncertain or rejected; never retry blindly");
  }
  if (!Array.isArray(response.writeResults) || response.writeResults.length !== entries.length ||
      response.writeResults.some(result => typeof result.updateTime !== "string" || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,9})?Z$/.test(result.updateTime))) {
    await persist("uncertain", { planDigest: plan.digest, direction, names: intent.names });
    throw new Error("Incomplete commit response");
  }
  const saved = entries.map((entry, index) => ({ name: entry.name, planDigest: plan.digest, afterVersion: response.writeResults[index].updateTime }));
  await persist("receipt", { planDigest: plan.digest, direction, saved, commitTime: response.commitTime });
  const after = await read(entries.map(entry => entry.name));
  for (const entry of entries) {
    const doc = after.get(entry.name), original = originals.get(entry.name);
    const expected = { ...original.fields, ...(direction === "apply" ? entry.after : entry.before) };
    if (!doc || doc.updateTime !== saved.find(row => row.name === entry.name).afterVersion || planner.hash(doc.fields) !== planner.hash(expected)) throw new Error("Post-write verification conflict");
  }
  await observe(entries, saved, direction);
  await persist("verified", { planDigest: plan.digest, direction, saved });
  return saved;
}

module.exports = { proposedBatch, runBatch };
