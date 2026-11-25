"use strict";
const assert = require("node:assert/strict"), fs = require("node:fs"), path = require("node:path");
const { startStaticServer, launchBrowser, evaluate, waitFor } = require("../tools/capture-portal-design");
const { publicSportingPayload } = require("../functions/nap-public-privacy");
const birthday = "2004-06-17";
const person = { id: "1", firstName: "Paul", lastName: "FICTIF", name: "Paul FICTIF", birthDate: birthday, sex: "M", club: "ABC", clubName: "Club fictif", identityKey: "FICTIF|PAUL|" + birthday, aliases: [], sourceIds: ["1"] };
const row = { id: "1", source: "nap", swimmerId: "1", swimmerIdentityKey: person.identityKey, swimmer: person.name, firstName: person.firstName, lastName: person.lastName, birthDate: birthday, sex: "M", competitionId: "1", competition: "Compétition fictive", date: "2025-05-01", seasonYear: 2025, location: "Piscine fictive", pool: "50", chrono: "E", course: "50SF", courseLabel: "50 m Surface", courseShortLabel: "50 SF", style: "SF", length: 50, category: "S", categoryCode: "HSE", categoryLabel: "Senior", timeValue: 2000, time: "00:20.00", club: "ABC", clubName: "Club fictif" };
const rows = [row,{...row,id:"2",seasonYear:2021,date:"2021-05-01",category:"J",categoryLabel:"Juniors",timeValue:2300,time:"23.00"},
  {...row,id:"3",isIntermediate:true,originCourseShortLabel:"100 SF",timeValue:1800,time:"18.00"},
  {...row,id:"4",pool:"25",timeValue:2000,time:"20.00"},
  {...row,id:"5",pool:"33",category:"C",categoryLabel:"Cadets",seasonYear:2019,date:"2019-05-01",timeValue:2500,time:"25.00"},
  {...row,id:"6",pool:"25",category:"J",categoryLabel:"Juniors",seasonYear:2021,date:"2021-06-01",timeValue:2142,time:"21.42"}];
