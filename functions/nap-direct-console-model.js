'use strict';
// Shared sporting workflow, independent of SQL and of the UI.
const {hash,clean}=require('./nap-direct-model');
const roles=['computer','referee','video','speaker','secretary','live'];
const motifs={forfait:'Forfait',abandon:'Abandon',false_start:'DSQ — faux départ',relay_early_start:'DSQ — départ anticipé',underwater_15m:'DSQ — coulée supérieure à 15 m',immersion:'DSQ — passage en immersion',bottle_fault:'DSQ — faute de bouteille',interference:'DSQ — gêne d’un concurrent',other_dsq:'DSQ — autre motif'};
const videoTypes=new Set(['false_start','relay_early_start','underwater_15m']);
const reject=message=>{throw new TypeError(message);};
const identity=row=>row.key;
const hasResult=row=>row.result?.cs!=null||Boolean(row.result?.status);
const name=row=>row.kind==='relay'?row.lastName:[String(row.lastName||'').toUpperCase(),row.firstName].filter(Boolean).join(' ');
function enabled(input,level){
  if(!Array.isArray(input)||input.some(role=>!roles.includes(role)))reject('Console inconnue.');
  const result=[...new Set(['computer',...input])];
  if(result.some(role=>role!=='computer')&&!result.includes('referee'))result.push('referee');
  if(result.includes('video')&&level!=='national')reject('La console vidéo est réservée aux compétitions nationales.');
  return roles.filter(role=>result.includes(role));
}
function empty(){return {revision:0,lanes:8,progress:null,alerts:[],races:{},history:[]};}
function raceState(state,eventId){return state.races[eventId]||{format:'none',lanes:state.lanes,withdrawals:{},withdrawalLog:[],resolutions:{},announced:null,pendingRoster:null};}
function sourceHash(entries){return hash(entries.map(row=>[row.key,row.series,row.lane,row.result,row.seed]).sort((a,b)=>a[0].localeCompare(b[0])));}
function qualification(state,event,entries){
  const race=raceState(state,event.id),lanes=race.lanes||state.lanes,capacity=race.format==='ab'?lanes*2:race.format==='a'?lanes:0;
  const withdrawn=new Set([...Object.keys(race.withdrawals||{}),...Object.keys(race.preWithdrawals||{})]),all=entries.filter(row=>row.result?.cs>0&&!row.result.status).sort((a,b)=>a.result.cs-b.result.cs||a.key.localeCompare(b.key));
  let rows=all.filter(row=>!withdrawn.has(row.key));const digest=sourceHash(entries);
  const groups=[];for(const row of rows){const last=groups[groups.length-1];if(last?.time===row.result.cs)last.rows.push(row);else groups.push({time:row.result.cs,rows:[row]});}
  const ties=[];let position=0;
  for(const group of groups){const resolution=race.resolutions?.[hash(group.rows.map(identity).sort())];
    if(resolution?.source===digest&&resolution.order.length===group.rows.length&&group.rows.every(row=>resolution.order.includes(row.key)))group.rows.sort((a,b)=>resolution.order.indexOf(a.key)-resolution.order.indexOf(b.key));
    else if(capacity&&[lanes,...(race.format==='ab'?[capacity]:[])].some(cut=>position<cut&&position+group.rows.length>cut))ties.push({id:hash(group.rows.map(identity).sort()),time:group.time,from:position+1,to:position+group.rows.length,keys:group.rows.map(identity),names:group.rows.map(name)});
    position+=group.rows.length;
  }
  rows=groups.flatMap(group=>group.rows);
  const expected=Math.max(Number(event.expectedSeries)||0,...entries.map(row=>Number(row.series)||0));
  const heats=new Set(entries.filter(row=>Number(row.series)).map(row=>(row.sourceEventId||event.id)+':'+Number(row.series)));
  const ambiguous=new Set(entries.map(row=>row.key)).size!==entries.length;
  const complete=entries.length>0&&heats.size>=(Number(event.expectedHeats)||expected)&&!ambiguous&&entries.every(row=>row.hasSeries!==false&&hasResult(row));
  const sourceEvents=new Set(entries.map(row=>row.sourceEventId||row.eventId||event.id));
  const active=state.alerts.filter(alert=>sourceEvents.has(alert.eventId)&&!alert.cancelledAt&&alert.videoStatus!=='rejected');
  const unresolvedDecision=active.some(alert=>alert.videoStatus==='pending'||alert.computerStatus==='pending');
  const statusExpected=new Map();for(const alert of active.filter(alert=>motifs[alert.type]&&alert.videoStatus!=='pending')){const statuses=statusExpected.get(alert.participantKey)||new Set();statuses.add(alert.type==='forfait'?'dns':alert.type==='abandon'?'ab':'dsq');statusExpected.set(alert.participantKey,statuses);}
  const decisionMismatch=[...statusExpected].some(([key,statuses])=>statuses.size!==1||!entries.some(row=>row.key===key&&statuses.has(row.result?.status)))||active.some(alert=>['requalification','ja_cancellation'].includes(alert.type)&&!statusExpected.has(alert.participantKey)&&!entries.some(row=>row.key===alert.participantKey&&row.result?.cs>0&&!row.result.status));
  const proposal={a:rows.slice(0,Math.min(lanes,capacity)).map(identity),b:race.format==='ab'?rows.slice(lanes,capacity).map(identity):[],reserve:capacity?rows.slice(capacity).map(identity):[]};
  const pendingKeys=[...new Set(ties.flatMap(tie=>tie.keys))],pending=new Set(pendingKeys),certainRoster=Object.fromEntries(Object.entries(proposal).map(([group,keys])=>[group,keys.filter(key=>!pending.has(key))]));
  const current=race.announced?.roster||proposal;
  const departurePending=race.swimoff?.status==='needed'||race.announced?.partial&&!['resolved','cancelled'].includes(race.swimoff?.status);
  const swimoff=departurePending&&!ties.length?{...race.swimoff,status:'unnecessary'}:race.swimoff||null;
  return {format:race.format,lanes,capacity,sourceHash:digest,programVersionHash:event.programVersionHash||null,complete,ambiguous,ties,pendingKeys,certainRoster,partial:Boolean(race.announced?.partial),unresolvedDecision,decisionMismatch,proposal,roster:current,changed:Boolean(race.announced&&(race.announced.sourceHash!==digest||event.programVersionHash&&race.announced.programVersionHash!==event.programVersionHash)),announcedAt:race.announced?.at||null,withdrawals:race.withdrawals||{},pendingRoster:race.pendingRoster||null,withdrawalLog:race.withdrawalLog||[],swimoff};
}
function can(role,command,consoles){
  const table={configure:['computer'],progress:['referee'],decision:['referee'],videoConfirm:['video'],videoReject:['video'],takeover:['referee'],cancel:['referee','computer','video'],computerDone:['computer'],announceDecision:['speaker'],announceFinalists:['speaker','computer'],withdraw:['secretary','computer'],reinstate:['secretary','computer'],preWithdraw:['secretary','computer'],announceReplacement:['speaker','computer'],resolveTie:['referee','computer'],markSwimoff:['referee','computer'],confirmSwimoffCancelled:['referee','computer'],refreshFinalists:['computer'],compositionDone:['computer'],secretaryDone:['secretary']};
  if(!(command==='resetConsoles'?role==='computer':table[command]?.includes(role)))reject('Cette action n’est pas autorisée dans cette console.');
  if(role==='computer'&&['announceFinalists','announceReplacement'].includes(command)&&consoles.includes('speaker'))reject('L’annonce est réservée au speaker tant que sa console est activée.');
  if(role==='computer'&&['withdraw','reinstate','preWithdraw'].includes(command)&&consoles.includes('secretary'))reject('Utiliser le secrétariat tant que sa console est activée.');
}
function next(previous,input,{role,actor,actorLabel=actor,event,entries,consoles,now=new Date().toISOString()}){
  can(role,input.command,consoles);const state=structuredClone(previous),command=input.command;
  if(command==='resetConsoles')return {...empty(),revision:state.revision+1};
  if(!event&&command!=='configure')reject('Choisir une course.');
  const eventId=event?.id;let race=eventId?raceState(state,eventId):null;
  const row=entries?.find(row=>row.key===input.participantKey),alert=state.alerts.find(row=>row.id===input.alertId);
  const requiredAlert=()=>{if(!alert||alert.cancelledAt)reject('Cette décision n’est plus disponible.');if(alert.eventId!==eventId)reject('Cette décision concerne une autre course.');return alert;};
  const putRace=()=>{state.races[eventId]=race;};
  const announceAllowed=(partial=false)=>{const q=qualification(state,event,entries);if(!q.capacity)reject('Cette course n’a pas de finale.');if(!q.complete)reject('Toutes les séries doivent avoir reçu leurs résultats.');if(q.ties.length&&!partial)reject('Ex æquo : enregistrer le départage avant de confirmer tous les finalistes.');if(q.unresolvedDecision)reject('Une décision JA/vidéo reste à traiter par le bureau.');if(q.decisionMismatch)reject('Attendre le résultat corrigé : les résultats reçus ne concordent pas avec les décisions du JA.');return q;};
  if(command==='configure'){
    if(![6,8].includes(Number(input.lanes)))reject('Choisir 6 ou 8 places par finale.');
    state.lanes=Number(input.lanes);
    if(!Array.isArray(input.events)||input.events.length>300)reject('Paramétrage des courses invalide.');
    for(const setting of input.events){if(!/^[a-f0-9]{64}$/.test(setting.id)||!['none','a','ab'].includes(setting.format)||![6,8].includes(Number(setting.lanes)))reject('Format de finale invalide.');const old=raceState(state,setting.id);if(old.announced&&(old.format!==setting.format||old.lanes!==Number(setting.lanes)))reject('Des finalistes sont déjà annoncés : leur format ne peut pas être changé.');state.races[setting.id]={...old,format:setting.format,lanes:Number(setting.lanes)};}
  }else if(command==='progress'){
    const series=Number(input.series);if(!entries.some(row=>row.series===series))reject('Série absente du programme.');state.progress={eventId,series,at:now,by:actor};
  }else if(command==='decision'){
    if(!row||!motifs[input.type])reject('Nageur ou motif invalide.');
    const relay=row.kind==='relay',code=event.eventCode.toLowerCase(),underwaterForbidden=/\d+(ap|is)$/.test(code)||/apnee|immersion/.test(String(event.eventLabel).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase());
    if(input.type==='relay_early_start'&&!relay||['underwater_15m','immersion'].includes(input.type)&&underwaterForbidden||input.type==='bottle_fault'&&!/\d+is$/.test(code)&&!/immersion/i.test(event.eventLabel))reject('Ce motif ne correspond pas à cette épreuve.');
    const needsLeg=relay&&['relay_early_start','underwater_15m','immersion','bottle_fault','interference','other_dsq'].includes(input.type),relayLeg=Number(input.relayLeg)||null;
    const legCount=Number(code.match(/^(\d+)x/)?.[1])||4;
    if(needsLeg&&(!Number.isInteger(relayLeg)||relayLeg<(input.type==='relay_early_start'?2:1)||relayLeg>legCount))reject('Préciser le relayeur concerné.');
    if(input.type==='underwater_15m'&&!['start','length'].includes(input.lengthType))reject('Préciser le départ ou la longueur concernée.');
    if(input.lengthType==='length'&&(!Number.isInteger(Number(input.lengthNumber))||Number(input.lengthNumber)<1||Number(input.lengthNumber)>100))reject('Numéro de longueur invalide.');
    const video=videoTypes.has(input.type)&&consoles.includes('video'),official=!['forfait','abandon'].includes(input.type)&&!video;
    state.alerts.push({id:input.operationKey,eventId,eventLabel:event.eventLabel,sex:event.sex,session:event.sessionKey,series:row.series,lane:row.lane,participantKey:row.key,displayName:name(row),club:row.club,type:input.type,comment:clean(input.comment,500),relayLeg:needsLeg?relayLeg:null,lengthType:input.type==='underwater_15m'?input.lengthType:null,lengthNumber:input.lengthType==='length'?Number(input.lengthNumber):null,videoStatus:video?'pending':'none',computerStatus:video?'none':'pending',speakerStatus:official&&consoles.includes('speaker')?'pending':'none',secretaryStatus:input.type==='forfait'&&consoles.includes('secretary')?'pending':'none',official,createdAt:now,createdBy:actor});
  }else if(['videoConfirm','videoReject','takeover'].includes(command)){
    requiredAlert();if(alert.videoStatus!=='pending')reject('Cette demande vidéo est déjà traitée.');alert.videoStatus=command==='videoReject'?'rejected':command==='takeover'?'taken-over':'confirmed';alert.videoAt=now;
    if(command!=='videoReject'){alert.computerStatus='pending';alert.speakerStatus=consoles.includes('speaker')?'pending':'none';alert.official=true;}
  }else if(command==='cancel'){
    requiredAlert();if(!motifs[alert.type])reject('Cette correction ou information ne peut pas être annulée à nouveau.');
    if(role==='video'&&['forfait','abandon'].includes(alert.type))reject('L’annulation délégué en vidéo concerne les disqualifications.');
    const delegate=role==='computer'||role==='video',speaker=alert.speakerStatus==='done'||delegate,computer=alert.computerStatus==='done'||delegate;
    alert.cancelledAt=now;alert.cancelledBy=actor;
    if(speaker||computer)state.alerts.push({...alert,id:input.operationKey,originalAlertId:alert.id,type:delegate?'requalification':'ja_cancellation',cancelledAt:null,cancelledBy:null,videoStatus:'none',computerStatus:computer?'pending':'none',speakerStatus:speaker&&consoles.includes('speaker')?'pending':'none',secretaryStatus:'none',official:alert.official,createdAt:now,createdBy:actor});
  }else if(command==='computerDone'||command==='announceDecision'||command==='secretaryDone'){
    requiredAlert();const field=command==='computerDone'?'computerStatus':command==='secretaryDone'?'secretaryStatus':'speakerStatus';if(alert[field]!=='pending')reject('Cette action est déjà traitée ou n’est pas destinée à cette console.');alert[field]='done';alert[command==='computerDone'?'computerAt':command==='secretaryDone'?'secretaryAt':'speakerAt']=now;
  }else if(command==='resolveTie'){
    const q=qualification(state,event,entries),tie=q.ties.find(t=>t.id===input.tieId);
    if(!tie||!Array.isArray(input.order)||input.order.length!==tie.keys.length||new Set(input.order).size!==tie.keys.length||tie.keys.some(key=>!input.order.includes(key)))reject('Enregistrer un ordre de départage complet pour les nageurs ex æquo.');
    race.resolutions={...race.resolutions,[tie.id]:{source:q.sourceHash,order:input.order,at:now,by:actor}};putRace();
    const updated=qualification(state,event,entries);race.swimoff={status:updated.ties.length?'needed':'resolved',at:now};
    if(race.pendingRoster||race.announced?.partial){race.pendingRoster={...updated.proposal,sourceHash:updated.sourceHash,programVersionHash:updated.programVersionHash,at:now,reason:'tie-resolution'};delete race.compositionDoneAt;}putRace();
  }else if(command==='markSwimoff'){
    const q=qualification(state,event,entries);if(!q.ties.length)reject('Aucun départage nécessaire à la limite de qualification.');race.swimoff={status:'needed',at:now,by:actor};putRace();
  }else if(command==='confirmSwimoffCancelled'){
    const q=qualification(state,event,entries);if(q.ties.length||q.swimoff?.status!=='unnecessary')reject('Le départage reste nécessaire ou aucune annulation n’est en attente.');race.swimoff={status:'cancelled',at:now,by:actor};putRace();
    if(consoles.includes('speaker'))state.alerts.push({id:input.operationKey,eventId,eventLabel:event.eventLabel,sex:event.sex,session:event.sessionKey,series:null,lane:null,displayName:'Départage — '+event.eventLabel,club:'',type:'swimoff_cancelled',comment:'Annulation du swim-off confirmée par le JA ou le bureau.',official:true,speakerStatus:'pending',computerStatus:'none',videoStatus:'none',secretaryStatus:'none',createdAt:now,createdBy:actor});
  }else if(command==='announceFinalists'){
    const q=announceAllowed(true);if(race.announced)reject('Les finalistes sont déjà annoncés.');
    if(q.ties.length&&!q.certainRoster.a.length&&!q.certainRoster.b.length)reject('Aucun qualifié certain à annoncer avant le départage.');
    race.announced={at:now,by:actor,sourceHash:q.sourceHash,programVersionHash:q.programVersionHash,roster:q.ties.length?q.certainRoster:q.proposal,partial:Boolean(q.ties.length)};race.pendingRoster=null;putRace();
  }else if(command==='refreshFinalists'){
    const q=announceAllowed(true);if(!race.announced)reject('Les finalistes ne sont pas encore annoncés.');race.pendingRoster={...q.proposal,sourceHash:q.sourceHash,programVersionHash:q.programVersionHash,at:now,reason:'result-correction'};if(q.ties.length)race.swimoff={status:'needed',at:now};delete race.compositionDoneAt;putRace();
  }else if(['withdraw','reinstate','preWithdraw'].includes(command)){
    if(!race.announced||!row)reject('Annoncer les finalistes et choisir un nageur.');
    const q=qualification(state,event,entries),before=q.roster,wasFinalist=[...before.a,...before.b].includes(row.key);
    if(q.changed&&(!race.pendingRoster||race.pendingRoster.sourceHash!==q.sourceHash||race.pendingRoster.programVersionHash!==q.programVersionHash))reject('Les séries ou résultats ont changé : le bureau doit vérifier et préparer la composition corrigée avant de saisir les forfaits.');
    if(command==='withdraw'){
      if(!wasFinalist||race.withdrawals[row.key])reject('Ce nageur n’est pas un finaliste officiellement annoncé disponible.');
      const reference=race.announced.times?.[row.key]||race.announced.at;
      const deadline=new Date(Date.parse(reference)+30*60000).toISOString(),late=Date.parse(now)>Date.parse(deadline);
      if(late&&input.confirmLateWithdrawal!==true)reject('Le délai de 30 minutes est dépassé. Confirmer explicitement le forfait hors délai.');
      race.withdrawals[row.key]={at:now,by:actor,...(late?{late:true,deadline}:{})};race.withdrawalLog.push({key:row.key,name:name(row),action:'withdraw',at:now,by:actor,...(late?{late:true,deadline}:{})});
    }else if(command==='reinstate'){
      if(!race.withdrawals[row.key])reject('Ce nageur n’est pas forfait.');delete race.withdrawals[row.key];race.withdrawalLog.push({key:row.key,name:name(row),action:'reinstate',at:now,by:actor});
    }else{if(wasFinalist||race.withdrawals[row.key])reject('Le pré-forfait est réservé aux réservistes.');if(q.pendingKeys.includes(row.key)&&!race.preWithdrawals?.[row.key])reject('Ce nageur attend un départage : attendre sa qualification officielle.');race.preWithdrawals=race.preWithdrawals||{};if(race.preWithdrawals[row.key])delete race.preWithdrawals[row.key];else race.preWithdrawals[row.key]={at:now,by:actor};}
    putRace();
    if(command!=='preWithdraw'||race.pendingRoster){
      const updated=qualification(state,event,entries);race.pendingRoster={...updated.proposal,at:now,reason:command,sourceHash:updated.sourceHash,programVersionHash:updated.programVersionHash};
      if(updated.ties.length)race.swimoff={status:'needed',at:now};else if(race.swimoff?.status==='needed'||q.ties.length)race.swimoff={status:'unnecessary',at:now};delete race.compositionDoneAt;putRace();
    }
  }else if(command==='announceReplacement'){
    if(!race.pendingRoster)reject('Aucun changement de finale à annoncer.');const q=qualification(state,event,entries);if(q.ties.length||!q.complete||q.unresolvedDecision||q.decisionMismatch)reject('Vérifier les résultats, les décisions JA et le départage avant d’annoncer le changement.');
    if(q.swimoff?.status==='unnecessary')reject('Le JA ou le bureau doit confirmer l’annulation du swim-off devenu inutile avant l’annonce complète.');
    if(race.pendingRoster.sourceHash!==q.sourceHash||race.pendingRoster.programVersionHash!==q.programVersionHash)reject('Les séries ou résultats ont changé depuis la préparation de la composition.');
    if(hash([race.pendingRoster.a,race.pendingRoster.b,race.pendingRoster.reserve])!==hash([q.proposal.a,q.proposal.b,q.proposal.reserve]))reject('La composition a changé : la préparer à nouveau avant l’annonce.');
    const times={...race.announced.times};for(const key of [...race.pendingRoster.a,...race.pendingRoster.b])if(![...race.announced.roster.a,...race.announced.roster.b].includes(key))times[key]=now;
    race.announced={...race.announced,partial:false,sourceHash:q.sourceHash,programVersionHash:q.programVersionHash,roster:{a:race.pendingRoster.a,b:race.pendingRoster.b,reserve:race.pendingRoster.reserve},times};race.pendingRoster=null;putRace();
  }else if(command==='compositionDone'){
    const q=qualification(state,event,entries);if(!race.announced||race.announced.partial||race.pendingRoster||q.changed||q.ties.length||q.unresolvedDecision||q.decisionMismatch||q.swimoff?.status==='unnecessary')reject('Les finalistes et modifications doivent être vérifiés et annoncés avant confirmation dans WinPalme.');race.compositionDoneAt=now;putRace();
  }
  if(state.alerts.length>2000||state.history.length>=5000)reject('Journal de la compétition trop volumineux : exporter l’historique et contacter le bureau.');
  state.revision++;state.history.push({...(command==='withdraw'&&race.withdrawals[row.key]?.late?{late:true,deadline:race.withdrawals[row.key].deadline}:{}),id:input.operationKey,command,eventId,eventLabel:event?.eventLabel||'',sex:event?.sex||'',series:row?.series??alert?.series??null,lane:row?.lane??alert?.lane??null,role,actor,partial:command==='announceFinalists'&&Boolean(race?.announced?.partial),actorLabel:clean(actorLabel,160),alertId:alert?.id||null,at:now,participant:row?name(row):alert?.displayName||'',type:input.type||alert?.type||'',comment:clean(input.comment||alert?.comment,500)});
  return state;
}
module.exports={roles,motifs,videoTypes,enabled,empty,raceState,sourceHash,qualification,next,name};
