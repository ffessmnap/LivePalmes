"use strict";
const template=require("./assets/public-home-template.json").html;
const model=require("./assets/public-home-model");
const calendar=require("./nap-home-direct"),documents=require("./nap-public-documents");
const CACHE_MS=5*60*1000,FAILURE_MS=15000;
const escape=value=>String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
function publicUrl(value){if(typeof value!=="string"||!value.trim())return "";try{const url=new URL(value,"https://livepalmes.invalid/");return url.protocol==="https:"&&!url.username&&!url.password?(url.origin==="https://livepalmes.invalid"?url.pathname+url.search+url.hash:url.href):"";}catch{return "";}}
const types={pool:"Piscine",openWater:"Eau libre",training:"Formation",stage:"Stage",meeting:"Réunion",other:"Autre"};
const levels={national:"National",international:"International",regional:"Régional",departemental:"Départemental"};
 function directLink(event,today=model.parisToday()){
  const id=String(event?.id||'').match(/^legacy-nap-([1-9]\d*)$/)?.[1],direct=event?.direct;
  if(!id||event.canceled||direct?.state!=='active'||direct.url!=='direct.html?id='+id||event.date>today||(event.endDate||event.date)<today)return null;
  return {url:direct.url,label:'Direct activé'};
 }
function eventHtml(event,major,today){
 const dates=model.eventDateLabel(event.date,event.endDate||event.date),direct=directLink(event,today),result=publicUrl(event.results?.url||event.results?.pdfUrl||"");
 return `<article class="public-home-event${major?" public-home-event-major":""}${direct?" public-home-event-live":""}"><time class="public-home-event-date" datetime="${escape(event.date)}" aria-label="${escape(dates.label)}"><strong>${escape(dates.day)}</strong><span>${escape(dates.month)}</span></time><div class="public-home-event-copy"><a class="public-home-event-title" href="competition.html?id=${escape(encodeURIComponent(event.id))}">${escape(event.name||"Rendez-vous")}</a><p class="public-home-event-meta"><span class="public-home-event-location" title="${escape([String(event.city||'').trim(),types[event.eventType],levels[event.level]].filter(Boolean).join(' · '))}">${escape([String(event.city||'').trim(),types[event.eventType],levels[event.level]].filter(Boolean).join(' · '))}</span>${direct?`<a class="public-home-direct" href="${escape(direct.url)}" aria-label="LivePalmes Direct : séries et résultats de ${escape(event.name)}">${direct.label}</a>`:''}</p>${result?`<a class="public-home-event-results" href="${escape(result)}">Résultats →</a>`:""}</div></article>`;
}
function eventsHtml(events,now){
 if(!events)return '<p class="public-home-state">Les rendez-vous sont momentanément indisponibles. Consultez le calendrier.</p>';
 const groups=model.eventGroups(events,model.parisToday(now));
 const html=[["En cours",groups.ongoing,true],[groups.majorTitle,groups.major,true],["Les prochains rendez-vous en région",groups.upcoming,false]].filter(([,items])=>items.length).map(([title,items,highlight])=>{
  const collapsible=items===groups.upcoming&&items.length>3;
  const cards=items.map(event=>eventHtml(event,highlight&&["national","international"].includes(event.level),model.parisToday(now)));
  return `<section class="public-home-group${collapsible?" public-home-upcoming-collapsed":""}"><h3>${escape(title)}</h3>${collapsible?cards.slice(0,3).join("")+`<div class="public-home-events-extra" id="publicHomeEventsMore">${cards.slice(3).join("")}</div><button type="button" class="public-home-events-toggle" aria-expanded="false" aria-controls="publicHomeEventsMore" data-more-count="${items.length-3}">Voir les ${items.length-3} suivants</button>`:cards.join("")}</section>`;
 }).join("");
 return html||'<p class="public-home-state">Aucun rendez-vous à venir pour le moment.</p>';
}
function documentsHtml(items,now){
 if(!items)return '<p class="public-home-state">Les documents sont momentanément indisponibles. Consultez la bibliothèque.</p>';
 return items.slice(0,6).map(item=>{const url=publicUrl(item.url),date=model.publicationLabel(item.publishedAt,item.publishedOn),tag=url?"a":"article";return `<${tag} class="public-home-document"${url?` href="${escape(url)}" target="_blank" rel="noopener noreferrer"`:""}><strong>${escape(item.title||"Document officiel")}${model.isNewDocument(item.publishedAt,now)?'<span class="public-home-new">Nouveau</span>':""}</strong>${date?`<small>${escape(date)}</small>`:""}${url?"":"<small>Lien momentanément indisponible.</small>"}</${tag}>`;}).join("")||'<p class="public-home-state">Retrouvez les documents dans la bibliothèque documentaire.</p>';
}
function render(value,now=Date.now()){
 let html=template.replace('data-public-section="home"','data-public-section="home" data-home-prepared="true"');
 for(const [id,content]of [["publicHomeEvents",eventsHtml(value.events,now)],["publicHomeDocuments",documentsHtml(value.documents,now)]]){
  const pattern=new RegExp(`(<div[^>]*id="${id}"[^>]*>)[\\s\\S]*?</div>`);
  if(!pattern.test(html))throw Error("Modèle accueil incompatible.");
  html=html.replace(pattern,(_,opening)=>opening+content+"</div>");
 }
 return html;
}
async function readEvents(pool,environment){
 const now=Date.now(),value=await calendar.read(pool,now);if(!environment)return value;
 const today=model.parisToday(now),ongoing=value.events.filter(event=>event.date<=today&&event.endDate>=today&&!event.canceled);
 // The existing enddate window caps this indexed batch at 500 public IDs.
 const linked=await require('./nap-direct-public').attachLinks(pool,environment,ongoing,new Map(),{clock:()=>now});
 const byId=new Map(linked.map(event=>[event.id,event]));return {...value,events:value.events.map(event=>byId.get(event.id)||event)};
}
async function read(pool,environment){
 const [events,docs]=await Promise.allSettled([readEvents(pool,environment),documents.readFeatured(pool)]);
 return {events:events.status==="fulfilled"?events.value.events:null,documents:docs.status==="fulfilled"?docs.value:null};
}
function createReader(load,clock=()=>Date.now()){
 let saved=null,expires=0,day="",pending=null;
 return async()=>{
  const today=model.parisToday(clock());
  if(saved&&clock()<expires&&today===day)return {...saved,html:render(saved,clock())};
  if(!pending)pending=Promise.resolve().then(load).catch(()=>({events:null,documents:null})).then(value=>{saved=value;day=model.parisToday(clock());expires=clock()+(value.events&&value.documents?CACHE_MS:FAILURE_MS);}).finally(()=>{pending=null;});
  await pending;
  return {...saved,html:render(saved,clock())};
 };
}
const readers=new WeakMap();
async function readPage(pool,environment=require('./livepalmes-environment').livePalmesEnvironment().name){
 if(!readers.has(pool))readers.set(pool,new Map());const byEnvironment=readers.get(pool);
 if(!byEnvironment.has(environment))byEnvironment.set(environment,createReader(()=>read(pool,environment)));
 return byEnvironment.get(environment)();
}
module.exports={CACHE_MS,FAILURE_MS,publicUrl,render,read,createReader,readPage};
