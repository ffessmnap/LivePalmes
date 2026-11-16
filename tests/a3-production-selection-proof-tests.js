"use strict";
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const helper=require('../tools/a3-production-selection-proof'),shared=require('../tools/release-test-function-fingerprints');
const catalogue=JSON.parse(fs.readFileSync(path.join(root,'tools/history-source-provenance.json'),'utf8'));
const contract=JSON.parse(fs.readFileSync(path.join(root,'.github/releases/evidence/20261116-production-public-access-contract.json'),'utf8'));
const old=JSON.parse(fs.readFileSync(path.join(root,'.github/releases/evidence/20261115-production-public-privacy-contract.json'),'utf8'));
const origins=old.origins.map(r=>({name:r.name,commit:r.name.endsWith('/readNapPublicSwimmer')?contract.productionCommit:r.commit}));
const candidate=shared.snapshot(root,contract.candidate,{production:true});
const baseline=shared.snapshot(root,catalogue.baselines[contract.productionCommit].commit,{production:true});
const run=(c=candidate,b=baseline,rows=origins,data=catalogue)=>helper.qualify(c,b,rows,data,contract.productionCommit);
const proof=run();
assert.deepEqual(proof.selected,contract.selected);
assert.equal(proof.rawLegacyChanged.length,119);
assert.deepEqual(proof.counterfactualSelected,proof.selected);
assert.deepEqual(proof.protectionConsumers,['resolveEngagementAccessRequest','submitEngagementAccessRequest']);
for(const addition of ['\nglobalThis.a3Fixture=1;','\nconst bad=unknownApplicationCall();','\nclass Eager { static value = unknownApplicationCall(); }', '\nconst bad=require(dynamicName);']) {
  const c=structuredClone(candidate);c.files['functions/portal-access-protection.js'].source+=addition;
  assert.throws(()=>run(c),/Unqualified|Non-isolable|Import dynamique|dep/);
}
assert.equal(globalThis.a3Fixture,undefined);
const corrupted=structuredClone(catalogue);
const retained=origins.find(r=>r.name.endsWith('/acknowledgeEngagementQualificationAlert'));
corrupted.commits[retained.commit].legacy.acknowledgeEngagementQualificationAlert='0'.repeat(64);
assert.throws(()=>run(candidate,baseline,origins,corrupted),/sealed|disagrees/);
const unknown=structuredClone(origins);unknown[0].commit='a'.repeat(40);
assert.throws(()=>run(candidate,baseline,unknown),/Unknown historical/);
assert.throws(()=>run(candidate,baseline,origins.concat(origins[0])),/Duplicate origin/);
console.log('A3 static proof: real candidate and negative side-effect/provenance fixtures passed.');
