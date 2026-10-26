"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm"),{createHash}=require("node:crypto");
const archive=require("../functions/nap-import-private-text");
const {fixture:writerFixture,input}=require("./nap-import-write-tests");
const {zipFixture}=require("./nap-import-zip-write-tests");
const {prepareImportOperation}=require("../functions/nap-import-operation-plan");
const source=fs.readFileSync("functions/index.js","utf8");
const bytes=Buffer.from("REN;11/10/2026;Comp\xe9tition;Ville\r\nNAG;TEST;PERSONNE",'latin1'),rawText=new TextDecoder('windows-1252').decode(bytes);
const textArchive={fileName:'Resultats.txt',encoding:'windows-1252',dataBase64:bytes.toString('base64')};
const saved=archive.create({rawText,textArchive});
function reader({level=1,region=1,active=false,missing=false,old=false}={}){
 const calls=[];return {calls,pool:{execute:async({sql},values)=>{calls.push({sql,values});assert.match(sql,/^SELECT/);if(sql.includes('FROM competitions'))return [[{id:5162,comite:region,niveau:level}]];if(sql.startsWith('SELECT metadata'))return [[{metadata:{currentImportId:'a'.repeat(64),...(active?{activeImportId:'b'.repeat(64)}:{})}}]];assert.match(sql,/JSON_EXTRACT\(metadata,'\$\.sourceText'\).*WHERE id=\? AND competition_id=\? LIMIT 1$/);return [missing?[]:[{status:'completed',source_text:old?null:JSON.stringify(saved)}]];}}};
}
class HttpsError extends Error{constructor(code,message){super(message);this.code=code;}}
function callable({national=false,region=false,regionId='',inactive=false}={}){
 const r=reader(),trace=[];
 const context={exports:{},CALLABLE_OPTIONS:{},ENVIRONMENT:{sportingDataSource:'nap'},defineSecret:()=>{},onCall:(_,fn)=>fn,HttpsError,process:{env:{}},
 engagementAccessContext:async request=>{trace.push('auth');if(!request.auth?.uid||inactive)throw new HttpsError('permission-denied','denied');return {national,region,regionId};},
 nativePerformanceFailure:error=>error,require:name=>{if(name==='./nap-import-private-text')return archive;if(name==='./nap-portal-swimmers')return {portalPool:()=>{trace.push('pool');return r.pool;}};throw Error(name);},
 isNationalOnlyEngagementCompetitionLevel:level=>['national','international'].includes(level),engagementRegionsMatch:(a,b)=>a===b};
 const guardStart=source.indexOf('function assertCanManageEngagementCompetition('),guardEnd=source.indexOf('\nfunction engagementParisIsoDate',guardStart);vm.runInNewContext(source.slice(guardStart,guardEnd),context);
 const start=source.indexOf('exports.getEngagementCompetition = onCall('),end=source.indexOf('  const competitionId = cleanText(',start);vm.runInNewContext(source.slice(start,end)+'});',context);
 return {...r,trace,run:data=>context.exports.getEngagementCompetition({auth:{uid:'user'},data:{action:'import-source',competitionId:5162,...data}})};
}
(async()=>{
 assert.deepEqual(Buffer.from(archive.restore(saved).dataBase64,'base64'),bytes,'Original CRLF, accents and Windows-1252 bytes retained');assert.equal(saved.compression,'gzip');assert.equal(saved.hash,createHash('sha256').update(bytes).digest('hex'));
 assert.throws(()=>archive.create({rawText:'different',textArchive}),/diffère/);assert.throws(()=>archive.create({rawText,textArchive:{...textArchive,fileName:'../x.txt'}}),/invalide/);assert.throws(()=>archive.create({rawText,textArchive:{...textArchive,dataBase64:'@@=='}}),/invalide/);assert.throws(()=>archive.restore({...saved,hash:'0'.repeat(64)}),/empreinte/);
 const large=Buffer.alloc(5*1024*1024,65);assert.equal(archive.restore(archive.create({rawText:large.toString(),textArchive:{fileName:'large.txt',encoding:'utf-8',dataBase64:large.toString('base64')}})).size,large.length);assert.throws(()=>archive.create({rawText:'x'.repeat(5*1024*1024+1)}),/invalide/);
 let f=writerFixture();await f.writer({data:{...input,rawText,textArchive}});const metadata=JSON.parse(f.state.journal.metadata);assert.deepEqual(Buffer.from(archive.restore(metadata.sourceText).dataBase64,'base64'),bytes);assert.equal(f.state.pointer.textManifest.hash,saved.hash);assert.equal(f.state.pointer.sourceText,undefined,'Pointer carries metadata only');
 f=writerFixture({lost:'insert'});await assert.rejects(()=>f.writer({data:{...input,rawText,textArchive}}));await f.writer({data:{resumeImportId:f.state.pointer.activeImportId}});assert.deepEqual(Buffer.from(archive.restore(JSON.parse(f.state.journal.metadata).sourceText).dataBase64,'base64'),bytes);assert.equal(f.state.writes,2);
 const oldText={...archive.manifest(saved),hash:'0'.repeat(64)},z=zipFixture();z.pack.existingText=oldText;z.state.pointer={currentImportId:'c'.repeat(64),textManifest:oldText};Object.assign(z.data,{rawText,textArchive,textManifest:archive.manifest(saved)});await z.writer({data:z.data});assert.equal(z.state.pointer.textManifest.hash,saved.hash);assert.equal(z.pdfState.documents.length,1,'TXT never enters the public document list');assert.deepEqual(Buffer.from(archive.restore(JSON.parse(z.state.journal.metadata).sourceText).dataBase64,'base64'),bytes);
 const unchanged=structuredClone(z.pack);unchanged.incoming[0].row={...unchanged.existing[0]};delete unchanged.incoming[0].row.id;
 assert.throws(()=>prepareImportOperation(unchanged,{perfs:1000,relays:100},{...z.data,confirmReplacement:false}),/bilan/,'TXT-only change requires approval even with identical sporting results');
 const stale=zipFixture();stale.state.pointer={textManifest:oldText};await assert.rejects(()=>stale.writer({data:stale.data}),/TXT.*changé/);assert.equal(stale.state.writes,0);
 let r=reader();const result=await archive.readCurrent(r.pool,'legacy-nap-5162',event=>{assert.equal(event.regionId,'1');assert.equal(event.level,'regional');});assert.equal(result.file.hash,saved.hash);assert.equal(r.calls.length,3);assert.deepEqual(r.calls.at(-1).values,['a'.repeat(64),5162]);
 r=reader();await assert.rejects(()=>archive.readCurrent(r.pool,5162,()=>{throw Error('foreign scope');}),/foreign/);assert.equal(r.calls.length,1,'No pointer or content before scope authorization');
 r=reader({active:true});await assert.rejects(()=>archive.readCurrent(r.pool,5162,()=>{}),/en cours/);assert.equal(r.calls.length,2);
 r=reader({old:true});assert.equal((await archive.readCurrent(r.pool,5162,()=>{})).file,null);
 let c=callable({national:true});assert.equal((await c.run()).file.hash,saved.hash);c=callable({region:true,regionId:'1'});assert.equal((await c.run()).file.hash,saved.hash);
 c=callable({region:true,regionId:'2'});await assert.rejects(()=>c.run(),e=>e.code==='permission-denied');assert.equal(c.calls.length,1);
 for(const options of [{},{region:true},{inactive:true,national:true}]){c=callable(options);await assert.rejects(()=>c.run(),e=>e.code==='permission-denied');assert.equal(c.calls.length,0,'Club, no scope and disabled account denied before NAP');}
 c=callable({national:true});await assert.rejects(()=>c.run({action:'delete'}),e=>e.code==='invalid-argument');assert.equal(c.calls.length,0,'No deletion action');
 c=callable({region:true,regionId:'1'});const execute=c.pool.execute;c.pool.execute=async(query,values)=>{const result=await execute(query,values);if(query.sql.includes('FROM competitions'))result[0][0].niveau=2;return result;};await assert.rejects(()=>c.run(),e=>e.code==='permission-denied');assert.equal(c.calls.length,1,'National-level competitions keep existing national-only scope');
 console.log('Private TXT: exact source bytes/encoding/hash, 5 MB bound, journal and pointer replacement, interrupted writer recovery, 3 indexed SELECTs, national/regional scope, club/inactive/foreign/no-scope denial, current import only and no deletion; all simulated.');
})().catch(error=>{console.error(error);process.exitCode=1;});
