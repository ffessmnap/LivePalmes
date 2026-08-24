const fs = require("node:fs");
const path = require("node:path");

const rootDir = path.resolve(__dirname, "..");
const checkedFiles = [
  "index.html",
  "pilotage-livepalmes.html",
  "public.html",
  "live.html",
  "speaker.html",
  "ja.html",
  "video.html",
  "bureau-perf.html",
  "secretariat.html",
  "resultats.html",
  "series-public.html",
  "pdf.html",
  "resultat-pdf.html",
  "series-pdf.html"
];

const brokenTextPattern = /(?:Ã|Â|â€|â†|�)/;

const issues = checkedFiles.flatMap((fileName) => {
  const filePath = path.join(rootDir, fileName);
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  return lines.flatMap((line, index) => {
    if (!brokenTextPattern.test(line)) return [];
    return [`${fileName}:${index + 1}: ${line.trim()}`];
  });
});

if (issues.length) {
  console.error("Caracteres probablement casses detectes :");
  issues.forEach((issue) => console.error(`- ${issue}`));
  process.exit(1);
}

console.log("Textes HTML publics OK.");
