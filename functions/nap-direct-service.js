"use strict";
const model=require("./nap-direct-model"),{createStore,fail}=require("./nap-direct-store"),{createConsoleStore}=require('./nap-direct-console-store');
function createService({getPool,environment,authorize,lookupUser,matchRegion,storeDocument,purgeDocuments,checkResetDocuments}) {
  async function context(store,id,actor) {
    const competition=await store.native(id);
    const root=actor.national===true || actor.region===true && competition.level!=='national' && competition.level!=='international' && matchRegion(actor.regionId,competition.regionId);
    const grant=root?null:await store.access(id,actor.uid);
    return {competition,root,manage:root||Boolean(grant?.can_manage),roles:root?model.ROLES:model.parseJson(grant?.allowed_consoles_json,[])};
  }
  return async function manage(request) {
    const actor=await authorize(request),input=request.data||{},store=createStore(getPool(),environment);
    if(input.action==='list') {
      const year=Number(input.year);if(!Number.isInteger(year)||year<1901||year>2101)throw new TypeError("Saison invalide.");
      const season=await require("./nap-direct-calendar").readCalendarSeason(getPool(),year);
      const all=season.events.filter(e=>e.eventType==='pool');if(!all.length)return {items:[]};
      const ids=all.map(e=>model.competitionId(e.id)),marks=ids.map(()=>'?').join(',');
      const configurations=await store.q(`SELECT competition_id,state,public_visible,enabled_consoles_json,documents_json,version,public_revision FROM livepalmes_direct_competitions WHERE environment=? AND competition_id IN (${marks}) LIMIT 501`,[environment,...ids]);
      const grants=await store.q(`SELECT competition_id,can_manage,allowed_consoles_json FROM livepalmes_direct_access WHERE environment=? AND user_uid=? AND active=1 AND (expires_at IS NULL OR expires_at>UTC_TIMESTAMP(6)) AND competition_id IN (${marks}) LIMIT 501`,[environment,actor.uid,...ids]);
      const byId=new Map(configurations.map(r=>[Number(r.competition_id),r])),byGrant=new Map(grants.map(r=>[Number(r.competition_id),r]));
      return {items:all.filter(e=>actor.national||actor.region&&!['national','international'].includes(e.level)&&matchRegion(actor.regionId,e.regionId)||byGrant.has(model.competitionId(e.id))).map(e=>({...e,direct:store.configView(byId.get(model.competitionId(e.id)))}))};
    }
    const id=model.competitionId(input.competitionId),permissions=await context(store,id,actor);
    if(!permissions.manage&&!permissions.roles.length)throw fail("Aucun accès au Direct de cette compétition.","permission-denied");
    if(input.action==='detail'){
      if(!permissions.manage){const config=await store.config(id);if(!config||config.state!=='active'||!permissions.roles.some(role=>model.parseJson(config.enabled_consoles_json,[]).includes(role)))throw fail('Aucune console active pour ce compte.','permission-denied');}
      return {...await store.detail(id,input.eventId),permissions:{manage:permissions.manage,delegate:permissions.manage||permissions.roles.includes('computer'),roles:permissions.roles}};
    }
    const consoles=createConsoleStore(getPool(),store);
    if(input.action==='consoleSignal')return consoles.signal(id,input,permissions);
    if(input.action==='consoleSnapshot')return consoles.snapshot(id,input,permissions);
    if(input.action==='consoleAllData')return consoles.allData(id,input,permissions);
    if(input.action==='consoleHistory')return consoles.history(id,input,permissions);
    if(input.action==='consoleCommand')return consoles.command(id,actor,input,permissions);
    const canWrite=permissions.manage||permissions.roles.includes('computer');
    if(!canWrite)throw fail("Bureau des performances requis pour cette action.","permission-denied");
    if(input.action==='watchContext')return store.watchContext(id);
    if(input.action==='reset'){
      if(typeof purgeDocuments!=='function'||typeof checkResetDocuments!=='function')throw fail('Service de suppression des PDF indisponible. Aucune réinitialisation engagée.');
      return store.reset(id,actor,input,purgeDocuments,checkResetDocuments);
    }
    if(input.action==='settings') {
      if(!permissions.manage&&!permissions.roles.includes('computer'))throw fail("Gestion du Direct requise.","permission-denied");
      if(!await store.config(id)&&!permissions.root)throw fail("Activation réservée au responsable régional ou national.","permission-denied");
      return store.settings(id,actor,input);
    }
    if(input.action==='preview')return store.preview(id,input);
    if(input.action==='publish')return store.publish(id,actor,input);
    if(input.action==='previewBatch'){const result=await store.previewBatch(id,input);return {version:result.version,fingerprint:result.fingerprint,replacements:result.replacements};}
    if(input.action==='publishBatch')return store.publishBatch(id,actor,input);
    if(input.action==='visibility')return store.visibility(id,actor,input);
    if(input.action==='history')return store.history(id,input.cursor);
    if(input.action==='document') {
      return store.document(id,actor,input,()=>storeDocument(input,id));
    }
    if(input.action==='grants'||input.action==='grant') {
      if(!canWrite)throw fail("Délégation réservée au bureau des performances de cette compétition.","permission-denied");
      if(input.action==='grants')return {items:await store.grants(id)};
      const target=await lookupUser(model.clean(input.email,180));
      if(!target?.uid||target.active!==true)throw fail("Compte LivePalmes actif existant requis.","not-found");
      return store.grant(id,actor,input,target);
    }
    throw new TypeError("Action Direct inconnue.");
  };
}
async function readActor(request,{db,adminUids}) {
  const uid=request.auth?.uid;if(!uid)throw fail("Connexion LivePalmes requise.","unauthenticated");
  const snapshot=await db.collection('users').doc(uid).get(),data=snapshot.exists?snapshot.data():null;
  if(!data||data.status!=='active')throw fail("Compte LivePalmes désactivé ou absent.","permission-denied");
  const capabilities=data.capabilities||{},scope=data.accessScopes?.['engagements.region.manage']||{};
  return {uid,label:model.clean(data.displayName||[data.firstName,data.lastName].filter(Boolean).join(' ')||data.email||'Compte LivePalmes',160),national:adminUids.has(uid)||capabilities['admin.full']===true||capabilities['engagements.national.manage']===true,region:capabilities['engagements.region.manage']===true,regionId:scope.scopeId||data.regionId||''};
}
module.exports={createService,readActor};
