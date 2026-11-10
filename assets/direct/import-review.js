(function (global) {
  'use strict';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const sessions=global.LivePalmesDirectSessions||(typeof module==='object'?require('./sessions'):null);
  const sexes = {F:'Femmes', M:'Hommes', X:'Mixte'};
  const isRelay = (row, event) => row.relay === true || /^\d+\s*[x×]\s*\d+/i.test(event.eventCode || '');
  function rowIssue(row, event) {
    if (row.reviewRequired) return 'Ligne PDF non reconnue : compléter et confirmer';
    if (/[\u0000-\u001f\u007f-\u009f\ufffd]/.test([row.lastName,row.firstName,row.club].join(' '))) return 'Caractère PDF illisible dans le nom ou le club : corriger';
    if (!row.lastName?.trim() || !row.club?.trim()) return 'Nom ou club manquant';
    if (!isRelay(row, event) && (!Number.isInteger(Number(row.birthYear)) || Number(row.birthYear) < 1900 || Number(row.birthYear) > 2100)) return 'Année de naissance manquante ou invalide';
    if (event && (!Number.isInteger(Number(row.series)) || Number(row.series)<1 || !Number.isInteger(Number(row.lane)) || Number(row.lane)<0 || Number(row.lane)>20)) return 'Série ou ligne invalide';
    const time=String(row.entryTime||'').trim().replace(',','.'),formatted=time.match(/^(?:(\d{1,2}):)?(\d{1,2}):(\d{2})\.(\d{2})$/),seconds=time.match(/^(\d{1,2})\.(\d{2})$/),compact=time.match(/^(\d{2})(\d{2})(\d{2})$/);
    if(time&&!(formatted&&Number(formatted[3])<60||seconds&&Number(seconds[1])<60||compact&&Number(compact[2])<60))return 'Temps d’engagement non reconnu';
    return '';
  }
  function groupIssues(group){const identities=new Map(),slots=new Map();return group.rows.map((row,index)=>{const identity=JSON.stringify([row.lastName,row.firstName,row.birthYear,row.club].map(value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim())),slot=row.series+':'+row.lane,duplicate=slots.has(slot)||!isRelay(row,group.event)&&identities.has(identity);slots.set(slot,true);identities.set(identity,true);return {row,index,issue:rowIssue(row,group.event)||(!row.selected?'Participation exclue : rétablir la ligne':duplicate?'Participation ou position en double dans cette épreuve':'')};}).filter(item=>item.issue);}
  function location(group,row){return `${group.event.eventLabel} · ${sexes[group.event.sex]} · Session ${group.event.sessionKey} · Série ${row.series??'—'} · Ligne ${row.lane??'—'}`;}
  function payload(group) {
    if(group.kind==='series'&&groupIssues(group).length)throw Error('Toutes les participations doivent être corrigées avant publication.');
    return {kind:group.kind, event:{...group.event}, seriesNumber:group.seriesNumber ?? null, source:group.source,
      operationKey:group.operationKey, batchId:group.operationKey,
      rows:group.rows.filter(row => row.selected).map(({selected,rawSource,reviewRequired, ...row}) => ({...row, relay:isRelay(row, group.event), ...(group.seriesNumber != null ? {series:Number(group.seriesNumber)} : {})}))};
  }
  function mount(host, groups, actions) {
    let receipt = null, busy = false, message = '', error = false;
    let selectedSession=actions.initialSession||'all';
    const open = new Set(), advanced = new Set(), editing=new Set();
    const rowFields=[['lastName','Nom'],['firstName','Prénom'],['birthYear','Année'],['club','Club'],['category','Catégorie'],['series','Série'],['lane','Ligne'],['entryTime','Engagement']];
    function rowHtml(group,row,rowIndex,index,issue=''){
      const edit=editing.has(index+':'+rowIndex),disabled=group.published?'disabled':'';
      return `<tr class="${issue?'direct-row-invalid':''}" data-import-row="${rowIndex}"><td>S${esc(row.series??'—')} · L${esc(row.lane??'—')}</td><td><span class="direct-person">${esc(global.LivePalmesDirectPresentation.name(row)||'Identité à compléter')}</span></td><td>${esc(row.birthYear|| (isRelay(row,group.event)?'—':'?'))}</td><td>${esc(row.club||'—')}</td><td>${esc(row.category||'—')}</td><td class="direct-time">${esc(row.entryTime||row.resultTime||row.resultStatus||'—')}</td><td><button type="button" class="secondary" data-edit-row="${rowIndex}" ${disabled}>${issue?'Corriger':'Modifier'}</button></td></tr>${issue?`<tr class="direct-row-problem"><td colspan="7"><strong>${esc(location(group,row))}</strong> — ${esc(issue)}</td></tr>`:''}${edit?`<tr class="direct-row-editor"><td colspan="7">${row.rawSource?`<p class="direct-source">PDF : ${esc(row.rawSource)}</p>`:''}<form data-row-editor="${rowIndex}"><div class="direct-row-fields">${rowFields.map(([key,label])=>`<label>${label}<input name="${key}" value="${esc(row[key])}" ${['birthYear','series','lane'].includes(key)?'type="number"':''} ${isRelay(row,group.event)&&key==='birthYear'?'disabled':''}></label>`).join('')}</div><div class="direct-actions"><button type="submit">Confirmer la ligne</button><button type="button" class="secondary" data-cancel-row="${rowIndex}">Annuler</button></div><p role="alert" data-row-editor-error></p></form></td></tr>`:''}`;
    }
    groups.forEach(group => {if (!group.error && group.selected == null) group.selected = true;});
    const available = () => groups.filter(group => !group.error && !group.published&&sessions.matches(group.event,selectedSession));
    const selected = () => available().filter(group => group.selected);
    const count = list => list.reduce((n, group) => n + group.rows.filter(row => row.selected).length, 0);
    function invalidate(group) {if(group)group.operationKey=crypto.randomUUID();receipt = null; message = 'Sélection modifiée. Vérifier de nouveau avant de publier.'; error = false;}
    function render() {
      const chosen = selected(), total = count(chosen), all = available(), problems=chosen.flatMap(group=>groupIssues(group).map(item=>({...item,group}))), detected=chosen.reduce((n,group)=>n+group.rows.length,0);
      host.innerHTML = `${sessions.filter(groups.filter(group=>!group.error).map(group=>group.event),selectedSession,'data-import-session')}<div class="direct-import-head"><div><h3>Épreuves à publier</h3><p class="direct-note">${all.length} épreuve${all.length > 1 ? 's' : ''} · ${detected} participations · ${detected-problems.length} prêtes · ${problems.length} à corriger</p></div><label class="direct-check-label"><input type="checkbox" data-select-all ${all.length && chosen.length === all.length ? 'checked' : ''} ${!all.length ? 'disabled' : ''}>Tout sélectionner</label></div>
        <div class="direct-import-list">${groups.map((group, index) => {
          if(!group.error&&!sessions.matches(group.event,selectedSession))return '';
          if (group.error) return `<div class="direct-import-error" role="alert">${esc(group.error)}</div>`;
          const rows = group.rows.filter(row => row.selected), excluded = group.rows.length - rows.length;
          const issues = groupIssues(group),issueMap=new Map(issues.map(item=>[item.index,item.issue]));
          const series = new Set(rows.map(row => Number(row.series)).filter(n => n != null));
          return `<div class="direct-import-item ${group.published ? 'is-published' : ''}" data-group="${index}"><label class="direct-group-check"><input type="checkbox" data-select-group="${index}" aria-label="Sélectionner ${esc(group.event.eventLabel || group.event.eventCode)} ${esc(sexes[group.event.sex])}" ${group.selected ? 'checked' : ''} ${group.published ? 'disabled' : ''}></label><details data-details="${index}" ${open.has(index) ? 'open' : ''}><summary><span class="direct-import-course"><strong>${esc(group.event.eventLabel || group.event.eventCode)}</strong><span class="direct-person-meta">${esc(sexes[group.event.sex])} · ${esc(group.event.sessionLabel || 'Session ' + group.event.sessionKey)}${group.seriesNumber ? ' · Série ' + esc(group.seriesNumber) : ''}</span></span><span class="direct-import-count">${rows.length} ligne${rows.length > 1 ? 's' : ''}<small>${series.size} série${series.size > 1 ? 's' : ''}</small></span><span class="direct-import-state ${issues.length || excluded ? 'attention' : ''}">${group.published ? 'Publié' : issues.length ? issues.length + ' à corriger' : !group.selected ? 'Non sélectionné' : receipt ? 'Vérifié' : excluded ? excluded + ' exclue' + (excluded > 1 ? 's' : '') : 'Prêt à vérifier'}</span><span class="direct-detail-hint">Détails</span></summary>
          <div class="direct-import-detail"><p class="direct-note direct-source">${esc(group.source?.name)} · ${esc(group.event.date)} · ${esc(group.kind === 'series' ? 'Séries' : 'Résultats')}</p>
          <details class="direct-import-advanced" data-advanced="${index}" ${advanced.has(index) ? 'open' : ''}><summary>Paramètres de l’épreuve</summary><div class="direct-grid">${[['eventCode','Code de l’épreuve'],['eventLabel','Intitulé'],['date','Date'],['sessionKey','Session'],['sessionLabel','Intitulé de session'],['order','Ordre au programme'],['phase','Phase']].map(([key, label]) => `<label>${label}<input data-field="${key}" type="${key === 'date' ? 'date' : key === 'order' ? 'number' : 'text'}" value="${esc(group.event[key])}" ${group.published ? 'disabled' : ''}></label>`).join('')}<label>Sexe<select data-field="sex" ${group.published ? 'disabled' : ''}>${Object.entries(sexes).map(([key,label]) => `<option value="${key}" ${key === group.event.sex ? 'selected' : ''}>${label}</option>`).join('')}</select></label><label>Numéro de série seul<input data-series-scope type="number" min="1" max="1000" placeholder="Vide : épreuve complète" value="${esc(group.seriesNumber || '')}" ${group.published ? 'disabled' : ''}></label></div></details>
          <div class="direct-table-wrap"><table class="direct-import-rows"><thead><tr><th>Série / ligne</th><th>Nageur / équipe</th><th>Année</th><th>Club</th><th>Cat.</th><th>${group.kind==='series'?'Engagement':'Résultat'}</th><th>Action</th></tr></thead><tbody>${group.rows.map((row,rowIndex)=>rowHtml(group,row,rowIndex,index,issueMap.get(rowIndex))).join('')}</tbody></table></div></div></details></div>`;
        }).join('')}</div>
        <div class="direct-batch-actions"><div><strong>${chosen.length} épreuve${chosen.length > 1 ? 's' : ''} sélectionnée${chosen.length > 1 ? 's' : ''}</strong><span class="direct-person-meta">${total} participation${total > 1 ? 's' : ''} à publier</span></div><div class="direct-actions"><button type="button" class="secondary" data-batch-verify ${!chosen.length || problems.length || editing.size || busy ? 'disabled' : ''}>Vérifier la sélection</button><button type="button" data-batch-publish ${!receipt || problems.length || editing.size || busy ? 'disabled' : ''}>${selectedSession==='all'?'Tout publier':'Publier la session'}${chosen.length ? ' (' + chosen.length + ')' : ''}</button></div><p data-batch-message role="status" aria-live="polite" class="direct-status ${error ? 'error' : ''}">${esc(message || (problems.length?'Publication bloquée : '+problems.length+' participation(s) à corriger.':'Un seul contrôle pour toutes les épreuves sélectionnées.'))}${problems.length?'<button type="button" data-first-issue class="secondary">Voir la première ligne à corriger</button>':''}</p></div>`;
      host.querySelector('[data-import-session]')?.addEventListener('change',event=>{selectedSession=event.target.value;actions.onSessionChange?.(selectedSession);invalidate();render();});
      const selectAll = host.querySelector('[data-select-all]');
      selectAll.indeterminate = chosen.length > 0 && chosen.length < all.length;
      selectAll.onchange = e => {all.forEach(group => group.selected = e.target.checked); invalidate(); render();};
      host.querySelectorAll('[data-group]').forEach(section => {
        const index = Number(section.dataset.group), group = groups[index];
        section.querySelector('[data-select-group]').onchange = e => {group.selected = e.target.checked; invalidate(); render();};
        section.querySelector('[data-details]').ontoggle = e => {if (e.target.open) open.add(index); else open.delete(index);};
        section.querySelector('[data-advanced]').ontoggle = e => {if (e.target.open) advanced.add(index); else advanced.delete(index);};
        section.querySelectorAll('[data-edit-row]').forEach(button=>button.onclick=()=>{editing.add(index+':'+button.dataset.editRow);open.add(index);invalidate();render();host.querySelector(`[data-group="${index}"] [data-row-editor="${button.dataset.editRow}"] input`)?.focus();});
        section.querySelectorAll('[data-cancel-row]').forEach(button=>button.onclick=()=>{editing.delete(index+':'+button.dataset.cancelRow);render();});
        section.querySelectorAll('[data-row-editor]').forEach(form=>form.onsubmit=e=>{e.preventDefault();const rowIndex=Number(form.dataset.rowEditor),row={...group.rows[rowIndex],...Object.fromEntries(new FormData(form)),reviewRequired:false,selected:true};row.series=Number(row.series);row.lane=Number(row.lane);const issue=rowIssue(row,group.event);if(issue){form.querySelector('[data-row-editor-error]').textContent=issue;return;}group.rows[rowIndex]=row;editing.delete(index+':'+rowIndex);invalidate(group);render();});
        section.querySelectorAll('[data-field]').forEach(input => input.onchange = e => {group.event[input.dataset.field] = e.target.value; invalidate(group); render();});
        section.querySelector('[data-series-scope]').onchange = e => {group.seriesNumber = e.target.value ? Number(e.target.value) : null; invalidate(group); render();};
      });
      host.querySelector('[data-first-issue]')?.addEventListener('click',()=>{const item=problems[0],index=groups.indexOf(item.group);open.add(index);editing.add(index+':'+item.index);render();host.querySelector(`[data-group="${index}"] [data-row-editor="${item.index}"]`)?.scrollIntoView({block:'center'});host.querySelector(`[data-group="${index}"] [data-row-editor="${item.index}"] input`)?.focus();});
      host.querySelector('[data-batch-verify]').onclick = () => run(async () => {
        const list = selected();
        for (const group of list) {
          if (!group.rows.some(row => row.selected)) throw Error(`${group.event.eventLabel} : sélectionner au moins une ligne ou décocher cette épreuve.`);
          const invalid = groupIssues(group)[0]?.row;
          if (invalid) {open.add(groups.indexOf(group)); throw Error(`${location(group,invalid)} : ${rowIssue(invalid, group.event)||'Participation exclue'}.`);}
        }
        receipt = await actions.verify(list.map(payload));
        message = `${list.length} épreuve${list.length > 1 ? 's' : ''} et ${count(list)} participations vérifiées.${receipt.replacements?.length ? ' ' + receipt.replacements.length + ' remplacement(s) à confirmer.' : ' Vous pouvez tout publier.'}`;
      });
      host.querySelector('[data-batch-publish]').onclick = () => {
        if (!receipt||editing.size||selected().some(group=>groupIssues(group).length)) return;
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
  global.LivePalmesDirectImportReview = {mount, rowIssue, groupIssues, payload, isRelay};
})(window);
