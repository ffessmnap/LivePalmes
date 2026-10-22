(function(global){
 'use strict';
 let dialog,config,documents=[],after=null,busy=false,current=null,returnFocus=null,generation=0,authUid='';
 const allowed=()=>global.LivePalmesPortalAuth?.isAdminAuthenticated()&&global.LivePalmesPortalAuth.hasCapability('engagements.national.manage');
 const node=(tag,text,className)=>{const e=document.createElement(tag);if(text)e.textContent=text;if(className)e.className=className;return e;};
 const el=id=>dialog.querySelector(`#nationalLibrary${id}`);
 async function call(name,input){const f=global.firebase.app().functions(global.LivePalmesAppConfig?.firebaseFunctionsRegion||'europe-west1');return (await (global.LivePalmesAppConfig?.configureFunctionsService?.(f)||f).httpsCallable(name)(input)).data;}
 const manage=input=>call(['list','detail'].includes(input.action)?'getNationalFeaturedDocuments':'saveNationalFeaturedDocuments',{...input,library:true});
 function status(text){el('Status').textContent=text;}
 function setBusy(value){busy=value;dialog.querySelectorAll('button,input,select,textarea').forEach(e=>{e.disabled=value;});}
 function ensure(){
  if(dialog)return;
  dialog=node('dialog',null,'admin-engagements-create-dialog admin-national-library-dialog');dialog.setAttribute('aria-labelledby','nationalLibraryTitle');
  dialog.innerHTML='<header class="admin-featured-documents-head"><div><p>Administration nationale</p><h2 id="nationalLibraryTitle">Bibliothèque documentaire</h2></div><button type="button" class="ghost-button" id="nationalLibraryClose">Fermer</button></header><p>Déposez les documents généraux et choisissez les rubriques où ils apparaissent. Les documents propres à une compétition restent gérés dans sa fiche.</p><div id="nationalLibraryListPanel"><div class="national-library-toolbar"><button type="button" id="nationalLibraryAdd">Ajouter un document</button><button type="button" class="ghost-button" id="nationalLibraryRefresh">Actualiser</button></div><form id="nationalLibrarySearchForm" class="admin-featured-documents-search"><label>Rechercher un document<input id="nationalLibrarySearch" type="search" maxlength="100"></label><button type="submit" class="ghost-button">Rechercher</button></form><div id="nationalLibraryList"></div><button type="button" class="ghost-button" id="nationalLibraryMore" hidden>Afficher la suite</button></div><form id="nationalLibraryForm" class="national-library-form" hidden><h3 id="nationalLibraryFormTitle">Ajouter un document</h3><label id="nationalLibraryFileLabel">Fichier (10 Mo maximum)<input type="file" id="nationalLibraryFile" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.odt,.ods,.odp,.numbers,.jpg,.jpeg,.png,.webp,.zip"></label><label>Titre<input id="nationalLibraryName" maxlength="160" required></label><label>Description<textarea id="nationalLibraryDescription" maxlength="500" rows="3"></textarea></label><fieldset><legend>Rubriques de la bibliothèque (au moins une)</legend><div id="nationalLibraryThemes" class="national-library-themes"></div></fieldset><div class="national-library-fields"><label>Type de document<select id="nationalLibraryType" required></select></label><label>Classement détaillé<select id="nationalLibraryRubric" required></select></label></div><label class="national-library-notify"><input type="checkbox" id="nationalLibraryNotify"> Prévenir les responsables des clubs par mail après l’enregistrement</label><small>Les préférences des destinataires et le réglage national des mails sont respectés. Sur TEST, aucun mail n’est envoyé par ce parcours. Une confirmation du nombre de destinataires précède l’envoi.</small><div class="national-library-toolbar"><button type="submit" id="nationalLibrarySave">Mettre en ligne</button><button type="button" class="ghost-button" id="nationalLibraryCancel">Annuler</button></div></form><p id="nationalLibraryStatus" role="status" aria-live="polite"></p>';
  document.body.append(dialog);
  el('Close').addEventListener('click',()=>{if(!busy&&(el('Form').hidden||global.confirm('Abandonner la saisie ?')))dialog.close();});
  dialog.addEventListener('cancel',event=>{if(busy||!el('Form').hidden&&!global.confirm('Abandonner la saisie ?'))event.preventDefault();});
  dialog.addEventListener('close',()=>{generation++;returnFocus?.focus();});
  el('Add').addEventListener('click',()=>edit(null));
  el('Cancel').addEventListener('click',()=>{el('Form').hidden=true;el('ListPanel').hidden=false;el('Add').focus();status('');});
  el('Refresh').addEventListener('click',()=>load(true));
  el('More').addEventListener('click',()=>load(false));
  el('SearchForm').addEventListener('submit',event=>{event.preventDefault();load(true);});
  el('Form').addEventListener('submit',event=>{event.preventDefault();save();});
  el('File').addEventListener('change',()=>{if(!el('Name').value)el('Name').value=(el('File').files[0]?.name||'').replace(/\.[^.]+$/,'').slice(0,160);});
  el('List').addEventListener('click',event=>{const button=event.target.closest('[data-library-action]');if(!button||busy)return;const item=documents.find(x=>x.id===Number(button.dataset.id));if(item)button.dataset.libraryAction==='edit'?edit(item.id):remove(item.id);});
 }
 function render(){
  const list=el('List');list.replaceChildren();
  if(!documents.length)list.append(node('p','Aucun document dans cette page. Modifiez la recherche ou affichez la suite si elle est proposée.'));
  for(const item of documents){
   const row=node('article',null,'admin-featured-document-row'),copy=node('div',null,'admin-featured-document-copy');
   let url;try{url=new URL(item.url);if(url.protocol!=='https:'||url.username||url.password)url=null;}catch{url=null;}
   const title=node(url?'a':'strong',item.title);if(url){title.href=url.href;title.target='_blank';title.rel='noopener noreferrer';}copy.append(title,node('small',[item.typeLabel,item.rubricLabel].filter(Boolean).join(' · ')));
   const actions=node('div',null,'admin-featured-document-controls');for(const [action,label]of [['edit','Modifier'],['delete','Supprimer']]){const b=node('button',label,'ghost-button compact');b.type='button';b.dataset.libraryAction=action;b.dataset.id=item.id;actions.append(b);}row.append(copy,actions);list.append(row);
  }
  el('More').hidden=!after;
 }
 async function load(reset){
  if(busy)return;setBusy(true);status('Chargement des documents…');const run=++generation;
  if(reset){documents=[];after=null;render();}
  try{const result=await manage({action:'list',search:el('Search').value.trim(),after:reset?null:after});if(run!==generation||!allowed())return;config=result;documents=reset?result.documents:[...documents,...result.documents];after=result.nextAfterId;render();status('');}
  catch(error){if(run===generation)status(error.message||'Chargement indisponible. Réessayez.');}
  finally{setBusy(false);}
 }
 function fillSelect(target,items,value){target.replaceChildren();for(const item of items){const option=node('option',item.label);option.value=item.id;target.append(option);}if(value!=null&&!items.some(x=>x.id===value)){const option=node('option',`Classement actuel (n° ${value})`);option.value=value;target.append(option);}if(value!=null)target.value=String(value);if(!target.value)target.selectedIndex=0;}
 async function edit(documentId){
  if(busy||!config)return;setBusy(true);status('');
  try{
   current=documentId?(await manage({action:'detail',documentId})).document:null;
   if(!allowed()||!dialog.open)return;
   el('Form').reset();el('Name').value=current?.title||'';el('Description').value=current?.description||'';
   el('FormTitle').textContent=current?'Modifier le document':'Ajouter un document';el('Save').textContent=current?'Enregistrer':'Mettre en ligne';
   el('FileLabel').hidden=Boolean(current);el('File').required=!current;
   fillSelect(el('Type'),config.types,current?.typeId||3);fillSelect(el('Rubric'),config.rubrics,current?.rubricId);
   el('Themes').replaceChildren();for(const theme of config.themes){const label=node('label'),check=node('input');check.type='checkbox';check.value=theme.id;check.checked=current?.themeIds.includes(theme.id)||false;label.append(check,document.createTextNode(theme.label));el('Themes').append(label);}
   el('Form').hidden=false;el('ListPanel').hidden=true;
  }catch(error){status(error.message);}finally{setBusy(false);if(!el('Form').hidden)el('Name').focus();}
 }
 function readFile(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error('Lecture du fichier impossible.'));reader.readAsDataURL(file);});}
 async function notify(documentId){
  const preview=await call('notifyEngagementCompetitionDocuments',{library:true,action:'preview',documentId});
  if(preview.disabled)return preview.test?'Document enregistré. TEST : aucun mail envoyé.':'Document enregistré. Le réglage national désactive les mails ; aucun envoi.';
  if(!preview.recipientCount)return 'Document enregistré. Aucun destinataire éligible aux notifications.';
  const scope=preview.scope==='idf'?'Le pilote national limite les destinataires à l’Île-de-France. ':'Tous les clubs disposant de destinataires éligibles sont concernés. ';
  if(!global.confirm(`${scope}Envoyer un mail à ${preview.recipientCount} responsable(s) de ${preview.clubCount} club(s) pour ce document ?`))return 'Document enregistré. Notification annulée.';
  let offset=0,sent=0,errors=0,result;
  do{status(`Document enregistré. Envoi des notifications… ${sent} envoyé(s).`);result=await call('notifyEngagementCompetitionDocuments',{library:true,action:'send',documentId,expectedFingerprint:preview.fingerprint,offset});sent+=result.sentCount;errors+=result.errorCount;offset=result.nextOffset;}while(!result.done);
  return `Document enregistré. ${sent} mail(s) envoyé(s), ${errors} en erreur.${result.interrupted?' Envoi interrompu : consultez le suivi des mails.':''}`;
 }
 async function save(){
  if(busy||!allowed())return;
  const themeIds=[...el('Themes').querySelectorAll('input:checked')].map(x=>Number(x.value));
  if(!themeIds.length){status('Choisissez au moins une rubrique.');el('Themes').querySelector('input')?.focus();return;}
  const file=el('File').files[0];if(!current&&(!file||!file.size||file.size>10*1024*1024)){status('Choisissez un fichier non vide de 10 Mo maximum.');return;}
  const wantsNotify=el('Notify').checked,previous=current,run=generation;
  setBusy(true);status('Enregistrement du document…');let saved=false,finalMessage='';
  try{
   const result=await manage({action:current?'update':'upload',documentId:current?.id,expectedFingerprint:current?.fingerprint,title:el('Name').value.trim(),description:el('Description').value.trim(),typeId:Number(el('Type').value),rubricId:Number(el('Rubric').value),themeIds,...(!current?{fileName:file.name,fileDataUrl:await readFile(file)}:{})});
   saved=true;
   if(run!==generation||!dialog.open||!allowed())return;
   current=result.document;el('Form').hidden=true;el('ListPanel').hidden=false;
   finalMessage=wantsNotify?await notify(result.document.id):'Document enregistré. Aucun mail demandé.';
  }catch(error){finalMessage=saved?`Document enregistré, mais la notification n’a pas abouti : ${error.message}. Ne déposez pas le fichier une seconde fois.`:`${error.message} Vérifiez la liste avant de reprendre l’opération.`;if(!saved)current=previous;}
  finally{setBusy(false);if(run===generation&&dialog.open){if(saved)await load(true);status(finalMessage);}}
 }
 async function remove(documentId){
  if(busy||!allowed())return;setBusy(true);status('');let message='';
  try{const saved=(await manage({action:'detail',documentId})).document;if(!global.confirm(`Retirer « ${saved.title} » de toutes les rubriques de la bibliothèque et de l’accueil ? Le fichier original et l’historique seront conservés. Aucun mail ne sera envoyé.`))return;await manage({action:'delete',documentId,expectedFingerprint:saved.fingerprint});message='Document retiré de la publication. Aucun mail envoyé.';}
  catch(error){message=error.message;}finally{setBusy(false);if(message){await load(true);status(message);}}
 }
 async function open(trigger){if(!allowed()||dialog?.open)return;ensure();authUid=global.firebase.auth().currentUser?.uid||'';returnFocus=trigger;el('Form').hidden=true;el('ListPanel').hidden=false;dialog.showModal();await load(true);}
 document.addEventListener('click',event=>{const trigger=event.target.closest('[data-national-library-open]');if(trigger){event.preventDefault();open(trigger);}});
 let attempts=0;function subscribe(){if(global.LivePalmesPortalAuth?.onChange)global.LivePalmesPortalAuth.onChange(()=>{if(dialog?.open&&(!allowed()||authUid!==(global.firebase.auth().currentUser?.uid||''))){dialog.close();documents=[];config=null;}});else if(attempts++<20)setTimeout(subscribe,100);}subscribe();
})(window);
