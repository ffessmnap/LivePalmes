"use strict";
// Technical events only. Competition/entry data are always read from NAP by
// services; no sporting mirror, no scan of competitions, no SMTP in TEST.
const {createHash, randomUUID} = require("node:crypto");
const COLLECTION = "engagementClosureQueue";
const hash = value => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const id = value => {
  const result = String(value || "");
  if (!/^[1-9]\d{0,15}$/.test(result) || !Number.isSafeInteger(Number(result))) throw new TypeError("Competition NAP requise.");
  return result;
};
const date = value => {
  const result = new Date(value);
  if (!value || !Number.isFinite(result.getTime())) throw new TypeError("Echeance des notifications invalide.");
  return result.toISOString();
};
const stateRef = (db, competitionId) => db.collection(COLLECTION).doc(`nap-state-${id(competitionId)}`);
const eventRef = (db, competitionId, operation, kind) => db.collection(COLLECTION).doc(`nap-${id(competitionId)}-${hash([operation,kind]).slice(0,40)}`);

async function arm(db, input, now = new Date().toISOString()) {
  const competitionId = id(input.competitionId), operation = String(input.operation || "");
  if (!/^[a-f0-9]{40,64}$/.test(operation)) throw new TypeError("Operation LivePalmes requise.");
  if (!['open','closed','upcoming','documents'].includes(input.action)) throw new TypeError("Action de notification invalide.");
  if (input.openingRequested !== undefined && typeof input.openingRequested !== 'boolean') throw new TypeError("Choix du mail d'ouverture invalide.");
  if (input.action === 'documents' && (!Array.isArray(input.documentIds) || !input.documentIds.length || input.documentIds.length > 20)) throw new TypeError("Documents a notifier requis.");
  const pointer = stateRef(db,competitionId);
  return db.runTransaction(async transaction => {
    const snapshot = await transaction.get(pointer), previous = snapshot.data() || {};
    if(input.onlyIfUnmanaged && snapshot.exists)return {queued:false,reused:true,competitionId};
    if (input.action !== 'documents' && previous.operation === operation) return {queued:true,reused:true,competitionId};
    const cycleKey = input.action === 'open' && (input.newCycle !== false || previous.lifecycle!=='open') || !previous.cycleKey ? operation : previous.cycleKey;
    const deadline = input.action === 'open' ? date(input.deadline) : String(input.deadline || previous.deadline || '');
    const kinds = input.action === 'documents' ? ['documents'] : input.action === 'closed' ? ['closure']
      : input.action === 'open' ? [...(input.openingRequested ? ['opening'] : []),'closure'] : [];
    // Read all prospective events before writing. Replay never resets progress.
    const refs = kinds.map(kind=>eventRef(db,competitionId,operation,kind));
    const events = refs.length ? await transaction.getAll(...refs) : [];
    if (input.action !== 'documents') transaction.set(pointer,{source:'nap',kind:'state',competitionId,operation,cycleKey,deadline,
      lifecycle:input.action,closureKey:input.action==='open'||input.action==='closed'?operation:'',updatedAt:now},{merge:false});
    kinds.forEach((kind,index)=>{
      if(events[index].exists)return;
      const automatic = kind==='closure' && input.action==='open';
      transaction.create(refs[index],{source:'nap',kind,competitionId,operation,cycleKey,closureKey:kind==='closure'?operation:'',
        deadline,automatic,documentIds:kind==='documents'?[...new Set(input.documentIds)]:[],actorUid:String(input.actorUid||''),
        runAt:automatic?deadline:now,status:'pending',phase:kind==='closure'?'clubs':kind,cursor:'',
        preparedCount:0,attachmentCount:0,skippedCount:0,createdAt:now,updatedAt:now});
    });
    return {queued:!!kinds.length,competitionId,cycleKey,eventCount:kinds.length};
  });
}

function currentEvent(event,state) {
  if(event.kind==='documents')return true;
  if(event.cycleKey!==state.cycleKey)return false;
  if(event.kind==='closure')return event.closureKey===state.closureKey && (event.automatic?state.lifecycle==='open':state.lifecycle==='closed');
  return state.lifecycle==='open';
}
function eligible(event, competition, now) {
  if(competition.source!=='nap'||competition.napSource!==true||String(competition.id)!==event.competitionId)throw new TypeError("Source NAP de notification incompatible.");
  if(competition.canceled===true)return false;
  if(event.kind==='documents')return true;
  if(event.kind==='opening')return competition.entryStatus==='open';
  if(competition.entryStatus!=='closed')return false;
  return !event.automatic || date(competition.entryDeadlineAt)===event.deadline && date(now)>=event.deadline;
}

