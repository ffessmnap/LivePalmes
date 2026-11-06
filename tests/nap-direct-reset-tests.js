'use strict';
const assert=require('node:assert/strict'),{createStore}=require('../functions/nap-direct-store'),{createService}=require('../functions/nap-direct-service'),documents=require('../functions/nap-direct-documents');
function fixture(){
  let configs=new Map(),entries=[],events=[],logs=[],saved;const calls=[];
  for(const [environment,id] of [['test',900001],['production',900001],['test',900002]]){
    configs.set(environment+':'+id,{environment,competition_id:id,state:'active',public_visible:1,enabled_consoles_json:'["computer","speaker"]',documents_json:'[{"id":"old-pdf"}]',version:1,public_revision:1});
    events.push({environment,competition_id:id,id:'a'.repeat(64)});for(let n=0;n<(environment==='test'&&id===900001?1001:1);n++)entries.push({environment,competition_id:id,event_id:'a'.repeat(64)});
    for(let n=0;n<(environment==='test'&&id===900001?1001:1);n++)logs.push({environment,competition_id:id,id:'old-'+n,operation_key:'old-'+n,after_json:'{}'});
  }
  const scoped=(row,values,offset=0)=>row.environment===values[offset]&&row.competition_id===Number(values[offset+1]);
  const execute=async(query,values=[])=>{
    const sql=typeof query==='string'?query:query.sql;calls.push({sql,values});assert.equal((sql.match(/\?/g)||[]).length,values.length);
    if(/^(DELETE|UPDATE|INSERT)/.test(sql))assert.match(sql,/^(?:DELETE FROM|UPDATE|INSERT INTO) livepalmes_direct_(?:entries|events|publications|competitions)\b/,'Aucune table native ou d’accès modifiable');
    if(sql.includes(' FROM competitions c'))return [[{id:values.at(-1),libelle:'Compétition fictive',date:'2026-11-07',enddate:'2026-11-08',lieu:'Piscine fictive',type_label:'Piscine',native_level_code:1,comite:'09',bassin:50}]];
    if(sql.startsWith('SELECT')&&sql.includes('livepalmes_direct_access'))return [[{can_manage:0,allowed_consoles_json:'["live"]'}]];
    if(sql.startsWith('SELECT')&&sql.includes('livepalmes_direct_competitions'))return [[{...configs.get(values[0]+':'+values[1])}]];
    if(sql.startsWith('SELECT')&&sql.includes('livepalmes_direct_publications'))return [logs.filter(row=>scoped(row,values)&&row.id===values[2])];
    if(sql.includes('bounded_direct_progress'))return [[]];
    if(sql.startsWith('SELECT')&&sql.includes('livepalmes_direct_events'))return [events.filter(row=>scoped(row,values))];
    if(sql.startsWith('SELECT')&&sql.includes('livepalmes_direct_entries'))return [entries.filter(row=>scoped(row,values))];
    if(sql.startsWith('INSERT INTO livepalmes_direct_publications')){assert.ok(sql.includes("'reset-pending'"));logs.push({environment:values[0],competition_id:values[1],id:values[2],operation_key:values[3],after_json:values[4]});return [{affectedRows:1}];}
    if(sql.startsWith('UPDATE livepalmes_direct_publications')){logs.find(row=>scoped(row,values,1)&&row.id===values[3]).after_json=values[0];return [{affectedRows:1}];}
    if(sql.startsWith('UPDATE livepalmes_direct_competitions')){
      const offset=sql.includes('version=version+1')?1:sql.includes("state='resetting'")?0:2,config=configs.get(values[offset]+':'+values[offset+1]);
      if(sql.includes('version=version+1')){config.version++;config.public_revision++;}
      else if(sql.includes("state='resetting'")){config.state='resetting';config.public_visible=0;}
      else {config.state=values[0];config.public_visible=values[1];config.documents_json='[]';}return [{affectedRows:1}];
    }
    const remove=(rows,limit,predicate)=>{let removed=0;const kept=rows.filter(row=>{if(removed<limit&&predicate(row)){removed++;return false;}return true;});return {kept,removed};};
    if(sql.startsWith('DELETE FROM livepalmes_direct_entries')){const result=remove(entries,1000,row=>scoped(row,values));entries=result.kept;return [{affectedRows:result.removed}];}
    if(sql.startsWith('DELETE FROM livepalmes_direct_events')){const result=remove(events,301,row=>scoped(row,values));events=result.kept;return [{affectedRows:result.removed}];}
    if(sql.startsWith('DELETE FROM livepalmes_direct_publications')){const result=remove(logs,sql.includes('id<>')?1000:1,row=>scoped(row,values)&&(sql.includes('id<>')?row.id!==values[2]:row.id===values[2]));logs=result.kept;return [{affectedRows:result.removed}];}
    throw Error('SQL non prévu : '+sql);
  };
  const connection={execute,beginTransaction:async()=>{saved=structuredClone({configs,entries,events,logs});},commit:async()=>{},rollback:async()=>{({configs,entries,events,logs}=saved);},release(){}};
  return {execute,getConnection:async()=>connection,calls,inspect:()=>structuredClone({configs,entries,events,logs})};
}
(async()=>{
  const pool=fixture(),store=createStore(pool,'test'),actor={uid:'fixture'},key='test:900001',original=pool.inspect();let fileAttempts=0;
  await assert.rejects(store.reset(900001,actor,{phase:'begin',version:1,confirmation:'autre'},()=>{}),/Confirmation/);
  await assert.rejects(store.reset(900001,actor,{phase:'begin',version:0,confirmation:'supprimer-direct-900001'},()=>{}),error=>error.directCode==='aborted');
  assert.deepEqual(pool.inspect().configs.get(key),original.configs.get(key));
  await assert.rejects(store.reset(900001,actor,{phase:'begin',version:1,confirmation:'supprimer-direct-900001'},()=>{},async()=>{throw Error('Droits Storage absents');}),/Droits Storage/);assert.deepEqual(pool.inspect().configs.get(key),original.configs.get(key),'Prérequis vérifiés avant toute mise en pause');
  let result=await store.reset(900001,actor,{phase:'begin',version:1,confirmation:'supprimer-direct-900001'},()=>{});
  assert.equal(result.version,2);assert.equal(pool.inspect().configs.get(key).state,'resetting');assert.equal(pool.inspect().configs.get(key).public_visible,0);
  assert.equal(pool.inspect().entries.length,original.entries.length,'Pas de suppression de participations avant la phase confirmée');
  const detail=await store.detail(900001);assert.equal(detail.resetProgress.phase,'files');assert.equal(detail.events.length,0,'Pas de relecture des participations pendant la suppression');
  await assert.rejects(store.settings(900001,actor,{version:2,state:'active'}),/Réinitialisation/);
  let documentWrites=0;await assert.rejects(store.document(900001,actor,{version:2,operationKey:'document-fixture-0001'},async()=>{documentWrites++;}),/Réinitialisation/);assert.equal(documentWrites,0,'Aucun téléversement après le verrou de remise à zéro');
  const purge=async()=>{fileAttempts++;if(fileAttempts===1)throw Error('Stockage indisponible');return {deleted:fileAttempts===2?50:1,more:fileAttempts===2};};
  await assert.rejects(store.reset(900001,actor,{phase:'continue',version:2},purge),/Stockage/);assert.equal(pool.inspect().configs.get(key).version,2,'Reprise possible après échec');
  let steps=0;do{result=await store.reset(900001,actor,{phase:'continue',version:result.version},purge);steps++;assert.ok(steps<10);}while(!result.complete);
  const after=pool.inspect();assert.equal(after.configs.get(key).state,'active');assert.equal(after.configs.get(key).public_visible,1);assert.equal(after.configs.get(key).enabled_consoles_json,original.configs.get(key).enabled_consoles_json);assert.equal(after.configs.get(key).documents_json,'[]');
  for(const rows of [after.entries,after.events,after.logs])assert.ok(rows.every(row=>row.environment!=='test'||row.competition_id!==900001),'Aucun import, historique ni reçu de suppression conservé');
  for(const envKey of ['production:900001','test:900002'])assert.deepEqual(after.configs.get(envKey),original.configs.get(envKey));
  assert.equal(after.entries.length,2);assert.equal(after.events.length,2);assert.equal(after.logs.length,2);assert.ok(steps>=4,'Suppression bornée en plusieurs étapes');
  await assert.rejects(store.reset(900001,actor,{phase:'continue',version:2},purge),error=>error.directCode==='aborted','Une ancienne demande ne peut effacer de nouveaux imports');
  const denied=createService({getPool:()=>pool,environment:'test',authorize:async()=>({uid:'live'}),matchRegion:()=>false});await assert.rejects(denied({data:{action:'reset',competitionId:900001,phase:'begin',version:result.version,confirmation:'supprimer-direct-900001'}}),error=>error.directCode==='permission-denied');
  assert.ok(pool.calls.filter(call=>/^DELETE/.test(call.sql)&&!call.sql.includes('id=?')).every(call=>/LIMIT (1000|301)$/.test(call.sql)),'Chaque lot SQL est borné');
  const prefix='competition-pdfs/direct/test/900001/',objects=new Set([...Array.from({length:53},(_,i)=>prefix+i+'.pdf'),'competition-pdfs/direct/production/900001/other.pdf','competition-pdfs/direct/test/900002/other.pdf']);let maximum=0,active=0;
  const storage={bucket:name=>{
    assert.equal(name,'fixture-bucket');return {getFiles:async options=>{
      assert.deepEqual(options,{prefix,maxResults:51,autoPaginate:false});
      return [[...objects].filter(name=>name.startsWith(prefix)).slice(0,51).map(name=>({name,delete:async options=>{assert.equal(options.ignoreNotFound,true);maximum=Math.max(maximum,++active);await new Promise(resolve=>setImmediate(resolve));objects.delete(name);active--;}}))];
    }};
  }};
  assert.deepEqual(await documents.purgeBatch(storage,{name:'test',publicBucket:'fixture-bucket'},900001),{deleted:50,more:true});assert.deepEqual(await documents.purgeBatch(storage,{name:'test',publicBucket:'fixture-bucket'},900001),{deleted:3,more:false});assert.equal(objects.size,2);assert.ok(maximum<=5);
  let saved=0;const upload={bucket:()=>({file:()=>({save:async()=>{saved++;}})})},input={documentKind:'series',pdfDataUrl:'data:application/pdf;base64,'+Buffer.from('%PDF-fixture').toString('base64'),sessionKey:'1',fromSeriesImport:true};
  const first=await documents.store(upload,{name:'test',publicBucket:'fixture'},{...input,title:'series-1.pdf'},900001),second=await documents.store(upload,{name:'test',publicBucket:'fixture'},{...input,title:'series-2.pdf',pdfDataUrl:'data:application/pdf;base64,'+Buffer.from('%PDF-other').toString('base64')},900001);assert.notEqual(first.id,second.id,'Plusieurs PDF de la même session restent accessibles');
  const corrected=await documents.store(upload,{name:'test',publicBucket:'fixture'},{...input,title:'series-1.pdf',pdfDataUrl:'data:application/pdf;base64,'+Buffer.from('%PDF-correction').toString('base64')},900001);assert.equal(corrected.id,first.id,'Un fichier corrigé remplace son lien public');assert.notEqual(corrected.hash,first.hash);
  await assert.rejects(documents.store(upload,{name:'test',publicBucket:'fixture'},{...input,documentKind:'results'},900001),/Seuls les PDF/);assert.equal(saved,3,'Document invalide refusé avant écriture');
  await assert.rejects(documents.checkReset({bucket:()=>({iam:{testPermissions:async()=>[{}]}})},{name:'test',publicBucket:'fixture'}),error=>error.directCode==='failed-precondition');
  await documents.checkReset({bucket:()=>({iam:{testPermissions:async permissions=>[Object.fromEntries(permissions.map(permission=>[permission,true]))]}})},{name:'test',publicBucket:'fixture'});
  const page=await documents.purgeBatch({bucket:()=>({getFiles:async()=>[[],{pageToken:'suite'}]})},{name:'test',publicBucket:'fixture'},900001);assert.equal(page.more,true,'Un curseur Storage ne permet pas de conclure à tort la suppression');
  console.log('Direct reset : suppression bornée, interruption/reprise, absence d’historique final, garde des accès/configuration, isolation compétition/environnement et PDF vérifiés hors réseau.');
})().catch(error=>{console.error(error);process.exitCode=1;});
