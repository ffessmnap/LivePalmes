"use strict";
const assert = require("node:assert/strict");
const { fingerprints, fromGit } = require("../tools/release-function-fingerprints");
const path = require("node:path");
const source = 'const {onCall}=require("firebase-functions/v2/https");\nfunction helper(){return 1;}\nexports.one=onCall({},()=>helper()+1);\nexports.two=onCall({},()=>helper()+2);';
const original = fingerprints(source, "dependencies");
const taskSource=source.replace('const {onCall}', 'const {onTaskDispatched}=require("firebase-functions/v2/tasks");\nconst {onCall}')+'\nexports.task=onTaskDispatched({rateLimits:{maxConcurrentDispatches:1}},()=>helper());';
assert.equal(fingerprints(taskSource,'dependencies').mode,'dependency-closure');
assert.notEqual(fingerprints(taskSource,'dependencies').functions.task,fingerprints(taskSource.replace('return 1','return 7'),'dependencies').functions.task);
assert.equal(original.mode, "dependency-closure");
const local = fingerprints(source.replace('helper()+1', 'helper()+3'), "dependencies");
assert.notEqual(original.functions.one, local.functions.one);
assert.equal(original.functions.two, local.functions.two);
for (const changed of [fingerprints(source.replace('return 1', 'return 4'), "dependencies"), fingerprints(source, "different package lock")]) {
  assert.notEqual(original.functions.one, changed.functions.one);
  assert.notEqual(original.functions.two, changed.functions.two);
}
assert.deepEqual(fingerprints('// comment\n'+source, "dependencies").functions, original.functions);
for (const dynamic of ['\nexports.one();', '\nconst alias=exports;', '\neval("helper()");', '\nmodule.exports.three=exports.one;']) {
  const before = fingerprints(source + dynamic, "dependencies");
  const after = fingerprints(source.replace('helper()+1', 'helper()+3') + dynamic, "dependencies");
  assert.equal(before.mode, "whole-backend");
  assert.notEqual(before.functions.two, after.functions.two);
}
assert.equal(fingerprints(source.replace('onCall({},', 'onCall(getOptions(),'), "dependencies").mode, "whole-backend");
assert.throws(()=>fingerprints(source+'\nexports.one=onCall({},()=>1);', "dependencies"), /duplique/);
assert.throws(()=>fingerprints('exports.one = (', "dependencies"));
console.log('Empreintes backend : correction isolee, dependances partagees, code dynamique et syntaxe couverts.');

