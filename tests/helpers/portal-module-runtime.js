"use strict";
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");

// Load the shipped module itself, without reconstructing the historical entry.
function portalModule(file, exportedName, context, globals = {}) {
  const window = { LivePalmesEnvironment: { sportingDataSource: "nap" }, ...globals.window };
  const sandbox = { console, Promise, Error, Date, TextEncoder, performance, setTimeout, clearTimeout, document:{}, ...globals, window };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../../assets/livepalmes-portal-deferred.js"), "utf8"), sandbox);
  const directory = path.join(__dirname, "../../assets/portal/deferred");
  for (const deferred of fs.readdirSync(directory).filter(name => name.endsWith(".js"))) {
    vm.runInNewContext(fs.readFileSync(path.join(directory, deferred), "utf8"), sandbox);
  }
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../../assets/portal", file), "utf8"), sandbox, { filename: file });
  return window[exportedName].create(context);
}

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

module.exports = { portalModule, deferred };
