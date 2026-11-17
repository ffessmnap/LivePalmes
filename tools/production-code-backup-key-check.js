"use strict";
// Manual protected-main check: synthetic code only, no Google identity or archive access.
const crypto = require("node:crypto");
const fs = require("node:fs"), path = require("node:path");
const backup = require("./production-code-backup-crypto");
function context(env) {
  if (env.GITHUB_REPOSITORY !== "ffessmnap/LivePalmes" || env.GITHUB_REF !== "refs/heads/main" ||
      env.GITHUB_EVENT_NAME !== "workflow_dispatch" || env.GITHUB_RUN_ATTEMPT !== "1" ||
      env.GITHUB_WORKFLOW_REF !== "ffessmnap/LivePalmes/.github/workflows/production-code-backup-key-check.yml@refs/heads/main" ||
      !/^[0-9a-f]{40}$/.test(env.GITHUB_SHA || "") || env.EXPECTED_COMMIT !== env.GITHUB_SHA ||
      !/^[1-9][0-9]*$/.test(env.GITHUB_RUN_ID || "") || !Number.isSafeInteger(Number(env.GITHUB_RUN_ID)) ||
      env.VERIFIED_MAIN_CI !== "true") throw new Error("Contexte de controle protege invalide");
  return { project: "livepalmes", repository: env.GITHUB_REPOSITORY, kind: "production-code", candidate: env.GITHUB_SHA, runId: Number(env.GITHUB_RUN_ID) };
}
function probe(env) {
  const expected = context(env); // Must precede any access to the key.
  const record = JSON.parse(env.LIVEPALMES_CODE_BACKUP_KEY_V2 || "null");
  const original = Buffer.from("LIVEPALMES SYNTHETIC CODE BACKUP CHECK\n" + JSON.stringify(expected));
  const encrypted = backup.seal(original, record, expected);
  const restored = backup.open(encrypted, record, expected);
  if (!restored.equals(original)) throw new Error("Comparaison de recuperation refusee");
  const key = Buffer.from(record.key, "base64");
  const hash = value => crypto.createHash("sha256").update(value).digest("hex");
  try {
    return { schema: 1, context: expected, checkedAtUtc: new Date().toISOString(), keyId: record.keyId,
      keyFingerprint: hash(key), ciphertextSha256: hash(encrypted), restoredSha256: hash(restored),
      syntheticCodeOnly: true, restoredExactly: true, googleCredentialsRead: false,
      existingArchivesRead: false, businessDataRead: false, keyMaterialExported: false };
  } finally { key.fill(0); }
}
function archiveProbe(env,options={}) {
  context(env); // Before temp files or any key access.
  const archive=require('./production-code-backup-archive'),legacy=require('./production-backup-crypto');
  const os=require('node:os'),{execFileSync}=require('node:child_process');
  const parent=path.resolve(os.tmpdir()),directory=fs.mkdtempSync(path.join(parent,'lp-code-backup-proof-'));
  const fixture={
    'main.js':'module.exports = "LIVEPALMES SYNTHETIC CODE ONLY";\n',
    'support/fixture.json':'{"synthetic":true,"businessData":false}\n'
  };
  function compare(destination) {
    if(JSON.stringify(fs.readdirSync(destination).sort())!==JSON.stringify(['main.js','support'])||
       JSON.stringify(fs.readdirSync(path.join(destination,'support')))!==JSON.stringify(['fixture.json']))throw Error('Fixture archive members changed');
    for(const [file,data] of Object.entries(fixture))if(!fs.readFileSync(path.join(destination,file)).equals(Buffer.from(data)))throw Error('Fixture archive changed');
  }
  try {
    const source=path.join(directory,'source'),sealed=path.join(directory,'sealed');
    fs.mkdirSync(path.join(source,'support'),{recursive:true});fs.mkdirSync(sealed);
    for(const [file,data] of Object.entries(fixture))fs.writeFileSync(path.join(source,file),data,{flag:'wx'});
    const cipher=path.join(sealed,'prod-backup.enc');
    const metadata=archive.sealArchive(source,cipher,env,{fixture:true,policy:options.policy});
    const reopened=path.join(directory,'reopened');
    archive.openV2(cipher,reopened,env.GITHUB_SHA,env,{policy:options.policy});compare(reopened);
    const plan=path.join(directory,'plan');fs.mkdirSync(plan);
    archive.emitLink(cipher,plan,env.GITHUB_SHA,env);
    const sourceMetadata={id:Number(env.GITHUB_RUN_ID),run_attempt:1,status:'completed',event:'workflow_dispatch',
      path:'.github/workflows/livepalmes-production-release.yml',head_branch:'main',head_sha:env.GITHUB_SHA,
      head_repository:{full_name:'ffessmnap/LivePalmes'},repository:{full_name:'ffessmnap/LivePalmes'}};
    // Synthetic publisher metadata only; this does not attest a real release.
    const copyEnv={...env,GITHUB_RUN_ID:String(Number(env.GITHUB_RUN_ID)+1),RESUME:env.GITHUB_RUN_ID};
    const validation=archive.validateSource(cipher,plan,env.GITHUB_SHA,copyEnv,sourceMetadata);
    const copied=path.join(directory,'copied');fs.mkdirSync(copied);
    for(const file of ['prod-backup.enc','code-backup-context.json'])fs.copyFileSync(path.join(sealed,file),path.join(copied,file));
    const recovered=archive.openV2(path.join(copied,'prod-backup.enc'),path.join(directory,'copy-reopened'),env.GITHUB_SHA,
      copyEnv,{policy:options.policy,sourceValidation:validation});
    compare(path.join(directory,'copy-reopened'));
    if(recovered.context.runId!==metadata.context.runId||!fs.readFileSync(path.join(copied,'code-backup-context.json')).equals(fs.readFileSync(path.join(sealed,'code-backup-context.json'))))throw Error('Creation context changed on copy');
    archive.emitLink(path.join(copied,'prod-backup.enc'),plan,env.GITHUB_SHA,copyEnv,validation);
    archive.validateSource(cipher,plan,env.GITHUB_SHA,{...copyEnv,GITHUB_RUN_ID:String(Number(env.GITHUB_RUN_ID)+2),RESUME:copyEnv.GITHUB_RUN_ID},{...sourceMetadata,id:Number(copyEnv.GITHUB_RUN_ID)});
    const foreign=path.join(directory,'foreign');fs.mkdirSync(foreign);
    const foreignCipher=path.join(foreign,'prod-backup.enc');
    archive.sealArchive(source,foreignCipher,{...env,GITHUB_RUN_ID:String(Number(env.GITHUB_RUN_ID)+3)},{fixture:true,policy:options.policy});
    let rejected=false;
    try{archive.validateSource(foreignCipher,plan,env.GITHUB_SHA,copyEnv,sourceMetadata);}catch{rejected=true;}
    if(!rejected)throw Error('Foreign archive with same candidate accepted');
    const fakeKey=crypto.generateKeyPairSync('rsa',{modulusLength:2048,privateKeyEncoding:{type:'pkcs8',format:'pem'},publicKeyEncoding:{type:'spki',format:'pem'}}).privateKey;
    const fakeLegacy={type:'service_account',project_id:'livepalmes',client_email:'github-actions-livepalmes-back@livepalmes.iam.gserviceaccount.com',private_key:fakeKey};
    const legacyFolder=path.join(directory,'legacy');fs.mkdirSync(legacyFolder);
    const packed=execFileSync('tar',['-czf','-','-C',source,'.'],{stdio:['pipe','pipe','pipe']});
    fs.writeFileSync(path.join(legacyFolder,'prod-backup.enc'),legacy.seal(packed,fakeKey),{flag:'wx'});
    const legacyEnv=Object.fromEntries(['GITHUB_REPOSITORY','GITHUB_REF','GITHUB_EVENT_NAME','GITHUB_RUN_ATTEMPT','GITHUB_SHA','GITHUB_RUN_ID','GITHUB_WORKFLOW_REF','EXPECTED_COMMIT','VERIFIED_MAIN_CI'].map(name=>[name,env[name]]));
    legacyEnv.LIVEPALMES_CODE_BACKUP_LEGACY_V1=JSON.stringify(fakeLegacy);
    Object.defineProperty(legacyEnv,'LIVEPALMES_CODE_BACKUP_KEY_V2',{get(){throw Error('Legacy must not read V2 key');}});
    Object.defineProperty(legacyEnv,'GOOGLE_APPLICATION_CREDENTIALS',{get(){throw Error('No credential file is allowed');}});
    archive.openLegacy(path.join(legacyFolder,'prod-backup.enc'),path.join(directory,'legacy-reopened'),legacyEnv);
    compare(path.join(directory,'legacy-reopened'));
    return {archiveRoundtripVerified:true,copyContextPreserved:true,legacyFixtureRecovered:true,originChainVerified:true,foreignSameCandidateRejected:true,
      archiveCiphertextSha256:metadata.ciphertextSha256,codeHashes:archive.currentCodeHashes(),nodeVersion:process.version};
  } finally {
    const target=path.resolve(directory);
    if(path.dirname(target)!==parent||!path.basename(target).startsWith('lp-code-backup-proof-'))throw Error('Fixture cleanup target refused');
    fs.rmSync(target,{recursive:true,force:true});
  }
}
module.exports = { context, probe, archiveProbe };
if (require.main === module) {
  try {
    const destination = process.argv[2];
    if (!destination || process.argv.length !== 3) throw new Error("Destination invalide");
    const report = {...probe(process.env),...archiveProbe(process.env)};
    fs.mkdirSync(destination, { recursive: true });
    fs.writeFileSync(path.join(destination, "code-backup-key-check.json"), JSON.stringify(report, null, 2) + "\n", { flag: "wx" });
    console.log("Cle dediee controlee sur code fictif ; recuperation exacte, aucune cle exportee.");
  } catch {
    console.error("Controle de cle refuse ; aucun contenu de secret affiche.");
    process.exitCode = 1;
  }
}
