'use strict';
const model=require('./nap-direct-model'),flow=require('./nap-direct-console-model'),{execute}=require('./nap-query');
const publicQualifications=require('./nap-direct-public-qualifications'),stateId=publicQualifications.stateId;
const fail=(message,code='failed-precondition')=>Object.assign(new Error(message),{directCode:code});
const finalCommands=new Set(['announceFinalists','withdraw','reinstate','preWithdraw','announceReplacement','resolveTie','markSwimoff','confirmSwimoffCancelled','refreshFinalists','compositionDone']);
function createConsoleStore(pool,store){
  const get=async(connection,id)=>model.parseJson((await execute(connection,'SELECT after_json FROM livepalmes_direct_publications WHERE environment=? AND competition_id=? AND id=? LIMIT 1',[...store.scope(id),stateId]))[0]?.after_json,flow.empty());
  const ensure=(config,permissions,role)=>{
    if(!flow.roles.includes(role)||!permissions.manage&&!permissions.roles.includes(role))throw fail('Aucun accès à cette console.','permission-denied');
    if(!config||config.state!=='active')throw fail('Les consoles de cette compétition sont fermées.');
    if(!model.parseJson(config.enabled_consoles_json,[]).includes(role))throw fail('Cette console n’est pas activée pour cette compétition.','permission-denied');
    if(role==='video'&&permissions.competition.level!=='national')throw fail('La vidéo est réservée aux compétitions nationales.','permission-denied');
  };
  const rows=(raw,list)=>{const publications=new Map(list.map(event=>[event.id,model.parseJson(event.publication_state_json)]));return raw.map(row=>({...model.publicEntry(row,true,true,model.participationFor(publications.get(row.event_id),row.participant_key)),eventId:row.event_id,sourceEventId:row.event_id,hasSeries:Boolean(row.has_series),hasResult:Boolean(row.has_result)}));};
  function groups(list,state){
    const grouped=new Map();for(const e of list.filter(e=>e.phase==='series')){const key=e.event_code+'|'+e.sex;if(!grouped.has(key))grouped.set(key,[]);grouped.get(key).push(e);}
    return [...grouped.values()].map(events=>({events,event:events.find(e=>state.races[e.id]?.format&&state.races[e.id].format!=='none')||events[0]}));
  }
  async function qualificationContext(connection,id,list,selected,state,selectedRows){
    const group=groups(list,state).find(g=>g.event.event_code===selected.event_code&&g.event.sex===selected.sex);if(!group)return null;
    const ids=group.events.map(e=>e.id),raw=ids.length===1&&ids[0]===selected.id?selectedRows:await execute(connection,`SELECT * FROM livepalmes_direct_entries WHERE environment=? AND competition_id=? AND event_id IN (${ids.map(()=>'?').join(',')}) ORDER BY event_id,series_number,lane,participant_key LIMIT ${model.MAX_MEET_ENTRIES+1}`,[...store.scope(id),...ids]);
    if(raw.length>model.MAX_MEET_ENTRIES)throw fail('Volume qualificatif trop important.');
    const expectedHeats=group.events.reduce((total,e)=>{const p=model.parseJson(e.publication_state_json),actual=Math.max(0,...raw.filter(row=>row.event_id===e.id).map(row=>Number(row.series_number)||0));return total+Math.max(Number(p.expectedSeries)||0,actual);},0);
    return {event:{...store.eventView(group.event),expectedHeats,programVersionHash:model.hash(group.events.map(e=>[e.id,Number(e.version)]))},entries:rows(raw,list),ids};
  }
  async function snapshot(id,input,permissions){
    const config=await store.config(id);ensure(config,permissions,input.role);
    const revision=Number((await store.q("SELECT JSON_UNQUOTE(JSON_EXTRACT(after_json,'$.revision')) AS revision FROM livepalmes_direct_publications WHERE environment=? AND competition_id=? AND id=? LIMIT 1",[...store.scope(id),stateId]))[0]?.revision)||0;
    if(Number(input.revision)===revision&&Number(input.configVersion)===Number(config.version))return {unchanged:true,revision,configVersion:Number(config.version)};
    const [state,list]=await Promise.all([get(pool,id),store.program(id)]),selected=input.eventId?list.find(e=>e.id===input.eventId):list[0];
    const raw=selected?await store.entries(id,selected.id):[],qual=selected?await qualificationContext(pool,id,list,selected,state,raw):null;
    const workflow={...state,history:state.history.slice(-300),historyCount:state.history.length};
    const finalTasks=groups(list,state).flatMap(group=>{const race=state.races[group.event.id];if(!race||race.format==='none')return [];const complete=group.events.every(e=>{const p=model.parseJson(e.publication_state_json),c=e.progress;return c?.seriesEntries>0&&c.matchedResults>=c.seriesEntries&&c.completeSeriesCount>=Math.max(Number(p.expectedSeries)||0,c.seriesCount);});let kind=!race.announced?(complete?'announce':null):race.pendingRoster?'replacement':race.announced.programVersionHash!==model.hash(group.events.map(e=>[e.id,Number(e.version)]))?'check':race.announced.partial?'departure':!race.compositionDoneAt?'compose':'announced';return kind?[{eventId:group.event.id,label:group.event.event_label,sex:group.event.sex,kind,departure:Boolean(race.announced?.partial&&!['resolved','cancelled'].includes(race.swimoff?.status)||race.swimoff?.status==='needed'),announced:Boolean(race.announced)}]:[];});
    return {competition:permissions.competition,config:store.configView(config),permissions:{manage:permissions.manage,delegate:permissions.manage||permissions.roles.includes('computer'),roles:permissions.roles},events:list.map(store.eventView),selectedEventId:selected?.id||null,entries:rows(raw,list),workflow,finalTasks,finalOptions:groups(list,state).map(g=>({...store.eventView(g.event),sourceCount:g.events.length})),finalsEvent:qual?.event||null,qualifyingEntries:qual?.entries||[],finals:qual?flow.qualification(state,qual.event,qual.entries):null,revision:state.revision,configVersion:Number(config.version)};
  }
  async function allData(id,input,permissions){const config=await store.config(id);ensure(config,permissions,input.role);const list=await store.program(id),raw=await store.q(`SELECT * FROM livepalmes_direct_entries WHERE environment=? AND competition_id=? ORDER BY event_id,series_number,lane,participant_key LIMIT ${model.MAX_MEET_ENTRIES+1}`,store.scope(id));if(raw.length>model.MAX_MEET_ENTRIES)throw fail('Programme trop volumineux.');return {competition:permissions.competition,config:store.configView(config),events:list.map(store.eventView),entries:rows(raw,list)};}
  async function history(id,input,permissions){ensure(await store.config(id),permissions,input.role);const state=await get(pool,id),offset=Number(input.offset)||0;if(!Number.isInteger(offset)||offset<0||offset>5000)throw TypeError('Page invalide.');if(input.all===true)return {items:state.history.slice().reverse(),nextOffset:null};return {items:state.history.slice().reverse().slice(offset,offset+100),nextOffset:state.history.length>offset+100?offset+100:null};}
  async function command(id,actor,input,permissions){
    if(!/^[a-zA-Z0-9_-]{16,64}$/.test(input.operationKey||''))throw TypeError('Identifiant d’action requis.');
    if(input.command==='resetConsoles'&&input.confirmation!=='reset-consoles-'+id)throw TypeError('Confirmation de remise à zéro des consoles requise.');
    const receiptId=model.hash(['direct-console-command',input.operationKey]),contentHash=model.hash({...input,revision:undefined,configVersion:undefined});
    const c=await pool.getConnection();let started=false;
    try{
      await c.beginTransaction();started=true;const config=await store.config(id,c,true);ensure(config,permissions,input.role);
      const receipt=(await execute(c,'SELECT source_hash,after_json FROM livepalmes_direct_publications WHERE environment=? AND competition_id=? AND operation_key=? LIMIT 1',[...store.scope(id),receiptId]))[0];
      if(receipt){if(receipt.source_hash!==contentHash)throw fail('Cet identifiant concerne une autre action.');await c.commit();started=false;return {...model.parseJson(receipt.after_json),replayed:true};}
      const state=await get(c,id);
      if(Number(input.revision)!==state.revision||Number(input.configVersion)!==Number(config.version))throw fail('Une autre console ou les résultats ont changé. Actualiser avant de confirmer.','aborted');
      const list=input.command==='resetConsoles'?[]:await store.events(id,c);if(list.length>model.MAX_EVENTS)throw fail('Programme trop volumineux.');let selected=list.find(e=>e.id===input.eventId),raw=selected?await store.entries(id,selected.id,c):[],context=selected?{event:store.eventView(selected),entries:rows(raw,list)}:{event:null,entries:[]};
      if(input.command==='configure'){
        if(!Array.isArray(input.events)||input.events.some(setting=>!list.some(e=>e.id===setting.id&&e.phase==='series')))throw TypeError('Choisir des courses de séries importées.');
        const keys=input.events.map(setting=>{const e=list.find(e=>e.id===setting.id);return e.event_code+'|'+e.sex;});if(new Set(keys).size!==keys.length)throw TypeError('Un seul réglage par épreuve et sexe, même sur plusieurs sessions.');
      }
      if(selected&&finalCommands.has(input.command)){const qual=await qualificationContext(c,id,list,selected,state,raw);if(!qual)throw fail('Les séries qualificatives ne sont pas importées.');context=qual;selected=list.find(e=>e.id===qual.event.id);}
      const next=flow.next(state,input,{...context,role:input.role,actor:actor.uid,actorLabel:actor.label||'Compte LivePalmes',consoles:model.parseJson(config.enabled_consoles_json,[])});
      if(Buffer.byteLength(JSON.stringify(next),'utf8')>2*1024*1024)throw fail('État des consoles trop volumineux. Exporter l’historique et contacter le bureau.');
      await execute(c,"INSERT INTO livepalmes_direct_publications (environment,competition_id,id,batch_id,event_id,operation_key,action,source_type,source_name,source_hash,before_json,after_json,created_at,created_by) VALUES (?,?,?,'',NULL,?,'console-state','console','','','null',?,UTC_TIMESTAMP(6),?) ON DUPLICATE KEY UPDATE after_json=VALUES(after_json)",[...store.scope(id),stateId,stateId,JSON.stringify(next),actor.uid]);
      if(publicQualifications.signature(state)!==publicQualifications.signature(next))await execute(c,'UPDATE livepalmes_direct_competitions SET public_revision=public_revision+1 WHERE environment=? AND competition_id=?',store.scope(id));
      const result={ok:true,revision:next.revision,configVersion:Number(config.version)};
      if(input.command==='resetConsoles')await execute(c,"DELETE FROM livepalmes_direct_publications WHERE environment=? AND competition_id=? AND action='console-command'",store.scope(id));
      await execute(c,"INSERT INTO livepalmes_direct_publications (environment,competition_id,id,batch_id,event_id,operation_key,action,source_type,source_name,source_hash,before_json,after_json,created_at,created_by) VALUES (?,?,?,'',?,?, 'console-command','console',?,?,'null',?,UTC_TIMESTAMP(6),?)",[...store.scope(id),receiptId,selected?.id||null,receiptId,model.clean(input.command,200),contentHash,JSON.stringify(result),actor.uid]);
      await c.commit();started=false;return result;
    }catch(error){if(started)await c.rollback();throw error;}finally{c.release();}
  }
  async function validateSettings(id,input,connection=pool){
    input.consoles=flow.enabled(input.consoles||[],(await store.native(id)).level);
    if(!input.consoles.includes('video')){const state=await get(connection,id);if(state.alerts.some(a=>!a.cancelledAt&&a.videoStatus==='pending'))throw fail('Des demandes vidéo attendent : les traiter ou les reprendre depuis le JA avant de désactiver la vidéo.');}
  }
  async function signal(id,input,permissions){const config=await store.config(id);ensure(config,permissions,'computer');const state=await get(pool,id);return {revision:state.revision,configVersion:Number(config.version),pending:state.alerts.filter(a=>!a.cancelledAt&&a.computerStatus==='pending').length,videoPending:state.alerts.filter(a=>!a.cancelledAt&&a.videoStatus==='pending').length,finalChanges:Object.values(state.races).filter(r=>r.pendingRoster||r.announced?.partial).length};}
  return {snapshot,allData,history,command,validateSettings,signal};
}
module.exports={createConsoleStore,stateId};
