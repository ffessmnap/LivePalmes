"use strict";
const assert=require('node:assert/strict');
const {page}=require('../functions/nap-notification-pages');
async function run(){
  const competition={id:'5162',napFingerprint:'stable',competitionType:'pool',computerEmail:'computer@example.org',officialsRequired:true,officialsManagerEmail:'official@example.org'};
  const entries=Array.from({length:6},(_,i)=>({clubId:String(i+1),updatedAt:'first-read',teamLeaderComplete:true,swimmers:[{}]}));
  const recipients=entries.map(entry=>({clubId:entry.clubId,email:`club${entry.clubId}@example.org`}));
  let pdf=0,txt=0,officials=0,reads=0;
  const file=()=>({buffer:Buffer.from('%PDF-test'),fileName:'test.pdf'});
  const services={simulation:true,recipients:async()=>recipients,select:(_kind,items)=>items,clubRecipients:items=>items,
    entries:async()=>{reads++;return {source:'nap',entries,clubsById:new Map([['1',{name:'club'}]])};},hasParticipants:()=>true,
    clubPdf:async()=>{pdf++;return file();},txt:async()=>{txt++;return {...file(),fileName:'test.txt'};},officialsPdf:async()=>{officials++;return file();},
    mail:(type,_competition,recipient,details)=>({type,email:recipient.email,...details})};
  const first=await page({kind:'closure',phase:'clubs',cursor:''},competition,services);
  assert.equal(first.jobs.length,5);assert.equal(first.attachmentCount,5);assert.equal(first.nextCursor,'5');assert.equal(pdf,5);assert.equal(reads,1);
  entries.forEach(entry=>entry.updatedAt='second-read');
  const second=await page({kind:'closure',phase:first.nextPhase,cursor:first.nextCursor,sourceHash:first.sourceHash},competition,services);
  assert.equal(second.jobs.length,1);assert.equal(second.nextPhase,'exports');assert.equal(second.sourceHash,first.sourceHash,'read timestamp is not sporting data');
  const exports=await page({kind:'closure',phase:'exports',cursor:'',sourceHash:second.sourceHash},competition,services);
  assert.equal(exports.jobs.length,2);assert.equal(txt,1);assert.equal(officials,1);assert.equal(exports.done,true);
  assert.equal(exports.jobs[0].attachments[0].size,9);assert.equal(exports.jobs[0].attachments[0].sha256.length,64);
  assert.ok(!Object.hasOwn(exports.jobs[0].attachments[0],'buffer'),'no file bytes retained in Firestore');
  await page({kind:'closure',phase:'exports',cursor:''},{...competition,competitionType:'openWater'},services);
  assert.equal(txt,1,'water TXT stays deferred');assert.equal(officials,2);
  entries[0].swimmers.push({});
  await assert.rejects(page({kind:'closure',phase:'clubs',cursor:'5',sourceHash:first.sourceHash},competition,services),/change/);
  assert.equal(pdf,6,'changed data stop before building more PDFs');
  await assert.rejects(page({kind:'opening',cursor:''},competition,{...services,simulation:false}),/TEST/);
  const docs=await page({kind:'documents',cursor:'',documentIds:['nap-34']},{...competition,clubDocuments:[{id:'nap-34',url:'https://example.org/document.pdf'}]},services);
  assert.equal(docs.jobs.length,6);assert.equal(docs.jobs[0].documents.length,1);assert.equal(docs.attachmentCount,0);
  await assert.rejects(page({kind:'documents',cursor:'',documentIds:['nap-missing']},{...competition,clubDocuments:[]},services),/Document/);
  const many=Array.from({length:51},(_,i)=>({email:`person${i}@example.org`}));
  const opening=await page({kind:'opening',cursor:''},competition,{...services,recipients:async()=>many});
  assert.equal(opening.jobs.length,50);assert.equal(opening.done,false);assert.equal(opening.nextCursor,'50');
  console.log('NAP notification pages: grouped native reads, bounded PDFs, stable pages, export policy and TEST guard passed.');
}
run().catch(error=>{console.error(error);process.exitCode=1;});
