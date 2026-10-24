"use strict";
// Local renderer fixture only: all network requests are blocked.
const fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict");
const {spawnSync}=require("node:child_process");
const {chromium}=require("playwright");
(async()=>{
 const out=path.resolve("outputs/activity-journal-20261024");fs.mkdirSync(out,{recursive:true});
 const fixture=path.join(out,"fixture.html");
 const result=spawnSync(process.execPath,["tests/activity-journal-tests.js"],{env:{...process.env,JOURNAL_UI_FIXTURE:fixture},encoding:"utf8"});assert.equal(result.status,0,result.stderr);
 const browser=await chromium.launch({headless:true,executablePath:process.env.LIVEPALMES_BROWSER_EXECUTABLE||"C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"});
 try{for(const width of [1440,390,320]){
  const page=await browser.newPage({viewport:{width,height:900}});await page.route("**/*",route=>route.abort());
  await page.setContent(fs.readFileSync(fixture,"utf8"));
  assert.equal(await page.locator(".admin-national-audit-day").count(),2);
  assert.equal(await page.locator(".admin-national-audit-entry").count(),2);
  await page.locator(".admin-national-audit-entry > summary").first().click();
  assert.ok((await page.locator(".admin-national-audit-entry[open]").innerText()).includes("Inactif"));
  assert.ok((await page.locator(".admin-national-audit-entry[open]").innerText()).includes("Actif"));
  await page.locator(".admin-national-audit-entry > summary").last().focus();await page.keyboard.press("Enter");
  assert.equal(await page.locator(".admin-national-audit-entry[open]").count(),2);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`Overflow ${width}`);
  await page.screenshot({path:path.join(out,`journal-${width}.png`),fullPage:true});await page.close();
 }
 console.log("Journal browser: actual renderer, separate authors, before/after, pending result, keyboard and 1440/390/320px OK");
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
