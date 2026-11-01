// Existing singleton, values or query bodies; no business change.
const mysql = require("mysql2/promise");

function napPoolOptions(password) {
  if (!password) {
    throw new Error("Configuration NAP incomplete : mot de passe requis.");
  }
  return {
    // Cible MySQL confirmee par le prestataire ; independante de la redirection web NAP.
    host: "57.128.101.89", port: 3372, user: "nage-palmes", database: "nage-palmes",
    // TLS obligatoire ; verification du certificat desactivee selon le choix valide.
    password, ssl: { rejectUnauthorized: false },
    connectionLimit: 2, waitForConnections: true, queueLimit: 8,
    connectTimeout: 10000, dateStrings: true, supportBigNumbers: true,
    bigNumberStrings: true, multipleStatements: false, enableKeepAlive: true
  };
}

function createNapPool(password) {
  return mysql.createPool(napPoolOptions(password));
}

module.exports = { napPoolOptions, createNapPool };
