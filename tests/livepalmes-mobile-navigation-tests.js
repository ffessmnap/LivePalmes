"use strict";
const assert = require("node:assert/strict"), fs = require("node:fs"), vm = require("node:vm");
const source = fs.readFileSync(require("node:path").join(__dirname, "../assets/public/livepalmes-mobile-navigation.js"), "utf8");
class Element {
  constructor(tag) { this.tagName=tag; this.children=[]; this.attributes={}; this.events={}; this.dataset={}; this.hidden=false; this.classes=new Set(); this.classList={contains:n=>this.classes.has(n),toggle:(n,v)=>v?this.classes.add(n):this.classes.delete(n)}; }
  append(...nodes) { this.children.push(...nodes); }
  setAttribute(k,v) { this.attributes[k]=v; }
  removeAttribute(k) { delete this.attributes[k]; }
  addEventListener(k,v) { this.events[k]=v; }
  querySelectorAll() { return this.consultation || []; }
  querySelector(s) { return this.selectors?.[s] || null; }
}
function fixture({portal=false,club=true,locked=false}={}) {
  const body=new Element("body"), header=new Element("header"), clubMenu=new Element("div"), events={}, observers=[], storage=new Map();
  clubMenu.hidden=!club; body.dataset={adminAuth:locked?"locked":"unlocked",portalHome:club?"club":"overview"}; if(portal)body.classes.add("admin-portal-page");
  const document={body,activeElement:null,getElementById:id=>id==="publicSiteHeader"?header:null,querySelector:s=>s==="[data-engagements-club-menu]"?clubMenu:null,createElement:t=>new Element(t),createElementNS:(_ns,t)=>new Element(t),addEventListener:(n,f)=>events[n]=f};
  const mobile={matches:true,addEventListener:(n,f)=>events.media=f};
  const window={location:{origin:"https://test.invalid",pathname:portal?"/portail.html":"/",hash:portal?"#club-competitions":""},innerHeight:800,matchMedia:()=>mobile,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},addEventListener:(n,f)=>events[n]=f,setTimeout:f=>f(),crypto:{randomUUID:()=>"unique-portal"},visualViewport:{height:800,addEventListener:(n,f)=>events.viewport=f}};
  function run(){vm.runInNewContext(source,{document,window,MutationObserver:class{constructor(f){observers.push(f)}observe(){}}});}
  return {body,header,clubMenu,document,window,mobile,events,observers,storage,run,rail:()=>body.children[0]};
}
const p=fixture({portal:true});p.run();let rail=p.rail();assert.equal(rail.hidden,false);assert.equal(rail.children.length,3);assert.equal(rail.children[1].hidden,false);assert.equal(rail.children[1].attributes["aria-current"],"page");assert.equal(rail.children[2].href,"/");assert.equal(rail.children[2].rel,"opener");assert.equal(rail.children[0].href,"#espace-club");
assert.deepEqual(JSON.parse(p.storage.get("livepalmes:mobile-navigation-display:v1")),{club:true,home:"#espace-club"});
p.mobile.matches=false;p.events.media();assert.equal(rail.children[2].rel,"noopener");p.window.location.hash="#espace-club";p.events.hashchange();assert.equal(rail.children[0].attributes["aria-current"],"page");assert.equal(rail.children[1].attributes["aria-current"],undefined);
p.clubMenu.hidden=true;p.body.dataset.portalHome="overview";p.observers[1]();assert.equal(rail.children[1].hidden,true);assert.equal(rail.children[0].href,"#accueil");
p.body.dataset.adminAuth="locked";p.observers[0]();assert.equal(rail.hidden,true);assert.equal(p.storage.size,0);
const guest=fixture();guest.run();assert.equal(guest.rail().hidden,true);
const connected=fixture();connected.storage.set("livepalmes:portal-session-display:v1","connected");connected.storage.set("livepalmes:mobile-navigation-display:v1",JSON.stringify({club:true,home:"#espace-club"}));connected.run();rail=connected.rail();assert.equal(rail.hidden,false);assert.equal(rail.children[2].attributes["aria-current"],"page");
// Live draft remains in the original document: returning never loads or saves it.
const draft={value:"RECETTE NON ENREGISTREE"};
connected.window.opener={name:"livepalmes-portal-original",closed:false,location:{origin:"https://test.invalid",pathname:"/portail.html",hash:"#club-competitions"},document:{body:{dataset:{adminAuth:"unlocked"}},draft}};
const click={button:0,currentTarget:rail.children[1]};rail.children[1].events.click(click);assert.equal(click.currentTarget.target,"livepalmes-portal-original");assert.equal(draft.value,"RECETTE NON ENREGISTREE");
rail.children[0].events.click({...click,currentTarget:rail.children[0]});assert.equal(rail.children[0].href,"/portail.html#espace-club");assert.equal(draft.value,"RECETTE NON ENREGISTREE");
for(const change of [()=>connected.window.opener.location.origin="https://other.invalid",()=>connected.window.opener.closed=true,()=>{connected.window.opener.closed=false;connected.window.opener.location.origin="https://test.invalid";connected.window.opener.document.body.dataset.adminAuth="locked";}]){change();const link=new Element("a");rail.children[1].events.click({...click,currentTarget:link});assert.equal(link.target,undefined);}
connected.storage.delete("livepalmes:portal-session-display:v1");connected.events.storage({key:"livepalmes:portal-session-display:v1"});assert.equal(rail.hidden,true);
connected.document.activeElement={matches:()=>true};connected.window.visualViewport.height=400;connected.events.viewport();assert.equal(connected.body.classes.has("mobile-portal-keyboard"),true);connected.document.activeElement=null;connected.events.focusout();assert.equal(connected.body.classes.has("mobile-portal-keyboard"),false);
const blocked=fixture({portal:true});blocked.window.localStorage={getItem:()=>{throw Error("denied")},setItem:()=>{throw Error("denied")},removeItem:()=>{throw Error("denied")}};assert.doesNotThrow(blocked.run);assert.equal(blocked.rail().hidden,false);
assert.doesNotMatch(source,/firebase|fetch\(|XMLHttpRequest|indexedDB/);console.log("Mobile navigation: club/admin visibility, disconnected public, local presentation, draft return, origin/session guards, desktop noopener and keyboard verified without services.");
