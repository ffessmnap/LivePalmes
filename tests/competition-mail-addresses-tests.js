"use strict";
require("./helpers/offline-network");
const assert=require("node:assert/strict"),mail=require("../functions/competition-mail-addresses");
const {page}=require("../functions/nap-notification-pages");
assert.deepEqual(mail.list(" A@example.org ; b@example.org;A@EXAMPLE.ORG ;"),["a@example.org","b@example.org"]);
assert.equal(mail.canonical(" A@example.org ; b@example.org "),"a@example.org;b@example.org");
for(const value of ["a@example.org;bad", "a@example.org,b@example.org", "a@example.org\r\nBcc:x@example.org", "x".repeat(256),{},"Name <a@example.org>"])
  assert.throws(()=>mail.list(value),TypeError);
assert.deepEqual(mail.list(""),[]);
class HttpsError extends Error { constructor(code,message){super(message);this.code=code;} }
assert.throws(()=>mail.payload({organizerEmail:"bad"},HttpsError),error=>error.code==="invalid-argument"&&/organisateur/.test(error.message));
const competition={id:"5140",napFingerprint:"stable",competitionType:"pool",organizerEmail:"org@example.org;shared@example.org",computerEmail:"info@example.org;SHARED@example.org",officialsManagerEmail:"judge1@example.org;judge2@example.org",officialsRequired:true};
assert.deepEqual(mail.copies(competition),["org@example.org","shared@example.org","info@example.org"]);
assert.deepEqual(mail.headers(competition,"entries_txt"),{});
assert.deepEqual(mail.headers(competition,"officials_pdf"),{});
assert.deepEqual(mail.headers(competition,"opening").replyTo,mail.copies(competition));
assert.match(mail.headers(competition,"opening").contactNotice,/Répondre/);
const many=Array.from({length:50},(_,i)=>`a${i}@b.c`);
assert.throws(()=>mail.copies({organizerEmail:many.slice(0,6).join(";"),computerEmail:many.slice(6,11).join(";")}),/10/);
(async()=>{
  const recipients=Array.from({length:1001},(_,i)=>({email:`club${i}@example.org`,clubId:String(i+1)}));
  const file={buffer:Buffer.from("fixture"),fileName:"fixture.pdf"};let pdfs=0;
  const services={simulation:true,recipients:async()=>recipients,select:(_,items)=>items,clubRecipients:items=>items,
    mail:(type,_,recipient,details)=>({type,clubId:recipient.clubId,...details}),
    entries:async()=>({source:"nap",entries:[{clubId:"1",teamLeaderComplete:true}],clubsById:new Map()}),hasParticipants:()=>true,
    clubPdf:async()=>{pdfs++;return file;},txt:async()=>file,officialsPdf:async()=>file};
  const opening=await page({kind:"opening",deliveryMode:"bcc-v1",cursor:""},competition,services);
  assert.equal(opening.jobs.length,22);assert.equal(opening.jobs[0].recipients.length,47);assert.equal(opening.nextCursor,"1000");
  assert.ok(opening.jobs.every(job=>job.recipients.length+job.cc.length<=50));
  assert.equal(opening.jobs[0].replyTo.length,3);
  const closed=await page({kind:"closure",phase:"clubs",deliveryMode:"bcc-v1",cursor:""},competition,services);
  assert.equal(pdfs,1);assert.equal(closed.jobs.length,1);assert.equal(closed.jobs[0].cc.length,3);
  const exports=await page({kind:"closure",phase:"exports",deliveryMode:"bcc-v1",cursor:""},competition,services);
  assert.equal(exports.jobs.length,2);assert.equal(exports.attachmentCount,2);
  assert.deepEqual(exports.jobs[0].recipients.map(item=>item.email),["info@example.org","shared@example.org"]);
  assert.deepEqual(exports.jobs[1].recipients.map(item=>item.email),["judge1@example.org","judge2@example.org"]);
  assert.ok(exports.jobs.every(job=>!job.cc),"technical documents keep their designated roles only");
  const crowded={...competition,organizerEmail:many.slice(0,5).join(";"),computerEmail:many.slice(5,10).join(";")};
  const maximum=Array.from({length:10000},(_,i)=>({email:`admin${i}@example.org`,clubId:"1"}));
  const bounded=await page({kind:"closure",phase:"clubs",deliveryMode:"bcc-v1",cursor:""},crowded,{...services,recipients:async()=>maximum});
  assert.equal(bounded.jobs.length,250);assert.ok(bounded.jobs.every(job=>job.cc.length+job.recipients.length===50));
  console.log("Competition contacts: semicolons, validation/deduplication, bounded CCI+CC groups, role-specific TXT/judges and single shared attachments passed offline.");
})().catch(error=>{console.error(error);process.exitCode=1;});
