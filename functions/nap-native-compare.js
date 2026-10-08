"use strict";
// NAP native text can be latin1; mysql2 binds Unicode as utf8mb4. Compare
// identical characters as identical bytes, still case/accent/NULL sensitive.
function nativeEqual(column,operator="<=>") {
  if(typeof column!=="string" || column.split(".").length>2 || !column.split(".").every(part=>/^(?:[A-Za-z_][A-Za-z0-9_]*|`[A-Za-z_][A-Za-z0-9_]*`)$/.test(part)) || !["<=>","="].includes(operator)) throw new TypeError("Colonne native de comparaison invalide.");
  return `BINARY CONVERT(${column} USING utf8mb4) ${operator} BINARY CONVERT(? USING utf8mb4)`;
}
module.exports={nativeEqual};
