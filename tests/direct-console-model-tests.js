'use strict';
const assert=require('node:assert/strict'),flow=require('../functions/nap-direct-console-model'),{hash}=require('../functions/nap-direct-model');
const event={id:hash('course'),eventCode:'100sf',eventLabel:'100 m Surface',sex:'M',sessionKey:'1',expectedSeries:3};
const rows=Array.from({length:20},(_,i)=>({key:hash('nageur-'+i),lastName:'NAGEUR',firstName:String(i+1),club:'CLUB',category:i%2?'HJU':'HSE',series:Math.floor(i/8)+1,lane:i%8+1,sourceEventId:event.id,hasSeries:true,result:{cs:6000+i*100,status:''},seed:{cs:6200+i*100,status:'known'}}));
let sequence=0;
function apply(state,command,role='computer',extra={},entries=rows,consoles=flow.roles,now='2026-11-08T12:00:00.000Z'){return flow.next(state,{command,operationKey:'fixture-command-'+String(++sequence).padStart(6,'0'),...extra},{role,actor:'fixture',event,entries,consoles,now});}
const configure=(lanes,format)=>apply(flow.empty(),'configure','computer',{lanes,events:[{id:event.id,lanes,format}]});
assert.deepEqual(flow.enabled(['computer'],'regional'),['computer']);assert.deepEqual(flow.enabled(['speaker'],'regional'),['computer','referee','speaker']);assert.throws(()=>flow.enabled(['video'],'regional'),/national/);assert.ok(flow.enabled(['video'],'national').includes('referee'));
for(const lanes of [6,8])for(const format of ['a','ab']){const state=configure(lanes,format),q=flow.qualification(state,event,rows);assert.equal(q.proposal.a.length,lanes);assert.equal(q.proposal.b.length,format==='ab'?lanes:0);assert.equal(q.complete,true);assert.deepEqual(q.proposal.a,rows.slice(0,lanes).map(r=>r.key));}
let state=configure(8,'ab');const beforeState=state,original=JSON.stringify(state);state=apply(state,'decision','referee',{participantKey:rows[0].key,type:'false_start'});assert.equal(state.alerts[0].videoStatus,'pending');assert.equal(state.alerts[0].computerStatus,'none');assert.equal(JSON.stringify(beforeState),original,'Les états passés ne sont pas mutés');
state=apply(state,'videoConfirm','video',{alertId:state.alerts[0].id});assert.equal(state.alerts[0].computerStatus,'pending');assert.equal(state.alerts[0].speakerStatus,'pending');assert.throws(()=>apply(state,'videoReject','video',{alertId:state.alerts[0].id}),/déjà/);
state=apply(state,'computerDone','computer',{alertId:state.alerts[0].id});state=apply(state,'announceDecision','speaker',{alertId:state.alerts[0].id});state=apply(state,'cancel','referee',{alertId:state.alerts[0].id});assert.equal(state.alerts[1].type,'ja_cancellation');assert.equal(state.alerts[1].computerStatus,'pending');assert.equal(state.alerts[1].speakerStatus,'pending');
const regional=['computer','referee','speaker'];let direct=apply(configure(8,'a'),'decision','referee',{participantKey:rows[0].key,type:'false_start'},rows,regional);assert.equal(direct.alerts[0].videoStatus,'none');assert.equal(direct.alerts[0].computerStatus,'pending');assert.equal(direct.alerts[0].official,true);
for(const role of ['live','video','speaker','secretary'])assert.throws(()=>apply(configure(8,'a'),'configure',role,{lanes:6,events:[]}),/autorisée/);
assert.throws(()=>apply(configure(8,'a'),'decision','speaker',{participantKey:rows[0].key,type:'forfait'}),/autorisée/);
const rejected=apply(apply(configure(8,'a'),'decision','referee',{participantKey:rows[0].key,type:'false_start'}),'videoReject','video',{alertId:'fixture-command-'+String(sequence).padStart(6,'0')});assert.equal(rejected.alerts[0].official,false);assert.equal(rejected.alerts[0].computerStatus,'none');
const tied=structuredClone(rows);tied[8].result.cs=tied[7].result.cs;
let q=flow.qualification(configure(8,'ab'),event,tied);assert.equal(q.ties.length,1);assert.deepEqual([q.ties[0].from,q.ties[0].to],[8,9]);
const sameTimeInside=structuredClone(rows);sameTimeInside[1].result.cs=sameTimeInside[0].result.cs;assert.equal(flow.qualification(configure(8,'ab'),event,sameTimeInside).ties.length,0,'Un ex æquo sans conséquence sur les finales ne déclenche pas de départage');
let tieState=configure(8,'ab');const partialAB=apply(tieState,'announceFinalists','speaker',{},tied);
assert.equal(partialAB.races[event.id].announced.partial,true);assert.equal(partialAB.races[event.id].announced.roster.a.length,7);assert.equal(partialAB.races[event.id].announced.roster.b.length,7);
assert.ok(![...partialAB.races[event.id].announced.roster.a,...partialAB.races[event.id].announced.roster.b].some(key=>[tied[7].key,tied[8].key].includes(key)),'Les places des ex æquo ne sont jamais attribuées arbitrairement dans l’annonce partielle');
tieState=apply(tieState,'markSwimoff','referee',{},tied);q=flow.qualification(tieState,event,tied);assert.equal(q.swimoff.status,'needed');
tieState=apply(tieState,'resolveTie','referee',{tieId:q.ties[0].id,order:[tied[8].key,tied[7].key]},tied);assert.equal(flow.qualification(tieState,event,tied).proposal.a[7],tied[8].key,'Le départage ne choisit pas arbitrairement selon la ligne ou le nom');assert.equal(tied[8].result.cs,tied[7].result.cs,'Les temps de qualification ne sont pas modifiés');
const changed=structuredClone(tied);changed[8].result.cs+=1;const cancellation=apply(apply(configure(8,'ab'),'markSwimoff','referee',{},tied),'confirmSwimoffCancelled','computer',{},changed);assert.equal(cancellation.races[event.id].swimoff.status,'cancelled');assert.equal(cancellation.alerts.at(-1).type,'swimoff_cancelled');
let finals=configure(6,'ab');assert.throws(()=>apply(finals,'announceFinalists','computer'),/speaker/);assert.throws(()=>apply(finals,'withdraw','secretary',{participantKey:rows[0].key}),/Annoncer/,'Aucun forfait avant annonce officielle');
finals=apply(finals,'announceFinalists','speaker');assert.equal(finals.races[event.id].announced.roster.a.length,6);assert.throws(()=>apply(finals,'withdraw','computer',{participantKey:rows[0].key}),/secrétariat/);
finals=apply(finals,'withdraw','secretary',{participantKey:rows[0].key});q=flow.qualification(finals,event,rows);assert.equal(q.pendingRoster.a[0],rows[1].key);assert.equal(q.pendingRoster.b.at(-1),rows[12].key);assert.equal(q.roster.a[0],rows[0].key,'L’ancienne composition reste identifiable avant annonce du changement');
finals=apply(finals,'announceReplacement','speaker');assert.equal(finals.races[event.id].announced.roster.b.at(-1),rows[12].key);assert.equal(finals.races[event.id].pendingRoster,null);
finals=apply(finals,'reinstate','secretary',{participantKey:rows[0].key});assert.ok(finals.races[event.id].pendingRoster.a.includes(rows[0].key));
assert.throws(()=>apply(finals,'withdraw','secretary',{participantKey:rows[1].key},rows,flow.roles,'2026-11-08T12:31:00.000Z'),/30 minutes/);
let fallback=configure(8,'a');fallback=apply(fallback,'announceFinalists','computer',{},rows,['computer','referee']);fallback=apply(fallback,'withdraw','computer',{participantKey:rows[0].key},rows,['computer','referee']);assert.ok(fallback.races[event.id].withdrawals[rows[0].key]);
const incomplete=structuredClone(rows);incomplete[0].result={cs:null,status:''};assert.equal(flow.qualification(configure(8,'a'),event,incomplete).complete,false);assert.throws(()=>apply(configure(8,'a'),'announceFinalists','speaker',{},incomplete),/Toutes les séries/);
const statusRows=structuredClone(rows);statusRows[0].result={cs:null,status:'dsq'};statusRows[1].result={cs:null,status:'dns'};statusRows[2].result={cs:null,status:'ab'};q=flow.qualification(configure(8,'a'),event,statusRows);assert.equal(q.complete,true);assert.equal(q.proposal.a[0],rows[3].key);
const duplicate=[...rows,{...rows[0],sourceEventId:hash('autre-session')}];assert.equal(flow.qualification(configure(8,'a'),event,duplicate).ambiguous,true);assert.equal(flow.qualification(configure(8,'a'),event,duplicate).complete,false);
const split=rows.map((row,i)=>({...row,sourceEventId:i<8?event.id:hash('session-2'),series:i<8?1:i<16?1:2}));assert.equal(flow.qualification(configure(8,'a'),{...event,expectedHeats:3},split).complete,true,'Séries de plusieurs sessions regroupées sans confondre leurs numéros');
assert.throws(()=>apply(configure(8,'a'),'decision','referee',{participantKey:rows[0].key,type:'relay_early_start'}),/motif/);
// Un repêché reste proposé tant que le changement n'a pas été annoncé.
let pending=apply(configure(8,'a'),'announceFinalists','speaker');
pending=apply(pending,'withdraw','secretary',{participantKey:rows[0].key});
assert.throws(()=>apply(pending,'withdraw','secretary',{participantKey:rows[8].key}),/officiellement annoncé/);
pending=apply(pending,'preWithdraw','secretary',{participantKey:rows[8].key});
assert.equal(pending.races[event.id].pendingRoster.a.at(-1),rows[9].key,'Un pré-forfait recalcule le repêchage en attente');
pending=apply(pending,'preWithdraw','secretary',{participantKey:rows[8].key});
assert.equal(pending.races[event.id].pendingRoster.a.at(-1),rows[8].key);
pending=apply(pending,'announceReplacement','speaker');
pending=apply(pending,'withdraw','secretary',{participantKey:rows[8].key},rows,flow.roles,'2026-11-08T12:20:00.000Z');
assert.ok(pending.races[event.id].withdrawals[rows[8].key]);
// Un nouveau départage doit recalculer la proposition, pas réannoncer l'ancien ordre.
const afterTie=structuredClone(rows);afterTie[9].result.cs=afterTie[8].result.cs;
let tiedReplacement=apply(configure(8,'a'),'announceFinalists','speaker',{},afterTie);
tiedReplacement=apply(tiedReplacement,'withdraw','secretary',{participantKey:rows[0].key},afterTie);
q=flow.qualification(tiedReplacement,event,afterTie);assert.equal(q.ties.length,1);
tiedReplacement=apply(tiedReplacement,'resolveTie','referee',{tieId:q.ties[0].id,order:[rows[9].key,rows[8].key]},afterTie);
assert.equal(tiedReplacement.races[event.id].pendingRoster.a.at(-1),rows[9].key);
tiedReplacement=apply(tiedReplacement,'announceReplacement','speaker',{},afterTie);
assert.equal(tiedReplacement.races[event.id].announced.roster.a.at(-1),rows[9].key);
const versioned={...event,programVersionHash:'programme-1'},versionedState=flow.next(configure(8,'a'),{command:'announceFinalists',operationKey:'fixture-versioned'},{role:'speaker',actor:'fixture',event:versioned,entries:rows,consoles:flow.roles});
assert.equal(flow.qualification(versionedState,{...versioned,programVersionHash:'programme-2'},rows).changed,true,'Une nouvelle répartition oblige à revoir la composition même à temps identiques');
assert.throws(()=>flow.next(versionedState,{command:'withdraw',operationKey:'fixture-new-program',participantKey:rows[0].key},{role:'secretary',actor:'fixture',event:{...versioned,programVersionHash:'programme-2'},entries:rows,consoles:flow.roles}),/bureau doit vérifier/,'Les forfaits ne doivent pas valider implicitement une nouvelle répartition');
// Qualifiés certains annoncés : un forfait peut rendre le départage inutile.
let partialA=apply(configure(8,'a'),'announceFinalists','speaker',{},tied);
assert.equal(flow.qualification(partialA,event,tied).roster.a.length,7);
assert.throws(()=>apply(partialA,'withdraw','secretary',{participantKey:tied[7].key},tied),/officiellement annoncé/);
assert.throws(()=>apply(partialA,'preWithdraw','secretary',{participantKey:tied[8].key},tied),/départage/);
partialA=apply(partialA,'withdraw','secretary',{participantKey:tied[0].key},tied);q=flow.qualification(partialA,event,tied);
assert.equal(q.ties.length,0);assert.equal(q.swimoff.status,'unnecessary');assert.equal(q.pendingRoster.a.length,8);
assert.throws(()=>apply(partialA,'announceReplacement','speaker',{},tied),/confirmer l’annulation/);
partialA=apply(partialA,'confirmSwimoffCancelled','referee',{},tied);
partialA=apply(partialA,'announceReplacement','speaker',{},tied,flow.roles,'2026-11-08T12:20:00.000Z');
assert.equal(partialA.races[event.id].announced.partial,false);
assert.ok(partialA.races[event.id].announced.roster.a.includes(tied[7].key)&&partialA.races[event.id].announced.roster.a.includes(tied[8].key));
assert.throws(()=>apply(partialA,'withdraw','secretary',{participantKey:tied[1].key},tied,flow.roles,'2026-11-08T12:40:00.000Z'),/30 minutes/,'Un qualifié certain conserve son heure initiale');
partialA=apply(partialA,'withdraw','secretary',{participantKey:tied[7].key},tied,flow.roles,'2026-11-08T12:40:00.000Z');assert.ok(partialA.races[event.id].withdrawals[tied[7].key],'Le nageur nouvellement qualifié dispose de sa fenêtre après l’annonce complète');
let partialResolved=apply(configure(8,'a'),'announceFinalists','speaker',{},tied);q=flow.qualification(partialResolved,event,tied);
partialResolved=apply(partialResolved,'resolveTie','referee',{tieId:q.ties[0].id,order:[tied[8].key,tied[7].key]},tied);
assert.ok(partialResolved.races[event.id].pendingRoster,'Le départage après annonce partielle prépare automatiquement la nouvelle annonce');
partialResolved=apply(partialResolved,'announceReplacement','speaker',{},tied);assert.equal(partialResolved.races[event.id].announced.roster.a.at(-1),tied[8].key);
const allTied=rows.map(row=>({...row,result:{cs:6000,status:''}}));assert.throws(()=>apply(configure(8,'a'),'announceFinalists','speaker',{},allTied),/Aucun qualifié certain/);
const dual=structuredClone(rows);dual[6].result.cs=dual[5].result.cs;dual[12].result.cs=dual[11].result.cs;
let dualState=apply(configure(6,'ab'),'announceFinalists','speaker',{},dual);q=flow.qualification(dualState,event,dual);assert.equal(q.ties.length,2);assert.equal(q.roster.a.length,5);assert.equal(q.roster.b.length,4);
dualState=apply(dualState,'resolveTie','referee',{tieId:q.ties[0].id,order:q.ties[0].keys.slice().reverse()},dual);q=flow.qualification(dualState,event,dual);assert.equal(q.ties.length,1);assert.equal(q.swimoff.status,'needed');assert.throws(()=>apply(dualState,'announceReplacement','speaker',{},dual),/départage/);
dualState=apply(dualState,'resolveTie','referee',{tieId:q.ties[0].id,order:q.ties[0].keys.slice().reverse()},dual);dualState=apply(dualState,'announceReplacement','speaker',{},dual);assert.equal(dualState.races[event.id].announced.partial,false);
let delegate=apply(configure(8,'a'),'decision','referee',{participantKey:rows[0].key,type:'false_start'});
delegate=apply(delegate,'videoConfirm','video',{alertId:delegate.alerts[0].id});
delegate=apply(delegate,'cancel','video',{alertId:delegate.alerts[0].id});
assert.equal(delegate.alerts.at(-1).type,'requalification');assert.equal(delegate.alerts.at(-1).computerStatus,'pending');assert.equal(delegate.alerts.at(-1).speakerStatus,'pending');
for(const type of ['forfait','abandon']){const s=apply(configure(8,'a'),'decision','referee',{participantKey:rows[0].key,type});assert.throws(()=>apply(s,'cancel','video',{alertId:s.alerts[0].id}),/disqualifications/);}
const relayEvent={...event,eventCode:'4x100sf'},relayRows=rows.map(row=>({...row,kind:'relay'}));
const relayCommand=leg=>flow.next(configure(8,'a'),{command:'decision',operationKey:'fixture-relay-'+leg,participantKey:rows[0].key,type:'relay_early_start',relayLeg:leg},{role:'referee',actor:'fixture',event:relayEvent,entries:relayRows,consoles:flow.roles});
assert.throws(()=>relayCommand(1),/relayeur/);assert.equal(relayCommand(2).alerts.at(-1).relayLeg,2);assert.throws(()=>relayCommand(5),/relayeur/);
console.log('Consoles : rôles, circuits vidéo/direct, accusés, annulations JA/délégué vidéo, relais, finales 6/8 et A/A+B, départages, annonces, forfaits, reprises et sessions vérifiés hors réseau.');

