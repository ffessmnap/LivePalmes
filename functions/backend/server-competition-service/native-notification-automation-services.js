// Existing operation bodies; live services arrive through explicit accessors.
function createCompetitionService_nativeNotificationAutomationServices(backendContext) {
  function nativeNotificationAutomationServices(simulation = true) {
    if(backendContext.ENVIRONMENT.sportingDataSource !== "nap")throw new backendContext.HttpsError("failed-precondition","Source NAP requise.");
    const pool=require("../../nap-portal-pool").portalPool(process.env.LIVEPALMES_NAP_PASSWORD);
    let recipientPromise, mailSettingPromise;
    const competitionPromises=new Map(),entryPromises=new Map();
    const services={simulation,deleteField:()=>backendContext.FieldValue.delete(),
      mailSetting: () => mailSettingPromise ||= require("../../engagement-mail-control").read(backendContext.db),
      allowEvent: simulation ? undefined : async event => {
        const control=require("../../engagement-mail-control");
        return control.eventDecision(await services.mailSetting(),{createdAt:event.createdAt,notificationDueAt:event.automatic?event.deadline:event.createdAt}).allowed;
      },
      persistAttachment: simulation ? undefined : async (event,file,metadata) => {
        const storagePath=`engagements/notification-mail/${event.competitionId}/${event.operation}/${metadata.sha256}`;
        await backendContext.storage.bucket(backendContext.LIVEPALMES_STORAGE_BUCKET).file(storagePath).save(file.buffer,{resumable:false,
          metadata:{contentType:metadata.contentType,cacheControl:'private, no-store'}});
        return {...metadata,storagePath};
      },
      competition:id=>{
        if(!competitionPromises.has(id))competitionPromises.set(id,(async()=>({...await (0, backendContext.local$nativePortalCompetition)(id,()=>{}),id:String(require("../../nap-calendar-values").positiveId(id))}))());
        return competitionPromises.get(id);
      },
      recipients:()=>recipientPromise||=(async()=>{
        const state=await backendContext.engagementMailRecipientIndexStateRef(backendContext.db).get();
        if(state.data()?.status!=="ready")throw new TypeError("Annuaire des destinataires indisponible.");
        return require("../../nap-notification-preview").nativeClubScopes(pool,await backendContext.engagementMailRecipientsFromIndex(backendContext.db));
      })(),
      select:(kind,recipients,competition,event)=>kind==='opening'?backendContext.engagementCompetitionOpeningRecipients(recipients,competition,recipients.filter(recipient=>recipient.uid===event.actorUid)):backendContext.engagementCompetitionDocumentRecipients(recipients,competition),
      clubRecipients:recipients=>backendContext.engagementCompetitionNotificationRecipients(backendContext.engagementDedupMailRecipients(recipients)).filter(recipient=>recipient.clubId&&backendContext.engagementRecipientHasCapability(recipient,"engagements.club.manage")),
      entries:competition=>{
        if(!entryPromises.has(competition.id))entryPromises.set(competition.id,require("../../nap-admin-entries").readAdminEntries(pool,{competitionId:competition.id,competition},()=>{},{category:backendContext.ageCategoryFromDates}));
        return entryPromises.get(competition.id);
      },
      hasParticipants:backendContext.engagementClubEntryHasParticipants,clubPdf:backendContext.buildEngagementClubRecapPdf,
      txt:(competition,entries,clubs)=>require("../../nap-notification-txt").build(competition,entries,clubs,{
        pool,poolTxt:backendContext.buildEngagementCompetitionTxt,category:backendContext.engagementTxtSwimmerCategory,
        fileName:event=>`engagements-winpalme-${backendContext.engagementPdfFileName(event.name || event.id)}.txt`
      }),
      officialsPdf:(competition,entries)=>backendContext.buildEngagementOfficialsPdf(competition,backendContext.engagementOfficialsPdfRows(entries)),
      mail:(kind,competition,recipient,details)=>{
        const email=backendContext.normalizeEmail(recipient.email);
        if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))throw new TypeError('Adresse de destinataire invalide : corrigez le contact avant de reprendre.');
        const type=kind==='opening'?'opening_notification':kind==='documents'?'competition_documents':kind==='club_recap'?'club_recap_pdf':kind;
        const subject=kind==='opening'?backendContext.engagementOpeningMailSubject(competition):kind==='documents'?backendContext.engagementCompetitionDocumentMailSubject(competition,details.documents):kind==='club_recap'?backendContext.engagementClubRecapMailSubject(competition,details.entry):kind==='entries_txt'?backendContext.engagementTxtMailSubject(competition):backendContext.engagementOfficialsMailSubject(competition);
        const text=kind==='opening'?backendContext.engagementOpeningMailText(competition):kind==='documents'?backendContext.engagementCompetitionDocumentMailText(competition,details.documents):kind==='club_recap'?backendContext.engagementClubRecapMailText(competition,details.entry):kind==='entries_txt'?backendContext.engagementTxtMailText(competition,details):backendContext.engagementOfficialsMailText(competition,details);
        return {type,competitionId:competition.id,competitionName:competition.name,competitionRegionId:String(competition.regionId||''),
          recipientRegionId:String(recipient.napClubRegionId||''),clubId:String(recipient.clubId||''),toEmail:email,recipientUid:String(recipient.uid||''),subject,textBody:text,attachments:details.attachments||[]};
      },
      job:(event,competition,payload,now)=>{
        const data={...payload,notificationId:`${event.operation}:${Number(event.generation||0)}`,source:'nap',simulation,
          status:simulation?'disabled':'ready',reason:simulation?'test-emails-disabled':'',
          notificationDueAt:event.automatic?event.deadline:event.createdAt,
          notificationEvent:{kind:event.kind,cycleKey:event.cycleKey,closureKey:event.closureKey,automatic:event.automatic},
          createdAt:now,updatedAt:now,sentAt:''};
        return {...data,id:payload.deliveryMode==='bcc-v1'?require("../../nap-notification-automation").hash([
          'bcc-v1',data.type,data.competitionId,data.notificationId,data.clubId,payload.recipients.map(item=>item.email)
        ]).slice(0,40):backendContext.engagementMailJobId(data)};
      }
    };
    services.page=(event,competition)=>require("../../nap-notification-pages").page(event,competition,services);
    return services;
  }

  function nativeNotificationTaskServices() {
    const services=nativeNotificationAutomationServices(false);
    services.projectId=backendContext.ENVIRONMENT.projectId;
    services.enqueue=(data,options)=>require('firebase-admin/functions').getFunctions().taskQueue(`locations/${backendContext.REGION}/functions/processNapNotificationTask`).enqueue(data,options);
    services.warn=message=>console.warn(message);
    services.deliver=async ref=>{
      // No transport is created on TEST, regardless of the national switch.
      if(backendContext.ENVIRONMENT.projectId!=='livepalmes')return {done:true,sent:0};
      const config=backendContext.engagementMailSmtpConfig();
      if(!config.ready)throw new TypeError('Configuration des mails indisponible.');
      const event=(await ref.get()).data(),competition=await services.competition(event.competitionId);
      const transporter=backendContext.nodemailer.createTransport({...config.transport,pool:true,maxConnections:1,maxMessages:100,maxRequeues:0,
        connectionTimeout:15000,greetingTimeout:15000,socketTimeout:30000});
      try{return await require("../../nap-bcc-delivery").drain(backendContext.db,ref,{
        projectId:backendContext.ENVIRONMENT.projectId,fromEmail:config.fromEmail,send:mail=>transporter.sendMail(mail),attachments:backendContext.engagementMailAttachments,
        content:job=>{
          const footer=`\n\nVous pouvez gérer les notifications email dans la rubrique Mon compte :\n${backendContext.ENVIRONMENT.hostingOrigin}/portail.html#mon-compte`;
          const text=String(job.textBody||'').slice(0,5000)+(['opening_notification','competition_documents','club_recap_pdf'].includes(job.type)?footer:'');
          return {text,html:backendContext.livePalmesMailHtml(text)};
        },
        eligible:(job,item,snapshot)=>{
          if(['entries_txt','officials_pdf'].includes(job.type))return !item.uid&&backendContext.normalizeEmail(item.email)===backendContext.normalizeEmail(job.type==='entries_txt'?competition.computerEmail:competition.officialsManagerEmail);
          const user=snapshot?.data();
          if(!user||user.status!=='active')return false;
          const recipient={...backendContext.engagementMailRecipientFromUserDoc(snapshot),napClubRegionId:item.recipientRegionId};
          if(recipient.email!==item.email||String(recipient.clubId)!==item.clubId||!recipient.competitionNotificationsEnabled)return false;
          if(job.type==='club_recap_pdf')return item.clubId===job.clubId&&backendContext.engagementRecipientHasCapability(recipient,'engagements.club.manage');
          return services.select(job.type==='opening_notification'?'opening':'documents',[recipient],competition,event).length===1;
        }
      });}finally{transporter.close();}
    };
    return services;
  }

  return { nativeNotificationAutomationServices, nativeNotificationTaskServices };
}

module.exports = { createCompetitionService_nativeNotificationAutomationServices };
