"use strict";
const model=require("./nap-direct-model"),{execute}=require("./nap-query");
const {SELECT_EVENT,EVENT_JOINS,eventFromRow}=require("./nap-calendar-event");
const json=JSON.stringify, read=model.parseJson;
const fail=(message,code="failed-precondition")=>Object.assign(new Error(message),{directCode:code});
const caches=new Map();
function createStore(pool,environment) {
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
  async function config(id,connection=pool,lock=false) {return (await execute(connection,`SELECT * FROM livepalmes_direct_competitions WHERE environment=? AND competition_id=? LIMIT 1${lock?' FOR UPDATE':''}`,scope(id)))[0]||null;}
  async function access(id,uid) {return (await q("SELECT * FROM livepalmes_direct_access WHERE environment=? AND competition_id=? AND user_uid=? AND active=1 AND (expires_at IS NULL OR expires_at>UTC_TIMESTAMP(6)) LIMIT 1",[...scope(id),uid]))[0]||null;}
  async function events(id,connection=pool) {return execute(connection,`SELECT * FROM livepalmes_direct_events WHERE environment=? AND competition_id=? ORDER BY program_order,id LIMIT ${model.MAX_EVENTS+1}`,scope(id));}
  async function entries(id,eventId,connection=pool) {const rows=await execute(connection,`SELECT * FROM livepalmes_direct_entries WHERE environment=? AND competition_id=? AND event_id=? ORDER BY series_number,lane,participant_key LIMIT ${model.MAX_ENTRIES+1}`,[...scope(id),eventId]);if(rows.length>model.MAX_ENTRIES)throw fail("Épreuve trop volumineuse.");return rows;}
  function eventView(row) {return {id:row.id,eventCode:row.event_code,eventLabel:row.event_label,sex:row.sex,phase:row.phase,date:row.event_date,sessionKey:row.session_key,sessionLabel:row.session_label,order:row.program_order,eventNumber:row.event_number,scheduledAt:row.scheduled_at,publication:read(row.publication_state_json),version:Number(row.version)};}
  function configView(row) {return row?{state:row.state,publicVisible:Boolean(row.public_visible),consoles:read(row.enabled_consoles_json,[]),documents:read(row.documents_json,[]),version:Number(row.version),revision:Number(row.public_revision)}:null;}
  async function detail(id,eventId,publicOnly=false) {
    const competition=await native(id);let current;
    try{current=await config(id);}catch(error){if(error.code==='ER_NO_SUCH_TABLE')throw fail("Les tables du Direct ne sont pas encore installées.");throw error;}
    if(publicOnly&&(!current||!current.public_visible||current.state==='disabled'))throw fail("Le Direct de cette compétition n’est pas ouvert.","not-found");
    if(!current)return {competition,config:null,events:[],entries:[]};
    const list=await events(id);if(list.length>model.MAX_EVENTS)throw fail("Programme trop volumineux.");
    const visible=publicOnly?list.filter(e=>{const p=read(e.publication_state_json);return p.series||p.results;}):list;
    const selected=eventId?visible.find(e=>e.id===eventId):visible[0];
    const rows=selected?await entries(id,selected.id):[],p=read(selected?.publication_state_json);
    return {competition,config:configView(current),events:visible.map(eventView),selectedEventId:selected?.id||null,entries:publicOnly?rows.map(row=>model.publicEntry(row,Boolean(p.series),Boolean(p.results))):rows.map(row=>({...model.publicEntry(row,true,true),sourceEntryId:row.source_entry_id,swimmerId:row.swimmer_id,clubId:row.club_id}))};
  }
  async function transaction(id,actor,expected,callback,{allowClosed=false,allowMissing=false}={}) {
    const c=await pool.getConnection();let started=false;
    try{await c.beginTransaction();started=true;const current=await config(id,c,true);
      if(!current&&!allowMissing)throw fail("Activer le Direct avant cette action.");
      if(current&&Number(expected)!==Number(current.version))throw fail("La compétition a changé. Actualiser avant de confirmer.","aborted");
      if(current&&current.state!=="active"&&!allowClosed)throw fail("Les consoles de cette compétition sont fermées.");
      const result=await callback(c,current);
      if(current)await execute(c,"UPDATE livepalmes_direct_competitions SET version=version+1,public_revision=public_revision+1,updated_at=UTC_TIMESTAMP(6),updated_by=? WHERE environment=? AND competition_id=?",[actor.uid,...scope(id)]);
      await c.commit();started=false;caches.delete(`${environment}:${id}`);return result;
    }catch(error){if(started)await c.rollback();throw error;}finally{c.release();}
  }
  async function settings(id,actor,input) {
    return transaction(id,actor,input.version,async(c,current)=>{
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
    if(!current||current.state!=='active')throw fail("Activer le Direct avant la publication.");
    const before=await entries(id,prepared.event.id);
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
      const prepared=previewed.prepared,e=prepared.event,before=await entries(id,e.id,c),list=await events(id,c);
      if(!list.some(row=>row.id===e.id)&&list.length>=model.MAX_EVENTS)throw fail("Nombre maximal d’épreuves atteint.");
      const current=list.find(row=>row.id===e.id),publication={...read(current?.publication_state_json),[prepared.kind]:true};
      await execute(c,"INSERT INTO livepalmes_direct_events (environment,competition_id,id,source_event_id,event_code,event_label,sex,phase,event_date,session_key,session_label,program_order,event_number,scheduled_at,publication_state_json,version,created_at,updated_at,created_by,updated_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),?,?) ON DUPLICATE KEY UPDATE publication_state_json=VALUES(publication_state_json),event_label=VALUES(event_label),program_order=VALUES(program_order),scheduled_at=VALUES(scheduled_at),version=version+1,updated_at=UTC_TIMESTAMP(6),updated_by=VALUES(updated_by)",[...scope(id),e.id,e.sourceEventId,e.eventCode,e.eventLabel,e.sex,e.phase,e.date,e.sessionKey,e.sessionLabel,e.order,e.eventNumber,e.scheduledAt,json(publication),actor.uid,actor.uid]);
      // Each batch updates only its own facet. Series imported after results preserve results.
      const values=prepared.rows.map(row=>[...scope(id),e.id,row.key,row.sourceEntryId,row.kind,row.swimmerId,row.clubId,row.lastName,row.firstName,row.birthYear,row.club,row.category,row.series,row.lane,row.seed.raw,row.seed.cs,row.seed.status,row.result.raw,row.result.cs,row.status,row.rank,json(row.members),json(row.splits),prepared.kind==='series'?1:0,prepared.kind==='results'?1:0,actor.uid,actor.uid]);
      const columns='environment,competition_id,event_id,participant_key,source_entry_id,entry_kind,swimmer_id,club_id,last_name,first_name,birth_year,club_label,category_code,series_number,lane,entry_time_raw,entry_time_cs,entry_time_status,result_time_raw,result_time_cs,result_status,published_rank,relay_members_json,splits_json,has_series,has_result,created_by,updated_by';
      const facet=prepared.kind==='series'?['series_number','lane','entry_time_raw','entry_time_cs','entry_time_status','has_series']:['result_time_raw','result_time_cs','result_status','published_rank','splits_json','has_result'];
      const shared=['category_code','club_label','relay_members_json'];
      const clear=prepared.kind==='series'?"has_series=0,entry_time_raw='',entry_time_cs=NULL,entry_time_status='missing',series_number=NULL,lane=NULL":"has_result=0,result_time_raw='',result_time_cs=NULL,result_status='',published_rank=NULL,splits_json=JSON_ARRAY()";
      await execute(c,`UPDATE livepalmes_direct_entries SET ${clear} WHERE environment=? AND competition_id=? AND event_id=?${prepared.seriesNumber!=null?' AND series_number=?':''}`,[...scope(id),e.id,...(prepared.seriesNumber!=null?[prepared.seriesNumber]:[])]);
      const assignment=prepared.kind==='results'?',series_number=COALESCE(VALUES(series_number),series_number),lane=COALESCE(VALUES(lane),lane)':'';
      for(let offset=0;offset<values.length;offset+=200){const batch=values.slice(offset,offset+200);await execute(c,`INSERT INTO livepalmes_direct_entries (${columns},version,created_at,updated_at) VALUES ${batch.map(()=>`(${Array(28).fill('?').join(',')},1,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))`).join(',')} ON DUPLICATE KEY UPDATE ${[...facet,...shared].map(name=>`${name}=VALUES(${name})`).join(',')}${assignment},version=version+1,updated_at=UTC_TIMESTAMP(6),updated_by=VALUES(updated_by)`,batch.flat());}
      await execute(c,"DELETE FROM livepalmes_direct_entries WHERE environment=? AND competition_id=? AND event_id=? AND has_series=0 AND has_result=0",[...scope(id),e.id]);
      const count=await execute(c,`SELECT COUNT(*) AS total FROM (SELECT participant_key FROM livepalmes_direct_entries WHERE environment=? AND competition_id=? LIMIT ${model.MAX_MEET_ENTRIES+1}) bounded`,scope(id));
      if(Number(count[0]?.total)>model.MAX_MEET_ENTRIES)throw fail("Volume maximal du Direct dépassé (15 000 participations, phases comprises).");
      await journal(c,id,actor,{eventId:e.id,action:previewed.replaces?'replace':'publish',before:{event:current||null,entries:before},after:prepared,source:prepared.source,operationKey:input.operationKey,batchId:input.batchId});
      return {ok:true,eventId:e.id,count:prepared.rows.length};
    });
  }
  async function visibility(id,actor,input) {
    if(!['series','results'].includes(input.kind)||typeof input.visible!=='boolean')throw new TypeError("Publication à retirer ou rétablir invalide.");
    return transaction(id,actor,input.version,async(c)=>{const rows=await events(id,c),event=rows.find(e=>e.id===input.eventId);if(!event)throw fail("Épreuve introuvable.","not-found");const before=read(event.publication_state_json),after={...before,[input.kind]:input.visible};await execute(c,"UPDATE livepalmes_direct_events SET publication_state_json=?,version=version+1,updated_at=UTC_TIMESTAMP(6),updated_by=? WHERE environment=? AND competition_id=? AND id=?",[json(after),actor.uid,...scope(id),event.id]);await journal(c,id,actor,{eventId:event.id,action:input.visible?'restore':'withdraw',before,after,operationKey:input.operationKey});return {ok:true};});
  }
  async function grants(id) {const rows=await q("SELECT user_uid,can_manage,allowed_consoles_json,active,expires_at FROM livepalmes_direct_access WHERE environment=? AND competition_id=? ORDER BY user_uid LIMIT 101",scope(id));if(rows.length>100)throw fail("Trop de délégations.");return rows.map(r=>({uid:r.user_uid,manage:Boolean(r.can_manage),consoles:read(r.allowed_consoles_json,[]),active:Boolean(r.active),expiresAt:r.expires_at}));}
  async function grant(id,actor,input,target) {
    const roles=[...new Set(input.consoles||['computer'])];if(roles.some(role=>!model.ROLES.includes(role)))throw new TypeError("Console inconnue.");
    if(input.expiresAt&&!Number.isFinite(Date.parse(input.expiresAt)))throw new TypeError("Expiration invalide.");
    return transaction(id,actor,input.version,async(c)=>{const existing=await execute(c,"SELECT user_uid FROM livepalmes_direct_access WHERE environment=? AND competition_id=? LIMIT 101",scope(id));if(existing.length>=100&&!existing.some(r=>r.user_uid===target.uid))throw fail("Trop de délégations.");await execute(c,"INSERT INTO livepalmes_direct_access (environment,competition_id,user_uid,can_manage,allowed_consoles_json,active,expires_at,version,created_at,updated_at,created_by,updated_by) VALUES (?,?,?,?,?,?,?,1,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),?,?) ON DUPLICATE KEY UPDATE can_manage=VALUES(can_manage),allowed_consoles_json=VALUES(allowed_consoles_json),active=VALUES(active),expires_at=VALUES(expires_at),version=version+1,updated_at=UTC_TIMESTAMP(6),updated_by=VALUES(updated_by)",[...scope(id),target.uid,input.manage===true?1:0,json(roles),input.active===false?0:1,input.expiresAt?new Date(input.expiresAt).toISOString().slice(0,23).replace('T',' '):null,actor.uid,actor.uid]);await journal(c,id,actor,{action:'delegate',before:null,after:{uid:target.uid,manage:input.manage===true,roles,active:input.active!==false},operationKey:input.operationKey});return {ok:true};},{allowClosed:true});
  }
  async function history(id,cursor='') {
    if(cursor&&!/^\d{4}-\d\d-\d\d .+\|[a-f0-9]{64}$/.test(cursor))throw new TypeError("Page d’historique invalide.");
    const split=cursor?cursor.split('|'):null;
    const rows=await q(`SELECT id,action,source_name,source_type,created_at,created_by,event_id FROM livepalmes_direct_publications WHERE environment=? AND competition_id=?${split?' AND (created_at<? OR (created_at=? AND id<?))':''} ORDER BY created_at DESC,id DESC LIMIT 51`,[...scope(id),...(split?[split[0],split[0],split[1]]:[])]);
    const page=rows.slice(0,50),last=page.at(-1);return {items:page,nextCursor:rows.length>50?`${last.created_at}|${last.id}`:null};
  }
  async function document(id,actor,input,metadata) {
    return transaction(id,actor,input.version,async(c,current)=>{const before=read(current.documents_json,[]),after=before.filter(d=>d.id!==metadata.id);after.push(metadata);if(after.length>20)throw new TypeError("20 documents complets au maximum.");await execute(c,"UPDATE livepalmes_direct_competitions SET documents_json=? WHERE environment=? AND competition_id=?",[json(after),...scope(id)]);await journal(c,id,actor,{action:'document',before,after,source:{type:'pdf',name:metadata.title,hash:metadata.hash},operationKey:input.operationKey});return {ok:true,document:metadata};});
  }
  return {native,config,access,detail,settings,preview,publish,visibility,grants,grant,history,document,scope,q,eventView,configView};
}
module.exports={createStore,fail};
