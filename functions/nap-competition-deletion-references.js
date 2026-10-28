"use strict";
// Fixed metadata-reviewed native references; no runtime table names from the client.
module.exports=[
  {table:"livepalmes_license_control_history",field:"competition_id",index:"competition_history",cleanup:false},
  {"table":"livepalmes_calendar_event_details","field":"competition_id","index":"PRIMARY","cleanup":true},
  {
    "table": "chefsdequipe",
    "field": "compet",
    "index": "livepalmes_compet_id",
    "cleanup": false
  },
  {
    "table": "compet_comites",
    "field": "compet",
    "index": "livepalmes_compet_comite_id",
    "cleanup": true
  },
  {
    "table": "compet_courses",
    "field": "compet",
    "index": "compet",
    "cleanup": true
  },
  {
    "table": "compet_parametres",
    "field": "compet",
    "index": "compet",
    "cleanup": true
  },
  {
    "table": "compet_participations",
    "field": "compet",
    "index": "livepalmes_compet_id",
    "cleanup": true
  },
  {
    "table": "courses_swim",
    "field": "compet",
    "index": "livepalmes_compet_course_cat_id",
    "cleanup": true
  },
  {
    "table": "documents",
    "field": "competition",
    "index": "livepalmes_compet_public_id",
    "cleanup": true
  },
  {
    "table": "engagements_relais",
    "field": "compet",
    "index": "livepalmes_compet_club_id",
    "cleanup": false
  },
  {
    "table": "forfait",
    "field": "compet",
    "index": "livepalmes_compet_engagement_id",
    "cleanup": false
  },
  {
    "table": "import_relais",
    "field": "compet",
    "index": "livepalmes_delete_compet",
    "cleanup": false
  },
  {
    "table": "livepalmes_club_entry_options",
    "field": "competition_id",
    "index": "PRIMARY",
    "cleanup": true
  },
  {
    "table": "livepalmes_competition_fees",
    "field": "competition_id",
    "index": "PRIMARY",
    "cleanup": true
  },
  {
    "table": "livepalmes_competition_options",
    "field": "competition_id",
    "index": "PRIMARY",
    "cleanup": true
  },
  {
    "table": "livepalmes_competition_programs",
    "field": "competition_id",
    "index": "PRIMARY",
    "cleanup": true
  },
  {
    "table": "livepalmes_course_options",
    "field": "competition_id",
    "index": "PRIMARY",
    "cleanup": true
  },
  {
    "table": "livepalmes_deleted_people_history",
    "field": "competition_id",
    "index": "livepalmes_delete_competition_id",
    "cleanup": false
  },
  {
    "table": "livepalmes_performance_changes",
    "field": "competition_id",
    "index": "competition_change",
    "cleanup": false
  },
  {
    "table": "livepalmes_performance_imports",
    "field": "competition_id",
    "index": "competition_import",
    "cleanup": false
  },
  {
    "table": "livepalmes_qualification_competitions",
    "field": "qualifying_competition_id",
    "index": "qualifying_group",
    "cleanup": false
  },
  {
    "table": "livepalmes_qualification_grants",
    "field": "competition_id",
    "index": "competition_club",
    "cleanup": true
  },
  {
    "table": "livepalmes_qualification_groups",
    "field": "competition_id",
    "index": "competition_position",
    "cleanup": true
  },
  {
    "table": "livepalmes_qualification_jobs",
    "field": "competition_id",
    "index": "competition_state",
    "cleanup": true
  },
  {
    "table": "livepalmes_qualification_standards",
    "field": "competition_id",
    "index": "PRIMARY",
    "cleanup": true
  },
  {
    "table": "nageursengager",
    "field": "compet",
    "index": "livepalmes_compet_nageur_id",
    "cleanup": false
  },
  {
    "table": "officielsengager",
    "field": "compet",
    "index": "livepalmes_compet_club_id",
    "cleanup": false
  },
  {
    "table": "perfs",
    "field": "compet",
    "index": "livepalmes_compet_id",
    "cleanup": false
  },
  {
    "table": "perfs_relais",
    "field": "compet",
    "index": "livepalmes_compet_id",
    "cleanup": false
  },
  {
    "table": "records",
    "field": "compet",
    "index": "livepalmes_delete_compet",
    "cleanup": false
  },
  {
    "table": "txt_clubs",
    "field": "compet",
    "index": "livepalmes_delete_compet",
    "cleanup": false
  },
  {
    "table": "txt_import",
    "field": "compet",
    "index": "livepalmes_delete_compet",
    "cleanup": false
  },
  {
    "table": "txt_nageurs",
    "field": "compet",
    "index": "livepalmes_delete_compet",
    "cleanup": false
  },
  {
    "table": "winpalme_sessions",
    "field": "compet",
    "index": "livepalmes_compet_session_id",
    "cleanup": true
  }
];
