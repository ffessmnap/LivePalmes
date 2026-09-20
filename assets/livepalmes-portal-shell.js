/* Move existing controls; keep their identities and event handlers. */
(function () {
  "use strict";
  const body = document.body;
  const topbar = document.querySelector('.admin-portal-topbar');
  const sidebar = document.querySelector('.admin-portal-sidebar');
  const nav = document.querySelector('#adminPortalNavigation');
  const footer = document.querySelector('.admin-portal-nav-footer');
  if (!topbar || !sidebar || !nav || !footer) return;
  const head = document.createElement('div');
  head.className = 'admin-portal-sidebar-brand';
  head.hidden = true;
  sidebar.insertBefore(head, nav);
  const controls = ['.admin-portal-federal-logo', '.admin-portal-brand', '#adminPortalScopeContext', '#adminPortalAccount'].map(selector => {
    const element = document.querySelector(selector);
    const marker = document.createComment('portal control home');
    element.before(marker);
    return { element, marker };
  });
  const wide = window.matchMedia('(min-width: 1081px)');
  let active = false;
  function update() {
    const next = wide.matches && body.dataset.adminAuth === 'unlocked';
    if (next === active) return;
    active = next;
    if (active) {
      controls.forEach(({element}) => (element.id === 'adminPortalAccount' ? footer : head).append(element));
    } else {
      controls.forEach(({element, marker}) => marker.after(element));
    }
    head.hidden = !active;
    body.classList.toggle('portal-unified-shell', active);
    window.dispatchEvent(new Event('resize'));
  }
  wide.addEventListener('change', update);
  new MutationObserver(update).observe(body, {attributes:true, attributeFilter:['data-admin-auth']});
  update();
}());
