(function(global){
  'use strict';
  const ui=global.LivePalmesDirectPresentation,esc=ui.esc;
  let current=null,session='all';
  function progress(data){
    if(!current?.isConnected)return;
    const events=data.events||[],sessions=global.LivePalmesDirectSessions;
    if(session!=='all'&&!sessions.options(events).some(s=>s.key===session))session='all';
    const visible=events.filter(e=>sessions.matches(e,session)),rows=visible.map(e=>({event:e,stats:ui.stats(e,e.id===data.selectedEventId?data.entries:undefined)}));
    const state=row=>!row.stats.seriesEntries?'Non importée':ui.status(row.event,row.event.id===data.selectedEventId?data.entries:undefined).label;
    const label=row=>{const value=state(row);return /termin/i.test(value)?'Terminée':/cours/i.test(value)?'En cours':value==='Non importée'?value:'À venir';};
    current.querySelector('[data-bureau-progress]').innerHTML=`<header class="bureau-monitor-head"><h2>Suivi des courses</h2>${sessions.filter(events,session,'data-monitor-session')}</header><div class="bureau-progress-summary">${rows.filter(r=>label(r)==='Terminée').length} terminées · ${rows.filter(r=>label(r)==='En cours').length} en cours <span>${visible.length} épreuves importées</span></div><div class="bureau-course-columns" aria-hidden="true"><span>Heure</span><span>Course</span><span>Résultats reçus</span><span>État</span></div><div class="bureau-program-list">${rows.map(row=>{const e=row.event,s=row.stats,value=label(row);return `<div class="bureau-course-row ${value==='En cours'?'current':''}"><time>${esc(e.scheduledAt||'—')}</time><strong>${esc(e.eventLabel)} · ${{F:'F',M:'H',X:'Mixte'}[e.sex]}${e.phase!=='series'?' · '+esc(e.phase):''}</strong><span class="bureau-course-count">${s.completeSeriesCount} / ${ui.expected(e,s)||'—'} séries<span>${s.resultEntries} / ${s.seriesEntries||'—'} résultats</span></span><span class="bureau-course-state ${value==='Terminée'?'done':value==='En cours'?'ongoing':''}">${value}</span></div>`;}).join('')||'<p class="bureau-empty">Importer les séries pour afficher le programme.</p>'}</div>`;
    current.querySelector('[data-monitor-session]')?.addEventListener('change',e=>{session=e.target.value;progress(data);});
  }
  function mount({workspace,data}){
    current=null;if(!data.config||data.config.state!=='active')return;
    const operations=workspace.querySelector('.direct-bureau-operations'),watch=workspace.querySelector('.direct-watch');if(!operations||!watch)return;
    const root=document.createElement('div');root.className='bureau-layout';root.innerHTML='<div class="bureau-main"></div><aside class="bureau-monitor" aria-label="Publication des résultats et suivi des courses"><section class="direct-card bureau-program" data-bureau-progress></section></aside>';
    workspace.append(root);const main=root.querySelector('.bureau-main'),side=root.querySelector('.bureau-monitor');main.append(operations);side.prepend(watch);
    workspace.querySelectorAll('#directImportSummary,#directPdfImports,.direct-documents,[data-bureau-access],[data-bureau-publications]').forEach(node=>main.append(node));
    current=root;mode(data.config.consoles.length===1);progress(data);
  }
  function mode(solo){if(!current)return;current.classList.toggle('bureau-only',solo);}
  function tab(name){if(!current)return;current.dataset.tab=name;current.querySelector('.bureau-monitor').hidden=current.classList.contains('bureau-only')&&name!=='follow';}
  global.LivePalmesDirectBureauLayout={mount,progress,mode,tab};
})(window);
