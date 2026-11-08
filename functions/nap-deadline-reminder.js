"use strict";
const automation=require('./nap-notification-automation');
const {bounded}=require('./nap-competition-query');
const DAY=24*60*60*1000,MAX_BYTES=20*1024*1024;
const declarations=(entry,hasParticipants)=>hasParticipants(entry)||(entry.officials||[]).length>0;
const due=event=>event.reminderDueAt||event.deadline;

// An existing lifecycle is required. Never adopt competitions or replay opening.
async function arm(db,competition,now=new Date().toISOString()){
  if(competition.entryStatus!=='open'||competition.canceled)return {queued:false};
  if(!competition.entryDeadlineAt)return {queued:false};
  const id=String(competition.id),deadline=new Date(competition.entryDeadlineAt).toISOString();
  if(Date.parse(deadline)-Date.parse(now)<DAY)return {queued:false};
  const pointer=automation.stateRef(db,id);
  return db.runTransaction(async tx=>{
    const state=(await tx.get(pointer)).data();
    if(!state||state.lifecycle!=='open'||state.deadline!==deadline||!state.cycleKey)return {queued:false};
    const operation=automation.hash(['deadline-reminder-v1',state.cycleKey,deadline]);
    const ref=automation.eventRef(db,id,operation,'deadline_reminder'),saved=await tx.get(ref),event=saved.data();
    const runAt=new Date(Date.parse(deadline)-DAY).toISOString();
    // Only a superseded, untouched occurrence can be restored. Prepared or
    // attempted groups are never recreated when a date is changed back.
    const restore=event?.status==='cancelled'&&event.reason==='superseded'&&!event.preparedCount&&!(event.jobIds||[]).length;
    if(!saved.exists)tx.create(ref,{source:'nap',kind:'deadline_reminder',competitionId:id,operation,cycleKey:state.cycleKey,
      reminderKey:ref.id,deadline,reminderDueAt:runAt,automatic:true,deliveryMode:'bcc-v1',jobIds:[],actorUid:'',
      runAt,status:'pending',phase:'empty',cursor:'',preparedCount:0,attachmentCount:0,skippedCount:0,createdAt:now,updatedAt:now});
    else if(restore)tx.update(ref,{status:'pending',reason:'',runAt,updatedAt:now});
    tx.set(pointer,{reminderKey:ref.id},{merge:true});
    return {queued:!saved.exists||restore||!['completed','cancelled','blocked'].includes(event.status),eventId:ref.id};
  });
}

// A single indexed joined row, without the full competition/rules/PDF reader.
async function currentCompetition(connection,id,now=Date.now()){
  const competitionId=require('./nap-calendar-values').positiveId(id);
  const rows=await bounded(connection,'SELECT c.id,cp.actif,cp.date_limit,co.entry_closed,co.canceled FROM competitions c FORCE INDEX (PRIMARY) LEFT JOIN compet_parametres cp ON cp.compet=c.id LEFT JOIN livepalmes_competition_options co ON co.competition_id=c.id WHERE c.id=? LIMIT 2',[competitionId],1);
  return rows.length?{source:'nap',napSource:true,id:String(rows[0].id),canceled:Number(rows[0].canceled)===1,
    ...require('./nap-paris-time').entryState(rows[0],now)}:null;
}
function text(competition,details){
  const deadline=require('./engagement-competition-mail-format').competitionMailDateTime(competition.entryDeadlineAt);
  return `Les engagements se clôturent le ${deadline}. Vous pouvez encore saisir et vérifier vos déclarations dans le portail LivePalmes.\n\n`+
    (details.attachments?.length?`Vous trouverez en pièce jointe le récapitulatif des déclarations de ${details.entry.clubName||details.entry.clubId}. VERSION PROVISOIRE — ENGAGEMENTS EN COURS : ce document décrit le dossier à cet instant, y compris ses informations encore incomplètes. Il ne constitue pas la version définitive ni une validation du dossier.`:
      'Aucun nageur, relais ou officiel n’est encore déclaré pour votre club à cet instant ; ce rappel ne comporte donc pas de pièce jointe.');
}

