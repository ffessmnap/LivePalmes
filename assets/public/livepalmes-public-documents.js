(function(global){
 "use strict";
 function init(){
  const form=document.getElementById("publicDocumentsFilters"),list=document.getElementById("publicDocumentsList"),status=document.getElementById("publicDocumentsStatus"),more=document.getElementById("publicDocumentsMore");
  if(!form||!list||!status||!more)return;
  const search=document.getElementById("publicDocumentsSearch"),type=document.getElementById("publicDocumentsType"),rubric=document.getElementById("publicDocumentsRubric");
  const params=new URLSearchParams(global.location.search);
  let theme=params.get("theme")||"",initialRubric=params.get("rubric")||"",after=null,controller=null,requestId=0,timer=null,loading=false;
  const node=(tag,className,text)=>{const element=document.createElement(tag);if(className)element.className=className;if(text)element.textContent=text;return element;};
  function facets(select,items,label){
   const selected=select.value||(select===rubric?initialRubric:"");
   select.replaceChildren(new Option(label,""));
   for(const item of Array.isArray(items)?items:[])select.add(new Option(item.label,item.id===0?"other":String(item.id)));
   if([...select.options].some(option=>option.value===selected))select.value=selected;
   if(select===rubric)initialRubric="";
  }
  function themes(items){
   const nav=document.getElementById("publicDocumentsThemes");if(!nav)return;
   const fragment=document.createDocumentFragment();
   for(const item of [{id:"",label:"Tous les documents"},...(Array.isArray(items)?items:[])]){
    const id=String(item.id),url=new URL(global.location.href);url.search="";if(id)url.searchParams.set("theme",id);
    const link=node("a","ghost-button compact",item.label);link.href=url.pathname+url.search;
    if(id===theme)link.setAttribute("aria-current","page");
    link.addEventListener("click",event=>{
     if(event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
     event.preventDefault();theme=id;initialRubric="";rubric.value="";type.value="";search.value="";load(true);
    });fragment.append(link);
   }
   nav.replaceChildren(fragment);
  }
  function documentLink(item){
   let url;try{url=new URL(item.url);if(url.protocol!=="https:"||url.username||url.password)url=null;}catch{url=null;}
   const link=node(url?"a":"article","public-home-document");if(url){link.href=url.href;link.target="_blank";link.rel="noopener noreferrer";}
   const title=node("strong","",item.title||"Document officiel");
   if(global.LivePalmesHomeModel.isNewDocument(item.publishedAt))title.append(node("span","public-home-new","Nouveau"));
   link.append(title,node("small","",[item.typeLabel,item.rubricLabel].filter(Boolean).join(" · ")));
   const publication=global.LivePalmesHomeModel.publicationLabel(item.publishedAt,item.publishedOn);if(publication)link.append(node("small","",publication));if(!url)link.append(node("small","","Lien momentanément indisponible."));return link;
  }
  async function load(reset){
   clearTimeout(timer);
   if(!reset&&loading)return;
   if(controller)controller.abort();controller=new AbortController();const active=++requestId;
   loading=true;more.disabled=true;list.setAttribute("aria-busy","true");status.textContent="Chargement des documents…";
   if(reset){after=null;more.hidden=true;list.replaceChildren();}
   try{
    const url=new URL(global.LivePalmesEnvironment.napReaderUrl);url.searchParams.set("action","documents-catalogue");
    if(theme)url.searchParams.set("theme",theme);
    if(search.value.trim())url.searchParams.set("search",search.value.trim());
    if(type.value)url.searchParams.set("type",type.value);
    if(rubric.value||initialRubric)url.searchParams.set("rubric",rubric.value||initialRubric);
    if(after!=null)url.searchParams.set("after",String(after));
    const response=await fetch(url,{cache:"no-store",signal:controller.signal});if(!response.ok)throw Error("Indisponible");
    const value=await response.json();if(value.source!=="nap"||!Array.isArray(value.documents))throw Error("Indisponible");if(active!==requestId)return;
    themes(value.themes);
    const selected=(value.themes||[]).find(item=>String(item.id)===theme);
    const heading=document.getElementById("publicDocumentsTitle");if(heading)heading.textContent=selected?selected.label:"Tous les documents";
    const address=new URL(global.location.href);address.search="";
    for(const key of ["theme","rubric","type","search"])if(url.searchParams.has(key))address.searchParams.set(key,url.searchParams.get(key));
    global.history.replaceState(null,"",address.pathname+address.search);
    facets(type,value.types,"Tous les types");facets(rubric,value.rubrics,"Toutes les rubriques");
    const fragment=document.createDocumentFragment();for(const item of value.documents){const link=documentLink(item);if(link)fragment.append(link);}list.append(fragment);
    after=value.nextAfterId;more.hidden=value.hasMore!==true;more.textContent=search.value.trim()||type.value||rubric.value?"Poursuivre la recherche":"Afficher la suite";
    status.textContent=list.childElementCount?`${list.childElementCount} document${list.childElementCount>1?"s":""} affiché${list.childElementCount>1?"s":""}${value.hasMore?" · Suite disponible":""}.`:value.hasMore?"Aucun document disponible dans cette page. Vous pouvez afficher la suite.":"Aucun document ne correspond à votre recherche.";
   }catch(error){if(active===requestId&&error.name!=="AbortError"){status.textContent="La bibliothèque est momentanément indisponible. Réessayez dans quelques instants.";more.hidden=true;}}
   finally{if(active===requestId){loading=false;more.disabled=false;list.setAttribute("aria-busy","false");}}
  }
  form.addEventListener("submit",event=>{event.preventDefault();load(true);});
  search.addEventListener("input",()=>{clearTimeout(timer);if(controller)controller.abort();requestId++;after=null;more.hidden=true;more.disabled=true;timer=setTimeout(()=>load(true),300);});
  type.addEventListener("change",()=>load(true));rubric.addEventListener("change",()=>load(true));more.addEventListener("click",()=>load(false));
  load(true);
 }
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})(window);
