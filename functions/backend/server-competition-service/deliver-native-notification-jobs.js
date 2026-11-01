// Existing operation bodies; live services arrive through explicit accessors.
function createCompetitionService_deliverNativeNotificationJobs(backendContext) {
  async function deliverNativeNotificationJobs(competitionId = '') {
    const control=require("../../engagement-mail-control");
    if(!(await control.read(backendContext.db)).enabled)return {processed:0,sent:0};
    const config=backendContext.engagementMailSmtpConfig();
    if(!config.ready)throw new TypeError('Configuration des mails indisponible.');
    const transporter=backendContext.nodemailer.createTransport({...config.transport,pool:true,maxConnections:1,maxMessages:100,
      maxRequeues:0,connectionTimeout:15000,greetingTimeout:15000,socketTimeout:30000});
    try {
      return await require("../../nap-mail-delivery").drain(backendContext.db,{projectId:backendContext.ENVIRONMENT.projectId,competitionId,
        send:doc=>backendContext.sendEngagementMailJob(transporter,doc,config,{uid:'nap-notification-automation',email:''})});
    } finally { transporter.close(); }
  }

  return { deliverNativeNotificationJobs };
}

module.exports = { createCompetitionService_deliverNativeNotificationJobs };
