const fs = require("node:fs");
const path = require("node:path");

const rootDir = path.resolve(__dirname, "..");

const consolePages = [
  {
    file: "live.html",
    role: "live",
    className: "dedicated-live-page",
    title: "Live - LivePalmes",
    description: "Console live LivePalmes pour suivre la course et les informations sans action officielle.",
    heading: "Console live",
    intro: "Ouverture de la console live LivePalmes."
  },
  {
    file: "speaker.html",
    role: "speaker",
    className: "dedicated-speaker-page",
    title: "Speaker - LivePalmes",
    description: "Console speaker LivePalmes pour les annonces, rep&egrave;res chrono et alertes officielles.",
    heading: "Console speaker",
    intro: "Ouverture de la console speaker LivePalmes."
  },
  {
    file: "ja.html",
    role: "referee",
    className: "dedicated-referee-page",
    title: "Juge arbitre - LivePalmes",
    description: "Console juge arbitre LivePalmes pour les forfaits, abandons et disqualifications.",
    heading: "Console juge arbitre",
    intro: "Ouverture de la console juge arbitre LivePalmes."
  },
  {
    file: "video.html",
    role: "video",
    className: "dedicated-video-page",
    title: "Juge video - LivePalmes",
    description: "Console juge video LivePalmes pour les demandes d arbitrage video et l historique.",
    heading: "Console juge video",
    intro: "Ouverture de la console juge video LivePalmes."
  },
  {
    file: "bureau-perf.html",
    role: "computer",
    className: "dedicated-computer-page",
    title: "Bureau des performances - LivePalmes",
    description: "Console bureau des performances LivePalmes pour publier les series, resultats et informations publiques.",
    heading: "Bureau des performances",
    intro: "Ouverture du bureau des performances LivePalmes."
  },
  {
    file: "secretariat.html",
    role: "secretary",
    className: "dedicated-secretary-page",
    title: "Secretariat - LivePalmes",
    description: "Console secretariat LivePalmes pour gerer les forfaits en finale et les repechages.",
    heading: "Console secretariat",
    intro: "Ouverture de la console secretariat LivePalmes."
  }
];

const speakerInfoScripts = [
  "assets/livepalmes-speaker-info.js",
  "assets/livepalmes-speaker-info-options.js",
  "assets/livepalmes-speaker-info-workflow.js"
];

const seriesImportScripts = [
  "assets/livepalmes-pdf-import.js",
  "assets/livepalmes-csv-parser.js",
  "assets/livepalmes-series-import-utils.js",
  "assets/livepalmes-series-import.js",
  "assets/livepalmes-series-import-workflow.js"
];

const resultsAdminScripts = [
  "assets/livepalmes-admin-results.js",
  "assets/livepalmes-results-admin-options.js",
  "assets/livepalmes-results-admin-panel-view.js",
  "assets/livepalmes-results-admin-program.js",
  "assets/livepalmes-results-upload-state.js",
  "assets/livepalmes-results-admin-workflow.js"
];

const finalWithdrawalsScripts = [
  "assets/livepalmes-final-withdrawals-options.js",
  "assets/livepalmes-final-withdrawals-view.js",
  "assets/livepalmes-result-detail-view.js",
  "assets/livepalmes-final-withdrawals-core.js",
  "assets/livepalmes-final-withdrawals-modals.js",
  "assets/livepalmes-final-withdrawals-workflow.js"
];

const resultMaintenanceScripts = [
  "assets/livepalmes-admin-maintenance.js",
  "assets/livepalmes-result-maintenance-options.js",
  "assets/livepalmes-result-maintenance-workflow.js"
];

const resultPublicationScripts = [
  "assets/livepalmes-result-pdf-storage.js",
  "assets/livepalmes-result-publication-options.js",
  "assets/livepalmes-result-publication-workflow.js",
  "assets/livepalmes-result-parser.js"
];

const adminDiagnosticScripts = [
  "assets/livepalmes-admin-diagnostics.js",
  "assets/livepalmes-admin-backups.js"
];

