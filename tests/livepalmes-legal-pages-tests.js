const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const legalPages = [
  ["mentions-legales.html", "Mentions légales"],
  ["conditions-utilisation.html", "Conditions d’utilisation"],
  ["confidentialite.html", "Politique de confidentialité"],
  ["accessibilite.html", "Déclaration d’accessibilité"]
];

for (const [fileName, heading] of legalPages) {
  const filePath = path.join(root, fileName);
  assert.ok(fs.existsSync(filePath), `Page absente : ${fileName}`);
  const html = fs.readFileSync(filePath, "utf8");
  assert.ok(html.includes(heading), `Titre attendu absent de ${fileName}`);
  assert.ok(html.includes("livepalmes@nap-ffessm.fr"), `Contact LivePalmes absent de ${fileName}`);
  assert.ok(html.includes("livepalmes-legal-footer.js"), `Navigation légale absente de ${fileName}`);
}

const publicPages = [
  "index.html",
  "public.html",
  "calendrier.html",
  "competition.html",
  "medailles.html",
  "resultats.html",
  "series-public.html",
  "portail.html",
  "performances/index.html",
  "performances/construction.html",
  "performances/records.html",
  "performances/mpf.html",
  "performances/tops.html",
  "performances/nageur.html"
];

for (const relativePath of publicPages) {
  const html = fs.readFileSync(path.join(root, relativePath), "utf8");
  assert.ok(html.includes("livepalmes-legal-footer.js"), `Liens légaux absents de ${relativePath}`);
}

function htmlFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if ([".git", "node_modules", "archives", "sauvegardes", "sources"].includes(entry.name)) return [];
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return htmlFiles(full);
    return entry.isFile() && entry.name.endsWith(".html") ? [full] : [];
  });
}

for (const file of htmlFiles(root)) {
  const html = fs.readFileSync(file, "utf8");
  assert.equal(html.includes("livepalmes-public-analytics.js"), false, `Ancien script Analytics encore chargé : ${path.relative(root, file)}`);
  assert.equal(html.includes("googletagmanager.com"), false, `Google Tag Manager encore chargé : ${path.relative(root, file)}`);
}

assert.equal(fs.existsSync(path.join(root, "assets", "public", "livepalmes-public-analytics.js")), false);
console.log("Pages d’information LivePalmes : OK");
