'use strict';
// Stable competition-day clock for pre-existing Direct fixtures, independent of sporting timers.
const clock=()=>Date.parse('2026-11-07T12:00:00Z');
const store=require('../../functions/nap-direct-store'),pub=require('../../functions/nap-direct-public'),service=require('../../functions/nap-direct-service');
module.exports={clock,storeModule:{...store,createStore:(pool,environment,options={})=>store.createStore(pool,environment,{clock,...options})},publicModule:{...pub,readPublic:(pool,environment,input,options={})=>pub.readPublic(pool,environment,input,{clock,...options}),attachLinks:(pool,environment,events,rawDates,options={})=>pub.attachLinks(pool,environment,events,rawDates,{clock,...options})},serviceModule:{...service,createService:options=>service.createService({clock,...options})}};
