(function(document){
 "use strict";
 function init(){
  const body=document.body;
  if(!body?.classList.contains("public-shell-page")||document.getElementById("publicSiteHeader"))return;
  const section=body.dataset.publicSection||"home",label=body.dataset.publicLabel||"";
  const header=document.createElement("header");header.id="publicSiteHeader";header.className="public-site-header";
  const inner=document.createElement("div");inner.className="public-site-header-inner";
  const brand=document.createElement("a");brand.className="public-site-brand";brand.href="/";brand.setAttribute("aria-label","Accueil LivePalmes");
  const icon=document.createElement("img");icon.src="/logo-livepalmes.png?v=20260819-hosting-1";icon.alt="";brand.append(icon,document.createTextNode("LivePalmes"));
  const nav=document.createElement("nav");nav.className="public-site-nav";nav.setAttribute("aria-label","Navigation publique");
  for(const [key,title,href]of [["home","Accueil","/"],["calendar","Calendrier","/calendrier.html"],["performances","Performances","/performances/records.html"],["documents","Documents","/bibliotheque.html"]]){
   const link=document.createElement("a");link.href=href;link.textContent=title;if(section===key)link.setAttribute("aria-current","page");nav.append(link);
  }
  const federal=document.createElement("a");federal.className="public-site-federal";federal.href="https://ffessm.fr/";federal.target="_blank";federal.rel="noopener noreferrer";
  const logo=document.createElement("img");logo.src="/logo-ffessm-nage-avec-palmes.png?v=20260529-home-ffessm-1";logo.alt="FFESSM Nage avec palmes";federal.append(logo);
  const portal=document.createElement("a");portal.className="public-site-portal";portal.href="/portail.html";portal.textContent="Accéder au portail →";
  inner.append(brand,nav,federal,portal);header.append(inner);
  const banner=body.querySelector("[data-livepalmes-test-banner]");if(banner)banner.after(header);else body.prepend(header);
  if(section!=="home"){
   const breadcrumb=document.createElement("nav");breadcrumb.className="public-site-context";breadcrumb.setAttribute("aria-label","Fil d’Ariane");
   const home=document.createElement("a");home.href="/";home.textContent="Accueil";breadcrumb.append(home);
   const addSeparator=()=>{const sep=document.createElement("span");sep.textContent="›";sep.setAttribute("aria-hidden","true");breadcrumb.append(sep);};
   if(body.dataset.publicParent){addSeparator();const parent=document.createElement("a");parent.href=body.dataset.publicParent;parent.textContent=body.dataset.publicParentLabel||"Retour";breadcrumb.append(parent);}
   addSeparator();const current=document.createElement("span");current.textContent=label;current.setAttribute("aria-current","page");breadcrumb.append(current);
   if(section==="calendar"&&body.dataset.publicParent){const back=document.createElement("a");back.className="public-site-back";back.href=body.dataset.publicParent;back.textContent="← Retour au calendrier";breadcrumb.append(back);}
   header.after(breadcrumb);
  }
  body.classList.add("public-shell-ready");
 }
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})(document);