const modular = `const {onCall}=require("firebase-functions/v2/https");
const LIMIT=2;
const other=()=>20;
function leaf(){return LIMIT;}
function bridge(){return leaf();}
exports.one=onCall({},()=>bridge());
exports.two=onCall({},()=>other());
exports.three=onCall({},()=>leaf());`;
const changed = (before, after) => {
  const a=fingerprints(before, "deps"), b=fingerprints(after, "deps");
  return Object.keys(b.functions).filter(name=>a.functions[name]!==b.functions[name]).sort();
};
assert.deepEqual(changed(modular, modular.replace('LIMIT=2', 'LIMIT=3')), ['one','three']);
assert.deepEqual(changed(modular, modular.replace('return LIMIT', 'return LIMIT+1')), ['one','three']);
assert.deepEqual(changed(modular, modular.replace('()=>20', '()=>30')), ['two']);
assert.deepEqual(changed(modular, modular+'\nfunction unused(){return 123;}'), []);
assert.deepEqual(changed(modular, modular.replace('return leaf()', 'return other()')), ['one']);
assert.deepEqual(changed(modular, modular.replace('function leaf(){return LIMIT;}', '')), ['one','three']);
// Top-level effects and the helpers they use apply to every export.
for (const sideEffect of ['\nconfigure(leaf);', '\nconst runtime=leaf();', '\nleaf.flag=1;']) {
  assert.deepEqual(changed(modular+sideEffect, (modular+sideEffect).replace('LIMIT=2','LIMIT=3')), ['one','three','two']);
}
// Cycles terminate; aliases/callbacks/object keys retain dependencies.
const cycle=modular.replace('return LIMIT','return bridge()');
assert.deepEqual(changed(cycle, cycle.replace('return bridge()', 'return bridge()+1')), ['one','three']);
const aliases=modular.replace('return leaf()', 'const alias=leaf; return [alias].map(fn=>fn());');
assert.deepEqual(changed(aliases, aliases.replace('LIMIT=2','LIMIT=3')), ['one','three']);
const object=modular.replace('return leaf()', 'return ({leaf})["leaf"]();');
assert.deepEqual(changed(object, object.replace('LIMIT=2','LIMIT=3')), ['one','three']);
for (const dynamic of ['\nglobalThis["eval"]("x");', '\nrequire(name);', '\nrequire("node:vm");', '\n({})["constructor"];']) {
  assert.equal(fingerprints(modular+dynamic, 'deps').mode, 'whole-backend');
}
assert.throws(()=>fingerprints(modular+'\nfunction leaf(){}','deps'), /duplique/);
// Lazy compatibility services must not turn a club callback into a shared initializer.
const lazyService = `const {onCall}=require("firebase-functions/v2/https");
function clubAccess(){return 1;}
let savedService;
function service(){return savedService || (savedService=createService({clubAccess}));}
exports.club=onCall({},()=>clubAccess());
exports.compatibility=onCall({},()=>service().read());
exports.unrelated=onCall({},()=>23);`;
assert.deepEqual(changed(lazyService,lazyService.replace("return 1","return 2")),["club","compatibility"]);
const eagerService=lazyService.replace("let savedService;","let savedService=createService({clubAccess});");
assert.deepEqual(changed(eagerService,eagerService.replace("return 1","return 2")),["club","compatibility","unrelated"]);
// Conditional TEST registrations and static module closures are independent of the core.
const conditional = modular + `
const {defineSecret}=require("firebase-functions/params");
if (ENVIRONMENT.projectId === "livepalmes-test") {
  const {read}=require("./nap-reader");
  const password=defineSecret("NAP_PASSWORD");
  let pool;
  exports.nap=onCall({secrets:[password]},()=>read(pool));
}
`;
const modules = {
  "functions/nap-reader.js": {source: 'const {leaf}=require("./nap-leaf"); function read(pool){return leaf(pool);} module.exports={read};'},
  "functions/nap-leaf.js": {source: 'function leaf(pool){return 1;} module.exports={leaf};'}
};
const originalModules = fingerprints(conditional, "deps", modules);
assert.equal(originalModules.mode, "dependency-closure");
assert.ok(originalModules.functions.nap);
const moduleChange = {...modules, "functions/nap-leaf.js": {source: modules["functions/nap-leaf.js"].source.replace("return 1", "return 2")}};
const moduleAfter = fingerprints(conditional, "deps", moduleChange);
assert.deepEqual(Object.keys(moduleAfter.functions).filter(n=>moduleAfter.functions[n]!==originalModules.functions[n]), ["nap"]);
const localNap = fingerprints(conditional.replace("read(pool)", "read(pool)+1"), "deps", modules);
assert.deepEqual(Object.keys(localNap.functions).filter(n=>localNap.functions[n]!==originalModules.functions[n]), ["nap"]);
const extraUnused = {...modules, "functions/unused.js": {source:'throw new Error("never load");'}};
assert.deepEqual(fingerprints(conditional, "deps", extraUnused).functions, originalModules.functions);
const importA = {...modules, 'functions/nap-leaf.js': {source:'const client=require("third-party-client"); function leaf(){return 1;} module.exports={leaf};'}};
const importB = {...modules, 'functions/nap-leaf.js': {source:'const renamed=require("third-party-client"); function leaf(){return 1;} module.exports={leaf};'}};
const externalA = fingerprints(conditional, 'deps', importA), externalB = fingerprints(conditional, 'deps', importB);
assert.ok(Object.keys(externalA.functions).every(name=>externalA.functions[name]!==externalB.functions[name]));
const builtinA = {...modules, 'functions/nap-leaf.js': {source:'const {createHash}=require("node:crypto"); function leaf(){return 1;} module.exports={leaf};'}};
const builtinB = {...modules, 'functions/nap-leaf.js': {source:builtinA['functions/nap-leaf.js'].source.replace('return 1', 'return 2')}};
const builtinBefore = fingerprints(conditional, 'deps', builtinA), builtinAfter = fingerprints(conditional, 'deps', builtinB);
assert.deepEqual(Object.keys(builtinBefore.functions).filter(name=>builtinBefore.functions[name]!==builtinAfter.functions[name]), ['nap']);
const secretSource = 'const {onCall}=require("firebase-functions/v2/https"); const {defineSecret: secret}=require("firebase-functions/params"); exports.one=onCall({secrets:[secret("PASSWORD")]},()=>1); exports.two=onCall({},()=>2);';
assert.equal(fingerprints(secretSource, 'deps').mode, 'dependency-closure');
assert.deepEqual(changed(secretSource, secretSource.replace('"PASSWORD"', '"OTHER_PASSWORD"')), ['one']);
assert.equal(fingerprints(secretSource.replace('secret("PASSWORD")','secret(name)'), 'deps').mode, 'whole-backend');
assert.equal(fingerprints(secretSource.replace('secret("PASSWORD")','optionsFactory()'), 'deps').mode, 'whole-backend');
assert.equal(fingerprints(secretSource+' if (ENVIRONMENT.projectId === "livepalmes-test") { const secret=()=>configure(); exports.masked=onCall({secrets:[secret("X")]},()=>1); }', 'deps').mode, 'whole-backend');
const effectSource = modular.replace('const LIMIT=2;', 'const settings=require("./settings");\nconst LIMIT=2;');
const effects = {"functions/settings.js": {source: 'configure(); module.exports={};'}};
const effectBefore = fingerprints(effectSource, "deps", effects);
const effectAfter = fingerprints(effectSource, "deps", {"functions/settings.js": {source: 'configure(2); module.exports={};'}});
assert.deepEqual(Object.keys(effectBefore.functions).filter(n=>effectBefore.functions[n]!==effectAfter.functions[n]).sort(), ["one","three","two"]);
for (const initialization of ['function Set(){configure();} const values=new Set([]);', 'const values=new Set(externalIterable);']) {
  const before = fingerprints(effectSource, 'deps', {'functions/settings.js': {source: initialization+' module.exports={};'}});
  const after = fingerprints(effectSource, 'deps', {'functions/settings.js': {source: initialization+' module.exports={}; // changed'}});
  assert.deepEqual(Object.keys(before.functions).filter(n=>before.functions[n]!==after.functions[n]).sort(), ['one','three','two']);
}
assert.throws(()=>fingerprints(conditional, "deps", {"functions/nap-reader.js":modules["functions/nap-reader.js"]}), /non resolu/);
const unrelatedCondition = conditional.replace('ENVIRONMENT.projectId === "livepalmes-test"', 'isTest()');
assert.equal(fingerprints(unrelatedCondition, "deps", modules).mode, "whole-backend");
console.log("Empreintes NAP : condition TEST, module indirect, modification locale, effet global et import absent couverts.");
// The NAP guard replaced the TEST-only guard during migration. It must not
// turn every unrelated endpoint into a whole-backend dependency.
const nativeConditional = conditional.replace('ENVIRONMENT.projectId === "livepalmes-test"', 'ENVIRONMENT.sportingDataSource === "nap"');
const nativeBefore = fingerprints(nativeConditional, 'deps', modules);
const nativeAfter = fingerprints(nativeConditional, 'deps', moduleChange);
assert.equal(nativeBefore.mode, 'dependency-closure');
assert.deepEqual(Object.keys(nativeAfter.functions).filter(n=>nativeAfter.functions[n]!==nativeBefore.functions[n]), ['nap']);
// Guard evaluation is not assumed: its environment provider remains shared.
const environmentModules = {...modules, 'functions/environment.js': {source:'function environment(){return {sportingDataSource:"nap"};} module.exports={environment};'}};
const withEnvironment = 'const {environment}=require("./environment"); const ENVIRONMENT=environment();\n'+nativeConditional;
const envBefore = fingerprints(withEnvironment, 'deps', environmentModules);
const envAfter = fingerprints(withEnvironment, 'deps', {...environmentModules, 'functions/environment.js':{source:environmentModules['functions/environment.js'].source.replace('"nap"','"legacy"')}});
assert.ok(Object.keys(envBefore.functions).every(n=>envBefore.functions[n]!==envAfter.functions[n]));
for (const unsafe of [
  nativeConditional.replace('=== "nap"', '!== "nap"'),
  nativeConditional.replace('ENVIRONMENT.sportingDataSource === "nap"', 'isNap()'),
  nativeConditional+'\nexports.nap();',
  nativeConditional.replace(/}\s*$/, '} else { configure(); }')
]) assert.equal(fingerprints(unsafe, 'deps', modules).mode, 'whole-backend');
assert.throws(()=>fingerprints(nativeConditional+'\nrequire(moduleName);', 'deps', modules), /Import dynamique/);
// Unknown guarded effects can affect even the unguarded core: remain broad.
const nativeEffects = nativeConditional.replace('let pool;', 'let pool; configure(read);\n exports.napTwo=onCall({},()=>2);');
const nativeEffectBefore = fingerprints(nativeEffects, 'deps', modules), nativeEffectAfter = fingerprints(nativeEffects, 'deps', moduleChange);
assert.equal(nativeEffectBefore.mode, 'whole-backend');
assert.ok(Object.keys(nativeEffectBefore.functions).every(n=>nativeEffectBefore.functions[n]!==nativeEffectAfter.functions[n]));
assert.equal(fingerprints(nativeConditional.replace('let pool;', 'const pool=configure(read);'), 'deps', modules).mode, 'whole-backend');
console.log('Garde NAP : ciblage local, environnement partage, initialisation et replis conservateurs couverts.');
// Regression on real releases: no runtime code or Firebase call is executed.
const root=path.resolve(__dirname,'..');
for (const [label, before, after, expected] of [
  ['Regions clubs NAP','3d168e3e00dc50c1ab2b912fc691993ad8f7caf1','b2f8bcfd25318c36673976df4572cb06796e9a47',
    ['listEngagementNationalClubs','getPublicEngagementClubDirectory','saveEngagementNationalClub','deleteEngagementNationalClub']],
  ['NAP portail','ebcc955c202c0f7856347dabb6dd70378da68c3a','c18710237408b1689224d0270cddc36196452bb9',
    ['exportNapPublicPage','searchEngagementNationalSwimmers','resolveEngagementSwimmerChangeRequest','updateEngagementNationalSwimmerIdentity','mergeEngagementNationalClubSwimmer']],
  ['NAP TOP','d7eb84c82a32358f7e3369938a10ab6a16086a97','84395f520781d913edb60e3a69b81085fb58c5b1',
    ['readNapPublicSwimmer','exportNapPublicPage']],
  ['DTN','7ed44a0033d63959a5423a0a904e77b454dd03f6','84d36c31ffad84bbefc515aff08935062f9c52a1',
    ['buildDtnQualificationView','getDtnQualificationOverview']],
  ['PDF','5edd066bff228df734a1bfc0db28537210c82422','1554db370fd303a9973bd422e8305355d1987027',
    ['generateEngagementClubRecapPdf','generateEngagementClubRecapPdfForAdmin','generateEngagementCompetitionClubRecapPdfs','prepareEngagementClubRecapEmails','closeDueEngagementCompetitions']],
  ['Interface','6c704b83dffceca4081187bee17cef7af28efa20','bbd21c6d17a36d3535b508f815e070f6d709fe09',[]]
]) {
  const a=fromGit(root,before), b=fromGit(root,after);
  const selected=Object.keys(b.functions).filter(name=>a.functions[name]!==b.functions[name]).sort();
  assert.deepEqual(selected,expected.sort(),label);
  console.log(`${label} reel : ${selected.length} traitement(s) concernes : ${selected.join(', ') || 'aucun'}`);
}

