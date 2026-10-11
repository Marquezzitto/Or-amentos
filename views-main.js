/* =========================================================
   Painel, lista de orçamentos, formulário e detalhe
   ========================================================= */
(function () {
  'use strict';
  const D = Data, S = Store, U = UI, esc = D.esc, $ = U.$;
  const PALETTE = ['#0f766e', '#2563eb', '#d97706', '#9333ea', '#dc2626', '#0891b2', '#65a30d', '#db2777', '#4f46e5', '#ca8a04', '#475569', '#059669', '#ea580c', '#7c3aed', '#0d9488'];
  const slugStatus = (s) => D.slug(s);

  /* =====================  PAINEL  ===================== */
  U.views.painel = function () {
    const s = S.get(), hoje = D.todayISO(), r = D.summarize(s, hoje);
    const a = r.alertas;
    const kpi = (cls, lbl, val, sub) =>
      '<div class="kpi ' + cls + '"><div class="lbl">' + lbl + '</div><div class="val">' + val + '</div>' + (sub ? '<div class="sub">' + sub + '</div>' : '') + '</div>';

    const saldoCls = r.saldo == null ? '' : r.saldo < 0 ? 'bad' : 'ok';
    const pctBar = r.pct == null ? '' :
      '<div class="bar ' + (r.pct > 100 ? 'bad' : r.pct >= 90 ? 'warn' : '') + '" style="margin-top:8px"><i style="width:' + Math.min(100, r.pct) + '%"></i></div>';

    const alertRow = (n, titulo, sub, action, bad) =>
      '<div class="alert ' + (n > 0 ? 'on ' + (bad ? 'bad' : '') : '') + '"' + (action && n > 0 ? ' data-act="filtro" ' + action + ' style="cursor:pointer"' : '') + '><div>' + titulo + (sub ? '<small>' + sub + '</small>' : '') + '</div><strong>' + n + '</strong></div>';

    const lista = (arr) => arr.map((o) => '<a href="#" data-act="ver" data-id="' + o.id + '">' + esc(o.codigo) + ' ' + esc(o.fornecedor) + (o.opcao ? ' (' + esc(o.opcao) + ')' : '') + ' – ' + D.fmtDate(o.validade) + '</a>').join(' · ');

    // distribuição
    const comValor = r.porCategoria.filter((c) => c.valor > 0);
    const stack = comValor.map((c, i) => '<i style="width:' + c.pct + '%;background:' + PALETTE[i % PALETTE.length] + '" title="' + esc(c.nome) + ': ' + D.fmtBRL(c.valor) + '"></i>').join('');
    const legend = comValor.map((c, i) => '<span style="--c:' + PALETTE[i % PALETTE.length] + '">' + esc(c.nome) + ' · ' + D.fmtPct(c.pct) + '</span>').join('');

    const badgeCls = { ok: 'b-ok', warn: 'b-warn', bad: 'b-bad', sem: 'b-gray' };
    const rows = r.porCategoria.map((c) => {
      const forn = c.considerados.length ? c.considerados.map((o) => esc(o.fornecedor)).join(' + ') : '—';
      const opc = c.considerados.length ? c.considerados.map((o) => esc(o.opcao || o.descricao.slice(0, 40))).join(' + ') : '—';
      const barCls = c.sk === 'bad' ? 'bad' : '';
      return '<tr class="clickable" data-act="filtro" data-cat="' + esc(c.nome) + '">' +
        '<td data-label="Categoria"><strong>' + esc(c.nome) + '</strong></td>' +
        '<td data-label="Fornecedor escolhido">' + forn + '</td>' +
        '<td data-label="Item / opção">' + opc + '</td>' +
        '<td data-label="Orç. ativos" class="num right">' + c.qtdAtivos + '</td>' +
        '<td data-label="Menor" class="num right">' + D.fmtBRL(c.min) + '</td>' +
        '<td data-label="Maior" class="num right">' + D.fmtBRL(c.max) + '</td>' +
        '<td data-label="Considerado" class="num right"><strong>' + (c.valor ? D.fmtBRL(c.valor) : '—') + '</strong></td>' +
        '<td data-label="% do total"><div class="bar-row"><div class="bar ' + barCls + '"><i style="width:' + Math.min(100, c.pct) + '%"></i></div><span class="num">' + D.fmtPct(c.pct) + '</span></div></td>' +
        '<td data-label="Previsto" class="num right">' + (c.previsto != null ? D.fmtBRL(c.previsto) : '<span class="muted">—</span>') + '</td>' +
        '<td data-label="Situação"><span class="badge ' + badgeCls[c.sk] + '">' + esc(c.situacao) + '</span></td></tr>';
    }).join('');

    $('#tab-painel').innerHTML =
      '<div class="section card">' +
        '<h2>⚙️ Parâmetros</h2>' +
        '<div class="params">' +
          '<div class="field"><label>Nome da obra</label><input data-meta="nome" value="' + esc(s.meta.nome) + '"></div>' +
          '<div class="field"><label>Área do imóvel (m²)</label><input data-meta="areaM2" type="number" step="0.01" min="0" inputmode="decimal" value="' + esc(s.meta.areaM2) + '"></div>' +
          '<div class="field"><label>Orçamento disponível (R$)</label><input data-meta="orcamentoDisponivel" type="number" step="0.01" min="0" inputmode="decimal" value="' + esc(s.meta.orcamentoDisponivel) + '" placeholder="Quanto vocês têm para gastar"><div class="hint">Usado para calcular saldo e % comprometido.</div></div>' +
          '<div class="field"><label>Data de hoje</label><input value="' + D.fmtDate(hoje) + '" disabled></div>' +
        '</div>' +
      '</div>' +

      '<div class="section"><div class="situacao ' + r.situacaoKey + '">' + ({ ok: '✅', warn: '⚠️', bad: '🚨', sem: 'ℹ️' }[r.situacaoKey]) + ' ' + esc(r.situacaoGeral) + '</div></div>' +

      '<div class="section grid kpis">' +
        kpi('accent', 'Total considerado', D.fmtBRL(r.totalConsiderado), 'Contratado + Escolhido (sem juros)') +
        kpi('', 'Já contratado', D.fmtBRL(r.contratado), 'Status "Contratado"') +
        kpi('', 'Escolhido (a contratar)', D.fmtBRL(r.escolhido), 'Status "Escolhido"') +
        kpi(saldoCls, 'Saldo', r.saldo == null ? '—' : D.fmtBRL(r.saldo), r.saldo == null ? 'Informe o orçamento disponível' : r.saldo < 0 ? 'Estourou o orçamento' : 'Sobra do orçamento') +
        '<div class="kpi"><div class="lbl">% do orçamento comprometido</div><div class="val">' + (r.pct == null ? '—' : D.fmtPct(r.pct)) + '</div>' + pctBar + '</div>' +
        kpi('', 'Saldo após só os contratados', r.saldoContratados == null ? '—' : D.fmtBRL(r.saldoContratados), 'Se nenhum "Escolhido" for fechado') +
        kpi('', 'Custo por m²', r.custoM2 == null ? '—' : D.fmtBRL(r.custoM2), 'Total considerado ÷ área') +
        kpi('', 'Cenário mais barato', D.fmtBRL(r.cenarioBarato), 'Menor opção ativa por categoria') +
        kpi('', 'Cenário mais caro', D.fmtBRL(r.cenarioCaro), 'Maior opção ativa por categoria') +
        kpi('ok', 'Já pago', D.fmtBRL(r.pagoTotal), 'Pagamentos registrados') +
        kpi('warn', 'Ainda a pagar', D.fmtBRL(r.aPagar), 'Considerado − pago') +
      '</div>' +

      '<div class="section grid two">' +
        '<div class="card"><h2>🔔 Alertas</h2><div class="alert-list">' +
          alertRow(a.cadastrados, 'Orçamentos cadastrados', '', 'data-valid=""', false) +
          alertRow(a.vencidos.length, 'Orçamentos vencidos', a.vencidos.length ? lista(a.vencidos) : '', 'data-valid="vencido"', true) +
          alertRow(a.breves.length, 'Vencem em até 3 dias', a.breves.length ? lista(a.breves) : '', 'data-valid="breve"', false) +
          alertRow(a.semEscolha.length, 'Categorias com orçamento e SEM escolha', a.semEscolha.map((c) => esc(c.nome)).join(', '), '', false) +
          alertRow(a.multiplos.length, 'Categorias com mais de 1 escolhido', a.multiplos.map((c) => esc(c.nome)).join(', '), '', false) +
        '</div></div>' +
        '<div class="card"><h2>🥧 Distribuição do total considerado</h2>' +
          (comValor.length ? '<div class="stack-bar">' + stack + '</div><div class="legend">' + legend + '</div>' : '<p class="muted">Escolha ou contrate orçamentos para ver a distribuição.</p>') +
        '</div>' +
      '</div>' +

      '<div class="section card"><h2>🗂️ Por categoria <small class="muted">– clique para ver os orçamentos</small></h2>' +
        '<div class="table-wrap"><table class="resp"><thead><tr><th>Categoria</th><th>Fornecedor escolhido</th><th>Item / opção</th><th class="right">Orç. ativos</th><th class="right">Menor</th><th class="right">Maior</th><th class="right">Considerado</th><th>% do total</th><th class="right">Previsto</th><th>Situação</th></tr></thead>' +
        '<tbody>' + rows + '</tbody>' +
        '<tfoot><tr><td>TOTAL</td><td></td><td></td><td class="num right">' + r.porCategoria.reduce((n, c) => n + c.qtdAtivos, 0) + '</td><td></td><td></td><td class="num right">' + D.fmtBRL(r.totalConsiderado) + '</td><td></td><td></td><td></td></tr></tfoot></table></div></div>';
  };

  /* =====================  LISTA DE ORÇAMENTOS  ===================== */
  function filtrar(s) {
    const f = U.filters, hoje = D.todayISO(), q = U.norm(f.q).trim();
    let list = s.orcamentos.filter((o) => {
      if (f.cat && o.categoria !== f.cat) return false;
      if (f.status && o.status !== f.status) return false;
      if (!f.desc && o.status === 'Descartado') return false;
      if (f.valid) {
        const v = D.validadeInfo(o, hoje).key;
        if (v !== f.valid) return false;
        if (!D.alertaValidade(o) && (f.valid === 'vencido' || f.valid === 'breve')) return false;
      }
      if (q) {
        const hay = U.norm([o.codigo, o.categoria, o.fornecedor, o.descricao, o.opcao, o.formaPagamento, o.incluso, o.naoIncluso, o.contato, o.links, o.obs, o.status, o.prazo, o.garantia, o.cotadoPor].join(' | '));
        if (!q.split(/\s+/).every((t) => hay.includes(t))) return false;
      }
      return true;
    });
    const catIdx = (n) => { const i = s.categorias.findIndex((c) => c.nome === n); return i < 0 ? 999 : i; };
    const cod = (o) => +((/(\d+)/.exec(o.codigo || '') || [0, 0])[1]);
    const cmp = {
      codigo: (a, b) => cod(a) - cod(b),
      categoria: (a, b) => catIdx(a.categoria) - catIdx(b.categoria) || cod(a) - cod(b),
      fornecedor: (a, b) => U.norm(a.fornecedor).localeCompare(U.norm(b.fornecedor)) || cod(a) - cod(b),
      'valor-asc': (a, b) => D.total(a) - D.total(b),
      'valor-desc': (a, b) => D.total(b) - D.total(a),
      validade: (a, b) => (a.validade || '9999') < (b.validade || '9999') ? -1 : (a.validade || '9999') > (b.validade || '9999') ? 1 : 0,
      recente: (a, b) => (b.updatedAt || 0) - (a.updatedAt || 0),
    }[f.ordem] || ((a, b) => cod(a) - cod(b));
    return list.sort(cmp);
  }

  U.views.orcamentos = function () {
    const s = S.get(), f = U.filters, hoje = D.todayISO();
    // opções de categoria
    const nomes = s.categorias.map((c) => c.nome);
    s.orcamentos.forEach((o) => { if (o.categoria && !nomes.includes(o.categoria)) nomes.push(o.categoria); });
    const selCat = $('#f-cat');
    selCat.innerHTML = '<option value="">Todas as categorias</option>' + nomes.map((n) => '<option' + (n === f.cat ? ' selected' : '') + '>' + esc(n) + '</option>').join('');
    if (document.activeElement !== $('#f-q')) $('#f-q').value = f.q;
    $('#f-status').value = f.status; $('#f-valid').value = f.valid; $('#f-ordem').value = f.ordem; $('#f-desc').checked = f.desc;

    const list = filtrar(s);
    const somaExibida = D.sum(list.map(D.total));
    const somaCons = D.sum(list.filter((o) => D.CONSIDERA(o.status)).map(D.total));
    $('#orc-resumo').innerHTML = list.length + ' de ' + s.orcamentos.length + ' orçamentos · soma exibida <strong>' + D.fmtBRL(somaExibida) + '</strong> · considerados nesta lista <strong>' + D.fmtBRL(somaCons) + '</strong>';

    if (!list.length) {
      $('#orc-lista').innerHTML = '<div class="card muted" style="text-align:center;padding:30px">Nenhum orçamento encontrado. ' +
        (s.orcamentos.length ? 'Ajuste os filtros ou ' : '') + '<a href="#" data-act="novo">cadastre um novo orçamento</a>.</div>';
      return;
    }

    const rows = list.map((o) => {
      const tot = D.total(o), pg = D.pago(o), n = D.nParc(o), av = D.aVista(o);
      const st = D.STATUS.map((x) => '<option' + (x === o.status ? ' selected' : '') + '>' + x + '</option>').join('');
      const desc = (o.descricao || '').replace(/\s+/g, ' ');
      return '<tr class="clickable ' + (o.status === 'Descartado' ? 'descartado' : '') + '" data-id="' + o.id + '">' +
        '<td data-label="Cód." class="num">' + esc(o.codigo) + '</td>' +
        '<td data-label="Categoria">' + esc(o.categoria) + '</td>' +
        '<td data-label="Fornecedor / item"><strong>' + esc(o.fornecedor) + '</strong>' + (o.opcao ? ' <span class="badge b-gray">' + esc(o.opcao) + '</span>' : '') + (desc ? '<div class="sub-line">' + esc(desc.length > 95 ? desc.slice(0, 95) + '…' : desc) + '</div>' : '') + '</td>' +
        '<td data-label="Valor total" class="num right"><strong>' + D.fmtBRL(tot) + '</strong>' + (D.qtd(o) !== 1 ? '<div class="sub-line">' + String(D.qtd(o)).replace('.', ',') + ' × ' + D.fmtBRL(D.num(o.valorUnit)) + '</div>' : '') + (av != null && av > 0 ? '<div class="sub-line">à vista ' + D.fmtBRL(av) + '</div>' : '') + '</td>' +
        '<td data-label="Pagamento" class="num">' + (n > 1 ? n + '× ' + D.fmtBRL(D.valorParcela(o)) : 'À vista / única') + (pg > 0 ? '<div class="sub-line">pago ' + D.fmtBRL(pg) + '</div>' : '') + '</td>' +
        '<td data-label="Status"><select class="st st-' + slugStatus(o.status) + '" data-status-id="' + o.id + '" aria-label="Status">' + st + '</select></td>' +
        '<td data-label="Validade">' + (o.validade ? D.fmtDate(o.validade) + ' ' : '') + U.validBadge(o, hoje) + (!o.validade && o.status !== 'Contratado' && o.status !== 'Descartado' ? '' : '') + '</td>' +
        '<td class="actions" data-label="">' +
          '<button class="btn sm ghost" data-act="ver" data-id="' + o.id + '" title="Ver detalhes" aria-label="Ver detalhes">👁</button>' +
          '<button class="btn sm ghost" data-act="editar" data-id="' + o.id + '" title="Editar" aria-label="Editar">✏️</button>' +
          '<button class="btn sm ghost" data-act="dup" data-id="' + o.id + '" title="Duplicar" aria-label="Duplicar">⧉</button>' +
          '<button class="btn sm ghost danger" data-act="del" data-id="' + o.id + '" title="Excluir" aria-label="Excluir">🗑</button>' +
        '</td></tr>';
    }).join('');

    $('#orc-lista').innerHTML = '<div class="card" style="padding:6px"><div class="table-wrap"><table class="resp"><thead><tr>' +
      '<th>Cód.</th><th>Categoria</th><th>Fornecedor / item</th><th class="right">Valor total</th><th>Pagamento</th><th>Status</th><th>Validade</th><th></th></tr></thead><tbody>' + rows + '</tbody>' +
      '<tfoot><tr><td></td><td></td><td>Total exibido</td><td class="num right">' + D.fmtBRL(somaExibida) + '</td><td></td><td></td><td></td><td></td></tr></tfoot></table></div></div>';
  };

  /* ---------- mudança de status (com regra de conflito) ---------- */
  function setStatus(id, novo) {
    const s = S.get();
    const o = s.orcamentos.find((x) => x.id === id);
    if (!o || o.status === novo) return;
    const outros = (novo === 'Escolhido' || novo === 'Contratado')
      ? s.orcamentos.filter((x) => x.id !== id && x.categoria === o.categoria && x.status === 'Escolhido') : [];
    let rebaixar = false;
    if (outros.length) {
      rebaixar = confirm('Já existe ' + outros.length + ' orçamento "Escolhido" em "' + o.categoria + '".\n\nOK = voltar o(s) outro(s) para "Em cotação" (troca de escolha)\nCancelar = manter os dois como estão');
    }
    S.batch((b) => {
      b.upsert('orcamentos', Object.assign({}, o, { status: novo }));
      if (rebaixar) outros.forEach((x) => b.upsert('orcamentos', Object.assign({}, x, { status: 'Em cotação' })));
    });
    U.toast('Status alterado para "' + novo + '"');
  }
  U.setStatus = setStatus;

  /* =====================  FORMULÁRIO  ===================== */
  function F(label, name, val, o) {
    o = o || {};
    const v = val == null ? '' : val;
    const input = o.html || '<input id="f_' + name + '" name="' + name + '" type="' + (o.type || 'text') + '" value="' + esc(v) + '" ' + (o.attrs || '') + (o.req ? ' required' : '') + (o.list ? ' list="' + o.list + '"' : '') + '>';
    return '<div class="field' + (o.full ? ' full' : '') + '"><label for="f_' + name + '">' + label + (o.req ? ' *' : '') + '</label>' + input + (o.hint ? '<div class="hint">' + o.hint + '</div>' : '') + '</div>';
  }
  const TA = (name, val, rows) => '<textarea id="f_' + name + '" name="' + name + '" rows="' + (rows || 3) + '">' + esc(val) + '</textarea>';

  function openForm(id, preset) {
    const s = S.get();
    const editing = id ? s.orcamentos.find((o) => o.id === id) : null;
    const o = editing || Object.assign({
      id: D.uid(), codigo: U.nextCodigo(), categoria: '', fornecedor: '', descricao: '', opcao: '', qtd: 1, valorUnit: '', aVista: '',
      parcelas: 1, entrada: '', entradaData: '', formaPagamento: '', dataOrcamento: D.todayISO(), validade: '', status: 'Em cotação',
      primeiraParcela: '', prazo: '', garantia: '', incluso: '', naoIncluso: '', contato: '', links: '', obs: '', avaliacao: 0,
      cotadoPor: S.cfg().user || '', pagamentos: [], criadoEm: Date.now(),
    }, preset || {});
    const novo = !editing;
    const cats = s.categorias.map((c) => c.nome);
    if (o.categoria && !cats.includes(o.categoria)) cats.push(o.categoria);
    const forns = Array.from(new Set(s.orcamentos.map((x) => x.fornecedor).filter((x) => x && !/^\(/.test(x))));

    const selCat = '<select id="f_categoria" name="categoria" required><option value="">Selecione…</option>' +
      cats.map((c) => '<option' + (c === o.categoria ? ' selected' : '') + '>' + esc(c) + '</option>').join('') + '<option value="__nova__">＋ Nova categoria…</option></select>';
    const selSt = '<select id="f_status" name="status">' + D.STATUS.map((x) => '<option' + (x === o.status ? ' selected' : '') + '>' + x + '</option>').join('') + '</select>';
    const selAv = '<select id="f_avaliacao" name="avaliacao"><option value="0">Sem avaliação</option>' + [1, 2, 3, 4, 5].map((n) => '<option value="' + n + '"' + (+o.avaliacao === n ? ' selected' : '') + '>' + '★'.repeat(n) + ' (' + n + ')</option>').join('') + '</select>';

    $('#form-orc').innerHTML =
      '<div class="dlg-head"><h2>' + (editing ? '✏️ Editar orçamento ' + esc(o.codigo) : preset ? '⧉ Novo orçamento (cópia)' : '＋ Novo orçamento') + '</h2><button type="button" class="btn sm ghost" data-act="close" aria-label="Fechar">✕</button></div>' +
      '<div class="dlg-main">' +
        '<input type="hidden" name="id" value="' + esc(o.id) + '"><input type="hidden" name="codigo" value="' + esc(o.codigo) + '"><input type="hidden" name="criadoEm" value="' + esc(o.criadoEm || Date.now()) + '">' +
        '<fieldset><legend>Identificação</legend><div class="fgrid">' +
          F('Categoria', 'categoria', '', { html: selCat, req: true }) +
          F('Fornecedor / loja / profissional', 'fornecedor', o.fornecedor, { req: true, list: 'dl-forn' }) +
          F('Opção / variante', 'opcao', o.opcao, { hint: 'Ex.: "Com roldanas", "Quartzo Branco", modelo…' }) +
          F('Status', 'status', '', { html: selSt }) +
          F('Descrição / especificação', 'descricao', '', { html: TA('descricao', o.descricao, 4), full: true }) +
        '</div><datalist id="dl-forn">' + forns.map((x) => '<option value="' + esc(x) + '">').join('') + '</datalist></fieldset>' +

        '<fieldset><legend>Valores e pagamento</legend><div class="fgrid">' +
          F('Quantidade', 'qtd', o.qtd, { type: 'number', attrs: 'step="any" min="0" inputmode="decimal"', hint: 'Ex.: nº de janelas, m², unidades' }) +
          F('Valor unitário (R$)', 'valorUnit', o.valorUnit, { type: 'number', attrs: 'step="0.01" min="0" inputmode="decimal"', req: true, hint: 'Valor parcelado SEM juros (igual ao à vista)' }) +
          F('Valor total (R$)', 'total', '', { html: '<div class="calc" id="c_total">—</div>' }) +
          F('Valor à vista (R$)', 'aVista', o.aVista, { type: 'number', attrs: 'step="0.01" min="0" inputmode="decimal"', hint: 'Se houver desconto para pagar à vista' }) +
          F('Economia à vista', 'econ', '', { html: '<div class="calc" id="c_econ">—</div>' }) +
          F('Nº de parcelas (sem juros)', 'parcelas', o.parcelas, { type: 'number', attrs: 'step="1" min="1" inputmode="numeric"' }) +
          F('Entrada (R$)', 'entrada', o.entrada, { type: 'number', attrs: 'step="0.01" min="0" inputmode="decimal"', hint: 'Opcional – abatida do valor a parcelar' }) +
          F('Data da entrada', 'entradaData', o.entradaData, { type: 'date' }) +
          F('Valor de cada parcela', 'parc', '', { html: '<div class="calc" id="c_parc">—</div>' }) +
          F('1ª parcela em', 'primeiraParcela', o.primeiraParcela, { type: 'date', hint: 'Usado no fluxo de caixa mensal' }) +
          F('Forma de pagamento / condições', 'formaPagamento', '', { html: TA('formaPagamento', o.formaPagamento, 2), full: true }) +
        '</div></fieldset>' +

        '<fieldset><legend>Datas e prazos</legend><div class="fgrid">' +
          F('Data do orçamento', 'dataOrcamento', o.dataOrcamento, { type: 'date' }) +
          F('Válido até', 'validade', o.validade, { type: 'date', hint: 'Avisamos quando estiver perto de vencer' }) +
          F('Prazo de entrega / execução', 'prazo', o.prazo) +
          F('Garantia', 'garantia', o.garantia) +
        '</div></fieldset>' +

        '<fieldset><legend>Detalhes</legend><div class="fgrid">' +
          F('Incluso / observações do fornecedor', 'incluso', '', { html: TA('incluso', o.incluso, 3), full: true }) +
          F('NÃO incluso', 'naoIncluso', '', { html: TA('naoIncluso', o.naoIncluso, 2), full: true }) +
          F('Contato (telefone, endereço, PIX…)', 'contato', '', { html: TA('contato', o.contato, 2), full: true }) +
          F('Links e arquivos (um por linha)', 'links', '', { html: TA('links', o.links, 2), full: true, hint: 'Cole links do Drive, WhatsApp, site, PDF da proposta…' }) +
          F('Observações internas (nossas)', 'obs', '', { html: TA('obs', o.obs, 2), full: true }) +
          F('Avaliação', 'avaliacao', '', { html: selAv }) +
          F('Cotado por', 'cotadoPor', o.cotadoPor) +
        '</div></fieldset>' +
      '</div>' +
      '<div class="dlg-foot"><button type="button" class="btn" data-act="close">Cancelar</button><button type="submit" class="btn primary">💾 Salvar</button></div>';

    const dlg = $('#dlg-form');
    dlg.dataset.isNew = novo ? '1' : '';
    dlg._base = o;
    calcForm();
    if (!dlg.open) dlg.showModal();
    setTimeout(() => { const el = $('#f_fornecedor'); el && el.focus(); }, 30);
  }

  function formNum(name) { const el = $('#f_' + name); return el ? D.num(el.value) : 0; }
  function calcForm() {
    const form = $('#form-orc');
    if (!form.elements.valorUnit) return;
    const qv = form.elements.qtd.value;
    const q = qv === '' ? 1 : D.num(qv);
    const tot = D.round2(q * formNum('valorUnit'));
    const ent = formNum('entrada');
    const n = Math.max(1, Math.floor(formNum('parcelas')) || 1);
    const av = form.elements.aVista.value === '' ? null : formNum('aVista');
    $('#c_total').textContent = D.fmtBRL(tot);
    $('#c_parc').textContent = n + '× ' + D.fmtBRL(D.round2((tot - ent) / n));
    $('#c_econ').textContent = av && av > 0 && tot > 0 ? D.fmtBRL(D.round2(tot - av)) + ' (' + D.fmtPct(((tot - av) / tot) * 100) + ')' : '—';
  }

  function saveForm(ev) {
    ev.preventDefault();
    const form = $('#form-orc'), dlg = $('#dlg-form');
    if (!form.reportValidity()) return;
    const fd = new FormData(form), base = dlg._base || {};
    const t = (k) => String(fd.get(k) == null ? '' : fd.get(k)).trim();
    const nOrEmpty = (k) => (t(k) === '' ? '' : D.num(t(k)));
    const prev = S.get().orcamentos.find((x) => x.id === t('id'));
    const o = Object.assign({}, base, {
      id: t('id'), codigo: t('codigo') || U.nextCodigo(), categoria: t('categoria'), fornecedor: t('fornecedor'), descricao: t('descricao'), opcao: t('opcao'),
      status: t('status'), qtd: t('qtd') === '' ? 1 : D.num(t('qtd')), valorUnit: D.num(t('valorUnit')), aVista: nOrEmpty('aVista'),
      parcelas: Math.max(1, Math.floor(D.num(t('parcelas'))) || 1), entrada: nOrEmpty('entrada'), entradaData: t('entradaData'),
      primeiraParcela: t('primeiraParcela'), formaPagamento: t('formaPagamento'), dataOrcamento: t('dataOrcamento'), validade: t('validade'),
      prazo: t('prazo'), garantia: t('garantia'), incluso: t('incluso'), naoIncluso: t('naoIncluso'), contato: t('contato'), links: t('links'),
      obs: t('obs'), avaliacao: Math.floor(D.num(t('avaliacao'))), cotadoPor: t('cotadoPor'), criadoEm: D.num(t('criadoEm')) || Date.now(),
      pagamentos: prev ? prev.pagamentos || [] : [],
    });
    const novoStatus = o.status, statusAnterior = prev ? prev.status : null;
    // regra de conflito: tratada depois de salvar com o status anterior (para pedir confirmação)
    const salvarComoEstava = statusAnterior !== novoStatus && (novoStatus === 'Escolhido' || novoStatus === 'Contratado');
    if (salvarComoEstava) o.status = statusAnterior || 'Em cotação';
    S.upsert('orcamentos', o);
    dlg.close();
    if (salvarComoEstava) setStatus(o.id, novoStatus);
    U.toast('Orçamento ' + o.codigo + ' salvo');
  }

  /* =====================  DETALHE  ===================== */
  function row(label, html, full) { return '<div class="' + (full ? 'full' : '') + '"><dt>' + label + '</dt><dd>' + (html === '' || html == null ? '<span class="muted">—</span>' : html) + '</dd></div>'; }

  function fillDetail(id) {
    const s = S.get(), o = s.orcamentos.find((x) => x.id === id), dlg = $('#dlg-detail');
    if (!o) { dlg.close(); return; }
    const hoje = D.todayISO(), tot = D.total(o), pg = D.pago(o), pend = Math.max(0, D.round2(tot - pg));
    const econ = D.economia(o), n = D.nParc(o);
    const perc = tot > 0 ? Math.min(100, (pg / tot) * 100) : 0;
    const pags = (o.pagamentos || []).slice().sort((a, b) => (a.data || '') < (b.data || '') ? -1 : 1);
    const links = (o.links || '').split(/\n+/).map((x) => x.trim()).filter(Boolean).map((x) => '<div>' + U.linkify(x) + '</div>').join('');
    const nota = s.notas.filter((x) => x.orcamentoId === o.id);

    dlg.innerHTML = '<div class="dlg-body">' +
      '<div class="dlg-head"><div><h2>' + esc(o.codigo) + ' · ' + esc(o.fornecedor) + '</h2><div class="row" style="margin-top:6px">' + U.statusBadge(o.status) + ' <span class="badge b-gray">' + esc(o.categoria) + '</span> ' + U.validBadge(o, hoje) + '</div></div><button class="btn sm ghost" data-act="close" aria-label="Fechar">✕</button></div>' +
      '<div class="dlg-main">' +
        '<dl class="det">' +
          row('Opção / variante', esc(o.opcao)) +
          row('Valor total', '<strong style="font-size:1.2rem">' + D.fmtBRL(tot) + '</strong>' + (D.qtd(o) !== 1 ? '<br><span class="muted">' + String(D.qtd(o)).replace('.', ',') + ' × ' + D.fmtBRL(D.num(o.valorUnit)) + '</span>' : '')) +
          row('Parcelamento', (n > 1 ? n + '× de ' + D.fmtBRL(D.valorParcela(o)) + ' sem juros' : 'Parcela única') + (D.entrada(o) > 0 ? '<br>Entrada: ' + D.fmtBRL(D.entrada(o)) + (o.entradaData ? ' em ' + D.fmtDate(o.entradaData) : '') : '') + (o.primeiraParcela ? '<br><span class="muted">1ª parcela em ' + D.fmtDate(o.primeiraParcela) + '</span>' : '')) +
          row('Valor à vista', D.aVista(o) != null && D.aVista(o) > 0 ? D.fmtBRL(D.aVista(o)) + (econ != null ? '<br><span class="muted">economia de ' + D.fmtBRL(econ) + ' (' + D.fmtPct((econ / tot) * 100) + ')</span>' : '') : '') +
          row('Forma de pagamento / condições', esc(o.formaPagamento), true) +
          row('Descrição / especificação', esc(o.descricao), true) +
          row('Data do orçamento', o.dataOrcamento ? D.fmtDate(o.dataOrcamento) : '') +
          row('Válido até', o.validade ? D.fmtDate(o.validade) : '') +
          row('Prazo de entrega / execução', esc(o.prazo)) +
          row('Garantia', esc(o.garantia)) +
          row('Incluso / observações do fornecedor', esc(o.incluso), true) +
          row('NÃO incluso', esc(o.naoIncluso), true) +
          row('Contato', U.linkify(o.contato), true) +
          row('Links e arquivos', links, true) +
          row('Observações internas', esc(o.obs), true) +
          row('Avaliação', o.avaliacao ? U.stars(o.avaliacao) : '') +
          row('Cotado por', esc(o.cotadoPor)) +
          row('Última alteração', U.fmtDateTime(o.updatedAt) + (o.updatedBy ? ' · ' + esc(o.updatedBy) : '')) +
        '</dl>' +
        (nota.length ? '<h3 style="margin:16px 0 6px">📌 Pontos de atenção vinculados</h3><ul style="margin:0;padding-left:18px">' + nota.map((x) => '<li' + (x.done ? ' style="text-decoration:line-through;color:var(--muted)"' : '') + '>' + esc(x.texto) + '</li>').join('') + '</ul>' : '') +

        '<h3 style="margin:18px 0 8px">💳 Pagamentos</h3>' +
        '<div class="bar-row"><div class="bar"><i style="width:' + perc + '%"></i></div><span class="num">' + D.fmtBRL(pg) + ' de ' + D.fmtBRL(tot) + '</span></div>' +
        '<div class="muted" style="margin:4px 0 8px">Falta pagar: <strong>' + D.fmtBRL(pend) + '</strong></div>' +
        (pags.length ? '<div class="table-wrap"><table><thead><tr><th>Data</th><th class="right">Valor</th><th>Observação</th><th></th></tr></thead><tbody>' +
          pags.map((p) => '<tr><td>' + D.fmtDate(p.data) + '</td><td class="num right">' + D.fmtBRL(D.num(p.valor)) + '</td><td>' + esc(p.obs || '') + (p.por ? ' <span class="muted">· ' + esc(p.por) + '</span>' : '') + '</td><td class="right"><button class="btn sm ghost danger" data-act="pg-del" data-id="' + o.id + '" data-pid="' + esc(p.id) + '" aria-label="Remover pagamento">🗑</button></td></tr>').join('') + '</tbody></table></div>' : '<p class="muted">Nenhum pagamento registrado.</p>') +
        '<div class="fgrid" style="margin-top:10px;align-items:end">' +
          '<div class="field"><label>Data</label><input type="date" id="pg-data" value="' + hoje + '"></div>' +
          '<div class="field"><label>Valor (R$)</label><input type="number" id="pg-valor" step="0.01" min="0" inputmode="decimal" value="' + (pend > 0 ? Math.min(pend, D.valorParcela(o) || pend) : '') + '"></div>' +
          '<div class="field"><label>Observação</label><input id="pg-obs" placeholder="Ex.: entrada, parcela 1/10"></div>' +
          '<div><button class="btn primary" data-act="pg-add" data-id="' + o.id + '">＋ Registrar</button></div>' +
        '</div>' +
      '</div>' +
      '<div class="dlg-foot">' +
        '<button class="btn danger" data-act="del" data-id="' + o.id + '">🗑 Excluir</button>' +
        '<button class="btn" data-act="dup" data-id="' + o.id + '">⧉ Duplicar</button>' +
        '<button class="btn primary" data-act="editar" data-id="' + o.id + '">✏️ Editar</button>' +
      '</div></div>';
  }
  function openDetail(id) {
    U.detailId = id;
    fillDetail(id);
    const dlg = $('#dlg-detail');
    if (!dlg.open) dlg.showModal();
  }

  /* =====================  AÇÕES  ===================== */
  const H = U.handlers;
  H.novo = () => { $('#dlg-detail').open && $('#dlg-detail').close(); openForm(null); };
  H.ver = (el) => openDetail(el.dataset.id);
  H.editar = (el) => { $('#dlg-detail').open && $('#dlg-detail').close(); openForm(el.dataset.id); };
  H.dup = (el) => {
    const o = S.get().orcamentos.find((x) => x.id === el.dataset.id);
    if (!o) return;
    $('#dlg-detail').open && $('#dlg-detail').close();
    const copia = JSON.parse(JSON.stringify(o));
    Object.assign(copia, { id: D.uid(), codigo: U.nextCodigo(), status: 'Em cotação', pagamentos: [], criadoEm: Date.now(), dataOrcamento: D.todayISO() });
    openForm(null, copia);
  };
  H.del = (el) => {
    const o = S.get().orcamentos.find((x) => x.id === el.dataset.id);
    if (!o) return;
    if (!confirm('Excluir o orçamento ' + o.codigo + ' – ' + o.fornecedor + (o.opcao ? ' (' + o.opcao + ')' : '') + '?')) return;
    const copia = JSON.parse(JSON.stringify(o));
    S.remove('orcamentos', o.id);
    const dd = $('#dlg-detail'); if (dd.open) dd.close();
    U.toast('Orçamento ' + o.codigo + ' excluído', 'Desfazer', () => { S.upsert('orcamentos', copia); U.toast('Orçamento restaurado'); });
  };
  H.close = (el) => { const d = el.closest('dialog'); d && d.close(); };
  H.filtro = (el, ev) => {
    ev.preventDefault();
    const f = U.filters;
    f.q = ''; f.cat = el.dataset.cat || ''; f.status = ''; f.valid = el.dataset.valid || ''; f.desc = true;
    U.goto('orcamentos');
  };
  H['pg-add'] = (el) => {
    const o = S.get().orcamentos.find((x) => x.id === el.dataset.id);
    const valor = D.num($('#pg-valor').value), data = $('#pg-data').value;
    if (!o) return;
    if (!(valor > 0)) { U.toast('Informe o valor do pagamento'); $('#pg-valor').focus(); return; }
    const pags = (o.pagamentos || []).concat([{ id: D.uid(), data: data || D.todayISO(), valor, obs: $('#pg-obs').value.trim(), por: S.cfg().user || '' }]);
    S.upsert('orcamentos', Object.assign({}, o, { pagamentos: pags }));
    U.toast('Pagamento de ' + D.fmtBRL(valor) + ' registrado');
  };
  H['pg-del'] = (el) => {
    const o = S.get().orcamentos.find((x) => x.id === el.dataset.id);
    if (!o || !confirm('Remover este pagamento?')) return;
    S.upsert('orcamentos', Object.assign({}, o, { pagamentos: (o.pagamentos || []).filter((p) => p.id !== el.dataset.pid) }));
  };

  /* expõe para app.js */
  U.views.fillDetail = fillDetail;
  U.openDetail = openDetail;
  U.openForm = openForm;
  U.saveForm = saveForm;
  U.calcForm = calcForm;
  U.newCategoryFromForm = function (sel) {
    const nome = (prompt('Nome da nova categoria:') || '').trim();
    if (!nome) { sel.value = ''; return; }
    const s = S.get();
    if (!s.categorias.some((c) => U.norm(c.nome) === U.norm(nome))) S.upsert('categorias', { id: D.uid(), nome, previsto: '', criadoEm: Date.now() });
    const real = (S.get().categorias.find((c) => U.norm(c.nome) === U.norm(nome)) || {}).nome || nome;
    const opt = document.createElement('option');
    opt.textContent = real;
    sel.insertBefore(opt, sel.querySelector('option[value="__nova__"]'));
    sel.value = real;
  };

  /* mudança inline de campos do painel/lista */
  U.changeHandlers.push((el) => {
    if (el.dataset.meta) {
      let v = el.value;
      if (el.type === 'number') v = v === '' ? '' : D.num(v);
      S.setMeta({ [el.dataset.meta]: v });
      return true;
    }
    if (el.dataset.statusId) { setStatus(el.dataset.statusId, el.value); return true; }
    return false;
  });
})();
