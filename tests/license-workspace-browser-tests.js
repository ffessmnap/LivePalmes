"use strict";
// Real portal markup/module, isolated synthetic services and no network.
const fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict");
const {chromium}=require("playwright");
async function main(){
  const portal=fs.readFileSync("portail.html","utf8"),start=portal.indexOf('<section class="admin-engagements-card admin-national-page-card admin-license-admin"'),end=portal.indexOf('<section class="admin-engagements-card admin-national-page-card" aria-label="Nageurs"',start);
  const markup=portal.slice(start,end).replace('data-engagements-national-panel="licenses" hidden','data-engagements-national-panel="licenses"');
  const css=["styles.css","assets/livepalmes-admin-portal.css","assets/livepalmes-portal-appearance.css","assets/livepalmes-license-administration.css"].map(f=>fs.readFileSync(f,"utf8")).join("\n");
  const browser=await chromium.launch({headless:true,...(process.env.LIVEPALMES_BROWSER_EXECUTABLE?{executablePath:process.env.LIVEPALMES_BROWSER_EXECUTABLE}:{})});
  try{for(const width of[1440,1280,390]){
    const page=await browser.newPage({viewport:{width,height:950}}),errors=[];page.on("pageerror",e=>errors.push(e.message));await page.route("**/*",r=>r.abort());
    await page.setContent(`<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style><body class="admin-portal-page"><main style="padding:12px">${markup}</main></body></html>`);
    await page.evaluate(()=>{
      window.calls=[];window.fail=false;
      const competitions=[{id:"legacy-nap-1",name:"Coupe d’automne",date:"2026-11-08",city:"Tours"},{id:"legacy-nap-2",name:"Meeting régional des palmes",date:"2026-11-22",city:"Angers"},{id:"legacy-nap-3",name:"Rencontre interclubs",date:"2026-12-06",city:"Rennes"}].map(c=>({...c,entryDeadlineAt:"2000-10-01T12:00:00Z"}));
      const report={competitionId:"1",status:"issues",completedAt:"2026-10-27T12:00:00Z",counts:{total:65,valid:64,expired:1,notFound:0,other:0},revision:"report-1",current:true};
      window.LivePalmesLicenseAdministration={canManage:()=>true,licensesChanged(){},openSwimmer(){},callFunction:async(name,input)=>{
        calls.push({name,input});if(fail)throw Error("Service momentanément indisponible");
        if(name==="listEngagementCompetitions")return {competitions};
        if(input.action==="summaries")return {reports:{1:report,2:{...report,competitionId:"2",status:"ok"}}};
        if(input.action==="readReport")return {report:input.competitionId.endsWith("3")?null:report};
        if(input.action==="completeReport")return {report};
        if(input.action==="previewReport")return {report,recipients:[{email:"regional@example.invalid",name:"Admin régional"},{email:"informatique@example.invalid",role:"Informatique"}],subject:"Contrôle <test>",text:"Compétiteurs contrôlés : 65\nLicences valides : 64\nLicences expirées : 1\nEXEMPLE Camille · Club A · A-26-1 — Licence expirée",disabled:true,previewOnly:true,fingerprint:"preview-1"};
        if(input.action==="sendReport")throw Error("Real sending forbidden in fixture");
        const ids=input.competitionIds.map(id=>id.replace("legacy-nap-",""));return {source:"nap",season:{label:document.querySelector('#adminLicenseControlSeason').value,requiredValidityDate:"2027-12-31"},batchId:"fixture",competitions:competitions.filter(c=>input.competitionIds.includes(c.id)).map(c=>({...c,id:c.id.replace("legacy-nap-","")})),controlReports:{1:report},controlMemberships:{1:"members-1"},people:Array.from({length:65},(_,i)=>({livePalmesId:String(i+1),firstName:"Camille",lastName:"NAGEUR "+String(i+1).padStart(2,"0"),birthDate:"2000-01-01",clubName:"Club A",clubId:"6",licenseNumber:`A-26-${i+1}`,seasonStatus:"valid",competitionIds:ids,competitions:["Coupe d’automne"]}))};
      }};
    });
    await page.addScriptTag({path:"assets/livepalmes-license-administration.js"});
    assert.equal(await page.evaluate(()=>calls.length),0,"No data before actual opening");
    await page.evaluate(()=>document.dispatchEvent(new Event("livepalmes:license-admin-open")));
    await page.locator('[data-license-report="legacy-nap-1"]').waitFor();assert.equal(await page.locator('[data-control-state="ok"]').count(),1);assert.equal(await page.locator('[data-control-state="issues"]').count(),1);assert.equal(await page.locator('[data-control-state="none"]').count(),1);
    await page.locator('#adminLicenseControlCompetitions input[value="legacy-nap-1"]').check();
    const before=await page.evaluate(()=>calls.length);await page.locator('#adminLicenseControlCompetitionSearch').fill("Angers");assert.equal(await page.locator('#adminLicenseControlCompetitions input').count(),1);await page.locator('#adminLicenseControlCompetitionSearch').fill("");assert.equal(await page.locator('#adminLicenseControlCompetitions input[value="legacy-nap-1"]').isChecked(),true);assert.equal(await page.evaluate(()=>calls.length),before);
    await page.locator('#adminLicenseControlPrepare').click();await page.locator('[data-license-person-id="65"]').waitFor();assert.equal(await page.locator('[data-license-person-id]').count(),65,"All rows, more than twelve, without pages");
    if(width>680)assert.ok(await page.locator('[data-license-person-id]').first().evaluate(e=>e.getBoundingClientRect().height<=48),"Desktop rows stay compact");
    const reads=await page.evaluate(()=>calls.length);await page.locator('#adminLicenseControlSearch').fill("NAGEUR 65");assert.equal(await page.locator('[data-license-person-id]').count(),1);assert.equal(await page.evaluate(()=>calls.length),reads);await page.locator('#adminLicenseControlSearch').fill("");
    await page.locator('#adminLicenseControlCompetitions input[value="legacy-nap-2"]').check();assert.equal(await page.locator('#adminLicenseControlExport').isDisabled(),true);assert.match(await page.locator('#adminLicenseControlSummary').innerText(),/Sélection modifiée/);await page.locator('#adminLicenseControlCompetitions input[value="legacy-nap-2"]').uncheck();assert.equal(await page.locator('#adminLicenseControlExport').isDisabled(),false);
    await page.locator('#adminLicenseControlReport').click();await page.locator('[data-report-preview]:enabled').waitFor();await page.locator('[data-report-preview]').click();await page.locator('#adminLicenseControlDialog pre').waitFor();assert.match(await page.locator('#adminLicenseControlDialog pre').innerText(),/EXEMPLE Camille/);assert.equal(await page.locator('[data-report-send]').isDisabled(),true);assert.match(await page.locator('#adminLicenseControlDialog').innerText(),/aucun mail réel envoyé/);assert.equal(await page.locator('#adminLicenseControlDialog script').count(),0);
    await page.locator('[data-report-close]').click();
    if(process.env.LIVEPALMES_LICENSE_SCREENSHOTS){const out=path.resolve("outputs/license-workspace");fs.mkdirSync(out,{recursive:true});await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:path.join(out,`desktop-${width}.png`),fullPage:false});}
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);assert.equal(overflow,false,`No page overflow at ${width}`);assert.deepEqual(errors,[]);await page.close();
  }}finally{await browser.close();}
  console.log("Licence workspace browser: desktop/mobile, all 65 rows, local filters, stable selection, stale batch and TEST mail preview passed offline.");
}
main().catch(error=>{console.error(error);process.exitCode=1;});
