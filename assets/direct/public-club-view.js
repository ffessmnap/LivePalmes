(function(global){
  'use strict';
  const ui=global.LivePalmesDirectPresentation,view=global.LivePalmesDirectEventView;
  const {esc}=view;
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
  function groupHtml({person,rows},showDates=false){
    const dates=new Set(rows.map(({event})=>event.date));
    return `<section class="direct-club-person"><h3>${esc(ui.name(person))}${person.kind!=='relay'&&person.birthYear?' · '+esc(person.birthYear):''} ${ui.categoryBadge(person.category)}</h3>${[...dates].map(date=>`${showDates?'<h4>'+esc(new Date(date+'T12:00:00').toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'}))+'</h4>':''}${global.LivePalmesDirectProgramView.table(rows.filter(({event})=>event.date===date),{scope:'club',group:person.key+'-'+date})}`).join('')}</section>`;
  }
  function render(data,club,session){
    if(!club)return '<p class="direct-empty">Choisissez un club pour consulter son programme et ses résultats publiés.</p>';
    const {swimmers,relays}=program(data,club,session);
    if(!swimmers.length&&!relays.length)return '<p class="direct-empty">Aucune participation publiée pour ce club dans cette session.</p>';
    const showDates=new Set(data.events.map(event=>event.date)).size>1;
    return `<p class="direct-note">${swimmers.length} nageur${swimmers.length>1?'s':''} · ${swimmers.concat(relays).reduce((sum,group)=>sum+group.rows.length,0)} participation(s). Places dans la compétition.</p>${swimmers.map(group=>groupHtml(group,showDates)).join('')}${relays.length?'<h3 class="direct-club-relays-title">Relais</h3>'+relays.map(group=>groupHtml(group,showDates)).join(''):''}`;
  }
  global.LivePalmesDirectClubView={program,render};
})(window);
