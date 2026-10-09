"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs");
const {notMerged}=require("../functions/nap-swimmer-merge-state"),{person}=require("../functions/nap-portal-swimmers");
assert.throws(()=>notMerged("n;DROP"),TypeError);
assert.match(notMerged(),/swimmer_id=nageurs.id/);
const merged=person({id:12,nom:"TEST",prenom:"Personne",date:"1980-01-01",sexe:"M",club:"106",actif:0,number:"A-05-000001",merged_into_id:13});
assert.equal(merged.status,"merged");assert.equal(merged.active,false);assert.equal(merged.mergedIntoId,"13");
for(const name of ["nap-swimmer-activity","nap-license-correction","nap-license-control","nap-swimmer-recovery","nap-swimmer-creation","nap-portal-swimmers","nap-portal-swimmer-change","nap-swimmer-entry-statements","nap-relay-composition-statements","nap-relay-resolution","nap-import-preview","nap-import-write"]){
  const source=fs.readFileSync(require.resolve(`../functions/${name}`),"utf8");assert.ok(source.includes("notMerged()")||source.includes('notMerged("n")'),`${name} must exclude merged source`);
}
const importWriter=fs.readFileSync(require.resolve("../functions/nap-import-write"),"utf8");
assert.match(importWriter,/LOCK TABLES[^"\n]+livepalmes_swimmer_merges READ/,"native merge marker remains locked with import identities");
console.log("Merged swimmer state: target marker, inactive DTO and indexed guards on identity, licence, recovery, status and creation passed.");
