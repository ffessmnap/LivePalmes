(function (global) {
  'use strict';
  function create({getData,onClubChange,onEventSelect}) {
    const ui=global.LivePalmesDirectPresentation;
    const {esc,format,seed,club,delta,scheduleFor,phaseLabel,participationBadge} = global.LivePalmesDirectEventView;
    const person = document.createElement('dialog'), clubs = document.createElement('dialog');
    person.className = clubs.className = 'direct-dialog';
    person.setAttribute('aria-label','Programme et résultats du nageur');
    clubs.setAttribute('aria-label','Choisir un club à mettre en évidence');
    document.body.append(person,clubs);
    let personRequest = 0, clubRequest = 0;
    const frame = (title,body) => `<div class="direct-dialog-head"><h2>${title}</h2><form method="dialog"><button type="submit" class="secondary" aria-label="Fermer la fenêtre">Fermer ×</button></form></div>${body}`;
    function loading(dialog,title) {
      dialog.innerHTML = frame(title,'<p class="direct-status" role="status">Chargement…</p>');
      if (!dialog.open) dialog.showModal();
    }
    async function openPerson(key) {
      const request = ++personRequest;
      loading(person,'Programme et résultats');
      try {
        const data = await getData();
        if (!person.open || request !== personRequest) return;
        const byEvent=new Map();for(const row of data.entries){if(!byEvent.has(row.eventId))byEvent.set(row.eventId,[]);byEvent.get(row.eventId).push(row);}
        const ranked = (data.rankingGroups||data.events.map(event=>[event.id])).flatMap(ids => global.LivePalmesDirectEventView.rankings(ids.flatMap(id=>byEvent.get(id)||[])));
        const rows = ranked.filter(row => row.key === key), first = rows[0];
        if (!first) throw Error('Ce nageur ne figure plus dans les publications disponibles.');
        const events = new Map(data.events.map(event => [event.id,event]));
        const list = rows.filter(row => events.has(row.eventId)).sort((a,b) => {
          const x = events.get(a.eventId), y = events.get(b.eventId);
          return x.date.localeCompare(y.date) || Number(x.order) - Number(y.order) || Number(a.series) - Number(b.series);
        });
        const days = [...new Set(list.map(row => events.get(row.eventId).date))];
        person.innerHTML = frame(`${esc(ui.name(first))}`, `<p class="direct-note">${esc(club(first))}${first.birthYear ? ' · ' + esc(first.birthYear) : ''} · ${esc(first.category || '')} ${participationBadge(first)}</p>${days.map(day => `<section class="direct-person-day"><h3>${esc(new Date(day + 'T12:00:00').toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'}))}</h3>${list.filter(row => events.get(row.eventId).date === day).map(row => {
          const event = events.get(row.eventId), time = scheduleFor(event,row.series);
          return `<article class="direct-program-row"><div><button type="button" class="direct-program-event" data-program-event="${esc(event.id)}" data-program-series="${esc(row.series || '')}">${esc(event.eventLabel)}${phaseLabel(event.phase) ? ' · ' + esc(phaseLabel(event.phase)) : ''} ↗</button><span class="direct-person-meta">${esc(event.sessionLabel)}${time ? ' · ' + esc(time) : ''}${row.series ? ' · S' + esc(row.series) : ''}${row.lane != null ? ' · L' + esc(row.lane) : ''}</span></div><div class="direct-program-times"><span>Eng. <strong title="${row.seed?.status === 'no_reference' ? 'Sans référence' : 'Temps d’engagement'}">${esc(seed(row))}</strong></span><span>Rés. <strong>${esc(ui.resultLabel(row) || format(row.result?.cs))}</strong>${delta(row)}</span>${row.rank ? `<span>Place ${esc(row.rank)} ${esc(row.participationStatus||'')}</span>` : ''}</div>${row.members?.length ? `<details><summary>Relayeurs</summary><div class="direct-split-list">${row.members.map(m => `${esc(ui.name(m))}`).join('<br>')}</div></details>` : ''}${ui.splits(row,event).length ? `<details><summary>Temps de passage</summary><div class="direct-split-list">${ui.passageTable(row,event)}</div></details>` : ''}</article>`;
        }).join('')}</section>`).join('')}`);
        person.querySelectorAll('[data-program-event]').forEach(button => button.onclick = () => {
          person.close(); onEventSelect(button.dataset.programEvent,button.dataset.programSeries);
        });
      } catch (error) {
        if (person.open && request === personRequest) {
          person.innerHTML = frame('Programme et résultats',`<p class="direct-status error" role="alert">${esc(error.message)}</p><button type="button" data-retry>Réessayer</button>`);
          person.querySelector('[data-retry]').onclick = () => openPerson(key);
        }
      }
    }
    async function openClub(selected) {
      const request = ++clubRequest;
      loading(clubs,'Mon club');
      try {
        const data = await getData();
        if (!clubs.open || request !== clubRequest) return;
        const options = [...new Set(data.entries.map(row => row.club).filter(Boolean))].sort((a,b) => a.localeCompare(b,'fr'));
        clubs.innerHTML = frame('Mon club',`<p class="direct-note">Les nageurs de ce club seront mis en évidence dans les scratchs et les séries.</p><label>Club<select id="highlightClubSelect"><option value="">Aucun club</option>${options.map(code => `<option value="${esc(code)}" ${code === selected ? 'selected' : ''}>${esc(code)}</option>`).join('')}</select></label><div class="direct-actions"><button type="button" id="applyHighlightClub">Appliquer</button></div>`);
        clubs.querySelector('#applyHighlightClub').onclick = () => {onClubChange(clubs.querySelector('select').value);clubs.close();};
      } catch (error) {
        if (clubs.open && request === clubRequest) {
          clubs.innerHTML = frame('Mon club',`<p class="direct-status error" role="alert">${esc(error.message)}</p><button type="button" data-retry>Réessayer</button>`);
          clubs.querySelector('[data-retry]').onclick = () => openClub(selected);
        }
      }
    }
    return {openPerson,openClub,person,clubs};
  }
  global.LivePalmesDirectDialogs = {create};
})(window);
