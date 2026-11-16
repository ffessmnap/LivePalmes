"use strict";
const fs=require("node:fs"),path=require("node:path"),cp=require("node:child_process"),crypto=require("node:crypto");
const {fail}=require("./a2-backup-core");
function isolatedArguments(name,root,temporary,identity){
 if(!/^a2-restore-[a-f0-9]{16}$/.test(name)||!path.isAbsolute(root)||!path.isAbsolute(temporary)||!Number.isInteger(identity.uid)||identity.uid===0||!Number.isInteger(identity.gid)||identity.gid===0)fail("RESTORE_ISOLATION_REQUIRED");
 const policy=JSON.parse(fs.readFileSync(path.join(root,".github/ci-container.json"),"utf8")),node=policy.tools.node.directory,java=policy.tools.java.directory;if(!/^mcr\.microsoft\.com\/playwright\/python@sha256:[a-f0-9]{64}$/.test(policy.image))fail("RESTORE_IMAGE_INVALID");
 const toolRoot=path.join(temporary,"ci-runtime-tools"),emulators=path.join(temporary,"a2-emulators"),modules=path.join(root,"tests/firestore-rules/node_modules"),code=path.join(temporary,"a2-restore-code");
 const nodePath="/runtime/node/"+node+"/bin/node",javaPath="/runtime/java/"+java;
 return ["create","-i","--name",name,"--label","livepalmes.a2-restore=true","--network","none","--read-only","--user",identity.uid+":"+identity.gid,"--cap-drop=ALL","--security-opt=no-new-privileges=true","--memory","3g","--cpus","2","--tmpfs","/scratch:rw,nosuid,nodev,size=1536m,mode=1777","--tmpfs","/tmp:rw,nosuid,nodev,size=128m,mode=1777","--mount","type=bind,source="+toolRoot+",target=/runtime,readonly","--mount","type=bind,source="+emulators+",target=/emulators,readonly","--mount","type=bind,source="+modules+",target=/deps,readonly","--mount","type=bind,source="+code+",target=/code,readonly","--env","HOME=/scratch/home","--env","A2_OFFLINE_RESTORE=true","--env","JAVA_HOME="+javaPath,"--env","PATH=/runtime/node/"+node+"/bin:"+javaPath+"/bin:/usr/bin:/bin","--env","FIREBASE_EMULATORS_PATH=/emulators","--entrypoint",nodePath,policy.image,"/code/a2-firebase-restore-worker.js"];
}
function restoreBundle(bundle,env=process.env,run=cp.execFileSync){
 if(env.GITHUB_ACTIONS!=="true"||process.platform!=="linux")fail("RESTORE_RUNNER_REQUIRED");const root=path.resolve(__dirname,".."),temporary=env.RUNNER_TEMP;if(!temporary||!path.isAbsolute(temporary))fail("RESTORE_RUNNER_REQUIRED");
 const code=path.join(temporary,"a2-restore-code");fs.mkdirSync(code,{recursive:true});for(const name of ["a2-backup-core.js","a2-firebase-data.js","a2-firebase-restore-worker.js"])fs.copyFileSync(path.join(__dirname,name),path.join(code,name));
 const name="a2-restore-"+crypto.randomBytes(8).toString("hex"),args=isolatedArguments(name,root,temporary,{uid:process.getuid(),gid:process.getgid()});let created=false;
 const exec=(argv,options={})=>run("docker",argv,{stdio:["pipe","pipe","ignore"],timeout:30000,maxBuffer:1048576,...options});
 try{created=true;exec(args);const metadata=JSON.parse(exec(["inspect",name],{encoding:"utf8"}))[0];if(metadata.HostConfig.NetworkMode!=="none"||metadata.HostConfig.PortBindings&&Object.keys(metadata.HostConfig.PortBindings).length||metadata.Mounts.some(m=>m.Type==="bind"&&m.RW)||metadata.Config.Env.some(item=>/^(GOOGLE_APPLICATION_CREDENTIALS|GITHUB_TOKEN|A2_BACKUP_ENCRYPTION_KEY)=/.test(item)))fail("RESTORE_ISOLATION_REQUIRED");
  let output;try{output=exec(["start","--attach","--interactive",name],{input:Buffer.from(JSON.stringify(bundle)),timeout:600000,encoding:"utf8"});}catch(error){let result;try{result=JSON.parse(String(error.stdout||"").trim().split(/\r?\n/).at(-1));}catch{}fail(/^(RESTORE[A-Z0-9_]*|AUTH_IMPORT_REJECTED|STORAGE_ARCHIVE_DIFFERS)$/.test(result?.error||"")?result.error:"ISOLATED_RESTORE_FAILED");}
  const result=JSON.parse(output.trim().split(/\r?\n/).at(-1));if(result.restoredAndCompared!==true||result.network!=="none"||result.project!==bundle.project)fail("RESTORE_RECEIPT_INVALID");return result;
 }finally{if(created)exec(["rm","-f","-v",name]);}
}
module.exports={isolatedArguments,restoreBundle};
