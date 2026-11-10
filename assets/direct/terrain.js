(function(global){
  'use strict';
  const view=global.LivePalmesDirectTerrainView,ui=global.LivePalmesDirectPresentation,$=id=>document.getElementById(id),esc=view.esc;
  const supported=role=>['referee','video','speaker','live'].includes(role);
  function create({client,competitionId,getUser,onRole,onSignOut,onPrint,dismiss,dismissed}){
    const state=client.state,root=$('terrainRoot'),modal=document.createElement('dialog');modal.id='terrainModal';modal.className='decision-modal terrain-modal';document.body.append(modal);
    const local={lineOrder:'asc',person:null,home:false,filter:'all',expanded:false,recordKey:'',refs:[],draft:null,pinned:null,modalKind:null,modalAlert:null,personRequest:0};
    const active=()=>supported(state.role)&&Boolean(state.data);
    const storageKey=()=>`direct-terrain:${competitionId}:${getUser()?.uid}:${state.role}`;
    function save(){try{localStorage.setItem(storageKey(),JSON.stringify({eventId:state.eventId,series:state.series,session:state.session,lineOrder:local.lineOrder}));}catch{}}
    function restore(events=[]){local.person=null;local.home=false;local.filter='all';local.expanded=false;try{const saved=JSON.parse(localStorage.getItem(storageKey())||'null');if(saved&&events.some(e=>e.id===saved.eventId)){state.eventId=saved.eventId;state.series=Number(saved.series)||null;state.session=saved.session||'all';local.lineOrder=saved.lineOrder==='desc'?'desc':'asc';}}catch{}}
    function setLayout(enabled){
      for(const id of ['consoleLegacyBase','consoleLegacyComponents'])$(id).media=enabled?'all':'not all';
      for(const id of ['consoleDirectBase','consoleDirectComponents'])$(id).media=enabled?'not all':'all';
      document.body.classList.toggle('terrain-mode',enabled);
      for(const role of Object.keys(view.labels)){document.body.classList.remove('role-'+role,'dedicated-'+role+'-page');}
      document.body.classList.toggle('live-mode',enabled);
      if(enabled){document.body.classList.add('role-'+state.role,'dedicated-console-page','dedicated-'+state.role+'-page');}
      else document.body.classList.remove('dedicated-console-page','profile-home-active','fullscreen-mode');
      root.hidden=!enabled;$('modernConsoleRoot').hidden=enabled;
    }
    function close(){if(state.busy)return;modal.close();modal.replaceChildren();local.modalKind=null;local.draft=null;local.pinned=null;local.conflict=false;}
    function leave(){modal.close();modal.replaceChildren();root.replaceChildren();local.modalKind=null;local.person=null;local.personRequest++;setLayout(false);}
    function notice(message,error=false){
      if(!active())return;const badge=$('terrainConnection'),note=$('terrainNotice');
      if(badge){badge.classList.toggle('error',error);badge.classList.toggle('ok',!error);badge.innerHTML=`<i class="firebase-dot ${error?'pending':'ok'}" aria-hidden="true"></i>${error?'Connexion à vérifier':'Direct actif · '+view.time(new Date().toISOString())}`;badge.title=message;}
      if(note){note.hidden=!error;note.textContent=error?message:'';}modalUpdates();
    }
    function event(){return state.data?.events.find(e=>e.id===state.data.selectedEventId);}
    function selectedSeries(){const e=event();if(!e)return null;const numbers=view.heats(e,state.data.entries);return numbers.includes(Number(state.series))?Number(state.series):numbers[0]||null;}
    function sessionEvents(){return state.data.events.filter(e=>global.LivePalmesDirectSessions.matches(e,state.session));}
    function nodes(){return sessionEvents().flatMap(e=>view.heats(e,e.id===event()?.id?state.data.entries:[]).map(series=>({eventId:e.id,series})));}
    async function select(eventId,series=null){if(state.loading||state.busy||state.pending)return;close();local.person=null;state.eventId=eventId;state.series=Number(series)||null;state.reserveOffset=0;await client.load(true);save();}
    function refs(){const e=event();return e?ui.references(state.data.competition,state.data.entries,e,state.records).map((row,index)=>({...row,_key:[row.recordType,row.course,row.sex,row.category,row.time,row.swimmer,index].join('|')})):[];}
    function references(){
      if(!active()||!['speaker','live'].includes(state.role))return;
      local.refs=refs();const selected=local.refs.find(row=>row._key===local.recordKey);
      $('entrantsSubtitle').innerHTML=`<span class="speaker-panel-refs">${global.LivePalmesHeaderView.renderHeaderReferenceChipsHtml({recordRows:local.refs,selectedRecordKey:local.recordKey,helpers:{categoryClass:view.categoryClass,recordKey:r=>r._key,shortRecordLabel:r=>r.recordType==='RF'||r.recordType==='RFJ'?r.recordType:'MPF '+view.categoryLabel(r.category,r.sex)}})}</span>${selected?`<span class="header-ref-details speaker-panel-ref-details">${global.LivePalmesHeaderView.renderSelectedHeaderReferenceDetailsHtml(selected,{shortRecordLabel:r=>r.recordType||'MPF',recordDescription:r=>[r.swimmer,r.club,r.date,r.location||r.place].filter(Boolean).join(' · ')})}</span>`:''}`;
    }
    async function loadReferences(refresh=false){try{await client.records(refresh);if(active()){references();if(local.person)showPerson(local.person);}}catch(error){notice(error.message,true);}}
    function render(){
      if(!active())return;setLayout(true);root.innerHTML=view.shell(state.data,state.role);
      const e=event(),sessions=global.LivePalmesDirectSessions.options(state.data.events);
      if(state.session==='all'||!sessions.some(s=>s.key===state.session))state.session=e?global.LivePalmesDirectSessions.key(e):sessions[0]?.key||'all';
      const options=sessions.map(s=>{const item=state.data.events.find(e=>global.LivePalmesDirectSessions.key(e)===s.key);return `<option value="${esc(s.key)}" ${s.key===state.session?'selected':''}>${sessions.some(other=>other.key!==s.key&&other.label===s.label)?esc(s.label):'S'+esc(item?.sessionKey||s.label)}</option>`;}).join('');
      $('sessionControls').innerHTML=`<select id="terrainSession" class="session-select" aria-label="Session">${options}</select>`;
      const group=new Map();for(const item of sessionEvents()){const key=item.eventCode+'|'+item.sex;if(!group.has(key))group.set(key,[]);group.get(key).push(item);}
      const chosen=e?e.eventCode+'|'+e.sex:'';
      $('eventSelect').innerHTML=[...group].map(([key,items])=>{const item=items.find(e=>e.phase==='series')||items[0],n=view.heats(item,item.id===e?.id?state.data.entries:[]).length;return `<option value="${esc(key)}" data-event-id="${item.id}" ${key===chosen?'selected':''}>${esc(item.eventLabel)} ${view.sex(item.sex)} - ${item.phase==='series'?n+' série'+(n>1?'s':''):view.phase(item.phase)}</option>`;}).join('');
      if(!e){$('entrantsBody').innerHTML='<tr><td colspan="5" class="empty">Importer les séries depuis le bureau des performances.</td></tr>';return;}
      const heat=selectedSeries();state.series=heat;
      const same=group.get(chosen)||[e],qual=same.find(row=>row.phase==='series'),numbers=qual?view.heats(qual,qual.id===e.id?state.data.entries:[]):[],legacyState={role:state.role,series:e.phase==='series'?String(heat):e.phase};
      const flat=nodes(),index=flat.findIndex(row=>row.eventId===e.id&&row.series===heat);
      global.LivePalmesSeriesControls.renderSeriesControls({state:legacyState,data:{series:same.flatMap(item=>view.heats(item,item.id===e.id?state.data.entries:[]).map(n=>({eventId:item.eventCode,sex:item.sex,series:n,stage:item.phase,startTime:view.heatTime(item,n)})))},seriesControls:$('seriesControls'),availableSeriesNumbers:()=>numbers,finalProgramRowsForRace:()=>same.filter(row=>row.phase!=='series').map(row=>({...row,stage:row.phase,startTime:row.scheduledAt})),finalStageLabel:view.phase,isFinalStage:value=>value!=='all'&&!/^\d+$/.test(String(value))&&value!=='series',matchesRace:()=>true,raceSeries:()=>[],selectedProgramRow:()=>({...e,stage:e.phase,hasEntrants:true}),hasNextProgramSeries:()=>index>=0&&index<flat.length-1,hasPreviousProgramSeries:()=>index>0,programKey:row=>row.id,refereeProgress:()=>state.data.workflow.progress?{programKey:state.data.workflow.progress.eventId,series:state.data.workflow.progress.series,stage:state.data.events.find(item=>item.id===state.data.workflow.progress.eventId)?.phase||'series'}:null,escapeHtml:esc,previousSeriesInlineBtn:$('previousSeriesInlineBtn'),nextSeriesInlineBtn:$('nextSeriesInlineBtn')});
      const total=view.heats(e,state.data.entries).length,title=e.phase==='series'?'Série '+heat+'/'+total:view.phase(e.phase);
      $('entrantsTitle').innerHTML=`${esc(e.eventLabel)} · ${view.sex(e.sex)} · ${esc(title)} <span class="inline-entrant-count">${state.data.entries.length} engagé${e.sex==='F'?'e':''}${state.data.entries.length>1?'s':''}</span>`;
      $('swimmerHeader').textContent=e.sex==='F'?'Nageuse':'Nageur';$('lineOrderBtn').textContent=local.lineOrder==='desc'?'Lignes 8-1':'Lignes 1-8';
      $('entrantsBody').innerHTML=view.rows(state.data,state.role,heat,local);
      $('refereeProgressBtn').textContent=state.data.workflow.progress?.eventId===e.id&&Number(state.data.workflow.progress.series)===heat?'Pointé JA':'Pointer ici';
      $('decisionPanel').hidden=state.role!=='referee';$('decisionPanel').innerHTML=state.role==='referee'?global.LivePalmesRefereeView.renderDecisionPanelHtml():'';
      const queue=view.queue(state.data,state.role,dismissed());$('roleQueue').hidden=state.role!=='video';if(state.role==='video')$('roleQueue').innerHTML=queue;
      $('officialAlerts').hidden=!['speaker','live'].includes(state.role)||!queue;if(['speaker','live'].includes(state.role))$('officialAlerts').innerHTML=queue;
      const inboxCount=state.data.workflow.alerts.filter(a=>!a.cancelledAt&&(state.role==='speaker'?a.speakerStatus==='pending':state.role==='live'?a.official&&!dismissed().includes(a.id):a.videoStatus==='pending')).length;
      if(inboxCount){const badge=document.createElement('button');badge.id='terrainInboxButton';badge.className='terrain-inbox-button';badge.type='button';badge.textContent=inboxCount+' information(s) à consulter';$('terrainActions').append(badge);}
      const tasks=view.finalTasks(state.data,state.role,dismissed());$('terrainFinalTasks').hidden=!tasks;$('terrainFinalTasks').innerHTML=tasks;
      const historyId=['speaker','live'].includes(state.role)?'speakerHistory':'roleHistory';$(historyId).hidden=false;$(historyId).innerHTML=view.history(state.data,state.role,local.filter,local.expanded);
      $('terrainApp').hidden=local.home;$('terrainHomePanel').hidden=!local.home;
      if(local.home)document.body.classList.remove('dedicated-'+state.role+'-page');
      references();if(local.person)showPerson(local.person);save();activity();modalUpdates();
      if(['speaker','live'].includes(state.role)&&!state.records)loadReferences();
    }
    function activity(){const locked=state.loading||state.busy;root.inert=locked;root.setAttribute('aria-busy',String(locked));root.classList.toggle('terrain-loading',locked);modal.querySelectorAll('[data-submit-decision],[data-finalists-announced],[data-terrain-tie-submit]').forEach(button=>{if(locked&&!button.disabled){button.dataset.loadingLock='';button.disabled=true;}else if(!locked&&button.hasAttribute('data-loading-lock')){button.disabled=false;delete button.dataset.loadingLock;}});}
    function modalUpdates(){
      if(!modal.open||!state.data)return;
      const content=modal.querySelector('.decision-dialog');const error=modal.querySelector('#terrainModalError');if(content&&error&&error.parentElement!==content)content.append(error);
      let box=modal.querySelector('#terrainModalUpdates');
      if(!box){box=document.createElement('aside');box.id='terrainModalUpdates';box.className='terrain-modal-updates';box.setAttribute('role','status');(content||modal).prepend(box);}
      const p=view.presenter(state.data,state.role,dismissed()),pending=view.alerts(state.data).filter(a=>p.currentRoleAlertFilter(a)).sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));
      const tasks=(state.data.finalTasks||[]).filter(t=>['speaker','live'].includes(state.role)&&(state.role==='live'?t.announced:['announce','replacement','departure'].includes(t.kind)));
      box.hidden=!pending.length&&!tasks.length;
      const first=pending[0];box.innerHTML=`<strong>${pending.length+tasks.length} information(s) à consulter</strong>${first?`<span>${esc(global.LivePalmesConsoleView.motifs[first.type]||first.type)} · ${esc(first.displayName)} · ${esc(first.eventLabel)}</span>`:''}<details><summary>Voir les informations reçues</summary>${pending.slice(0,10).map(a=>`<p>${view.time(a.createdAt)} · ${esc(global.LivePalmesConsoleView.motifs[a.type]||a.type)} — ${esc(a.displayName)} · ${esc(a.eventLabel)} · S${a.series} L${a.lane}</p>`).join('')}${tasks.map(t=>`<p>Finale · ${esc(t.label)} · ${view.sex(t.sex)}</p>`).join('')}${pending.length>10?'<p>Les autres informations sont dans la file de la console.</p>':''}</details>`;
    }
    async function showPerson(key){
      local.person=key;const request=++local.personRequest,uid=getUser()?.uid;const panel=$('swimmerDetails');if(!panel)return;panel.hidden=false;panel.innerHTML='<p class="panel-subtitle">Chargement…</p>';
      try{const data=await client.allData();if(!active()||uid!==getUser()?.uid||request!==local.personRequest||key!==local.person)return;panel.innerHTML=view.person(data,key,state.records);}
      catch(error){if(request===local.personRequest&&panel.isConnected)panel.innerHTML='<p class="panel-subtitle">'+esc(error.message)+'</p>';}
    }
    function open(html,kind,pinned=client.context()){modal.innerHTML=html+'<p id="terrainModalError" class="terrain-modal-error" role="alert" hidden></p>';local.modalKind=kind;local.pinned=pinned;local.conflict=false;modal.showModal();modalUpdates();}
    function modalError(error){const target=$('terrainModalError');if(target){target.hidden=false;target.textContent=error.message;local.conflict=/aborted/.test(error.code||'');if(state.pending||local.conflict){const retry=document.createElement('button');retry.type='button';retry.className='ghost-button';if(state.pending)retry.dataset.terrainRetry='';else retry.dataset.terrainReview='';retry.textContent=state.pending?'Vérifier / réessayer le dernier envoi':'Vérifier les changements · conserver le brouillon';target.append(document.createElement('br'),retry);}}else notice(error.message,true);}
    async function command(name,input={},pinned=client.context()){
      try{if(!await client.send(name,input,pinned))return;close();local.person=null;await client.load(true);}catch(error){if(modal.open)modalError(error);else notice(error.message,true);}
    }
    function decision(key){
      const e=event(),row=state.data.entries.find(r=>r.key===key);if(!row)return;
      local.draft={type:'',relayLeg:'',lengthType:'start',lengthNumber:'1',comment:''};local.decisionKey=key;local.pinned=client.context();renderDecision(e,row,true);
    }
    function renderDecision(e=event(),row=state.data.entries.find(r=>r.key===local.decisionKey),opening=false){
      if(!row||!local.draft)return;const draft=local.draft,relay=row.kind==='relay',code=e.eventCode.toLowerCase(),label=e.eventLabel.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
      const needsLeg=relay&&['relay_early_start','underwater_15m','immersion','bottle_fault','interference','other_dsq'].includes(draft.type),needsLength=draft.type==='underwater_15m';
      const choices=Object.entries(global.LivePalmesConsoleView.motifs).filter(([type])=>!['requalification','ja_cancellation','swimoff_cancelled'].includes(type)&&!(type==='relay_early_start'&&!relay)&&!(['underwater_15m','immersion'].includes(type)&&(/\d+(ap|is)$/.test(code)||/apnee|immersion/.test(label)))&&!(type==='bottle_fault'&&!/\d+is$/.test(code)&&!/immersion/.test(label))).map(([value,label])=>({value,label,active:draft.type===value}));
      const p=view.presenter(state.data,state.role);
      const existing=view.alerts(state.data).filter(a=>a.eventId===e.id&&a.participantKey===row.key&&!a.cancelledAt&&a.videoStatus!=='rejected'&&p.isDsqAlert(a));
      const html=global.LivePalmesRefereeView.renderDecisionModalHtml({activeDecisions:existing.map(a=>({id:a.id,label:p.decisionMotifLabel(a)})),choices,decisionDraft:draft,entrantName:ui.name(row),lineLabel:row.lane,raceInfo:e.eventLabel+' '+view.sex(e.sex)+' - '+(e.phase==='series'?'Série '+row.series:view.phase(e.phase))+' - Ligne '+row.lane,ready:Boolean(draft.type&&(!needsLeg||draft.relayLeg)&&(!needsLength||draft.lengthType==='start'||Number(draft.lengthNumber)>0)),relay,legCount:Number(code.match(/^(\d+)x/)?.[1])||4,firstLeg:draft.type==='relay_early_start'?2:1,showRelayLeg:needsLeg,showLengthSelector:needsLength});
      if(opening)open(html,'decision',local.pinned);else modal.innerHTML=html+'<p id="terrainModalError" class="terrain-modal-error" role="alert" hidden></p>';
      for(const a of existing.filter(a=>a.videoStatus==='pending')){const button=document.createElement('button');button.type='button';button.className='ghost-button';button.dataset.terrainTakeover=a.id;button.textContent='Reprendre sans vidéo';modal.querySelector('.decision-dialog').append(button);}modalUpdates();
    }
    function program(){
      const rows=sessionEvents().map(e=>({programKey:e.id,eventLabel:e.eventLabel,sexLabel:view.sex(e.sex),session:e.sessionKey,startTime:e.scheduledAt,current:e.id===event()?.id,items:view.heats(e,e.id===event()?.id?state.data.entries:[]).map(n=>({series:n,stage:e.phase,label:e.phase==='series'?String(n):view.phase(e.phase),time:view.heatTime(e,n),current:e.id===event()?.id&&n===selectedSeries(),progressClass:state.data.workflow.progress?.eventId===e.id&&state.data.workflow.progress.series===n?'ja-current':''}))}));
      open(global.LivePalmesProgramView.renderProgramModalHtml({rows,compactProgram:true,sessionLabel:$('terrainSession')?.selectedOptions[0]?.textContent||''}),'program');
    }
    function detail(id){
      const a=view.alerts(state.data).concat(view.journal(state.data,state.role)).find(row=>row.id===id);if(!a)return;const p=view.presenter(state.data,state.role);
      open(global.LivePalmesAlertDetailView.renderAlertDetailModalHtml({alert:a,comment:a.comment,courseLabel:a.eventLabel+' '+view.sex(a.sex),decisionLabel:a.commandLabel||(a.type==='swimoff_cancelled'?'Swim-off annulé':p.decisionMotifLabel(a)),identity:a.command?a.displayName:p.alertIdentityLabel(a),seriesLineLabel:'Série '+a.series+' - ligne '+a.line,hasSeriesLine:!a.command&&Boolean(a.line||a.series),sheetTitle:a.command?'Journal des finales':'Fiche décision',status:view.status(a),statusClass:view.statusClass(a),timeline:a.command?[[view.labels[a.role],a.at]]:view.timeline(a),formatAlertDateTime:at=>new Date(at).toLocaleString('fr-FR'),speakerSentence:state.role==='speaker'&&!a.command&&a.type!=='swimoff_cancelled'?p.speakerAlertSentence(a):null}),'detail');
    }
    async function finalTask(eventId){
      if(eventId!==event()?.id){await select(eventId);if(event()?.id!==eventId)return;}
      const q=state.data.finals,e=state.data.finalsEvent;if(!q||!e)return;
      const pending=new Set(q.pendingKeys||[]),roster=state.role==='live'?q.roster:q.pendingRoster?Object.fromEntries(['a','b'].map(group=>[group,q.pendingRoster[group].filter(key=>!pending.has(key))])):q.announcedAt?q.roster:q.certainRoster;
      const rows=new Map(state.data.qualifyingEntries.map(row=>[row.key,row])),finals=Object.fromEntries(['a','b'].map(group=>[group,roster[group].map((key,index)=>({...rows.get(key),rank:q.ties.length||q.partial?'':index+1,time:global.LivePalmesDirectEventView.format(rows.get(key)?.result?.cs)}))]));
      const initial=!q.announcedAt,name=initial?'announceFinalists':'announceReplacement';
      const can=state.role==='speaker'&&!q.invitedQuotaMissing&&q.complete&&!q.unresolvedDecision&&!q.decisionMismatch&&(initial?(finals.a.length+finals.b.length>0):q.pendingRoster&&!q.ties.length&&q.swimoff?.status!=='unnecessary');
      const text=q.invitedQuotaMissing?'Le bureau doit confirmer le quota d’invités IN par finale avant l’annonce.':q.ties.length?'Annoncer uniquement les qualifiés certains ; les autres places restent en attente de départage.':q.swimoff?.status==='unnecessary'?'Le JA ou le bureau doit confirmer l’annulation du swim-off devenu inutile.':q.changed&&!q.pendingRoster?'Le bureau doit contrôler la composition après modification des résultats.':q.unresolvedDecision||q.decisionMismatch?'Le bureau doit traiter les décisions et recevoir les résultat corrigés.':`Votre attention s’il vous plaît, sont qualifiés pour ${q.format==='ab'?'les finales':'la finale'} du ${e.eventLabel} ${view.sex(e.sex)} :`;
      open(global.LivePalmesAlertDetailView.renderFinalistsAnnouncementModalHtml({alert:{id:e.id},canMarkAnnounced:Boolean(can),eventLabel:e.eventLabel,sexLabel:view.sex(e.sex),speakerText:state.role==='live'?'Composition officiellement annoncée'+(q.partial?' · autres places en attente de départage.':q.pendingRoster?' · un changement reste à annoncer.':'.'):text,finalistsListHtml:(state.role==='live'?'':global.LivePalmesConsoleView.replacement(q,rows))+'<div class="'+(q.ties.length||q.partial?'terrain-partial-roster':'')+'">'+global.LivePalmesAlertCardView.renderFinalistsAlertListHtml({finals,finalistRowName:ui.name})+'</div>'}),'finalists',{...client.context(),eventId:e.id});local.finalCommand=name;
      if(state.role==='referee'&&(q.ties.length||q.swimoff?.status==='unnecessary')){const box=document.createElement('div');box.innerHTML=q.ties.map(tie=>`<div class="terrain-tie"><strong>Ex æquo · places ${tie.from} à ${tie.to}</strong><span>${tie.names.map(esc).join(' · ')}</span><button type="button" class="ghost-button" data-terrain-tie="${tie.id}">Enregistrer le départage</button><button type="button" class="ghost-button" data-terrain-swimoff>Noter le swim-off prévu</button></div>`).join('')+(q.swimoff?.status==='unnecessary'?'<div class="terrain-tie"><strong>Départage devenu inutile</strong><button type="button" class="ghost-button confirm-button" data-terrain-swimoff-cancel>Confirmer l’annulation du swim-off</button></div>':'');modal.querySelector('.decision-dialog').append(box);}
    }
    async function click(eventClick){
      const target=eventClick.target;if(!active()||state.busy)return;
      if(target.closest('[data-terrain-signout]')){onSignOut();return;}
      const role=target.closest('[data-terrain-role]');if(role){onRole(role.dataset.terrainRole);return;}
      if(target.closest('#terrainHome')){local.home=!local.home;render();return;}
      if(target.closest('#terrainConnection')){client.load(true);return;}
      if(target.closest('#fullscreenBtn')){try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();document.body.classList.toggle('fullscreen-mode',Boolean(document.fullscreenElement));}catch{notice('Plein écran indisponible sur ce navigateur.',true);}return;}
      if(target.closest('#terrainPrint')){onPrint();return;}
      if(target.closest('#terrainInboxButton')){const box=state.role==='video'?$('roleQueue'):$('officialAlerts');box.scrollIntoView({block:'start',behavior:'smooth'});box.scrollTop=0;return;}
      if(target.closest('#terrainReferences')){loadReferences(true);return;}
      if(target.closest('.close-ref-details')){local.recordKey='';references();return;}
      const record=target.closest('[data-record-key]');if(record){local.recordKey=local.recordKey===record.dataset.recordKey?'':record.dataset.recordKey;references();return;}
      if(target.closest('.close-details')){local.person=null;local.personRequest++;$('swimmerDetails').hidden=true;$('swimmerDetails').replaceChildren();$('entrantsBody').innerHTML=view.rows(state.data,state.role,selectedSeries(),local);return;}
      if(target.closest('#lineOrderBtn')){local.lineOrder=local.lineOrder==='asc'?'desc':'asc';render();return;}
      if(state.loading)return;
      const series=target.closest('#seriesControls [data-series]');if(series){const value=series.dataset.series;if(/^\d+$/.test(value)){const e=sessionEvents().find(e=>e.eventCode===event()?.eventCode&&e.sex===event()?.sex&&e.phase==='series');if(e)select(e.id,Number(value));}else{const e=sessionEvents().find(e=>e.eventCode===event()?.eventCode&&e.sex===event()?.sex&&e.phase===value);if(e)select(e.id,1);}return;}
      if(target.closest('#previousSeriesInlineBtn,#nextSeriesInlineBtn')){const list=nodes(),index=list.findIndex(row=>row.eventId===event()?.id&&row.series===selectedSeries()),next=list[index+(target.closest('#previousSeriesInlineBtn')?-1:1)];if(next)select(next.eventId,next.series);return;}
      if(target.closest('#programBtn')){program();return;}
      if(target.closest('#refereeProgressBtn')){command('progress',{series:selectedSeries()});return;}
      const maskFinal=target.closest('[data-terrain-final-dismiss]');if(maskFinal){dismiss(maskFinal.dataset.terrainFinalDismiss);render();return;}
      const final=target.closest('[data-terrain-final]');if(final){finalTask(final.dataset.terrainFinal);return;}
      const queueAction=target.closest('[data-queue-action]');if(queueAction){const id=queueAction.closest('[data-alert-id]').dataset.alertId,a=state.data.workflow.alerts.find(a=>a.id===id);if(a)command(queueAction.dataset.queueAction==='confirm-video'?'videoConfirm':'videoReject',{alertId:id},{...client.context(),eventId:a.eventId});return;}
      const alertCard=target.closest('#officialAlerts [data-alert-id]');if(alertCard){const a=state.data.workflow.alerts.find(a=>a.id===alertCard.dataset.alertId);if(!a)return;if(state.role==='live'){dismiss(a.id);render();}else if(target.closest('[data-alert-action]'))command('announceDecision',{alertId:a.id},{...client.context(),eventId:a.eventId});else detail(a.id);return;}
      if(target.closest('[data-history-toggle]')){local.expanded=!local.expanded;render();return;}
      const history=target.closest('[data-history-alert-id]');if(history){const id=history.dataset.historyAlertId,a=state.data.workflow.alerts.find(a=>a.id===id);if(!target.closest('[data-history-action]')){detail(id);return;}const pinned={...client.context(),eventId:a?.eventId};if(a&&await global.LivePalmesDirectConfirm.ask(state.role==='video'?'Confirmer l’annulation par le délégué de la compétition ? Le speaker et le bureau recevront une alerte de réqualification.':'Annuler cette décision ? Une alerte sera envoyée si une correction est nécessaire.'))command('cancel',{alertId:id},pinned);return;}
      const personEvent=target.closest('[data-person-event]');if(personEvent){select(personEvent.dataset.personEvent,personEvent.dataset.personSeries);return;}
      const row=target.closest('#entrantsBody tr[data-swimmer-id]');if(row){if(state.role==='referee')decision(row.dataset.swimmerId);else{local.person=local.person===row.dataset.swimmerId?null:row.dataset.swimmerId;if(local.person)showPerson(local.person);else $('swimmerDetails').hidden=true;$('entrantsBody').innerHTML=view.rows(state.data,state.role,selectedSeries(),local);}return;}
    }
    root.addEventListener('click',e=>{click(e).catch(error=>notice(error.message,true));});
    root.addEventListener('change',e=>{if(e.target.id==='terrainSession'){state.session=e.target.value;const first=sessionEvents()[0];if(first)select(first.id);}
      else if(e.target.id==='eventSelect'){const id=e.target.selectedOptions[0]?.dataset.eventId;if(id)select(id);}
      else if(e.target.matches('[data-history-filter]')){local.filter=e.target.value;local.expanded=false;render();}});
    modal.addEventListener('input',e=>{if(!local.draft)return;if(e.target.id==='modalDecisionComment')local.draft.comment=e.target.value;else if(e.target.id==='modalLengthNumber')local.draft.lengthNumber=e.target.value;});
    modal.addEventListener('cancel',e=>{if(state.busy)e.preventDefault();else close();});
    modal.addEventListener('click',async e=>{
      if(state.busy)return;const target=e.target;
      try{
        if(target===modal||target.closest('[data-close-decision],[data-close-alert-detail],[data-program-close]')){close();return;}
        if(target.closest('[data-terrain-retry]')){if(!await client.deliver())return;close();await client.load(true);return;}
        if(target.closest('[data-terrain-review]')){
          await client.revalidate(local.pinned);
          if(local.modalKind==='decision'){
            const row=state.data.entries.find(r=>r.key===local.decisionKey);if(!row)throw Error('Cette participation n’est plus disponible. Le brouillon est conservé.');
            renderDecision();
          }else if(local.modalKind==='finalists'){const id=local.pinned.eventId;await finalTask(id);}
          local.conflict=false;const message=$('terrainModalError');message.hidden=false;message.textContent='Données actualisées. Vérifiez le contexte et confirmez à nouveau si la décision reste correcte.';return;
        }
        const programTarget=target.closest('[data-program-race]');if(programTarget){const id=programTarget.dataset.programRace,n=programTarget.dataset.programSeries;close();select(id,n);return;}
        const type=target.closest('[data-decision-type]');if(type){local.draft.type=type.dataset.decisionType;local.draft.relayLeg=event().eventCode.includes('x')?(local.draft.type==='relay_early_start'?'2':'1'):'';local.draft.lengthType='start';local.draft.lengthNumber='1';renderDecision();return;}
        const leg=target.closest('[data-relay-leg]');if(leg){local.draft.relayLeg=leg.dataset.relayLeg;renderDecision();return;}
        const length=target.closest('[data-length-type]');if(length){local.draft.lengthType=length.dataset.lengthType;renderDecision();return;}
        const step=target.closest('[data-length-step]');if(step){local.draft.lengthType='length';local.draft.lengthNumber=String(Math.max(1,(Number(local.draft.lengthNumber)||1)+Number(step.dataset.lengthStep)));renderDecision();return;}
        if(target.closest('[data-submit-decision]')){await command('decision',{...local.draft,participantKey:local.decisionKey},local.pinned);return;}
        const takeover=target.closest('[data-terrain-takeover]');if(takeover){if(await global.LivePalmesDirectConfirm.ask('Reprendre cette décision sans attendre la vidéo ?'))await command('takeover',{alertId:takeover.dataset.terrainTakeover},local.pinned);return;}
        const cancel=target.closest('[data-cancel-active-decision]');if(cancel){if(await global.LivePalmesDirectConfirm.ask('Annuler cette DSQ ? Une alerte sera envoyée si une correction est nécessaire.'))command('cancel',{alertId:cancel.dataset.cancelActiveDecision},local.pinned);return;}
        if(target.closest('[data-finalists-announced]')){await command(local.finalCommand,{},local.pinned);return;}
        const tie=target.closest('[data-terrain-tie]');if(tie){const item=state.data.finals.ties.find(row=>row.id===tie.dataset.terrainTie);local.tie=item;const pinned=local.pinned;open(`<div class="decision-dialog"><div class="decision-modal-head"><h2>Enregistrer le départage</h2><button class="decision-close" type="button" data-close-alert-detail>×</button></div>${item.keys.map((key,index)=>`<label class="terrain-tie">${index+1}${index?'e':'er'}<select data-terrain-tie-order><option value="">Choisir…</option>${item.keys.map((key,i)=>`<option value="${key}">${esc(item.names[i])}</option>`).join('')}</select></label>`).join('')}<button class="primary-button" type="button" data-terrain-tie-submit>Valider le départage</button></div>`,'tie',pinned);return;}
        if(target.closest('[data-terrain-tie-submit]')){await command('resolveTie',{tieId:local.tie.id,order:[...modal.querySelectorAll('[data-terrain-tie-order]')].map(input=>input.value)},local.pinned);return;}
        if(target.closest('[data-terrain-swimoff]')){await command('markSwimoff',{},local.pinned);return;}
        if(target.closest('[data-terrain-swimoff-cancel]')){await command('confirmSwimoffCancelled',{},local.pinned);return;}
      }catch(error){modalError(error);}
    });
    function print(){local.expanded=true;local.filter='all';render();window.print();}
    modal.addEventListener('close',()=>{if(!state.busy&&!state.loading)client.load(false);});
    return {supports:supported,active,render,notice,activity,modalUpdates,leave,restore,close,modal,local,command,finalTask,print};
  }
  global.LivePalmesDirectTerrain={create,supported};
})(window);
