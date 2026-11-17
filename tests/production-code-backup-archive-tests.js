"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),os=require("node:os"),crypto=require("node:crypto");
const {spawnSync}=require("node:child_process"),archive=require("../tools/production-code-backup-archive"),probe=require("../tools/production-code-backup-key-check");
const vector=require("./fixtures/production-code-backup-v1-vector.json");
const sha="a".repeat(40),candidate="b".repeat(40),key=crypto.randomBytes(32);
const record={schema:2,keyId:"public-test-key",key:key.toString("base64")};key.fill(0);
const fingerprint=crypto.createHash("sha256").update(Buffer.from(record.key,"base64")).digest("hex");
const policy={schema:1,purpose:"production-code",environment:"production",secretName:"LIVEPALMES_CODE_BACKUP_KEY_V2",keyId:record.keyId,keyFingerprint:fingerprint};
const common={GITHUB_REPOSITORY:"ffessmnap/LivePalmes",GITHUB_REF:"refs/heads/main",GITHUB_EVENT_NAME:"workflow_dispatch",GITHUB_RUN_ATTEMPT:"1",GITHUB_SHA:sha,GITHUB_RUN_ID:"101"};
const publish={...common,GITHUB_WORKFLOW_REF:"ffessmnap/LivePalmes/.github/workflows/livepalmes-production-release.yml@refs/heads/main",RESUME:"0",CANDIDATE_SHA:candidate,LIVEPALMES_CODE_BACKUP_KEY_V2:JSON.stringify(record)};
const fixture={...common,GITHUB_WORKFLOW_REF:"ffessmnap/LivePalmes/.github/workflows/production-code-backup-key-check.yml@refs/heads/main",EXPECTED_COMMIT:sha,VERIFIED_MAIN_CI:"true",LIVEPALMES_CODE_BACKUP_KEY_V2:JSON.stringify(record)};
function qualification(){
 return {schema:1,keyId:record.keyId,keyFingerprint:fingerprint,
  source:{run:99,head:sha,artifact:1,digest:"sha256:"+"c".repeat(64),workflow:".github/workflows/production-code-backup-key-check.yml"},
  receipt:{keyId:record.keyId,keyFingerprint:fingerprint,syntheticCodeOnly:true,restoredExactly:true,keyMaterialExported:false,googleCredentialsRead:false,existingArchivesRead:false,businessDataRead:false,archiveRoundtripVerified:true,copyContextPreserved:true,legacyFixtureRecovered:true,originChainVerified:true,foreignSameCandidateRejected:true,
   context:{project:"livepalmes",repository:"ffessmnap/LivePalmes",kind:"production-code",candidate:sha,runId:99},codeHashes:archive.currentCodeHashes(),nodeVersion:process.version}};
}
const roundtrip=probe.archiveProbe(fixture,{policy});
assert(roundtrip.archiveRoundtripVerified&&roundtrip.copyContextPreserved&&roundtrip.legacyFixtureRecovered&&roundtrip.originChainVerified&&roundtrip.foreignSameCandidateRejected);
assert.deepEqual(roundtrip.codeHashes,archive.currentCodeHashes());
const parent=path.resolve(os.tmpdir()),temp=fs.mkdtempSync(path.join(parent,"lp-code-archive-tests-"));
let index=0;
function folder(name){const p=path.join(temp,name+"-"+index++);fs.mkdirSync(p);return p;}
function copied(source){const target=folder("case");for(const file of ["prod-backup.enc","code-backup-context.json"])if(fs.existsSync(path.join(source,file)))fs.copyFileSync(path.join(source,file),path.join(target,file));return target;}
function deniedBeforeSecrets(operation,env){
 let reads=0;const trapped={...env};
 for(const name of ["LIVEPALMES_CODE_BACKUP_KEY_V2","LIVEPALMES_CODE_BACKUP_LEGACY_V1","GOOGLE_APPLICATION_CREDENTIALS"])Object.defineProperty(trapped,name,{get(){reads++;throw Error("Secret access must not happen");}});
 assert.throws(()=>operation(trapped));assert.equal(reads,0);
}
try{
 const source=folder("source");fs.mkdirSync(path.join(source,"support"));
 fs.writeFileSync(path.join(source,"hello.js"),Buffer.from(vector.files["hello.js"],"base64"));fs.writeFileSync(path.join(source,"support/sample.bin"),Buffer.from(vector.files["support/sample.bin"],"base64"));
 const sealed=folder("sealed"),cipher=path.join(sealed,"prod-backup.enc");
 const meta=archive.sealArchive(source,cipher,publish,{policy,qualification:qualification()});
 assert.equal(meta.context.candidate,candidate);assert.equal(meta.context.runId,101);
 assert.deepEqual(fs.readdirSync(sealed).sort(),["code-backup-context.json","prod-backup.enc"]);
 assert(!fs.readFileSync(path.join(sealed,"code-backup-context.json"),"utf8").includes(record.key));
 const opened=path.join(temp,"opened");archive.openV2(cipher,opened,candidate,publish,{policy});
 for(const [name,encoded] of Object.entries(vector.files))assert.deepEqual(fs.readFileSync(path.join(opened,name)),Buffer.from(encoded,"base64"));
 const copy=copied(sealed),metadataBefore=fs.readFileSync(path.join(copy,"code-backup-context.json"));
 const plan=folder("plan"),copyEnv={...publish,GITHUB_RUN_ID:"202",RESUME:"101"};
 archive.emitLink(cipher,plan,candidate,publish);
 const sourceMetadata={id:101,run_attempt:1,status:"completed",event:"workflow_dispatch",path:".github/workflows/livepalmes-production-release.yml",head_branch:"main",head_sha:sha,head_repository:{full_name:"ffessmnap/LivePalmes"},repository:{full_name:"ffessmnap/LivePalmes"}};
 const validation=archive.validateSource(cipher,plan,candidate,copyEnv,sourceMetadata);
 const restored=archive.openV2(path.join(copy,"prod-backup.enc"),path.join(temp,"restored"),candidate,copyEnv,{policy,sourceValidation:validation});
 assert.equal(restored.context.runId,101);assert.deepEqual(fs.readFileSync(path.join(copy,"code-backup-context.json")),metadataBefore);
 deniedBeforeSecrets(env=>archive.openV2(cipher,path.join(temp,"missing-origin-proof"),candidate,env,{policy}),copyEnv);
 const foreign=folder("foreign"),foreignCipher=path.join(foreign,"prod-backup.enc");
 archive.sealArchive(source,foreignCipher,{...publish,GITHUB_RUN_ID:"102"},{policy,qualification:qualification()});
 assert.throws(()=>archive.validateSource(foreignCipher,plan,candidate,copyEnv,sourceMetadata));
 deniedBeforeSecrets(env=>archive.openV2(foreignCipher,path.join(temp,"foreign-same-candidate"),candidate,env,{policy,sourceValidation:validation}),copyEnv);
 deniedBeforeSecrets(env=>archive.openV2(foreignCipher,path.join(temp,"foreign-new-release"),candidate,env,{policy}),publish);
 for(const change of [{id:102},{head_sha:"c".repeat(40)},{run_attempt:2},{status:"in_progress"},{head_branch:"other"},{path:".github/workflows/other.yml"},{event:"push"},{head_repository:{full_name:"other/repo"}},{repository:{full_name:"other/repo"}}])assert.throws(()=>archive.validateSource(cipher,plan,candidate,copyEnv,{...sourceMetadata,...change}));
 const linkFile=path.join(plan,"code-backup-link-101.json"),originalLink=fs.readFileSync(linkFile);
 for(const mutate of [l=>l.originRun=102,l=>l.ciphertextSha256="0".repeat(64),l=>l.contextSha256="0".repeat(64),l=>l.candidate=sha,l=>l.producerRun=102,l=>l.extra=true,l=>l.type="unknown",l=>{l.type="copy";l.parentRun=101;l.parentLinkSha256="0".repeat(64);}]){
  const l=JSON.parse(originalLink);mutate(l);fs.writeFileSync(linkFile,JSON.stringify(l));assert.throws(()=>archive.validateSource(cipher,plan,candidate,copyEnv,sourceMetadata));
 }
 fs.writeFileSync(linkFile,originalLink);
 archive.emitLink(cipher,plan,candidate,copyEnv,validation);
 const nextEnv={...publish,GITHUB_RUN_ID:"303",RESUME:"202"};
 const chained=archive.validateSource(cipher,plan,candidate,nextEnv,{...sourceMetadata,id:202});assert.equal(chained.originRun,101);
 fs.writeFileSync(linkFile,Buffer.concat([originalLink,Buffer.from("\n")]));
 assert.throws(()=>archive.validateSource(cipher,plan,candidate,nextEnv,{...sourceMetadata,id:202}));fs.writeFileSync(linkFile,originalLink);
 fs.renameSync(linkFile,linkFile+".missing");assert.throws(()=>archive.validateSource(cipher,plan,candidate,nextEnv,{...sourceMetadata,id:202}));fs.renameSync(linkFile+".missing",linkFile);
 let previous=202,previousValidation=chained;
 for(let run=303;run<=1616;run+=101){
  const e={...publish,GITHUB_RUN_ID:String(run),RESUME:String(previous)};
  archive.emitLink(cipher,plan,candidate,e,previousValidation);
  const consumer={...publish,GITHUB_RUN_ID:String(run+101),RESUME:String(run)};
  if(run===1616){
   assert.throws(()=>archive.validateSource(cipher,plan,candidate,consumer,{...sourceMetadata,id:run}));
   const rollbackEnv={...common,GITHUB_RUN_ID:"1707",GITHUB_WORKFLOW_REF:"ffessmnap/LivePalmes/.github/workflows/livepalmes-production-rollback.yml@refs/heads/main",RELEASE_RUN:"1616",LIVEPALMES_CODE_BACKUP_KEY_V2:JSON.stringify(record)};
   const last=archive.validateSource(cipher,plan,candidate,rollbackEnv,{...sourceMetadata,id:run});assert.equal(last.chainLength,16);
   archive.openV2(cipher,path.join(temp,"rollback-at-limit"),candidate,rollbackEnv,{policy,sourceValidation:last});
   deniedBeforeSecrets(env=>archive.openV2(cipher,path.join(temp,"resume-at-limit"),candidate,env,{policy,sourceValidation:last}),consumer);
   assert.throws(()=>archive.emitLink(cipher,plan,candidate,consumer,last));
   assert(!fs.existsSync(path.join(plan,"code-backup-link-1707.json")));
   const over={schema:1,type:"copy",producerRun:1707,producerHead:sha,originRun:101,candidate,parentRun:1616,parentLinkSha256:last.sourceLinkSha256,ciphertextSha256:last.ciphertextSha256,contextSha256:last.contextSha256};
   fs.writeFileSync(path.join(plan,"code-backup-link-1707.json"),JSON.stringify(over));
   assert.throws(()=>archive.validateSource(cipher,plan,candidate,{...rollbackEnv,RELEASE_RUN:"1707",GITHUB_RUN_ID:"1808"},{...sourceMetadata,id:1707}));
  }else previousValidation=archive.validateSource(cipher,plan,candidate,consumer,{...sourceMetadata,id:run});
  previous=run;
 }
 for(const [name,bad] of Object.entries({GITHUB_REPOSITORY:"other/repo",GITHUB_REF:"refs/heads/pr",GITHUB_EVENT_NAME:"push",GITHUB_RUN_ATTEMPT:"2",GITHUB_SHA:"bad",GITHUB_RUN_ID:"9007199254740993",GITHUB_WORKFLOW_REF:"other.yml"})){
  deniedBeforeSecrets(env=>archive.sealArchive(source,path.join(folder("bad-context"),"prod-backup.enc"),env,{policy,qualification:qualification()}),{...publish,[name]:bad});
  deniedBeforeSecrets(env=>archive.openV2(cipher,path.join(temp,"bad-open-"+index++),candidate,env,{policy}),{...publish,[name]:bad});
 }
 deniedBeforeSecrets(env=>archive.sealArchive(source,path.join(folder("no-qualification"),"prod-backup.enc"),env,{policy,qualification:{schema:0}}),publish);
 deniedBeforeSecrets(env=>archive.sealArchive(source,path.join(folder("wrong-fixture"),"prod-backup.enc"),env,{fixture:true,policy}),publish);
 deniedBeforeSecrets(env=>archive.sealArchive(source,path.join(folder("no-ci"),"prod-backup.enc"),env,{fixture:true,policy}),{...fixture,VERIFIED_MAIN_CI:"false"});
 deniedBeforeSecrets(env=>archive.sealArchive(source,cipher,env,{policy,qualification:qualification()}),publish);
 for(const mutate of [
  q=>q.receipt.archiveRoundtripVerified=false,q=>q.receipt.copyContextPreserved=false,q=>q.receipt.legacyFixtureRecovered=false,q=>delete q.receipt.originChainVerified,q=>q.receipt.foreignSameCandidateRejected=false,
  q=>q.receipt.businessDataRead=true,q=>q.receipt.googleCredentialsRead=true,q=>q.source.run=1,q=>q.receipt.nodeVersion="wrong-runtime",
  q=>q.source.workflow=".github/workflows/other.yml",q=>q.source.head="d".repeat(40),
  q=>q.receipt.codeHashes["tools/production-code-backup-archive.js"]="0".repeat(64),q=>q.keyId="other"
 ]){
  const q=qualification();mutate(q);
  deniedBeforeSecrets(env=>archive.sealArchive(source,path.join(folder("bad-proof"),"prod-backup.enc"),env,{policy,qualification:q}),publish);
 }
 for(const mutate of [
  m=>m.extra="untrusted",m=>m.context.project="livepalmes-test",m=>m.context.repository="other/repo",
  m=>m.context.kind="business-data",m=>m.context.runId=0,m=>m.context.candidate=sha,
  m=>m.keyId="other",m=>m.ciphertextSha256="0".repeat(64)
 ]){
  const dir=copied(sealed),metaPath=path.join(dir,"code-backup-context.json"),m=JSON.parse(fs.readFileSync(metaPath));mutate(m);fs.writeFileSync(metaPath,JSON.stringify(m));
  const destination=path.join(temp,"bad-metadata-"+index++);
  deniedBeforeSecrets(env=>archive.openV2(path.join(dir,"prod-backup.enc"),destination,candidate,env,{policy}),publish);
  assert(!fs.existsSync(destination));
 }
 const missing=copied(sealed);fs.unlinkSync(path.join(missing,"code-backup-context.json"));
 deniedBeforeSecrets(env=>archive.openV2(path.join(missing,"prod-backup.enc"),path.join(temp,"missing"),candidate,env,{policy}),publish);
 deniedBeforeSecrets(env=>archive.openLegacy(cipher,path.join(temp,"no-fallback"),env),fixture);
 const altered=copied(sealed),alteredCipher=path.join(altered,"prod-backup.enc"),bytes=fs.readFileSync(alteredCipher);bytes[bytes.length-1]^=1;fs.writeFileSync(alteredCipher,bytes);
 deniedBeforeSecrets(env=>archive.openV2(alteredCipher,path.join(temp,"altered"),candidate,env,{policy}),publish);
 const alteredMetadata=JSON.parse(fs.readFileSync(path.join(altered,"code-backup-context.json")));alteredMetadata.ciphertextSha256=archive.hash(bytes);fs.writeFileSync(path.join(altered,"code-backup-context.json"),JSON.stringify(alteredMetadata));
 assert.throws(()=>archive.openV2(alteredCipher,path.join(temp,"altered-auth"),candidate,publish,{policy}));
 assert(!fs.existsSync(path.join(temp,"altered-auth")));
 assert.throws(()=>archive.openV2(cipher,path.join(temp,"wrong-key"),candidate,{...publish,LIVEPALMES_CODE_BACKUP_KEY_V2:JSON.stringify({...record,key:crypto.randomBytes(32).toString("base64")})},{policy}));
 const legacy=folder("legacy"),legacyCipher=path.join(legacy,"prod-backup.enc");
 assert.equal(vector.fixtureOnly,true);fs.writeFileSync(legacyCipher,Buffer.from(vector.ciphertextBase64,"base64"));
 const old={type:"service_account",project_id:"livepalmes",client_email:"github-actions-livepalmes-back@livepalmes.iam.gserviceaccount.com",private_key:vector.publicMockKey};
 const legacyEnv={...fixture,LIVEPALMES_CODE_BACKUP_LEGACY_V1:JSON.stringify(old)};
 Object.defineProperty(legacyEnv,"LIVEPALMES_CODE_BACKUP_KEY_V2",{get(){throw Error("V1 cannot read V2 key");}});
 Object.defineProperty(legacyEnv,"GOOGLE_APPLICATION_CREDENTIALS",{get(){throw Error("No ADC credential file");}});
 archive.openLegacy(legacyCipher,path.join(temp,"legacy-vector"),legacyEnv);
 for(const [name,encoded] of Object.entries(vector.files))assert.deepEqual(fs.readFileSync(path.join(temp,"legacy-vector",name)),Buffer.from(encoded,"base64"));
 assert.throws(()=>archive.openLegacy(legacyCipher,path.join(temp,"changed-line-endings"),{...fixture,LIVEPALMES_CODE_BACKUP_LEGACY_V1:JSON.stringify({...old,private_key:old.private_key.replaceAll("\n","\r\n")})}));
 assert(!fs.existsSync(path.join(temp,"changed-line-endings")));
 deniedBeforeSecrets(env=>archive.openV2(legacyCipher,path.join(temp,"no-upgrade"),candidate,env,{policy}),publish);
 deniedBeforeSecrets(env=>archive.openLegacy(legacyCipher,path.join(temp,"no-resume"),env),publish);
 const result=spawnSync(process.execPath,[path.resolve(__dirname,"../tools/production-code-backup-archive.js"),"seal-fixture",source,path.join(folder("cli"),"prod-backup.enc")],{env:{...process.env,...fixture},encoding:"utf8"});
 assert.equal(result.status,1);assert(!result.stdout.includes(record.key)&&!result.stderr.includes(record.key));assert.match(result.stderr,/aucune cle affichee/);
 console.log("Archives code : vrais tar V2 et vecteur V1 fixe, contexte original copie, qualification avant secret, tamper/cle/contexte/refus de fallback et CLI sans fuite verifies. Aucun secret reel ni appel cloud.");
}finally{
 const target=path.resolve(temp);assert.equal(path.dirname(target),parent);assert(path.basename(target).startsWith("lp-code-archive-tests-"));
 fs.rmSync(target,{recursive:true,force:true});
}
