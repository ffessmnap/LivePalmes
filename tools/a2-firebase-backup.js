"use strict";
const fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto");
const core=require("./a2-backup-core"),data=require("./a2-firebase-data"),settings=require("./a2-backup-config.json");
const CONFIRMATION="A2-COPIES-ET-RECUPERATION-ISOLEE-AUTORISEES";
const fingerprintFiles=["tools/a2-backup-core.js","tools/a2-firebase-data.js","tools/a2-firebase-backup.js","tools/a2-firebase-restore.js","tools/a2-firebase-restore-worker.js","tools/a2-backup-config.json","tools/production-backup-crypto.js","tools/nap-backup.js",".github/ci-container.json","tests/firestore-rules/package-lock.json",".github/ci-runtime.json",".github/workflows/a2-firebase-backup.yml"];
function fingerprint(){return core.hash(Buffer.concat(fingerprintFiles.map(name=>{let bytes=fs.readFileSync(path.join(__dirname,"..",name));if(name==="tools/a2-backup-config.json")bytes=Buffer.from(JSON.stringify(Object.fromEntries(Object.entries(JSON.parse(bytes)).filter(([key])=>key!=="enabled"))));return Buffer.concat([Buffer.from(name+"\0"),bytes]);})));}
function gate(mode,env,config=settings){
 if(mode==="fixture"){if(env.GITHUB_EVENT_NAME!=="workflow_dispatch"||env.GITHUB_REPOSITORY!=="ffessmnap/LivePalmes"||!String(env.GITHUB_REF||"").startsWith("refs/heads/"))core.fail("A2_FIXTURE_MANUAL_REQUIRED");return;}
 if(env.GITHUB_REF!=="refs/heads/main")core.fail("A2_MAIN_REQUIRED");if(mode==="check")return;
 if(!["trial","backup"].includes(mode)||env.A2_BACKUP_CONFIRMATION!==CONFIRMATION)core.fail("A2_BACKUP_NOT_AUTHORIZED");
 if(mode==="trial"&&env.GITHUB_EVENT_NAME!=="workflow_dispatch")core.fail("A2_TRIAL_MANUAL_REQUIRED");
 if(mode==="backup"&&config.enabled!==true)core.fail("A2_BACKUP_DISABLED");
 if(env.GITHUB_EVENT_NAME==="schedule"){
  let proof;try{proof=JSON.parse(env.A2_BACKUP_RESTORE_PROOF||"");}catch{core.fail("A2_RESTORE_PROOF_REQUIRED");}
  if(env.A2_BACKUP_SCHEDULE_ENABLED!=="true"||proof.schema!==1||proof.toolSha256!==fingerprint()||proof.folder!==env.NAP_BACKUP_FOLDER_ID||proof.restoredAndCompared!==true||proof.downloadedFromDrive!==true||!Array.isArray(proof.archiveSha256)||proof.archiveSha256.length!==config.projects.length||proof.archiveSha256.some(value=>!/^[a-f0-9]{64}$/.test(value))||!Number.isFinite(Date.parse(proof.verifiedAt))||!config.projects.every(project=>proof.projects?.includes(project)))core.fail("A2_RESTORE_PROOF_REQUIRED");
 }
}
function fixture(project="livepalmes"){
 const name=data.database(project)+"/documents/",content=Buffer.from("%PDF-1.4\nA2 offline fixture\u0000\n%%EOF"),metadata={name:"fixture/bytes.pdf",size:String(content.length),generation:"1",contentType:"application/pdf",cacheControl:"private,max-age=0",metadata:{fixture:"no-personal-data"},md5Hash:crypto.createHash("md5").update(content).digest("base64"),crc32c:data.crc32c(content)};
 return {schema:1,project,firestore:{count:2,documents:[{name:name+"records/one",fields:{integer:{integerValue:"9223372036854775807"},bytes:{bytesValue:"AAEC/w=="},stamp:{timestampValue:"2026-11-16T00:00:00.123456Z"},nil:{nullValue:null},negativeZero:{doubleValue:"-0"},nan:{doubleValue:"NaN"},point:{geoPointValue:{latitude:48.8566,longitude:2.3522}},list:{arrayValue:{values:[{booleanValue:true},{stringValue:"épreuve"}]}},reference:{referenceValue:name+"absent/parent/children/deep"}}},{name:name+"absent/parent/children/deep",fields:{map:{mapValue:{fields:{nested:{stringValue:"fixture"}}}}}}]},auth:{config:{signIn:{hashConfig:{algorithm:"SCRYPT",signerKey:"Zml4dHVyZQ==",saltSeparator:"",rounds:8,memoryCost:14}}},providers:{},users:[{localId:"fixture-anonymous",createdAt:"1"},{localId:"fixture-password",email:"password@example.invalid",emailVerified:true,passwordHash:"ZmFrZS1maXh0dXJlLWhhc2g=",salt:"Zml4dHVyZQ==",customAttributes:'{"role":"fixture"}',providerUserInfo:[{providerId:"password",email:"password@example.invalid",rawId:"password@example.invalid",federatedId:"password@example.invalid"}]},{localId:"fixture-google",email:"google@example.invalid",emailVerified:true,providerUserInfo:[{providerId:"google.com",rawId:"fixture-google-subject",federatedId:"fixture-google-subject",email:"google@example.invalid"}]}]},storage:{bytes:content.length,buckets:[{name:settings.buckets[project][0],objects:[{metadata,sha256:core.hash(content),content:content.toString("base64")}]},{name:settings.buckets[project][1],objects:[]}]}};
}
async function main(env=process.env){
 const argument=process.argv[2]||"--check",mode=argument==="--gate"?env.A2_BACKUP_MODE||"check":argument.slice(2);gate(mode,env);
 if(argument==="--gate"){console.log("Garde A2 valide avant secrets et acces distant.");return;}
 const directory=path.resolve("outputs/a2-firebase");fs.mkdirSync(directory,{recursive:true});
 if(mode==="fixture"){const report=require("./a2-firebase-restore").restoreBundle(fixture(),env,undefined,true);fs.writeFileSync(path.join(directory,"fixture-report.json"),JSON.stringify(report,null,2)+"\n",{flag:"wx",mode:0o600});console.log(JSON.stringify(report));return;}
 if(!/^[A-Za-z0-9_-]{10,150}$/.test(env.NAP_BACKUP_FOLDER_ID||""))core.fail("A2_FOLDER_REQUIRED");
 const account=JSON.parse(fs.readFileSync(env.GOOGLE_APPLICATION_CREDENTIALS,"utf8")),token=await core.tokenFromAccount(account,settings.serviceAccount),api=core.sourceClient(token,settings),drive=require("./nap-backup").driveClient(token),key=core.keyFromEnvironment(env);
 await drive.folder(env.NAP_BACKUP_FOLDER_ID);
 if(mode==="check"){
  const summaries=[];for(const project of settings.projects){const count=await data.countDocuments(api,project,settings.maxDocuments),auth=await data.authSnapshot(api,project,settings),storage=await data.storageInventory(api,project,settings);summaries.push({project,documents:count.count,snapshotReadTime:count.readTime,users:auth.users.length,files:storage.buckets.reduce((n,b)=>n+b.objects.length,0),storageBytes:storage.bytes,authRecoveryConfigurationReadable:true});}console.log(JSON.stringify({schema:1,mode,folderAccessible:true,projects:summaries,backupStarted:false}));return;
 }
 const projects=[];
 for(const project of settings.projects){
  const startedAt=new Date().toISOString();console.log(JSON.stringify({stage:"source-start",project}));
  const firestore=await data.exportDocuments(api,project,settings);console.log(JSON.stringify({stage:"firestore-read",project,documents:firestore.documents.length,bytes:firestore.bytes}));
  const auth=await data.authSnapshot(api,project,settings);console.log(JSON.stringify({stage:"auth-read",project,users:auth.users.length}));
  const storage=await data.storageSnapshot(api,project,settings);const bundle={schema:1,project,startedAt,sourceCompletedAt:new Date().toISOString(),firestore,auth,storage};
  const packed=core.pack(bundle,key,settings.maxPlainBytes),filename="firebase-"+project+"-"+new Date().toISOString().replace(/[:.]/g,"-")+".json.gz.enc";fs.writeFileSync(path.join(directory,filename),packed.encrypted,{flag:"wx",mode:0o600});
  const uploaded=await drive.upload(env.NAP_BACKUP_FOLDER_ID,filename,packed.encrypted),stored={...uploaded,file:filename,sha256:core.hash(packed.encrypted)};const downloaded=await drive.download(env.NAP_BACKUP_FOLDER_ID,stored),recovered=core.unpack(downloaded,key,settings.maxPlainBytes);
  const recovery=require("./a2-firebase-restore").restoreBundle(recovered,env);projects.push({project,stored,plainBytes:packed.plainBytes,sourceSha256:packed.sha256,recovery});console.log(JSON.stringify({stage:"restored-and-compared",project,documents:recovery.documents,users:recovery.users,files:recovery.files}));
 }
 const report={schema:1,mode,folder:env.NAP_BACKUP_FOLDER_ID,completedAt:new Date().toISOString(),projects,restoreProof:{schema:1,toolSha256:fingerprint(),folder:env.NAP_BACKUP_FOLDER_ID,projects:projects.map(p=>p.project),archiveSha256:projects.map(p=>p.stored.sha256),restoredAndCompared:true,downloadedFromDrive:true,verifiedAt:new Date().toISOString()}};
 fs.writeFileSync(path.join(directory,"report.json"),JSON.stringify(report,null,2)+"\n",{flag:"wx",mode:0o600});console.log("Copies Firebase telechargees depuis Drive et restaurees dans des emulateurs sans reseau.");
}
module.exports={gate,fingerprint,fixture,main,CONFIRMATION};
if(require.main===module)main().catch(error=>{console.error("Sauvegarde A2 arretee : "+(error.safeCode||"A2_BACKUP_FAILED")+". Pas de relance automatique, aucune donnee source modifiee.");process.exitCode=1;});
