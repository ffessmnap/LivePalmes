"use strict";
// Package presentation sources only; never read or generate sporting data.
const fs=require("node:fs"),path=require("node:path");
const root=path.resolve(__dirname,"..");
const outputs=[
 ["functions/assets/public-home-template.json",JSON.stringify({html:fs.readFileSync(path.join(root,"index.html"),"utf8").replace(/\r\n/g,"\n")},null,2)+"\n"],
 ["functions/assets/public-home-model.js",fs.readFileSync(path.join(root,"assets/public/livepalmes-home-model.js"),"utf8").replace(/\r\n/g,"\n")]
];
for(const [name,content]of outputs){const target=path.join(root,name);if(process.argv.includes("--write"))fs.writeFileSync(target,content);else if(!fs.existsSync(target)||fs.readFileSync(target,"utf8").replace(/\r\n/g,"\n")!==content)throw Error(`Source d’accueil serveur périmée : ${name}. Exécuter node tools/build-public-home-template.js --write.`);}
console.log("Sources de présentation accueil serveur synchronisées, aucune donnée lue.");
