(function (global) {
  'use strict';
  if (!new URLSearchParams(location.search).has('id')) history.replaceState(null,'',location.pathname + '?id=900001');
  global.LivePalmesEnvironment = {napReaderUrl:location.origin + '/preview-api'};
  global.__directPreviewCalls=[];
  global.fetch = async function (input) {
    const url = new URL(String(input), location.href);
    if (url.origin !== location.origin || url.pathname !== '/preview-api') throw Error('La maquette ne contacte aucun service distant.');
    global.__directPreviewCalls.push(url.search);
    return {ok:true,json:async () => url.searchParams.get('action') === 'records' ? {data:{franceRecords:[],records:[]}} : global.DirectPreview.data(url.searchParams.get('eventId'),url.searchParams.get('view'))};
  };
  document.getElementById('calendarLink').hidden = true;
  document.querySelector('.direct-brand').removeAttribute('href');
})(window);
