/* app-historico.js — APP-HISTORICO-E-TELEMETRIA-001 (corte Enio 13/09, verbatim: "organize o
   egos app, ele está iniciando várias vezes, estude todas, ative a observabilidade completa,
   transparência radical, telemetria no egos app, com histórico de tudo, pulsos micélio").
   Arquivo NOVO, servido por ÚLTIMO por /app.js — só USA (nunca declara) abrirGaveta/
   fecharGaveta/escaparHtml/horaLocal dos anteriores (mesmo contrato de app-conexoes.js/
   app-mcp.js). GAVETAS["historico-overlay"] é registrada de forma ESTÁTICA em app-gavetas.js
   (mesmo padrão do MCP/WhatsApp) e chama window.__pararPollHistorico ao fechar — regra da
   casa: poll SÓ enquanto a gaveta está aberta, nunca em segundo plano com o painel escondido.

   Sem LLM, sem cor 🟢 sem medição: cada item da timeline mostra a fonte tal como o servidor
   mediu — ⚪ quando a fonte falhou, nunca um veredito inventado (=R13-c). */
(function () {
  var HIST_POLL_MS = 30000;
  var histTimer = null;
  var histFiltroFonte = null; // null = todas
  var histUltimaResposta = null;

  var EMOJI_FONTE = {
    casca: "🖥️",
    launcher: "🚀",
    atualizador: "🔄",
    sessao: "💬",
    pulso: "🫀",
    heartbeat: "❤️",
  };
  var ROTULO_FONTE = {
    casca: "casca",
    launcher: "launcher",
    atualizador: "servidor",
    sessao: "sessões",
    pulso: "pulso micélio",
    heartbeat: "fila",
  };

  function agruparPorHora(itens) {
    var grupos = [];
    var atual = null;
    itens.forEach(function (item) {
      var d = new Date(item.quando);
      var chave = isNaN(d.getTime()) ? "⚪ sem hora" : d.toLocaleDateString("pt-BR") + " " + String(d.getHours()).padStart(2, "0") + "h";
      if (!atual || atual.chave !== chave) {
        atual = { chave: chave, itens: [] };
        grupos.push(atual);
      }
      atual.itens.push(item);
    });
    return grupos;
  }

  function linhaItem(item) {
    var emoji = EMOJI_FONTE[item.fonte] || "•";
    var hora = horaLocal(item.quando);
    var detalheJson = item.detalhe && Object.keys(item.detalhe).length
      ? "<details><summary>detalhe</summary><pre>" + escaparHtml(JSON.stringify(item.detalhe, null, 2)) + "</pre></details>"
      : "";
    return (
      '<div class="hist-item" data-fonte="' + escaparHtml(item.fonte) + '">' +
      '<span class="hist-hora">' + hora + "</span>" +
      '<span class="hist-emoji">' + emoji + "</span>" +
      '<span class="hist-titulo">' + escaparHtml(item.titulo || item.tipo || "⚪") + "</span>" +
      detalheJson +
      "</div>"
    );
  }

  function renderTimeline(itens) {
    var alvo = document.getElementById("historico-timeline");
    if (!alvo) return;
    var filtrados = histFiltroFonte ? itens.filter(function (i) { return i.fonte === histFiltroFonte; }) : itens;
    if (!filtrados.length) {
      alvo.innerHTML = "⚪ nada registrado nesta janela de tempo" + (histFiltroFonte ? " para a fonte \"" + histFiltroFonte + "\"" : "");
      return;
    }
    var grupos = agruparPorHora(filtrados);
    alvo.innerHTML = grupos.map(function (g) {
      return (
        '<div class="hist-grupo">' +
        '<div class="hist-grupo-cabecalho">' + escaparHtml(g.chave) + "</div>" +
        g.itens.map(linhaItem).join("") +
        "</div>"
      );
    }).join("");
  }

  function renderResumo(resumo) {
    var alvo = document.getElementById("historico-resumo");
    if (!alvo || !resumo) return;
    alvo.textContent =
      "hoje: " + (resumo.sessoesClaude || 0) + " sessões Claude · " +
      (resumo.aberturasCasca || 0) + " nascimento(s) da casca · " +
      (resumo.aparecas || 0) + " \"apareça\" (" + (resumo.aparecasSuprimidos || 0) + " suprimidos) · " +
      (resumo.duplicatasRecusadas || 0) + " duplicata(s) recusada(s) · " +
      (resumo.reiniciosServidor || 0) + " reinício(s)";
  }

  function renderFiltros(itens) {
    var alvo = document.getElementById("historico-filtros");
    if (!alvo) return;
    var fontesPresentes = {};
    itens.forEach(function (i) { fontesPresentes[i.fonte] = (fontesPresentes[i.fonte] || 0) + 1; });
    var chips = ['<button type="button" class="hist-chip' + (histFiltroFonte === null ? " ativo" : "") + '" data-fonte="">todas (' + itens.length + ")</button>"];
    Object.keys(ROTULO_FONTE).forEach(function (f) {
      var n = fontesPresentes[f] || 0;
      chips.push(
        '<button type="button" class="hist-chip' + (histFiltroFonte === f ? " ativo" : "") + '" data-fonte="' + f + '">' +
        (EMOJI_FONTE[f] || "•") + " " + ROTULO_FONTE[f] + " (" + n + ")</button>"
      );
    });
    alvo.innerHTML = chips.join("");
    Array.prototype.forEach.call(alvo.querySelectorAll(".hist-chip"), function (btn) {
      btn.addEventListener("click", function () {
        histFiltroFonte = btn.getAttribute("data-fonte") || null;
        if (histUltimaResposta) {
          renderFiltros(histUltimaResposta.itens);
          renderTimeline(histUltimaResposta.itens);
        }
      });
    });
  }

  function renderPulso(itens) {
    var alvo = document.getElementById("historico-pulso");
    if (!alvo) return;
    var itemPulso = itens.filter(function (i) { return i.fonte === "pulso"; })[0];
    if (!itemPulso || !itemPulso.detalhe) {
      alvo.innerHTML = "";
      return;
    }
    var linhas = Object.keys(itemPulso.detalhe).map(function (k) {
      return "<li><strong>" + escaparHtml(k) + "</strong>: " + escaparHtml(itemPulso.detalhe[k]) + "</li>";
    });
    alvo.innerHTML =
      '<div class="hist-pulso-titulo">🫀 Pulso micélio — última medição ' + horaLocal(itemPulso.quando) + "</div>" +
      "<ul class=\"hist-pulso-lista\">" + linhas.join("") + "</ul>";
  }

  function renderFontes(fontes) {
    var partes = Object.keys(fontes || {}).filter(function (k) { return String(fontes[k]).indexOf("⚪") === 0; });
    if (!partes.length) return "";
    return partes.map(function (k) { return escaparHtml(fontes[k]); }).join(" · ");
  }

  async function carregarHistorico() {
    var alvoResumo = document.getElementById("historico-resumo");
    try {
      var j = await (await fetch("/api/historico?horas=24")).json();
      histUltimaResposta = j;
      renderResumo(j.resumo);
      renderFiltros(j.itens || []);
      renderPulso(j.itens || []);
      renderTimeline(j.itens || []);
      var avisoFontes = renderFontes(j.fontes);
      if (avisoFontes && alvoResumo) alvoResumo.title = avisoFontes;
    } catch (e) {
      if (alvoResumo) alvoResumo.textContent = "🔴 não consegui ler /api/historico: " + String(e);
    }
  }

  function pararPollHistorico() {
    if (histTimer) { clearInterval(histTimer); histTimer = null; }
  }
  window.__pararPollHistorico = pararPollHistorico;

  function iniciarPollHistorico() {
    pararPollHistorico();
    carregarHistorico();
    histTimer = setInterval(carregarHistorico, HIST_POLL_MS);
  }

  var btnHistorico = document.getElementById("btn-historico");
  if (btnHistorico) {
    window.__ABRIDORES = window.__ABRIDORES || {};
    // GAVETA-ABRE-CARREGADA-001: quem carrega é a gaveta — o poll de 30s começa só aqui,
    // nunca no boot da tela (regra da casa: sem gaveta aberta, sem chamada de rede).
    window.__ABRIDORES["historico-overlay"] = iniciarPollHistorico;
    btnHistorico.addEventListener("click", function () { abrirGaveta("historico-overlay"); });
  }
  var historicoFechar = document.getElementById("historico-fechar");
  if (historicoFechar) {
    historicoFechar.addEventListener("click", function () { fecharGaveta("historico-overlay"); });
  }
})();
