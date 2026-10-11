/* =========================================================
   Financeiro, Categorias, Pontos de atenção e Configurações
   ========================================================= */
(function () {
  'use strict';
  const D = Data, S = Store, U = UI, esc = D.esc, $ = U.$, H = U.handlers;

  /* =====================  FINANCEIRO  ===================== */
  U.views.financeiro = function () {
    const s = S.get(), hoje = D.todayISO(), r = D.summarize(s, hoje);
    const meses = D.cashflow(s, hoje);
    const mesAtual = hoje.slice(0, 7);
    const previstoTotal = D.sum(meses.map((m) => m.previsto));
    let acum = 0;

    const opcoes = s.orcamentos.filter((o) => o.status !== 'Descartado')
      .sort((a, b) => (D.CONSIDERA(b.status) ? 1 : 0) - (D.CONSIDERA(a.status) ? 1 : 0))
      .map((o) => '<option value="' + o.id + '">' + esc(o.codigo + ' · ' + o.categoria + ' · ' + o.fornecedor + (o.opcao ? ' (' + o.opcao + ')' : '') + ' – ' + o.status) + '</option>').join('');

    const kpi = (cls, l, v, sub) => '<div class="kpi ' + cls + '"><div class="lbl">' + l + '</div><div class="val">' + v + '</div>' + (sub ? '<div class="sub">' + sub + '</div>' : '') + '</div>';

    const blocos = meses.map((m) => {
      acum = D.round2(acum + m.previsto);
      const itens = m.itens.map((i) => '<tr><td>' + esc(i.o.codigo) + ' · ' + esc(i.o.categoria) + '</td><td>' + esc(i.o.fornecedor) + '</td><td>' + esc(i.tipo) + '</td><td class="num right">' + D.fmtBRL(i.valor) + '</td></tr>').join('');
      const pags = m.pagamentos.map((x) => '<tr><td>' + esc(x.o.codigo) + ' · ' + esc(x.o.categoria) + '</td><td>' + esc(x.o.fornecedor) + '</td><td>Pago em ' + D.fmtDate(x.p.data) + (x.p.obs ? ' – ' + esc(x.p.obs) : '') + '</td><td class="num right">' + D.fmtBRL(D.num(x.p.valor)) + '</td></tr>').join('');
      return '<details class="mes"' + (m.mes === mesAtual ? ' open' : '') + '><summary>' +
        '<div><strong>' + D.fmtMonth(m.mes) + '</strong>' + (m.mes === mesAtual ? ' <span class="badge b-info">mês atual</span>' : '') + '</div>' +
        '<div><div class="mes-head">Previsto no mês</div><b class="num">' + D.fmtBRL(m.previsto) + '</b></div>' +
        '<div><div class="mes-head">Pago no mês</div><b class="num">' + D.fmtBRL(m.pago) + '</b></div>' +
        '<div><div class="mes-head">Previsto acumulado</div><b class="num">' + D.fmtBRL(acum) + '</b></div></summary>' +
        '<div class="inner">' + (itens || pags ? '<div class="table-wrap"><table><tbody>' + itens + (pags ? '<tr><td colspan="4" class="muted" style="padding-top:12px"><strong>Pagamentos realizados</strong></td></tr>' + pags : '') + '</tbody></table></div>' : '<p class="muted">Nada neste mês.</p>') + '</div></details>';
    }).join('');

    const todosPg = [];
    s.orcamentos.forEach((o) => (o.pagamentos || []).forEach((p) => todosPg.push({ o, p })));
    todosPg.sort((a, b) => ((b.p.data || '') < (a.p.data || '') ? -1 : 1));

    $('#tab-financeiro').innerHTML =
      '<div class="section grid kpis">' +
        kpi('accent', 'Total considerado', D.fmtBRL(r.totalConsiderado), 'Contratado + Escolhido') +
        kpi('ok', 'Já pago', D.fmtBRL(r.pagoTotal), todosPg.length + ' pagamento(s) registrado(s)') +
        kpi('warn', 'Ainda a pagar', D.fmtBRL(r.aPagar), 'Considerado − pago') +
        kpi('', 'Disponível', r.disp == null ? '—' : D.fmtBRL(r.disp), r.saldo == null ? 'Defina no Painel' : 'Saldo: ' + D.fmtBRL(r.saldo)) +
      '</div>' +
      '<div class="section card"><h2>＋ Registrar pagamento</h2>' +
        (opcoes ? '<div class="fgrid" style="align-items:end">' +
          '<div class="field full"><label>Orçamento</label><select id="fin-orc">' + opcoes + '</select></div>' +
          '<div class="field"><label>Data</label><input type="date" id="fin-data" value="' + hoje + '"></div>' +
          '<div class="field"><label>Valor (R$)</label><input type="number" id="fin-valor" step="0.01" min="0" inputmode="decimal"></div>' +
          '<div class="field"><label>Observação</label><input id="fin-obs" placeholder="Ex.: entrada, parcela 2/10, PIX"></div>' +
          '<div><button class="btn primary" data-act="fin-add">Registrar pagamento</button></div></div>' : '<p class="muted">Cadastre um orçamento primeiro.</p>') +
      '</div>' +
      '<div class="section card"><h2>📅 Fluxo de caixa mensal <small class="muted">– previsão das parcelas dos itens escolhidos/contratados</small></h2>' +
        (meses.length ? blocos + '<p class="muted" style="margin:10px 0 0">Total previsto: <strong>' + D.fmtBRL(previstoTotal) + '</strong>. As parcelas começam na data de “1ª parcela” de cada orçamento (se vazia, no mês seguinte).</p>' : '<p class="muted">Sem itens escolhidos ou contratados ainda.</p>') +
      '</div>' +
      '<div class="section card"><h2>🧾 Pagamentos realizados</h2>' +
        (todosPg.length ? '<div class="table-wrap"><table class="resp"><thead><tr><th>Data</th><th>Orçamento</th><th class="right">Valor</th><th>Observação</th><th></th></tr></thead><tbody>' +
          todosPg.map((x) => '<tr><td data-label="Data">' + D.fmtDate(x.p.data) + '</td><td data-label="Orçamento"><a href="#" data-act="ver" data-id="' + x.o.id + '">' + esc(x.o.codigo) + '</a> · ' + esc(x.o.categoria) + ' · ' + esc(x.o.fornecedor) + '</td><td data-label="Valor" class="num right">' + D.fmtBRL(D.num(x.p.valor)) + '</td><td data-label="Obs.">' + esc(x.p.obs || '') + (x.p.por ? ' <span class="muted">· ' + esc(x.p.por) + '</span>' : '') + '</td><td class="actions" data-label=""><button class="btn sm ghost danger" data-act="pg-del" data-id="' + x.o.id + '" data-pid="' + esc(x.p.id) + '" aria-label="Remover">🗑</button></td></tr>').join('') +
          '</tbody></table></div>' : '<p class="muted">Nenhum pagamento registrado ainda.</p>') +
      '</div>';
  };
  H['fin-add'] = () => {
    const id = $('#fin-orc').value, valor = D.num($('#fin-valor').value);
    const o = S.get().orcamentos.find((x) => x.id === id);
    if (!o) return;
    if (!(valor > 0)) { U.toast('Informe o valor do pagamento'); $('#fin-valor').focus(); return; }
    const pags = (o.pagamentos || []).concat([{ id: D.uid(), data: $('#fin-data').value || D.todayISO(), valor, obs: $('#fin-obs').value.trim(), por: S.cfg().user || '' }]);
    S.upsert('orcamentos', Object.assign({}, o, { pagamentos: pags }));
    U.toast('Pagamento de ' + D.fmtBRL(valor) + ' registrado');
  };

  /* =====================  CATEGORIAS  ===================== */
  U.views.categorias = function () {
    const s = S.get(), r = D.summarize(s);
    const rows = r.porCategoria.map((c) => {
      const cat = s.categorias.find((x) => x.nome === c.nome);
      return '<tr><td data-label="Categoria"><strong>' + esc(c.nome) + '</strong>' + (!cat ? ' <span class="badge b-warn">sem cadastro</span>' : '') + '</td>' +
        '<td data-label="Orçamentos" class="num right">' + c.qtdTotal + '</td>' +
        '<td data-label="Considerado" class="num right">' + (c.valor ? D.fmtBRL(c.valor) : '—') + '</td>' +
        '<td data-label="Previsto (R$)">' + (cat ? '<input type="number" step="0.01" min="0" inputmode="decimal" style="min-width:120px" data-cat-prev="' + cat.id + '" value="' + esc(cat.previsto) + '" placeholder="Opcional">' : '') + '</td>' +
        '<td data-label="Situação"><span class="badge ' + ({ ok: 'b-ok', warn: 'b-warn', bad: 'b-bad', sem: 'b-gray' }[c.sk]) + '">' + esc(c.situacao) + '</span></td>' +
        '<td class="actions" data-label="">' + (cat ? '<button class="btn sm" data-act="cat-ren" data-id="' + cat.id + '">Renomear</button> <button class="btn sm danger" data-act="cat-del" data-id="' + cat.id + '">Excluir</button>' : '') + '</td></tr>';
    }).join('');
    $('#tab-categorias').innerHTML =
      '<div class="card"><h2>🗂️ Categorias</h2>' +
        '<p class="muted" style="margin-top:0">Defina um valor <strong>previsto</strong> por categoria para ser avisado quando o escolhido passar dele.</p>' +
        '<div class="add-row"><input id="cat-nome" placeholder="Nova categoria (ex.: Banheiro, Ar-condicionado…)"><button class="btn primary" data-act="cat-add">＋ Adicionar</button><span></span></div>' +
        '<div class="table-wrap"><table class="resp"><thead><tr><th>Categoria</th><th class="right">Orçamentos</th><th class="right">Considerado</th><th>Previsto (R$)</th><th>Situação</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div></div>';
  };
  H['cat-add'] = () => {
    const nome = $('#cat-nome').value.trim();
    if (!nome) return;
    const s = S.get();
    if (s.categorias.some((c) => U.norm(c.nome) === U.norm(nome))) { U.toast('Essa categoria já existe'); return; }
    S.upsert('categorias', { id: D.uid(), nome, previsto: '', criadoEm: Date.now() });
    U.toast('Categoria adicionada');
  };
  H['cat-ren'] = (el) => {
    const s = S.get(), cat = s.categorias.find((c) => c.id === el.dataset.id);
    if (!cat) return;
    const nome = (prompt('Novo nome da categoria:', cat.nome) || '').trim();
    if (!nome || nome === cat.nome) return;
    if (s.categorias.some((c) => c.id !== cat.id && U.norm(c.nome) === U.norm(nome))) { U.toast('Já existe uma categoria com esse nome'); return; }
    S.batch((b) => {
      b.upsert('categorias', Object.assign({}, cat, { nome }));
      s.orcamentos.filter((o) => o.categoria === cat.nome).forEach((o) => b.upsert('orcamentos', Object.assign({}, o, { categoria: nome })));
    });
    U.toast('Categoria renomeada');
  };
  H['cat-del'] = (el) => {
    const s = S.get(), cat = s.categorias.find((c) => c.id === el.dataset.id);
    if (!cat) return;
    const n = s.orcamentos.filter((o) => o.categoria === cat.nome).length;
    if (n) { alert('Há ' + n + ' orçamento(s) nesta categoria. Mova ou exclua-os antes de remover a categoria.'); return; }
    if (!confirm('Excluir a categoria "' + cat.nome + '"?')) return;
    S.remove('categorias', cat.id);
  };
  U.changeHandlers.push((el) => {
    if (el.dataset.catPrev) {
      const cat = S.get().categorias.find((c) => c.id === el.dataset.catPrev);
      if (cat) S.upsert('categorias', Object.assign({}, cat, { previsto: el.value === '' ? '' : D.num(el.value) }));
      return true;
    }
    return false;
  });

  /* =====================  PONTOS DE ATENÇÃO  ===================== */
  U.views.notas = function () {
    const s = S.get();
    const lista = s.notas.slice().sort((a, b) => (a.done - b.done) || ((b.criadoEm || 0) - (a.criadoEm || 0)));
    const orcOpts = '<option value="">Sem vínculo</option>' + s.orcamentos.map((o) => '<option value="' + o.id + '">' + esc(o.codigo + ' · ' + o.categoria + ' · ' + o.fornecedor) + '</option>').join('');
    const itens = lista.map((n) => {
      const o = n.orcamentoId ? s.orcamentos.find((x) => x.id === n.orcamentoId) : null;
      return '<div class="item ' + (n.done ? 'done' : '') + '"><input type="checkbox" data-nota-done="' + n.id + '"' + (n.done ? ' checked' : '') + ' aria-label="Concluído" style="margin-top:4px">' +
        '<div class="txt">' + U.linkify(n.texto) + (o ? '<div class="sub-line">↪ <a href="#" data-act="ver" data-id="' + o.id + '">' + esc(o.codigo + ' · ' + o.categoria + ' · ' + o.fornecedor) + '</a></div>' : '') +
        (n.updatedBy ? '<div class="sub-line">' + esc(n.updatedBy) + ' · ' + U.fmtDateTime(n.updatedAt) + '</div>' : '') + '</div>' +
        '<div class="row"><button class="btn sm ghost" data-act="nota-edit" data-id="' + n.id + '" aria-label="Editar">✏️</button><button class="btn sm ghost danger" data-act="nota-del" data-id="' + n.id + '" aria-label="Excluir">🗑</button></div></div>';
    }).join('');
    const pend = s.notas.filter((n) => !n.done).length;
    $('#tab-notas').innerHTML =
      '<div class="card"><h2>📌 Pontos de atenção <span class="badge b-warn">' + pend + ' pendente' + (pend === 1 ? '' : 's') + '</span></h2>' +
        '<div class="fgrid" style="align-items:end;margin-bottom:14px">' +
          '<div class="field full"><label>Novo ponto de atenção</label><textarea id="nota-texto" rows="2" placeholder="Ex.: confirmar se o aquecedor inclui instalação de gás"></textarea></div>' +
          '<div class="field"><label>Vincular a um orçamento (opcional)</label><select id="nota-orc">' + orcOpts + '</select></div>' +
          '<div><button class="btn primary" data-act="nota-add">＋ Adicionar</button></div></div>' +
        (itens ? '<div class="list">' + itens + '</div>' : '<p class="muted">Nenhum ponto de atenção.</p>') + '</div>';
  };
  H['nota-add'] = () => {
    const texto = $('#nota-texto').value.trim();
    if (!texto) { $('#nota-texto').focus(); return; }
    S.upsert('notas', { id: D.uid(), texto, orcamentoId: $('#nota-orc').value, done: false, criadoEm: Date.now() });
  };
  H['nota-edit'] = (el) => {
    const n = S.get().notas.find((x) => x.id === el.dataset.id);
    if (!n) return;
    const t = prompt('Editar ponto de atenção:', n.texto);
    if (t == null || !t.trim()) return;
    S.upsert('notas', Object.assign({}, n, { texto: t.trim() }));
  };
  H['nota-del'] = (el) => {
    const n = S.get().notas.find((x) => x.id === el.dataset.id);
    if (!n || !confirm('Excluir este ponto de atenção?')) return;
    const copia = JSON.parse(JSON.stringify(n));
    S.remove('notas', n.id);
    U.toast('Ponto de atenção excluído', 'Desfazer', () => S.upsert('notas', copia));
  };
  U.changeHandlers.push((el) => {
    if (el.dataset.notaDone) {
      const n = S.get().notas.find((x) => x.id === el.dataset.notaDone);
      if (n) S.upsert('notas', Object.assign({}, n, { done: el.checked }));
      return true;
    }
    return false;
  });

  /* =====================  CONFIGURAÇÕES  ===================== */
  const RULES = '{\n  "rules": {\n    ".read": false,\n    ".write": false,\n    "salas": {\n      "$sala": {\n        ".read": true,\n        ".write": true\n      }\n    }\n  }\n}';

  U.views.config = function () {
    const c = S.cfg(), s = S.get();
    const theme = localStorage.getItem('orc-theme') || 'auto';
    $('#tab-config').innerHTML =
      '<div class="card section"><h2>👤 Quem está usando</h2>' +
        '<div class="params"><div class="field"><label>Seu nome</label><input id="cfg-user" value="' + esc(c.user || '') + '" maxlength="30" placeholder="Ex.: Marcos"><div class="hint">Aparece como autor das alterações.</div></div>' +
        '<div class="field"><label>Tema</label><select id="cfg-theme"><option value="auto"' + (theme === 'auto' ? ' selected' : '') + '>Automático (do aparelho)</option><option value="light"' + (theme === 'light' ? ' selected' : '') + '>Claro</option><option value="dark"' + (theme === 'dark' ? ' selected' : '') + '>Escuro</option></select></div></div></div>' +

      '<div class="card section"><h2>☁️ Sincronização entre vocês dois</h2>' +
        '<p class="muted" style="margin-top:0">Sem sincronização, os dados ficam só neste aparelho/navegador. Para que você e sua esposa vejam e editem a <strong>mesma</strong> lista, ligue a sincronização gratuita (Firebase Realtime Database). O passo a passo está no <strong>README</strong>. Depois é só colar o endereço e o código da sala nos dois aparelhos.</p>' +
        '<div class="params">' +
          '<div class="field"><label>Endereço do banco (URL do Firebase)</label><input id="cfg-url" value="' + esc(c.url || '') + '" placeholder="https://seu-projeto-default-rtdb.firebaseio.com" inputmode="url" autocapitalize="off" spellcheck="false"></div>' +
          '<div class="field"><label>Código da sala (segredo de vocês)</label><input id="cfg-room" value="' + esc(c.room || '') + '" placeholder="ex.: reforma-vision-penha-7k3q" autocapitalize="off" spellcheck="false"><div class="hint">Use o MESMO código nos dois aparelhos. Escolha algo difícil de adivinhar.</div></div>' +
        '</div>' +
        '<div class="row-end" style="justify-content:flex-start"><button class="btn primary" data-act="sync-save">Salvar e sincronizar</button><button class="btn" data-act="sync-now">Sincronizar agora</button><button class="btn danger" data-act="sync-off">Desligar</button></div>' +
        '<div id="cfg-status" class="muted" style="margin-top:10px"></div>' +
        '<details style="margin-top:12px"><summary style="cursor:pointer;font-weight:600">Regras de segurança do Firebase (copie e cole)</summary><pre style="background:var(--surface-2);border:1px solid var(--border);padding:10px;border-radius:10px;overflow:auto;font-size:.82rem">' + esc(RULES) + '</pre><p class="muted" style="margin:6px 0 0">Com essas regras ninguém consegue listar as salas; só quem sabe o código acessa os dados.</p></details>' +
      '</div>' +

      '<div class="card section"><h2>💾 Backup e exportação</h2>' +
        '<div class="row"><button class="btn" data-act="exp-json">⬇️ Backup completo (.json)</button><button class="btn" data-act="exp-csv">⬇️ Exportar orçamentos (.csv / Excel)</button><button class="btn" data-act="imp-json">⬆️ Importar backup (.json)</button><button class="btn" id="btn-print2" data-act="print">🖨️ Imprimir / PDF</button></div>' +
        '<input type="file" id="file-json" accept="application/json,.json" hidden>' +
        '<p class="muted" style="margin-bottom:0">Dica: faça um backup de vez em quando. O CSV abre direto no Excel e no Google Planilhas.</p></div>' +

      '<div class="card section"><h2>🧹 Dados</h2>' +
        '<div class="row"><button class="btn" data-act="reset-seed">↺ Restaurar dados originais da planilha</button><button class="btn danger" data-act="clear-all">🗑 Apagar tudo e começar do zero</button></div>' +
        '<p class="muted" style="margin-bottom:0">Atualmente: ' + s.orcamentos.length + ' orçamentos, ' + s.categorias.length + ' categorias, ' + s.notas.length + ' pontos de atenção.</p></div>';
    U.views.configStatus();
  };
  U.views.configStatus = function () {
    const el = $('#cfg-status');
    if (!el) return;
    const st = S.status();
    el.innerHTML = 'Estado: <strong>' + esc(st.msg) + '</strong>' + (st.last ? ' · última vez ' + new Date(st.last).toLocaleTimeString('pt-BR') : '');
    el.style.color = st.kind === 'err' ? 'var(--bad)' : '';
  };

  H['sync-save'] = async () => {
    const url = $('#cfg-url').value.trim(), room = $('#cfg-room').value.trim();
    if (!url || !room) { U.toast('Preencha o endereço e o código da sala'); return; }
    if (!/firebaseio\.com|firebasedatabase\.app/i.test(url) && !confirm('O endereço não parece ser do Firebase. Continuar mesmo assim?')) return;
    if (room.length < 8) { U.toast('Use um código de sala com pelo menos 8 caracteres'); return; }
    S.setConfig({ url, room });
    const r = await S.sync();
    U.toast(r.ok ? 'Sincronização ligada ✔' : 'Não foi possível sincronizar – veja a mensagem de estado');
  };
  H['sync-now'] = async () => {
    if (!S.hasSync()) { U.toast('A sincronização não está configurada'); return; }
    const r = await S.sync();
    U.toast(r.ok ? 'Sincronizado ✔' : 'Falha ao sincronizar');
  };
  H['sync-off'] = () => {
    if (!confirm('Desligar a sincronização neste aparelho? Os dados locais continuam aqui.')) return;
    S.setConfig({ url: '', room: '' });
    U.render();
  };
  H['exp-json'] = () => {
    const d = D.todayISO();
    U.download('orcamentos-reforma-backup-' + d + '.json', 'application/json', JSON.stringify(S.get(), null, 2));
    U.toast('Backup gerado');
  };
  H['exp-csv'] = () => {
    const s = S.get(), hoje = D.todayISO();
    const n2 = (v) => (v === '' || v == null ? '' : Number(v).toFixed(2).replace('.', ','));
    const q = (v) => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
    const head = ['Código', 'Categoria', 'Fornecedor', 'Descrição', 'Opção', 'Qtd', 'Valor unitário', 'Valor total', 'À vista', 'Economia à vista', 'Parcelas', 'Valor da parcela', 'Entrada', 'Forma de pagamento', 'Data do orçamento', 'Válido até', 'Situação da validade', 'Status', '1ª parcela', 'Prazo', 'Garantia', 'Incluso', 'Não incluso', 'Contato', 'Links', 'Observações internas', 'Avaliação', 'Cotado por', 'Total pago', 'Última alteração'];
    const lines = [head.map(q).join(';')];
    s.orcamentos.forEach((o) => {
      const e = D.economia(o);
      lines.push([
        o.codigo, o.categoria, o.fornecedor, o.descricao, o.opcao, String(D.qtd(o)).replace('.', ','), n2(D.num(o.valorUnit)), n2(D.total(o)), n2(D.aVista(o)), n2(e), D.nParc(o), n2(D.valorParcela(o)), n2(D.entrada(o) || ''),
        o.formaPagamento, o.dataOrcamento ? D.fmtDate(o.dataOrcamento) : '', o.validade ? D.fmtDate(o.validade) : '', D.validadeInfo(o, hoje).label, o.status,
        o.primeiraParcela ? D.fmtDate(o.primeiraParcela) : '', o.prazo, o.garantia, o.incluso, o.naoIncluso, o.contato, o.links, o.obs, o.avaliacao || '', o.cotadoPor, n2(D.pago(o)), U.fmtDateTime(o.updatedAt),
      ].map(q).join(';'));
    });
    U.download('orcamentos-reforma-' + hoje + '.csv', 'text/csv;charset=utf-8', '﻿' + lines.join('\r\n'));
    U.toast('CSV gerado');
  };
  H['imp-json'] = () => $('#file-json').click();
  H.print = () => window.print();
  H['reset-seed'] = () => {
    if (!confirm('Restaurar os dados originais da planilha? Isso SUBSTITUI os orçamentos, categorias e pontos de atenção atuais.')) return;
    S.importState(D.seed(), 'replace');
    U.toast('Dados originais restaurados');
  };
  H['clear-all'] = () => {
    if (!confirm('Apagar TODOS os orçamentos, categorias e pontos de atenção?\n\nFaça um backup antes. Se a sincronização estiver ligada, o outro aparelho também será limpo.')) return;
    if (!confirm('Tem certeza? Esta ação não pode ser desfeita.')) return;
    const vazio = { v: 1, meta: Object.assign({}, S.get().meta), categorias: [], orcamentos: [], notas: [], tombs: {} };
    S.importState(vazio, 'replace');
    U.toast('Tudo apagado');
  };
  U.importFile = function (file) {
    const fr = new FileReader();
    fr.onload = () => {
      try {
        const obj = JSON.parse(fr.result);
        const inc = S.normalize(obj);
        if (!inc.orcamentos.length && !inc.categorias.length) throw new Error('arquivo sem dados');
        if (!confirm('Importar ' + inc.orcamentos.length + ' orçamentos, ' + inc.categorias.length + ' categorias e ' + inc.notas.length + ' pontos de atenção?')) return;
        const mesclar = !confirm('Como importar?\n\nOK = SUBSTITUIR tudo pelo conteúdo do arquivo\nCancelar = MESCLAR com o que já existe');
        S.importState(obj, mesclar ? 'merge' : 'replace');
        U.toast('Backup importado');
      } catch (e) { alert('Não foi possível ler o arquivo: ' + e.message); }
    };
    fr.readAsText(file);
  };

  U.changeHandlers.push((el) => {
    if (el.id === 'cfg-user') { S.setConfig({ user: el.value.trim() }); U.toast('Nome salvo'); return true; }
    if (el.id === 'cfg-theme') { U.applyTheme(el.value); return true; }
    return false;
  });
})();
