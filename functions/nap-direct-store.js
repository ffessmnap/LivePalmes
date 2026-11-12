"use strict";
const model=require("./nap-direct-model"),{execute}=require("./nap-query");
const {SELECT_EVENT,EVENT_JOINS,eventFromRow}=require("./nap-calendar-event");
const progress=require('./nap-direct-progress'),archive=require('./nap-direct-state');
const json=JSON.stringify, read=model.parseJson;
const fail=(message,code="failed-precondition")=>Object.assign(new Error(message),{directCode:code});
const caches=new Map();
function createStore(pool,environment,{clock=Date.now}={}) {
  if(!["test","production"].includes(environment))throw new TypeError("Environnement Direct invalide.");
  const scope=id=>[environment,model.competitionId(id)];
  const q=(sql,values=[])=>execute(pool,sql,values);
  const nativeCache=new Map();
  async function native(id) {
    id=model.competitionId(id);if(nativeCache.has(id))return nativeCache.get(id);
    const rows=await q(`${SELECT_EVENT}${EVENT_JOINS} WHERE c.id=? LIMIT 2`,[model.competitionId(id)]);
    if(rows.length!==1)throw fail("Compétition du calendrier introuvable.","not-found");
    const event=eventFromRow(rows[0]);
    if(event.eventType!=="pool")throw fail("Le Direct est réservé aux compétitions piscine.");
    const result={...event,nativeId:id};nativeCache.set(id,result);return result;
  }
  async function config(id,connection=pool,lock=false) {return (await execute(connection,`SELECT d.*,c.date AS direct_date,c.enddate AS direct_enddate FROM livepalmes_direct_competitions d LEFT JOIN competitions c ON c.id=d.competition_id WHERE d.environment=? AND d.competition_id=? LIMIT 1${lock?' FOR UPDATE':''}`,scope(id)))[0]||null;}
  async function access(id,uid) {return (await q("SELECT * FROM livepalmes_direct_access WHERE environment=? AND competition_id=? AND user_uid=? AND active=1 AND (expires_at IS NULL OR expires_at>UTC_TIMESTAMP(6)) LIMIT 1",[...scope(id),uid]))[0]||null;}
  async function events(id,connection=pool) {return execute(connection,`SELECT * FROM livepalmes_direct_events WHERE environment=? AND competition_id=? ORDER BY program_order,id LIMIT ${model.MAX_EVENTS+1}`,scope(id));}
  async function program(id){const [list,counts]=await Promise.all([events(id),progress.read(pool,scope(id))]);if(list.length>model.MAX_EVENTS)throw fail('Programme trop volumineux.');return list.map(row=>({...row,progress:counts.get(row.id)||progress.empty()}));}
  async function entries(id,eventId,connection=pool) {const rows=await execute(connection,`SELECT * FROM livepalmes_direct_entries WHERE environment=? AND competition_id=? AND event_id=? ORDER BY series_number,lane,participant_key LIMIT ${model.MAX_ENTRIES+1}`,[...scope(id),eventId]);if(rows.length>model.MAX_ENTRIES)throw fail("Épreuve trop volumineuse.");return rows;}
  function eventView(row) {const publication=read(row.publication_state_json);return {id:row.id,eventCode:row.event_code,eventLabel:row.event_label,sex:row.sex,phase:row.phase,date:row.event_date,sessionKey:row.session_key,sessionLabel:row.session_label,order:row.program_order,eventNumber:row.event_number,scheduledAt:row.scheduled_at,heatSchedule:publication.heatSchedule||[],...(Number(publication.expectedSeries)>0?{expectedSeries:Number(publication.expectedSeries)}:{}),...(row.progress?{progress:row.progress}:{}),publication:{series:Boolean(publication.series),results:Boolean(publication.results)},version:Number(row.version)};}
  function configView(row) {return row?{state:effectiveState(row),configuredState:row.state,publicVisible:Boolean(row.public_visible),consoles:read(row.enabled_consoles_json,[]),documents:read(row.documents_json,[]),version:Number(row.version),revision:Number(row.public_revision)}:null;}
  const effectiveState=row=>archive.fromRow(row,clock());
  async function detail(id,eventId,publicOnly=false) {
    const competition=await native(id);let current;
    try{current=await config(id);}catch(error){if(error.code==='ER_NO_SUCH_TABLE')throw fail("Les tables du Direct ne sont pas encore installées.");throw error;}
    if(publicOnly&&(!current||!current.public_visible||current.state==='disabled'))throw fail("Le Direct de cette compétition n’est pas ouvert.","not-found");
    if(!current)return {competition,config:null,events:[],entries:[]};
    if(current.state==='resetting'){const resetModule=require('./nap-direct-reset');return {competition,config:configView(current),resetProgress:resetModule.progress(await resetModule.pending(pool,scope(id))),events:[],entries:[],selectedEventId:null};}
    const list=await program(id);
    const visible=publicOnly?list.filter(e=>{const p=read(e.publication_state_json);return p.series||p.results;}):list;
    const selected=eventId?visible.find(e=>e.id===eventId):visible[0];
    const rows=selected?await entries(id,selected.id):[],p=read(selected?.publication_state_json);
    return {competition,config:configView(current),events:visible.map(eventView),selectedEventId:selected?.id||null,entries:publicOnly?rows.map(row=>model.publicEntry(row,Boolean(p.series),Boolean(p.results),model.participationFor(p,row.participant_key))):rows.map(row=>({...model.publicEntry(row,true,true,model.participationFor(p,row.participant_key)),sourceEntryId:row.source_entry_id,swimmerId:row.swimmer_id,clubId:row.club_id}))};
  }
  async function watchContext(id,input={}){
    const competition=await native(id),current=await config(id);
    archive.writable(current,input.archiveCorrection===true,clock());
    const list=await events(id);if(list.length>model.MAX_EVENTS)throw fail('Programme trop volumineux.');
    const all=await q(`SELECT * FROM livepalmes_direct_entries WHERE environment=? AND competition_id=? ORDER BY event_id,series_number,lane,participant_key LIMIT ${model.MAX_MEET_ENTRIES+1}`,scope(id));
    if(all.length>model.MAX_MEET_ENTRIES)throw fail('Compétition trop volumineuse.');
    const publications=new Map(list.map(event=>[event.id,read(event.publication_state_json)]));
    const visible=new Set(list.filter(row=>read(row.publication_state_json).series).map(row=>row.id)),rows=all.filter(row=>visible.has(row.event_id)&&row.has_series&&row.series_number!=null),heats=new Map();
    for(const row of rows){const key=row.event_id+':'+Number(row.series_number);if(!heats.has(key))heats.set(key,[]);heats.get(key).push(row);}
    return {competition,config:configView(current),events:list.filter(row=>visible.has(row.id)).map(eventView),entries:rows.map(row=>({...model.publicEntry(row,true,true,model.participationFor(publications.get(row.event_id),row.participant_key)),eventId:row.event_id,sourceEntryId:row.source_entry_id})),seriesFingerprints:Object.fromEntries([...heats].map(([key,values])=>[key,model.seriesFingerprint(values)]))};
  }
  async function transaction(id,actor,expected,callback,{allowClosed=false,allowMissing=false,allowReset=false,archiveCorrection=false}={}) {
    const c=await pool.getConnection();let started=false;
    try{await c.beginTransaction();started=true;const current=await config(id,c,true);
      if(!current&&!allowMissing)throw fail("Activer le Direct avant cette action.");
      if(current&&Number(expected)!==Number(current.version))throw fail("La compétition a changé. Actualiser avant de confirmer.","aborted");
      if(current?.state==='resetting'&&!allowReset)throw fail('Réinitialisation en cours. Terminer la suppression avant toute autre modification.');
      if(current&&!allowClosed)archive.writable(current,archiveCorrection,clock());
      const result=await callback(c,current);
      if(current&&!allowClosed)archive.writable(current,archiveCorrection,clock());
      if(current)await execute(c,"UPDATE livepalmes_direct_competitions SET version=version+1,public_revision=public_revision+1,updated_at=UTC_TIMESTAMP(6),updated_by=? WHERE environment=? AND competition_id=?",[actor.uid,...scope(id)]);
      await c.commit();started=false;caches.delete(`${environment}:${id}`);return result;
    }catch(error){if(started)await c.rollback();throw error;}finally{c.release();}
  }
  async function settings(id,actor,input) {
    return transaction(id,actor,input.version,async(c,current)=>{
      await require('./nap-direct-console-store').createConsoleStore(pool,{native,scope}).validateSettings(id,input,c);
      const roles=[...new Set(['computer',...(input.consoles||[])])];if(roles.some(role=>!model.ROLES.includes(role)))throw new TypeError("Console inconnue.");
      const state=input.state||'active';if(!['active','archived','disabled'].includes(state))throw new TypeError("État Direct invalide.");
      if(current)await execute(c,"UPDATE livepalmes_direct_competitions SET state=?,public_visible=?,enabled_consoles_json=? WHERE environment=? AND competition_id=?",[state,input.publicVisible===false?0:1,json(roles),...scope(id)]);
      else await execute(c,"INSERT INTO livepalmes_direct_competitions (environment,competition_id,state,public_visible,enabled_consoles_json,documents_json,public_revision,version,created_at,updated_at,created_by,updated_by) VALUES (?,?,?,?,?,JSON_ARRAY(),1,1,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),?,?)",[...scope(id),state,input.publicVisible===false?0:1,json(roles),actor.uid,actor.uid]);
      await journal(c,id,actor,{action:current?'settings':'activate',before:configView(current),after:{state,roles},operationKey:input.operationKey});
      return {ok:true};
    },{allowClosed:true,allowMissing:true});
  }
  async function journal(c,id,actor,{eventId=null,action,before=null,after=null,source={},operationKey,batchId=''}) {
    if(!/^[a-zA-Z0-9_-]{16,64}$/.test(operationKey||''))throw new TypeError("Identifiant de demande requis.");
    const key=model.hash([operationKey,eventId]);
    await execute(c,"INSERT INTO livepalmes_direct_publications (environment,competition_id,id,batch_id,event_id,operation_key,action,source_type,source_name,source_hash,before_json,after_json,created_at,created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6),?)",[...scope(id),key,model.clean(batchId,64),eventId,key,action,source.type||'manual',source.name||'',source.hash||'',json(before),json(after),actor.uid]);
  }
  async function preview(id,input) {
    const competition=await native(id),prepared=model.prepare(input,competition),current=await config(id);
    if(prepared.seriesFingerprint)throw fail('Utiliser la publication groupée pour les résultats TXT contrôlés.');
    archive.writable(current,false,clock());
    const before=await entries(id,prepared.event.id);
    checkRelayResultMapping(prepared,before);
    return {prepared,version:Number(current.version),replaces:before.some(row=>prepared.kind==='series'?Boolean(row.entry_time_raw)||row.series_number!=null:Boolean(row.result_time_raw)||Boolean(row.result_status)),fingerprint:model.hash([prepared,Number(current.version)])};
  }
  async function publish(id,actor,input) {
    const preparedRetry=model.prepare(input,await native(id));
    const receipt=await q("SELECT after_json FROM livepalmes_direct_publications WHERE environment=? AND competition_id=? AND operation_key=? LIMIT 1",[...scope(id),model.hash([input.operationKey,preparedRetry.event.id])]);
    if(receipt.length){if(model.hash(read(receipt[0].after_json))!==model.hash(preparedRetry))throw fail("Identifiant déjà utilisé pour un autre contenu.","aborted");return {ok:true,eventId:preparedRetry.event.id,count:preparedRetry.rows.length,replayed:true};}
    const previewed=await preview(id,input);
    if(input.fingerprint!==previewed.fingerprint)throw fail("L’aperçu a changé. Contrôler de nouveau avant publication.","aborted");
    if(previewed.replaces&&input.confirmReplacement!==true)throw fail("Confirmer le remplacement des données déjà publiées.");
    return transaction(id,actor,previewed.version,async(c)=>{
      const prepared=previewed.prepared,list=await events(id,c),before=await entries(id,prepared.event.id,c);
      await applyPrepared(c,id,actor,prepared,input,list,before,previewed.replaces);
      await checkMeetLimit(c,id);
      return {ok:true,eventId:prepared.event.id,count:prepared.rows.length};
    });
  }
  async function applyPrepared(c,id,actor,prepared,input,list,before,replaces,allBefore=before){
      const e=prepared.event;
      if(!list.some(row=>row.id===e.id)&&list.length>=model.MAX_EVENTS)throw fail("Nombre maximal d’épreuves atteint.");
      const current=list.find(row=>row.id===e.id),publication={...read(current?.publication_state_json),[prepared.kind]:true};
      if(input.archiveCorrection===true&&allBefore.some(row=>row.has_result))publication.results=Boolean(read(current.publication_state_json).results);
      if(prepared.kind==='series'&&e.expectedSeries){publication.expectedSeries=prepared.seriesNumber==null?e.expectedSeries:Math.max(Number(publication.expectedSeries)||0,e.expectedSeries);}
      if(prepared.kind==='series'&&prepared.event.heatSchedule){
        const incoming=new Map(prepared.event.heatSchedule.map(heat=>[heat.number,heat]));
        publication.heatSchedule=prepared.seriesNumber==null?prepared.event.heatSchedule:[...(publication.heatSchedule||[]).filter(heat=>!incoming.has(heat.number)),...incoming.values()].sort((a,b)=>a.number-b.number);
      }
      const scheduledAt=prepared.seriesFingerprint?current.scheduled_at||'':prepared.kind==='series'&&prepared.seriesNumber==null?e.scheduledAt:e.scheduledAt||current?.scheduled_at||'';
      const order=prepared.seriesFingerprint?Number(current.program_order)||0:e.order||Number(current?.program_order)||0;
      const eventLabel=prepared.seriesFingerprint?current.event_label:e.eventLabel;

      // Each batch updates only its own facet. Series imported after results preserve results.
      const resolved=[];
      const values=prepared.rows.map(row=>{
        let key=row.key,sourceEntryId=row.sourceEntryId;
        if(row.kind==='relay'&&!prepared.seriesFingerprint){
          const base=relayKey(row),matches=allBefore.filter(old=>old.entry_kind==='relay'&&relayKey(old)===base),position=matches.filter(old=>row.series&&row.lane!=null&&Number(old.series_number)===row.series&&Number(old.lane)===row.lane);
          const previous=position.length===1?position[0]:matches.length===1&&(prepared.kind==='results'||!row.sourceEntryId)?matches[0]:null;
          if(previous){key=previous.participant_key;sourceEntryId=previous.source_entry_id||null;}
          else if(prepared.kind==='series'&&matches.some(old=>old.has_result))throw fail('Un résultat de relais existe sans association certaine. Contrôler son association avec les séries complètes avant de réimporter.');
        }
        resolved.push({...row,key});
        return [...scope(id),e.id,key,sourceEntryId,row.kind,row.swimmerId,row.clubId,row.lastName,row.firstName,row.birthYear,row.club,row.category,row.series,row.lane,row.seed.raw,row.seed.cs,row.seed.status,row.result.raw,row.result.cs,row.status,row.rank,json(row.members),json(row.splits),prepared.kind==='series'?1:0,prepared.kind==='results'?1:0,actor.uid,actor.uid];
      });
      // Participation annotations belong to this imported event, not the native swimmer identity.
      // Reuse its bounded JSON metadata; TXT result updates cannot clear or replace them.
      const surviving=new Set(allBefore.filter(row=>row.has_result||row.has_series&&(prepared.kind!=='series'||prepared.seriesNumber!=null&&Number(row.series_number)!==prepared.seriesNumber)).map(row=>row.participant_key));
      resolved.forEach(row=>surviving.add(row.key));
      const annotations=Object.fromEntries(Object.entries(publication.participationStatuses||{}).filter(([key])=>surviving.has(key)));
      if(prepared.kind==='series')for(const row of resolved){if(row.participationStatus===undefined)continue;if(row.participationStatus)annotations[row.key]=row.participationStatus;else delete annotations[row.key];}
      if(Object.keys(annotations).length)publication.participationStatuses=annotations;else delete publication.participationStatuses;
      await execute(c,"INSERT INTO livepalmes_direct_events (environment,competition_id,id,source_event_id,event_code,event_label,sex,phase,event_date,session_key,session_label,program_order,event_number,scheduled_at,publication_state_json,version,created_at,updated_at,created_by,updated_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),?,?) ON DUPLICATE KEY UPDATE source_event_id=COALESCE(VALUES(source_event_id),source_event_id),publication_state_json=VALUES(publication_state_json),event_label=VALUES(event_label),program_order=VALUES(program_order),scheduled_at=VALUES(scheduled_at),version=version+1,updated_at=UTC_TIMESTAMP(6),updated_by=VALUES(updated_by)",[...scope(id),e.id,e.sourceEventId,e.eventCode,eventLabel,e.sex,e.phase,e.date,e.sessionKey,e.sessionLabel,order,e.eventNumber,scheduledAt,json(publication),actor.uid,actor.uid]);
      const columns='environment,competition_id,event_id,participant_key,source_entry_id,entry_kind,swimmer_id,club_id,last_name,first_name,birth_year,club_label,category_code,series_number,lane,entry_time_raw,entry_time_cs,entry_time_status,result_time_raw,result_time_cs,result_status,published_rank,relay_members_json,splits_json,has_series,has_result,created_by,updated_by';
      const facet=prepared.kind==='series'?['series_number','lane','entry_time_raw','entry_time_cs','entry_time_status','has_series']:['result_time_raw','result_time_cs','result_status','published_rank','splits_json','has_result'];
      const shared=prepared.seriesFingerprint?[]:['category_code','club_label','relay_members_json'];
      const clear=prepared.kind==='series'?"has_series=0,entry_time_raw='',entry_time_cs=NULL,entry_time_status='missing',series_number=NULL,lane=NULL":"has_result=0,result_time_raw='',result_time_cs=NULL,result_status='',published_rank=NULL,splits_json=JSON_ARRAY()";
      await execute(c,`UPDATE livepalmes_direct_entries SET ${clear} WHERE environment=? AND competition_id=? AND event_id=?${prepared.seriesNumber!=null?' AND series_number=?':''}`,[...scope(id),e.id,...(prepared.seriesNumber!=null?[prepared.seriesNumber]:[])]);
      const assignment=',source_entry_id=COALESCE(VALUES(source_entry_id),source_entry_id)'+(prepared.kind==='results'?',series_number=COALESCE(VALUES(series_number),series_number),lane=COALESCE(VALUES(lane),lane)':'');
      for(let offset=0;offset<values.length;offset+=200){const batch=values.slice(offset,offset+200);await execute(c,`INSERT INTO livepalmes_direct_entries (${columns},version,created_at,updated_at) VALUES ${batch.map(()=>`(${Array(28).fill('?').join(',')},1,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))`).join(',')} ON DUPLICATE KEY UPDATE ${[...facet,...shared].map(name=>`${name}=VALUES(${name})`).join(',')}${assignment},version=version+1,updated_at=UTC_TIMESTAMP(6),updated_by=VALUES(updated_by)`,batch.flat());}
      await execute(c,"DELETE FROM livepalmes_direct_entries WHERE environment=? AND competition_id=? AND event_id=? AND has_series=0 AND has_result=0",[...scope(id),e.id]);
      await journal(c,id,actor,{eventId:e.id,action:replaces?'replace':'publish',before:{event:current||null,entries:before},after:prepared,source:prepared.source,operationKey:input.operationKey,batchId:input.batchId});
      const base=current||{id:e.id,event_code:e.eventCode,sex:e.sex,phase:e.phase,event_date:e.date,session_key:e.sessionKey,session_label:e.sessionLabel,event_number:e.eventNumber};
      const updated={...base,event_label:eventLabel,program_order:order,scheduled_at:scheduledAt,publication_state_json:json(publication),version:Number(current?.version||0)+1};
      const index=list.findIndex(row=>row.id===e.id);if(index<0)list.push(updated);else list[index]=updated;
  }
  async function checkMeetLimit(c,id){return progress.read(c,scope(id));}
  function replacesScope(prepared,rows){return rows.some(row=>(prepared.seriesNumber==null||Number(row.series_number)===prepared.seriesNumber)&&(prepared.kind==='series'?Boolean(row.has_series):Boolean(row.has_result)));}
  function relayKey(row){return model.entry({relay:true,lastName:row.last_name??row.lastName,firstName:row.first_name??row.firstName,club:row.club_label??row.club}).key;}
  function checkRelayResultMapping(prepared,rows){
    if(prepared.kind!=='results'||prepared.seriesFingerprint)return;
    if(prepared.rows.some(row=>row.kind==='relay'&&!row.sourceEntryId&&rows.filter(old=>old.entry_kind==='relay'&&relayKey(old)===relayKey(row)).length>1))throw fail('Plusieurs équipes de relais portent ce nom. Utiliser les résultats TXT associés aux séries pour éviter de confondre les équipes.');
  }
  async function previewBatch(id,input){
    const batch=model.prepareBatch(input,await native(id)),current=await config(id);
    archive.writable(current,input.archiveCorrection===true,clock());
    if(input.archiveCorrection===true){
      const kinds=new Set(batch.groups.map(group=>group.kind));
      if(kinds.size!==1||batch.groups.some((group,index)=>group.kind==='series'?group.source.type!=='pdf'||input.groups[index].source?.type!=='pdf':group.kind!=='results'||!group.seriesFingerprint||!group.seriesNumber||group.source.type!=='winpalme-txt'))throw fail('Mettre à jour séparément les séries PDF puis les résultats WinPalme associés aux séries de l’archive.');
    }
    const list=await events(id);if(list.length>model.MAX_EVENTS)throw fail('Programme trop volumineux.');
    const all=await q(`SELECT * FROM livepalmes_direct_entries WHERE environment=? AND competition_id=? ORDER BY event_id,series_number,lane,participant_key LIMIT ${model.MAX_MEET_ENTRIES+1}`,scope(id));
    if(all.length>model.MAX_MEET_ENTRIES)throw fail('Compétition trop volumineuse.');
    const byEvent=new Map();for(const row of all){if(!byEvent.has(row.event_id))byEvent.set(row.event_id,[]);byEvent.get(row.event_id).push(row);}
    for(const group of batch.groups)checkRelayResultMapping(group,byEvent.get(group.event.id)||[]);
    for(const group of batch.groups){if(!group.seriesFingerprint)continue;
      const event=list.find(row=>row.id===group.event.id),before=(byEvent.get(group.event.id)||[]).filter(row=>row.has_series&&Number(row.series_number)===group.seriesNumber);
      if(!event||!read(event.publication_state_json).series||!before.length||model.seriesFingerprint(before)!==group.seriesFingerprint)throw fail('La répartition des séries a changé. Arrêter et reconfigurer la surveillance.','aborted');
      if(before.length!==group.rows.length||group.rows.some(row=>!before.some(old=>old.participant_key===row.key&&Number(old.series_number)===row.series&&Number(old.lane)===row.lane)))throw fail('Les lignes du TXT ne correspondent pas aux séries importées. Contrôler la répartition.');
      if(input.archiveCorrection===true&&group.rows.some(row=>{const old=before.find(value=>value.participant_key===row.key);return row.lastName!==old.last_name||row.firstName!==old.first_name||Number(row.birthYear)!==Number(old.birth_year)||row.club!==old.club_label||row.category!==old.category_code||row.seed.raw!==old.entry_time_raw||model.hash(row.members)!==model.hash(read(old.relay_members_json,[]));}))throw fail('Les identités, engagements et catégories des séries doivent rester inchangés en archive.');
    }
    if(new Set([...list.map(row=>row.id),...batch.groups.map(group=>group.event.id)]).size>model.MAX_EVENTS)throw fail('Nombre maximal d’épreuves atteint.');
    const replaced=batch.groups.map(group=>replacesScope(group,byEvent.get(group.event.id)||[]));
    return {batch,version:Number(current.version),list,byEvent,replaced,fingerprint:model.hash(input.archiveCorrection===true?[batch.groups,Number(current.version),'archive-update']:[batch.groups,Number(current.version)]),replacements:batch.groups.filter((_,index)=>replaced[index]).map(group=>group.event.eventLabel+' · '+group.event.sex+' · '+group.event.sessionLabel+(group.seriesNumber?' · Série '+group.seriesNumber:''))};
  }
  async function batchReceipt(id,batch){
    const receipt=await q('SELECT after_json FROM livepalmes_direct_publications WHERE environment=? AND competition_id=? AND operation_key=? LIMIT 1',[...scope(id),model.hash([batch.operationKey,null])]);
    if(!receipt.length)return null;
    if(read(receipt[0].after_json).contentHash!==batch.contentHash)throw fail('Identifiant déjà utilisé pour un autre contenu.','aborted');
    return {ok:true,count:batch.count,groups:batch.groups.length,replayed:true};
  }
  async function publishBatch(id,actor,input){
    const batch=model.prepareBatch(input,await native(id)),previous=await batchReceipt(id,batch);if(previous){archive.writable(await config(id),input.archiveCorrection===true,clock());return previous;}
    const previewed=await previewBatch(id,input);
    if(input.fingerprint!==previewed.fingerprint)throw fail('L’aperçu a changé. Contrôler de nouveau avant publication.','aborted');
    if(previewed.replacements.length&&input.confirmReplacement!==true)throw fail('Confirmer le remplacement des données déjà publiées.');
    return transaction(id,actor,previewed.version,async(c,current)=>{
      for(let index=0;index<batch.groups.length;index++){
        const prepared=batch.groups[index];
        const before=(previewed.byEvent.get(prepared.event.id)||[]).filter(row=>prepared.seriesNumber==null||Number(row.series_number)===prepared.seriesNumber);
        await applyPrepared(c,id,actor,prepared,{operationKey:model.hash([batch.operationKey,input.groups[index].operationKey]),batchId:batch.operationKey,archiveCorrection:input.archiveCorrection===true},previewed.list,before,previewed.replaced[index],previewed.byEvent.get(prepared.event.id)||[]);
      }
      const counts=await checkMeetLimit(c,id);
      await journal(c,id,actor,{action:'publish-batch',operationKey:batch.operationKey,batchId:batch.operationKey,after:{contentHash:batch.contentHash,count:batch.count,groups:batch.groups.length}});
      return {ok:true,count:batch.count,groups:batch.groups.length,version:Number(current.version)+1,revision:Number(current.public_revision)+1,events:previewed.list.map(row=>eventView({...row,progress:counts.get(row.id)||progress.empty()}))};
    },{archiveCorrection:input.archiveCorrection===true});
  }
  async function visibility(id,actor,input) {
    if(!['series','results'].includes(input.kind)||typeof input.visible!=='boolean')throw new TypeError("Publication à retirer ou rétablir invalide.");
    return transaction(id,actor,input.version,async(c)=>{const rows=await events(id,c),event=rows.find(e=>e.id===input.eventId);if(!event)throw fail("Épreuve introuvable.","not-found");const before=read(event.publication_state_json),after={...before,[input.kind]:input.visible};await execute(c,"UPDATE livepalmes_direct_events SET publication_state_json=?,version=version+1,updated_at=UTC_TIMESTAMP(6),updated_by=? WHERE environment=? AND competition_id=? AND id=?",[json(after),actor.uid,...scope(id),event.id]);await journal(c,id,actor,{eventId:event.id,action:input.visible?'restore':'withdraw',before,after,operationKey:input.operationKey});return {ok:true};});
  }
  async function grants(id) {const rows=await q("SELECT user_uid,can_manage,allowed_consoles_json,active,expires_at FROM livepalmes_direct_access WHERE environment=? AND competition_id=? ORDER BY user_uid LIMIT 101",scope(id));if(rows.length>100)throw fail("Trop de délégations.");return rows.map(r=>({uid:r.user_uid,manage:Boolean(r.can_manage),consoles:read(r.allowed_consoles_json,[]),active:Boolean(r.active),expiresAt:r.expires_at}));}
  async function grant(id,actor,input,target) {
    const roles=[...new Set(input.consoles||['computer'])];if(roles.some(role=>!model.ROLES.includes(role)))throw new TypeError("Console inconnue.");
    if(input.expiresAt&&!Number.isFinite(Date.parse(input.expiresAt)))throw new TypeError("Expiration invalide.");
    return transaction(id,actor,input.version,async(c,current)=>{const existing=await execute(c,"SELECT user_uid FROM livepalmes_direct_access WHERE environment=? AND competition_id=? LIMIT 101",scope(id));if(existing.length>=100&&!existing.some(r=>r.user_uid===target.uid))throw fail("Trop de délégations.");await execute(c,"INSERT INTO livepalmes_direct_access (environment,competition_id,user_uid,can_manage,allowed_consoles_json,active,expires_at,version,created_at,updated_at,created_by,updated_by) VALUES (?,?,?,?,?,?,?,1,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),?,?) ON DUPLICATE KEY UPDATE can_manage=VALUES(can_manage),allowed_consoles_json=VALUES(allowed_consoles_json),active=VALUES(active),expires_at=VALUES(expires_at),version=version+1,updated_at=UTC_TIMESTAMP(6),updated_by=VALUES(updated_by)",[...scope(id),target.uid,input.manage===true?1:0,json(roles),input.active===false?0:1,input.expiresAt?new Date(input.expiresAt).toISOString().slice(0,23).replace('T',' '):null,actor.uid,actor.uid]);await journal(c,id,actor,{action:'delegate',before:null,after:{uid:target.uid,manage:input.manage===true,roles,active:input.active!==false},operationKey:input.operationKey});return {ok:true,version:Number(current.version)+1};},{allowClosed:true});
  }
  async function history(id,cursor='') {
    if(cursor&&!/^\d{4}-\d\d-\d\d .+\|[a-f0-9]{64}$/.test(cursor))throw new TypeError("Page d’historique invalide.");
    const split=cursor?cursor.split('|'):null;
    const rows=await q(`SELECT id,action,source_name,source_type,created_at,created_by,event_id FROM livepalmes_direct_publications WHERE environment=? AND competition_id=?${split?' AND (created_at<? OR (created_at=? AND id<?))':''} ORDER BY created_at DESC,id DESC LIMIT 51`,[...scope(id),...(split?[split[0],split[0],split[1]]:[])]);
    const page=rows.slice(0,50),last=page.at(-1);return {items:page,nextCursor:rows.length>50?`${last.created_at}|${last.id}`:null};
  }
  async function document(id,actor,input,writeDocument) {
    if(input.archiveCorrection===true&&input.documentKind!=='series')throw fail('Seul le PDF des séries peut être publié pendant la mise à jour de l’archive.');
    if(!/^[a-zA-Z0-9_-]{16,64}$/.test(input.operationKey||''))throw new TypeError('Identifiant de demande requis.');
    return transaction(id,actor,input.version,async(c,current)=>{const metadata=typeof writeDocument==='function'?await writeDocument():writeDocument;const before=read(current.documents_json,[]),after=before.filter(d=>d.id!==metadata.id);after.push(metadata);if(after.length>20)throw new TypeError("20 documents complets au maximum.");await execute(c,"UPDATE livepalmes_direct_competitions SET documents_json=? WHERE environment=? AND competition_id=?",[json(after),...scope(id)]);await journal(c,id,actor,{action:'document',before,after,source:{type:'pdf',name:metadata.title,hash:metadata.hash},operationKey:input.operationKey});return {ok:true,document:metadata,version:Number(current.version)+1};},{archiveCorrection:input.archiveCorrection===true});
  }
  async function reset(id,actor,input,purgeFiles,checkFiles=async()=>{}){
    const resetModule=require('./nap-direct-reset');
    if(!['begin','continue'].includes(input.phase))throw new TypeError('Étape de réinitialisation invalide.');
    if(input.phase==='begin'&&input.confirmation!=='supprimer-direct-'+model.competitionId(id))throw new TypeError('Confirmation de suppression définitive requise.');
    return transaction(id,actor,input.version,async(c,current)=>{
      if(input.phase==='begin')await checkFiles();
      const result=input.phase==='begin'?await resetModule.begin(c,scope(id),actor,current,input):await resetModule.step(c,scope(id),current,purgeFiles);
      return {...result,version:Number(current.version)+1,revision:Number(current.public_revision)+1};
    },{allowClosed:true,allowReset:true});
  }
  return {native,config,access,detail,program,events,entries,watchContext,settings,preview,publish,previewBatch,publishBatch,visibility,grants,grant,history,document,reset,scope,q,eventView,configView,effectiveState,clock};
}
module.exports={createStore,fail};
