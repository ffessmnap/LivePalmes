"use strict";
const fs = require("node:fs"), path = require("node:path"), crypto = require("node:crypto");
const PROJECT = "livepalmes-test", DIRECTORY = "tmp/firebase-test-hosting";
function configuration(source, project, root) {
  if (project !== PROJECT) throw Error("Configuration Hosting réservée à livepalmes-test");
  const original = source.hosting;
  if (!original || Array.isArray(original) || original.target !== "app" || original.public !== "."
      || !Array.isArray(original.headers) || !original.ignore?.includes("tmp/**") || original.site)
    throw Error("Configuration Hosting source inattendue : revue requise");
  const hosting = structuredClone(original);
  delete hosting.target;
  hosting.site = PROJECT;
  hosting.public = path.resolve(root);
  for (const source of ["**", "404.html"])
    hosting.headers.push({source, headers: [{key: "X-Robots-Tag", value: "noindex, nofollow"}]});
  return {hosting};
}
function prepare(root, project) {
  if (project !== PROJECT) throw Error("Configuration Hosting réservée à livepalmes-test");
  root = fs.realpathSync(root);
  const raw = fs.readFileSync(path.join(root, "firebase.json"));
  const config = configuration(JSON.parse(raw), project, root);
  const temporary = path.join(root, "tmp"), destination = path.join(root, DIRECTORY);
  for (const folder of [temporary, destination]) {
    if (fs.existsSync(folder) && fs.realpathSync(folder) !== folder)
      throw Error("Dossier Hosting temporaire redirigé : publication refusée");
    fs.mkdirSync(folder, {recursive: true});
  }
  const file = path.join(destination, "firebase.json");
  if (fs.existsSync(file) && (!fs.lstatSync(file).isFile() || fs.lstatSync(file).isSymbolicLink()))
    throw Error("Fichier Hosting temporaire redirigé : publication refusée");
  fs.writeFileSync(file, JSON.stringify(config, null, 2) + "\n");
  if (!raw.equals(fs.readFileSync(path.join(root, "firebase.json")))) throw Error("Configuration source modifiée");
  return {project, configuration: path.relative(root, file).replaceAll("\\", "/"),
    sourceSha256: crypto.createHash("sha256").update(raw).digest("hex"), robots: "noindex, nofollow"};
}
module.exports = {configuration, prepare, PROJECT, DIRECTORY};
if (require.main === module) {
  try {
    if (process.argv.length !== 4 || process.argv[2] !== "--project") throw Error("Projet TEST explicite requis");
    console.log(JSON.stringify(prepare(path.resolve(__dirname, ".."), process.argv[3])));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
