(function(global){
  'use strict';
  const ui=global.LivePalmesDirectPresentation,esc=ui.esc;
  let current=null,session='all';
  const expanded=new Set();
  function progress(data){
    if(!current?.isConnected)return;
    current.querySelectorAll('[data-progress-event]').forEach(node=>{if(node.open)expanded.add(node.dataset.progressEvent);else expanded.delete(node.dataset.progressEvent);});
    const events=data.events||[],sessions=global.LivePalmesDirectSessions;
    if(session!=='all'&&!sessions.options(events).some(s=>s.key===session))session='all';
    const visible=events.filter(e=>sessions.matches(e,session)),rows=visible.map(e=>({event:e,stats:ui.stats(e,e.id===data.selectedEventId?data.entries:undefined)}));
    const state=row=>!row.stats.seriesEntries?'Non importée':ui.status(row.event,row.event.id===data.selectedEventId?data.entries:undefined).label;
    const label=row=>{const value=state(row);return /termin/i.test(value)?'Terminée':/cours/i.test(value)?'En cours':value==='Non importée'?value:'À venir';};
    current.querySelector('[data-bureau-progress]').innerHTML=`<header class="bureau-monitor-head"><h2>Suivi des courses</h2>${sessions.filter(events,session,'data-monitor-session')}</header><div class="bureau-progress-summary">${rows.filter(r=>label(r)==='Terminée').length} terminées · ${rows.filter(r=>label(r)==='En cours').length} en cours <span>${visible.length} épreuves importées</span></div><div class="bureau-course-columns" aria-hidden="true"><span>Heure</span><span>Course</span><span>Résultats reçus</span><span>État</span></div><div class="bureau-program-list">${rows.map(row=>{const e=row.event,s=row.stats,value=label(row);return `<details class="bureau-course-detail" data-progress-event="${esc(e.id)}" ${expanded.has(e.id)?'open':''}><summary class="bureau-course-row ${value==='En cours'?'current':''}"><time>${esc(e.scheduledAt||'—')}</time><strong>${esc(e.eventLabel)} · ${{F:'F',M:'H',X:'Mixte'}[e.sex]}${e.phase!=='series'?' · '+esc(e.phase):''}</strong><span class="bureau-course-count">${s.completeSeriesCount} / ${ui.expected(e,s)||'—'} séries<span>${s.resultEntries} / ${s.seriesEntries||'—'} résultats</span></span><span class="bureau-course-state ${value==='Terminée'?'done':value==='En cours'?'ongoing':''}">${value}</span></summary>${ui.heatProgress(e,s)}</details>`;}).join('')||'<p class="bureau-empty">Importer les séries pour afficher le programme.</p>'}</div>`;
    current.querySelector('[data-monitor-session]')?.addEventListener('change',e=>{session=e.target.value;progress(data);});
  }
  function mount({workspace,data,archiveCorrection=false}){
    current=null;expanded.clear();if(!data.config||data.config.state!=='active'&&!(data.config.state==='archived'&&archiveCorrection))return;
    let operations=workspace.querySelector('.direct-bureau-operations');const watch=workspace.querySelector('.direct-watch');if(!watch)return;
    if(!operations&&archiveCorrection){
      operations=document.createElement('section');operations.className='direct-bureau-operations';
      operations.innerHTML='<nav class="bureau-tabs" aria-label="Mise à jour de l’archive"><button type="button" data-archive-tab="follow">Suivi</button><button type="button" data-archive-tab="imports">Imports</button><button type="button" data-archive-tab="history">Historique</button></nav>';
      workspace.append(operations);
    }
    if(!operations)return;
    const root=document.createElement('div');root.className='bureau-layout';root.innerHTML='<div class="bureau-main"></div><aside class="bureau-monitor" aria-label="Publication des résultats et suivi des courses"><section class="direct-card bureau-program" data-bureau-progress></section></aside>';
    workspace.append(root);const main=root.querySelector('.bureau-main'),side=root.querySelector('.bureau-monitor'),preparation=workspace.querySelector('.direct-preparation');if(preparation)main.append(preparation);main.append(operations);side.prepend(watch);
    workspace.querySelectorAll('#directImportSummary,#directPdfImports,.direct-documents,[data-bureau-access],[data-bureau-publications]').forEach(node=>{if(!node.closest('.direct-preparation'))main.append(node);});
    current=root;mode(archiveCorrection||data.config.consoles.length===1);progress(data);
    if(archiveCorrection){
      const show=name=>{if(name==='imports'){const preparation=workspace.querySelector('.direct-preparation');if(preparation)preparation.open=true;}operations.querySelectorAll('[data-archive-tab]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.archiveTab===name)));workspace.querySelectorAll('#directImportSummary,#directPdfImports,.direct-documents').forEach(panel=>panel.hidden=name!=='imports');workspace.querySelectorAll('[data-bureau-publications]').forEach(panel=>panel.hidden=name!=='history');tab(name);};
      operations.querySelectorAll('[data-archive-tab]').forEach(button=>button.onclick=()=>show(button.dataset.archiveTab));
      workspace.querySelector('#openSeriesImport')?.addEventListener('click',()=>show('imports'));
      show('follow');
    }
  }
  function mode(solo){if(!current)return;current.classList.toggle('bureau-only',solo);}
  function tab(name){if(!current)return;current.dataset.tab=name;current.querySelector('.bureau-monitor').hidden=current.classList.contains('bureau-only')&&name!=='follow'&&!current.querySelector('.direct-preparation')?.open;}
  global.LivePalmesDirectBureauLayout={mount,progress,mode,tab};
})(window);
