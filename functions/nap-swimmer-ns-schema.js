"use strict";
// Preparation only. No deployment, callable or interactive path executes this DDL.
const sql="ALTER TABLE nageurs ADD COLUMN livepalmes_ns TINYINT NULL DEFAULT NULL, ADD COLUMN livepalmes_ns_version INT UNSIGNED NULL DEFAULT NULL";
const planHash=require("node:crypto").createHash("sha256").update(sql).digest("hex");
module.exports={sql,planHash};
