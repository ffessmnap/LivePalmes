"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm"),path=require("node:path");
const source=fs.readFileSync(path.join(__dirname,"../assets/public/livepalmes-public-shell.js"),"utf8");
class Element{
 constructor(tag){this.tagName=tag;this.children=[];this.attributes={};this.dataset={};this.classList={contains:name=>this.className?.split(" ").includes(name),add:name=>{this.className=(this.className||"")+" "+name;}};}
 setAttribute(key,value){this.attributes[key]=value;}
 append(...items){for(const item of items){item.parent=this;this.children.push(item);}}
 prepend(item){item.parent=this;this.children.unshift(item);}
 after(item){item.parent=this.parent;this.parent.children.splice(this.parent.children.indexOf(this)+1,0,item);}
 querySelector(selector){return walk(this).find(item=>selector==="[data-livepalmes-test-banner]"&&item.dataset?.livepalmesTestBanner);}
}
function walk(node){return [node,...node.children.flatMap(child=>walk(child))];}
function fixture(section,label,parent){const body=new Element("body");body.className="public-shell-page";body.dataset={publicSection:section,publicLabel:label,publicParent:parent,publicParentLabel:"Calendrier"};const banner=new Element("div");banner.dataset.livepalmesTestBanner="true";body.append(banner);const title=new Element("h1");title.id="pdfTitle";title.textContent="Titre dynamique conservé";body.append(title);const document={body,readyState:"complete",createElement:tag=>new Element(tag),createTextNode:text=>Object.assign(new Element("text"),{textContent:text}),getElementById:id=>walk(body).find(item=>item.id===id)};return {document,body,banner,title};}
for(const section of ["home","calendar","performances","documents","direct","legal"]){
 const f=fixture(section,"<Titre non interprété>",section==="calendar"?"/calendrier.html":undefined);
 vm.runInNewContext(source,{document:f.document});vm.runInNewContext(source,{document:f.document});
 const nodes=walk(f.body),header=f.document.getElementById("publicSiteHeader");assert.equal(f.body.children[0],f.banner);assert.equal(f.body.children[1],header);assert.equal(nodes.filter(item=>item.id==="publicSiteHeader").length,1);
 assert.equal(f.document.getElementById("pdfTitle"),f.title);assert.equal(f.title.textContent,"Titre dynamique conservé");
 const nav=nodes.find(item=>item.className==="public-site-nav");assert.equal(nav.children.length,4);
 const current=nav.children.filter(item=>item.attributes["aria-current"]==="page");assert.equal(current.length,["direct","legal"].includes(section)?0:1);
 const portal=nodes.find(item=>item.className==="public-site-portal");assert.equal(portal.href,"/portail.html");assert.match(portal.textContent,/portail/);
 const context=nodes.find(item=>item.className==="public-site-context");assert.equal(Boolean(context),section!=="home");if(context)assert.equal(context.children.find(item=>item.attributes["aria-current"]==="page").textContent,"<Titre non interprété>");
 if(section==="calendar")assert.equal(nodes.find(item=>item.className==="public-site-back").href,"/calendrier.html");
}
const excluded=fixture("home","Accueil");excluded.body.className="admin-portal-page";vm.runInNewContext(source,{document:excluded.document});assert.equal(excluded.document.getElementById("publicSiteHeader"),undefined);
const files=["index.html","public.html","bibliotheque.html","calendrier.html","competition.html","mentions-legales.html","conditions-utilisation.html","confidentialite.html","resultats.html","series-public.html","medailles.html","pdf.html","series-pdf.html","resultat-pdf.html",...['index','records','mpf','tops','nageur','construction'].map(name=>`performances/${name}.html`)];
for(const file of files){const html=fs.readFileSync(path.join(__dirname,"..",file),"utf8");assert.match(html,/class="[^"]*public-shell-page/);assert.match(html,/livepalmes-public-shell\.js[^>]*defer/);assert.match(html,/livepalmes-public-shell\.css/);}
for(const file of ["portail.html","pilotage-livepalmes.html","live.html","notifications.html"]){assert.doesNotMatch(fs.readFileSync(path.join(__dirname,"..",file),"utf8"),/livepalmes-public-shell\.js/);}
console.log("Public shell: stable navigation, banner order, contextual links, safe text, idempotence and dynamic PDF headings preserved; 20 pages covered, portal/consoles excluded.");
