(function (global) {
  'use strict';
  const $ = id => document.getElementById(id), fixture = global.DirectPreview;
  let review;
  function show(groups) {
    review = global.LivePalmesDirectImportReview.mount($('importPreviews'), groups, {
      verify:async payloads => ({replacements:payloads.filter(payload => fixture.data().events.some(event => event.id === fixture.eventId(payload.event))).map(payload => payload.event.eventLabel + ' · ' + ({F:'Femmes',M:'Hommes',X:'Mixte'}[payload.event.sex]))}),
      publish:async payloads => {fixture.save(payloads);}
    });
  }
  show(structuredClone(fixture.groups));
  $('resetDemo').onclick = () => {fixture.reset(); show(structuredClone(fixture.groups)); $('importStatus').textContent = 'Exemples réinitialisés.';};
  $('parseFiles').onclick = async () => {
    const button = $('parseFiles');
    if (!$('pdfFiles').files.length) {$('importStatus').textContent = 'Choisir au moins un PDF.'; return;}
    button.disabled = true; $('importStatus').textContent = 'Lecture locale des PDF…';
    try {
      const groups = await global.LivePalmesDirectImport.files([...$('pdfFiles').files], $('importKind').value, {eventCode:$('fallbackCode').value,sex:$('fallbackSex').value,date:$('importDate').value,sessionKey:$('importSession').value,phase:'series'});
      show(groups); $('importStatus').textContent = 'Lecture terminée. La publication restera simulée dans cette maquette.';
    } catch (error) {$('importStatus').textContent = error.message;}
    finally {button.disabled = false;}
  };
  global.DirectPreviewAdmin = {get review() {return review;}, show};
})(window);
