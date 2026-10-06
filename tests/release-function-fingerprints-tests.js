"use strict";
const assert = require("node:assert/strict");
const { fingerprints, fromGit } = require("../tools/release-function-fingerprints");
const path = require("node:path");
const source = 'const {onCall}=require("firebase-functions/v2/https");\nfunction helper(){return 1;}\nexports.one=onCall({},()=>helper()+1);\nexports.two=onCall({},()=>helper()+2);';
const original = fingerprints(source, "dependencies");
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
// Conditional TEST registrations and static module closures are independent of the core.
const conditional = modular + `
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
const importA = {...modules, 'functions/nap-leaf.js': {source:'const client=require("node:crypto"); function leaf(){return 1;} module.exports={leaf};'}};
const importB = {...modules, 'functions/nap-leaf.js': {source:'const renamed=require("node:crypto"); function leaf(){return 1;} module.exports={leaf};'}};
const externalA = fingerprints(conditional, 'deps', importA), externalB = fingerprints(conditional, 'deps', importB);
assert.ok(Object.keys(externalA.functions).every(name=>externalA.functions[name]!==externalB.functions[name]));
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
// Regression on real releases: no runtime code or Firebase call is executed.
const root=path.resolve(__dirname,'..');
for (const [label, before, after, expected] of [
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
