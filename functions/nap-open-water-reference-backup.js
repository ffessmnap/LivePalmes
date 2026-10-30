"use strict";
const crypto=require('node:crypto');
// Same authenticated envelope as tools/production-backup-crypto.js. Kept inside
// the Functions package; no CLI, filesystem, extra secret or dependency.
const MAGIC=Buffer.from('LIVEPALMES_BACKUP_V1\n');
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
function seal(data,secret){
 const salt=crypto.randomBytes(32),iv=crypto.randomBytes(12);
 const key=crypto.hkdfSync('sha256',secret,salt,'LivePalmes production code backup',32);
 const cipher=crypto.createCipheriv('aes-256-gcm',key,iv);cipher.setAAD(MAGIC);
 const body=Buffer.concat([cipher.update(data),cipher.final()]);
 return Buffer.concat([MAGIC,salt,iv,cipher.getAuthTag(),body]);
}
function open(data,secret){
 if(data.length<MAGIC.length+60||!data.subarray(0,MAGIC.length).equals(MAGIC))throw new TypeError('Sauvegarde NAP invalide.');
 let offset=MAGIC.length;const salt=data.subarray(offset,offset+=32),iv=data.subarray(offset,offset+=12),tag=data.subarray(offset,offset+=16);
 const key=crypto.hkdfSync('sha256',secret,salt,'LivePalmes production code backup',32);
 const decipher=crypto.createDecipheriv('aes-256-gcm',key,iv);decipher.setAAD(MAGIC);decipher.setAuthTag(tag);
 return Buffer.concat([decipher.update(data.subarray(offset)),decipher.final()]);
}
async function backupVerified(database,actorUid,payload,secret){
 if(typeof actorUid!=='string'||!actorUid||actorUid.length>128||typeof secret!=='string'||!secret)throw new TypeError('Auteur et clé de sauvegarde NAP requis.');
 const bytes=Buffer.from(JSON.stringify(payload));if(bytes.length>300000)throw new RangeError('Sauvegarde du catalogue hors limites.');
 const encrypted=seal(bytes,secret),sha256=hash(encrypted),payloadHash=hash(bytes);
 const ref=database.collection('auditLogs').doc('nap-water-reference-'+crypto.randomUUID());
 await ref.create({action:'nap.openWater.references.prepare',actorUid,createdAt:new Date().toISOString(),target:{
  format:'LIVEPALMES_BACKUP_V1',distance:payload.distance,encrypted:encrypted.toString('base64'),sha256,payloadHash,
  keySecret:'LIVEPALMES_NAP_PASSWORD',keyProject:process.env.GCLOUD_PROJECT||'',keyRevision:process.env.K_REVISION||''
 }});
 const stored=await ref.get(),target=stored.exists?stored.data()?.target:null;
 if(!target||target.sha256!==sha256||target.payloadHash!==payloadHash||target.encrypted!==encrypted.toString('base64'))throw new TypeError('Sauvegarde NAP relue différente.');
 const reopened=open(Buffer.from(target.encrypted,'base64'),secret);
 if(!reopened.equals(bytes))throw new TypeError('Sauvegarde NAP déchiffrée différente.');
 return {verified:true,sha256,payloadHash,documentId:ref.id,complete:receipt=>ref.update({completion:{...receipt,verifiedAt:new Date().toISOString()}})};
}
module.exports={backupVerified,seal,open};
