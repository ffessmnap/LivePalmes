(function(global){
  'use strict';
  function create({competitionId,role,getUser,call,onWake,onMode=()=>{}}){
    let active=true,epoch=0,unsubscribe=null,renewal=null,retry=null,opening=false,last=null,backoff=1000;
    const uid=getUser()?.uid,usable=()=>active&&uid&&getUser()?.uid===uid;
    const mode=value=>{if(usable())onMode(value);};
    function detach(){unsubscribe?.();unsubscribe=null;clearTimeout(renewal);clearTimeout(retry);renewal=retry=null;}
    function failed(){if(!usable())return;epoch++;opening=false;detach();mode('poll');if(!document.hidden&&global.navigator?.onLine!==false){retry=setTimeout(()=>void connect(),backoff);backoff=Math.min(backoff*2,30000);}}
    async function connect(){
      if(!usable()||opening||document.hidden||global.navigator?.onLine===false||!global.firebase?.firestore)return;
      const generation=epoch;opening=true;let timeout;
      try{
        const ticket=await Promise.race([call('consoleSubscribe',{role}),new Promise((_,reject)=>{timeout=setTimeout(()=>reject(Error('Connexion temps réel indisponible.')),10000);})]);
        if(!usable()||generation!==epoch)return;
        if(!/^livepalmesDirectSignals\/(test|production)-[1-9][0-9]*\/signal\/current$/.test(ticket.path)||!ticket.path.includes('-'+Number(competitionId)+'/'))throw Error('Canal privé invalide.');
        const delay=Math.min(180000,Math.max(1000,Number(ticket.renewAfterMs)||1000));
        if(!unsubscribe)unsubscribe=global.firebase.firestore().doc(ticket.path).onSnapshot({includeMetadataChanges:true},snapshot=>{
          if(!usable()||generation!==epoch)return;
          if(snapshot.metadata?.fromCache){mode('poll');return;}
          mode('live');backoff=1000;
          const data=snapshot.exists?snapshot.data():null,next=data?.version;
          if(next&&(!Number.isSafeInteger(next.config)||!Number.isSafeInteger(next.workflow)))return;
          if(next&&(!last||next.config>last.config||next.config===last.config&&next.workflow>last.workflow)){last=next;onWake(next);}
        },failed);
        clearTimeout(renewal);renewal=setTimeout(()=>void connect(),delay);
      }catch{if(usable()&&generation===epoch)failed();}
      finally{clearTimeout(timeout);if(generation===epoch)opening=false;}
    }
    function visibility(){if(!usable())return;if(document.hidden){epoch++;opening=false;detach();mode('poll');}else{onWake();void connect();}}
    function offline(){epoch++;opening=false;detach();mode('poll');}
    function online(){if(usable()){onWake();void connect();}}
    const supported=Boolean(global.firebase?.firestore);
    if(supported){document.addEventListener('visibilitychange',visibility);global.addEventListener('offline',offline);global.addEventListener('online',online);void connect();}
    return {stop(){active=false;epoch++;detach();if(supported){document.removeEventListener('visibilitychange',visibility);global.removeEventListener('offline',offline);global.removeEventListener('online',online);}}};
  }
  global.LivePalmesDirectRealtime={create};
})(window);
