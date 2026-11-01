"use strict";
// Operator-side authentication only. No operation, SDK initialization or secret
// access at module load; gcloud and NAP secret lookup require explicit opt-in.
const {execFileSync}=require("node:child_process");
function tokenProvider({mode="adc",account="",execute=execFileSync,now=Date.now,adc}={}){
  if(!["adc","gcloud"].includes(mode))throw Error("INVALID_OPERATOR_AUTH_MODE");
  if(mode==="gcloud"&&!/^[A-Za-z0-9._+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(account))throw Error("EXPLICIT_GCLOUD_ACCOUNT_REQUIRED");
  let credential,cached,until=0;
  return async()=>{
    if(mode==="adc"){
      if(!credential)credential=adc?adc():require("../functions/node_modules/firebase-admin").credential.applicationDefault();
      return (await credential.getAccessToken()).access_token;
    }
    if(cached&&now()<until)return cached;
    try{
      const output=process.platform==="win32"
        ?execute("cmd.exe",["/d","/c","gcloud.cmd auth print-access-token --account="+account],{encoding:"utf8",stdio:["ignore","pipe","pipe"],timeout:30000})
        :execute("gcloud",["auth","print-access-token","--account="+account],{encoding:"utf8",stdio:["ignore","pipe","pipe"],timeout:30000});
      const value=String(output).trim();
      if(!value||value.length>8192||/\s/.test(value))throw Error("invalid token");
      cached=value;until=now()+45000;return cached;
    }catch{throw Error("EXISTING_GCLOUD_SESSION_REQUIRED");}
  };
}
async function existingNapPassword(token,request=fetch){
  const response=await request("https://secretmanager.googleapis.com/v1/projects/livepalmes/secrets/LIVEPALMES_NAP_PASSWORD/versions/latest:access",{headers:{Authorization:"Bearer "+await token()},signal:AbortSignal.timeout(30000)});
  if(!response.ok)throw Error("NAP_EXISTING_SECRET_ACCESS_"+response.status);
  const value=await response.json(),password=Buffer.from(value.payload?.data||"","base64").toString("utf8");
  if(!password)throw Error("NAP_PASSWORD_UNAVAILABLE");
  return password;
}
module.exports={tokenProvider,existingNapPassword};
