(function(global){
  'use strict';
  const labels={computer:'Bureau · alertes et finales',referee:'Juge arbitre',video:'Juge vidéo',speaker:'Speaker',secretary:'Secrétariat',live:'Live'};
  let timer=null,generation=0;
  function stop(){generation++;clearTimeout(timer);timer=null;}
  function mount({host,data,id,call,current}){
    stop();if(!host||!data.config)return;const token=generation,uid=current().uid;
    const nav=document.createElement('nav');nav.className='direct-console-links';nav.setAttribute('aria-label','Consoles de cette compétition');
    const allowed=data.config.consoles.filter(role=>data.permissions.manage||data.permissions.roles.includes(role));
    for(const role of allowed){const link=document.createElement('a');link.textContent=labels[role];link.dataset.directConsole=role;link.href='direct-consoles.html?id='+encodeURIComponent(id)+'&role='+role;link.target='_blank';link.rel='noopener';if(data.config.state!=='active'){link.removeAttribute('href');link.setAttribute('aria-disabled','true');}nav.append(link);}host.append(nav);
    const note=document.createElement('p');note.className='direct-note';note.textContent='Bureau seul possible. Le JA est obligatoire avec les consoles terrain. Vidéo réservée au national. Les liens utilisent les comptes LivePalmes autorisés, sans PIN supplémentaire.';nav.after(note);
    const boxes=[...host.querySelectorAll('input[name=console]')],ja=boxes.find(input=>input.value==='referee'),video=boxes.find(input=>input.value==='video');
    if(video&&data.competition.level!=='national'){video.checked=false;video.disabled=true;video.parentElement.title='Vidéo réservée aux compétitions nationales';}
    const update=()=>{const mandatory=boxes.some(input=>!['computer','referee'].includes(input.value)&&input.checked);if(ja){if(mandatory)ja.checked=true;ja.disabled=mandatory;}};boxes.forEach(input=>input.addEventListener('change',update));update();
    const link=nav.querySelector('[data-direct-console=computer]');
    if(!link||data.config.state!=='active'||data.config.consoles.length===1)return;
    async function poll(){
      if(token!==generation||!nav.isConnected||current().uid!==uid||String(current().id)!==String(id))return;
      try{if(!document.hidden){const signal=await call('consoleSignal');if(token!==generation||!nav.isConnected)return;const count=Number(signal.pending)+Number(signal.finalChanges);link.textContent=labels.computer+(count?' · '+count+' à traiter':'');link.title=signal.videoPending?signal.videoPending+' demande(s) vidéo en attente':'Ouvrir les décisions et finales, aussi sur tablette';link.classList.remove('error');}}
      catch{if(token===generation&&nav.isConnected){link.textContent=labels.computer+' · connexion à vérifier';link.classList.add('error');}}
      if(token===generation)timer=setTimeout(poll,15000);
    }
    void poll();
  }
  global.LivePalmesDirectAdminConsoles={mount,stop};
})(window);
