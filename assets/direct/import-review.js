(function (global) {
  'use strict';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const sexes = {F:'Femmes', M:'Hommes', X:'Mixte'};
  const isRelay = (row, event) => row.relay === true || /^\d+\s*[x×]\s*\d+/i.test(event.eventCode || '');
  function rowIssue(row, event) {
    if (!row.lastName || !row.club) return 'Nom ou club manquant';
    if (!isRelay(row, event) && (!Number.isInteger(Number(row.birthYear)) || Number(row.birthYear) < 1900 || Number(row.birthYear) > 2100)) return 'Année de naissance manquante ou invalide';
    return '';
  }
  function payload(group) {
    return {kind:group.kind, event:{...group.event}, seriesNumber:group.seriesNumber ?? null, source:group.source,
      operationKey:group.operationKey, batchId:group.operationKey,
      rows:group.rows.filter(row => row.selected).map(({selected, ...row}) => ({...row, relay:isRelay(row, group.event), ...(group.seriesNumber != null ? {series:Number(group.seriesNumber)} : {})}))};
  }
  function mount(host, groups, actions) {
    let receipt = null, busy = false, message = '', error = false;
    const open = new Set(), advanced = new Set();
    groups.forEach(group => {if (!group.error && group.selected == null) group.selected = true;});
    const available = () => groups.filter(group => !group.error && !group.published);
    const selected = () => available().filter(group => group.selected);
    const count = list => list.reduce((n, group) => n + group.rows.filter(row => row.selected).length, 0);
    function invalidate(group) {if(group)group.operationKey=crypto.randomUUID();receipt = null; message = 'Sélection modifiée. Vérifier de nouveau avant de publier.'; error = false;}
    function render() {
      const chosen = selected(), total = count(chosen), all = available();
      host.innerHTML = `<div class="direct-import-head"><div><h3>Épreuves à publier</h3><p class="direct-note">${all.length} épreuve${all.length > 1 ? 's' : ''} détectée${all.length > 1 ? 's' : ''} · détails repliés pour un contrôle rapide.</p></div><label class="direct-check-label"><input type="checkbox" data-select-all ${all.length && chosen.length === all.length ? 'checked' : ''} ${!all.length ? 'disabled' : ''}>Tout sélectionner</label></div>
        <div class="direct-import-list">${groups.map((group, index) => {
          if (group.error) return `<div class="direct-import-error" role="alert">${esc(group.error)}</div>`;
          const rows = group.rows.filter(row => row.selected), excluded = group.rows.length - rows.length;
          const issues = rows.filter(row => rowIssue(row, group.event));
          const series = new Set(rows.map(row => row.series).filter(n => n != null));
          return `<div class="direct-import-item ${group.published ? 'is-published' : ''}" data-group="${index}"><label class="direct-group-check"><input type="checkbox" data-select-group="${index}" aria-label="Sélectionner ${esc(group.event.eventLabel || group.event.eventCode)} ${esc(sexes[group.event.sex])}" ${group.selected ? 'checked' : ''} ${group.published ? 'disabled' : ''}></label><details data-details="${index}" ${open.has(index) ? 'open' : ''}><summary><span class="direct-import-course"><strong>${esc(group.event.eventLabel || group.event.eventCode)}</strong><span class="direct-person-meta">${esc(sexes[group.event.sex])} · ${esc(group.event.sessionLabel || 'Session ' + group.event.sessionKey)}${group.seriesNumber ? ' · Série ' + esc(group.seriesNumber) : ''}</span></span><span class="direct-import-count">${rows.length} ligne${rows.length > 1 ? 's' : ''}<small>${series.size} série${series.size > 1 ? 's' : ''}</small></span><span class="direct-import-state ${issues.length || excluded ? 'attention' : ''}">${group.published ? 'Publié' : issues.length ? issues.length + ' à corriger' : !group.selected ? 'Non sélectionné' : receipt ? 'Vérifié' : excluded ? excluded + ' exclue' + (excluded > 1 ? 's' : '') : 'Prêt à vérifier'}</span><span class="direct-detail-hint">Détails</span></summary>
          <div class="direct-import-detail"><p class="direct-note direct-source">${esc(group.source?.name)} · ${esc(group.event.date)} · ${esc(group.kind === 'series' ? 'Séries' : 'Résultats')}</p>
          <details class="direct-import-advanced" data-advanced="${index}" ${advanced.has(index) ? 'open' : ''}><summary>Paramètres de l’épreuve</summary><div class="direct-grid">${[['eventCode','Code de l’épreuve'],['eventLabel','Intitulé'],['date','Date'],['sessionKey','Session'],['sessionLabel','Intitulé de session'],['order','Ordre au programme'],['phase','Phase']].map(([key, label]) => `<label>${label}<input data-field="${key}" type="${key === 'date' ? 'date' : key === 'order' ? 'number' : 'text'}" value="${esc(group.event[key])}" ${group.published ? 'disabled' : ''}></label>`).join('')}<label>Sexe<select data-field="sex" ${group.published ? 'disabled' : ''}>${Object.entries(sexes).map(([key,label]) => `<option value="${key}" ${key === group.event.sex ? 'selected' : ''}>${label}</option>`).join('')}</select></label><label>Numéro de série seul<input data-series-scope type="number" min="1" max="1000" placeholder="Vide : épreuve complète" value="${esc(group.seriesNumber || '')}" ${group.published ? 'disabled' : ''}></label></div></details>
          <div class="direct-table-wrap"><table><thead><tr><th>Inclure</th><th>Nageur / équipe</th><th>Club / cat.</th><th>${group.kind === 'series' ? 'Engagement' : 'Résultat'}</th></tr></thead><tbody>${group.rows.map((row, rowIndex) => `<tr><td><input type="checkbox" data-row="${rowIndex}" aria-label="Inclure ${esc(row.lastName)} ${esc(row.firstName)}" ${row.selected ? 'checked' : ''} ${group.published ? 'disabled' : ''}></td><td><span class="direct-person">${esc(row.lastName)} ${esc(row.firstName)}</span><span class="direct-person-meta ${rowIssue(row, group.event) ? 'direct-row-error' : ''}">${isRelay(row, group.event) ? 'Relais · année non requise' : esc(row.birthYear || 'Année manquante')}${rowIssue(row, group.event) && row.birthYear ? ' · ' + esc(rowIssue(row, group.event)) : ''}</span></td><td>${esc(row.club)}<span class="direct-person-meta">${esc(row.category)}</span></td><td class="direct-time">${esc(row.entryTime || row.resultTime || row.resultStatus || '—')}<span class="direct-person-meta">S${esc(row.series || '—')} · L${esc(row.lane ?? '—')}</span></td></tr>`).join('')}</tbody></table></div></div></details></div>`;
        }).join('')}</div>
        <div class="direct-batch-actions"><div><strong>${chosen.length} épreuve${chosen.length > 1 ? 's' : ''} sélectionnée${chosen.length > 1 ? 's' : ''}</strong><span class="direct-person-meta">${total} participation${total > 1 ? 's' : ''} à publier</span></div><div class="direct-actions"><button type="button" class="secondary" data-batch-verify ${!chosen.length || busy ? 'disabled' : ''}>Vérifier la sélection</button><button type="button" data-batch-publish ${!receipt || busy ? 'disabled' : ''}>Tout publier${chosen.length ? ' (' + chosen.length + ')' : ''}</button></div><p data-batch-message role="status" aria-live="polite" class="direct-status ${error ? 'error' : ''}">${esc(message || 'Un seul contrôle pour toutes les épreuves sélectionnées.')}</p></div>`;
      const selectAll = host.querySelector('[data-select-all]');
      selectAll.indeterminate = chosen.length > 0 && chosen.length < all.length;
      selectAll.onchange = e => {all.forEach(group => group.selected = e.target.checked); invalidate(); render();};
      host.querySelectorAll('[data-group]').forEach(section => {
        const index = Number(section.dataset.group), group = groups[index];
        section.querySelector('[data-select-group]').onchange = e => {group.selected = e.target.checked; invalidate(); render();};
        section.querySelector('[data-details]').ontoggle = e => {if (e.target.open) open.add(index); else open.delete(index);};
        section.querySelector('[data-advanced]').ontoggle = e => {if (e.target.open) advanced.add(index); else advanced.delete(index);};
        section.querySelectorAll('[data-row]').forEach(input => input.onchange = e => {group.rows[Number(input.dataset.row)].selected = e.target.checked; invalidate(group); render();});
        section.querySelectorAll('[data-field]').forEach(input => input.onchange = e => {group.event[input.dataset.field] = e.target.value; invalidate(group); render();});
        section.querySelector('[data-series-scope]').onchange = e => {group.seriesNumber = e.target.value ? Number(e.target.value) : null; invalidate(group); render();};
      });
      host.querySelector('[data-batch-verify]').onclick = () => run(async () => {
        const list = selected();
        for (const group of list) {
          if (!group.rows.some(row => row.selected)) throw Error(`${group.event.eventLabel} : sélectionner au moins une ligne ou décocher cette épreuve.`);
          const invalid = group.rows.find(row => row.selected && rowIssue(row, group.event));
          if (invalid) {open.add(groups.indexOf(group)); throw Error(`${group.event.eventLabel} · ${invalid.lastName} : ${rowIssue(invalid, group.event)}.`);}
        }
        receipt = await actions.verify(list.map(payload));
        message = `${list.length} épreuve${list.length > 1 ? 's' : ''} et ${count(list)} participations vérifiées.${receipt.replacements?.length ? ' ' + receipt.replacements.length + ' remplacement(s) à confirmer.' : ' Vous pouvez tout publier.'}`;
      });
      host.querySelector('[data-batch-publish]').onclick = () => {
        if (!receipt) return;
        if (receipt.replacements?.length && !global.confirm(`Remplacer les publications existantes suivantes ?\n${receipt.replacements.map(label => '• ' + label).join('\n')}\nLes autres publications seront conservées.`)) return;
        run(async () => {
          const list = selected(), total = count(list);
          await actions.publish(list.map(payload), receipt);
          list.forEach(group => {group.published = true; group.selected = false;}); receipt = null;
          message = `${list.length} épreuve${list.length > 1 ? 's' : ''} publiée${list.length > 1 ? 's' : ''} · ${total} participations. Le public peut actualiser la page.`;
        });
      };
      if (busy) host.querySelectorAll('button,input,select').forEach(control => control.disabled = true);
    }
    async function run(task) {
      if (busy) return;
      busy = true; error = false; message = 'Traitement de la sélection…'; render();
      try {await task();} catch (cause) {receipt = null; error = true; message = cause.message || 'Action impossible. Réessayer.';}
      finally {busy = false; render();}
    }
    render();
    return {groups, payloads:() => selected().map(payload)};
  }
  global.LivePalmesDirectImportReview = {mount, rowIssue, isRelay};
})(window);