// Conditional creation freezes one private source snapshot before any PDF/job.
// A transient read error is never treated as an absent snapshot.
async function frozen(file,event,build){
  const read=async()=> (await file.download({start:0,end:MAX_BYTES,decompress:false}))[0];
  const validate=bytes=>{
    if(bytes.length>MAX_BYTES)throw new RangeError('Snapshot de rappel trop volumineux.');
    const value=JSON.parse(bytes.toString('utf8'));
    if(value.schema!==1||value.operation!==event.operation||value.deadline!==event.deadline||value.competition?.id!==event.competitionId||
      !Array.isArray(value.recipients)||value.recipients.length>10000||!Array.isArray(value.entries)||value.entries.length>500)throw new TypeError('Snapshot de rappel incompatible.');
    return value;
  };
  try{return validate(await read());}catch(error){if(Number(error.code)!==404)throw error;}
  const value={schema:1,operation:event.operation,deadline:event.deadline,generatedAt:new Date().toISOString(),...await build()};
  const bytes=Buffer.from(JSON.stringify(value)),snapshot=validate(bytes);
  try{await file.save(bytes,{resumable:false,preconditionOpts:{ifGenerationMatch:0},metadata:{contentType:'application/json',cacheControl:'private, no-store'}});return snapshot;}
  catch(error){if(Number(error.code)!==412)throw error;return validate(await read());}
}

async function page(event,competition,services,attachment){
  const source=await services.reminderSnapshot(event,async()=>{
    const recipients=await services.recipients(),setting=await services.mailSetting();
    if(!Array.isArray(recipients)||recipients.length>10000)throw new RangeError('Annuaire de rappel trop volumineux.');
    const selected=services.select('opening',recipients,competition,event).filter(item=>require('./engagement-mail-control').clubAllowed(setting,item));
    const pack=await services.entries(competition);
    if(pack?.source!=='nap'||!Array.isArray(pack.entries)||pack.entries.length>500)throw new RangeError('Dossiers de rappel trop volumineux.');
    const clubs=new Set(selected.map(item=>String(item.clubId)));
    return {competition,recipients:selected.map(({uid,email,clubId,napClubRegionId})=>({uid:uid||'',email:String(email||'').trim().toLowerCase(),clubId:String(clubId),napClubRegionId:napClubRegionId||''})),
      entries:pack.entries.filter(entry=>clubs.has(String(entry.clubId))&&declarations(entry,services.hasParticipants)).sort((a,b)=>String(a.clubId).localeCompare(String(b.clubId)))};
  });
  const sourceHash=automation.hash(source);
  if(event.sourceHash&&event.sourceHash!==sourceHash)throw new TypeError('Snapshot de rappel modifié.');
  const comp=source.competition,headers=require('./competition-mail-addresses').headers(comp,'deadline_reminder'),size=50-headers.cc.length;
  function groups(recipients,details){
    const jobs=[];
    for(let offset=0;offset<recipients.length;offset+=size){
      const batch=recipients.slice(offset,offset+size);
      if(batch.some(item=>!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(item.email)))throw new TypeError('Adresse de rappel invalide.');
      jobs.push({...services.mail('deadline_reminder',comp,batch[0],details),...headers,clubId:details.entry?String(details.entry.clubId):'',
        toEmail:'',recipientUid:'',deliveryMode:'bcc-v1',recipients:batch.map(item=>({uid:item.uid,email:item.email,clubId:item.clubId,recipientRegionId:item.napClubRegionId}))});
    }
    return jobs;
  }
  if(event.phase==='empty'){
    const ids=new Set(source.entries.map(entry=>String(entry.clubId))),selected=source.recipients.filter(item=>!ids.has(item.clubId));
    const offset=require('./nap-notification-pages').cursor(event.cursor,selected.length),batch=selected.slice(offset,offset+1000),done=offset+batch.length>=selected.length;
    return {jobs:groups(batch,{}),sourceHash,done:done&&!source.entries.length,nextPhase:done?'clubs':'empty',nextCursor:done?'':String(offset+batch.length),attachmentCount:0};
  }
  if(event.phase!=='clubs')throw new TypeError('Phase de rappel invalide.');
  const offset=require('./nap-notification-pages').cursor(event.cursor,source.entries.length),batch=[];let count=0;
  for(const entry of source.entries.slice(offset,offset+5)){
    const needed=Math.ceil(source.recipients.filter(item=>item.clubId===String(entry.clubId)).length/size);
    if(needed>250)throw new RangeError('Trop de groupes pour un club.');
    if(batch.length&&count+needed>250)break;
    batch.push(entry);count+=needed;
  }
  const jobs=[];
  for(const entry of batch){
    const file=await attachment(await services.clubPdf(comp,entry,{provisional:true,generatedAt:source.generatedAt}),'application/pdf');
    jobs.push(...groups(source.recipients.filter(item=>item.clubId===String(entry.clubId)),{entry,attachments:[file]}));
  }
  return {jobs,sourceHash,attachmentCount:batch.length,done:offset+batch.length>=source.entries.length,nextCursor:String(offset+batch.length)};
}
module.exports={arm,currentCompetition,text,frozen,page,due,DAY,MAX_BYTES,declarations};