// Real current backend: the historical qualification factory must not make
// club access a startup dependency of unrelated account/Direct endpoints.
const currentSha=require("node:child_process").execFileSync("git",["rev-parse","HEAD"],{cwd:root,encoding:"utf8"}).trim();
const current=fromGit(root,currentSha);
assert.equal(current.mode,"dependency-closure");
assert.ok(!current.commonDeclarations.includes("engagementClubAccessContext"),"Club callback still shared at initialization");
console.log("Backend courant : contexte club absent des dependances communes au demarrage.");

// Retirement-only changes must not force republication of unchanged handlers.
const { retirementRegistrySignature } = require("../tools/release-function-fingerprints");
const cp = require("node:child_process");
const lotBefore = cp.execFileSync("git", ["show", "25221188f57c1d80ed0f4055b1d4ba30c1bb462d:tools/firebase-test-backend-lots.js"], {cwd:root,encoding:"utf8"});
const lotAfter = cp.execFileSync("git", ["show", "5eb876129f3198749f9468da4f681dda2cc7a9d9:tools/firebase-test-backend-lots.js"], {cwd:root,encoding:"utf8"});
assert.equal(retirementRegistrySignature(lotBefore), retirementRegistrySignature(lotAfter));
const recordsRetired = lotAfter.replace('const NAP_UNUSED_FUNCTIONS = Object.freeze([', 'const NAP_UNUSED_FUNCTIONS = Object.freeze(["syncPublicRecordsData",');
assert.notEqual(recordsRetired, lotAfter);
assert.equal(retirementRegistrySignature(recordsRetired), retirementRegistrySignature(lotAfter));
const registryBefore = fromGit(root, "25221188f57c1d80ed0f4055b1d4ba30c1bb462d");
const registryAfter = fromGit(root, "5eb876129f3198749f9468da4f681dda2cc7a9d9");
assert.deepEqual(registryBefore.functions, registryAfter.functions);
// The RF/MPF retirement changed the raw blob's position among common files.
// Compare the full real fingerprints, not only the normalized registry text.
assert.deepEqual(
  fromGit(root, "b0020e51ebd6e686054efd3451882dd2c1d60d94").functions,
  fromGit(root, "e9bba081c41d1375ea0071f1ca24997402f39be4").functions,
  "Retirement-only blob reordering must not select any backend function"
);
for (const changed of [
  lotAfter.replace('TLS obligatoire', 'TLS change'),
  lotAfter.replace('return LOTS[lot].filter', 'return LOTS.other.filter'),
  lotAfter.replace('roles/datastore.user', 'roles/owner'),
  lotAfter.replace('"getCurrentAccessUser", "createOrUpdateAccessUser"', '"getCurrentAccessUser", "anotherHandler"')
]) { assert.notEqual(changed, lotAfter); assert.notEqual(retirementRegistrySignature(changed), retirementRegistrySignature(lotAfter)); }
for (const unsafe of [
  lotAfter.replace('"listEngagementNationalClubSwimmers",\n  "getEngagementNationalAdministrationOverview"', 'dynamicName,\n  "getEngagementNationalAdministrationOverview"'),
  lotAfter + '\nconsume(NAP_UNUSED_FUNCTIONS);',
  lotAfter.replace('new Set([...NAP_RETIRED_FUNCTIONS, ...NAP_UNUSED_FUNCTIONS])', 'new Set(compute())')
]) { assert.notEqual(unsafe, lotAfter); assert.equal(retirementRegistrySignature(unsafe), unsafe); }
console.log("Listes de retrait : aucune republication des handlers inchanges ; metadonnees, algorithme, droits et syntaxe inconnue restent conservateurs.");

