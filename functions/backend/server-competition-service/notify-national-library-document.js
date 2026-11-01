// Existing operation bodies; live services arrive through explicit accessors.
function createCompetitionService_notifyNationalLibraryDocument(backendContext) {
  async function notifyNationalLibraryDocument(request) {
    const context=await (0, backendContext.local$nationalLibraryContext)(request);
    try{
      const input=request.data||{},library=require("../../nap-national-documents");
      if(!['preview','send'].includes(input.action))throw new TypeError('Action de notification invalide.');
      const pool=require("../../nap-portal-swimmers").portalPool(process.env.LIVEPALMES_NAP_PASSWORD);
      const document=library.view(await library.record(pool,input.documentId));
      const setting=await require("../../engagement-mail-control").read(backendContext.db);
      if((await backendContext.engagementMailRecipientIndexStateRef(backendContext.db).get()).data()?.status!=='ready')throw new TypeError('Annuaire des destinataires indisponible ; aucune reconstruction automatique.');
      const scoped=await require("../../nap-notification-preview").nativeClubScopes(pool,await backendContext.engagementMailRecipientsFromIndex(backendContext.db,['engagements.club.manage']));
      if(scoped.length>10000)throw new RangeError('Annuaire des destinataires trop volumineux.');
      const control=require("../../engagement-mail-control");
      const recipients=backendContext.engagementCompetitionNotificationRecipients(backendContext.engagementDedupMailRecipients(scoped))
        .filter(x=>x.clubId&&backendContext.engagementRecipientHasCapability(x,'engagements.club.manage')&&control.clubAllowed(setting,x))
        .sort((a,b)=>String(a.uid).localeCompare(String(b.uid))||String(a.email).localeCompare(String(b.email)));
      const fingerprint=backendContext.crypto.createHash('sha256').update(JSON.stringify([document.fingerprint,setting,recipients])).digest('hex');
      const disabled=backendContext.ENVIRONMENT.projectId==='livepalmes-test'||!setting.enabled;
      const result={recipientCount:recipients.length,clubCount:new Set(recipients.map(x=>x.clubId)).size,scope:setting.scope,fingerprint,disabled,sentCount:0,errorCount:0,skippedCount:0,test:backendContext.ENVIRONMENT.projectId==='livepalmes-test'};
      if(input.action==='preview')return result;
      if(input.expectedFingerprint!==fingerprint)throw new TypeError('Le document, les destinataires ou le réglage ont changé. Actualisez l’aperçu.');
      // No SMTP configuration, transporter, outbox or delayed event is created on TEST.
      if(disabled)return {...result,done:true};
      const offset=input.offset??0;
      if(!Number.isSafeInteger(offset)||offset<0||offset>recipients.length||offset%20!==0)throw new TypeError('Page de notification invalide.');
      const config=backendContext.engagementMailSmtpConfig();if(!config.ready)throw new TypeError('Configuration des mails indisponible.');
      const transporter=backendContext.nodemailer.createTransport({...config.transport,pool:true,maxConnections:1,connectionTimeout:15000,greetingTimeout:15000,socketTimeout:30000});
      try{
        for(const recipient of recipients.slice(offset,offset+20)){
          const now=new Date().toISOString();
          const jobId=backendContext.crypto.createHash('sha256').update(JSON.stringify(['national-document',document.id,document.fingerprint,recipient.uid,recipient.email])).digest('hex');
          const ref=backendContext.db.collection(backendContext.ENGAGEMENT_MAIL_JOBS_COLLECTION).doc(jobId);
          const job={source:'nap',type:'competition_documents',status:'sending',competitionId:'national-library',notificationId:`national-document-${document.id}`,recipientUid:recipient.uid,toEmail:recipient.email,clubId:String(recipient.clubId),recipientRegionId:recipient.napClubRegionId,subject:`LivePalmes — ${document.title}`,textBody:`Un document est disponible dans la bibliothèque LivePalmes.\n\n${document.title}\n${document.description||''}\n${document.url}\n\n${backendContext.ENVIRONMENT.hostingOrigin}/bibliotheque.html`,createdAt:now,notificationDueAt:now,updatedAt:now,attemptedAt:now};
          const claimed=await backendContext.db.runTransaction(async transaction=>{if((await transaction.get(ref)).exists)return false;transaction.create(ref,job);return true;});
          if(!claimed){result.skippedCount++;continue;}
          const sent=await backendContext.sendEngagementMailJob(transporter,{id:jobId,ref,data:()=>job},config,context);
          if(sent.status==='sent')result.sentCount++;else result.errorCount++;
          if(sent.stopDelivery)return {...result,done:true,interrupted:true};
        }
      }finally{transporter.close();}
      await backendContext.writeAuditLog('nap.nationalDocument.notified',context.uid,{documentId:document.id,offset,sentCount:result.sentCount,errorCount:result.errorCount});
      return {...result,done:offset+20>=recipients.length,nextOffset:offset+20};
    }catch(error){if(error instanceof backendContext.HttpsError)throw error;throw new backendContext.HttpsError(error instanceof TypeError?'failed-precondition':'unavailable',error instanceof TypeError?error.message:'Notification interrompue. Les envois déjà tentés ne seront pas renvoyés automatiquement.');}
  }

  async function queueNativeDocumentNotification(request) {
    const preview=await (0, backendContext.local$nativeNotificationPreview)(request,'documents');
    const context=await backendContext.engagementAccessContext(request);
    const competition=await (0, backendContext.local$nativePortalCompetition)(request.data?.competitionId||request.data?.calendarEventId,event=>(0, backendContext.local$assertCanManageEngagementCompetition)(context,event));
    const ids=request.data?.documentIds;
    if(!Array.isArray(ids)||!ids.length||ids.length>20)throw new backendContext.HttpsError('invalid-argument','Documents a notifier requis.');
    const documents=competition.clubDocuments.filter(document=>ids.includes(document.id));
    if(documents.length!==new Set(ids).size)throw new backendContext.HttpsError('failed-precondition','Les documents ont change. Rechargez la fiche.');
    const automation=require("../../nap-notification-automation");
    const mailState=await require("../../engagement-mail-control").read(backendContext.db);
    const queued=await automation.armDocuments(backendContext.db,{competitionId:String(require("../../nap-direct-calendar").positiveId(competition.id)),
      action:'documents',documentIds:ids,controlRevision:mailState.revision,actorUid:context.uid,operation:automation.hash(['documents-v1',competition.id,context.uid,documents])});
    await (0, backendContext.local$enqueueNativeNotificationTask)(queued.eventId);
    return {...preview,previewOnly:false,queued:true,notificationAt:queued.runAt,groupingMinutes:5};
  }

  return { notifyNationalLibraryDocument, queueNativeDocumentNotification };
}

module.exports = { createCompetitionService_notifyNationalLibraryDocument };
