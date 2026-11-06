"use strict";
const model=require('./nap-direct-model'),{execute}=require('./nap-query');
const markerId=id=>model.hash(['direct-reset',model.competitionId(id)]);
async function pending(connection,scope){return (await execute(connection,'SELECT after_json FROM livepalmes_direct_publications WHERE environment=? AND competition_id=? AND id=? LIMIT 1',[...scope,markerId(scope[1])]))[0]||null;}
function progress(row){const value=model.parseJson(row?.after_json);return {phase:value.phase||'files',files:Number(value.files)||0,entries:Number(value.entries)||0,events:Number(value.events)||0,history:Number(value.history)||0};}
async function begin(connection,scope,actor,current,input){
  if(input.confirmation!=='supprimer-direct-'+scope[1])throw new TypeError('Confirmation de suppression définitive requise.');
  if(current.state==='resetting')throw Error('Réinitialisation déjà en cours. Reprendre la suppression.');
  if(!['active','archived','disabled'].includes(current.state))throw Error('État de compétition invalide. Aucune suppression engagée.');
  const state={phase:'files',files:0,entries:0,events:0,history:0,state:current.state,visible:Boolean(current.public_visible)};
  await execute(connection,"INSERT INTO livepalmes_direct_publications (environment,competition_id,id,batch_id,event_id,operation_key,action,source_type,source_name,source_hash,before_json,after_json,created_at,created_by) VALUES (?,?,?,'',NULL,?,'reset-pending','manual','','','null',?,UTC_TIMESTAMP(6),?)",[...scope,markerId(scope[1]),markerId(scope[1]),JSON.stringify(state),actor.uid]);
  await execute(connection,"UPDATE livepalmes_direct_competitions SET state='resetting',public_visible=0 WHERE environment=? AND competition_id=?",scope);
  return {complete:false,progress:progress({after_json:state})};
}
async function step(connection,scope,current,purgeFiles){
  if(current.state!=='resetting')throw Error('Aucune réinitialisation en cours. Actualiser la compétition.');
  const row=await pending(connection,scope);if(!row)throw Error('État de réinitialisation introuvable. Aucune suppression poursuivie.');
  const state=model.parseJson(row.after_json);if(!['active','archived','disabled'].includes(state.state)||!['files','entries','events','history'].includes(state.phase)||typeof state.visible!=='boolean'||['files','entries','events','history'].some(key=>!Number.isInteger(state[key])||state[key]<0))throw Error('État initial invalide.');
  const save=async()=>{await execute(connection,'UPDATE livepalmes_direct_publications SET after_json=? WHERE environment=? AND competition_id=? AND id=?',[JSON.stringify(state),...scope,markerId(scope[1])]);return {complete:false,progress:progress({after_json:state})};};
  if(state.phase==='files'){const result=await purgeFiles(scope[1]);state.files+=result.deleted;if(result.more)return save();state.phase='entries';}
  if(state.phase==='entries'){const result=await execute(connection,'DELETE FROM livepalmes_direct_entries WHERE environment=? AND competition_id=? LIMIT 1000',scope);state.entries+=Number(result.affectedRows)||0;if(Number(result.affectedRows)===1000)return save();state.phase='events';}
  if(state.phase==='events'){const result=await execute(connection,'DELETE FROM livepalmes_direct_events WHERE environment=? AND competition_id=? LIMIT 301',scope);state.events+=Number(result.affectedRows)||0;if(Number(result.affectedRows)===301)return save();state.phase='history';}
  if(state.phase==='history'){const result=await execute(connection,'DELETE FROM livepalmes_direct_publications WHERE environment=? AND competition_id=? AND id<>? LIMIT 1000',[...scope,markerId(scope[1])]);state.history+=Number(result.affectedRows)||0;if(Number(result.affectedRows)===1000)return save();}
  await execute(connection,'DELETE FROM livepalmes_direct_publications WHERE environment=? AND competition_id=? AND id=?',[...scope,markerId(scope[1])]);
  await execute(connection,'UPDATE livepalmes_direct_competitions SET state=?,public_visible=?,documents_json=JSON_ARRAY() WHERE environment=? AND competition_id=?',[state.state,state.visible?1:0,...scope]);
  return {complete:true,progress:progress({after_json:state})};
}
module.exports={markerId,pending,progress,begin,step};