const roleScriptExclusions = {
  live: [
    ...adminDiagnosticScripts,
    ...speakerInfoScripts,
    ...seriesImportScripts,
    ...resultsAdminScripts,
    ...finalWithdrawalsScripts,
    ...resultMaintenanceScripts,
    ...resultPublicationScripts
  ],
  referee: [
    ...adminDiagnosticScripts,
    ...speakerInfoScripts,
    ...seriesImportScripts,
    ...resultsAdminScripts,
    ...finalWithdrawalsScripts,
    ...resultMaintenanceScripts,
    ...resultPublicationScripts
  ],
  video: [
    ...adminDiagnosticScripts,
    ...speakerInfoScripts,
    ...seriesImportScripts,
    ...resultsAdminScripts,
    ...finalWithdrawalsScripts,
    ...resultMaintenanceScripts,
    ...resultPublicationScripts
  ],
  secretary: [
    ...adminDiagnosticScripts,
    ...speakerInfoScripts,
    ...seriesImportScripts,
    ...resultsAdminScripts,
    ...resultMaintenanceScripts
  ],
  speaker: [
    ...adminDiagnosticScripts,
    ...seriesImportScripts,
    ...resultsAdminScripts,
    ...finalWithdrawalsScripts,
    ...resultMaintenanceScripts
  ]
};

function replaceOne(content, pattern, replacement, label) {
  if (!pattern.test(content)) {
    throw new Error(`Repere introuvable : ${label}`);
  }
  return content.replace(pattern, replacement);
}

function buildPage(source, page) {
  let html = source;
  html = replaceOne(html, /<title>.*?<\/title>/, `<title>${page.title}</title>`, "title");
  html = replaceOne(html, /<meta name="description" content=".*?">/, `<meta name="description" content="${page.description}">`, "description");
  html = replaceOne(html, /<meta property="og:title" content=".*?">/, `<meta property="og:title" content="${page.title}">`, "og:title");
  html = replaceOne(html, /<meta property="og:description" content=".*?">/, `<meta property="og:description" content="${page.description}">`, "og:description");
  html = replaceOne(html, /<meta name="twitter:title" content=".*?">/, `<meta name="twitter:title" content="${page.title}">`, "twitter:title");
  html = replaceOne(html, /<meta name="twitter:description" content=".*?">/, `<meta name="twitter:description" content="${page.description}">`, "twitter:description");
  html = replaceOne(html, /<body>/, `<body class="dedicated-console-page ${page.className}">`, "body class");
  html = replaceOne(html, /<h2>Bienvenue sur LivePalmes<\/h2>/, `<h2>${page.heading}</h2>`, "home title");
  html = replaceOne(html, /<p>S&eacute;lectionne ta console pour suivre la comp&eacute;tition en temps r&eacute;el\.<\/p>/, `<p>${page.intro}</p>`, "home intro");
  html = replaceOne(
    html,
    /<a class="public-results-link" href="resultats\.html\?v=([^"]+)" target="_blank" rel="noopener">R&eacute;sultats publics<\/a>/,
    '<a class="public-results-link" href="index.html?v=$1">Accueil LivePalmes</a>',
    "home link"
  );
  html = replaceOne(
    html,
    /<script>window\.LivePalmesDedicatedRole = "";<\/script>/,
    `<script>window.LivePalmesDedicatedRole = "${page.role}";</script>`,
    "dedicated role script"
  );
  (roleScriptExclusions[page.role] || []).forEach((scriptPath) => {
    html = html.replace(new RegExp(`\\n\\s*<script src="${scriptPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\?v=[^"]+"><\\/script>`, "g"), "");
  });
  return html;
}

function main() {
  const checkOnly = process.argv.includes("--check");
  const source = fs.readFileSync(path.join(rootDir, "index.html"), "utf8");
  const mismatches = [];

  consolePages.forEach((page) => {
    const expected = buildPage(source, page);
    const outputPath = path.join(rootDir, page.file);
    if (checkOnly) {
      const current = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, "utf8") : "";
      if (current !== expected) mismatches.push(page.file);
      return;
    }
    fs.writeFileSync(outputPath, expected, "utf8");
  });

  if (checkOnly && mismatches.length) {
    console.error(`Pages consoles non synchronisees : ${mismatches.join(", ")}`);
    console.error("Lance : node tools/build-console-pages.js");
    process.exit(1);
  }

  console.log(checkOnly ? "Pages consoles synchronisees." : "Pages consoles generees.");
}

main();
