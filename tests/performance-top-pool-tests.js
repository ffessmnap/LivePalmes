const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const { buildIndexes, topRows, encodePerformanceTopIndexRows, readPerformanceTopIndexRows } = require('../tools/import-performance-seed-to-firestore');
const { checkPerformancePublicConsistency } = require('../tools/performance-public-consistency');
const { validatePublic, viewBatches } = require('../tools/rebuild-test-top-indexes');
const { distinctTopPreview } = require('../tools/performance-top-preview');
assert.equal(viewBatches(Array.from({length:101},(_,id)=>({id}))).length,2);
assert.equal(viewBatches(Array.from({length:10},(_,id)=>({id,data:'x'.repeat(800000)}))).length,2);
const root = path.resolve(__dirname, '..');
function extract(file, names, context = {}) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  const code = names.map(name => {
    const match = source.match(new RegExp(`(^[ \\t]*)function ${name}\\([^]*?^\\1\\}`, 'm'));
    assert.ok(match, name);
    return match[0];
  }).join('\n');
  vm.createContext(context); vm.runInContext(code, context); return context;
}
const key = r => r.swimmerIdentityKey || r.swimmerId;
const cleanText = v => String(v || '').trim();
const backend = extract('functions/index.js', ['encodePerformanceTopIndexRows','readPerformanceTopIndexRows','publicTopIndexRow','bestTopRows','publicPerformanceTopCandidateKey','mergePublicTopRows','sortPublicTopRows','distinctPublicTopPreview'], {
  require, Buffer, cleanText, publicSwimmerKey:key, normalizeCategoryCode:cleanText, performanceCategoryFromRow:r=>r.category, cleanFirestoreValue:r=>r, categoryCodeFromCategory:c=>c, CATEGORY_LABELS:{}, publicPerformanceTopRow:r=>r,
  performancePublicKey:r=>r.id, PERFORMANCE_TOP_INDEX_LIMIT:500,
  publicBetterPerformance:(a,b)=>!b || a.timeValue < b.timeValue || (a.timeValue === b.timeValue && a.date < b.date)
});
const base = { swimmerId:'test', swimmerIdentityKey:'TEST|ALICE|1990-01-01', swimmer:'Alice TEST', firstName:'Alice', lastName:'TEST', birthDate:'1990-01-01', course:'200BI', category:'S', sex:'M', seasonYear:2017, regionId:'IDF', status:'active', active:true, source:'test' };
const make = (id,pool,timeValue,date='2016-11-13')=>({...base,id,publicKey:id,pool,timeValue,time:String(timeValue),date});
const rows=[make('25','25',9028),make('50','50',9413,'2016-12-10'),make('25-slow','25',9999),make('50-slow','50',9998)];
const validationRows=rows.slice(0,2).map(r=>({...r,swimmer:'Clément BECQ',lastName:'BECQ',firstName:'Clément',location:r.pool==='50'?'Rennes':'Villeneuve-Saint-Georges'}));
assert.equal(validatePublic(validationRows,()=>validationRows,()=>[validationRows[0]]).length,1);
assert.throws(()=>validatePublic(validationRows,()=>[validationRows[0]],()=>[validationRows[0]]));
assert.throws(()=>validatePublic(validationRows,()=>validationRows,()=>validationRows));
let data=rows;
const ui=extract('performances/public/tops.js',['performancePool','betterPerformance','matchingRowsForFilters','rowsForFilters'], {
  topBucketsForFilters:()=>[{}],bucketKey:()=>'',bucketRows:new Map([['',data]]),additionalRows:[],performanceCorrections:[],rowFromCorrection:r=>r,correctedRows:r=>r,rowSwimmerKey:key,birthYearLabel:d=>String(d).slice(0,4)
});
function checkFilters(candidates) {
 ui.bucketRows.set('',candidates);
 for (const [pool,id] of [['25','25'],['50','50'],['','25']]) {
  const result=ui.rowsForFilters({course:'200BI',sex:'M',category:'S',season:2017,region:'IDF',pool,limit:25});
  assert.equal(result.length,1); assert.equal(result[0].id,id);
 }
 assert.equal(ui.rowsForFilters({course:'200BI',sex:'M',category:'S',season:2018,region:'IDF'}).length,0);
 assert.equal(ui.rowsForFilters({course:'200BI',sex:'M',category:'C',season:2017}).length,0);
 assert.equal(ui.rowsForFilters({course:'200BI',sex:'M',category:'S',region:'OTHER'}).length,0);
}
checkFilters(backend.bestTopRows(rows));
const largeRows=rows.map(r=>({...r,competition:'A'.repeat(240000)}));
for(const encode of [encodePerformanceTopIndexRows,backend.encodePerformanceTopIndexRows]) {
 const packed=encode(largeRows);
 assert.equal(packed.rowsEncoding,'gzip-base64-v1');
 assert.deepEqual(JSON.parse(JSON.stringify(readPerformanceTopIndexRows(packed))),largeRows);
 assert.deepEqual(JSON.parse(JSON.stringify(backend.readPerformanceTopIndexRows(packed))),largeRows);
 checkFilters(backend.bestTopRows(backend.readPerformanceTopIndexRows(packed)));
}
assert.deepEqual(readPerformanceTopIndexRows({rows}),rows);
assert.throws(()=>readPerformanceTopIndexRows({rowsEncoding:'unknown'}));