// The deadline remains enforced unless the bureau or secretary explicitly reconfirms.
for(const role of ['computer','secretary']){
 const consoles=role==='computer'?['computer']:['computer','referee','secretary'];
 let late=apply(configure(6,'ab'),'announceFinalists','computer',{},rows,consoles);
 assert.throws(()=>apply(late,'withdraw',role,{participantKey:rows[0].key,confirmLateWithdrawal:'true'},rows,consoles,'2026-11-08T12:31:00.000Z'),/explicitement/);
 late=apply(late,'withdraw',role,{participantKey:rows[0].key,confirmLateWithdrawal:true},rows,consoles,'2026-11-08T12:31:00.000Z');
 assert.equal(late.races[event.id].withdrawals[rows[0].key].late,true);assert.equal(late.history.at(-1).late,true);assert.equal(late.history.at(-1).deadline,'2026-11-08T12:30:00.000Z');
 assert.throws(()=>apply(late,'withdraw',role,{participantKey:rows[12].key,confirmLateWithdrawal:true},rows,consoles,'2026-11-08T12:32:00.000Z'),/officiellement annoncé/);
}

const publicQ=require('../functions/nap-direct-public-qualifications');
const publicEvents=[{id:event.id,event_code:'100sf',sex:'M',phase:'series'},{id:hash('second-session'),event_code:'100sf',sex:'M',phase:'series'},{id:hash('other-sex'),event_code:'100sf',sex:'F',phase:'series'},{id:hash('finale'),event_code:'100sf',sex:'M',phase:'finale-A'}];
const publicRows=rows.map((row,i)=>({...row,eventId:i<8?event.id:hash('second-session')}));
let publicState=apply(configure(6,'ab'),'announceFinalists','speaker');
let markers=publicQ.attach(publicEvents,publicRows,publicState.races);assert.equal(markers.filter(r=>r.qualification==='QA').length,6);assert.equal(markers.filter(r=>r.qualification==='QB').length,6);
publicState=apply(publicState,'withdraw','secretary',{participantKey:rows[0].key});markers=publicQ.attach(publicEvents,publicRows,publicState.races);assert.ok(!markers[0].qualification);assert.equal(markers[6].qualification,'QB');assert.ok(!markers[12].qualification,'Aucun Q pour le réserviste seulement proposé');
publicState=apply(publicState,'announceReplacement','speaker');markers=publicQ.attach(publicEvents,publicRows,publicState.races);assert.equal(markers[6].qualification,'QA');assert.equal(markers[12].qualification,'QB');
assert.ok(!publicQ.attach(publicEvents,[{...publicRows[1],eventId:hash('other-sex')}],publicState.races)[0].qualification);assert.ok(!publicQ.attach(publicEvents,[{...publicRows[1],eventId:hash('finale')}],publicState.races)[0].qualification);
const single=apply(configure(8,'a'),'announceFinalists','speaker');assert.equal(publicQ.attach(publicEvents,publicRows,single.races).filter(r=>r.qualification==='Q').length,8);
const partial=publicQ.attach(publicEvents,tied.map(row=>({...row,eventId:event.id})),partialAB.races);assert.ok(!partial[7].qualification&&!partial[8].qualification,'Aucun Q arbitraire pour les ex æquo en attente');