// Removing the isolated Records trigger, both helpers and its unused import
// must preserve the native reader's shared projection module and fingerprints.
const recordsImport = 'const {publicRecordsPayload,publicRecordsManifest}=require("./public-records-data");\n';
const recordsChain = `function publishPublicRecordsManifest(manifest){return savePublicPerformanceJson(manifest);}
function publishPublicRecordsSnapshot(data){return publishPublicRecordsManifest(publicRecordsManifest(publicRecordsPayload(data)));}
exports.syncPublicRecordsData=onDocumentWritten({},event=>publishPublicRecordsSnapshot(event.data));
`;
const nativeRecords = `const {onCall}=require("firebase-functions/v2/https");
const {onDocumentWritten}=require("firebase-functions/v2/firestore");
const {read}=require("./nap-records-store");
function savePublicPerformanceJson(data){return data;}
exports.readNapPublicSwimmer=onCall({},()=>read());
exports.unrelated=onCall({},()=>23);
`;
const recordsModules = {
  "functions/public-records-data.js": {source: 'function publicRecordsPayload(data){return data;} function publicRecordsManifest(data){return {data};} module.exports={publicRecordsPayload,publicRecordsManifest};'},
  "functions/nap-records-store.js": {source: 'const {publicRecordsPayload}=require("./public-records-data"); function read(){return publicRecordsPayload({records:[]});} module.exports={read};'}
};
const recordsBefore = fingerprints(recordsImport + nativeRecords + recordsChain, "deps", recordsModules);
const recordsAfter = fingerprints(nativeRecords, "deps", recordsModules);
assert.equal(recordsBefore.mode, "dependency-closure");
assert.equal(recordsAfter.mode, "dependency-closure");
assert.deepEqual(Object.keys(recordsBefore.functions).filter(name => !(name in recordsAfter.functions)), ["syncPublicRecordsData"]);
assert.deepEqual(Object.keys(recordsAfter.functions).filter(name => !(name in recordsBefore.functions)), []);
assert.deepEqual(Object.keys(recordsAfter.functions).filter(name => recordsBefore.functions[name] !== recordsAfter.functions[name]), []);
// The retained NAP reader still depends on the shared module after retirement.
const changedRecordsModules = {...recordsModules, "functions/public-records-data.js": {
  source: recordsModules["functions/public-records-data.js"].source.replace("return data;", "return {...data,version:2};")
}};
const recordsModuleAfter = fingerprints(nativeRecords, "deps", changedRecordsModules);
assert.deepEqual(Object.keys(recordsAfter.functions).filter(name => recordsAfter.functions[name] !== recordsModuleAfter.functions[name]), ["readNapPublicSwimmer"]);
console.log("Retrait Records seul : trois blocs et import inutilise retires, empreintes actives stables, module NAP partage toujours suivi.");

