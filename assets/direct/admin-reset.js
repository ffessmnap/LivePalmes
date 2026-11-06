(function(global){
  'use strict';
  function create({context,action,call,stop,clear,refresh,status}){
    function request(resume=false){
      const initial=context();
      if(!resume&&global.prompt(`SUPPRESSION DÉFINITIVE\n${initial.name}\n\nSéries, résultats, historique et PDF publics seront effacés. Activation et accès conservés.\n\nÉcrire SUPPRIMER pour confirmer.`)!=='SUPPRIMER')return;
      return action(async()=>{
        const current=()=>{const value=context();if(value.id!==initial.id||value.uid!==initial.uid)throw Error('La compétition ou la connexion a changé. Recharger avant de reprendre.');return value;};
        stop();let version=initial.version,result;
        try{
          if(!resume){result=await call('reset',{phase:'begin',version,confirmation:'supprimer-direct-'+initial.id});current();version=result.version;}
          for(let step=0;step<200;step++){
            status('Réinitialisation en cours…');result=await call('reset',{phase:'continue',version});current();version=result.version;
            const progress=result.progress||{};status(`Suppression : ${progress.files||0} PDF · ${progress.entries||0} participations · ${progress.events||0} épreuves · ${progress.history||0} entrées d’historique.`);
            if(result.complete){clear();await refresh();status('Direct réinitialisé : séries, résultats, historique et PDF supprimés. Activation et accès conservés.');return;}
          }
          throw Error('Suppression en cours. Utiliser Reprendre la suppression pour terminer.');
        }catch(error){current();await refresh().catch(()=>{});const pending=context().resetting;throw Error((pending?'Suppression en pause. Utiliser Reprendre la suppression. ':'Action interrompue. Vérifier la compétition après actualisation. ')+(error.message||''));}
      });
    }
    return {request};
  }
  global.LivePalmesDirectAdminReset={create};
})(window);
