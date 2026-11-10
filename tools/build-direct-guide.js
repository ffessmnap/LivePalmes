'use strict';
// The HTML is the source. Both PDF copies are generated here; edit the HTML/CSS.
const fs=require('node:fs'),path=require('node:path'),{startStaticServer,launchBrowser,waitFor}=require('./capture-portal-design');
const {evaluate}=require('../tests/helpers/portal-browser-evaluate');
const PUBLIC_ORIGIN='https://livepalmes.web.app';
// A downloaded PDF has no Hosting origin. Resolve its local links to PROD;
// keep the HTML relative so it always stays in the environment being viewed.
function prepareLinksForPdf(publicationOrigin){
  for(const link of document.querySelectorAll('a[href]')){
    const url=new URL(link.getAttribute('href'),location.href);
    if(url.origin===location.origin)link.href=new URL(url.pathname+url.search+url.hash,publicationOrigin).href;
  }
}
async function main(){
  const {server,baseUrl}=await startStaticServer();let browser;
  try{
    browser=await launchBrowser();const client=browser.client;
    await client.send('Page.navigate',{url:baseUrl+'/direct-guide.html'});
    if(!await waitFor(client,"document.readyState==='complete'&&document.querySelectorAll('.guide-page').length===5",5000))throw Error('Guide non chargé');
    await evaluate(client,"await document.fonts.ready;await Promise.all([...document.images].map(image=>image.decode()));await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))");
    await evaluate(client,'('+prepareLinksForPdf.toString()+')('+JSON.stringify(PUBLIC_ORIGIN)+')');
    const {data}=await client.send('Page.printToPDF',{printBackground:true,preferCSSPageSize:true});
    const bytes=Buffer.from(data,'base64');
    for(const file of ['output/pdf/LivePalmes-Direct-mode-operatoire.pdf','assets/direct/guide.pdf']){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,bytes);console.log(file+' · '+bytes.length+' octets');}
  }finally{if(browser){await browser.client.send('Browser.close').catch(()=>{});browser.cleanup();}server.closeAllConnections();server.close();}
}
module.exports={PUBLIC_ORIGIN,prepareLinksForPdf};
if(require.main===module)main().catch(error=>{console.error(error);process.exitCode=1;});
