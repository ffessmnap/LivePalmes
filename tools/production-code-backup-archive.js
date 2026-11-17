"use strict";
// Code archives only. No Google client or credential file is used by V2.
const fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto");
const {execFileSync}=require("node:child_process");
const v2=require("./production-code-backup-crypto"),v1=require("./production-backup-crypto");
const ROOT=path.resolve(__dirname,"..");
const POLICY=".github/releases/evidence/20261117-code-backup-key-v2.json";
const QUALIFICATION=".github/releases/evidence/code-backup-v2-qualification.json";
const CODE_FILES=["tools/production-code-backup-archive.js","tools/production-code-backup-crypto.js",
 "tools/production-backup-crypto.js","tools/production-code-backup-key-check.js",
 ".github/workflows/production-code-backup-key-check.yml",POLICY];
const MAGIC_V2=Buffer.from("LIVEPALMES_CODE_BACKUP_V2\n"),MAGIC_V1=Buffer.from("LIVEPALMES_BACKUP_V1\n");
const WF="ffessmnap/LivePalmes/.github/workflows/";
const PUBLISH="livepalmes-production-release.yml",ROLLBACK="livepalmes-production-rollback.yml",PROBE="production-code-backup-key-check.yml";
const SHA=/^[0-9a-f]{40}$/,HASH=/^[0-9a-f]{64}$/,ID=/^[a-z0-9][a-z0-9_-]{0,63}$/;
const fail=()=>{throw new Error("Archive code refusee");};
const requireThat=value=>{if(!value)fail();};
function exact(value,keys){requireThat(value&&typeof value==="object"&&!Array.isArray(value)&&Object.keys(value).sort().join("|")===[...keys].sort().join("|"));}
function readJson(file,maximum=1048576){const s=fs.lstatSync(file);requireThat(s.isFile()&&!s.isSymbolicLink()&&s.size<=maximum);return JSON.parse(fs.readFileSync(file,"utf8"));}
function hash(value){return crypto.createHash("sha256").update(value).digest("hex");}
function currentCodeHashes(){return Object.fromEntries(CODE_FILES.map(file=>[file,hash(fs.readFileSync(path.join(ROOT,file)))]));}
function runtime(env,mode){
 requireThat(env.GITHUB_REPOSITORY==="ffessmnap/LivePalmes"&&env.GITHUB_REF==="refs/heads/main"&&env.GITHUB_EVENT_NAME==="workflow_dispatch"&&env.GITHUB_RUN_ATTEMPT==="1"&&SHA.test(env.GITHUB_SHA||"")&&/^[1-9][0-9]*$/.test(env.GITHUB_RUN_ID||"")&&Number.isSafeInteger(Number(env.GITHUB_RUN_ID)));
 const workflow=[PUBLISH,ROLLBACK,PROBE].find(name=>env.GITHUB_WORKFLOW_REF===WF+name+"@refs/heads/main");
 requireThat(workflow);
 if(workflow===PROBE)requireThat(env.VERIFIED_MAIN_CI==="true"&&env.EXPECTED_COMMIT===env.GITHUB_SHA);
 if(workflow===ROLLBACK)requireThat(/^[1-9][0-9]*$/.test(env.RELEASE_RUN||"")&&Number.isSafeInteger(Number(env.RELEASE_RUN)));
 if(mode==="legacy"&&workflow===PUBLISH)requireThat(/^[1-9][0-9]*$/.test(env.RESUME||"")&&Number.isSafeInteger(Number(env.RESUME)));
 if(mode==="seal")requireThat(workflow===PUBLISH&&(env.RESUME===undefined||env.RESUME==="0"));
 if(mode==="fixture")requireThat(workflow===PROBE);
 return workflow;
}
function archiveContext(value){
 exact(value,["project","repository","kind","candidate","runId"]);
 requireThat(value.project==="livepalmes"&&value.repository==="ffessmnap/LivePalmes"&&value.kind==="production-code"&&SHA.test(value.candidate||"")&&Number.isSafeInteger(value.runId)&&value.runId>0);
 return value;
}
function keyPolicy(override){
 const p=override||readJson(path.join(ROOT,POLICY),8192);
 requireThat(p.schema===1&&p.purpose==="production-code"&&p.environment==="production"&&p.secretName==="LIVEPALMES_CODE_BACKUP_KEY_V2"&&ID.test(p.keyId||"")&&HASH.test(p.keyFingerprint||""));
 return p;
}
function qualified(policy,override){
 const file=path.join(ROOT,QUALIFICATION);
 const q=override||(fs.existsSync(file)?readJson(file,32768):null);
 requireThat(q&&q.schema===1&&q.keyId===policy.keyId&&q.keyFingerprint===policy.keyFingerprint);
 const r=q.receipt,s=q.source;
 requireThat(r&&s&&r.keyId===policy.keyId&&r.keyFingerprint===policy.keyFingerprint&&r.syntheticCodeOnly===true&&r.restoredExactly===true&&r.keyMaterialExported===false&&r.googleCredentialsRead===false&&r.existingArchivesRead===false&&r.businessDataRead===false&&r.archiveRoundtripVerified===true&&r.copyContextPreserved===true&&r.legacyFixtureRecovered===true&&r.originChainVerified===true&&r.foreignSameCandidateRejected===true);
 requireThat(r.nodeVersion===process.version);
 archiveContext(r.context);
 requireThat(s.run===r.context.runId&&s.head===r.context.candidate&&Number.isSafeInteger(s.artifact)&&s.artifact>0&&/^sha256:[0-9a-f]{64}$/.test(s.digest||"")&&s.workflow===".github/workflows/"+PROBE);
 const hashes=currentCodeHashes();
 exact(r.codeHashes,CODE_FILES);
 requireThat(CODE_FILES.every(file=>r.codeHashes[file]===hashes[file]));
 return q;
}
function readV2Key(env,policy){
 const record=JSON.parse(env.LIVEPALMES_CODE_BACKUP_KEY_V2||"null");
 exact(record,["schema","keyId","key"]);
 requireThat(record.schema===2&&record.keyId===policy.keyId&&typeof record.key==="string"&&/^[A-Za-z0-9+/]{43}=$/.test(record.key));
 const bytes=Buffer.from(record.key,"base64");
 try{requireThat(bytes.length===32&&bytes.toString("base64")===record.key&&!bytes.every(x=>x===0)&&hash(bytes)===policy.keyFingerprint);}
 finally{bytes.fill(0);}
 return record;
}
function paths(cipher){
 const file=path.resolve(cipher);requireThat(path.basename(file)==="prod-backup.enc");
 return {cipher:file,metadata:path.join(path.dirname(file),"code-backup-context.json")};
}
function inspect(cipher){
 const names=paths(cipher),s=fs.lstatSync(names.cipher);
 requireThat(s.isFile()&&!s.isSymbolicLink()&&s.size<=1024**3+2048);
 const data=fs.readFileSync(names.cipher);
 if(fs.existsSync(names.metadata)){
  const metadata=readJson(names.metadata,8192);
  exact(metadata,["schema","format","keyId","context","ciphertextSha256"]);
  requireThat(metadata.schema===2&&metadata.format==="code-v2"&&ID.test(metadata.keyId||"")&&HASH.test(metadata.ciphertextSha256||"")&&data.subarray(0,MAGIC_V2.length).equals(MAGIC_V2)&&hash(data)===metadata.ciphertextSha256);
  archiveContext(metadata.context);
  return {format:"v2",metadata,data};
 }
 requireThat(data.length>=MAGIC_V1.length+60&&data.subarray(0,MAGIC_V1.length).equals(MAGIC_V1));
 return {format:"legacy-v1",data};
}
function extract(packed,destination){
 requireThat(!fs.existsSync(destination));fs.mkdirSync(destination,{mode:0o700});
 execFileSync("tar",["-xzf","-","-C",destination],{input:packed,stdio:["pipe","pipe","pipe"],maxBuffer:1024**3});
}
function positive(value){requireThat(/^[1-9][0-9]*$/.test(String(value))&&Number.isSafeInteger(Number(value)));return Number(value);}
function sourceRun(env){
 const workflow=runtime(env,"open");
 return positive(workflow===ROLLBACK?env.RELEASE_RUN:env.RESUME);
}
function pair(cipher,candidate){
 const info=inspect(cipher);requireThat(info.format==="v2"&&info.metadata.context.candidate===candidate);
 return {info,ciphertextSha256:info.metadata.ciphertextSha256,contextSha256:hash(fs.readFileSync(paths(cipher).metadata))};
}
function linkPath(directory,run){return path.join(directory,"code-backup-link-"+positive(run)+".json");}
function writeJson(file,value){fs.writeFileSync(file,JSON.stringify(value,null,2)+"\n",{flag:"wx",mode:0o600});}
function validateReceipt(value,p,expectedRun,candidate){
 exact(value,["schema","sourceRun","sourceHead","sourceLinkSha256","originRun","candidate","ciphertextSha256","contextSha256","chainVerified","chainLength"]);
 requireThat(value.schema===1&&value.chainVerified===true&&value.sourceRun===expectedRun&&SHA.test(value.sourceHead||"")&&HASH.test(value.sourceLinkSha256||"")&&value.originRun===p.info.metadata.context.runId&&value.candidate===candidate&&value.ciphertextSha256===p.ciphertextSha256&&value.contextSha256===p.contextSha256);
 requireThat(Number.isSafeInteger(value.chainLength)&&value.chainLength>=1&&value.chainLength<=16);
 return value;
}
function emitLink(cipher,directory,candidate,env,validation){
 const workflow=runtime(env,"open"),p=pair(cipher,candidate),run=positive(env.GITHUB_RUN_ID);
 requireThat((workflow===PUBLISH&&candidate===env.CANDIDATE_SHA)||(workflow===PROBE&&candidate===env.GITHUB_SHA));
 const copied=validation!==undefined;
 if(copied){validateReceipt(validation,p,sourceRun(env),candidate);requireThat(run>validation.sourceRun&&validation.chainLength<16);}
 else requireThat((workflow===PROBE||env.RESUME===undefined||env.RESUME==="0")&&p.info.metadata.context.runId===run);
 const link={schema:1,type:copied?"copy":"original",producerRun:run,producerHead:env.GITHUB_SHA,
  originRun:p.info.metadata.context.runId,candidate,parentRun:copied?validation.sourceRun:null,
  parentLinkSha256:copied?validation.sourceLinkSha256:null,ciphertextSha256:p.ciphertextSha256,contextSha256:p.contextSha256};
 if(copied)requireThat(hash(fs.readFileSync(linkPath(directory,link.parentRun)))===link.parentLinkSha256);
 writeJson(linkPath(directory,run),link);return link;
}
// Precondition: the controller authenticated both archive and release-plan artifacts
// from this exact source run. One GitHub metadata read; at most 16 local links.
function validateSource(cipher,directory,candidate,env,sourceMetadata){
 const expected=sourceRun(env),p=pair(cipher,candidate),s=sourceMetadata;
 requireThat(SHA.test(candidate||"")&&s&&s.id===expected&&s.run_attempt===1&&s.status==="completed"&&s.event==="workflow_dispatch"&&s.path===".github/workflows/"+PUBLISH&&s.head_branch==="main"&&s.head_repository?.full_name==="ffessmnap/LivePalmes"&&s.repository?.full_name==="ffessmnap/LivePalmes"&&SHA.test(s.head_sha||""));
 // Failed production runs may own a usable verified backup; conclusion is not
 // promoted to success here. Existing resume/rollback guards decide eligibility.
 let run=expected,expectedHash=null,tipHash;const visited=new Set();
 for(let depth=0;depth<16;depth++){
  requireThat(!visited.has(run));visited.add(run);
  const file=linkPath(directory,run),link=readJson(file,4096),digest=hash(fs.readFileSync(file));
  exact(link,["schema","type","producerRun","producerHead","originRun","candidate","parentRun","parentLinkSha256","ciphertextSha256","contextSha256"]);
  requireThat(link.schema===1&&link.producerRun===run&&SHA.test(link.producerHead||"")&&link.originRun===p.info.metadata.context.runId&&link.candidate===candidate&&link.ciphertextSha256===p.ciphertextSha256&&link.contextSha256===p.contextSha256);
  if(depth===0){requireThat(link.producerHead===s.head_sha);tipHash=digest;}
  else requireThat(digest===expectedHash);
  if(link.type==="original"){
   requireThat(link.producerRun===link.originRun&&link.parentRun===null&&link.parentLinkSha256===null);
   // A rollback may read 16 links; a resume must leave room for its new link.
   requireThat(runtime(env,"open")!==PUBLISH||depth+1<16);
   return {schema:1,sourceRun:expected,sourceHead:s.head_sha,sourceLinkSha256:tipHash,originRun:link.originRun,candidate,ciphertextSha256:p.ciphertextSha256,contextSha256:p.contextSha256,chainVerified:true,chainLength:depth+1};
  }
  requireThat(link.type==="copy"&&positive(link.parentRun)<run&&HASH.test(link.parentLinkSha256||""));
  run=link.parentRun;expectedHash=link.parentLinkSha256;
 }
 fail();
}
function sealArchive(source,cipher,env,options={}){
 const fixture=options.fixture===true;runtime(env,fixture?"fixture":"seal");
 const candidate=fixture?env.GITHUB_SHA:env.CANDIDATE_SHA;
 requireThat(SHA.test(candidate||""));
 const policy=keyPolicy(options.policy);
 if(!fixture)qualified(policy,options.qualification);
 const names=paths(cipher);
 requireThat(!fs.existsSync(names.cipher)&&!fs.existsSync(names.metadata)&&fs.statSync(source).isDirectory());
 const record=readV2Key(env,policy);
 const context=archiveContext({project:"livepalmes",repository:"ffessmnap/LivePalmes",kind:"production-code",candidate,runId:Number(env.GITHUB_RUN_ID)});
 const packed=execFileSync("tar",["-czf","-","-C",source,"."],{stdio:["pipe","pipe","pipe"],maxBuffer:1024**3});
 const data=v2.seal(packed,record,context);
 const metadata={schema:2,format:"code-v2",keyId:record.keyId,context,ciphertextSha256:hash(data)};
 fs.writeFileSync(names.cipher,data,{mode:0o600,flag:"wx"});
 fs.writeFileSync(names.metadata,JSON.stringify(metadata,null,2)+"\n",{mode:0o600,flag:"wx"});
 return metadata;
}
function openV2(cipher,destination,expectedCandidate,env,options={}){
 const workflow=runtime(env,"open");
 requireThat(SHA.test(expectedCandidate||""));
 if(workflow===PROBE)requireThat(expectedCandidate===env.GITHUB_SHA);
 if(workflow===PUBLISH)requireThat(expectedCandidate===env.CANDIDATE_SHA);
 const info=inspect(cipher);
 requireThat(info.format==="v2"&&info.metadata.context.candidate===expectedCandidate&&!fs.existsSync(destination));
 const copied=workflow===ROLLBACK||(workflow===PUBLISH&&env.RESUME!==undefined&&env.RESUME!=="0")||(workflow===PROBE&&env.RESUME!==undefined);
 if(copied){validateReceipt(options.sourceValidation,pair(cipher,expectedCandidate),sourceRun(env),expectedCandidate);requireThat(workflow!==PUBLISH||options.sourceValidation.chainLength<16);}
 else requireThat(info.metadata.context.runId===Number(env.GITHUB_RUN_ID));
 const policy=keyPolicy(options.policy);
 requireThat(info.metadata.keyId===policy.keyId);
 const record=readV2Key(env,policy);
 // Expected creation context comes from the integrity-checked artifact sidecar,
 // never from the newest controller/copy run or the encrypted header alone.
 const packed=v2.open(info.data,record,info.metadata.context);
 extract(packed,destination);
 return info.metadata;
}
function openLegacy(cipher,destination,env){
 runtime(env,"legacy");
 const info=inspect(cipher);
 requireThat(info.format==="legacy-v1"&&!fs.existsSync(destination));
 const record=JSON.parse(env.LIVEPALMES_CODE_BACKUP_LEGACY_V1||"null");
 requireThat(record&&record.type==="service_account"&&record.project_id==="livepalmes"&&record.client_email==="github-actions-livepalmes-back@livepalmes.iam.gserviceaccount.com"&&typeof record.private_key==="string"&&record.private_key.length<=16384&&record.private_key.startsWith("-----BEGIN PRIVATE KEY-----"));
 // Preserve original V1 key bytes, including line endings. No ADC lookup.
 extract(v1.open(info.data,record.private_key),destination);
 return {format:"legacy-v1"};
}
function main(argv,env=process.env){
 const [mode,a,b,c,d,...extra]=argv;
 requireThat(!extra.length);
 if(mode==="inspect"&&a&&!b&&!c&&!d){console.log(inspect(a).format);return;}
 if((mode==="seal"||mode==="seal-fixture")&&a&&b&&!c&&!d){sealArchive(a,b,env,{fixture:mode==="seal-fixture"});return;}
 if(mode==="validate-source"&&a&&b&&c&&d){
  const run=sourceRun(env),plan=readJson(c);
  const metadata=JSON.parse(execFileSync("gh",["api","repos/ffessmnap/LivePalmes/actions/runs/"+run],{encoding:"utf8",maxBuffer:1048576,stdio:["ignore","pipe","pipe"]}));
  writeJson(d,validateSource(a,b,plan.candidate,env,metadata));return;
 }
 if(mode==="emit-link"&&a&&b&&c){const plan=readJson(c);emitLink(a,b,plan.candidate,env,d?readJson(d,4096):undefined);return;}
 if(mode==="open-v2"&&a&&b&&c){runtime(env,"open");const plan=readJson(c);openV2(a,b,plan.candidate,env,{sourceValidation:d?readJson(d,4096):undefined});return;}
 if(mode==="open-legacy-v1"&&a&&b&&!c&&!d){openLegacy(a,b,env);return;}
 fail();
}
module.exports={runtime,archiveContext,keyPolicy,qualified,currentCodeHashes,hash,paths,inspect,sealArchive,openV2,openLegacy,main,emitLink,validateSource};
if(require.main===module){
 try{main(process.argv.slice(2));}
 catch{console.error("Operation d'archive code refusee ; aucune cle affichee.");process.exitCode=1;}
}
