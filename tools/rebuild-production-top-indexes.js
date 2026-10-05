// Dedicated PROD operation. Sources are exported read-only; never copies TEST data.
// plan: prepare and back up; apply: replace derived views/files; verify: read back.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const readline = require('node:readline');
const { buildIndexes, topRows, encodePerformanceTopIndexRows } = require('./import-performance-seed-to-firestore');
const project = 'livepalmes';
const bucketName = 'livepalmes-public-data-718081132564';
const prefix = 'performance-public-firestore';
const collection = 'performanceTopViews';
const work = path.resolve('outputs/production-top-rebuild');
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
  assert.ok(becq, 'Cas Clément BECQ 200BI M Senior 2017 absent des sources PROD');
  const selected=[becq], seen=new Set([identity(becq[0])]);
  for(const rows of dual) {
    if(!seen.has(identity(rows[0]))) {selected.push(rows);seen.add(identity(rows[0]));}
    if(selected.length===4)break;
  }
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
function viewBatches(operations) {
  const batches=[]; let batch=[], bytes=0;
  for(const op of operations) {
    const size=Buffer.byteLength(JSON.stringify(op));
    if(batch.length && (batch.length>=100 || bytes+size>6000000)) {batches.push(batch);batch=[];bytes=0;}
    batch.push(op); bytes+=size;
  }
  if(batch.length)batches.push(batch);
  return batches;
}
async function eachConcurrent(items, action) {
  for(let i=0;i<items.length;i+=8)await Promise.all(items.slice(i,i+8).map(action));
}
async function* readLines(file) {
  for await(const line of readline.createInterface({input:fs.createReadStream(file),crlfDelay:Infinity}))if(line.trim())yield JSON.parse(line);
}
const canonicalHash = value => digest(JSON.stringify(value, (key,item) => item && typeof item==='object' && !Array.isArray(item) ? Object.fromEntries(Object.keys(item).sort().map(k=>[k,item[k]])) : item));
// Seven historical buckets identified in backup run 37276414186. Keep every
// document; only empty the two caches whose source categories already changed.
function completeHistoricalView(view, source, plannedIds, now) {
  const cases=new Map([
    ['100IS|M|M|2006|3',null],['50AP|M|M|2006|',null],
    ['50AP|M|M|0|3',null],['50AP|M|M|2006|3',null],['400IS|M|M|2006|3',null],
    ['800SF|M|J|2010|2',{id:'f976b045bba52843402682c20e1c3ee6662638c4',category:'S'}],
    ['800SF|M|C|2008|22',{id:'b1bc95086d071390937ce3f7cf27a7feb3c17577',category:'J'}]
  ]);
  const d=view.data;
  assert.ok(cases.has(d.bucketKey),`Vue historique inattendue ${view.id}`);
  assert.equal(view.id,digest(d.bucketKey).slice(0,40));
  assert.equal(d.bucketId,view.id);
  assert.equal([d.course,d.sex,d.category,Number(d.seasonYear)||0,d.regionId||''].join('|'),d.bucketKey);
  assert.ok(Array.isArray(d.rows)&&!d.rowsEncoding&&!d.rowsGzip,'Format historique inattendu');
  assert.ok(!source.some(r=>r.course===d.course&&r.sex===d.sex&&r.category===d.category&&(!d.seasonYear||Number(r.seasonYear)===d.seasonYear)&&(!d.regionId||r.regionId===d.regionId)),'Le bucket historique contient encore une source active');
  const correction=cases.get(d.bucketKey);
  if(!correction) {
    assert.equal(d.rowCount,0);assert.equal(d.rows.length,0);
    return view;
  }
  assert.equal(d.rowCount,1);assert.equal(d.rows.length,1);
  assert.equal(d.rows[0].performanceBaseId,correction.id);
  const current=source.find(r=>r.performanceBaseId===correction.id);
  assert.ok(current,'Source historique attendue absente');
  assert.equal(current.category,correction.category);
  for(const key of ['course','sex','seasonYear','regionId'])assert.equal(current[key],d[key]);
  const currentKey=[current.course,current.sex,current.category,current.seasonYear,current.regionId||''].join('|');
  assert.ok(plannedIds.has(digest(currentKey).slice(0,40)),'Nouvelle categorie absente du plan');
  return {id:view.id,data:{...d,rows:[],rowCount:0,sourceRowCount:0,updatedAt:now}};
}
async function main() {
  const mode=process.argv[2];
  assert.ok(['plan','apply','verify'].includes(mode));
  assert.equal(process.env.TARGET_FIREBASE_PROJECT,project);
  assert.equal(process.env.TARGET_PUBLIC_BUCKET,bucketName);
  assert.equal(process.env.PUBLIC_PREFIX,prefix);
  const credentials=json(process.env.PROD_CREDENTIAL_FILE);
  assert.equal(credentials.project_id,project);
  assert.equal(credentials.client_email,'github-actions-livepalmes-back@livepalmes.iam.gserviceaccount.com');
  assert.equal(process.env.CONFIRM_PRODUCTION_TOPS,'true');
  assert.equal(process.env.CANDIDATE_SHA,'58df08dd27a05880585ba68ce78f65a8c2ca47da');
  const {initializeApp,cert}=require('firebase-admin/app');
  const {getFirestore}=require('firebase-admin/firestore');
  const {getStorage}=require('firebase-admin/storage');
  const app=initializeApp({credential:cert(credentials),projectId:project});
  const db=getFirestore(app), bucket=getStorage(app).bucket(bucketName);
  const out=path.resolve(process.env.PUBLIC_OUT_DIR);
  const source=fs.readFileSync('outputs/performance-base-firestore-active.ndjson','utf8').trim().split('\n').map(JSON.parse);
  const readViews=async(action)=>{
    let count=0, cursor;
    for(;;) {
      let q=db.collection(collection).orderBy('__name__').limit(200);
      if(cursor)q=q.startAfter(cursor);
      const snap=await q.get(); if(snap.empty)break;
      for(const d of snap.docs)await action({id:d.id,data:d.data()});
      count+=snap.size; cursor=snap.docs.at(-1).id;
    }
    return count;
  };
  if(mode==='plan') {
    const now=new Date().toISOString();
    fs.mkdirSync(work,{recursive:true});
    const plannedFile=path.join(work,'planned-views.ndjson');
    fs.writeFileSync(plannedFile,'');
    let viewCount=0, compressedViews=0;
    const plannedIds=new Set();
    for(const b of buildIndexes(source).topBuckets.values()) {
      const rows=topRows([...b.bestBySwimmer.values()]);
      const data={bucketId:b.id,bucketKey:b.key,course:b.course,sex:b.sex,category:b.category,seasonYear:b.seasonYear,regionId:b.regionId,...encodePerformanceTopIndexRows(rows),rowCount:rows.length,updatedAt:now};
      assert.ok(Buffer.byteLength(JSON.stringify(data))<850000,`Bucket trop volumineux ${b.key}`);
      fs.appendFileSync(plannedFile,JSON.stringify({id:b.id,data})+'\n');
      plannedIds.add(b.id);
      viewCount+=1; if(data.rowsEncoding)compressedViews+=1;
    }
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
    await eachConcurrent([...oldNames], async (relative) => {
      const file=bucket.file(`${prefix}/${relative}`);
      const [metadata]=await file.getMetadata(); const [data]=await bucket.file(file.name,{generation:metadata.generation}).download();
      const dest=path.join(work,'backup-public',relative);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,data);
      backupFiles.push({relative,hash:digest(data),generation:metadata.generation,contentType:metadata.contentType,cacheControl:metadata.cacheControl});
    });
    const backupViews=path.join(work,'backup-views.ndjson');
    fs.writeFileSync(backupViews,'');
    await readViews(v=>fs.appendFileSync(backupViews,JSON.stringify(v)+'\n'));
    const historical=[];
    for await(const v of readLines(backupViews))if(!plannedIds.has(v.id)) {
      const completed=completeHistoricalView(v,source,plannedIds,now);
      fs.appendFileSync(plannedFile,JSON.stringify(completed)+'\n');
      plannedIds.add(v.id);viewCount++;
      historical.push({id:v.id,bucketKey:v.data.bucketKey,previousRows:v.data.rowCount,rows:completed.data.rowCount});
    }
    write(path.join(work,'backup-public.json'),backupFiles);
    assert.equal([...oldNames].filter(r=>!files.includes(r)).length,0,'Suppression de fichiers hors périmètre : arrêt avant écriture');
    write(path.join(work,'backup-integrity.json'),{views:digest(fs.readFileSync(backupViews)),planned:digest(fs.readFileSync(plannedFile)),public:digest(fs.readFileSync(path.join(work,'backup-public.json')))});
    write(path.join(work,'plan.json'),{project,bucketName,sourceHash:digest(fs.readFileSync('outputs/performance-base-firestore-active.ndjson')),viewCount,compressedViews,files:files.map(relative=>({relative,hash:digest(fs.readFileSync(path.join(out,relative)))})),stale:[...oldNames].filter(r=>!files.includes(r)),report});
    console.log(JSON.stringify({mode,views:viewCount,compressedViews,files:files.length,historical,report},null,2));
    return;
  }
  const plan=json(path.join(work,'plan.json'));
  assert.equal(plan.project,project);assert.equal(plan.bucketName,bucketName);
  assert.equal(plan.sourceHash,digest(fs.readFileSync('outputs/performance-base-firestore-active.ndjson')));
  if(mode==='apply') {
    for(const f of plan.files)assert.equal(digest(fs.readFileSync(path.join(out,f.relative))),f.hash);
    // Check the backups can be read before replacing anything.
    for(const f of json(path.join(work,'backup-public.json')))assert.equal(digest(fs.readFileSync(path.join(work,'backup-public',f.relative))),f.hash);
    const integrity=json(path.join(work,'backup-integrity.json'));
    assert.equal(digest(fs.readFileSync(path.join(work,'backup-views.ndjson'))),integrity.views);
    assert.equal(digest(fs.readFileSync(path.join(work,'planned-views.ndjson'))),integrity.planned);
    assert.equal(digest(fs.readFileSync(path.join(work,'backup-public.json'))),integrity.public);
    const previous=new Map();
    for await(const v of readLines(path.join(work,'backup-views.ndjson')))previous.set(v.id,canonicalHash(v.data));
    const plannedIds=new Set();
    for await(const v of readLines(path.join(work,'planned-views.ndjson')))plannedIds.add(v.id);
    assert.ok([...previous.keys()].every(id=>plannedIds.has(id)),'Suppression de vues hors périmètre : arrêt avant écriture');
    const backupPublic=new Map(json(path.join(work,'backup-public.json')).map(f=>[f.relative,f]));
    for(const f of backupPublic.values()) {
      const [metadata]=await bucket.file(`${prefix}/${f.relative}`).getMetadata();
      assert.equal(metadata.generation,f.generation,'Publication concurrente détectée avant écriture');
    }
    const ids=new Set();
    let pending=[], committed=0;
    const commitPending=async()=>{
      for(const part of viewBatches(pending)) {
        await db.runTransaction(async transaction => {
          const refs=part.map(op=>db.collection(collection).doc(op.id));
          const current=await transaction.getAll(...refs);
          for(let i=0;i<part.length;i++) {
            const op=part[i], before=current[i];
            assert.ok(op.data,'Aucune suppression autorisée');
            assert.equal(before.exists ? canonicalHash(before.data()) : undefined,previous.get(op.id),`Vue modifiée depuis la sauvegarde ${op.id}`);
          }
          part.forEach((op,i)=>transaction.set(refs[i],op.data));
        });
        committed+=part.length;
        if(committed%1000===0)console.log(`Vues TOP ecrites : ${committed}/${plan.viewCount}`);
      }
      pending=[];
    };
    for await(const v of readLines(path.join(work,'planned-views.ndjson'))) {
      ids.add(v.id); pending.push(v); if(pending.length>=100)await commitPending();
    }
    for await(const v of readLines(path.join(work,'backup-views.ndjson'))) {
      if(!ids.has(v.id))pending.push({id:v.id}); if(pending.length>=100)await commitPending();
    }
    await commitPending();
    // Version/manifest are published last. Other public files are untouched.
    const upload = f => bucket.upload(path.join(out,f.relative),{destination:`${prefix}/${f.relative}`,resumable:false,preconditionOpts:{ifGenerationMatch:backupPublic.get(f.relative)?.generation || 0},metadata:{contentType:f.relative.endsWith('.js')?'application/javascript; charset=utf-8':'application/json; charset=utf-8',cacheControl:['manifest.json','version.js'].includes(f.relative)?'public, max-age=300':'public, max-age=31536000, immutable'}});
    await eachConcurrent(plan.files.filter(f=>!['manifest.json','version.js'].includes(f.relative)),upload);
    for(const f of plan.files.filter(f=>['manifest.json','version.js'].includes(f.relative)))await upload(f);
    assert.equal(plan.stale.length,0);
  }
  const expected=new Map();
  for await(const v of readLines(path.join(work,'planned-views.ndjson')))expected.set(v.id,canonicalHash(v.data));
  const actualCount=await readViews(v=>assert.equal(canonicalHash(v.data),expected.get(v.id),`Vue divergente ${v.id}`));
  assert.equal(actualCount,plan.viewCount);
  const downloaded=new Map();
  await eachConcurrent(plan.files, async (f) => {const [data]=await bucket.file(`${prefix}/${f.relative}`).download();assert.equal(digest(data),f.hash);if(f.relative.endsWith('.json'))downloaded.set(f.relative,JSON.parse(data));});
  const report=validatePublic(source,r=>downloaded.get(`tops/${r}`),r=>downloaded.get(`tops-preview/${r}`));
  write(path.join(work,'verification.json'),{ok:true,project,views:actualCount,compressedViews:plan.compressedViews,files:plan.files.length,report});
  console.log(JSON.stringify({ok:true,mode,project,views:actualCount,compressedViews:plan.compressedViews,files:plan.files.length,report},null,2));
}
if(require.main===module)main().catch(error=>{console.error(error);process.exitCode=1;});
module.exports={validatePublic,viewBatches,completeHistoricalView};
