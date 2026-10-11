/* =========================================================
   Núcleo da interface: helpers, roteamento por abas, render
   ========================================================= */
(function (g) {
  'use strict';
  const D = Data, S = Store;

  const UI = {
    TABS: ['painel', 'orcamentos', 'financeiro', 'categorias', 'notas', 'config'],
    filters: { q: '', cat: '', status: '', valid: '', ordem: 'codigo', desc: true },
    views: {},        // views[tab] = função que desenha a aba
    handlers: {},     // handlers[data-act] = (el, ev) => void
    changeHandlers: [], // [(el, ev) => boolean]  (true = tratou)
    tab: 'painel',
    detailId: null,
    pendingRender: false,
  };
  UI.$ = (s, r) => (r || document).querySelector(s);
  UI.$$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  UI.esc = D.esc;

  UI.norm = (s) => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

  UI.linkify = (text) =>
    D.esc(text).replace(/(https?:\/\/[^\s<]+)/g, (u) => '<a href="' + u + '" target="_blank" rel="noopener noreferrer">' + u + '</a>');

  UI.fmtDateTime = (ts) => {
    if (!ts || ts <= 1) return '—';
    const d = new Date(ts);
    const p = (n) => String(n).padStart(2, '0');
    return p(d.getDate()) + '/' + p(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  };

  UI.stars = (n) => {
    n = Math.max(0, Math.min(5, +n || 0));
    return n ? '<span class="stars" title="' + n + ' de 5">' + '★'.repeat(n) + '☆'.repeat(5 - n) + '</span>' : '<span class="muted">—</span>';
  };

  UI.nextCodigo = () => {
    const nums = S.get().orcamentos.map((o) => +((/(\d+)/.exec(o.codigo || '') || [0, 0])[1]));
    return 'O-' + String(Math.max(0, ...nums) + 1).padStart(3, '0');
  };

  UI.statusBadge = (st) => {
    const cls = { 'Em cotação': 'b-info', Escolhido: 'b-warn', Contratado: 'b-ok', Descartado: 'b-gray' }[st] || 'b-gray';
    return '<span class="badge ' + cls + '">' + D.esc(st) + '</span>';
  };
  UI.validBadge = (o, hoje) => {
    const v = D.validadeInfo(o, hoje);
    if (o.status === 'Contratado' || o.status === 'Descartado') return '';
    const cls = { ok: 'b-ok', breve: 'b-warn', vencido: 'b-bad', sem: 'b-gray' }[v.key];
    let lbl = v.label;
    if (v.key === 'vencido') lbl = 'Vencido há ' + Math.abs(v.dias) + ' dia' + (Math.abs(v.dias) === 1 ? '' : 's');
    if (v.key === 'breve' && v.dias > 0) lbl = 'Vence em ' + v.dias + ' dia' + (v.dias === 1 ? '' : 's');
    return '<span class="badge ' + cls + '">' + lbl + '</span>';
  };

  UI.toast = (msg, actionLabel, actionFn) => {
    const box = UI.$('#toasts');
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = '<span>' + D.esc(msg) + '</span>';
    if (actionLabel) {
      const b = document.createElement('button');
      b.textContent = actionLabel;
      b.onclick = () => { actionFn && actionFn(); el.remove(); };
      el.appendChild(b);
    }
    box.appendChild(el);
    setTimeout(() => el.remove(), actionLabel ? 7000 : 3200);
  };

  UI.download = (name, mime, content) => {
    const blob = new Blob([content], { type: mime });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  };

  /* ---------- navegação ---------- */
  UI.goto = (tab) => {
    if (!UI.TABS.includes(tab)) tab = 'painel';
    if (location.hash.slice(1) !== tab) location.hash = tab; // dispara hashchange
    else UI.render();
  };
  function tabFromHash() {
    const t = location.hash.slice(1);
    return UI.TABS.includes(t) ? t : 'painel';
  }

  /* ---------- cabeçalho ---------- */
  UI.renderHeader = () => {
    const s = S.get();
    UI.$('#obra-nome').textContent = s.meta.nome || 'Orçamentos da Reforma';
    document.title = (s.meta.nome ? s.meta.nome + ' · ' : '') + 'Orçamentos';
    const area = D.num(s.meta.areaM2);
    UI.$('#obra-sub').textContent =
      (area ? String(area).replace('.', ',') + ' m² · ' : '') + s.orcamentos.length + ' orçamento' + (s.orcamentos.length === 1 ? '' : 's');
    UI.renderSync();
  };
  UI.renderSync = () => {
    const st = S.status();
    const chip = UI.$('#sync-chip');
    chip.dataset.kind = st.kind;
    UI.$('#sync-text').textContent = st.kind === 'ok' ? 'Sincronizado' + (st.last ? ' às ' + new Date(st.last).toTimeString().slice(0, 5) : '') : st.msg;
    chip.title = st.msg;
    UI.$('#foot-sync').textContent = S.hasSync() ? ' e sincronizados na nuvem' : '';
    if (UI.tab === 'config' && UI.views.configStatus) UI.views.configStatus();
  };

  /* ---------- render ---------- */
  UI.isEditing = () => {
    if (UI.$('dialog[open]')) return true;
    const a = document.activeElement;
    return !!(a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && a.closest('#main'));
  };
  function focusKey(a) {
    if (!a || !/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) || !a.closest('#main')) return null;
    for (const k of ['data-meta', 'data-cat-prev', 'data-status-id', 'data-nota-done']) {
      if (a.hasAttribute(k)) return '[' + k + '="' + a.getAttribute(k) + '"]';
    }
    return a.id ? '#' + a.id : null;
  }
  UI.render = () => {
    const key = focusKey(document.activeElement);
    UI.pendingRender = false;
    UI.tab = tabFromHash();
    UI.TABS.forEach((t) => {
      const sec = UI.$('#tab-' + t);
      if (sec) sec.hidden = t !== UI.tab;
    });
    UI.$$('.tab-btn').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === UI.tab)));
    UI.renderHeader();
    const view = UI.views[UI.tab];
    if (view) view();
    if (UI.detailId && UI.$('#dlg-detail').open && UI.views.fillDetail) UI.views.fillDetail(UI.detailId);
    if (key) {
      const el = UI.$(key);
      if (el && el !== document.activeElement) {
        el.focus();
        try { if (/^(text|search|url)$/.test(el.type)) el.setSelectionRange(el.value.length, el.value.length); } catch (e) {}
      }
    }
  };
  UI.softRender = () => {
    if (UI.isEditing()) UI.pendingRender = true;
    else UI.render();
  };

  g.UI = UI;
})(window);
