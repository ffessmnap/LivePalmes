"use strict";
// Static source qualification only. Never execute application modules or use
// credentials. The caller binds these inputs to authenticated installed origins.
const fs=require("node:fs"),path=require("node:path"),root=path.resolve(__dirname,".."),shared=require("./release-test-function-fingerprints"),legacy=require("./release-function-fingerprints"),{analyse}=require("./a3-production-selection-proof");
function requireTrue(value,message){if(!value)throw Error(message);}
const sha=value=>typeof value==="string"&&/^[a-f0-9]{64}$/.test(value);
function validate(input){
 requireTrue(input?.schema===1&&["livepalmes-test","livepalmes"].includes(input.project)&&/^[a-f0-9]{40}$/.test(input.candidate||""),"Exact MFA source context required");
 requireTrue(Array.isArray(input.rows)&&input.rows.length<=150,"MFA source proof budget exceeded");
 const names=new Set();for(const row of input.rows){
  requireTrue(/^[A-Za-z_][A-Za-z0-9_]{0,127}$/.test(row.name||"")&&!names.has(row.name)&&/^[a-f0-9]{40}$/.test(row.commit||""),"Foreign or duplicate MFA source origin");names.add(row.name);
  requireTrue([row.legacyBefore,row.legacyAfter,row.optimizedBefore,row.optimizedAfter].every(sha)&&row.optimizedBefore===row.optimizedAfter&&row.legacyBefore!==row.legacyAfter,"Only actual unchanged optimized/changed legacy pairs may be qualified");
 }
 return input;
}
function qualify(value){
 const input=validate(value),moduleName="functions/portal-access-protection.js";
 const baseline=shared.snapshot(root,"c2c9880045dfdd13e52ffe9977d1293ae2e61a00",{production:true}),reviewed=shared.snapshot(root,"43fbd5a9bb544199255de37dd239584f2c502d78",{production:true}),current=shared.snapshot(root,input.candidate,{production:true});
 requireTrue(current.files[moduleName]?.sha===reviewed.files[moduleName]?.sha,"Previously qualified numeric module changed");
 const strict=legacy.moduleGraph(current.files).inspect(moduleName),numeric=legacy.moduleGraph(current.files,{testNumericConstants:true}).inspect(moduleName);
 requireTrue(!strict.pure&&numeric.pure&&!numeric.externals.length&&JSON.stringify(numeric.files)===JSON.stringify([moduleName]),"Numeric initializer qualification failed");
 const raw=analyse(current),restored=analyse(current,{...current.files,[moduleName]:baseline.files[moduleName]});
 const scoped=analyse(current,current.files,{testNumericConstants:true});
 requireTrue(scoped.mode==="dependency-closure","Consumer scope cannot be isolated");
 requireTrue(raw.mode==="dependency-closure"&&restored.mode==="dependency-closure","Non-isolable source cannot be excluded");
 const rows=input.rows.map(row=>{
  requireTrue(Array.isArray(scoped.dependencies[row.name])&&!scoped.dependencies[row.name].includes("nextPortalAccessRateLimit"),"A rate-limit consumer cannot be excluded: "+row.name);
  requireTrue(raw.functions[row.name]===row.legacyAfter&&restored.functions[row.name]===row.legacyBefore,"Independent normalization disagrees: "+row.name);
  return {...row,normalizedBefore:row.legacyBefore,normalizedAfter:restored.functions[row.name],method:"unchanged-reviewed-numeric-initializer-independent-legacy-normalization"};
 });
 return {schema:1,kind:"a34b-admin-mfa-independent-exclusion-v1",candidate:input.candidate,project:input.project,networkCalls:0,applicationModulesExecuted:false,module:moduleName,reviewedModuleBlob:reviewed.files[moduleName].sha,currentModuleBlob:current.files[moduleName].sha,numericInitializerQualified:true,changedQuotaConsumersExcluded:false,rows};
}
module.exports={validate,qualify};
if(require.main===module){try{const bytes=fs.readFileSync(0);requireTrue(bytes.length<=1000000,"Input budget exceeded");console.log(JSON.stringify(qualify(JSON.parse(bytes))));}catch(error){console.error("MFA static source proof refused: "+error.message);process.exitCode=1;}}
