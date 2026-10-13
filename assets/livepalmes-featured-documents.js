(function(global){
 "use strict";
 const model=global.LivePalmesFeaturedDocumentsModel.create();
 let dialog=null,loaded=false,saving=false,generation=0,catalogueGeneration=0,controller=null,after=null,catalogue=[],timer=null,authUid="";
 const node=(tag,className,text)=>{const element=document.createElement(tag);if(className)element.className=className;if(text)element.textContent=text;return element;};
 const allowed=()=>global.LivePalmesPortalAuth?.isAdminAuthenticated()&&global.LivePalmesPortalAuth.hasCapability("engagements.national.manage");
 function functionsService(){
  const service=global.firebase.app().functions(global.LivePalmesAppConfig?.firebaseFunctionsRegion||"europe-west1");
  return global.LivePalmesAppConfig?.configureFunctionsService?.(service)||service;
 }
 const call=async(name,payload={})=>(await functionsService().httpsCallable(name)(payload)).data;
 function element(id){return dialog.querySelector(`#${id}`);}
 function message(text){element("featuredDocumentsStatus").textContent=text;}
 function ensureDialog(){
  if(dialog)return dialog;
  dialog=node("dialog","admin-engagements-create-dialog admin-featured-documents-dialog");dialog.id="adminFeaturedDocumentsDialog";dialog.setAttribute("aria-labelledby","featuredDocumentsTitle");
  dialog.innerHTML='<header class="admin-featured-documents-head"><div><p>Administration nationale</p><h2 id="featuredDocumentsTitle">Documents</h2></div><button class="ghost-button" type="button" data-featured-close>Fermer</button></header><div id="featuredDocumentsLanding"><p>Choisissez les documents publics à présenter sur l’accueil.</p><button class="ghost-button" type="button" id="featuredDocumentsOpenEditor">Documents mis en avant →</button><p><a href="bibliotheque.html" target="_blank" rel="noopener">Consulter la bibliothèque documentaire →</a></p></div><section id="featuredDocumentsEditor" hidden><nav aria-label="Fil d’Ariane"><button class="ghost-button compact" type="button" id="featuredDocumentsBack">Documents</button><span> › Documents mis en avant</span></nav><p>Jusqu’à six documents généraux publics. Quatre à six sont conseillés. Retirer un document de cette sélection conserve son original.</p><form id="featuredDocumentsSearchForm" class="admin-featured-documents-search"><label>Rechercher un document<input id="featuredDocumentsSearch" type="search" maxlength="100" autocomplete="off"></label><button class="ghost-button" type="submit">Rechercher</button></form><div class="admin-featured-documents-columns"><section aria-labelledby="featuredDocumentsCatalogueTitle"><h3 id="featuredDocumentsCatalogueTitle">Bibliothèque</h3><div id="featuredDocumentsCatalogue"></div><button class="ghost-button compact" id="featuredDocumentsMore" type="button" hidden>Afficher la suite</button></section><section aria-labelledby="featuredDocumentsSelectedTitle"><h3 id="featuredDocumentsSelectedTitle">Documents mis en avant <span id="featuredDocumentsCount"></span></h3><ol id="featuredDocumentsSelected"></ol></section></div><section id="featuredDocumentsPreview" aria-label="Aperçu des documents utiles" hidden></section><div class="admin-featured-documents-actions"><button class="ghost-button" id="featuredDocumentsPreviewToggle" type="button">Aperçu</button><button class="ghost-button" id="featuredDocumentsCancel" type="button">Annuler les changements</button><button id="featuredDocumentsSave" type="button" disabled>Enregistrer</button></div></section><p id="featuredDocumentsStatus" class="admin-portal-message" role="status"></p>';
  document.body.append(dialog);
  const columns=element("featuredDocumentsEditor").querySelector(".admin-featured-documents-columns");columns.prepend(columns.lastElementChild);
  dialog.addEventListener("cancel",event=>{if(saving||model.dirty()&&!global.confirm("Abandonner les changements non enregistrés ?"))event.preventDefault();});
  dialog.addEventListener("close",()=>{generation++;controller?.abort();clearTimeout(timer);saving=false;});
  dialog.addEventListener("click",event=>{
   const close=event.target.closest("[data-featured-close]");if(close){if(!saving&&(!model.dirty()||global.confirm("Abandonner les changements non enregistrés ?")))dialog.close();return;}
   const action=event.target.closest("[data-featured-action]");if(!action||saving||!loaded)return;
   const id=Number(action.dataset.featuredId);
   if(action.dataset.featuredAction==="add"){const item=catalogue.find(row=>row.id===id);if(item)model.add(item);}
   else if(action.dataset.featuredAction==="remove")model.remove(id);
   else model.move(id,action.dataset.featuredAction==="up"?-1:1);
   render();
  });
  element("featuredDocumentsOpenEditor").addEventListener("click",openEditor);
  element("featuredDocumentsBack").addEventListener("click",()=>{if(saving)return;if(model.dirty()&&!global.confirm("Abandonner les changements non enregistrés ?"))return;model.cancel();element("featuredDocumentsTitle").textContent="Documents";element("featuredDocumentsEditor").hidden=true;element("featuredDocumentsLanding").hidden=false;message("");});
  element("featuredDocumentsSearchForm").addEventListener("submit",event=>{event.preventDefault();loadCatalogue(true);});
  element("featuredDocumentsSearch").addEventListener("input",()=>{clearTimeout(timer);controller?.abort();catalogueGeneration++;after=null;catalogue=[];element("featuredDocumentsMore").disabled=true;timer=setTimeout(()=>loadCatalogue(true),300);});
  element("featuredDocumentsMore").addEventListener("click",()=>loadCatalogue(false));
  element("featuredDocumentsCancel").addEventListener("click",()=>{model.cancel();render();message("Changements annulés.");});
  element("featuredDocumentsPreviewToggle").addEventListener("click",()=>{const preview=element("featuredDocumentsPreview");preview.hidden=!preview.hidden;renderPreview();if(!preview.hidden)preview.scrollIntoView({block:"start",behavior:"smooth"});});
  element("featuredDocumentsSave").addEventListener("click",save);
  return dialog;
 }
 function button(label,action,id,disabled=false){const button=node("button","ghost-button compact",label);button.type="button";button.dataset.featuredAction=action;button.dataset.featuredId=String(id);button.disabled=disabled||saving||!loaded;return button;}
 function documentTitle(item){
  let url;try{url=new URL(item.url);if(url.protocol!=="https:"||url.username||url.password)throw Error();}catch{return node("strong","",item.title||"Document indisponible");}
  const link=node("a","",item.title||"Document officiel");link.href=url.href;link.target="_blank";link.rel="noopener noreferrer";return link;
 }
 function render(){
  const focused=document.activeElement?.dataset?.featuredAction?{id:document.activeElement.dataset.featuredId,action:document.activeElement.dataset.featuredAction}:null;
  const selected=model.documents(),selectedList=element("featuredDocumentsSelected");selectedList.replaceChildren();
  selected.forEach((item,index)=>{const row=node("li","admin-featured-document-row"),copy=node("div","admin-featured-document-copy");copy.append(documentTitle(item));const date=global.LivePalmesHomeModel.publicationLabel(item.publishedAt,item.publishedOn);if(date)copy.append(node("small","",date));const actions=node("div","admin-featured-document-controls");actions.append(button("Monter","up",item.id,index===0),button("Descendre","down",item.id,index===selected.length-1),button("Retirer","remove",item.id));row.append(copy,actions);selectedList.append(row);});
  element("featuredDocumentsCount").textContent=`(${selected.length}/6)`;
  const results=element("featuredDocumentsCatalogue");results.replaceChildren();
  for(const item of catalogue){const row=node("article","admin-featured-document-row"),copy=node("div","admin-featured-document-copy");copy.append(documentTitle(item));copy.append(node("small","",[item.typeLabel,item.rubricLabel].filter(Boolean).join(" · ")));const chosen=selected.some(row=>row.id===item.id);row.append(copy,button(chosen?"Déjà choisi":!item.url?"Lien indisponible":"Ajouter","add",item.id,chosen||selected.length>=6||!item.url));results.append(row);}
  element("featuredDocumentsSave").disabled=!loaded||saving||!model.dirty();
  element("featuredDocumentsCancel").disabled=!loaded||saving||!model.dirty();
  element("featuredDocumentsPreviewToggle").disabled=!loaded||saving;
  element("featuredDocumentsSearch").disabled=saving;
  dialog.querySelector("[data-featured-close]").disabled=saving;
  renderPreview();
  if(focused&&!saving){const action=focused.action==="add"?"remove":focused.action;const candidates=[...dialog.querySelectorAll("[data-featured-action]")].filter(button=>button.dataset.featuredId===focused.id&&!button.disabled);const target=candidates.find(button=>button.dataset.featuredAction===action)||candidates[0];target?.focus();}
 }
 function renderPreview(){
  const preview=element("featuredDocumentsPreview");preview.replaceChildren(node("h3","","Documents utiles"));
  for(const item of model.documents()){if(item.available===false&&!Object.hasOwn(item,"linkAvailable"))continue;const row=node("div","admin-featured-document-row"),copy=node("div","admin-featured-document-copy");copy.append(documentTitle(item));if(global.LivePalmesHomeModel.isNewDocument(item.publishedAt))copy.append(node("span","public-home-new","Nouveau"));const date=global.LivePalmesHomeModel.publicationLabel(item.publishedAt,item.publishedOn);if(date)copy.append(node("small","",date));if(!item.url)copy.append(node("small","","Lien momentanément indisponible."));row.append(copy);preview.append(row);}
 }
 async function loadCatalogue(reset){
  if(saving)return;clearTimeout(timer);controller?.abort();controller=new AbortController();const active=generation,activeCatalogue=++catalogueGeneration;
  if(reset){after=null;catalogue=[];}
  element("featuredDocumentsMore").disabled=true;
  try{
   const url=new URL(global.LivePalmesEnvironment.napReaderUrl);url.searchParams.set("action","documents-catalogue");if(after)url.searchParams.set("after",String(after));if(element("featuredDocumentsSearch").value.trim())url.searchParams.set("search",element("featuredDocumentsSearch").value.trim());
   const currentController=controller;
   const response=await fetch(url,{cache:"no-store",signal:controller.signal});if(!response.ok)throw Error("La bibliothèque est momentanément indisponible.");const value=await response.json();
   if(active!==generation||activeCatalogue!==catalogueGeneration||currentController!==controller||!dialog.open)return;if(value.source!=="nap"||!Array.isArray(value.documents))throw Error("Réponse documentaire invalide.");
   for(const item of value.documents)if(!catalogue.some(row=>row.id===item.id))catalogue.push(item);
   after=value.nextAfterId;element("featuredDocumentsMore").hidden=!value.hasMore;element("featuredDocumentsMore").textContent=element("featuredDocumentsSearch").value.trim()?"Poursuivre la recherche":"Afficher la suite";
   render();message(catalogue.length?"":value.hasMore?"Aucun résultat dans cette page. Vous pouvez afficher la suite.":"Aucun document ne correspond à votre recherche.");
  }catch(error){if(active===generation&&activeCatalogue===catalogueGeneration&&error.name!=="AbortError")message(error.message||"Bibliothèque indisponible.");}
  finally{if(active===generation&&activeCatalogue===catalogueGeneration)element("featuredDocumentsMore").disabled=false;}
 }
 async function openEditor(){
  if(!allowed())return;
  element("featuredDocumentsTitle").textContent="Documents mis en avant";element("featuredDocumentsLanding").hidden=true;element("featuredDocumentsEditor").hidden=false;loaded=false;const active=++generation;message("Chargement de la sélection…");
  render();loadCatalogue(true);
  try{const value=await call("getNationalFeaturedDocuments");if(active!==generation||!dialog.open||!allowed())return;model.load(value);loaded=true;render();message("");}
  catch(error){if(active===generation)message(error.message||"Sélection indisponible.");}
 }
 async function save(){
  if(!allowed()||!loaded||saving||!model.dirty())return;
  saving=true;controller?.abort();clearTimeout(timer);const active=generation;render();message("Enregistrement…");
  try{const value=await call("saveNationalFeaturedDocuments",model.payload());if(active!==generation||!dialog.open||!allowed())return;model.load(value);message("La sélection de l’accueil est enregistrée.");}
  catch(error){if(active===generation)message(`${error.message||"Enregistrement à vérifier."} Fermez puis rouvrez cet écran pour recharger la sélection avant de reprendre.`);}
  finally{if(active===generation){saving=false;render();}}
 }
 function open(){if(!allowed())return;ensureDialog();model.load({documents:[],fingerprint:"0".repeat(64)});loaded=false;element("featuredDocumentsTitle").textContent="Documents";element("featuredDocumentsLanding").hidden=false;element("featuredDocumentsEditor").hidden=true;message("");dialog.showModal();}
 function init(){
  document.addEventListener("click",event=>{if(event.target.closest("[data-national-documents-open]")){event.preventDefault();open();}});
  function refresh(){document.querySelectorAll("[data-national-documents-open],[data-national-documents-panel]").forEach(button=>{button.hidden=!allowed();});const uid=global.firebase?.auth?.()?.currentUser?.uid||"";if(dialog?.open&&(!allowed()||authUid&&authUid!==uid)){generation++;controller?.abort();dialog.close();}authUid=uid;}
  let attempts=0;function subscribe(){if(global.LivePalmesPortalAuth?.onChange)global.LivePalmesPortalAuth.onChange(refresh);else if(attempts++<20)setTimeout(subscribe,100);}subscribe();
 }
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})(window);
