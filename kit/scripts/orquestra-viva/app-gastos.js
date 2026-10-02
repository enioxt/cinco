/* app-gastos.js — GASTOS-VISIVEIS-001 (corte Enio 15/09 17:05: "controle de gastos de todas as
   nossas sessões, bem visível no EGOS APP, mostrando todos os gastos distribuídos com todos os
   dados possíveis que já temos"; complemento 17:08: "o próprio Claude tem os cálculos" — os
   cartões "real" vêm do cost-state do Claude Code, não de uma tabela de preço própria).

   7ª aba DENTRO da gaveta "avisos-overlay" que já existe (mesma correção Prime de
   app-conversas.js/app-uso.js: zero botão/overlay novo no #header). Arquivo NOVO, servido por
   ÚLTIMO por /app.js — só USA (nunca declara) escaparHtml dos anteriores. NÃO toca
   app-uso.js/app-conversas.js: listener PRÓPRIO nos botões de #avisos-abas.

   Gráfico de barras diário em SVG puro (sem lib externa, por pedido explícito). Tabelas
   ordenáveis: clique no <th> alterna asc/desc, sem round-trip ao servidor (os dados do último
   /api/gastos já estão em memória). Semáforo de 4 cores: ⚪ quando a fonte não respondeu ou o
   dado é estimado sem contraprova; nunca 0 em silêncio (R13-c). */