const depth=Array.from({length:501},(_,i)=>[...rows.slice(0,2)].map(r=>({...r, id:`${r.id}-depth-${i}`, publicKey:`${r.id}-depth-${i}`, swimmerIdentityKey:`depth-${i}`, timeValue:r.timeValue+i}))).flat();
for(const result of [backend.bestTopRows(depth),topRows(depth)]) {
 assert.equal(result.filter(r=>r.pool==='25').length,500);
 assert.equal(result.filter(r=>r.pool==='50').length,500);
}
checkFilters(backend.mergePublicTopRows(rows.slice(0,2),rows.slice(2)));
for(const b of buildIndexes(rows).topBuckets.values()) checkFilters(topRows([...b.bestBySwimmer.values()]));
const crowded=Array.from({length:130},(_,i)=>[...rows].map(r=>({...r,id:`${r.id}-${i}`,publicKey:`${r.id}-${i}`,swimmerId:`s${i}`,swimmerIdentityKey:`s${i}`,timeValue:r.timeValue+i*100}))).flat();
assert.equal(new Set(distinctTopPreview(crowded.sort((a,b)=>a.timeValue-b.timeValue),100,key).map(key)).size,100);
assert.equal(new Set(backend.distinctPublicTopPreview(crowded,100,key).map(key)).size,100);
(async()=>{
 fs.mkdirSync(path.join(root,'outputs'),{recursive:true});
 const dir=fs.mkdtempSync(path.join(root,'outputs','test-top-pools-'));
 try {
  const seed=path.join(dir,'seed.ndjson'),out=path.join(dir,'public');
  fs.writeFileSync(seed,rows.map(r=>JSON.stringify(r)).join('\n'));
  execFileSync(process.execPath,['tools/build-public-performance-files.js','--seed',seed,'--out-dir',out],{cwd:root,stdio:'pipe'});
  const topFile=path.join(out,'tops/200BI/M-S.json');
  const generated=JSON.parse(fs.readFileSync(topFile));
  checkFilters(generated);
  assert.equal(generated.length,2);
  assert.equal((await checkPerformancePublicConsistency({seedPath:seed,outDir:out})).ok,true);
  fs.writeFileSync(topFile,JSON.stringify(generated.filter(r=>r.pool==='25')));
  assert.equal((await checkPerformancePublicConsistency({seedPath:seed,outDir:out})).ok,false,'Missing 50m candidate must fail consistency');
  fs.writeFileSync(seed,crowded.map(r=>JSON.stringify(r)).join('\n'));
  execFileSync(process.execPath,['tools/build-public-performance-files.js','--seed',seed,'--out-dir',out],{cwd:root,stdio:'pipe'});
  const preview=JSON.parse(fs.readFileSync(path.join(out,'tops-preview/200BI/M-S.json')));
  ui.bucketRows.set('',preview);
  assert.equal(ui.rowsForFilters({course:'200BI',sex:'M',category:'S',limit:25}).length,25);
  assert.equal(new Set(preview.map(key)).size,100);
  console.log('TOP pools: generator, consistency, Firestore/incremental builders, browser filters and distinct preview OK');
 } finally { fs.rmSync(dir,{recursive:true,force:true}); }
})().catch(e=>{console.error(e);process.exitCode=1;});
