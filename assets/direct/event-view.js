(function (global) {
  'use strict';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function format(value) {
    if (value == null || !Number.isFinite(Number(value))) return '—';
    const n = Number(value), minutes = Math.floor(n / 6000);
    return `${minutes ? minutes + ':' : ''}${String(Math.floor(n % 6000 / 100)).padStart(minutes ? 2 : 1, '0')}.${String(n % 100).padStart(2, '0')}`;
  }
  const seed = row => row.seed?.status === 'no_reference' ? 'SR' : format(row.seed?.cs);
  const hasResult = row => row.result?.cs != null || Boolean(row.result?.status);
  const seedValue = row => row.seed?.status === 'no_reference' ? Infinity : row.seed?.cs ?? Infinity;
  const heats = entries => [...new Set(entries.map(row => row.series).filter(n => n != null))].sort((a, b) => a - b);
  const club = row => row.clubCode || row.clubAbbreviation || row.club || '—';
  const resultMode = (entries, event) => Boolean(event?.publication.results) && entries.some(hasResult);
  const publicationStatus = (results,count,total) => `<span class="direct-publication-status" data-publication-status><strong>${results ? 'Résultats publiés' : 'Engagements'}</strong><span> · ${results ? count + '/' + total : 'Résultats non publiés'}</span></span>`;
  function scheduleFor(event, number) {
    return event.heatSchedule?.find(heat => Number(heat.number) === Number(number))?.scheduledAt || (Number(number) === 1 ? event.scheduledAt : '') || '';
  }
  function scratch(entries, state) {
    return entries.filter(row => state.mode === 'results' ? hasResult(row) : row.series != null || row.seed?.raw)
      .filter(row => state.mode !== 'results' || !state.categories.length || state.categories.includes(row.category))
      .slice().sort((a, b) => state.mode === 'results'
        ? (Number(a.rank) || Infinity) - (Number(b.rank) || Infinity) || (a.result.cs ?? Infinity) - (b.result.cs ?? Infinity)
        : seedValue(a) - seedValue(b) || Number(a.series || 0) - Number(b.series || 0) || Number(a.lane || 0) - Number(b.lane || 0));
  }
  function delta(row) {
    if (row.seed?.status === 'no_reference' || row.seed?.cs == null || row.delta == null) return '';
    return `<span class="direct-delta ${row.delta < 0 ? 'faster' : row.delta > 0 ? 'slower' : ''}">${row.delta > 0 ? '+' : row.delta < 0 ? '−' : ''}${format(Math.abs(row.delta))}</span>`;
  }
  function table(entries, {results = false, heat = false, highlightClub = ''} = {}) {
    const jump = !heat && !results, columns = 5 + Number(results) + Number(jump);
    return `<div class="direct-table-wrap" tabindex="0" aria-label="${heat ? 'Liste de la série' : 'Scratch'} · tableau défilable"><table class="direct-race-table ${results ? 'direct-results-table' : ''}"><thead><tr><th>${heat ? 'L.' : results ? 'Pl.' : '#'}</th><th>${entries.some(row => row.kind === 'relay') ? 'Équipe' : 'Nageur'}</th><th>Club</th><th>Cat.</th><th class="direct-seed-cell"><abbr title="Temps d’engagement">Eng.</abbr></th>${results ? '<th>Résultat</th>' : ''}${jump ? '<th>S./L.</th>' : ''}</tr></thead><tbody>${entries.map((row, index) => `<tr ${highlightClub && row.club === highlightClub ? 'class="direct-team-row"' : ''}><td class="direct-position">${esc(heat ? row.lane ?? '—' : results ? row.rank || '—' : seedValue(row) < Infinity ? index + 1 : '—')}</td><td class="direct-name-cell"><button type="button" class="direct-person direct-person-button" data-person="${esc(row.key)}" title="Programme et résultats de ${esc(row.lastName)} ${esc(row.firstName)}">${esc(row.lastName)} ${esc(row.firstName)}</button></td><td class="direct-club-cell"><abbr title="${esc(row.clubLabel || row.club)}">${esc(club(row))}</abbr></td><td class="direct-category-cell">${esc(row.category || '—')}</td><td class="direct-time direct-seed-cell" ${row.seed?.status === 'no_reference' ? 'title="Sans référence"' : ''}>${esc(seed(row))}</td>${results ? `<td class="direct-time direct-result-cell">${esc(row.result?.status || format(row.result?.cs))}${delta(row)}</td>` : ''}${jump ? `<td><button type="button" class="direct-heat-link" data-heat-jump="${esc(row.series)}" aria-label="Voir la série ${esc(row.series)}, ligne ${esc(row.lane ?? 'non précisée')}">${esc(row.series ?? '—')}/${esc(row.lane ?? '—')}<span aria-hidden="true"> ↓</span></button></td>` : ''}</tr>`).join('') || `<tr><td colspan="${columns}" class="direct-empty">Aucune participation pour cette sélection.</td></tr>`}</tbody></table></div>`;
  }
  function render({data, event, state, records = []}) {
    const entries = data.entries, shown = scratch(entries, state), series = heats(entries), results = state.mode === 'results';
    const selected = series.includes(Number(state.series)) ? Number(state.series) : series[0];
    const heatRows = entries.filter(row => row.series === selected).slice().sort((a, b) => Number(a.lane ?? 99) - Number(b.lane ?? 99));
    const heatResults = Boolean(event.publication.results) && heatRows.some(hasResult);
    const categories = [...new Set(entries.map(row => row.category).filter(Boolean))].sort();
    const scheduled = scheduleFor(event, selected), resultCount = entries.filter(hasResult).length;
    return `<article class="direct-card direct-event-card">
      <header class="direct-event-head"><h2>${esc(event.eventLabel)} <span>· ${{F:'Femmes',M:'Hommes',X:'Mixte'}[event.sex]}</span></h2><p class="direct-event-facts"><span>${esc(event.sessionLabel)}</span>${event.scheduledAt ? `<time class="direct-schedule">${esc(event.scheduledAt)}</time>` : ''}<span>${entries.length} ${entries.some(row => row.kind === 'relay') ? 'équipes' : 'engagés'}</span><span>${series.length} série${series.length > 1 ? 's' : ''}</span>${data.config.state === 'archived' ? '<span>Archive</span>' : ''}</p><div class="direct-records">${records.map(record => `<details><summary>${esc(record.recordType || 'MPF')} ${esc(record.categoryLabel || record.category)} · ${esc(record.time || record.rawTime)}</summary><p>${esc(record.swimmer)} · ${esc(record.club)}<br>${esc(record.date)} · ${esc(record.location)}</p></details>`).join('')}</div></header>
      <section class="direct-scratch" aria-labelledby="scratchTitle"><div class="direct-section-head"><h3 id="scratchTitle">${publicationStatus(results,resultCount,entries.length)}</h3>${results ? `<details class="direct-filters"><summary>Catégories${state.categories.length ? ' · ' + state.categories.length : ''}</summary><div class="direct-filter-panel"><p class="direct-note">Toutes les catégories si aucune n’est cochée. Les places publiées sont conservées.</p>${categories.map(cat => `<label><input type="checkbox" name="category" value="${esc(cat)}" ${state.categories.includes(cat) ? 'checked' : ''}>${esc(cat)}</label>`).join('')}<button type="button" id="applyCategories">Appliquer</button></div></details>` : ''}</div>${table(shown, {results,highlightClub:state.highlightClub})}</section>
      ${series.length ? `<section class="direct-heat-section" id="eventHeats" aria-labelledby="heatTitle"><nav class="direct-nav direct-heat-nav" aria-label="Série">${series.map(n => `<button type="button" data-heat="${n}" aria-pressed="${n === selected}" aria-controls="heatTable">Série ${n}${scheduleFor(event,n) ? `<time>${esc(scheduleFor(event,n))}</time>` : ''}</button>`).join('')}</nav><div class="direct-section-head"><h3 id="heatTitle">Série ${esc(selected)}${scheduled ? ` <time class="direct-schedule">${esc(scheduled)}</time>` : ''}</h3>${publicationStatus(heatResults,heatRows.filter(hasResult).length,heatRows.length)}</div><div id="heatTable">${table(heatRows, {results:heatResults,heat:true,highlightClub:state.highlightClub})}</div></section>` : ''}
    </article>`;
  }
  global.LivePalmesDirectEventView = {render,scratch,heats,hasResult,resultMode,scheduleFor,format,seed,club,delta,esc};
})(window);
