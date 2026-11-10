(function (global) {
  'use strict';
  const ui=global.LivePalmesDirectPresentation||(typeof module==='object'?require('./presentation'):null);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function format(value) {
    if (value == null || !Number.isFinite(Number(value))) return '—';
    const n = Number(value), minutes = Math.floor(n / 6000);
    return `${minutes ? minutes + ':' : ''}${String(Math.floor(n % 6000 / 100)).padStart(minutes ? 2 : 1, '0')}.${String(n % 100).padStart(2, '0')}`;
  }
  const seed = row => row.seed?.status === 'no_reference' ? '—' : format(row.seed?.cs);
  const hasResult = row => row.result?.cs != null || Boolean(row.result?.status);
  const seedValue = row => row.seed?.status === 'no_reference' ? Infinity : row.seed?.cs ?? Infinity;
  const heats = entries => [...new Set(entries.map(row => row.series).filter(n => n != null))].sort((a, b) => a - b);
  const club = row => row.clubCode || row.clubAbbreviation || row.club || '—';
  const resultMode = (entries, event) => Boolean(event?.publication.results) && entries.some(hasResult);
  const phaseLabel=value=>['series','meilleure-serie'].includes(value)?'':value==='finale-A'?'Finale A':value==='finale-B'?'Finale B':String(value||'');
  function rankings(entries,rankingMode='scratch'){
    const rows=entries.map(row=>({...row,rank:null,categoryRank:null})),eligible=rows.filter(row=>row.result?.cs>0&&!row.result.status).sort((a,b)=>a.result.cs-b.result.cs),categories=new Map();
    let previous=null,rank=0,count=0,scratchRank=0,total=0;
    eligible.forEach(row=>{
      const classified=rankingMode!=='classified'||!['NS','IN','HC'].includes(row.participationStatus);
      if(row.result.cs!==previous){rank=count+1;scratchRank=total+1;}
      row.rank=classified?rank:scratchRank;previous=row.result.cs;total++;if(classified)count++;
      if(row.category){const category=categories.get(row.category)||{count:0,total:0,time:null,rank:0,scratchRank:0};if(category.time!==row.result.cs){category.rank=category.count+1;category.scratchRank=category.total+1;}category.time=row.result.cs;row.categoryRank=classified?category.rank:category.scratchRank;category.total++;if(classified)category.count++;categories.set(row.category,category);}
    });return rows;
  }
  const publicationStatus = (results,count,total) => `<span class="direct-publication-status" data-publication-status><strong>${results ? 'Résultats publiés' : 'Engagements'}</strong><span> · ${results ? count + '/' + total : 'Résultats non publiés'}</span></span>`;
  function scheduleFor(event, number) {
    return event.heatSchedule?.find(heat => Number(heat.number) === Number(number))?.scheduledAt || (Number(number) === 1 ? event.scheduledAt : '') || '';
  }
  function scratch(entries, state) {
    return (state.mode==='results'?rankings(entries,state.rankingMode):entries).filter(row => state.mode === 'results' ? hasResult(row) : row.series != null || row.seed?.raw)
      .filter(row => !state.categories.length || state.categories.includes(row.category))
      .slice().sort((a, b) => state.mode === 'results'
        ? (a.result.cs>0&&!a.result.status?a.result.cs:Infinity) - (b.result.cs>0&&!b.result.status?b.result.cs:Infinity)
        : seedValue(a) - seedValue(b) || Number(a.series || 0) - Number(b.series || 0) || Number(a.lane || 0) - Number(b.lane || 0));
  }
  function delta(row) {
    if (row.seed?.status === 'no_reference' || row.seed?.cs == null || row.delta == null) return '';
    const value=`${row.delta > 0 ? '+' : row.delta < 0 ? '−' : ''}${format(Math.abs(row.delta))}`;
    return `<span class="direct-delta ${row.delta < 0 ? 'faster' : row.delta > 0 ? 'slower' : ''}" title="Écart avec l’engagement : ${value}" aria-label="Écart avec l’engagement : ${value}">${value}</span>`;
  }
  function passageRow(row,splits,{id,columns,open,event}){
    return `<tr id="${id}" class="direct-split-row" ${open?'':'hidden'}><td colspan="${columns}">${ui.passageTable(row,event,splits)}</td></tr>`;
  }
  function participationBadge(row,extra=''){const labels={NS:'Nageurs étrangers non sélectionnables',IN:'Nageurs invités',HC:'Nageurs hors concours'},code=row.participationStatus;return labels[code]?`<button type="button" class="direct-participation-status ${extra}" data-participation-help aria-haspopup="dialog" aria-label="${code} — ${labels[code]} : signification des mentions" title="${labels[code]}">${code}</button>`:'';}
  function categoryCell(row,results){
    const badge=ui.categoryBadge(row.category);
    return row.category?`<button type="button" class="direct-category-filter" data-category-filter="${esc(row.category)}" aria-label="Filtrer la catégorie ${esc(row.category)}">${badge}</button>`:badge;
  }
  function table(entries, {results = false, heat = false, highlightClub = '',categoryPlaces=false,event,expandedSplits} = {}) {
    const jump = !heat && !results, columns = 5 + Number(results) + Number(jump),qualifications=results&&!heat&&entries.some(row=>['Q','QA','QB'].includes(row.qualification));
    return `<div class="direct-table-wrap" tabindex="0" aria-label="${heat ? 'Liste de la série' : 'Scratch'} · tableau défilable"><table class="direct-race-table ${results ? 'direct-results-table' : ''} ${qualifications?'direct-has-qualifications':''} ${results&&!heat&&entries.some(row=>row.participationStatus)?'direct-has-participation':''}"><thead><tr><th${results&&!heat?' aria-label="'+(categoryPlaces?'Place dans la catégorie':'Place scratch')+'" title="'+(categoryPlaces?'Place dans la catégorie':'Place scratch')+'"':''}>${heat ? 'L.' : results ? 'Pl.' : '#'}</th><th>${entries.some(row => row.kind === 'relay') ? 'Équipe' : 'Nageur'}</th><th>Club</th><th>Cat.</th><th class="direct-seed-cell"><abbr title="Temps d’engagement">Eng.</abbr></th>${results ? '<th>Résultat</th>' : ''}${jump ? '<th>S./L.</th>' : ''}</tr></thead><tbody>${entries.map((row, index) => {
      const splits=results&&hasResult(row)?ui.passageRows(row,event):[],id=`direct-splits-${heat?'heat':'scratch'}-${index}`,key=`${event.id}:${heat?'heat-'+row.series:'scratch'}:${row.key}`,open=Boolean(expandedSplits?.has(key)),result=ui.resultLabel(row)||format(row.result?.cs);
      const marker=qualifications?`<span class="direct-qualification ${row.qualification==='QB'?'final-b':''} ${!['Q','QA','QB'].includes(row.qualification)?'empty':''}" ${row.qualification?'title="Qualifié en finale '+(row.qualification==='QB'?'B':'A')+'"':'aria-hidden="true"'}>${esc(row.qualification||'Q')}</span>`:'';
      const number=`<span class="direct-result-number">${esc(result)}</span>`;
      const time=splits.length?`<button type="button" class="direct-split-toggle" data-splits="${id}" data-splits-key="${esc(key)}" aria-expanded="${open}" aria-controls="${id}" aria-label="${esc(result)} · Temps de passage de ${esc(ui.name(row))}">${number}<span class="direct-split-indicator" aria-hidden="true"></span></button>`:number;
      return `<tr class="direct-participant-row${highlightClub && row.club === highlightClub ? ' direct-team-row' : ''}"><td class="direct-position">${esc(heat ? row.lane ?? '—' : results ? (categoryPlaces ? row.categoryRank : row.rank) || '—' : seedValue(row) < Infinity ? index + 1 : '—')+(results&&!heat&&row.participationStatus?' '+participationBadge(row,'direct-position-status'):'')}</td><td class="direct-name-cell"><span class="direct-name-line"><button type="button" class="direct-person direct-person-button" data-person="${esc(row.key)}" title="Programme et résultats de ${esc(ui.name(row))}">${esc(ui.name(row))}</button>${!results||heat?participationBadge(row):''}</span></td><td class="direct-club-cell"><abbr title="${esc(row.clubLabel || row.club)}">${esc(club(row))}</abbr></td><td class="direct-category-cell">${categoryCell(row,results)}</td><td class="direct-time direct-seed-cell" ${row.seed?.status === 'no_reference' ? 'title="Sans référence"' : ''}>${esc(seed(row))}</td>${results ? `<td class="direct-time direct-result-cell"><span class="direct-result-line">${delta(row)}<span class="direct-result-value">${marker}${time}</span></span></td>` : ''}${jump ? `<td><button type="button" class="direct-heat-link" data-heat-jump="${esc(row.series)}" aria-label="Voir la série ${esc(row.series)}, ligne ${esc(row.lane ?? 'non précisée')}">${esc(row.series ?? '—')}/${esc(row.lane ?? '—')}<span aria-hidden="true"> ↓</span></button></td>` : ''}</tr>${splits.length?passageRow(row,splits,{id,columns,open,event}):''}`;
    }).join('') || `<tr><td colspan="${columns}" class="direct-empty">Aucune participation pour cette sélection.</td></tr>`}</tbody></table></div>`;
  }
  function render({data, event, state, records = []}) {
    const entries = data.entries, shown = scratch(entries, {...state,rankingMode:data.rankingMode}), series = heats(entries), results = state.mode === 'results';
    const selected = series.includes(Number(state.series)) ? Number(state.series) : series[0];
    const heatRows = entries.filter(row => row.series === selected).slice().sort((a, b) => Number(a.lane ?? 99) - Number(b.lane ?? 99));
    const heatResults = Boolean(event.publication.results) && heatRows.some(hasResult);
    const categories = [...new Set(entries.map(row => row.category).filter(Boolean))].sort();
    const scheduled = scheduleFor(event, selected), resultCount = entries.filter(hasResult).length;
    const multi=event.sourceEventIds?.length>1,selectedHeat=event.heatSchedule?.find(heat=>Number(heat.number)===selected),sessionFor=n=>event.heatSchedule?.find(heat=>Number(heat.number)===n);

    return `<article class="direct-card direct-event-card">${event.groupingWarning?`<p class="direct-grouping-note" role="status">${esc(event.groupingWarning)}</p>`:''}
      <header class="direct-event-head"><div class="direct-event-title"><h2>${esc(event.eventLabel)} <span>· ${{F:'Femmes',M:'Hommes',X:'Mixte'}[event.sex]}</span></h2>${ui.badge(event,entries)}</div><div class="direct-event-facts"><span>${esc(event.sessionLabel)}</span>${event.scheduledAt ? `<time class="direct-schedule">${esc(event.scheduledAt)}</time>` : ''}<span>${entries.length} ${entries.some(row => row.kind === 'relay') ? 'équipes' : 'engagés'}</span><span>${series.length} série${series.length > 1 ? 's' : ''}</span>${data.config.state === 'archived' ? '<span>Archive</span>' : ''}${records.length?'<details class="direct-records-disclosure"><summary>Records</summary><div class="direct-records">':''}${records.map(record => `<details><summary>${esc(record.recordType || 'MPF')} ${esc(record.categoryLabel || record.category)} · ${esc(record.time || record.rawTime)}</summary><p>${esc(record.swimmer)} · ${esc(record.club)}<br>${esc(record.date)} · ${esc(record.location)}</p></details>`).join('')}${records.length?'</div></details>':''}</div></header>
      <section class="direct-scratch" aria-labelledby="scratchTitle"><div class="direct-section-head"><h3 id="scratchTitle">${publicationStatus(results,resultCount,entries.length)}</h3>${`<div class="direct-category-tools"><details class="direct-filters"><summary aria-label="${state.categories.length?'Catégories sélectionnées : '+esc(state.categories.join(', ')):'Filtrer par catégorie'}">${state.categories.length===1?esc(state.categories[0]):state.categories.length?'Cat. · '+state.categories.length:'Catégories'}</summary><div class="direct-filter-panel"><p class="direct-note">Toutes les catégories si aucune n’est cochée. ${results?'Les places sont celles de chaque catégorie sélectionnée.':'Les séries restent complètes en dessous.'}</p>${categories.map(cat => `<label><input type="checkbox" name="category" value="${esc(cat)}" ${state.categories.includes(cat) ? 'checked' : ''}>${esc(cat)}</label>`).join('')}<button type="button" id="applyCategories">Appliquer</button></div></details>${state.categories.length?'<button type="button" class="direct-clear-categories" data-clear-categories aria-label="Retirer les filtres de catégorie et revenir au scratch" title="Retirer les filtres de catégorie"><span aria-hidden="true">×</span></button>':''}</div>`}</div>${table(shown, {results,highlightClub:state.highlightClub,categoryPlaces:results&&state.categories.length>0,event,expandedSplits:state.expandedSplits})}</section>
      ${series.length ? `<section class="direct-heat-section" id="eventHeats" aria-labelledby="heatTitle"><nav class="direct-nav direct-heat-nav" aria-label="Série">${series.map(n => `<button type="button" data-heat="${n}" aria-pressed="${n === selected}" aria-controls="heatTable" ${multi?`aria-label="${esc(sessionFor(n)?.sessionLabel)} · Série ${n} · ${esc(scheduleFor(event,n))}"`: ''}>Série ${n}${multi?`<span class="direct-heat-session"> · S${esc(sessionFor(n)?.sessionKey)}</span>`:''}${scheduleFor(event,n) ? `<time>${esc(scheduleFor(event,n))}</time>` : ''}</button>`).join('')}</nav><div class="direct-section-head"><h3 id="heatTitle">Série ${esc(selected)}${multi?` · ${esc(selectedHeat?.sessionLabel)}`:''}${scheduled ? ` <time class="direct-schedule">${esc(scheduled)}</time>` : ''}</h3>${publicationStatus(heatResults,heatRows.filter(hasResult).length,heatRows.length)}</div><div id="heatTable">${table(heatRows, {results:heatResults,heat:true,highlightClub:state.highlightClub,event,expandedSplits:state.expandedSplits})}</div></section>` : ''}
    </article>`;
  }
  global.LivePalmesDirectEventView = {render,scratch,rankings,heats,hasResult,resultMode,scheduleFor,format,seed,club,delta,esc,phaseLabel,participationBadge};
})(window);
