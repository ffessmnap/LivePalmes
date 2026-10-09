"use strict";
// Fixed native references. Values are club ids except the WinPalme staging
// column, which also accepts the club code/federal number as a blocker.
const references=[
  {table:"chefsdequipe",field:"club",index:"livepalmes_club_id"},
  {table:"chefsdequipe",field:"pourclub",index:"livepalmes_pourclub_id",add:true},
  ...["clubs_users","cnc_club","cnc_edf","cnc_items","cnc_medailles","cnc_nageurs","cnc_summaries","engagements_relais","import_relais","officielsengager","perfs","perfs_relais","txt_clubs","txt_nageurs","winpalme_lignes"].map(table=>({table,field:"club",index:"livepalmes_club_id",add:true})),
  {table:"livepalmes_club_entry_options",field:"club_id",index:"club_competition"},
  {table:"livepalmes_club_people_options",field:"club_id",index:"club_person"},
  {table:"livepalmes_deleted_people_history",field:"entry_club",index:"livepalmes_entry_club_id",add:true},
  {table:"livepalmes_deleted_people_history",field:"club",index:"livepalmes_club_id",add:true},
  {table:"livepalmes_qualification_grants",field:"club_id",index:"livepalmes_club_id",add:true},
  {table:"nageurs",field:"club",index:"livepalmes_club_id"},
  {table:"officiels",field:"club",index:"livepalmes_club_id"}
];
const indexes=references.filter(item=>item.add).map(item=>({table:item.table,name:item.index,columns:[item.field,...(item.table==="livepalmes_deleted_people_history"?["engagement_id"]:item.table==="livepalmes_qualification_grants"?["competition_id","swimmer_id","event_code"]:["id"])]}));
module.exports={references,indexes};
