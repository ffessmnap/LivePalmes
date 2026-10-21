(function(document,global){
 "use strict";
 function init(){
  const body=document.body;
  const isPortal=body?.classList.contains("admin-portal-page");
  if((!body?.classList.contains("public-shell-page")&&!isPortal)||document.getElementById("publicSiteHeader"))return;
  const section=isPortal?"portal":body.dataset.publicSection||"home",label=body.dataset.publicLabel||"";
  const header=document.createElement("header");header.id="publicSiteHeader";header.className="public-site-header";
  const inner=document.createElement("div");inner.className="public-site-header-inner";
  const brand=document.createElement("a");brand.className="public-site-brand";brand.href="/";brand.setAttribute("aria-label","Accueil LivePalmes");
  const icon=document.createElement("img");icon.src="/logo-ffessm-nage-avec-palmes.png?v=20260529-home-ffessm-1";icon.alt="FFESSM Nage avec palmes";brand.append(icon);const wordmark=document.createElement("span");wordmark.className="public-site-wordmark";wordmark.textContent="LivePalmes";const federal=document.createElement("small");federal.textContent="FFESSM";wordmark.append(federal);brand.append(wordmark);
  const nav=document.createElement("nav");nav.className="public-site-nav";nav.setAttribute("aria-label","Navigation publique");
  const menus=[];
  function closeDropdowns(except){for(const menu of menus)if(menu.details!==except){menu.details.open=false;menu.hoverOpened=false;}}
  const shortcuts={
   calendar:[["Tout le calendrier","/calendrier.html"],["Événements nationaux","/calendrier.html?level=national"],["Événements en région","/calendrier.html?level=regions"]],
   performances:[["Records de France","/performances/records.html"],["MPF","/performances/mpf.html"],["TOP","/performances/tops.html"],["Recherche nageur","/performances/nageur.html"]],
   // Existing library theme routes: no extra catalogue request when opening a menu.
   documents:[["Tous les documents","/bibliotheque.html"],["Comités/clubs","/bibliotheque.html?theme=2"],["Compétitions","/bibliotheque.html?theme=3"],["Entraîneurs","/bibliotheque.html?theme=4"],["Juges","/bibliotheque.html?theme=5"],["Haut Niveau","/bibliotheque.html?theme=6"]]
  };
  for(const [key,title,href]of [["home","Accueil","/"],["calendar","Calendrier","/calendrier.html"],["performances","Performances","/performances/records.html"],["documents","Documents","/bibliotheque.html"]]){
   if(shortcuts[key]){
    const details=document.createElement("details"),summary=document.createElement("summary"),links=document.createElement("div");details.className="public-site-"+key;summary.textContent=title;links.className="public-site-dropdown";
    if(section===key)summary.className="is-current";
    for(const [text,url]of shortcuts[key]){const a=document.createElement("a");a.textContent=text;a.href=url;links.append(a);}
    details.append(summary,links);nav.append(details);
    const menu={details,hoverOpened:false};menus.push(menu);
    details.addEventListener("pointerenter",()=>{if(global.matchMedia?.("(min-width: 851px) and (hover: hover) and (pointer: fine)").matches){closeDropdowns(details);menu.hoverOpened=!details.open;details.open=true;}});
    summary.addEventListener("click",event=>{closeDropdowns(details);if(menu.hoverOpened&&details.open){event.preventDefault();menu.hoverOpened=false;}});
    details.addEventListener("pointerleave",()=>{if(menu.hoverOpened&&!details.contains(document.activeElement)){details.open=false;menu.hoverOpened=false;}});
    // Keep layout stable while focus moves to another summary before its click.
    details.addEventListener("focusout",event=>{if(!nav.contains(event.relatedTarget)){details.open=false;menu.hoverOpened=false;}});
   }else{const link=document.createElement("a");link.href=href;link.textContent=title;if(section===key)link.setAttribute("aria-current","page");nav.append(link);}
  }
  const portal=document.createElement("a");portal.className="public-site-portal";portal.href="/portail.html";portal.textContent="Portail";if(isPortal)portal.setAttribute("aria-current","page");
  const toggle=document.createElement("button");toggle.type="button";toggle.className="public-site-menu-toggle";toggle.textContent="☰ Site";toggle.setAttribute("aria-expanded","false");toggle.setAttribute("aria-controls","livepalmesSiteNavigation");nav.id="livepalmesSiteNavigation";
  const accountHost=document.createElement("div");accountHost.id="publicSiteAccount";
  let publicAccount=null;
  if(!isPortal){
   publicAccount=document.createElement("a");publicAccount.className="public-site-account-link";publicAccount.href="/portail.html#mon-compte";publicAccount.setAttribute("aria-label","Mon compte");publicAccount.title="Mon compte";
   const svg=document.createElementNS("http://www.w3.org/2000/svg","svg");svg.setAttribute("viewBox","0 0 24 24");svg.setAttribute("aria-hidden","true");
   const circle=document.createElementNS("http://www.w3.org/2000/svg","circle");circle.setAttribute("cx","12");circle.setAttribute("cy","8");circle.setAttribute("r","3");
   const path=document.createElementNS("http://www.w3.org/2000/svg","path");path.setAttribute("d","M5.5 20c.6-4 2.8-6 6.5-6s5.9 2 6.5 6");svg.append(circle,path);publicAccount.append(svg);publicAccount.hidden=true;accountHost.append(publicAccount);
  }
  inner.append(brand,nav,portal,accountHost,toggle);header.append(inner);
  const banner=body.querySelector("[data-livepalmes-test-banner]");if(banner)banner.after(header);else body.prepend(header);
  if(section!=="home"&&!isPortal){
   const breadcrumb=document.createElement("nav");breadcrumb.className="public-site-context";breadcrumb.setAttribute("aria-label","Fil d’Ariane");
   const home=document.createElement("a");home.href="/";home.textContent="Accueil";breadcrumb.append(home);
   const addSeparator=()=>{const sep=document.createElement("span");sep.textContent="›";sep.setAttribute("aria-hidden","true");breadcrumb.append(sep);};
   if(body.dataset.publicParent){addSeparator();const parent=document.createElement("a");parent.href=body.dataset.publicParent;parent.textContent=body.dataset.publicParentLabel||"Retour";breadcrumb.append(parent);}
   addSeparator();const current=document.createElement("span");current.textContent=label;current.setAttribute("aria-current","page");breadcrumb.append(current);
   if(section==="calendar"&&body.dataset.publicParent){const back=document.createElement("a");back.className="public-site-back";back.href=body.dataset.publicParent;back.textContent="← Retour au calendrier";breadcrumb.append(back);}
   header.after(breadcrumb);
  }
  body.classList.add("public-shell-ready");document.documentElement?.classList.add("livepalmes-site-shell");
  const sessionKey="livepalmes:portal-session-display:v1";
  // Anonymous presentation hint only. The portal remains the sole access authority.
  function readHint(){try{return global.localStorage.getItem(sessionKey)==="connected";}catch{return false;}}
  function refreshLabel(){const connected=isPortal?body.dataset.adminAuth==="unlocked":readHint();portal.textContent="Portail";if(publicAccount)publicAccount.hidden=!connected;}
  function publishHint(){const state=body.dataset.adminAuth;if(state!=="unlocked"&&state!=="locked")return;try{if(state==="unlocked")global.localStorage.setItem(sessionKey,"connected");else global.localStorage.removeItem(sessionKey);}catch{}refreshLabel();}
  // The active portal link must never reload and discard its current dossier.
  if(isPortal)portal.addEventListener("click",event=>{if(body.dataset.adminAuth==="unlocked")event.preventDefault();});
  function closeMenu(){closeDropdowns();header.classList.remove("is-site-menu-open");toggle.setAttribute("aria-expanded","false");}
  toggle.addEventListener("click",()=>{const open=toggle.getAttribute("aria-expanded")!=="true";if(!open)closeDropdowns();header.classList.toggle("is-site-menu-open",open);toggle.setAttribute("aria-expanded",String(open));});
  document.addEventListener("keydown",event=>{if(event.key!=="Escape")return;const details=nav.querySelector("details[open]");if(details){closeDropdowns();details.querySelector("summary").focus();}else if(toggle.getAttribute("aria-expanded")==="true"){closeMenu();toggle.focus();}});
  document.addEventListener("click",event=>{if(!header.contains(event.target)){closeMenu();}});
  if(isPortal){
   const account=document.getElementById("adminPortalAccount");if(account){accountHost.append(account);const button=document.getElementById("adminPortalAccountToggle");if(button)button.setAttribute("aria-label","Mon compte");}
   // Public consultation must not unload the current dossier or pending saves.
   for(const link of [brand,...nav.querySelectorAll("a")]){link.target="livepalmes-public";link.rel="noopener";link.setAttribute("aria-label",link===brand?"Accueil LivePalmes (nouvel onglet)":link.textContent.trim()+" (nouvel onglet)");}
   new MutationObserver(publishHint).observe(body,{attributes:true,attributeFilter:["data-admin-auth"]});publishHint();
  }
  refreshLabel();global.addEventListener("storage",event=>{if(event.key===sessionKey||event.key===null)refreshLabel();});global.addEventListener("pageshow",refreshLabel);
  function measureHeader(){const currentBanner=body.querySelector("[data-livepalmes-test-banner]");const bannerHeight=currentBanner?.getBoundingClientRect().height||0;const height=header.getBoundingClientRect().height;body.style.setProperty("--site-banner-height",bannerHeight+"px");body.style.setProperty("--site-header-bottom",(bannerHeight+height)+"px");const topbar=document.querySelector(".admin-portal-topbar");const toolbarHeight=topbar?.getBoundingClientRect().height||0;body.style.setProperty("--site-workspace-top",(bannerHeight+height+toolbarHeight)+"px");global.dispatchEvent(new Event("resize"));}
  if(document.readyState!=="complete")global.addEventListener("load",measureHeader,{once:true});
  if(global.ResizeObserver){const observer=new global.ResizeObserver(measureHeader);observer.observe(header);if(banner)observer.observe(banner);const topbar=document.querySelector(".admin-portal-topbar");if(topbar)observer.observe(topbar);}measureHeader();
  const mobileNavigation=document.createElement("script");mobileNavigation.src="/assets/public/livepalmes-mobile-navigation.js?v=20261021-connected-rail-1";mobileNavigation.defer=true;body.append(mobileNavigation);
 }
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})(document,window);
