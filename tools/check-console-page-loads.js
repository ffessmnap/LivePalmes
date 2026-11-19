const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
for (const name of ["direct-admin.html", "direct-consoles.html", "direct.html"]) {
  const html = fs.readFileSync(path.join(root, name), "utf8");
  const scripts = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(match => match[1].split("?")[0]);
  if (!scripts.length || scripts.length > 50 || new Set(scripts).size !== scripts.length) throw Error("Chargement console invalide : " + name);
  for (const script of scripts.filter(source => !source.startsWith("https://"))) {
    const target = path.resolve(root, script.replace(/^\//, ""));
    if (!target.startsWith(root + path.sep) || !fs.existsSync(target)) throw Error("Dépendance console absente : " + script);
    if (script === "app.js" || /livepalmes-(?:pin-auth|console-sync|role-lock-sync)\.js$/.test(script)) throw Error("Ancien runtime console : " + script);
  }
}
console.log("Dépendances des trois entrées Direct : OK");
