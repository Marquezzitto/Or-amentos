/* =========================================================
   Dados iniciais (vindos da planilha) + funções de cálculo
   ========================================================= */
(function (g) {
  'use strict';

  const STATUS = ['Em cotação', 'Escolhido', 'Contratado', 'Descartado'];
  const CONSIDERA = (s) => s === 'Escolhido' || s === 'Contratado';
  const ATIVO = (s) => s !== 'Descartado';

  /* ---------- utilitários ---------- */
  const num = (v) => {
    if (typeof v === 'number') return isFinite(v) ? v : 0;
    const n = parseFloat(String(v == null ? '' : v).replace(',', '.'));
    return isFinite(n) ? n : 0;
  };
  const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
  const sum = (a) => round2(a.reduce((s, x) => s + x, 0));

  const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const fmtBRL = (v) => (v == null || isNaN(v) ? '—' : brl.format(v));
  const fmtPct = (v) => (v == null || isNaN(v) ? '—' : v.toFixed(1).replace('.', ',') + '%');

  const pad = (n) => String(n).padStart(2, '0');
  const todayISO = () => {
    const d = new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  };
  const parseISO = (iso) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
    return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
  };
  const fmtDate = (iso) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
    return m ? m[3] + '/' + m[2] + '/' + m[1] : '—';
  };
  const fmtMonth = (key) => {
    const [y, m] = key.split('-');
    const nomes = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    return nomes[+m - 1] + '/' + y;
  };
  const daysDiff = (fromISO, toISO) => {
    const a = parseISO(fromISO), b = parseISO(toISO);
    if (!a || !b) return null;
    return Math.round((b - a) / 86400000);
  };
  const esc = (s) =>
    String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = () => 'x' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const slug = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  /* ---------- cálculo por orçamento ---------- */
  const qtd = (o) => (o.qtd === '' || o.qtd == null ? 1 : num(o.qtd));
  const total = (o) => round2(qtd(o) * num(o.valorUnit));
  const entrada = (o) => num(o.entrada);
  const nParc = (o) => Math.max(1, Math.floor(num(o.parcelas)) || 1);
  const valorParcela = (o) => round2((total(o) - entrada(o)) / nParc(o));
  const aVista = (o) => (o.aVista === '' || o.aVista == null ? null : num(o.aVista));
  const economia = (o) => {
    const v = aVista(o);
    return v == null || v <= 0 ? null : round2(total(o) - v);
  };
  const pago = (o) => sum((o.pagamentos || []).map((p) => num(p.valor)));

  function validadeInfo(o, hoje) {
    if (!o.validade) return { key: 'sem', label: 'Sem data', dias: null };
    const d = daysDiff(hoje, o.validade);
    if (d == null) return { key: 'sem', label: 'Sem data', dias: null };
    if (d < 0) return { key: 'vencido', label: 'Vencido', dias: d };
    if (d === 0) return { key: 'breve', label: 'Vence hoje', dias: d };
    if (d <= 3) return { key: 'breve', label: 'Vence em breve', dias: d };
    return { key: 'ok', label: 'Válido', dias: d };
  }
  const alertaValidade = (o) => o.status === 'Em cotação' || o.status === 'Escolhido';

  /* ---------- resumo do painel ---------- */
  function summarize(s, hoje) {
    hoje = hoje || todayISO();
    const orc = s.orcamentos || [];
    const cons = orc.filter((o) => CONSIDERA(o.status));
    const contratado = sum(cons.filter((o) => o.status === 'Contratado').map(total));
    const escolhido = sum(cons.filter((o) => o.status === 'Escolhido').map(total));
    const totalConsiderado = round2(contratado + escolhido);
    const dispRaw = s.meta && s.meta.orcamentoDisponivel;
    const disp = dispRaw === '' || dispRaw == null ? null : num(dispRaw);
    const area = num(s.meta && s.meta.areaM2);

    // categorias (na ordem cadastrada + órfãs)
    const nomes = (s.categorias || []).map((c) => c.nome);
    orc.forEach((o) => { if (o.categoria && !nomes.includes(o.categoria)) nomes.push(o.categoria); });
    const porCategoria = nomes.map((nome) => {
      const cat = (s.categorias || []).find((c) => c.nome === nome) || {};
      const ativos = orc.filter((o) => o.categoria === nome && ATIVO(o.status));
      const vals = ativos.map(total).filter((v) => v > 0);
      const considerados = ativos.filter((o) => CONSIDERA(o.status));
      const valor = sum(considerados.map(total));
      const previsto = cat.previsto === '' || cat.previsto == null ? null : num(cat.previsto);
      let situacao = 'OK', sk = 'ok';
      if (!ativos.length) { situacao = 'Sem orçamento'; sk = 'sem'; }
      else if (!considerados.length) { situacao = 'Sem escolha'; sk = 'warn'; }
      else if (considerados.length > 1) { situacao = 'Mais de 1 escolhido'; sk = 'warn'; }
      if (previsto != null && previsto > 0 && valor > previsto) { situacao = 'Acima do previsto'; sk = 'bad'; }
      return {
        nome, previsto, qtdAtivos: ativos.length, qtdTotal: orc.filter((o) => o.categoria === nome).length,
        min: vals.length ? Math.min(...vals) : null, max: vals.length ? Math.max(...vals) : null,
        valor, considerados, situacao, sk,
        pct: totalConsiderado > 0 ? (valor / totalConsiderado) * 100 : 0,
      };
    });

    const cenarioBarato = sum(porCategoria.map((c) => c.min || 0));
    const cenarioCaro = sum(porCategoria.map((c) => c.max || 0));

    // alertas
    const vencidos = [], breves = [];
    orc.forEach((o) => {
      if (!alertaValidade(o)) return;
      const v = validadeInfo(o, hoje);
      if (v.key === 'vencido') vencidos.push(o);
      if (v.key === 'breve') breves.push(o);
    });
    const semEscolha = porCategoria.filter((c) => c.sk === 'warn' && c.considerados.length === 0 && c.qtdAtivos > 0);
    const multiplos = porCategoria.filter((c) => c.considerados.length > 1);

    // pagamentos
    const pagoTotal = sum(orc.map(pago));
    const pagoEmConsiderados = sum(cons.map(pago));
    const aPagar = Math.max(0, round2(totalConsiderado - pagoEmConsiderados));

    const saldo = disp == null ? null : round2(disp - totalConsiderado);
    const pct = disp && disp > 0 ? (totalConsiderado / disp) * 100 : null;
    let situacaoGeral, situacaoKey;
    if (disp == null) { situacaoGeral = 'Defina o orçamento disponível'; situacaoKey = 'sem'; }
    else if (saldo < 0) { situacaoGeral = 'Estourou o orçamento em ' + fmtBRL(-saldo); situacaoKey = 'bad'; }
    else if (pct >= 90) { situacaoGeral = 'Atenção: ' + fmtPct(pct) + ' do orçamento comprometido'; situacaoKey = 'warn'; }
    else { situacaoGeral = 'Dentro do orçamento'; situacaoKey = 'ok'; }

    return {
      contratado, escolhido, totalConsiderado, disp, area, saldo, pct,
      saldoContratados: disp == null ? null : round2(disp - contratado),
      custoM2: area > 0 ? round2(totalConsiderado / area) : null,
      cenarioBarato, cenarioCaro, porCategoria,
      alertas: { cadastrados: orc.length, vencidos, breves, semEscolha, multiplos },
      pagoTotal, aPagar, situacaoGeral, situacaoKey,
    };
  }

  /* ---------- fluxo de caixa mensal ---------- */
  function monthKeyOf(iso) { return iso ? iso.slice(0, 7) : null; }
  function cashflow(s, hoje) {
    hoje = hoje || todayISO();
    const meses = {};
    const get = (k) => (meses[k] = meses[k] || { mes: k, previsto: 0, pago: 0, itens: [], pagamentos: [] });
    const hj = parseISO(hoje);
    const defaultStart = hj.getFullYear() * 12 + hj.getMonth() + 1; // mês seguinte
    (s.orcamentos || []).forEach((o) => {
      if (CONSIDERA(o.status)) {
        const n = nParc(o), par = valorParcela(o), ent = entrada(o);
        const base = parseISO(o.primeiraParcela);
        const start = base ? base.getFullYear() * 12 + base.getMonth() : defaultStart;
        if (ent > 0) {
          const ed = parseISO(o.entradaData);
          const k = ed ? monthKeyOf(o.entradaData) : fmtKey(start);
          const m = get(k); m.previsto = round2(m.previsto + ent); m.itens.push({ o, valor: ent, tipo: 'Entrada' });
        }
        // distribui centavos para fechar exatamente o total
        let restante = round2(total(o) - ent);
        for (let i = 0; i < n; i++) {
          const v = i === n - 1 ? restante : par;
          restante = round2(restante - v);
          const m = get(fmtKey(start + i));
          m.previsto = round2(m.previsto + v);
          m.itens.push({ o, valor: v, tipo: n > 1 ? 'Parcela ' + (i + 1) + '/' + n : 'À vista / única' });
        }
      }
      (o.pagamentos || []).forEach((p) => {
        const k = monthKeyOf(p.data) || fmtKey(defaultStart - 1);
        const m = get(k); m.pago = round2(m.pago + num(p.valor)); m.pagamentos.push({ o, p });
      });
    });
    return Object.values(meses).sort((a, b) => (a.mes < b.mes ? -1 : 1));
  }
  function fmtKey(n) { return Math.floor(n / 12) + '-' + pad((n % 12) + 1); }

  /* ---------- dados iniciais (planilha "Reforma Vision Penha") ---------- */
  function seed() {
    const T = 1; // updatedAt mínimo: qualquer edição real prevalece sobre o seed
    const cats = [
      'Bancadas (Quartzo)', 'Sacada (Vidro)', 'Aquecedor', 'Persianas / Cortinas', 'Piso',
      'Pedreiro / Mão de obra', 'Materiais de obra', 'Sofá', 'Mesa', 'Marcenaria / Planejados',
      'Eletrodomésticos', 'Iluminação / Elétrica', 'Pintura', 'Decoração', 'Outros',
    ].map((nome, i) => ({ id: 'c-' + pad(i + 1), nome, previsto: '', updatedAt: T }));

    const base = {
      qtd: 1, entrada: 0, entradaData: '', aVista: '', formaPagamento: '', dataOrcamento: '', validade: '',
      primeiraParcela: '2026-11-01', prazo: '', garantia: '', incluso: '', naoIncluso: '', contato: '',
      links: '', obs: '', avaliacao: 0, cotadoPor: '', pagamentos: [], criadoEm: T, updatedAt: T,
    };
    const mk = (n, o) => Object.assign({}, base, { id: 'o-' + pad(n).padStart(3, '0'), codigo: 'O-' + String(n).padStart(3, '0') }, o);

    const orcamentos = [
      mk(1, {
        categoria: 'Bancadas (Quartzo)', fornecedor: 'Marmoraria Leal – Mármores e Granitos Ltda.',
        descricao: 'Orç. nº 11800 – Quartzo Branco. (1) Lavatório 0,60 x 0,50 m, frontão 0,15, saia 0,04. (2) Bancada integrada cozinha + área de serviço 3,45 x 0,60 m, frontão 0,10, saia 0,04. Meia esquadria 45°, recorte e colagem da cuba (cliente), tanque esculpido na pedra com tampa, instalação no local e mão francesa.',
        opcao: 'Quartzo Branco', valorUnit: 7360.55, parcelas: 10, aVista: 6992,
        formaPagamento: 'Cartão até 10x s/ juros (valor do PDF = parcelado). À vista: R$ 6.992,00 (5% de desconto).',
        dataOrcamento: '2026-10-09', validade: '2026-10-14', status: 'Escolhido',
        incluso: 'Valores sujeitos a alteração após a medição. Produto natural: sem responsabilidade por variação de tonalidade. Brinde: mop retrátil para bancadas.',
        naoIncluso: 'Ligação hidráulica e de gás; içamento das pedras; locomoção de escadas; recortes adicionais (consultar valores); desinstalação das bancadas existentes.',
        contato: 'WhatsApp (11) 94082-0699 · Av. Adriano Bertozzi 164, Jd. Helian · PIX CNPJ 54.629.111/0001-90',
      }),
      mk(2, {
        categoria: 'Sacada (Vidro)', fornecedor: 'Santana Glass – Vidros e Decorações',
        descricao: 'Envidraçamento de sacada – sistema articulado COM roldanas, 3,23 x 1,25 m. Vidro laminado 10 mm, 7 folhas, proteção solar e redução de 40–70% de ruído externo. Perfis alumínio 6060/6063, pintura eletrostática branca RAL 9003. Inclui prolongador inferior e ART.',
        opcao: 'Com roldanas', valorUnit: 4389, parcelas: 12, aVista: 3948,
        formaPagamento: '12x no cartão s/ juros (ou à vista). 50% de entrada nas medidas e o restante no término da instalação.',
        validade: '2026-10-20', status: 'Escolhido', prazo: '20 a 30 dias úteis após confirmação das medidas finais', garantia: '1 ano (mão de obra)',
        incluso: 'Roldanas de rolamento (blindado) com externo em nylon; estacionamentos em nylon; escovas de vedação em polipropileno; fechadura e aparadores em alumínio; fixação com parafusos sextavados. Sistema mais leve, prático e silencioso.',
        naoIncluso: 'Outros acessórios que não fazem parte do kit', contato: 'Proposta Vision Penha (imagem)',
      }),
      mk(3, {
        categoria: 'Sacada (Vidro)', fornecedor: 'Santana Glass – Vidros e Decorações',
        descricao: 'Envidraçamento de sacada – sistema articulado tradicional SEM roldanas, mesmas medidas 3,23 x 1,25 m. Mesma especificação técnica do item anterior.',
        opcao: 'Sem roldanas', valorUnit: 4845, parcelas: 12, aVista: 4360,
        formaPagamento: '12x no cartão s/ juros (ou à vista Pix/transferência). 50% de entrada nas medidas e o restante no término.',
        validade: '2026-10-20', status: 'Em cotação', prazo: '20 a 30 dias úteis após confirmação das medidas finais', garantia: '1 ano (mão de obra)',
        incluso: 'Sistema articulado tradicional.', naoIncluso: 'Outros acessórios que não fazem parte do kit', contato: 'Proposta Vision Penha (imagem)',
      }),
      mk(4, {
        categoria: 'Aquecedor', fornecedor: 'Rinnai (vendedora via WhatsApp)',
        descricao: 'Aquecedor a gás Rinnai 21 litros, modelo E211, nas cores Branco / Prata / Black.',
        opcao: 'E211 21 L', valorUnit: 3300, parcelas: 10, aVista: 3090,
        formaPagamento: 'Até 10x no cartão s/ juros (R$ 3.300,00) ou R$ 3.090,00 à vista via Pix.',
        status: 'Escolhido', garantia: '3 anos',
        incluso: 'Produto original, com Wi-Fi, assistência técnica autorizada em todo o Brasil.',
        naoIncluso: 'Instalação / ligação de gás: não informado – confirmar', contato: 'Vendedora (WhatsApp)',
      }),
      mk(5, {
        categoria: 'Persianas / Cortinas', fornecedor: '(informar fornecedor)',
        descricao: 'Cortina rolô em tecido blecaute COM bandô, 1,60 x 1,30 m. Valor por janela.',
        opcao: 'Com bandô', valorUnit: 690, parcelas: 5, formaPagamento: '5x sem juros', status: 'Em cotação',
        incluso: 'Valor unitário = por janela. Ajuste a quantidade de janelas.',
      }),
      mk(6, {
        categoria: 'Persianas / Cortinas', fornecedor: '(informar fornecedor)',
        descricao: 'Cortina rolô em tecido blecaute SEM bandô, 1,60 x 1,30 m. Valor por janela.',
        opcao: 'Sem bandô', valorUnit: 550, parcelas: 5, formaPagamento: '5x sem juros', status: 'Escolhido',
        incluso: 'Valor unitário = por janela. Ajuste a quantidade de janelas.',
      }),
      mk(7, {
        categoria: 'Piso', fornecedor: '(informar fornecedor)',
        descricao: 'Piso vinílico click 5 mm, com rodapé de 7 cm, perfil de portas, aplicação de massa alto nivelante (1 demão) e colocação.',
        opcao: 'Vinílico click 5 mm', valorUnit: 3795, parcelas: 5,
        formaPagamento: '5x sem juros (alternativa: 10x de R$ 420,00 = R$ 4.200,00, com acréscimo)', status: 'Escolhido',
        incluso: 'Material + colocação inclusos. Considerado o valor sem juros (5x).',
      }),
      mk(8, {
        categoria: 'Pedreiro / Mão de obra', fornecedor: '(informar pedreiro)', descricao: 'Pedreiro – mão de obra da reforma.',
        opcao: 'Mão de obra', valorUnit: 22000, parcelas: 1, status: 'Escolhido',
        incluso: "Valor NÃO inclui materiais – orçar materiais à parte (categoria 'Materiais de obra').", naoIncluso: 'Todos os materiais',
      }),
      mk(9, {
        categoria: 'Sofá', fornecedor: '(informar loja)', descricao: 'Sofá (informar modelo)', opcao: '', valorUnit: 3490, parcelas: 1,
        formaPagamento: 'R$ 3.490,00 (alternativa: 12x de R$ 339,00 = R$ 4.068,00, com acréscimo)', status: 'Escolhido',
        incluso: 'Considerado o valor sem juros.',
      }),
      mk(10, {
        categoria: 'Mesa', fornecedor: '(informar loja)', descricao: 'Mesa (informar modelo)', opcao: '', valorUnit: 3990, parcelas: 1,
        formaPagamento: 'À vista', status: 'Escolhido',
      }),
    ];

    const nota = (n, texto, orcamentoId) => ({ id: 'n-' + pad(n), texto, orcamentoId: orcamentoId || '', done: false, criadoEm: T, updatedAt: T });
    const notas = [
      nota(1, 'Pedreiro (R$ 22.000): NÃO inclui materiais – orçar os materiais à parte.', 'o-008'),
      nota(2, 'Quartzo (Marmoraria Leal): valores sujeitos a alteração após a medição; não inclui ligação hidráulica/gás, içamento, escadas, recortes extras e desinstalação das bancadas atuais.', 'o-001'),
      nota(3, 'Persianas: quantidade de janelas está como 1 (premissa) – ajuste a quantidade no orçamento.', 'o-006'),
      nota(4, 'Aquecedor Rinnai: instalação/ligação de gás não informada no orçamento – confirmar.', 'o-004'),
      nota(5, 'Sacada (Santana Glass): proposta válida até 20/10/2026; 50% de entrada nas medidas.', 'o-002'),
    ];

    return {
      v: 1,
      meta: { nome: 'Reforma Vision Penha', areaM2: 43, orcamentoDisponivel: '', updatedAt: T },
      categorias: cats, orcamentos, notas, tombs: {},
    };
  }

  g.Data = {
    STATUS, CONSIDERA, ATIVO, num, round2, sum, fmtBRL, fmtPct, fmtDate, fmtMonth, todayISO, parseISO, daysDiff, esc, uid, slug,
    qtd, total, entrada, nParc, valorParcela, aVista, economia, pago, validadeInfo, alertaValidade,
    summarize, cashflow, seed,
  };
})(window);