// A frozen fresh literal must not make a pure helper common to unrelated handlers.
const frozenOwner = `const {onCall}=require("firebase-functions/v2/https");
const {read}=require("./frozen-data");
exports.target=onCall({},()=>read()); exports.other=onCall({},()=>42);`;
const frozenSource = value => `const CODES=Object.freeze({code:"${value}",nested:[1,{value:-2}]}); function read(){return CODES;} module.exports={read};`;
const frozenPrint = source => fingerprints(frozenOwner,"same",{"functions/frozen-data.js":{source}}).functions;
const frozenBefore=frozenPrint(frozenSource("before")), frozenAfter=frozenPrint(frozenSource("after"));
assert.notEqual(frozenBefore.target,frozenAfter.target);
assert.equal(frozenBefore.other,frozenAfter.other);
for(const unsafe of [
  'const CODES=Object.freeze({get value(){return sideEffect();}});',
  'const CODES=Object.freeze({...source});',
  'const CODES=Object.freeze({[compute()]:1});',
  'const CODES=Object.freeze({value:compute()});',
  'const CODES=Object.freeze({value:external});',
  'const CODES=Object.freeze({__proto__:{value:1}});',
  'const CODES=Object["freeze"]({value:1});',
  'const CODES=Object.freeze(new Proxy({},{ownKeys(){return [];}}));',
  'const Object={freeze:value=>value}; const CODES=Object.freeze({value:1});',
  'function Object(){} const CODES=Object.freeze({value:1});',
  'function shadow(Object){} const CODES=Object.freeze({value:1});',
  'function change(){Object.freeze=custom;} const CODES=Object.freeze({value:1});'
]) {
  const a=frozenPrint(unsafe+' function read(){return CODES;} module.exports={read};');
  const b=frozenPrint(unsafe+' function read(){return CODES;} module.exports={read}; const extra=1;');
  assert.notEqual(a.other,b.other,"Unknown/shadowed freeze remains common: "+unsafe);
}
console.log("Constantes gelees : donnees litterales seules isolees ; masquages, accesseurs, appels et effets inconnus restent communs.");

const groupedOld=fromGit(root,"fbd3c2868fcb3690e1fa5a7ddeca9f45e6fb4511").functions;
const groupedNew=fromGit(root,"0619f1dce9439afd5dd4719ee035ff0fc3b99b83").functions;
const groupedChanges=Object.keys(groupedOld).filter(n=>groupedOld[n]!==groupedNew[n]);
assert.equal(groupedChanges.length,52); // Includes the TEST-only export, not present in PROD.
for(const name of ["verifyPin","setRolePins","getCurrentAccessUser","updateEngagementAutomaticMailControl"])
  assert.equal(groupedOld[name],groupedNew[name],"Unrelated handler remains unchanged: "+name);
for(const name of ["generateEngagementCompetitionTxtExport","readNapPublicSwimmer","notifyEngagementCompetitionDocuments","listEngagementNationalAuditLogs"])
  assert.notEqual(groupedOld[name],groupedNew[name],"Real dependency must still change: "+name);
console.log("Version regroupee reelle : dependances utiles suivies et fonctions sans rapport conservees.");
