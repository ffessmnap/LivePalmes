(function (global) {
  'use strict';
  function create({getData,onClubChange,onEventSelect,onRefresh,getRankingMode=()=>'scratch'}) {
    const ui=global.LivePalmesDirectPresentation;
    const {esc,club,participationBadge} = global.LivePalmesDirectEventView;
    const person = document.createElement('dialog'), clubs = document.createElement('dialog'), mentions=document.createElement('dialog');
    person.className = clubs.className = mentions.className = 'direct-dialog';
    person.setAttribute('aria-label','Programme et résultats du nageur');
    clubs.classList.add('direct-club-dialog');clubs.id='directClubDialog';
    clubs.setAttribute('aria-label','Programme et résultats du club');
    mentions.setAttribute('aria-label','Signification des mentions NS, IN et HC');
    document.body.append(person,clubs,mentions);
    let personRequest = 0, clubRequest = 0;
    const frame = (title,body) => `<div class="direct-dialog-head"><h2>${title}</h2><form method="dialog"><button type="submit" class="secondary" aria-label="Fermer la fenêtre">Fermer ×</button></form></div>${body}`;
    function loading(dialog,title) {
      dialog.innerHTML = frame(title,'<p class="direct-status" role="status">Chargement…</p>');
      if (!dialog.open) dialog.showModal();
    }
    function openParticipation(){mentions.innerHTML=frame('Mentions de participation','<dl><dt>NS</dt><dd>Nageurs étrangers non sélectionnables</dd><dt>IN</dt><dd>Nageurs invités</dd><dt>HC</dt><dd>Nageurs hors concours</dd></dl><p>Ces mentions sont distinctes des forfaits, abandons et disqualifications. Un temps valide reste affiché.</p>'+(getRankingMode()==='classified'?'<p>Places recalculées : les nageurs ordinaires sont classés entre eux. NS / IN / HC gardent leur rang réel dans le classement incluant toutes les participations.</p>':'<p>Scratch intégral : toutes les participations comptent dans les places affichées.</p>'));if(!mentions.open)mentions.showModal();}
    for(const dialog of [person,clubs])dialog.addEventListener('click',event=>{
      const toggle=event.target.closest('[data-program-detail]');
      if(!toggle)return;
      const detail=document.getElementById(toggle.dataset.programDetail);if(!detail||!dialog.contains(detail))return;
      detail.hidden=!detail.hidden;toggle.setAttribute('aria-expanded',String(!detail.hidden));
    });
    clubs.addEventListener('click',event=>{if(event.target.closest('[data-participation-help]')){event.stopPropagation();openParticipation();}});
    person.addEventListener('click',event=>{if(event.target.closest('[data-participation-help]')){event.stopPropagation();openParticipation();}});
    async function openPerson(key) {
      const request = ++personRequest;
      loading(person,'Programme et résultats');
      try {
        const data = await getData();
        if (!person.open || request !== personRequest) return;
        const byEvent=new Map();for(const row of data.entries){if(!byEvent.has(row.eventId))byEvent.set(row.eventId,[]);byEvent.get(row.eventId).push(row);}
        const ranked = (data.rankingGroups||data.events.map(event=>[event.id])).flatMap(ids => global.LivePalmesDirectEventView.rankings(ids.flatMap(id=>byEvent.get(id)||[]),data.rankingMode));
        const rows = ranked.filter(row => row.key === key), first = rows[0];
        if (!first) throw Error('Ce nageur ne figure plus dans les publications disponibles.');
        const events = new Map(data.events.map(event => [event.id,event]));
        const list = rows.filter(row => events.has(row.eventId)).sort((a,b) => {
          const x = events.get(a.eventId), y = events.get(b.eventId);
          return x.date.localeCompare(y.date) || Number(x.order) - Number(y.order) || Number(a.series) - Number(b.series);
        });
        const days = [...new Set(list.map(row => events.get(row.eventId).date))];
        person.innerHTML = frame(`${esc(ui.name(first))}${ui.birthYear(first)}`, `<p class="direct-note">${esc(club(first))} · ${esc(first.category || '')} ${participationBadge(first)}</p>${days.map(day => `<section class="direct-person-day"><h3>${esc(new Date(day + 'T12:00:00').toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'}))}</h3>${global.LivePalmesDirectProgramView.table(list.filter(row=>events.get(row.eventId).date===day).map(row=>({row,event:events.get(row.eventId)})),{scope:'program',group:day})}</section>`).join('')}`);
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
    async function openClub(selected,session='all',refresh=false) {
      const request = ++clubRequest;
      loading(clubs,'Mon club');
      try {
        const data = await (refresh&&onRefresh?onRefresh():getData());
        if (!clubs.open || request !== clubRequest) return;
        const options = [...new Set(data.entries.map(row => row.club).filter(Boolean))].sort((a,b) => a.localeCompare(b,'fr'));
        if(!options.includes(selected))selected='';
        if(!global.LivePalmesDirectSessions.options(data.events).some(item=>item.key===session))session='all';
        function renderClub(focus){
          clubs.innerHTML = frame('Mon club',`<div class="direct-club-controls"><label>Club<select id="highlightClubSelect"><option value="">Choisir un club</option>${options.map(code => `<option value="${esc(code)}" ${code === selected ? 'selected' : ''}>${esc(code)}</option>`).join('')}</select></label>${global.LivePalmesDirectSessions.filter(data.events,session,'id="clubSessionSelect"')}<button type="button" class="secondary" id="refreshClub">Actualiser</button></div><div id="clubProgram">${global.LivePalmesDirectClubView.render(data,selected,session)}</div><div class="direct-actions"><button type="button" id="applyHighlightClub">Revenir aux épreuves</button></div>`);
          clubs.querySelector('#highlightClubSelect').onchange=e=>{selected=e.target.value;onClubChange(selected);renderClub('highlightClubSelect');};
          const sessions=clubs.querySelector('#clubSessionSelect');
          if(sessions)sessions.onchange=e=>{session=e.target.value;renderClub('clubSessionSelect');};
          clubs.querySelector('#applyHighlightClub').onclick=()=>{onClubChange(clubs.querySelector('#highlightClubSelect').value);clubs.close();};
          clubs.querySelector('#refreshClub').onclick=()=>openClub(selected,session,true);
          clubs.querySelectorAll('[data-club-event]').forEach(button=>button.onclick=()=>{clubs.close();onEventSelect(button.dataset.clubEvent,button.dataset.clubSeries);});
          if(focus)clubs.querySelector('#'+focus)?.focus({preventScroll:true});
        }
        renderClub();
      } catch (error) {
        if (clubs.open && request === clubRequest) {
          clubs.innerHTML = frame('Mon club',`<p class="direct-status error" role="alert">${esc(error.message)}</p><button type="button" data-retry>Réessayer</button>`);
          clubs.querySelector('[data-retry]').onclick = () => openClub(selected,session,refresh);
        }
      }
    }
    return {openPerson,openClub,openParticipation,person,clubs,mentions};
  }
  global.LivePalmesDirectDialogs = {create};
})(window);
