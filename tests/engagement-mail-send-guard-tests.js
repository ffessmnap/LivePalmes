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
  const transport={sendMail:async payload=>{sent++;assert.equal(payload.to,sandbox.ENVIRONMENT.projectId==='livepalmes-test'?control.TEST_ADDRESS:'club@example.org');if(sandbox.ENVIRONMENT.projectId==='livepalmes-test')assert.match(payload.subject,/^\[TEST LivePalmes\]/);else assert.equal(payload.subject,'Competition');return {messageId:'test'};}};
  const doc={id:'mail',ref:{set:async patch=>{job={...job,...patch};}},data:()=>job};
  const fresh=()=>({toEmail:'club@example.org',subject:'Competition',textBody:'Message',createdAt:'2026-10-09T12:00:00.000Z'});
  job=fresh();assert.equal((await sandbox.sendEngagementMailJob(transport,doc,{fromEmail:control.TEST_ADDRESS},{uid:'national'})).status,'sent');assert.equal(sent,1);
  enabled=false;job=fresh();assert.equal((await sandbox.sendEngagementMailJob(transport,doc,{fromEmail:control.TEST_ADDRESS},{})).status,'cancelled');assert.equal(sent,1);
  enabled=true;cancelDuringDownload=true;job=fresh();
  assert.equal((await sandbox.sendEngagementMailJob(transport,doc,{fromEmail:control.TEST_ADDRESS},{})).status,'cancelled');assert.equal(sent,1,'A switch-off during attachment loading is checked before SMTP.');
  sandbox.ENVIRONMENT.projectId='livepalmes';cancelDuringDownload=false;enabled=true;job=fresh();
  assert.equal((await sandbox.sendEngagementMailJob(transport,doc,{fromEmail:control.TEST_ADDRESS},{})).status,'sent');assert.equal(sent,2);
  enabled=false;job=fresh();
  assert.equal((await sandbox.sendEngagementMailJob(transport,doc,{fromEmail:control.TEST_ADDRESS},{})).status,'cancelled');assert.equal(sent,2);
  enabled=true;job={...fresh(),createdAt:'2025-12-31T23:59:59.000Z'};
  assert.equal((await sandbox.sendEngagementMailJob(transport,doc,{fromEmail:control.TEST_ADDRESS},{})).status,'cancelled');assert.equal(sent,2);
  enabled=true;cancelDuringDownload=true;job=fresh();
  assert.equal((await sandbox.sendEngagementMailJob(transport,doc,{fromEmail:control.TEST_ADDRESS},{})).status,'cancelled');assert.equal(sent,2);
  console.log('Actual mail sender: TEST/PROD recipients, subject, late kill switch and no catch-up verified without network.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