const payload = publicSportingPayload({ source: "nap", swimmer: { ...person, rows, rowCount:6,performanceCount:5 } }, "offline-browser-fixture");
async function main() {
  const { server, baseUrl } = await startStaticServer(); let browser;
  const output = path.resolve("tmp/audit-a1-browser"); fs.mkdirSync(output, { recursive: true });
  try {
    browser = await launchBrowser(); const client = browser.client;
    await client.send("Network.enable");
    await client.send("Network.setBlockedURLs", { urls: ["https://*"] });
    await client.send("Page.addScriptToEvaluateOnNewDocument", { source: `
      window.__privacyReads=[];window.__privacyErrors=[];window.addEventListener('error',event=>__privacyErrors.push(event.message));window.addEventListener('unhandledrejection',event=>__privacyErrors.push(String(event.reason)));const originalFetch=window.fetch.bind(window),profile=${JSON.stringify(payload)};
      window.fetch=async function(input,options){const url=new URL(String(input),location.href);if(url.origin===location.origin)return originalFetch(input,options);
        window.__privacyReads.push(url.searchParams.get('action'));let data;
        if(url.searchParams.get('action')==='swimmer')data=profile;
        else if(url.searchParams.get('action')==='records')data={source:'nap',revision:1,data:{records:[{category:"C",sex:"M",course:"50SF",value:1850,time:"18.50"}],franceRecords:[{recordType:"RF",sex:"M",course:"50SF",bassin:"50",value:1750,time:"17.50"}],filters:{}}};
        else if(url.searchParams.get('action')==='category-benchmarks'){
          const pool=url.searchParams.get('pool');
          if(url.searchParams.get('grouping')!=='category')throw Error('Expected one row per category');
          data={source:'nap',groups:[{category:"J",pool,count:19},{category:"S",pool,count:url.searchParams.get('period')==='all'?67:20,lower:1900,median:2100,upper:2250}]};
        }
        else if(url.searchParams.get('action')==='search')data={source:'nap',swimmers:[profile.swimmer]};
        else throw Error('External network forbidden in A1 fixture');
        return new Response(JSON.stringify(data),{status:200,headers:{'Content-Type':'application/json'}});
      };` });
    for (const width of [390, 1440]) {
      await client.send("Emulation.setDeviceMetricsOverride", { width, height: 950, deviceScaleFactor: 1, mobile: width < 700 });
      await client.send("Page.navigate", { url: baseUrl + "/performances/nageur.html?id=1" });
      const ready = await waitFor(client, "document.querySelector('#swimmerTitle')?.textContent === 'Paul FICTIF (2004)' && window.__privacyReads.includes('records') && document.querySelector('#swimmerStatus')?.textContent === ''", 12000);
      assert.ok(ready, "Year visible at " + width + ": " + JSON.stringify(await evaluate(client, "return {status:document.querySelector('#swimmerStatus')?.textContent,profile:document.querySelector('#swimmerProfilePanel')?.textContent,reads:__privacyReads,errors:__privacyErrors}")));
      const proof = await evaluate(client, `return {profile:document.querySelector('#swimmerProfilePanel').textContent,body:document.body.innerText,reads:__privacyReads,title:document.querySelector('#swimmerTitle').textContent,yearWeight:getComputedStyle(document.querySelector('#swimmerTitle span')).fontWeight}`);
      assert.equal(proof.title, "Paul FICTIF (2004)");
      assert.equal(proof.yearWeight, "400");
      assert.ok(!proof.body.includes("Année de naissance"));
      assert.ok(!proof.body.includes(birthday) && !proof.body.includes("17/06/2004"));
      assert.ok(proof.reads.includes("swimmer") && proof.reads.includes("records"));
      const shot = await client.send("Page.captureScreenshot", { format: "png" });
      fs.writeFileSync(path.join(output, `profile-${width}.png`), Buffer.from(shot.data, "base64"));
      const entry = await evaluate(client, `const trigger=document.querySelector('[data-progress-course]');
        return {hint:document.querySelector('#swimmerExploreHint').innerText,action:trigger.getAttribute('aria-label'),decoration:getComputedStyle(trigger).textDecorationLine};`);
      assert.match(entry.hint,/nom d’une course/);
      assert.match(entry.action,/Voir la courbe de progression/);
      assert.ok(entry.decoration.includes("underline"));
      const explorer = await evaluate(client, `document.querySelector('[data-progress-course]').click();
        const count=()=>document.querySelectorAll('#swimScatter [data-mark]').length;
        const initial=count();document.querySelector('#swimSplits').click();const all=count();
        const pick=document.querySelector('#swimPick');
        const options=[...pick.options].map(option=>option.textContent);
        pick.selectedIndex=options.findIndex(label=>label.endsWith('18.00'));
        pick.dispatchEvent(new Event('change'));
        const detail=document.querySelector('#swimDetail').textContent;
        const displayTime=document.querySelector('#swimResultTime').textContent;
        const curveToggle=document.querySelector('#swimBest');
        const vertices=()=>document.querySelector('.swim-curve').getAttribute('points').split(' ').map(point => {
          const [x,y]=point.split(',');
          return document.querySelector('[data-mark][transform="translate('+x+' '+y+')"] title')?.textContent;
        });
        const times=vertices(),oneCurve=curveToggle.checked && document.querySelectorAll('.swim-curve').length===1;
        curveToggle.click();
        document.querySelector('#swimmerPoolFilter [data-value="25"]').click();
        const off=!curveToggle.checked && !document.querySelector('.swim-curve');
        curveToggle.click();
        const shortTimes=vertices();
        document.querySelector('#swimmerPoolFilter [data-value="50"]').click();const long=count(),longTimes=vertices();
        const season=document.querySelector('#swimmerSeasonFilter');season.value='range';season.dispatchEvent(new Event('input'));
        const end=document.querySelector('#swimmerLastSeason');end.value='2021';end.dispatchEvent(new Event('change'));
        const zoom=count(),readsBefore=__privacyReads.filter(a=>a==='category-benchmarks').length;
        document.querySelector('#swim-career').scrollIntoView({block:'start',behavior:'instant'});
        return {initial,all,long,zoom,readsBefore,off,oneCurve,times,shortTimes,longTimes,options,detail,displayTime,single:!document.querySelector('.swim-curve'),best:document.querySelector('#swimResultTime').textContent};`);
      assert.equal(explorer.displayTime,"20.00");
      assert.ok(explorer.options.includes("01/05/2025 · 20.00 · 25 m") && explorer.options.includes("01/05/2025 · 20.00 · 50 m"));
      assert.ok(explorer.options.includes("01/05/2025 · 18.00"));
      assert.equal(explorer.detail,"Temps de passage du 100 SF · Compétition fictive · Piscine fictive · 50 m");
      assert.ok(explorer.oneCurve && explorer.off && explorer.single);
      const timesOnly=vertices=>vertices.map(text=>text.split(" · ")[1]);
      assert.deepEqual(timesOnly(explorer.times),["25.00","21.42","20.00"]);
      assert.deepEqual(timesOnly(explorer.shortTimes),["21.42","20.00"]);
      assert.deepEqual(timesOnly(explorer.longTimes),["23.00","20.00"]);
      assert.equal(explorer.best,"23.00");
      assert.deepEqual([explorer.initial,explorer.all,explorer.long,explorer.zoom,explorer.readsBefore],[5,6,3,1,0]);
      assert.ok(await waitFor(client,"document.querySelector('#swimCareerRows').innerText.includes('19 nageurs · Médiane affichée à partir de 20 nageurs')",5000));
      const layout = await evaluate(client, `const rect = selector => document.querySelector(selector).getBoundingClientRect();
        const middle = selector => { const box=rect(selector); return box.top + box.height / 2; };
        return {
        legend:document.querySelector('#swimCareerLegend').innerText,
        seasonsInline:[...document.querySelectorAll('.swim-category-head')].every(head=>{
          const title=head.querySelector('h4').getBoundingClientRect();
          const seasons=head.querySelector('.swim-seasons').getBoundingClientRect();
          return seasons.left>=title.right && seasons.top<title.bottom && seasons.right<=head.querySelector('strong').getBoundingClientRect().left;
        }),
        legendBelow:rect('#swimCareerLegend').top >= rect('#swimCareerRows').bottom,
        periodChoicesAligned:Math.abs(middle('.swim-period label:first-child') - middle('.swim-period label:last-child')) < 2,
        checkboxAligned:Math.abs(middle('.swim-check') - middle('.swim-period')) < 2,
        stacked:rect('#swimResultTime').bottom <= rect('#swim-history').top && rect('#swim-history').bottom <= rect('#swim-career').top,
        personalBold:[...document.querySelectorAll('.swim-times span')].every(el=> (Number(getComputedStyle(el).fontWeight)>=700)===el.classList.contains('swim-personal-time')),
        border:getComputedStyle(document.querySelector('#progressPanel')).borderTopWidth,
        defaultPeriod:document.querySelector('#swimComparisonPeriod input:checked').value
      };`);
      for (const label of ["Meilleur chrono du nageur","Moitié centrale des chronos","Médiane"]) assert.ok(layout.legend.includes(label));
      assert.ok(!layout.legend.includes("MPF ou record en vigueur"));
      assert.equal(layout.border,"0px");
      assert.ok(layout.legendBelow && layout.periodChoicesAligned && layout.stacked && layout.personalBold && layout.seasonsInline);
      assert.equal(layout.checkboxAligned,width === 1440);
      assert.equal(layout.defaultPeriod,"all");
      assert.ok(await evaluate(client,`return !document.querySelector('#swimRefs').checked && document.querySelector('#swimCareerRows').innerText.includes('67 nageurs');`));
      const disclosure = await evaluate(client, `const list = document.querySelectorAll('#swimCareerRows details');
        const item = list[0], summary = item.querySelector('summary'), detail = item.querySelector('p');
        const closed = !item.open && !item.innerText.includes('Moitié centrale') && summary.innerText.includes('Voir les repères');
        const reads = __privacyReads.length;
        summary.click();
        const open = item.open && detail.offsetHeight > 0 && summary.innerText.includes('Masquer les repères');
        const text = detail.innerText;
        summary.click();
        return {count:list.length,closed,open,text,folded:!item.open,sameReads:reads===__privacyReads.length};`);
      assert.deepEqual(disclosure,{count:1,closed:true,open:true,text:"Médiane 21.00 · Moitié centrale de 19.00 à 22.50",folded:true,sameReads:true});
      await evaluate(client, "document.querySelector('#swim-career').scrollIntoView({block:'start',behavior:'instant'});");
      const careerShot = await client.send("Page.captureScreenshot", { format: "png" });
      fs.writeFileSync(path.join(output, `career-${width}.png`), Buffer.from(careerShot.data,"base64"));
      const trackSelector = ".swim-category:last-of-type .swim-times";
      const visibleTimes = `[...document.querySelector('${trackSelector}').children].filter(el=>getComputedStyle(el).visibility==='visible')`;
      const wide = await evaluate(client,`return ${visibleTimes}.length;`);
      await evaluate(client,"document.querySelector('#swimCareerRows').style.width='92px';");
      assert.ok(await waitFor(client,`${visibleTimes}.length < ${wide}`,2000));
      const scaleTimes = await evaluate(client,`const track=document.querySelector('${trackSelector}');
        const labels=${visibleTimes};
        const boxes=labels.map(el=>el.getBoundingClientRect()).sort((a,b)=>a.left-b.left);
        const result={personal:labels.includes(track.firstElementChild),
          fits:boxes.every((b,i)=>b.left>=track.getBoundingClientRect().left-1 && b.right<=track.getBoundingClientRect().right+1 && (!i || b.left>=boxes[i-1].right+5))};
        document.querySelector('#swimCareerRows').style.width='';
        return result;`);
      assert.ok(scaleTimes.personal && scaleTimes.fits);
      const career = await evaluate(client,`const root=document.querySelector('#swimCareerRows');
        const categories=[...root.querySelectorAll('h4')].map(el=>el.textContent),bands=root.querySelectorAll('.swim-band').length;
        const hidden=!root.innerText.includes('RF 17.50');document.querySelector('#swimRefs').click();
        return {categories,bands,hidden,rf:root.innerText.includes('RF 17.50'),calls:__privacyReads.filter(a=>a==='category-benchmarks').length,
          fits:root.scrollWidth<=root.clientWidth+1,errors:__privacyErrors};`);
      assert.deepEqual(career,{categories:["Juniors","Senior"],bands:1,rf:true,hidden:true,calls:1,fits:true,errors:[]});
      await evaluate(client,`document.querySelector('#swimmerPoolFilter [data-value=""]').click();
        document.querySelector('#swimComparisonPeriod [value="swimmer"]').click();`);
      assert.ok(await waitFor(client,"document.querySelector('#swimCareerRows').innerText.includes('20 nageurs')",5000));
      assert.ok(await evaluate(client,`const period=document.querySelector('#swimComparisonPeriod');
        return period.querySelector('input:checked').value==='swimmer' && !period.querySelector('summary');`));
      const overview=await evaluate(client,`const rows=document.querySelectorAll('#swimCareerRows .swim-category');
        return {labels:[...rows].map(r=>r.querySelector('h4').textContent),mpf:rows[0].querySelector('.swim-ref-text')?.textContent,
          filter33:!!document.querySelector('#swimmerPoolFilter [data-value="33"]')};`);
      assert.deepEqual(overview,{labels:["Cadets","Juniors","Senior"],mpf:"▲ MPF 18.50",filter33:false});
      const back = await evaluate(client,`document.querySelector('[data-progress-reset]').click();
        return {course:document.activeElement.dataset.progressCourse,hint:!document.querySelector('#swimmerExploreHint').hidden};`);
      assert.deepEqual(back,{course:"50SF",hint:true});
      assert.ok(await evaluate(client,`document.activeElement.click();
        return document.querySelector('#swimComparisonPeriod input:checked').value==='all' && !document.querySelector('#swimRefs').checked;`));
    }
    console.log("Public profile: actual page at 390/1440px, year-only display, profile/history and synthetic reads verified; external HTTPS blocked.");
  } finally { browser?.cleanup(); server.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
