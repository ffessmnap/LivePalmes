(function(global){
  'use strict';
  const ui=global.LivePalmesDirectPresentation;
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const format=value=>{const n=Number(value);if(!n)return '—';const minutes=Math.floor(n/6000),seconds=Math.floor(n%6000/100),cs=n%100;return `${minutes?minutes+':':''}${String(seconds).padStart(minutes?2:1,'0')}.${String(cs).padStart(2,'0')}`;};
  const state={data:null,day:'all',mode:'series',highlightClub:'',refreshEpoch:0,categories:[],series:'all',records:null,loading:false,expandedSplits:new Set()};
  function rows(){return global.LivePalmesDirectEventView.scratch(state.data?.entries||[],state);}
  function shortEventLabel(event){const code=String(event.eventCode||'').match(/^(\d+(?:x\d+)?)([a-z]+)$/i);return code?code[1].replace(/x/i,'×')+' '+code[2].toUpperCase():event.eventLabel;}
  // One existing, bounded competition snapshot, shared by all person/club windows.
  let allCache=null,allPending=null,savedClubCompetition='',expandedEvent='';
  const cacheKey=()=>[state.data?.competition.id,state.data?.config.revision??state.data?.config.version??'',state.refreshEpoch].join(':');
  async function allData(){
    const key=cacheKey();if(allCache?.key===key)return allCache.data;if(allPending?.key===key)return allPending.promise;
    const url=new URL(global.LivePalmesEnvironment.napReaderUrl);url.searchParams.set('action','direct');url.searchParams.set('id',new URLSearchParams(location.search).get('id'));url.searchParams.set('view','club');
    const promise=(async()=>{const response=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(20000)});if(!response.ok)throw Error('Programme indisponible. Réessayer.');const data=await response.json();if(data.source!=='nap'||!Array.isArray(data.entries)||data.entries.length>15000)throw Error('Programme reçu invalide.');if(cacheKey()===key)allCache={key,data};return data;})().finally(()=>{if(allPending?.promise===promise)allPending=null;});
    allPending={key,promise};return promise;
  }
  const dialogs=global.LivePalmesDirectDialogs.create({getData:allData,onClubChange:club=>{state.highlightClub=club;try{localStorage.setItem('livepalmes-direct-club:'+state.data.competition.id,club);}catch{}render();},onEventSelect:(eventId,series)=>{state.categories=[];state.series=series||'all';const event=state.data.events.find(event=>event.id===eventId);if(event&&state.day!=='all')state.day=event.date;load(eventId);}});
  function references(event){return ui.references(state.data?.competition,state.data?.entries,event,state.records);}
  function render(){
    if(!state.data)return;const data=state.data,event=data.events.find(e=>e.id===data.selectedEventId),days=[...new Set(data.events.map(e=>e.date))].sort();
    if(expandedEvent!==data.selectedEventId){state.expandedSplits.clear();expandedEvent=data.selectedEventId;}
    const title=document.getElementById('meetTitle');title.textContent=data.competition.name;title.title=data.competition.name;document.title=`${data.competition.name} — LivePalmes Direct`;
    document.getElementById('meetMeta').textContent=[data.competition.city,ui.dateRange(data.competition.date,data.competition.endDate),data.competition.poolLength?`Bassin de ${data.competition.poolLength} m`:'',data.config.state==='archived'?'Archive du Direct':''].filter(Boolean).join(' · ');
    document.getElementById('calendarLink').href=`competition.html?id=${encodeURIComponent(data.competition.id)}`;
    if(savedClubCompetition!==data.competition.id){savedClubCompetition=data.competition.id;try{state.highlightClub=localStorage.getItem('livepalmes-direct-club:'+data.competition.id)||'';}catch{state.highlightClub='';}}
    document.getElementById('clubHighlightLabel').textContent=state.highlightClub||'Mon club';
    document.getElementById('clubHighlight').disabled=false;
    document.getElementById('clubHighlight').title=state.highlightClub?'Club mis en évidence : '+state.highlightClub:'Choisir un club à mettre en évidence';
    const dayNav=document.getElementById('dayNav'),showDays=days.length>1&&data.competition.endDate!==data.competition.date;
    dayNav.hidden=!showDays;if(!showDays)state.day='all';
    dayNav.innerHTML=showDays?[{key:'all',label:'Tous les jours'},...days.map(day=>({key:day,label:new Date(day+'T12:00:00').toLocaleDateString('fr-FR',{weekday:'short',day:'numeric',month:'short'})}))].map(day=>`<button type="button" data-day="${esc(day.key)}" aria-pressed="${state.day===day.key}">${esc(day.label)}</button>`).join(''):'';
    document.getElementById('eventNav').innerHTML=data.events.filter(e=>state.day==='all'||e.date===state.day).map(e=>`<button type="button" data-event="${esc(e.id)}" data-sex="${esc(e.sex)}" title="${esc(e.eventLabel)} · ${{F:'Femmes',M:'Hommes',X:'Mixte'}[e.sex]}${e.phase!=='series'?' · '+esc(e.phase):''}" aria-label="${esc(e.eventLabel)} · ${{F:'Femmes',M:'Hommes',X:'Mixte'}[e.sex]}${e.phase!=='series'?' · '+esc(e.phase):''} · ${ui.status(e).label}" aria-pressed="${event?.id===e.id}">${ui.dot(e)}${esc(shortEventLabel(e))} · ${{F:'F',M:'H',X:'Mixte'}[e.sex]}${e.phase!=='series'?' · '+esc(e.phase):''}</button>`).join('');
    const content=document.getElementById('directContent');
    document.getElementById('directDocuments').innerHTML=(data.config.documents||[]).filter(d=>/^https:\/\//.test(d.url||'')).map(d=>`<a target="_blank" rel="noopener" href="${esc(d.url)}">${esc(d.title)}</a>`).join('');
    if(!event){content.innerHTML='<div class="direct-card direct-empty">Les séries et résultats seront disponibles après publication par le bureau des performances.</div>';return;}
    state.mode=global.LivePalmesDirectEventView.resultMode(data.entries,event)?'results':'series';
    content.innerHTML=global.LivePalmesDirectEventView.render({data,event,state,records:references(event)});
    document.getElementById('applyCategories')?.addEventListener('click',()=>filterCategories([...content.querySelectorAll('input[name=category]:checked')].map(n=>n.value)));
  }
  function filterCategories(categories,fromHeat=false){
    state.categories=categories;render();
    document.querySelector('.direct-filters>summary')?.focus({preventScroll:true});
    if(fromHeat)document.querySelector('.direct-scratch')?.scrollIntoView({block:'nearest'});
  }
  async function load(eventId){
    if(state.loading)return;state.loading=true;const button=document.getElementById('directRefresh'),status=document.getElementById('directStatus');button.disabled=true;status.textContent='Actualisation…';status.classList.remove('error');
    const scroll=global.scrollY;
    try{const params=new URLSearchParams(global.location.search),id=params.get('id');if(!/^\d+$/.test(id||''))throw Error('Choisir une compétition depuis le calendrier.');const url=new URL(global.LivePalmesEnvironment.napReaderUrl);url.searchParams.set('action','direct');url.searchParams.set('id',id);if(eventId)url.searchParams.set('eventId',eventId);const response=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(20000)});if(!response.ok)throw Error('Direct indisponible ou pas encore ouvert. Réessayer avec Actualiser.');const data=await response.json();if(data.source!=='nap')throw Error('Réponse de compétition invalide.');state.data=data;render();status.textContent=`Mis à jour à ${new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})} · actualisation manuelle`;global.scrollTo(0,scroll);if(!state.records)loadRecords();}
    catch(error){status.textContent=error.message;status.classList.add('error');}finally{state.loading=false;button.disabled=false;}
  }
  async function loadRecords(){try{const url=new URL(global.LivePalmesEnvironment.napReaderUrl);url.searchParams.set('action','records');const response=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(10000)});if(!response.ok)throw Error();const payload=await response.json();state.records=payload.data;render();}catch{const status=document.getElementById('directStatus');status.textContent+=' · Références RF/MPF indisponibles';}}
  global.LivePalmesDirectPublic={state,rows,references,render,load,format,allData,dialogs};
  document.addEventListener('click',e=>{
    if(state.loading)return;
    const categoryFilter=e.target.closest('[data-category-filter]');
    if(categoryFilter){if(state.mode==='results')filterCategories([categoryFilter.dataset.categoryFilter],Boolean(categoryFilter.closest('.direct-heat-section')));return;}
    if(e.target.closest('[data-clear-categories]')){filterCategories([]);return;}
    const splits=e.target.closest('[data-splits]');if(splits){const detail=document.getElementById(splits.dataset.splits);if(detail){detail.hidden=!detail.hidden;splits.setAttribute('aria-expanded',String(!detail.hidden));if(detail.hidden)state.expandedSplits.delete(splits.dataset.splitsKey);else state.expandedSplits.add(splits.dataset.splitsKey);}return;}
    const person=e.target.closest('[data-person]');if(person){dialogs.openPerson(person.dataset.person);return;}
    const heat=e.target.closest('[data-heat],[data-heat-jump]');
    if(heat){state.series=heat.dataset.heat||heat.dataset.heatJump;render();if(heat.hasAttribute('data-heat-jump'))document.getElementById('eventHeats')?.scrollIntoView({block:'start'});return;}
    const row=e.target.closest('.direct-race-table .direct-participant-row');
    if(row&&!e.target.closest('button,a,input,select,summary')){const name=row.querySelector('[data-person]');if(name){dialogs.openPerson(name.dataset.person);return;}}
    const day=e.target.closest('[data-day]'),event=e.target.closest('[data-event]');
    if(day){state.day=day.dataset.day;const next=state.data.events.find(e=>state.day==='all'||e.date===state.day);if(next&&state.day!=='all'&&state.data.events.find(e=>e.id===state.data.selectedEventId)?.date!==state.day)load(next.id);else render();}
    if(event){state.series='all';state.categories=[];load(event.dataset.event);}
  });
  document.getElementById('clubHighlight').onclick=()=>dialogs.openClub(state.highlightClub);
  document.getElementById('directRefresh').onclick=()=>{state.refreshEpoch++;load(state.data?.selectedEventId);};load();
})(window);
