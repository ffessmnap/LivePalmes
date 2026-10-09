"use strict";
const { swimmerId } = require("./nap-direct-swimmer");
const { searchPortalSwimmers } = require("./nap-portal-swimmers");

// No reads on screen opening. Each explicit search costs at most three SQL
// queries: source PK, two bounded name ranges, grouped identity/licence join.
async function searchMergeTargets(pool, input = {}) {
  const id = swimmerId(input.sourceSwimmerId);
  if (input.query !== undefined && typeof input.query !== "string") throw new TypeError("Recherche invalide.");
  const requested = (input.query || "").trim();
  if (requested && (requested.length < 2 || requested.length > 80)) throw new TypeError("Recherche entre 2 et 80 caracteres requise.");
  const [sources] = await pool.execute({sql:"SELECT id,nom FROM nageurs FORCE INDEX (PRIMARY) WHERE id=? LIMIT 1",timeout:10000},[id]);
  if (sources.length !== 1 || Number(sources[0].id) !== id) throw new TypeError("Nageur source introuvable.");
  const query = requested || String(sources[0].nom || "").trim();
  if (query.length < 2 || query.length > 80) throw new TypeError("Precisez le nom, le prenom ou l'identifiant de la fiche a conserver.");
  const result = await searchPortalSwimmers(pool, query);
  return {ok:true,source:"nap",swimmers:result.swimmers.filter(item=>String(item.id)!==String(id)&&item.status!=="merged"),hasMore:result.hasMore,sqlBudget:{queriesMax:3,candidateRowsMax:42,identityRowsMax:20}};
}
module.exports = {searchMergeTargets};
