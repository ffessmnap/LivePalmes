"use strict";
const creation=require("./nap-swimmer-creation");
// Explicit national action only. Opening the import/form never calls this service.
// Preview <=4 indexed queries/426 rows; create reuses the durable native writer.
function service({authorize,getPool,audit,formatAlert}) {
  return async(request,write=false)=>{
    const actor=await authorize(request);
    if(actor?.national!==true)throw new TypeError("Creation depuis un import reservee au niveau national.");
    const data=request.data||{};
    if(data.importReview!==true)throw new TypeError("Contexte de controle d’import requis.");
    if(write&&data.confirmNewSwimmer!==true)throw new TypeError("Confirmez la recherche prealable et l’absence de fiche existante.");
    const input={clubId:data.clubId,swimmer:data.swimmer,creationId:data.creationId,confirmAlerts:data.confirmAlerts,actorUid:actor.uid};
    creation.proposed(input);
    const pool=await getPool(),scope=()=>{},format=(match,type)=>{
      // An exact identity must be selected, even when its licence/club differs.
      if(write&&!type)throw new TypeError("Cette identite existe deja dans NAP. Selectionnez la fiche existante.");
      return formatAlert(match,type,input.clubId);
    };
    if(write)return creation.createSwimmer(pool,input,audit(actor),scope,format);
    const result=await creation.previewCreation(pool,input,scope,format);
    return {...result,blocksCreation:result.blocksCreation||result.alerts.some(a=>a.type==="duplicate"||a.type==="club-change")};
  };
}
module.exports={service};
