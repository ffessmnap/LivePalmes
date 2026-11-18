"use strict";
require("./helpers/offline-network");
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const root=path.resolve(__dirname,"..");
const configSource=fs.readFileSync(path.join(root,"assets/livepalmes-app-config.js"),"utf8");
const clientSource=fs.readFileSync(path.join(root,"assets/livepalmes-app-check.js"),"utf8");
function fixture({project="livepalmes-test",keys,existingProject,missingSdk=false,fail=false}={}){
 const calls={initialize:0,activation:[],warnings:0};
 let app=existingProject?{options:{projectId:existingProject}}:null;
 const service={activate(provider,refresh){if(fail)throw Error("Synthetic provider failure");calls.activation.push({key:provider.key,refresh});}};
 function sdk(){return service;}sdk.ReCaptchaEnterpriseProvider=class{constructor(key){this.key=key;}};
 const firebase={apps:app?[app]:[],app:()=>app,initializeApp(config){calls.initialize++;app={options:config};this.apps.push(app);return app;},appCheck:missingSdk?undefined:sdk};
 const window={firebase,location:{search:""},LivePalmesEnvironment:{assertSafe(){},isTest:project==="livepalmes-test",legacyAdminUids:[],firebaseConfig:{projectId:project},functionsRegion:"europe-west1",publicStorageUrl:()=>"https://fixture.invalid/static.json"}};
 const context=vm.createContext({window,URLSearchParams,console:{warn(){calls.warnings++;}}});
 const source=keys?configSource.replace(/const APP_CHECK_RECAPTCHA_ENTERPRISE_SITE_KEYS = Object\.freeze\(\{[\s\S]*?\}\);/,"const APP_CHECK_RECAPTCHA_ENTERPRISE_SITE_KEYS = Object.freeze("+JSON.stringify(keys)+");"):configSource;
 vm.runInContext(source,context);vm.runInContext(clientSource,context);
 return {window,calls,service};
}
for(const project of ["livepalmes-test","livepalmes"]){
 const disabled=fixture({project,keys:{}});assert.equal(disabled.window.LivePalmesAppCheck.activate(),false);assert.equal(disabled.calls.initialize,0);assert.equal(disabled.calls.activation.length,0);
 const h=fixture({project,keys:{livepalmes:"fixture-prod-key","livepalmes-test":"fixture-test-key"}});
 assert.equal(h.calls.initialize,1);assert.deepEqual(h.calls.activation,[{key:project==="livepalmes"?"fixture-prod-key":"fixture-test-key",refresh:true}]);
 assert.equal(h.window.LivePalmesAppCheck.activate(),true);assert.equal(h.calls.activation.length,1,"Activation is shared by repeat calls");
 const mixed=fixture({project,existingProject:project==="livepalmes"?"livepalmes-test":"livepalmes",keys:{[project]:"fixture-key"}});
 assert.equal(mixed.window.LivePalmesAppCheck.activate(),false);assert.equal(mixed.calls.initialize,0);assert.equal(mixed.calls.activation.length,0,"Never activate a TEST key on an existing PROD app, or vice versa");
 const unavailable=fixture({project,keys:{[project]:"fixture-key"},missingSdk:true});assert.equal(unavailable.window.LivePalmesAppCheck.activate(),false);assert.equal(unavailable.calls.initialize,0);
 const failed=fixture({project,keys:{[project]:"fixture-key"},fail:true});assert.equal(failed.window.LivePalmesAppCheck.activate(),false);assert.equal(failed.service.livePalmesActivated,undefined);
}
const unknown=fixture({project:"foreign-project",keys:{livepalmes:"fixture-prod-key","livepalmes-test":"fixture-test-key"}});assert.equal(unknown.calls.initialize,0);assert.equal(unknown.window.LivePalmesAppCheck.activate(),false);
const oneKey=fixture({project:"livepalmes",keys:{"livepalmes-test":"fixture-test-key"}});assert.equal(oneKey.calls.initialize,0);
console.log("App Check private preparation: separate TEST/PROD keys, blank/foreign/missing keys inactive, default-app project checked, one activation, auto-refresh and safe provider failure; all providers fictitious.");
