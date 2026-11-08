(function(global){
  'use strict';
  function create({role='computer',competitionId,getUser,call,onRender=()=>{},onStatus=()=>{},onAccessError=()=>{},onRetry=()=>{},canPoll=()=>true}){
    const initial=()=>({data:null,role,eventId:null,series:null,session:'all',request:0,busy:false,loading:false,timer:null,pending:null,dialog:null,dirty:false,settingsOpen:false,records:null,reserveOffset:0});
    const state=initial();let active=true,epoch=0,allCache=null,allPending=null,recordPending=null;
    function schedule(){clearTimeout(state.timer);if(active&&getUser())state.timer=setTimeout(()=>{if(!document.hidden&&canPoll()&&!state.dirty)load(false);else schedule();},15000);}
    async function load(force=false){
      if(!active||state.loading||state.busy||!getUser())return false;
      const request=++state.request,uid=getUser().uid;state.loading=true;
      try{
        const result=await call('consoleSnapshot',{role:state.role,eventId:state.eventId,revision:force?-1:state.data?.revision,configVersion:force?-1:state.data?.configVersion});
        if(!active||request!==state.request||uid!==getUser()?.uid)return false;
        if(!result.unchanged){state.data=result;state.eventId=result.selectedEventId;onRender();}
        onStatus('Synchronisé à '+new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit',second:'2-digit'}),false);return true;
      }catch(error){
        if(!active||request!==state.request||uid!==getUser()?.uid)return false;
        onStatus(error.message,true);
        if(/permission-denied|unauthenticated/.test(error.code||'')){state.data=null;state.pending=null;allCache=null;onRetry(false);onAccessError();}return false;
      }finally{if(request===state.request)state.loading=false;schedule();}
    }
    const context=()=>({eventId:state.data?.selectedEventId,role:state.role,revision:state.data?.revision,configVersion:state.data?.configVersion});
    async function deliver(){
      const input=state.pending,uid=getUser()?.uid,generation=epoch;if(!active||!input||!uid)return false;state.busy=true;
      try{await call('consoleCommand',input);if(!active||generation!==epoch||uid!==getUser()?.uid)return false;state.pending=null;state.dirty=false;state.settingsOpen=false;onRetry(false);return true;}
      catch(error){if(active&&generation===epoch&&uid===getUser()?.uid){if(/invalid-argument|permission-denied|unauthenticated|aborted|failed-precondition/.test(error.code||'')){state.pending=null;onRetry(false);}else onRetry(true);}throw error;}
      finally{if(generation===epoch)state.busy=false;}
    }
    function send(command,data={},expected=context()){
      if(state.busy)return Promise.reject(Error('Une action est déjà en cours.'));
      if(state.pending)return Promise.reject(Error('Un envoi reste à vérifier : réessayer cet envoi avant une nouvelle action.'));
      if(!active||!getUser())return Promise.reject(Error('Connexion LivePalmes requise.'));
      state.pending={...expected,...data,command,operationKey:crypto.randomUUID()};return deliver();
    }
    async function allData(){
      const uid=getUser()?.uid,generation=epoch,key=[competitionId,uid,state.role,state.data?.configVersion].join(':');
      if(allCache?.key===key)return allCache.data;if(allPending?.key===key)return allPending.promise;
      const promise=call('consoleAllData',{role:state.role}).then(data=>{if(active&&generation===epoch&&getUser()?.uid===uid)allCache={key,data};return data;}).finally(()=>{if(allPending?.promise===promise)allPending=null;});allPending={key,promise};return promise;
    }
    async function records(refresh=false){
      if(recordPending)return recordPending;if(refresh)state.records=null;if(state.records)return state.records;
      const promise=(async()=>{const url=new URL(global.LivePalmesEnvironment.napReaderUrl);url.searchParams.set('action','records');const response=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error('Références NAP indisponibles.');const result=(await response.json()).data;if(active)state.records=result;return result;})().finally(()=>{if(recordPending===promise)recordPending=null;});recordPending=promise;return promise;
    }
    function stop(){active=false;epoch++;state.request++;clearTimeout(state.timer);allCache=null;allPending=null;}
    function reset(){const request=state.request+1;clearTimeout(state.timer);active=true;epoch++;const previousRole=state.role;Object.assign(state,initial(),{request,role:previousRole});allCache=null;allPending=null;onRetry(false);}
    return {state,load,send,deliver,allData,records,context,stop,reset};
  }
  global.LivePalmesDirectConsoleClient={create};
})(window);
