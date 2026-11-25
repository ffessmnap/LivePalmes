(function (global) {
  "use strict";
  function careerGroups(history, course, basin, poolOf) {
    const seasons = new Map(), groups = new Map();
    for (const row of history) {
      const cat = row.category, year = Number(row.seasonYear);
      if (!cat || !Number.isInteger(year) || year < 1900 || year > 2199) continue;
      if (!seasons.has(cat)) seasons.set(cat, new Set());
      seasons.get(cat).add(year);
      const pool = poolOf(row);
      if (row.course !== course || row.isIntermediate || (basin && pool !== basin)) continue;
      const current = groups.get(cat);
      if (!current || row.timeValue < current.best.timeValue) groups.set(cat, {cat, pool:basin, best:row});
    }
    return [...groups.values()].map(group => ({...group, years:[...seasons.get(group.cat)].sort((a,b)=>a-b)}))
      .sort((a,b)=>a.years[0]-b.years[0] || a.cat.localeCompare(b.cat));
  }
  function create({panel, escapeHtml:esc, poolOf, time, date, read, refresh}) {
    const byId = id => document.getElementById(id);
    const chart = byId("swimScatter"), pick = byId("swimPick"), detail = byId("swimDetail");
    const splits = byId("swimSplits"), best = byId("swimBest"), refs = byId("swimRefs");
    const target = byId("swimCareerRows");
    const period = byId("swimComparisonPeriod");
    let view = "history", data = null, points = [], selected = null, cohort = null;
    const basinLabel = pool => pool ? pool + " m" : "Bassin non renseigné";
    function selection(index) {
      selected = points[index] || null;
      pick.value = String(index);
      for (const mark of chart.querySelectorAll(".is-picked")) mark.classList.remove("is-picked");
      chart.querySelector('[data-mark="'+index+'"]')?.classList.add("is-picked");
      if (!selected) { detail.textContent = ""; return; }
      const r = selected;
      const origin = r.isIntermediate ? ["Temps de passage",r.originCourseShortLabel || r.originCourse].filter(Boolean).join(" du ") : "Course complète";
      detail.textContent = [r.time,origin,date(r.date),r.competition,r.location,basinLabel(poolOf(r))].filter(Boolean).join(" · ");
    }
    function scatter() {
      const poolKind = r => ({"25":"short","50":"long","33":"other"}[poolOf(r)] || "unknown");
      points = data.visible.filter(r=>Number.isFinite(Date.parse(r.date)) && r.timeValue>0)
        .sort((a,b)=>String(a.date).localeCompare(b.date) || Number(a.id)-Number(b.id));
      pick.parentElement.hidden = detail.hidden = !points.length;
      if (!points.length) {
        chart.textContent = "Aucun chrono daté pour ces filtres.";
        return;
      }
      const w = Math.max(220,chart.clientWidth), l=61, right=w-21, top=25, bottom=163;
      const timestamps=points.map(r=>Date.parse(r.date)), values=points.map(r=>Number(r.timeValue));
      const first=timestamps[0], last=timestamps[timestamps.length-1], fastest=Math.min(...values), slowest=Math.max(...values);
      const x = t => last===first ? (l+right)/2 : l+(t-first)*(right-l)/(last-first);
      const y = t => fastest===slowest ? (top+bottom)/2 : top+(t-fastest)*(bottom-top)/(slowest-fastest);
      const ticks = fastest===slowest ? [fastest] : [...new Set([fastest, Math.round((fastest+slowest)/2), slowest])];
      const minima = new Map();
      if (best.checked) for (const r of points.filter(r=>!r.isIntermediate)) {
        const key=r.seasonYear+"|"+poolOf(r);
        minima.set(key,Math.min(minima.get(key)??Infinity,r.timeValue));
      }
      let svg='<svg role="img" aria-label="Chronos par date. Les temps les plus rapides sont en haut." viewBox="0 0 '+w+' 194">';
      for (const t of ticks) svg+='<line class="swim-rule" x1="'+l+'" x2="'+right+'" y1="'+y(t)+'" y2="'+y(t)+'"/><text x="'+(l-9)+'" y="'+(y(t)+4)+'" text-anchor="end">'+esc(time(t))+'</text>';
      const tickCount=last===first ? 1 : (w>530 && last-first>7*86400000 ? 4 : 2);
      for(let i=0;i<tickCount;i++){
        const t=first+(last-first)*i/Math.max(1,tickCount-1);
        const label=new Date(t).toLocaleDateString("fr-FR",{day:"2-digit",month:"2-digit",year:"2-digit",timeZone:"UTC"});
        const anchor=tickCount===1?"middle":i===0?"start":i===tickCount-1?"end":"middle";
        svg+='<text x="'+x(t)+'" y="187" text-anchor="'+anchor+'">'+label+'</text>';
      }
      const symbols={short:'<circle r="4"/>',long:'<path d="M0 -5 L5 0 0 5 -5 0Z"/>',other:'<rect x="-4" y="-4" width="8" height="8"/>',unknown:'<path d="M0 -5 L5 4 -5 4Z"/>'};
      points.forEach((r,i)=>{
        const kind=poolKind(r);
        const underline=!r.isIntermediate && minima.get(r.seasonYear+"|"+poolOf(r))===r.timeValue;
        svg+='<g data-mark="'+i+'" transform="translate('+x(timestamps[i])+' '+y(r.timeValue)+')" class="swim-mark '+kind+(r.isIntermediate?' split':'')+'"><title>'+esc([date(r.date),r.time,basinLabel(poolOf(r))].join(" · "))+'</title><circle class="hit" r="9"/>'+symbols[kind]+(underline?'<path class="underline" d="M-5 8 H5"/>':'')+'</g>';
      });
      const keys=[...new Set(points.map(poolOf))].sort((a,b)=>Number(a)-Number(b)).map(pool=>({"25":"● 25 m","50":"◆ 50 m","33":"■ 33 m"}[pool] || "▲ Bassin non renseigné"));
      if(points.some(r=>r.isIntermediate)) keys.push("Symbole creux : passage");
      chart.innerHTML='<p class="swim-caption">'+points.length+' chrono'+(points.length>1?'s':'')+' · '+keys.join(' · ')+'</p>'+svg+'</svg>';
      pick.innerHTML=points.map((r,i)=>'<option value="'+i+'">'+esc([date(r.date),r.time,basinLabel(poolOf(r)),r.isIntermediate?"Passage":"",r.competition].filter(Boolean).join(" · "))+'</option>').join("");
      selection(points.includes(selected)?points.indexOf(selected):points.length-1);
    }
    function recordsFor(group) {
      if (!refs.checked) return [];
      const matches = r => r.course===data.filters.course && r.sex===data.swimmer.sex && !r.placeholderRecord &&
        Number(r.value)>0 && !String(r.style).startsWith("RELAY");
      const found = new Map();
      function add(label,r) {
        const value=Number(r.value);
        if (!found.has(value)) found.set(value,new Set());
        found.get(value).add(label);
      }
      for(const r of data.records.records || []) if(matches(r) && r.category===group.cat) add("MPF",r);
      const type=group.cat==="S"?"RF":group.cat==="J"?"RFJ":"";
      if(type) for(const r of data.records.franceRecords || []) {
        if(matches(r) && r.recordType===type && (!group.pool || !poolOf(r) || poolOf(r)===group.pool)) add(type,r);
      }
      return [...found].map(([value,labels])=>({value,label:[...labels].join(" et ")}));
    }
    function seasonLabel(years) {
      const ranges=[];
      for(const y of years){
        const tail=ranges[ranges.length-1];
        if(tail && tail[1]===y-1) tail[1]=y;
        else ranges.push([y,y]);
      }
      return ranges.map(([a,b])=>(a-1)+"–"+b).join(", ");
    }
    function career() {
      const groups=careerGroups(data.history,data.filters.course,data.filters.pool,poolOf);
      if(!groups.length){target.textContent="Aucune course complète pour cette épreuve et ce bassin.";return;}
      const query=groups.map(g=>g.cat+":"+g.years.join(",")).join(";");
      const params={action:"category-benchmarks",course:data.filters.course,sex:data.swimmer.sex,pool:data.filters.pool,groups:query,grouping:"category",period:period.value};
      const key=JSON.stringify(params);
      if(query && (!cohort || cohort.key!==key)){
        const entry=cohort={key,status:"loading"};
        read(params).then(result=>{
          if (!Array.isArray(result.groups)) throw Error("Réponse incomplète");
          entry.stats=result.groups;entry.status="ready";
        }).catch(()=>{entry.status="error";}).finally(()=>{
          if(data && cohort===entry && view==="career") career();
        });
      }
      const rows=groups.map(g=>({...g, refs:recordsFor(g),stats:cohort?.key===key?cohort.stats?.find(s=>s.category===g.cat&&s.pool===g.pool):null}));
      const values=rows.flatMap(g=>[g.best.timeValue,g.stats?.lower,g.stats?.median,g.stats?.upper,...g.refs.map(r=>r.value)]).filter(Number.isFinite);
      const min=Math.min(...values),max=Math.max(...values);
      const pos=t=>max===min?50:3+94*(t-min)/(max-min);
      const mark=(cls,t)=>'<i class="'+cls+'" style="left:'+pos(t)+'%"></i>';
      target.innerHTML='<p class="swim-caption">Carrière entière · Temps les plus rapides à gauche · ◆ Meilleure course</p>'+rows.map(g=>{
        const s=g.stats;
        let stat=cohort.status==="loading"?"Chargement du repère collectif…":cohort.status==="error"?"Repère collectif indisponible.":(s?.count||0)+" nageurs · Repère collectif dès 20.";
        let bar="";
        if(s?.count>=20){
          stat="Médiane "+time(s.median)+" · Moitié centrale de "+time(s.lower)+" à "+time(s.upper)+" · "+s.count+" nageurs";
          bar='<i class="swim-band" style="left:'+pos(s.lower)+'%;width:'+(pos(s.upper)-pos(s.lower))+'%"></i>'+mark("swim-median",s.median);
        }
        return '<article class="swim-category"><div class="swim-category-head"><h3>'+esc(g.best.categoryLabel||g.cat)+'</h3><strong>'+esc(g.best.time)+'</strong></div><small>'+esc(seasonLabel(g.years))+' · '+(g.pool?esc(basinLabel(g.pool)):'Tous bassins')+'</small><div class="swim-scale" aria-hidden="true">'+bar+mark("swim-personal",g.best.timeValue)+g.refs.map(r=>mark("swim-reference",r.value)).join("")+'</div><p>'+esc(stat)+'</p>'+
          (g.refs.length?'<p class="swim-ref-text">'+g.refs.map(r=>'▲ '+r.label+' '+esc(time(r.value))).join(' · ')+'</p>':'')+'</article>';
      }).join("")+(query && cohort.status==="error"?'<button class="progress-reset-button" type="button" data-swim-retry>Réessayer</button>':'')+
        '<p class="swim-caption">Comparaison avec les nageurs ayant représenté un club français '+(period.value==="all"?'sur toutes les saisons connues':'sur les saisons indiquées pour chaque catégorie')+', pour la même épreuve et le même sexe. Une meilleure course complète par nageur '+(data.filters.pool?'en bassin de '+esc(data.filters.pool)+' m':'tous bassins confondus')+'.</p>';
    }
    function display() {
      if(!data)return;
      for(const b of panel.querySelectorAll("[data-swim-view]")){
        const active=b.dataset.swimView===view;
        b.classList.toggle("active",active);b.setAttribute("aria-pressed",String(active));
      }
      byId("swim-history").hidden=view!=="history";
      byId("swim-career").hidden=view!=="career";
      if(view==="history")scatter();else career();
    }
    panel.addEventListener("click",event=>{
      const b=event.target.closest("[data-swim-view],[data-mark],[data-swim-retry]");
      if(!b)return;
      if(b.dataset.mark!==undefined){selection(Number(b.dataset.mark));return;}
      if(b.dataset.swimView)view=b.dataset.swimView;
      else cohort=null;
      display();
    });
    pick.addEventListener("change",()=>selection(Number(pick.value)));
    splits.addEventListener("change",refresh);
    best.addEventListener("change",display);
    refs.addEventListener("change",display);
    period.addEventListener("change",display);
    let width=0;
    new ResizeObserver(()=>{
      if(data && view==="history" && chart.clientWidth && chart.clientWidth!==width){width=chart.clientWidth;scatter();}
    }).observe(chart);
    return {
      update(next) {
        if(next?.swimmer!==data?.swimmer){view="history";selected=null;cohort=null;period.value="swimmer";}
        data=next;
        panel.classList.toggle("active",Boolean(data));
        if(data){byId("swimEventTitle").textContent="Progression · "+data.label;display();}
      }
    };
  }
  global.LivePalmesSwimmerExplorer={create,careerGroups};
})(typeof window==="undefined"?module.exports:window);
