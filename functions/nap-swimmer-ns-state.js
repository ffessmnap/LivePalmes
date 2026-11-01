"use strict";
const {createHash}=require("node:crypto");
const { fingerprint: __nativeMember0 } = require("./nap-swimmer-identity-values");
const identity={ fingerprint: __nativeMember0 };
const digest=value=>createHash("sha256").update(JSON.stringify(value)).digest("hex");
function state(row) {
  const available=Object.hasOwn(row,"livepalmes_ns")&&Object.hasOwn(row,"livepalmes_ns_version");
  const value=row.livepalmes_ns, version=Number(row.livepalmes_ns_version??0);
  if(available&&(![null,0,1,"0","1"].includes(value)||!Number.isSafeInteger(version)||version<0))throw new TypeError("Statut NS à vérifier.");
  return {nonSelectable:available&&Number(value)===1,nsAvailable:available,nsVersion:version};
}
function fingerprint(row) {return digest([identity.fingerprint(row),state(row).nonSelectable,state(row).nsVersion]);}
module.exports={state,fingerprint};
