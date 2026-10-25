"use strict";
// Established PDF/TXT builders. Preview retains manifests only; real delivery
// delegates private attachment persistence to the explicitly gated adapter.
const {createHash}=require('node:crypto');
const {hash}=require('./nap-notification-automation');
function manifest(file,contentType){
  if(!Buffer.isBuffer(file?.buffer)||file.buffer.length>10000000)throw new RangeError('Piece jointe indisponible ou trop volumineuse.');
  return {fileName:file.fileName,contentType,size:file.buffer.length,sha256:createHash('sha256').update(file.buffer).digest('hex')};
}
function cursor(value,maximum){
  if(value!==''&&!/^\d+$/.test(String(value)))throw new TypeError('Avancement de notification invalide.');
  const result=Number(value||0);
  if(!Number.isSafeInteger(result)||result<0||result>maximum)throw new TypeError('Avancement de notification invalide.');
  return result;
}
async function page(event,competition,services){
  if(services.simulation!==true && typeof services.persistAttachment!=='function')throw new TypeError('Preparation native reservee au TEST sans envoi.');
  async function attachment(file,contentType){
    const metadata=manifest(file,contentType);
    return services.simulation===true?metadata:services.persistAttachment(event,file,metadata);
  }
  const recipients=await services.recipients();
  const control=require('./engagement-mail-control');
  const setting=services.mailSetting?await services.mailSetting():{scope:'all'};
  if(!Array.isArray(recipients)||recipients.length>10000)throw new RangeError('Annuaire de notifications trop volumineux.');
  const grouped=event.deliveryMode==='bcc-v1';
  function mails(kind,selected,details){
    if(!grouped)return selected.map(recipient=>services.mail(kind,competition,recipient,details));
    const result=[];
    if(selected.some(recipient=>!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(recipient.email||''))))throw new TypeError('Adresse de destinataire invalide.');
    for(let offset=0;offset<selected.length;offset+=50){
      const batch=selected.slice(offset,offset+50),payload=services.mail(kind,competition,batch[0],details);
      result.push({...payload,clubId:kind==='club_recap'?payload.clubId:'',toEmail:'',recipientUid:'',recipients:batch.map(recipient=>({
        uid:String(recipient.uid||''),email:String(recipient.email).trim().toLowerCase(),clubId:String(recipient.clubId||''),
        recipientRegionId:String(recipient.napClubRegionId||'')
      })),deliveryMode:'bcc-v1'});
    }
    return result;
  }
  if(event.kind==='opening'||event.kind==='documents'){
    const selected=services.select(event.kind,recipients,competition,event).filter(recipient=>control.clubAllowed(setting,recipient));
    const documents=event.kind==='documents'?(competition.clubDocuments||[]).filter(document=>event.documentIds.includes(String(document.id))):[];
    if(event.kind==='documents'&&documents.length!==new Set(event.documentIds).size&&!grouped)throw new TypeError('Document supprime ou inaccessible : reprenez la notification.');
    if(grouped&&event.kind==='documents'&&!documents.length)return {jobs:[],done:true,cancelled:true};
    const offset=cursor(event.cursor,selected.length),batch=selected.slice(offset,offset+(grouped?1000:50));
    return {jobs:mails(event.kind,batch,{documents}),done:offset+batch.length>=selected.length,
      nextCursor:String(offset+batch.length),sourceHash:hash([competition.napFingerprint,selected,documents]),attachmentCount:0};
  }
  if(event.kind!=='closure'||!['clubs','exports'].includes(event.phase))throw new TypeError('Phase de notification invalide.');
  const pack=await services.entries(competition);
  if(pack?.source!=='nap'||!Array.isArray(pack.entries)||pack.entries.length>500)throw new TypeError('Dossiers NAP bornes requis.');
  const entries=pack.entries.filter(services.hasParticipants).sort((a,b)=>String(a.clubId).localeCompare(String(b.clubId)));
  // The hash excludes generatedAt/readAt and file bytes: PDF creation timestamps
  // must not invalidate the next page, but entry changes must be detected.
  const sourceHash=hash([competition.napFingerprint,entries.map(({updatedAt,...entry})=>entry),[...pack.clubsById.entries()].sort(([a],[b])=>String(a).localeCompare(String(b)))]);
  if(event.sourceHash&&event.sourceHash!==sourceHash)throw new TypeError('Les donnees NAP ont change pendant la preparation. Reprenez la preparation depuis la fiche.');
  const jobs=[];let attachmentCount=0,skippedCount=0;
  if(event.phase==='clubs'){
    const offset=cursor(event.cursor,entries.length),batch=entries.slice(offset,offset+5);
    const selected=services.clubRecipients(recipients).filter(recipient=>control.clubAllowed(setting,recipient));
    for(const entry of batch){
      const clubRecipients=selected.filter(recipient=>String(recipient.clubId)===String(entry.clubId));
      if(!entry.teamLeaderComplete||!clubRecipients.length){skippedCount++;continue;}
      const file=await attachment(await services.clubPdf(competition,entry),'application/pdf');attachmentCount++;
      jobs.push(...mails('club_recap',clubRecipients,{entry,attachments:[file]}));
    }
    return {jobs,attachmentCount,skippedCount,sourceHash,done:false,nextPhase:offset+batch.length>=entries.length?'exports':'clubs',
      nextCursor:offset+batch.length>=entries.length?'':String(offset+batch.length)};
  }
  if(competition.competitionType==='pool'&&competition.computerEmail&&control.audienceAllowed(setting,{source:'nap',type:'entries_txt',competitionRegionId:competition.regionId})){
    const file=await attachment(await services.txt(competition,entries,pack.clubsById),'text/plain; charset=utf-8');attachmentCount++;
    jobs.push(...mails('entries_txt',[{email:competition.computerEmail,clubId:'informatique'}],{fileName:file.fileName,attachments:[file]}));
  }else skippedCount++;
  if(competition.officialsRequired===true&&competition.officialsManagerEmail&&control.audienceAllowed(setting,{source:'nap',type:'officials_pdf',competitionRegionId:competition.regionId})){
    const pdf=await services.officialsPdf(competition,entries),file=await attachment(pdf,'application/pdf');attachmentCount++;
    jobs.push(...mails('officials_pdf',[{email:competition.officialsManagerEmail,clubId:'jury'}],{officialCount:pdf.officialCount,attachments:[file]}));
  }else skippedCount++;
  return {jobs,attachmentCount,skippedCount,sourceHash,done:true};
}
module.exports={page,manifest,cursor};
