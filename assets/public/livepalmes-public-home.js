(function(global){
 "use strict";
 const model=global.LivePalmesHomeModel;
 const node=(tag,className,text)=>{const element=document.createElement(tag);if(className)element.className=className;if(text)element.textContent=text;return element;};
 const types={pool:"Piscine",openWater:"Eau libre",training:"Formation",stage:"Stage",meeting:"Réunion",other:"Autre"};
 const levels={national:"National",international:"International",regional:"Régional",departemental:"Départemental"};
 async function read(action){
  const endpoint=global.LivePalmesEnvironment?.napReaderUrl;
  if(!endpoint)throw Error("Consultation indisponible.");
  const url=new URL(endpoint);url.searchParams.set("action",action);
  const response=await fetch(url,{cache:"no-store",signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw Error("Consultation indisponible.");
  const value=await response.json();if(value.source!=="nap")throw Error("Consultation indisponible.");return value;
 }
 function eventCard(event,major){
  const article=node("article",`public-home-event${major?" public-home-event-major":""}`);
  const dates=model.eventDateLabel(event.date,event.endDate||event.date);
  const date=node("div","public-home-event-date");date.setAttribute("aria-hidden","true");
  date.append(node("strong","",dates.day),node("span","",dates.month));
  const copy=node("div","public-home-event-copy"),title=node("a","public-home-event-title",event.name||"Rendez-vous");
  title.href=`competition.html?id=${encodeURIComponent(event.id)}`;
  copy.append(title,node("p","",[dates.label,event.city||event.location,types[event.eventType],levels[event.level]].filter(Boolean).join(" · ")));
  const resultsUrl=event.results?.url||event.results?.pdfUrl;
  if(resultsUrl){
   try{const url=new URL(resultsUrl,global.location.href);if((url.protocol==="https:"||url.origin===global.location.origin)&&!url.username&&!url.password){const link=node("a","public-home-event-results","Résultats →");link.href=url.href;copy.append(link);}}catch{ /* An invalid optional result link is omitted. */ }
  }
  article.append(date,copy);return article;
 }
 function renderEvents(host,events,stale){
  const groups=model.eventGroups(events),fragment=document.createDocumentFragment();
  for(const [title,items,highlight] of [["En cours",groups.ongoing,true],[groups.majorTitle,groups.major,true],["Les prochains rendez-vous en région",groups.upcoming,false]]){
   if(!items.length)continue;
   const section=node("section","public-home-group");section.append(node("h3","",title));
   if(items===groups.upcoming&&items.length>3){
    for(const event of items.slice(0,3))section.append(eventCard(event,false));
    const extra=node("div","public-home-events-extra");extra.id=`${host.id}More`;section.classList.add("public-home-upcoming-collapsed");
    for(const event of items.slice(3))extra.append(eventCard(event,false));
    const toggle=node("button","public-home-events-toggle",`Voir les ${items.length-3} suivants`);toggle.type="button";toggle.setAttribute("aria-expanded","false");toggle.setAttribute("aria-controls",extra.id);
    toggle.addEventListener("click",()=>{const expanded=toggle.getAttribute("aria-expanded")!=="true";toggle.setAttribute("aria-expanded",String(expanded));section.classList.toggle("public-home-upcoming-collapsed",!expanded);toggle.textContent=expanded?"Réduire la liste":`Voir les ${items.length-3} suivants`;});
    section.append(extra,toggle);
   }else for(const event of items)section.append(eventCard(event,highlight&&["national","international"].includes(event.level)));
   fragment.append(section);
  }
  if(!fragment.childNodes.length)fragment.append(node("p","public-home-state","Aucun rendez-vous à venir pour le moment."));
  if(stale)fragment.append(node("p","public-home-state","Actualisation en retard. Les derniers rendez-vous disponibles restent affichés."));
  host.replaceChildren(fragment);
 }
 function renderDocuments(host,documents){
  const fragment=document.createDocumentFragment();
  for(const item of (Array.isArray(documents)?documents:[]).slice(0,6)){
   let url;try{url=new URL(item.url);if(url.protocol!=="https:"||url.username||url.password)url=null;}catch{url=null;}
   const link=node(url?"a":"article","public-home-document");if(url){link.href=url.href;link.target="_blank";link.rel="noopener noreferrer";}
   const title=node("strong","",item.title||"Document officiel");
   if(model.isNewDocument(item.publishedAt))title.append(node("span","public-home-new","Nouveau"));
   link.append(title);
   const date=model.publicationLabel(item.publishedAt,item.publishedOn);if(date)link.append(node("small","",date));if(!url)link.append(node("small","","Lien momentanément indisponible."));
   fragment.append(link);
  }
  if(!fragment.childNodes.length)fragment.append(node("p","public-home-state","Retrouvez les documents dans la bibliothèque documentaire."));
  host.replaceChildren(fragment);
 }
 async function init(){
  const events=document.getElementById("publicHomeEvents"),documents=document.getElementById("publicHomeDocuments");
  if(!events||!documents||!model)return;
  await Promise.allSettled([
   read("home-events").then(value=>renderEvents(events,value.events,value.stale===true)).catch(()=>events.replaceChildren(node("p","public-home-state","Les rendez-vous sont momentanément indisponibles. Consultez le calendrier."))),
   read("documents-featured").then(value=>renderDocuments(documents,value.documents)).catch(()=>documents.replaceChildren(node("p","public-home-state","Les documents sont momentanément indisponibles. Consultez la bibliothèque.")))
  ]);
 }
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})(window);
