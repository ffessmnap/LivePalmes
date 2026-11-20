(function(global){
  'use strict';
  const ui=global.LivePalmesDirectPresentation,view=global.LivePalmesDirectEventView;
  const {esc,seed,format,scheduleFor,phaseLabel,participationBadge}=view;
  function program(data,club,session='all'){
    const events=new Map(data.events.map(event=>[event.id,event])),byEvent=new Map();
    for(const row of data.entries){if(!byEvent.has(row.eventId))byEvent.set(row.eventId,[]);byEvent.get(row.eventId).push(row);}
    // Rank the complete published race before restricting club or session.
    const ranked=(data.rankingGroups||data.events.map(event=>[event.id])).flatMap(ids=>view.rankings(ids.flatMap(id=>byEvent.get(id)||[]),data.rankingMode));
    const groups=new Map(),relays=new Map();
    for(const row of ranked){
      const event=events.get(row.eventId);
      if(row.club!==club||!event||!global.LivePalmesDirectSessions.matches(event,session))continue;
      const target=row.kind==='relay'?relays:groups;
      if(!target.has(row.key))target.set(row.key,{person:row,rows:[]});
      target.get(row.key).rows.push({row,event});
    }
    const order=({event:a,row:x},{event:b,row:y})=>String(a.date||'').localeCompare(String(b.date||''))||String(a.sessionKey||'1').localeCompare(String(b.sessionKey||'1'),'fr',{numeric:true})||Number(a.order||0)-Number(b.order||0)||Number(x.series||0)-Number(y.series||0);
    const sorted=map=>[...map.values()].sort((a,b)=>ui.name(a.person).localeCompare(ui.name(b.person),'fr')).map(group=>({...group,rows:group.rows.sort(order)}));
    return {swimmers:sorted(groups),relays:sorted(relays)};
  }
  function table(rows){
    return `<table class="direct-club-table"><thead><tr><th>Épreuve</th><th><abbr title="Temps d’engagement">Eng.</abbr></th><th>Résultat</th><th><abbr title="Place dans la compétition">Pl.</abbr></th></tr></thead><tbody>${rows.map(({row,event})=>{
      const time=scheduleFor(event,row.series),meta=[event.sessionLabel,time,row.series!=null?'S'+row.series:'',row.lane!=null?'L'+row.lane:''].filter(Boolean).join(' · ');
      const result=view.hasResult(row)?ui.resultLabel(row)||format(row.result?.cs):'En attente';
      return `<tr><td><button type="button" data-club-event="${esc(event.id)}" data-club-series="${esc(row.series??'')}" class="direct-program-event">${esc(event.eventLabel)}${phaseLabel(event.phase)?' · '+esc(phaseLabel(event.phase)):''}</button><span class="direct-person-meta">${esc(meta)}</span>${row.kind==='relay'&&row.members?.length?'<details><summary>Relayeurs</summary><p>'+row.members.map(member=>esc(ui.name(member))).join(' · ')+'</p></details>':''}</td><td class="direct-time">${esc(seed(row))}</td><td class="direct-time">${esc(result)}</td><td class="direct-time">${esc(row.rank||'—')}${participationBadge(row)}</td></tr>`;
    }).join('')}</tbody></table>`;
  }
  function groupHtml({person,rows},relay=false){
    const dates=new Set(rows.map(({event})=>event.date));
    return `<section class="direct-club-person"><h3>${esc(ui.name(person))}${!relay&&person.birthYear?' · '+esc(person.birthYear):''} ${ui.categoryBadge(person.category)}</h3>${[...dates].map(date=>`${dates.size>1?'<h4>'+esc(new Date(date+'T12:00:00').toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'}))+'</h4>':''}${table(rows.filter(({event})=>event.date===date))}`).join('')}</section>`;
  }
  function render(data,club,session){
    if(!club)return '<p class="direct-empty">Choisissez un club pour consulter son programme et ses résultats publiés.</p>';
    const {swimmers,relays}=program(data,club,session);
    if(!swimmers.length&&!relays.length)return '<p class="direct-empty">Aucune participation publiée pour ce club dans cette session.</p>';
    return `<p class="direct-note">${swimmers.length} nageur${swimmers.length>1?'s':''} · ${swimmers.concat(relays).reduce((sum,group)=>sum+group.rows.length,0)} participation(s). Places dans la compétition.</p>${swimmers.map(group=>groupHtml(group)).join('')}${relays.length?'<h3 class="direct-club-relays-title">Relais</h3>'+relays.map(group=>groupHtml(group,true)).join(''):''}`;
  }
  global.LivePalmesDirectClubView={program,render};
})(window);
