(function(global){
  'use strict';
  const ui=global.LivePalmesDirectPresentation,view=global.LivePalmesDirectEventView;
  const {esc,seed,format,delta,scheduleFor,phaseLabel,participationBadge}=view;
  function shortLabel(event){
    const match=String(event.eventCode||'').match(/^(\d+(?:x\d+)?)([a-z]+)$/i);
    return match?match[1].replace(/x/i,'×')+' '+({BP:'BI'}[match[2].toUpperCase()]||match[2].toUpperCase()):event.eventLabel;
  }
  function table(rows,{scope='person',group='0'}={}){
    return '<table class="'+(scope==='club'?'direct-club-table ':'')+'direct-program-table"><thead><tr><th scope="col">Épreuve</th><th scope="col"><abbr title="Temps d’engagement">Eng.</abbr></th><th scope="col">Résultat</th><th scope="col"><abbr title="Place dans la compétition">Pl.</abbr></th><th scope="col"><span class="direct-sr-only">Détails</span></th></tr></thead><tbody>'+rows.map(({row,event},index)=>{
      const time=scheduleFor(event,row.series),phase=phaseLabel(event.phase),full=[event.eventLabel,phase].filter(Boolean).join(' · '),short=[shortLabel(event),phase==='Finale A'?'FA':phase==='Finale B'?'FB':phase].filter(Boolean).join(' · ');
      const meta=[event.sessionLabel,time,row.series!=null?'Série '+row.series:'',row.lane!=null?'Ligne '+row.lane:''].filter(Boolean).join(' · '),id='program-detail-'+scope+'-'+group+'-'+index;
      const result=view.hasResult(row)?ui.resultLabel(row)||format(row.result?.cs):'—';
      return '<tr class="direct-program-row"><td><div class="direct-program-course"><button type="button" data-'+scope+'-event="'+esc(event.id)+'" data-'+scope+'-series="'+esc(row.series??'')+'" class="direct-program-event" title="'+esc(full+' · '+meta)+'"><span class="direct-program-full">'+esc(full)+'</span><span class="direct-program-short" aria-hidden="true">'+esc(short)+'</span></button>'+(time?'<time class="direct-program-slot">'+esc(time)+'</time>':'')+'</div></td><td class="direct-time direct-program-seed" title="'+(row.seed?.status==='no_reference'?'Sans référence':'Temps d’engagement')+'">'+esc(seed(row))+'</td><td class="direct-time direct-program-times"><span class="direct-program-result"'+(!view.hasResult(row)?' title="Résultat non publié"':'')+'>'+esc(result)+'</span>'+(view.hasResult(row)&&!row.result?.status?delta(row):'')+'</td><td class="direct-time direct-program-place">'+(row.rank?'<span class="direct-sr-only">Place </span>'+esc(row.rank):'—')+participationBadge(row)+'</td><td><button type="button" class="direct-program-toggle" data-program-detail="'+esc(id)+'" aria-controls="'+esc(id)+'" aria-expanded="false" aria-label="Détails de '+esc(full)+' : '+esc(meta)+'"><span aria-hidden="true">⌄</span></button></td></tr><tr class="direct-program-detail-row" id="'+esc(id)+'" hidden><td colspan="5"><p class="direct-program-meta">'+esc(meta)+'</p>'+(row.members?.length?'<p class="direct-program-members"><strong>Relayeurs</strong> · '+row.members.map(member=>esc(ui.name(member))+ui.birthYear(member)).join(' · ')+'</p>':'')+(ui.splits(row,event).length?ui.passageTable(row,event):'')+'</td></tr>';
    }).join('')+'</tbody></table>';
  }
  global.LivePalmesDirectProgramView={shortLabel,table};
})(window);
