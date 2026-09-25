"use strict";
const assert = require("node:assert/strict");
const { fingerprints } = require("../tools/release-function-fingerprints");
const source = 'const {onCall}=require("firebase-functions/v2/https");\nfunction helper(){return 1;}\nexports.one=onCall({},()=>helper()+1);\nexports.two=onCall({},()=>helper()+2);';
const original = fingerprints(source, "dependencies");
assert.equal(original.mode, "independent-exports");
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
