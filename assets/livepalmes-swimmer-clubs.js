(function(global){
 "use strict";
 let tools;
 function getTools(callFunction){
  if(tools)return tools;
  let cached=null,expires=0,pending=null;
  async function clubs(){
   if(cached&&Date.now()<expires)return cached;
   if(!pending)pending=callFunction("listEngagementNationalClubs",{}).then(result=>{
    if(result.source!=="nap"||!Array.isArray(result.clubs)||result.clubs.length>1000)throw new Error("Annuaire des clubs indisponible.");
    cached=result.clubs;expires=Date.now()+60000;return cached;
   }).finally(()=>{pending=null;});
   return pending;
  }
  const label=club=>[club.clubCode,club.clubName].filter(Boolean).join(" — ")||String(club.clubId);
  function mount(container,currentId="",blank=false,merge=false){
   const search=document.createElement("input"),select=document.createElement("select"),message=document.createElement("small");
   search.type="search";search.placeholder="Rechercher un club";search.setAttribute("aria-label","Rechercher le club");
   select.required=true;select.setAttribute("aria-label","Club du nageur");select.setCustomValidity("Chargement des clubs en cours.");
   select.add(new Option("Chargement des clubs…",""));container.replaceChildren(search,select,message);
   let rows=[],chosen=blank?"":String(currentId);
   const normalize=value=>String(value).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
   function render(){
    const query=normalize(search.value);select.replaceChildren(new Option("Choisir le club",""));
    for(const row of rows)if(String(row.clubId)===chosen||normalize(label(row)).includes(query))select.add(new Option(label(row),String(row.clubId)));
    select.value=chosen;
   }
   search.addEventListener("input",render);select.addEventListener("change",()=>{chosen=select.value;});
   const ready=clubs().then(result=>{
    if(!container.contains(select))return;
    rows=result;render();select.setCustomValidity("");message.textContent=merge?"Les clubs historiques reconnus sont conservés. Si le club d’une performance est inconnu, celui de sa fiche d’origine sera enregistré avant la fusion.":"Le club des performances historiques n’est pas modifié. Cette affectation peut modifier l’accès aux engagements existants.";
   }).catch(error=>{if(container.contains(select)){select.setCustomValidity("Annuaire indisponible. Fermez puis réessayez.");message.textContent=error.message;}});
   return {ready,select,value:()=>select.value,label:()=>rows.find(row=>String(row.clubId)===select.value)?label(rows.find(row=>String(row.clubId)===select.value)):select.value};
  }
  async function chooseFinalClub({target,sources}){
   const dialog=document.createElement("dialog"),form=document.createElement("form"),heading=document.createElement("h2"),context=document.createElement("p"),field=document.createElement("div"),actions=document.createElement("div"),confirm=document.createElement("button"),cancel=document.createElement("button");
   dialog.className="admin-swimmer-club-dialog";heading.textContent="Club après la fusion";
   const name=[target.firstName,target.lastName].filter(Boolean).join(" ");
   context.textContent=`Fiche conservée : ${name}. Choisissez son club actuel après la fusion.`;
   field.className="admin-swimmer-club-field";actions.className="admin-portal-actions";confirm.type="submit";confirm.textContent="Continuer";cancel.type="button";cancel.textContent="Annuler";cancel.className="ghost-button";
   actions.append(confirm,cancel);form.append(heading,context,field,actions);dialog.append(form);document.body.append(dialog);
   const conflict=sources.some(source=>String(source.clubId)!==String(target.clubId));
   const control=mount(field,target.clubId,conflict,true);
   return new Promise(resolve=>{
    let result=null;cancel.addEventListener("click",()=>dialog.close());
    form.addEventListener("submit",event=>{event.preventDefault();if(!form.reportValidity())return;result={clubId:control.value(),label:control.label()};dialog.close();});
    dialog.addEventListener("close",()=>{dialog.remove();resolve(result);},{once:true});dialog.showModal();control.select.focus();
   });
  }
  tools={mount,chooseFinalClub};return tools;
 }
 global.LivePalmesSwimmerClubs={getTools};
})(window);
