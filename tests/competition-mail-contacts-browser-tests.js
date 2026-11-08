"use strict";
require("./helpers/offline-network");
const assert=require("node:assert/strict"),fs=require("node:fs");
const {startStaticServer,launchBrowser,waitFor}=require("../tools/capture-portal-design");
const {evaluate}=require("./helpers/portal-browser-evaluate");
(async()=>{
 const {server,baseUrl}=await startStaticServer(),browser=await launchBrowser(),client=browser.client;
 try{for(const width of [1280,390,320]){
  await client.send("Emulation.setDeviceMetricsOverride",{width,height:950,deviceScaleFactor:1,mobile:width<1000});
  await client.send("Page.navigate",{url:baseUrl+"/portail.html"});assert.ok(await waitFor(client,"document.readyState === 'complete'",12000));
  await evaluate(client,`await Promise.all(Array.from(document.querySelectorAll('[data-portal-style-src]')).map(link=>new Promise(resolve=>{link.onload=resolve;link.href=link.dataset.portalStyleSrc;})));
    const form=document.createElement('form');form.className='admin-engagements-form';form.style.maxWidth='720px';form.style.padding='16px';
    for(const id of ['adminEngagementsEditOrganizerEmail','adminEngagementsEditComputerEmail','adminEngagementsEditOfficialsManagerEmail'])form.append(document.getElementById(id).closest('label').cloneNode(true));
    document.body.replaceChildren(form);document.body.className='admin-portal-page';window.contacts=[];
    for(const input of form.querySelectorAll('input')){input.value='personne@example.org ; autre.personne@example.org';contacts.push({id:input.id,type:input.type,valid:input.checkValidity(),max:input.maxLength});}
    window.contactEventErrors=[];window.addEventListener('error',event=>contactEventErrors.push(event.message));`);
  await evaluate(client,fs.readFileSync("assets/portal/deferred/competition-settings.js","utf8"));
  await evaluate(client,fs.readFileSync("assets/portal/deferred/club-and-competition.js","utf8"));
  await evaluate(client,fs.readFileSync("assets/portal/club-and-competition.js","utf8"));
  await evaluate(client,fs.readFileSync("assets/portal/deferred/workspace-events.js","utf8"));
  const validation=await evaluate(client,`const form=document.querySelector('form');const inputs=Array.from(form.querySelectorAll('input'));const state={};window.contactsContext={state,actions:{markEngagementDetailTabDirty:()=>{window.contactDirty=(window.contactDirty||0)+1;}},config:{},elements:{engagementsHomeLinks:[],engagementsEditForm:form,engagementsEditOrganizerEmail:inputs[0],engagementsEditComputerEmail:inputs[1],engagementsEditOfficialsManagerEmail:inputs[2]}};
    Object.assign(contactsContext.actions,LivePalmesPortalClubAndCompetition.create(contactsContext));
    LivePalmesPortalDeferred.sync(contactsContext,'workspace-events','bindWorkspaceEvents',[],{});
    const inputEvent=input=>input.dispatchEvent(new Event('input',{bubbles:true}));
    const three='a@example.org;b@example.org;c@example.org';const checks=[];
    for(const input of inputs){
      input.value=three;inputEvent(input);const accepted=form.checkValidity();
      input.value=three+';d@example.org';inputEvent(input);const refused=!form.checkValidity();
      input.value=three+';A@EXAMPLE.ORG';inputEvent(input);const repaired=form.checkValidity();
      input.value=three;inputEvent(input);
      checks.push({accepted,refused,repaired,help:document.getElementById(input.getAttribute('aria-describedby'))?.textContent,ownHelp:input.closest('label').contains(document.getElementById(input.getAttribute('aria-describedby')))});
    }
    state.selectedEngagementCompetition={napSource:true};state.nativeCompetitionEditBaseline={organizerEmail:three+';d@example.org',computerEmail:three,officialsManagerEmail:three};
    inputs[0].value=state.nativeCompetitionEditBaseline.organizerEmail;inputEvent(inputs[0]);
    if(!form.checkValidity()||inputs[0].value!==state.nativeCompetitionEditBaseline.organizerEmail)throw Error('Historical list was changed or blocked');
    inputs[0].value=three;inputEvent(inputs[0]);
    return {checks,errors:contactEventErrors,dirty:contactDirty};`);
  assert.deepEqual(validation.errors,[]);assert.equal(validation.dirty,14);
  assert.ok(validation.checks.every(item=>item.accepted&&item.refused&&item.repaired&&item.ownHelp&&item.help==='Jusqu’à 3 adresses e-mail, séparées par un point-virgule.'),JSON.stringify(validation));
  const links=await evaluate(client,`return {contacts,link:LivePalmesPortalDeferred.sync(contactsContext,'competition-settings','engagementEmailLinkValue',[' Personne@example.org ; autre.personne@example.org ; PERSONNE@example.org'],{})};`);
  assert.ok(links.contacts.every(item=>item.type==='text'&&item.valid&&item.max===255));
  assert.equal(links.link.href,'mailto:personne@example.org,autre.personne@example.org');
  assert.equal(links.link.label,'personne@example.org ; autre.personne@example.org');
  const geometry=await evaluate(client,"return {width:innerWidth,scroll:document.documentElement.scrollWidth,inputs:Array.from(document.querySelectorAll('input')).map(el=>({left:el.getBoundingClientRect().left,right:el.getBoundingClientRect().right}))};");
  assert.ok(geometry.scroll<=geometry.width&&geometry.inputs.every(item=>item.left>=0&&item.right<=geometry.width),JSON.stringify(geometry));
  fs.mkdirSync('tmp/competition-mail-contacts-three',{recursive:true});fs.writeFileSync(`tmp/competition-mail-contacts-three/${width}.png`,Buffer.from((await client.send('Page.captureScreenshot',{format:'png'})).data,'base64'));
  console.log(`${width}px: three actual fields accept 3 distinct addresses, reject 4, clear errors after repair, show their own help and remain visible without overflow.`);
 }}finally{browser.cleanup();server.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
