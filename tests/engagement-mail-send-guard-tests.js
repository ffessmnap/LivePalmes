"use strict";
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),control=require('../functions/engagement-mail-control');
const source=fs.readFileSync(require.resolve('../functions/index.js'),'utf8');
const start=source.indexOf('async function sendEngagementMailJob('),end=source.indexOf('\nfunction cleanEngagementClubPerson(',start);
assert.ok(start>0&&end>start);
async function main(){
  let enabled=true,sent=0,cancelDuringDownload=false,job;
  const sandbox={Date,OPTIONAL_COMPETITION_MAIL_TYPES:new Set(),ENVIRONMENT:{sportingDataSource:"nap",projectId:'livepalmes-test'},
    cleanText:value=>String(value||''),normalizeEmail:value=>String(value||'').toLowerCase(),cleanFirestoreValue:value=>value,
    livePalmesMailHtml:text=>`<p>${text}</p>`,engagementMailJobItemFromData:data=>data,
    engagementMailAttachments:async()=>{if(cancelDuringDownload)enabled=false;return [];},
    db:{collection:name=>{assert.equal(name,control.COLLECTION);return {doc:id=>{assert.equal(id,control.DOCUMENT);return {get:async()=>({data:()=>({enabled,enabledSince:'2026-01-01T00:00:00.000Z'})})};}};}},
    require:name=>{assert.equal(name,'./engagement-mail-control');return control;}};
  vm.runInNewContext(source.slice(start,end),sandbox);
  const transport={sendMail:async payload=>{sent++;assert.equal(payload.to,control.TEST_ADDRESS);assert.match(payload.subject,/^\[TEST LivePalmes\]/);return {messageId:'test'};}};
  const doc={id:'mail',ref:{set:async patch=>{job={...job,...patch};}},data:()=>job};
  const fresh=()=>({toEmail:'club@example.org',subject:'Competition',textBody:'Message',createdAt:'2026-10-09T12:00:00.000Z'});
  job=fresh();assert.equal((await sandbox.sendEngagementMailJob(transport,doc,{fromEmail:control.TEST_ADDRESS},{uid:'national'})).status,'sent');assert.equal(sent,1);
  enabled=false;job=fresh();assert.equal((await sandbox.sendEngagementMailJob(transport,doc,{fromEmail:control.TEST_ADDRESS},{})).status,'cancelled');assert.equal(sent,1);
  enabled=true;cancelDuringDownload=true;job=fresh();
  assert.equal((await sandbox.sendEngagementMailJob(transport,doc,{fromEmail:control.TEST_ADDRESS},{})).status,'cancelled');assert.equal(sent,1,'A switch-off during attachment loading is checked before SMTP.');
  console.log('Actual mail sender: fresh server kill switch, late switch-off, TEST recipient and subject verified without network.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
