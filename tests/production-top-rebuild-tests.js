'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const {completeHistoricalView}=require('../tools/rebuild-production-top-indexes');
const hash=s=>require('node:crypto').createHash('sha256').update(s).digest('hex').slice(0,40);
const historic=(key,rows)=>{const [course,sex,category,season,regionId]=key.split('|');const id=hash(key);return {id,data:{bucketId:id,bucketKey:key,course,sex,category,seasonYear:Number(season),regionId,rows,rowCount:rows.length,updatedAt:'before'}};};
const movedSource={performanceBaseId:'f976b045bba52843402682c20e1c3ee6662638c4',course:'800SF',sex:'M',category:'S',seasonYear:2010,regionId:'2'};
const old=historic('800SF|M|J|2010|2',[{performanceBaseId:movedSource.performanceBaseId}]);
const targetIds=new Set([hash('800SF|M|S|2010|2')]);
const result=completeHistoricalView(old,[movedSource],targetIds,'now');
assert.equal(result.id,old.id);assert.equal(result.data.rowCount,0);assert.deepEqual(result.data.rows,[]);
assert.equal(old.data.rows.length,1,'Le diagnostic ne mute pas la sauvegarde');
assert.equal(movedSource.category,'S','La source reste intacte');
const empty=historic('50AP|M|M|2006|',[]);
assert.deepEqual(completeHistoricalView(empty,[],new Set(),'now'),empty);
assert.throws(()=>completeHistoricalView(historic('100SF|M|S|2026|',[]),[],new Set(),'now'),/inattendue/);
assert.throws(()=>completeHistoricalView(old,[{...movedSource,category:'J'}],targetIds,'now'),/source active/);
assert.throws(()=>completeHistoricalView(old,[],targetIds,'now'),/Source historique/);
assert.throws(()=>completeHistoricalView(old,[movedSource],new Set(),'now'),/categorie absente/);
assert.throws(()=>completeHistoricalView({...old,data:{...old.data,rows:[{performanceBaseId:'unexpected'}]}},[movedSource],targetIds,'now'));
assert.throws(()=>completeHistoricalView({...empty,data:{...empty.data,rows:[{}],rowCount:1}},[],new Set(),'now'));
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'top-prod-guards-'));
const credential=path.join(dir,'credential.json');
fs.writeFileSync(credential,JSON.stringify({project_id:'livepalmes',client_email:'github-actions-livepalmes-back@livepalmes.iam.gserviceaccount.com'}));
const valid={TARGET_FIREBASE_PROJECT:'livepalmes',TARGET_PUBLIC_BUCKET:'livepalmes-public-data-718081132564',PUBLIC_PREFIX:'performance-public-firestore',PROD_CREDENTIAL_FILE:credential,CONFIRM_PRODUCTION_TOPS:'true',CANDIDATE_SHA:'58df08dd27a05880585ba68ce78f65a8c2ca47da'};
try {
  for(const [key,value] of Object.entries({TARGET_FIREBASE_PROJECT:'livepalmes-test',TARGET_PUBLIC_BUCKET:'other',PUBLIC_PREFIX:'other',CONFIRM_PRODUCTION_TOPS:'false',CANDIDATE_SHA:'other'})) {
    const r=spawnSync(process.execPath,['tools/rebuild-production-top-indexes.js','apply'],{env:{...process.env,...valid,[key]:value},encoding:'utf8'});
    assert.notEqual(r.status,0,key);
    assert.match(r.stderr,/AssertionError/,key);
    assert.doesNotMatch(r.stderr,/firebase-admin|credential.*invalid/i,'Doit refuser avant de charger Firebase');
  }
  fs.writeFileSync(credential,JSON.stringify({project_id:'livepalmes-test',client_email:'other'}));
  const r=spawnSync(process.execPath,['tools/rebuild-production-top-indexes.js','apply'],{env:{...process.env,...valid},encoding:'utf8'});
  assert.notEqual(r.status,0);assert.match(r.stderr,/AssertionError/);
  const script=fs.readFileSync('tools/rebuild-production-top-indexes.js','utf8');
  assert.doesNotMatch(script,/batch\.delete|\.delete\(/);
  assert.match(script,/ifGenerationMatch/);
  assert.match(script,/Vue modifiée depuis la sauvegarde/);
  const workflow=fs.readFileSync('.github/workflows/livepalmes-production-rebuild-tops.yml','utf8');
  assert.ok(workflow.indexOf('name: production-top-backup')<workflow.indexOf('rebuild-production-top-indexes.js apply'));
  assert.match(workflow,/diff -qr/);
  assert.match(workflow,/github.run_attempt == 1/);
  assert.doesNotMatch(workflow,/firebase deploy|gcloud firestore.*import/);
  console.log('Garde-fous reconstruction TOP PROD : OK');
} finally {fs.rmSync(dir,{recursive:true,force:true});}
