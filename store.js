/* =========================================================
   Armazenamento local (localStorage) + sincronização opcional
   via Firebase Realtime Database (API REST, sem bibliotecas).
   Mescla por item (último a editar vence) para 2+ pessoas.
   ========================================================= */
(function (g) {
  'use strict';
  const KEY = 'orcamentos-reforma.v1';
  const CFG = 'orcamentos-reforma.cfg.v1';
  const COLLS = ['categorias', 'orcamentos', 'notas'];

  let state, cfg;
  const listeners = [];
  let pushTimer = null, pollTimer = null, busy = false;
  let status = { kind: 'off', msg: 'Somente neste aparelho', last: null };

  /* ---------- util ---------- */
  function stable(v) {
    if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
    if (v && typeof v === 'object') {
      return '{' + Object.keys(v).sort().filter((k) => v[k] !== undefined).map((k) => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}';
    }
    return JSON.stringify(v);
  }
  function normalize(s) {
    s = s && typeof s === 'object' ? s : {};
    const out = {
      v: 1,
      meta: Object.assign({ nome: 'Minha reforma', areaM2: '', orcamentoDisponivel: '', updatedAt: 0 }, s.meta || {}),
      tombs: s.tombs || {},
    };
    COLLS.forEach((c) => {
      const raw = s[c];
      const arr = Array.isArray(raw) ? raw : raw && typeof raw === 'object' ? Object.values(raw) : [];
      out[c] = arr.filter(Boolean);
    });
    out.orcamentos.forEach((o) => {
      const p = o.pagamentos;
      o.pagamentos = Array.isArray(p) ? p.filter(Boolean) : p && typeof p === 'object' ? Object.values(p) : [];
    });
    return out;
  }
  function merge(a, b) {
    a = normalize(a); b = normalize(b);
    const tombs = Object.assign({}, a.tombs);
    Object.keys(b.tombs).forEach((k) => { tombs[k] = Math.max(tombs[k] || 0, b.tombs[k] || 0); });
    const out = { v: 1, tombs, meta: (b.meta.updatedAt || 0) > (a.meta.updatedAt || 0) ? b.meta : a.meta };
    COLLS.forEach((c) => {
      const map = new Map();
      a[c].concat(b[c]).forEach((it) => {
        const cur = map.get(it.id);
        if (!cur || (it.updatedAt || 0) > (cur.updatedAt || 0)) map.set(it.id, it);
      });
      out[c] = Array.from(map.values()).filter((it) => !(tombs[it.id] >= (it.updatedAt || 0)));
    });
    return out;
  }

  /* ---------- carga / gravação ---------- */
  function load() {
    try { state = normalize(JSON.parse(localStorage.getItem(KEY))); } catch (e) { state = null; }
    if (!state || !state.orcamentos.length && !state.categorias.length) state = normalize(Data.seed());
    try { cfg = JSON.parse(localStorage.getItem(CFG)) || {}; } catch (e) { cfg = {}; }
    refreshStatus();
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { console.warn('Falha ao salvar localmente', e); }
  }
  function saveCfg() { try { localStorage.setItem(CFG, JSON.stringify(cfg)); } catch (e) {} }
  function emit(origin) { listeners.forEach((fn) => fn(origin)); }
  function changed() { save(); emit('local'); schedulePush(); }

  /* ---------- API de dados ---------- */
  function stamp(it) { it.updatedAt = Date.now(); it.updatedBy = cfg.user || ''; return it; }
  function upsert(coll, item) {
    stamp(item);
    const i = state[coll].findIndex((x) => x.id === item.id);
    if (i >= 0) state[coll][i] = item; else state[coll].push(item);
    delete state.tombs[item.id];
    changed();
    return item;
  }
  function remove(coll, id) {
    state[coll] = state[coll].filter((x) => x.id !== id);
    state.tombs[id] = Date.now();
    changed();
  }
  function setMeta(patch) {
    Object.assign(state.meta, patch);
    stamp(state.meta);
    changed();
  }
  /* várias alterações num só salvamento */
  function batch(fn) {
    const origChanged = changed;
    let dirty = false;
    const api = {
      upsert: (c, i) => { stamp(i); const k = state[c].findIndex((x) => x.id === i.id); if (k >= 0) state[c][k] = i; else state[c].push(i); delete state.tombs[i.id]; dirty = true; },
      remove: (c, id) => { state[c] = state[c].filter((x) => x.id !== id); state.tombs[id] = Date.now(); dirty = true; },
    };
    fn(api);
    if (dirty) origChanged();
  }
  /* mode: 'replace' | 'merge' */
  function importState(incoming, mode) {
    incoming = normalize(incoming);
    const now = Date.now();
    if (mode === 'merge') {
      // itens importados entram como "novos" (mais recentes) para prevalecer em caso de conflito
      COLLS.forEach((c) => incoming[c].forEach((it) => { it.updatedAt = now; }));
      incoming.meta.updatedAt = now;
      state = merge(state, incoming);
    } else {
      const keep = new Set();
      COLLS.forEach((c) => incoming[c].forEach((it) => { it.updatedAt = now; keep.add(it.id); }));
      incoming.meta.updatedAt = now;
      const tombs = Object.assign({}, state.tombs);
      COLLS.forEach((c) => state[c].forEach((it) => { if (!keep.has(it.id)) tombs[it.id] = now; }));
      keep.forEach((id) => delete tombs[id]);
      incoming.tombs = tombs;
      state = incoming;
    }
    changed();
  }

  /* ---------- sincronização ---------- */
  function endpoint() {
    if (!cfg.url || !cfg.room) return null;
    let base = cfg.url.trim().replace(/\/+$/, '');
    if (!/^https?:\/\//i.test(base)) base = 'https://' + base;
    return base + '/salas/' + encodeURIComponent(cfg.room.trim()) + '.json';
  }
  function refreshStatus() {
    if (!endpoint()) status = { kind: 'off', msg: 'Somente neste aparelho', last: null };
  }
  function setStatus(kind, msg) {
    status = { kind, msg, last: kind === 'ok' ? Date.now() : status.last };
    emit('status');
  }
  async function sync() {
    const url = endpoint();
    if (!url) { refreshStatus(); emit('status'); return { ok: false, reason: 'config' }; }
    if (busy) return { ok: false, reason: 'busy' };
    busy = true;
    setStatus('sync', 'Sincronizando…');
    try {
      const r = await fetch(url, { cache: 'no-store' });
      if (!r.ok) throw new Error('HTTP ' + r.status + (r.status === 401 || r.status === 403 ? ' (permissão negada – revise as regras do Firebase)' : ''));
      const remoteRaw = await r.json();
      const merged = remoteRaw ? merge(state, remoteRaw) : normalize(state);
      const before = stable(state);
      const changedLocal = stable(merged) !== before;
      state = merged;
      if (changedLocal) { save(); emit('remote'); }
      const remoteNorm = remoteRaw ? normalize(remoteRaw) : null;
      if (!remoteNorm || stable(remoteNorm) !== stable(merged)) {
        const w = await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(merged) });
        if (!w.ok) throw new Error('Falha ao enviar (HTTP ' + w.status + ')');
      }
      setStatus('ok', 'Sincronizado');
      return { ok: true };
    } catch (e) {
      setStatus('err', 'Erro na sincronização: ' + (e && e.message ? e.message : e));
      return { ok: false, reason: 'error', error: e };
    } finally { busy = false; }
  }
  function schedulePush() {
    if (!endpoint()) return;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(sync, 900);
  }
  function startPolling() {
    clearInterval(pollTimer);
    if (!endpoint()) return;
    pollTimer = setInterval(() => { if (!document.hidden) sync(); }, 20000);
  }
  function setConfig(patch) {
    Object.assign(cfg, patch);
    saveCfg();
    refreshStatus();
    startPolling();
    emit('status');
  }

  function init() {
    load();
    startPolling();
    document.addEventListener('visibilitychange', () => { if (!document.hidden) sync(); });
    window.addEventListener('online', sync);
    if (endpoint()) sync();
  }

  g.Store = {
    init, get: () => state, cfg: () => cfg, setConfig, subscribe: (fn) => listeners.push(fn),
    upsert, remove, setMeta, batch, importState, sync, status: () => status, hasSync: () => !!endpoint(),
    normalize, merge,
  };
})(window);
