"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { execFileSync } = require("node:child_process");
const { check } = require("../tools/check-hosting-payload");
const root=fs.mkdtempSync(path.join(os.tmpdir(),"hosting-safety-"));
try {
  execFileSync("git",["init","--quiet",root]);
  fs.mkdirSync(path.join(root,"tests/firestore-rules"),{recursive:true});
  fs.symlinkSync(path.resolve(__dirname,"firestore-rules/node_modules"),path.join(root,"tests/firestore-rules/node_modules"),"dir");
  fs.writeFileSync(path.join(root,"firebase.json"),JSON.stringify({hosting:{public:".",ignore:["firebase.json","**/.*",".git/**","tests/**"]}}));
  fs.writeFileSync(path.join(root,"index.html"),"test");
  execFileSync("git",["add","index.html","firebase.json"],{cwd:root});
  check(root);
  fs.writeFileSync(path.join(root,"gha-creds-example.json"),"synthetic-test-only");
  assert.throws(()=>check(root),/publication bloquee/);
  execFileSync("git",["add","gha-creds-example.json"],{cwd:root});
  assert.throws(()=>check(root),/publication bloquee/);
  fs.unlinkSync(path.join(root,"gha-creds-example.json"));
  fs.writeFileSync(path.join(root,"unexpected.txt"),"temporary");
  assert.throws(()=>check(root),/publication bloquee/);
  console.log("Hosting : fichiers credentials suivis ou non suivis et fichiers temporaires refuses.");
} finally {fs.rmSync(root,{recursive:true,force:true});}
