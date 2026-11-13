(function(global){
  'use strict';
  function create({role='computer',competitionId,getUser,call,onRender=()=>{},onStatus=()=>{},onAccessError=()=>{},onClosed=()=>{},onRetry=()=>{},onActivity=()=>{},canPoll=()=>true,onWake=()=>{},realtimeEnabled=true}){
    const initial=()=>({data:null,role,eventId:null,series:null,session:'all',request:0,busy:false,loading:false,timer:null,pending:null,dialog:null,dirty:false,settingsOpen:false,records:null,reserveOffset:0,syncMode:'poll'});
    const state=initial();let active=true,epoch=0,allCache=null,allPending=null,recordPending=null,realtime=null,realtimeKey=null,wakePending=false;
    function drain(){if(!wakePending||!active||document.hidden||state.loading||state.busy)return;if(!canPoll()){wakePending=false;onWake();return;}wakePending=false;void load(false);}
    function connect(){
      if(!active||!getUser()||!realtimeEnabled||!global.LivePalmesDirectRealtime)return;
      const key=[getUser().uid,state.role].join(':');if(realtimeKey===key)return;
      realtime?.stop();realtimeKey=key;realtime=global.LivePalmesDirectRealtime.create({competitionId,role:state.role,getUser,call,onWake:version=>{if(!version&&state.loading)return;if(version&&state.data&&(version.config<state.data.configVersion||version.config===state.data.configVersion&&version.workflow<=state.data.revision))return;wakePending=true;drain();},onMode:mode=>{state.syncMode=mode;onActivity();if(!state.loading)schedule();}});
    }
    function closed(error){if(!['archived','disabled','resetting'].includes(error.details?.directState))return false;stop();state.data=null;state.pending=null;onRetry(false);onAccessError();onClosed(error.details);return true;}
    const storageKey=()=>`direct-console-position:${competitionId}:${getUser()?.uid}:${state.role}`;
    function remember(){try{localStorage.setItem(storageKey(),JSON.stringify({eventId:state.eventId,series:state.series,session:state.session}));}catch{}}
    function restore(events=[]){try{const saved=JSON.parse(localStorage.getItem(storageKey())||'null');if(saved&&events.some(e=>e.id===saved.eventId)){state.eventId=saved.eventId;state.series=saved.series;state.session=saved.session||'all';}}catch{}}
    function schedule(){clearTimeout(state.timer);if(active&&getUser())state.timer=setTimeout(()=>{if(!document.hidden&&canPoll())load(false);else schedule();},state.syncMode==='live'?60000:15000);}
    async function load(force=false){
      if(!active||state.loading||state.busy||!getUser())return false;
      const request=++state.request,uid=getUser().uid,eventId=state.eventId,selectedRole=state.role;let moved=false;state.loading=true;onActivity();
      try{
        const result=await call('consoleSnapshot',{role:state.role,eventId:state.eventId,revision:force?-1:state.data?.revision,configVersion:force?-1:state.data?.configVersion});
        if(!active||request!==state.request||uid!==getUser()?.uid)return false;
        if(eventId!==state.eventId||selectedRole!==state.role){moved=true;return false;}
        if(!result.unchanged){state.data=result;state.eventId=result.selectedEventId;onRender();remember();}
        connect();onStatus('Synchronisé à '+new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit',second:'2-digit'}),false);return true;
      }catch(error){
        if(!active||request!==state.request||uid!==getUser()?.uid)return false;
        onStatus(error.message,true);
        if(closed(error))return false;
        if(/permission-denied|unauthenticated/.test(error.code||'')){stop();state.data=null;state.pending=null;onRetry(false);onAccessError();}return false;
      }finally{if(request===state.request){state.loading=false;onActivity();}schedule();if(moved)Promise.resolve().then(()=>load(true));else if(wakePending)Promise.resolve().then(drain);}
    }
    const context=()=>({eventId:state.data?.selectedEventId,role:state.role,revision:state.data?.revision,configVersion:state.data?.configVersion});
    async function deliver(){
      const input=state.pending,uid=getUser()?.uid,generation=epoch;if(!active||!input||!uid||state.loading||state.busy)return false;state.busy=true;onActivity();
      try{await call('consoleCommand',input);if(!active||generation!==epoch||uid!==getUser()?.uid)return false;state.pending=null;state.dirty=false;onRetry(false);return true;}
      catch(error){if(active&&generation===epoch&&uid===getUser()?.uid&&!closed(error)){if(/invalid-argument|permission-denied|unauthenticated|aborted|failed-precondition/.test(error.code||'')){state.pending=null;onRetry(false);}else onRetry(true);}throw error;}
      finally{if(generation===epoch){state.busy=false;onActivity();if(wakePending)Promise.resolve().then(drain);}}
    }
    function send(command,data={},expected=context()){
      if(state.busy)return Promise.reject(Error('Une action est déjà en cours.'));
      if(state.loading)return Promise.reject(Error('Chargement en cours. Attendre avant de confirmer.'));
      if(state.pending)return Promise.reject(Error('Un envoi reste à vérifier : réessayer cet envoi avant une nouvelle action.'));
      if(!active||!getUser())return Promise.reject(Error('Connexion LivePalmes requise.'));
      state.pending={...expected,...data,command,operationKey:crypto.randomUUID()};return deliver();
    }
    async function revalidate(expected){
      if(state.pending)throw Error('Vérifier le dernier envoi avant de reprendre cette action.');
      const eventId=expected.eventId;
      if(!await load(true))throw Error('Actualisation impossible. Le brouillon est conservé.');
      if(eventId&&!state.data.events.some(e=>e.id===eventId))throw Error('Cette course n’est plus disponible. Le brouillon est conservé.');
      Object.assign(expected,context(),{eventId});return expected;
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
    function stop(){active=false;epoch++;state.request++;clearTimeout(state.timer);realtime?.stop();realtime=null;realtimeKey=null;wakePending=false;allCache=null;allPending=null;}
    function reset(){const request=state.request+1;stop();active=true;const previousRole=state.role;Object.assign(state,initial(),{request,role:previousRole});onRetry(false);}
    return {state,load,send,deliver,allData,records,context,revalidate,remember,restore,stop,reset,connect};
  }
  global.LivePalmesDirectConsoleClient={create};
})(window);
