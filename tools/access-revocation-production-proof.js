"use strict";
// Candidate-specific qualification using both unchanged fingerprint engines.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(process.argv[2]);
const legacy=require(path.join(root,'tools/release-function-fingerprints'));
const shared=require(path.join(root,'tools/release-test-function-fingerprints'));
const optimized=require(path.join(root,'tools/release-production-function-fingerprints'));
const {analyse}=require(path.join(root,'tools/a3-production-selection-proof'));
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const canonical=x=>JSON.stringify(x,Object.keys(x).sort());
const requireTrue=(v,m)=>{if(!v)throw Error(m);};
const input=JSON.parse(fs.readFileSync(0,'utf8'));
const old='81051966f784966e1bf2a8345c6382c76f5aebea',a32='b6531ad398de1470948bcce9a73c159d1849b5ad';
const c32path=path.join(root,'.github/releases/evidence/20261116-production-public-access-contract.json');
const c32raw=fs.readFileSync(c32path,'utf8').replace(/\r\n/g,'\n');
requireTrue(hash(c32raw)==='ff141d7692e9390ea70600e28e20095c9fb887e93aac9598cb19876b697c3375','A3.2 contract changed');
const c32=JSON.parse(c32raw);
const catalogue=JSON.parse(fs.readFileSync(path.join(root,'tools/history-source-provenance.json'),'utf8'));
const baseline=shared.snapshot(root,'c2c9880045dfdd13e52ffe9977d1293ae2e61a00',{production:true});
const previous=shared.snapshot(root,a32,{production:true});
const candidate=shared.snapshot(root,'43fbd5a9bb544199255de37dd239584f2c502d78',{production:true});
const moduleName='functions/portal-access-protection.js';
const b=analyse(baseline),raw=analyse(candidate),fast=optimized.analyse(candidate);
requireTrue(canonical(b.functions)===canonical(catalogue.commits[old].legacy),'Historical baseline not reproduced');
requireTrue([b,raw,fast].every(r=>r.mode==='dependency-closure'),'Non-isolable backend');
requireTrue(candidate.files[moduleName].sha===previous.files[moduleName].sha,'Inherited module changed');
const strict=legacy.moduleGraph(candidate.files).inspect(moduleName);
const numeric=legacy.moduleGraph(candidate.files,{testNumericConstants:true}).inspect(moduleName);
requireTrue(!strict.pure&&numeric.pure&&!numeric.externals.length&&JSON.stringify(numeric.files)===JSON.stringify([moduleName]),'Numeric-only initializer not qualified');
const normalized=snapshot=>analyse(snapshot,{...snapshot.files,[moduleName]:baseline.files[moduleName]});
const current=normalized(candidate),prior=normalized(previous);
requireTrue(hash(canonical(analyse(previous).functions))===c32.candidateLegacySha256&&hash(canonical(optimized.analyse(previous).functions))===c32.candidateOptimizedSha256,'A3.2 maps do not match immutable contract');
for(const commit of Object.keys(input.legacy)){
 const expected=commit===a32?analyse(previous).functions:catalogue.commits[commit]?.legacy;
 const oldFast=commit===a32?optimized.analyse(previous).functions:catalogue.commits[commit]?.['production-selection'];
 requireTrue(expected&&oldFast&&canonical(input.legacy[commit])===canonical(expected)&&canonical(input.optimized[commit])===canonical(oldFast),'Unsealed origin: '+commit);
}
const selected=[],counterSelected=[],rawChanged=[],reviews=[];
const names=new Set();
for(const row of input.origins){
 const n=row.name.split('/').at(-1),commit=row.commit;
 requireTrue(!names.has(n)&&row.state==='ACTIVE'&&row.revision&&input.legacy[commit]?.[n]&&input.optimized[commit]?.[n],'Invalid origin');names.add(n);
 const optimizedChanged=fast.functions[n]!==input.optimized[commit][n];
 const legacyChanged=raw.functions[n]!==input.legacy[commit][n];
 const oldNormalized=commit===a32?prior.functions[n]:input.legacy[commit][n];
 const counterChanged=current.functions[n]!==oldNormalized;
 if(optimizedChanged)selected.push(n);
 if(counterChanged)counterSelected.push(n);
 if(legacyChanged)rawChanged.push(n);
 requireTrue(optimizedChanged===counterChanged,'Independent comparison disagrees: '+n);
 if(!optimizedChanged)reviews.push({name:n,commit,revision:row.revision,legacyChanged,
   method:legacyChanged?'qualified-inherited-numeric-initializer':'literal-legacy-equivalence',
   legacyBefore:input.legacy[commit][n],legacyAfter:raw.functions[n],
   normalizedBefore:oldNormalized,normalizedAfter:current.functions[n],
   optimizedBefore:input.optimized[commit][n],optimizedAfter:fast.functions[n]});
}
const result={schema:1,kind:'a33-per-origin-static-exclusion-v1',inventoryCount:names.size,
 candidate:'43fbd5a9bb544199255de37dd239584f2c502d78',selected:selected.sort(),counterfactualSelected:counterSelected.sort(),
 rawLegacyChanged:rawChanged.sort(),retained:reviews.sort((a,b)=>a.name.localeCompare(b.name)),
 baselineReproducesSealedLegacy:true,inheritedModuleUnchanged:true,numericInitializerQualified:true,
 normalizedOrigin:a32,protectionBlobs:[baseline.files[moduleName].sha,candidate.files[moduleName].sha],
 candidateLegacySha256:hash(canonical(raw.functions)),candidateOptimizedSha256:hash(canonical(fast.functions))};
console.log(JSON.stringify(result));