(function () {
  var GASTOS_POLL_MS = 60000;
  var gastosTimer = null;
  var gastosPeriodo = "hoje";
  var gastosAbaAtiva = false;
  var ultimaResposta = null;
  var ordenacao = {}; // { "top-sessoes": {col, dir}, ... }

  function fmtUsd(v) {
    return "$" + Number(v || 0).toFixed(4);
  }
  // usdReal null = ⚪ NÃO-MEDIDO (R13-c) — NUNCA $0.0000 em silêncio. Só usar para custo
  // REAL de sessão; ledger/vendor continuam com fmtUsd (contrato deles já é "0 = 0").
  function fmtUsdReal(v) {
    return v === null || v === undefined ? "⚪" : fmtUsd(v);
  }
  // Título de sessão pode ser uma frase inteira — sem teto, ele empurra a coluna "usd (real)"
  // para fora da área visível do card (overflow-x:auto rola, mas esconde o número principal
  // sem o usuário saber que precisa rolar). Corta com "…" e guarda o texto inteiro no title=.
  function truncar(txt, max) {
    var s = String(txt || "");
    return s.length > max ? s.slice(0, max - 1) + "…" : s;
  }
  function fmtPct(v) {
    return v === null || v === undefined ? "⚪" : Number(v).toFixed(0) + "%";
  }

  function renderCartoes(resp) {
    var alvo = document.getElementById("gastos-cartoes");
    if (!alvo) return;
    var n = resp.claudeCode.nSessoesComCostState;
    var m = resp.claudeCode.nSessoesTotal;
    var cartoes = [
      {
        rotulo: "Claude Code (real, equivalente-API) · " + (n === undefined ? "⚪" : n) + " de " + (m === undefined ? "⚪" : m) + " sessões com cálculo do Claude Code",
        valor: fmtUsd(resp.claudeCode.totalUsd),
      },
      { rotulo: "Estimado por chamada (ledger, inclui braço)", valor: fmtUsd(resp.estimadoLedger.totalUsd) },
      {
        rotulo: "Codex — janela 5h / semanal",
        valor: fmtPct(resp.codex.janela5hRestantePct) + " / " + fmtPct(resp.codex.janelaSemanalRestantePct),
      },
    ];
    var gastoVendors = (resp.vendors || []).reduce(function (acc, v) {
      return acc + (v.gastoUsd || 0);
    }, 0);
    cartoes.push({ rotulo: "APIs pagas (gasto do mês, vendors com teto)", valor: fmtUsd(gastoVendors) });
    alvo.innerHTML = cartoes
      .map(function (c) {
        return (
          '<div class="gastos-cartao"><span class="valor">' +
          escaparHtml(c.valor) +
          '</span><span class="rotulo">' +
          escaparHtml(c.rotulo) +
          "</span></div>"
        );
      })
      .join("");
  }

  function renderSerie(resp) {
    var alvo = document.getElementById("gastos-serie");
    if (!alvo) return;
    var dias = resp.serieDiaria || [];
    if (!dias.length) {
      alvo.innerHTML = "⚪ sem série diária";
      return;
    }
    var max = Math.max.apply(
      null,
      dias.map(function (d) {
        return Math.max(d.usdClaudeCodeReal, d.usdEstimadoLedger);
      }).concat([0.0001]),
    );
    var w = Math.max(480, dias.length * 16);
    var h = 90;
    var bw = w / dias.length;
    var barras = dias
      .map(function (d, i) {
        var hReal = (d.usdClaudeCodeReal / max) * (h - 20);
        var hEst = (d.usdEstimadoLedger / max) * (h - 20);
        var x = i * bw;
        var titulo = d.data + " — real " + fmtUsd(d.usdClaudeCodeReal) + " · estimado " + fmtUsd(d.usdEstimadoLedger);
        return (
          '<g><title>' + escaparHtml(titulo) + '</title>' +
          '<rect x="' + (x + 1) + '" y="' + (h - hReal - 10) + '" width="' + (bw / 2 - 1) + '" height="' + hReal + '" fill="var(--acento, #4a90d9)" />' +
          '<rect x="' + (x + bw / 2) + '" y="' + (h - hEst - 10) + '" width="' + (bw / 2 - 1) + '" height="' + hEst + '" fill="var(--texto-fraco, #999)" />' +
          "</g>"
        );
      })
      .join("");
    alvo.innerHTML =
      '<svg viewBox="0 0 ' + w + ' ' + h + '" width="100%" height="' + h + '" role="img" aria-label="série diária de gastos">' +
      barras +
      "</svg>" +
      '<div class="gastos-serie-legenda">■ real (Claude Code) &nbsp; ■ estimado (ledger)</div>';
  }

  function ordenar(lista, chaveOrdem) {
    var o = ordenacao[chaveOrdem.id] || { col: chaveOrdem.colDefault, dir: -1 };
    var copia = lista.slice();
    copia.sort(function (a, b) {
      var av = a[o.col], bv = b[o.col];
      if (typeof av === "string") return o.dir * String(av).localeCompare(String(bv));
      return o.dir * ((av || 0) - (bv || 0));
    });
    return { copia: copia, o: o };
  }

  function ligarOrdenacao(tabelaId, colDefault) {
    var el = document.getElementById(tabelaId);
    if (!el) return;
    el.querySelectorAll("th[data-col]").forEach(function (th) {
      th.addEventListener("click", function () {
        var col = th.getAttribute("data-col");
        var atual = ordenacao[tabelaId] || { col: colDefault, dir: -1 };
        ordenacao[tabelaId] = { col: col, dir: atual.col === col ? -atual.dir : -1 };
        if (ultimaResposta) renderTudo(ultimaResposta);
      });
    });
  }

  function tabelaTopSessoes(resp) {
    var lista = (resp.claudeCode.top10 || []).map(function (s) {
      // ordenação usa o mesmo critério do backend (real+estimado) — coluna sintética só p/ sort.
      return Object.assign({}, s, { usdOrdem: (s.usdReal || 0) + (s.usdEstimado || 0) });
    });
    var r = ordenar(lista, { id: "gastos-top-sessoes", colDefault: "usdOrdem" });
    var linhas = r.copia
      .map(function (s) {
        var estimado = s.usdReal === null && s.usdEstimado ? " <span title=\"estimado a partir de usage, sem cost-state\">(~" + fmtUsd(s.usdEstimado) + " est.)</span>" : "";
        return (
          "<tr><td>" + escaparHtml(s.sessao8) + "</td><td>" + escaparHtml(s.projeto || "⚪") +
          "</td><td>" + escaparHtml(s.papel || "⚪") + "</td><td>" + escaparHtml(truncar(s.pessoa || "⚪ sem dono declarado", 16)) +
          '</td><td title="' + escaparHtml(s.titulo || "") + '">' + escaparHtml(truncar(s.titulo || "⚪", 14)) +
          "</td><td>" + fmtUsdReal(s.usdReal) + estimado + "</td></tr>"
        );
      })
      .join("");
    return (
      '<table class="gastos-grade" id="gastos-top-sessoes"><thead><tr>' +
      '<th data-col="sessao8">sessão</th><th data-col="projeto">projeto</th><th data-col="papel">papel</th>' +
      '<th data-col="pessoa">pessoa</th><th data-col="titulo">título</th><th data-col="usdOrdem">usd (real)</th>' +
      "</tr></thead><tbody>" + (linhas || '<tr><td colspan="6">⚪ nenhuma sessão medida</td></tr>') + "</tbody></table>"
    );
  }

  function tabelaRankingModelo(resp) {
    var r = ordenar(resp.rankingModelo || [], { id: "gastos-ranking-modelo", colDefault: "usdReal" });
    var linhas = r.copia
      .map(function (m) {
        return (
          "<tr><td>" + escaparHtml(m.modelo) + "</td><td>" + fmtUsd(m.usdReal) + "</td><td>" + fmtUsd(m.usdEstimadoLedger) + "</td></tr>"
        );
      })
      .join("");
    return (
      '<table class="gastos-grade" id="gastos-ranking-modelo"><thead><tr>' +
      '<th data-col="modelo">modelo</th><th data-col="usdReal">real</th><th data-col="usdEstimadoLedger">estimado</th>' +
      "</tr></thead><tbody>" + (linhas || '<tr><td colspan="3">⚪ sem dados</td></tr>') + "</tbody></table>"
    );
  }

  function tabelaRankingPapel(resp) {
    var r = ordenar(resp.rankingPapel || [], { id: "gastos-ranking-papel", colDefault: "usd" });
    var linhas = r.copia
      .map(function (p) {
        var marca = p.fonte === "estimado-ledger" ? " ⚪ (estimado)" : "";
        return "<tr><td>" + escaparHtml(p.papel) + marca + "</td><td>" + fmtUsd(p.usd) + "</td></tr>";
      })
      .join("");
    return (
      '<table class="gastos-grade" id="gastos-ranking-papel"><thead><tr>' +
      '<th data-col="papel">papel</th><th data-col="usd">usd</th>' +
      "</tr></thead><tbody>" + (linhas || '<tr><td colspan="2">⚪ sem dados</td></tr>') + "</tbody></table>"
    );
  }

  function tabelaRankingProjeto(resp) {
    var r = ordenar(resp.rankingProjeto || [], { id: "gastos-ranking-projeto", colDefault: "usdReal" });
    var linhas = r.copia
      .map(function (p) {
        return "<tr><td>" + escaparHtml(p.projeto) + "</td><td>" + fmtUsdReal(p.usdReal) + "</td><td>" + fmtUsd(p.usdEstimado) + "</td></tr>";
      })
      .join("");
    return (
      '<table class="gastos-grade" id="gastos-ranking-projeto"><thead><tr>' +
      '<th data-col="projeto">projeto</th><th data-col="usdReal">real</th><th data-col="usdEstimado">estimado</th>' +
      "</tr></thead><tbody>" + (linhas || '<tr><td colspan="3">⚪ sem dados</td></tr>') + "</tbody></table>"
    );
  }

  function tabelaRankingPessoa(resp) {
    var r = ordenar(resp.porPessoa || [], { id: "gastos-ranking-pessoa", colDefault: "usdReal" });
    var linhas = r.copia
      .map(function (p) {
        return (
          "<tr><td>" + escaparHtml(p.pessoa) + "</td><td>" + fmtUsdReal(p.usdReal) + "</td><td>" + fmtUsd(p.usdEstimado) +
          "</td><td>" + escaparHtml(String(p.nSessoes)) + "</td></tr>"
        );
      })
      .join("");
    return (
      '<table class="gastos-grade" id="gastos-ranking-pessoa"><thead><tr>' +
      '<th data-col="pessoa">pessoa</th><th data-col="usdReal">real</th><th data-col="usdEstimado">estimado</th><th data-col="nSessoes">sessões</th>' +
      "</tr></thead><tbody>" + (linhas || '<tr><td colspan="4">⚪ sem dados</td></tr>') + "</tbody></table>"
    );
  }

  function renderVendors(resp) {
    var alvo = document.getElementById("gastos-vendors");
    if (!alvo) return;
    var vendors = resp.vendors || [];
    if (!vendors.length) {
      alvo.innerHTML = "⚪ nenhum vendor com teto/saldo declarado em INTEGRATION_REGISTRY §Guardas";
      return;
    }
    alvo.innerHTML =
      "<h3>APIs pagas (guarda-limites)</h3>" +
      vendors
        .map(function (v) {
          var icone = v.estado === "VENCIDO" ? "🔴" : v.estado === "avisando" ? "🟡" : "🟢";
          var gasto = v.gastoUsd === null ? "⚪" : fmtUsd(v.gastoUsd) + (v.tetoUsd !== null ? " de $" + v.tetoUsd : "");
          var saldo = v.saldoUsd === null ? "" : " · saldo " + fmtUsd(v.saldoUsd);
          return (
            '<div class="gastos-vendor-linha"><span>' + icone + " " + escaparHtml(v.vendor) + "</span><span>" +
            gasto + saldo + (v.bloqueado ? " · BLOQUEADO" : "") + "</span></div>"
          );
        })
        .join("");
  }

  function renderNaoMedido(resp) {
    var alvo = document.getElementById("gastos-nao-medido");
    if (!alvo) return;
    var itens = (resp.naoMedido || []).concat(
      Object.keys(resp.fontes || {})
        .filter(function (k) { return String(resp.fontes[k] || "").indexOf("⚪") === 0; })
        .map(function (k) { return resp.fontes[k]; }),
    );
    if (!itens.length) {
      alvo.innerHTML = "";
      return;
    }
    alvo.innerHTML = "🕳️ O que ficou de fora:<ul>" + itens.map(function (i) { return "<li>" + escaparHtml(i) + "</li>"; }).join("") + "</ul>";
  }

  function renderStatus(resp) {
    var alvo = document.getElementById("gastos-status");
    if (!alvo) return;
    var nota = resp.claudeCode.nota + " · " + resp.estimadoLedger.nota;
    alvo.textContent = nota;
  }

  function renderTudo(resp) {
    ultimaResposta = resp;
    renderStatus(resp);
    renderCartoes(resp);
    renderSerie(resp);
    var alvoTop = document.getElementById("gastos-top-sessoes");
    if (alvoTop) alvoTop.outerHTML = tabelaTopSessoes(resp);
    var alvoModelo = document.getElementById("gastos-ranking-modelo");
    if (alvoModelo) alvoModelo.outerHTML = tabelaRankingModelo(resp);
    var alvoPapel = document.getElementById("gastos-ranking-papel");
    if (alvoPapel) alvoPapel.outerHTML = tabelaRankingPapel(resp);
    var alvoProjeto = document.getElementById("gastos-ranking-projeto");
    if (alvoProjeto) alvoProjeto.outerHTML = tabelaRankingProjeto(resp);
    var alvoPessoa = document.getElementById("gastos-ranking-pessoa");
    if (alvoPessoa) alvoPessoa.outerHTML = tabelaRankingPessoa(resp);
    ligarOrdenacao("gastos-top-sessoes", "usdReal");
    ligarOrdenacao("gastos-ranking-modelo", "usdReal");
    ligarOrdenacao("gastos-ranking-papel", "usd");
    ligarOrdenacao("gastos-ranking-projeto", "usdReal");
    ligarOrdenacao("gastos-ranking-pessoa", "usdReal");
    renderVendors(resp);
    renderNaoMedido(resp);
  }

  async function carregarGastos() {
    try {
      var resp = await (await fetch("/api/gastos?periodo=" + encodeURIComponent(gastosPeriodo))).json();
      renderTudo(resp);
    } catch (e) {
      var alvo = document.getElementById("gastos-cartoes");
      if (alvo) alvo.innerHTML = "🔴 não consegui ler /api/gastos: " + escaparHtml(String(e));
    }
  }

  function pararPollGastos() {
    if (gastosTimer) { clearInterval(gastosTimer); gastosTimer = null; }
  }
  window.__pararPollGastos = pararPollGastos;

  function iniciarPollGastos() {
    pararPollGastos();
    carregarGastos();
    gastosTimer = setInterval(carregarGastos, GASTOS_POLL_MS);
  }

  var abasPrincipais = document.getElementById("avisos-abas");
  var painelGastos = document.getElementById("gastos-painel");
  if (abasPrincipais && painelGastos) {
    Array.prototype.forEach.call(abasPrincipais.querySelectorAll(".conv-aba"), function (btn) {
      btn.addEventListener("click", function () {
        gastosAbaAtiva = btn.getAttribute("data-aba") === "gastos";
        painelGastos.hidden = !gastosAbaAtiva;
        if (gastosAbaAtiva) iniciarPollGastos();
        else pararPollGastos();
      });
    });
  }

  var botoesPeriodo = document.getElementById("gastos-periodos");
  if (botoesPeriodo) {
    Array.prototype.forEach.call(botoesPeriodo.querySelectorAll(".conv-aba"), function (btn) {
      btn.addEventListener("click", function () {
        gastosPeriodo = btn.getAttribute("data-periodo") || "hoje";
        Array.prototype.forEach.call(botoesPeriodo.querySelectorAll(".conv-aba"), function (b) {
          b.classList.toggle("ativa", b === btn);
        });
        if (gastosAbaAtiva) carregarGastos();
      });
    });
  }
})();
