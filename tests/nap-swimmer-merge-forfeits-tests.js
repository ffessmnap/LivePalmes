"use strict";
const assert=require("node:assert/strict"),guard=require("../functions/nap-swimmer-merge-forfeits");
const snapshots={nageursengager:[{id:1197,nageur:12,compet:199}],engagements:[{id:1400,engagement:1197}]};
const original=[{id:86,compet:199,engagement:919,forfait:1}];
assert.match(guard.SQL,/FORCE INDEX \(PRIMARY\) ORDER BY id LIMIT 501$/);
assert.equal(guard.LIMIT,500);
const policy=guard.policy(original,snapshots);
assert.deepEqual(policy,{version:1,rows:original});assert.notEqual(policy.rows[0],original[0]);
assert.deepEqual(guard.validate(policy,snapshots),policy);
for(const engagement of [1197,1400])for(const compet of [199,999,null])for(const forfait of [0,1]){
  assert.throws(()=>guard.policy([{id:86,compet,engagement,forfait}],snapshots),/reference une inscription ou une course/);
}
assert.deepEqual(guard.policy([{id:86,compet:null,engagement:null,forfait:1}],snapshots).rows,[{id:86,compet:null,engagement:null,forfait:1}]);
assert.equal(guard.policy(Array.from({length:500},(_,i)=>({id:i+1,compet:199,engagement:919,forfait:1})),snapshots).rows.length,500);
assert.throws(()=>guard.policy(Array.from({length:501},(_,i)=>({id:i+1,compet:199,engagement:919,forfait:1})),snapshots),/Trop de forfaits/);
assert.throws(()=>guard.policy([original[0],original[0]],snapshots),/incoherent/);
assert.throws(()=>guard.policy([{id:86,compet:199,engagement:919}],snapshots),/incomplet/);
assert.throws(()=>guard.validate({...policy,version:2},snapshots),/invalide/);
assert.throws(()=>guard.validate({...policy,rows:[{...original[0],engagement:1197}]},snapshots),/reference une inscription/);
assert.deepEqual(original,[{id:86,compet:199,engagement:919,forfait:1}]);
console.log("Merge forfeits: bounded full primary-key inventory, unrelated/orphan preservation, both historic reference interpretations, cross-competition collisions and saved-policy validation passed offline.");
