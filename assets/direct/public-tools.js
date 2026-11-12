(function(global){
  'use strict';
  const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  function create({getData,onPerson}){
    const panel=document.getElementById('directSearchPanel'),toggle=document.getElementById('directFind'),refresh=document.getElementById('directRefresh');
    const ui=global.LivePalmesDirectPresentation,esc=ui.esc;
    panel.innerHTML='<div class="direct-search-head"><label for="directFindInput">Rechercher un nageur</label><button type="button" data-search-close aria-label="Fermer la recherche">×</button></div><div class="direct-search-input"><input id="directFindInput" type="search" placeholder="Nom ou prénom" autocomplete="off"><button type="button" data-search-clear aria-label="Effacer la recherche" hidden>×</button></div><p class="direct-note" role="status" aria-live="polite" data-search-status></p><ul class="direct-search-results"></ul>';
    const input=panel.querySelector('input'),status=panel.querySelector('[data-search-status]'),list=panel.querySelector('ul'),clear=panel.querySelector('[data-search-clear]');
    let people=[],ready=false,request=0,refreshTimer=null,failure='';
    function close(focus=true){request++;panel.hidden=true;toggle.setAttribute('aria-expanded','false');if(focus)toggle.focus({preventScroll:true});}
    function render(){
      const query=normalize(input.value),tokens=query.split(/\s+/).filter(Boolean);clear.hidden=!input.value;
      const matches=tokens.length?people.filter(person=>tokens.every(token=>person.search.includes(token))):[];
      status.textContent=failure||(!ready?'Chargement du programme…':!query?'Rechercher dans toute la compétition.':!matches.length?'Aucun nageur trouvé.':matches.length+' nageur'+(matches.length>1?'s':'')+(matches.length>20?' · préciser le nom pour affiner.':'.'));
      list.innerHTML=matches.slice(0,20).map(person=>'<li><button type="button" data-search-person="'+esc(person.key)+'"><strong>'+esc(ui.name(person))+'</strong><span>'+esc(person.club)+(person.birthYear?' · '+esc(person.birthYear):'')+'</span></button></li>').join('');
    }
    async function load(){
      const token=++request;ready=false;failure='';list.replaceChildren();render();
      try{
        const data=await getData();if(token!==request||panel.hidden)return;
        const unique=new Map();for(const row of data.entries){if(row.kind==='relay'||unique.has(row.key))continue;unique.set(row.key,{...row,search:normalize(row.lastName+' '+row.firstName)});}
        people=[...unique.values()].sort((a,b)=>a.search.localeCompare(b.search,'fr'));ready=true;render();
      }catch(error){if(token!==request||panel.hidden)return;failure=(error.message||'Programme indisponible.')+' Fermer puis réessayer.';render();list.replaceChildren();}
    }
    toggle.onclick=()=>{if(!panel.hidden){close();return;}panel.hidden=false;toggle.setAttribute('aria-expanded','true');input.focus({preventScroll:true});void load();};
    panel.querySelector('[data-search-close]').onclick=()=>close();clear.onclick=()=>{input.value='';render();input.focus();};input.oninput=render;
    panel.addEventListener('keydown',event=>{if(event.key==='Escape'){event.stopPropagation();close();}});
    list.onclick=event=>{const button=event.target.closest('[data-search-person]');if(button){close(false);onPerson(button.dataset.searchPerson);}};
    document.addEventListener('click',event=>{if(!panel.hidden&&!panel.contains(event.target)&&!event.target.closest('.direct-public-tools'))close(false);});
    function loading(busy,success=false){
      clearTimeout(refreshTimer);refresh.dataset.refreshState=busy?'loading':success?'success':'idle';
      const icon=refresh.querySelector('[data-refresh-icon]');icon.textContent='↻';
      if(success)refreshTimer=setTimeout(()=>{refresh.dataset.refreshState='idle';icon.textContent='↻';},1500);
    }
    return {loading,invalidate(){people=[];ready=false;if(!panel.hidden)void load();},close};
  }
  global.LivePalmesDirectPublicTools={create};
})(window);
