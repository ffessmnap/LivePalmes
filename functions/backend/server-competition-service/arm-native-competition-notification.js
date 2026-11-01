// Existing operation bodies; live services arrive through explicit accessors.
function createCompetitionService_armNativeCompetitionNotification(backendContext) {
  async function armNativeCompetitionNotification(context,input,operation) {
    const patch=input.patch||{};
    if(!['entryStatus','entryDeadlineAt','entryDeadlineLocal'].some(key=>Object.hasOwn(patch,key)))return;
    const competition=await (0, backendContext.local$nativePortalCompetition)(input.competitionId,event=>(0, backendContext.local$assertCanManageEngagementCompetition)(context,event));
    const journal=await backendContext.db.collection('auditLogs').doc(`nap-competition-${operation}-before`).get();
    if(!journal.exists)throw new TypeError('Sauvegarde de notification introuvable.');
    const requested=journal.data()?.target?.notificationOpeningRequested===true;
    const automation=require("../../nap-notification-automation"),id=String(require("../../nap-direct-calendar").positiveId(competition.id));
    await automation.arm(backendContext.db,{competitionId:id,operation,deliveryMode:'bcc-v1',
      action:competition.entryStatus,deadline:competition.entryDeadlineAt,openingRequested:requested,actorUid:context.uid,newCycle:requested});
    for(const kind of competition.entryStatus==='open'?['opening','closure']:competition.entryStatus==='closed'?['closure']:[])
      await (0, backendContext.local$enqueueNativeNotificationTask)(automation.eventRef(backendContext.db,id,operation,kind).id);
  }

  return { armNativeCompetitionNotification };
}

module.exports = { createCompetitionService_armNativeCompetitionNotification };
