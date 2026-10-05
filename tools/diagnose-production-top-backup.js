'use strict';
// Offline inspection only: no Firebase dependency or network request.
const fs=require('node:fs');
const path=require('node:path');
const readline=require('node:readline');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
async function main() {
  const dir=process.argv[2];
  const integrity=JSON.parse(fs.readFileSync(path.join(dir,'backup-integrity.json')));
  for(const [file,key] of [['planned-views.ndjson','planned'],['backup-views.ndjson','views']]) {
    assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(dir,file))).digest('hex'),integrity[key]);
  }
  const read=async(file,visit)=>{for await(const line of readline.createInterface({input:fs.createReadStream(path.join(dir,file)),crlfDelay:Infinity}))if(line.trim())visit(JSON.parse(line));};
  const planned=new Map(), keys=new Map();
  await read('planned-views.ndjson',v=>{planned.set(v.id,v.data);keys.set(v.data.bucketKey,v.id);});
  const extra=[];let oldCount=0;
  await read('backup-views.ndjson',v=>{
    oldCount++;
    if(!planned.has(v.id)) {
      const d=v.data;
      extra.push({id:v.id,bucketId:d.bucketId,bucketKey:d.bucketKey,course:d.course,sex:d.sex,category:d.category,seasonYear:d.seasonYear,regionId:d.regionId,rowCount:d.rowCount,rowsLength:Array.isArray(d.rows)?d.rows.length:null,rowsEncoding:d.rowsEncoding,fields:Object.keys(d).sort(),sameKeyPlannedId:keys.get(d.bucketKey)||null});
    }
  });
  console.log(JSON.stringify({backupRun:37276414186,oldCount,plannedCount:planned.size,extraCount:extra.length,extra},null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
