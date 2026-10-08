"use strict";
// Preview the existing native parameter patch without writing it. This keeps
// the established single Save/Cancel behavior: qualifications, date and time
// period are evaluated together, then persisted only after confirmation.
function targetPack(pack,operations=[]){
  if(!Array.isArray(operations)||operations.length>6)throw new TypeError('Parametres du controle incompatibles.');
  if(!operations.length)return pack;
  const result=structuredClone(pack);
  for(const operation of operations){
    const row=operation.after;
    if(operation.table==='competitions')result.nativeSnapshot.competition={...result.nativeSnapshot.competition,...row};
    else if(operation.table==='compet_parametres'){
      result.nativeSnapshot.parameters={...result.nativeSnapshot.parameters,...row};
      result.nativeParameters={...result.nativeParameters,...Object.fromEntries(Object.entries(row).filter(([key])=>!['id','compet'].includes(key))),parameter_id:row.id};
    }else if(operation.table==='livepalmes_competition_options')result.options={...(result.options||{}),...row};
    else if(operation.table==='livepalmes_competition_fees')result.fees=row;
    else if(operation.table==='livepalmes_competition_programs')result.detailedProgram=row;
    else if(operation.table==='compet_comites')result.committees=row.map(comite=>({compet:Number(result.nativeSnapshot.competition.id),comite}));
    else throw new TypeError('Table de parametres non prise en charge par le controle.');
  }
  const native=result.nativeSnapshot.competition,parameters=result.nativeParameters,options=result.options||{};
  result.event={...result.event,...require('./nap-portal-competitions').portalEventFromRow({...native,...parameters,id:native.id,type_label:pack.event.competitionType==='pool'?'Piscine':'Eau libre',native_level_code:parameters.niveau,event_type:options.event_type||pack.event.eventType,entry_closed:options.entry_closed,portal_city:options.city,portal_address:options.address,portal_whatsapp:options.whatsapp_url,portal_organizer:options.organizer_label,portal_water_body_type:options.water_body_type,portal_canceled:options.canceled})};
  return result;
}
module.exports={targetPack};
