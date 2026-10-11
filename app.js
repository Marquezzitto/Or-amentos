/* =========================================================
   Inicialização e eventos globais
   ========================================================= */
(function () {
  'use strict';
  const D = Data, S = Store, U = UI, $ = U.$;

  /* ---------- tema ---------- */
  U.applyTheme = (mode) => {
    try { localStorage.setItem('orc-theme', mode); } catch (e) {}
    if (mode === 'light' || mode === 'dark') document.documentElement.dataset.theme = mode;
    else delete document.documentElement.dataset.theme;
  };
  function initTheme() {
    let m = 'auto';
    try { m = localStorage.getItem('orc-theme') || 'auto'; } catch (e) {}
    U.applyTheme(m);
  }

  /* ---------- cliques ---------- */
  document.addEventListener('click', (ev) => {
    const t = ev.target;
    if (!(t instanceof Element)) return;

    // clique no fundo do <dialog> fecha (somente detalhe)
    if (t.id === 'dlg-detail') { t.close(); return; }

    const act = t.closest('[data-act]');
    if (act) {
      const fn = U.handlers[act.dataset.act];
      if (fn) {
        if (act.tagName === 'A') ev.preventDefault();
        fn(act, ev);
        return;
      }
    }
    const go = t.closest('[data-goto]');
    if (go) { U.goto(go.dataset.goto); return; }
    const tab = t.closest('.tab-btn');
    if (tab) { U.goto(tab.dataset.tab); return; }

    if (t.closest('#btn-theme')) {
      const cur = (localStorage.getItem('orc-theme') || 'auto');
      const next = { auto: 'light', light: 'dark', dark: 'auto' }[cur];
      U.applyTheme(next);
      U.toast('Tema: ' + { auto: 'automático', light: 'claro', dark: 'escuro' }[next]);
      return;
    }
    if (t.closest('#btn-print')) { window.print(); return; }

    const tr = t.closest('tr.clickable[data-id]');
    if (tr && !t.closest('button,select,a,input,label,textarea')) U.openDetail(tr.dataset.id);
  });

  /* ---------- mudanças em campos ---------- */
  document.addEventListener('change', (ev) => {
    const el = ev.target;
    if (el.id === 'f_categoria' && el.value === '__nova__') { U.newCategoryFromForm(el); return; }
    if (el.closest && el.closest('#form-orc')) { U.calcForm(); return; }
    if (el.id === 'file-json') { if (el.files && el.files[0]) U.importFile(el.files[0]); el.value = ''; return; }

    // filtros da lista
    const f = U.filters;
    const map = { 'f-cat': 'cat', 'f-status': 'status', 'f-valid': 'valid', 'f-ordem': 'ordem' };
    if (map[el.id]) { f[map[el.id]] = el.value; U.views.orcamentos(); return; }
    if (el.id === 'f-desc') { f.desc = el.checked; U.views.orcamentos(); return; }

    for (const h of U.changeHandlers) if (h(el, ev)) return;
  });
  document.addEventListener('input', (ev) => {
    const el = ev.target;
    if (el.id === 'f-q') { U.filters.q = el.value; U.views.orcamentos(); }
    else if (el.closest && el.closest('#form-orc')) U.calcForm();
  });
  document.addEventListener('focusout', () => {
    if (!U.pendingRender) return;
    setTimeout(() => { if (U.pendingRender && !U.isEditing()) U.render(); }, 250);
  });
  document.addEventListener('submit', (ev) => {
    if (ev.target.id === 'form-orc') U.saveForm(ev);
  });

  /* ---------- diálogos ---------- */
  $('#dlg-form').addEventListener('close', () => { if (U.pendingRender) U.render(); });
  $('#dlg-detail').addEventListener('close', () => { U.detailId = null; if (U.pendingRender) U.render(); });
  $('#form-who').addEventListener('submit', (ev) => {
    const nome = $('#who-name').value.trim();
    if (!nome) { ev.preventDefault(); return; }
    S.setConfig({ user: nome });
    U.toast('Olá, ' + nome + '!');
  });

  /* ---------- navegação ---------- */
  window.addEventListener('hashchange', () => { window.scrollTo(0, 0); U.render(); });

  /* ---------- dados ---------- */
  let renderTimer = null;
  S.subscribe((origin) => {
    if (origin === 'status') { U.renderSync(); return; }
    if (origin === 'remote') { U.softRender(); return; }
    clearTimeout(renderTimer);
    renderTimer = setTimeout(U.render, 0); // depois que o foco já mudou de campo
  });

  /* ---------- início ---------- */
  initTheme();
  S.init();
  U.render();
  if (!S.cfg().user) {
    setTimeout(() => { const d = $('#dlg-who'); if (!d.open) { d.showModal(); $('#who-name').focus(); } }, 400);
  }
  if ('serviceWorker' in navigator && false) navigator.serviceWorker.register('sw.js');
})();
