// TEST only. Sources are exported read-only by the publication workflow.
// plan: prepare and back up; apply: replace derived views/files; verify: read back.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { buildIndexes, topRows, publicRow } = require('./import-performance-seed-to-firestore');
const project = 'livepalmes-test';
const bucketName = 'livepalmes-test-public-data-206080168534';
const prefix = 'performance-public-firestore';
const collection = 'performanceTopViews';
const work = path.resolve('outputs/test-top-rebuild');
const identity = r => r.swimmerIdentityKey || r.swimmerId || r.swimmer;
const digest = data => crypto.createHash('sha256').update(data).digest('hex');
const json = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const write = (file, value) => { fs.mkdirSync(path.dirname(file), { recursive:true }); fs.writeFileSync(file, JSON.stringify(value)); };
function validatePublic(source, readTop, readPreview) {
  const groups = new Map();
  for (const r of source) {
    const key = [identity(r),r.course,r.sex,r.category,r.seasonYear,r.regionId].join('|');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  }
  const dual = [...groups.values()].filter(rows => rows.some(r=>r.pool==='25') && rows.some(r=>r.pool==='50'));
  const becq = dual.find(rows => rows[0].course==='200BI' && rows[0].category==='S' && rows[0].sex==='M' && Number(rows[0].seasonYear)===2017 && /BECQ/i.test(rows[0].lastName || rows[0].swimmer) && /CL[EÉ]MENT/i.test(rows[0].firstName || rows[0].swimmer));
  assert.ok(becq, 'Cas Clément BECQ 200BI M Senior 2017 absent des sources TEST');
  const selected = [becq, ...dual.filter(rows=>identity(rows[0])!==identity(becq[0])).filter((rows,i,all)=>all.findIndex(other=>identity(other[0])===identity(rows[0]))===i).slice(0,3)];
  const report = [];
  for (const rows of selected) {
    const r = rows[0];
    const relative = `${r.course}/${r.sex}-${String(r.category).replace(/\+/g,'')}.json`;
    const candidates = readTop(relative).filter(x=>identity(x)===identity(r) && Number(x.seasonYear)===Number(r.seasonYear) && (x.regionId||'')===(r.regionId||'') && x.category===r.category);
    const best = (list,pool) => list.filter(x=>!pool || x.pool===pool).sort((a,b)=>a.timeValue-b.timeValue || String(a.date).localeCompare(String(b.date)))[0];
    const results = {};
    for (const pool of ['25','50','']) {
      const expected=best(rows,pool), actual=best(candidates,pool);
      assert.ok(actual, `Candidat manquant ${r.swimmer} ${pool}`);
      assert.equal(actual.timeValue,expected.timeValue);
      assert.equal(actual.date,expected.date);
      results[pool || 'all']={timeValue:actual.timeValue,date:actual.date,location:actual.location};
    }
    if(rows===becq) {
      assert.equal(results['25'].timeValue,9028); assert.equal(results['25'].date,'2016-11-13');
      assert.equal(results['50'].timeValue,9413); assert.equal(results['50'].date,'2016-12-10');
      assert.match(results['50'].location || '',/rennes/i);
      assert.equal(results.all.timeValue,9028);
    }
    const preview=readPreview(relative);
    assert.equal(new Set(preview.map(identity)).size,preview.length,'Doublon nageur dans le preview');
    const distinct=new Set(readTop(relative).map(identity)).size;
    assert.equal(preview.length,Math.min(100,distinct));
    report.push({swimmer:r.swimmer,course:r.course,category:r.category,season:r.seasonYear,region:r.regionId,results,previewSwimmers:preview.length});
  }
  return report;
}
async function main() {
  const mode=process.argv[2];
  assert.ok(['plan','apply','verify'].includes(mode));
  assert.equal(process.env.TARGET_FIREBASE_PROJECT,project);
  assert.equal(process.env.TARGET_PUBLIC_BUCKET,bucketName);
  assert.equal(process.env.PUBLIC_PREFIX,prefix);
  const credentials=json(process.env.TEST_CREDENTIAL_FILE);
  assert.equal(credentials.project_id,project);
  const {initializeApp,cert}=require('firebase-admin/app');
  const {getFirestore}=require('firebase-admin/firestore');
  const {getStorage}=require('firebase-admin/storage');
  const app=initializeApp({credential:cert(credentials),projectId:project});
  const db=getFirestore(app), bucket=getStorage(app).bucket(bucketName);
  const out=path.resolve(process.env.PUBLIC_OUT_DIR);
  const source=fs.readFileSync('outputs/performance-base-firestore-active.ndjson','utf8').trim().split('\n').map(JSON.parse);
  const readViews=async()=>{
    const result=[]; let cursor;
    for(;;) {
      let q=db.collection(collection).orderBy('__name__').limit(200);
      if(cursor)q=q.startAfter(cursor);
      const snap=await q.get(); if(snap.empty)break;
      result.push(...snap.docs.map(d=>({id:d.id,data:d.data()}))); cursor=snap.docs.at(-1).id;
    }
    return result;
  };
  if(mode==='plan') {
    const now=new Date().toISOString();
    const views=[...buildIndexes(source).topBuckets.values()].map(b=>{
      const rows=topRows([...b.bestBySwimmer.values()]).map(publicRow);
      const data={bucketId:b.id,bucketKey:b.key,course:b.course,sex:b.sex,category:b.category,seasonYear:b.seasonYear,regionId:b.regionId,rows,rowCount:rows.length,updatedAt:now};
      assert.ok(Buffer.byteLength(JSON.stringify(data))<850000,`Bucket trop volumineux ${b.key}`);
      return {id:b.id,data};
    });
    const report=validatePublic(source,r=>json(path.join(out,'tops',r)),r=>json(path.join(out,'tops-preview',r)));
    const [oldManifest]=await bucket.file(`${prefix}/manifest.json`).download();
    const generated=json(path.join(out,'manifest.json'));
    const manifest={...JSON.parse(oldManifest),generatedAt:generated.generatedAt,lastTopRebuild:{generatedAt:generated.generatedAt,candidateKey:'swimmer-season-region-pool',sourceRows:source.length}};
    for(const k of ['topFiles','topCandidates','topPreviewFiles','topPreviewCandidates','topPreviewLimit','seasons','regions','courses','categories'])manifest[k]=generated[k];
    write(path.join(out,'manifest.json'),manifest);
    const files=[];
    for(const dir of ['tops','tops-preview'])for(const course of fs.readdirSync(path.join(out,dir)))for(const file of fs.readdirSync(path.join(out,dir,course)))files.push(`${dir}/${course}/${file}`);
    for(const relative of files.filter(r=>r.startsWith('tops/'))) {
      const all=json(path.join(out,relative)), preview=json(path.join(out,relative.replace('tops/','tops-preview/')));
      assert.equal(new Set(preview.map(identity)).size,preview.length);
      assert.equal(preview.length,Math.min(100,new Set(all.map(identity)).size));
    }
    files.push('manifest.json','version.js');
    const oldNames=new Set(['manifest.json','version.js']);
    for(const dir of ['tops/','tops-preview/']) {
      const [listed]=await bucket.getFiles({prefix:`${prefix}/${dir}`});
      listed.forEach(f=>oldNames.add(f.name.slice(prefix.length+1)));
    }
    const backupFiles=[];
    for(const relative of oldNames) {
      const file=bucket.file(`${prefix}/${relative}`);
      const [data]=await file.download(); const [metadata]=await file.getMetadata();
      const dest=path.join(work,'backup-public',relative);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,data);
      backupFiles.push({relative,hash:digest(data),contentType:metadata.contentType,cacheControl:metadata.cacheControl});
    }
    write(path.join(work,'backup-views.json'),await readViews());
    write(path.join(work,'backup-public.json'),backupFiles);
    write(path.join(work,'plan.json'),{project,bucketName,sourceHash:digest(fs.readFileSync('outputs/performance-base-firestore-active.ndjson')),views,files:files.map(relative=>({relative,hash:digest(fs.readFileSync(path.join(out,relative)))})),stale:[...oldNames].filter(r=>!files.includes(r)),report});
    console.log(JSON.stringify({mode,views:views.length,files:files.length,report},null,2));
    return;
  }
  const plan=json(path.join(work,'plan.json'));
  assert.equal(plan.project,project);assert.equal(plan.bucketName,bucketName);
  assert.equal(plan.sourceHash,digest(fs.readFileSync('outputs/performance-base-firestore-active.ndjson')));
  if(mode==='apply') {
    for(const f of plan.files)assert.equal(digest(fs.readFileSync(path.join(out,f.relative))),f.hash);
    // Check the backups can be read before replacing anything.
    const previous=json(path.join(work,'backup-views.json'));
    for(const f of json(path.join(work,'backup-public.json')))assert.equal(digest(fs.readFileSync(path.join(work,'backup-public',f.relative))),f.hash);
    const ids=new Set(plan.views.map(v=>v.id));
    const operations=[...plan.views.map(v=>({id:v.id,data:v.data})),...previous.filter(v=>!ids.has(v.id)).map(v=>({id:v.id}))];
    for(let i=0;i<operations.length;i+=100) {
      const batch=db.batch();for(const op of operations.slice(i,i+100)) {const ref=db.collection(collection).doc(op.id);if(op.data)batch.set(ref,op.data);else batch.delete(ref);}await batch.commit();
    }
    // Version/manifest are published last. Other public files are untouched.
    for(const f of plan.files)await bucket.upload(path.join(out,f.relative),{destination:`${prefix}/${f.relative}`,resumable:false,metadata:{contentType:f.relative.endsWith('.js')?'application/javascript; charset=utf-8':'application/json; charset=utf-8',cacheControl:['manifest.json','version.js'].includes(f.relative)?'public, max-age=300':'public, max-age=31536000, immutable'}});
    for(const relative of plan.stale)await bucket.file(`${prefix}/${relative}`).delete({ignoreNotFound:true});
  }
  const actual=new Map((await readViews()).map(v=>[v.id,v.data]));
  assert.equal(actual.size,plan.views.length);
  for(const v of plan.views)assert.deepEqual(actual.get(v.id),v.data);
  const downloaded=new Map();
  for(const f of plan.files) {const [data]=await bucket.file(`${prefix}/${f.relative}`).download();assert.equal(digest(data),f.hash);if(f.relative.endsWith('.json'))downloaded.set(f.relative,JSON.parse(data));}
  const report=validatePublic(source,r=>downloaded.get(`tops/${r}`),r=>downloaded.get(`tops-preview/${r}`));
  write(path.join(work,'verification.json'),{ok:true,project,views:actual.size,files:plan.files.length,report});
  console.log(JSON.stringify({ok:true,mode,project,views:actual.size,files:plan.files.length,report},null,2));
}
if(require.main===module)main().catch(error=>{console.error(error);process.exitCode=1;});
module.exports={validatePublic};