async function processEvent(db, ref, services, now = new Date().toISOString()) {
  const lease = randomUUID();
  const claimed = await db.runTransaction(async transaction=>{
    const snapshot=await transaction.get(ref),event=snapshot.data();
    if(!event||event.source!=='nap'||!['opening','closure','documents'].includes(event.kind))return null;
    if(['completed','cancelled','blocked'].includes(event.status)||!event.runAt||event.runAt>now||event.leaseUntil>now)return null;
    const pointer=await transaction.get(stateRef(db,event.competitionId));
    if(!currentEvent(event,pointer.data()||{})) {transaction.update(ref,{status:'cancelled',runAt:services.deleteField(),updatedAt:now});return null;}
    transaction.update(ref,{status:'processing',lease,leaseUntil:new Date(new Date(now).getTime()+8*60000).toISOString(),updatedAt:now});
    return event;
  });
  if(!claimed)return {skipped:true};
  try {
    const competition=await services.competition(claimed.competitionId);
    const result=eligible(claimed,competition,now)?await services.page(claimed,competition):{cancelled:true,jobs:[],done:true};
    if(!Array.isArray(result.jobs)||result.jobs.length>100 || Number(result.attachmentCount||0)>7)throw new RangeError("Lot de notification trop volumineux.");
    if(result.sourceHash && claimed.sourceHash && result.sourceHash!==claimed.sourceHash)throw new TypeError("Les donnees NAP ont change pendant la preparation. Reprenez la preparation depuis la fiche.");
    // One grouped read/write transaction: retry preserves jobs already prepared
    // or sent, and a later reopen/closure cannot commit an obsolete lot.
    return await db.runTransaction(async transaction=>{
      const [fresh,pointer]=await transaction.getAll(ref,stateRef(db,claimed.competitionId));
      if(fresh.data()?.lease!==lease || !currentEvent(claimed,pointer.data()||{}))return {skipped:true,reason:'superseded'};
      const jobs=result.jobs.map(job=>services.job(claimed,competition,job,now));
      if(new Set(jobs.map(job=>job.id)).size!==jobs.length)throw new TypeError("Destinataire de notification duplique.");
      const jobRefs=jobs.map(job=>db.collection('engagementMailJobs').doc(job.id));
      const existing=jobRefs.length?await transaction.getAll(...jobRefs):[];
      jobs.forEach((job,index)=>{if(!existing[index].exists)transaction.create(jobRefs[index],job);});
      const completed=result.done===true||result.cancelled===true;
      const update={status:result.cancelled?'cancelled':completed?'completed':'pending',phase:result.nextPhase||claimed.phase,
        cursor:result.nextCursor||'',sourceHash:result.sourceHash||claimed.sourceHash||'',
        preparedCount:Number(claimed.preparedCount||0)+existing.filter(snapshot=>!snapshot.exists).length,attachmentCount:Number(claimed.attachmentCount||0)+Number(result.attachmentCount||0),
        skippedCount:Number(claimed.skippedCount||0)+Number(result.skippedCount||0),
        lease:services.deleteField(),leaseUntil:services.deleteField(),runAt:completed?services.deleteField():now,updatedAt:now};
      if(completed)update.completedAt=now;
      transaction.update(ref,update);
      return {ok:true,source:'nap',eventId:ref.id,done:completed,jobCount:jobs.length,attachmentCount:Number(result.attachmentCount||0),disabled:services.simulation===true,sentCount:0};
    });
  } catch(error) {
    await db.runTransaction(async transaction=>{
      const fresh=await transaction.get(ref);
      const blocked=error instanceof TypeError||error instanceof RangeError;
      if(fresh.data()?.lease===lease)transaction.update(ref,{status:blocked?'blocked':'failed',reason:blocked?error.message:'Preparation NAP indisponible : reprise necessaire.',
        lease:services.deleteField(),leaseUntil:services.deleteField(),runAt:blocked?services.deleteField():new Date(new Date(now).getTime()+5*60000).toISOString(),updatedAt:now});
    });
    throw error;
  }
}
// Explicit adoption of one indexed season. At most 20 pointers per call; never
// replay opening notifications or replace an already managed lifecycle.
async function adoptOpenCompetitions(db,input,services,now=new Date().toISOString()) {
  const year=Number(input.season),offset=Number(input.offset||0);
  if(!Number.isInteger(year)||year<1901||year>2101||!Number.isInteger(offset)||offset<0||offset>500)throw new TypeError("Page de reprise invalide.");
  if(typeof services.authorize!=="function")throw new TypeError("Controle national requis.");
  await services.authorize();
  const pack=await services.season(year);
  if(pack?.source!=="nap"||!Array.isArray(pack.events)||pack.events.length>500)throw new TypeError("Saison NAP bornee requise.");
  const events=pack.events.slice(offset,offset+20);
  const candidates=events.filter(event=>event.entryStatus==='open'&&!event.canceled);
  // Validate the whole page before any write.
  for(const event of candidates){id(event.id);date(event.entryDeadlineAt);}
  let adopted=0;
  for(const event of candidates){
    const result=await arm(db,{competitionId:event.id,operation:hash(['adopt-open-season-v1',year,String(event.id)]),
      action:'open',deadline:event.entryDeadlineAt,openingRequested:false,newCycle:false,onlyIfUnmanaged:true},now);
    if(!result.reused)adopted++;
  }
  return {source:'nap',adopted,openingCount:0,nextOffset:offset+events.length,done:offset+events.length>=pack.events.length};
}
async function resumeBlocked(db,ref,services,now=new Date().toISOString()) {
  if(services.simulation!==true)throw new TypeError('Reprise native reservee au TEST sans envoi.');
  return db.runTransaction(async transaction=>{
    const snapshot=await transaction.get(ref),event=snapshot.data();
    if(!event||event.source!=='nap'||event.status!=='blocked')return {reused:true};
    const pointer=await transaction.get(stateRef(db,event.competitionId));
    if(!currentEvent(event,pointer.data()||{}))return {skipped:true,reason:'superseded'};
    transaction.update(ref,{status:'pending',phase:event.kind==='closure'?'clubs':event.kind,cursor:'',sourceHash:'',
      generation:Number(event.generation||0)+1,preparedCount:0,attachmentCount:0,skippedCount:0,
      reason:services.deleteField(),runAt:now,updatedAt:now});
    return {resumed:true};
  });
}
module.exports={arm,processEvent,adoptOpenCompetitions,resumeBlocked,eligible,currentEvent,stateRef,eventRef,COLLECTION,hash};
