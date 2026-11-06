(function(global){
  'use strict';
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const surname=row=>row.kind==='relay'||row.relay?String(row.lastName||''):String(row.lastName||'').toLocaleUpperCase('fr-FR');
  const name=row=>[surname(row),row.firstName].filter(Boolean).join(' ');
  const resultLabel=row=>({dns:'Forfait',ab:'ABD',dsq:'DSQ'}[String(row.result?.status||'').toLowerCase()]||row.result?.status||'');
  const hasResult=row=>row.result?.cs!=null||Boolean(row.result?.status);
  function stats(event,entries){
    if(event.progress)return {...event.progress};
    if(!entries)return {entries:0,seriesEntries:0,resultEntries:event.publication?.results?1:0,matchedResults:0,seriesCount:0,resultSeriesCount:0,completeSeriesCount:0,unassignedResults:0};
    const series=entries.filter(row=>row.series!=null||row.seed?.raw),results=entries.filter(hasResult),heats=new Map();
    for(const row of series){if(row.series==null)continue;if(!heats.has(row.series))heats.set(row.series,[]);heats.get(row.series).push(row);}
    const matched=series.filter(hasResult).length;
    return {entries:entries.length,seriesEntries:series.length,resultEntries:results.length,matchedResults:matched,seriesCount:heats.size,resultSeriesCount:new Set(results.map(row=>row.series).filter(n=>n!=null)).size,completeSeriesCount:[...heats.values()].filter(rows=>rows.every(hasResult)).length,unassignedResults:results.length-matched};
  }
  function expected(event,progress){return Math.max(Number(event.expectedSeries)||0,...(event.heatSchedule||[]).map(heat=>Number(heat.number)||0),Number(progress.seriesCount)||0);}
  function status(event,entries){
    const progress=stats(event,entries),results=event.publication?.results?progress.resultEntries:0,total=expected(event,progress);
    if(!results)return {key:'upcoming',label:'À venir',title:'Aucun résultat publié pour cette course'};
    if(event.publication?.series&&progress.seriesEntries>0&&progress.matchedResults===progress.seriesEntries&&!progress.unassignedResults&&total>0&&progress.seriesCount>=total&&progress.completeSeriesCount>=total)return {key:'complete',label:'Terminée',title:'Tous les résultats des séries importées sont publiés'};
    return {key:'ongoing',label:'En cours',title:'Résultats partiels · classement provisoire'};
  }
  function badge(event,entries){const value=status(event,entries);return `<span class="direct-race-status direct-race-${value.key}" title="${esc(value.title)}">${value.label}</span>`;}
  function dot(event){const value=status(event);return `<span class="direct-race-dot direct-race-${value.key}" aria-hidden="true"></span>`;}
  function distance(code,index){const relay=String(code||'').match(/^\d+x(\d+)/i);return relay?Number(relay[1])*(index+1):[100,200,400,800,1500][index]||null;}
  function length(code){const relay=String(code||'').match(/^(\d+)x(\d+)/i);return relay?Number(relay[1])*Number(relay[2]):Number(String(code||'').match(/^\d+/)?.[0])||null;}
  function splits(row,event){
    const total=length(event.eventCode);
    return (row.splits||[]).flatMap((split,index)=>{
      if(!split.time||/^(?:00:)?00:00\.00$/.test(split.time))return [];
      const oldIndex=String(split.distance||'').match(/^Passage\s+(\d+)$/i),generic=!split.distance||Boolean(oldIndex),metres=generic?distance(event.eventCode,oldIndex?Number(oldIndex[1])-1:index):Number(String(split.distance).match(/^(\d+)\s*m?$/i)?.[1]);
      if(metres&&total&&metres>=total)return [];
      return [{...split,distance:metres?metres+' m':split.distance||'Passage '+(index+1)}];
    });
  }
  const api={esc,surname,name,resultLabel,stats,expected,status,badge,dot,distance,length,splits};
  global.LivePalmesDirectPresentation=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window==='undefined'?globalThis:window);
