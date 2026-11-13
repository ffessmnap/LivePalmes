(function(global){
  'use strict';
  const labels={computer:'Bureau · alertes et finales',referee:'Juge arbitre',video:'Juge vidéo',speaker:'Speaker',secretary:'Secrétariat',live:'Live'};
  let timer=null,generation=0,sharing=null;
  function stop(){sharing?.stop();sharing=null;generation++;clearTimeout(timer);timer=null;global.LivePalmesDirectBureau?.stop();}
  function mount({host,data,id,call,current}){
    stop();if(!host||!data.config)return;const token=generation,uid=current().uid;
    const nav=document.createElement('nav');nav.className='direct-console-links';nav.setAttribute('aria-label','Consoles de cette compétition');
    sharing=global.LivePalmesDirectConsoleShare.create({current,identity:{id,uid}});
    const allowed=data.config.consoles.filter(role=>data.permissions.manage||data.permissions.roles.includes(role));
    for(const role of allowed.filter(role=>role!=='computer')){const link=document.createElement('a');link.textContent=labels[role];link.dataset.directConsole=role;link.href='direct-consoles.html?id='+encodeURIComponent(id)+'&role='+role;link.target='_blank';link.rel='noopener';if(data.config.state!=='active'){link.removeAttribute('href');link.setAttribute('aria-disabled','true');}const item=document.createElement('div');item.className='direct-console-entry';item.append(link);if(data.config.state==='active')item.append(sharing.controls({label:labels[role],url:link.href}));nav.append(item);}(host.querySelector('.bureau-meet-settings')||host).append(nav);
    const boxes=[...host.querySelectorAll('input[name=console]')],ja=boxes.find(input=>input.value==='referee'),video=boxes.find(input=>input.value==='video');
    if(video&&data.competition.level!=='national'){video.checked=false;video.disabled=true;video.parentElement.title='Vidéo réservée aux compétitions nationales';}
    const update=()=>{const mandatory=boxes.some(input=>!['computer','referee'].includes(input.value)&&input.checked);if(ja){if(mandatory)ja.checked=true;ja.disabled=mandatory;}};boxes.forEach(input=>input.addEventListener('change',update));update();
    const bureau=global.LivePalmesDirectBureau?.mount({host:document.getElementById('competitionWorkspace'),data,id,call,current});
    if(!bureau||data.config.state!=='active'||data.config.consoles.length===1)return;
    async function poll(){
      if(token!==generation||!nav.isConnected||current().uid!==uid||String(current().id)!==String(id))return;
      try{if(!document.hidden&&!bureau.details.open)await bureau.refreshSummary();}
      catch{if(token===generation&&nav.isConnected){bureau.host.querySelector('#bureauOperationsCount').textContent='Connexion à vérifier';bureau.host.classList.add('error');}}
      if(token===generation)timer=setTimeout(poll,bureau.client.state.syncMode==='live'?60000:15000);
    }
    void poll();
  }
  global.LivePalmesDirectAdminConsoles={mount,stop};
})(window);
