/* app-uso.js — USO-TEMPO-REAL-MULTI-TENANT-001 (sub-item de TELEMETRIA-POR-SISTEMA-001,
   pedido do Enio: "medição de uso em tempo real, para ter multi-tenant dentro de uma única
   conta do Claude Code, separando por arquitetos/orquestradores e agentes de IA").

   4ª aba DENTRO da gaveta "avisos-overlay" que já existe (mesma correção Prime de
   app-conversas.js: zero botão/overlay novo no #header). Arquivo NOVO, servido por ÚLTIMO
   por /app.js — só USA (nunca declara) escaparHtml/abrirGaveta/fecharGaveta dos anteriores.
   NÃO toca app-conversas.js: adiciona um listener PRÓPRIO nos botões de #avisos-abas (a
   troca de aba em si já é tratada por app-conversas.js; este listener só cuida de
   mostrar/esconder o painel "Uso" e ligar/desligar o poll de 5s dele).

   Semáforo de 4 cores: ⚪ quando a fonte não respondeu; usdNaoMedidoChamadas > 0 também
   aparece como ⚪ na linha (modelo sem preço — nunca virou zero em silêncio, R13-c). */
(function () {
  var USO_POLL_MS = 5000;
  var usoTimer = null;
  var usoJanela = "agora"; // "agora" (10min, default) | "hoje" | "7d"
  var usoAbaAtiva = false; // painel "Uso" está visível agora?

  function fmtUsd(v) {
    return "$" + Number(v || 0).toFixed(4);
  }
  function fmtTok(v) {
    var n = Number(v || 0);
    return n >= 1000 ? (n / 1000).toFixed(1) + "k" : String(n);
  }

  function renderTotais(resp) {
    var alvo = document.getElementById("uso-totais");
    if (!alvo) return;
    var t = resp.totais || {};
    var partes = [
      "<strong>" + (t.chamadas || 0) + "</strong> chamadas",
      fmtTok(t.in) + " in / " + fmtTok(t.out) + " out",
      fmtUsd(t.usd) + " medido",
    ];
    if (t.usdNaoMedidoChamadas) partes.push("⚪ " + t.usdNaoMedidoChamadas + " sem preço conhecido");
    alvo.innerHTML = partes.join(" · ");
  }

  function linhaTabela(l) {
    return (
      "<tr>" +
      "<td>" + escaparHtml(l.tenant || "⚪") + "</td>" +
      "<td>" + escaparHtml(l.papel || "⚪") + "</td>" +
      "<td>" + escaparHtml(l.agente || "⚪") + "</td>" +
      "<td>" + escaparHtml(l.modelo || "⚪") + "</td>" +
      "<td>" + (l.chamadas || 0) + "</td>" +
      "<td>" + fmtTok(l.in) + "</td>" +
      "<td>" + fmtTok(l.out) + "</td>" +
      "<td>" + (l.usdNaoMedidoChamadas ? "⚪" : fmtUsd(l.usd)) + "</td>" +
      "</tr>"
    );
  }

  function renderTabela(resp) {
    var alvo = document.getElementById("uso-tabela");
    if (!alvo) return;
    var linhas = resp.linhas || [];
    if (!linhas.length) {
      alvo.innerHTML = "⚪ nenhuma chamada medida nesta janela";
      return;
    }
    alvo.innerHTML =
      "<table class=\"uso-grade\"><thead><tr>" +
      "<th>tenant</th><th>papel</th><th>agente</th><th>modelo</th><th>chamadas</th><th>in</th><th>out</th><th>usd</th>" +
      "</tr></thead><tbody>" +
      linhas.map(linhaTabela).join("") +
      "</tbody></table>";
  }

  function renderStatus(resp) {
    var alvo = document.getElementById("uso-status");
    if (!alvo) return;
    var fontesRuins = Object.keys(resp.fontes || {}).filter(function (k) {
      return String(resp.fontes[k] || "").indexOf("⚪") === 0;
    });
    alvo.textContent = fontesRuins.length ? "⚪ " + fontesRuins.join(", ") : "";
  }

  async function carregarUso() {
    try {
      var resp = await (await fetch("/api/uso?janela=" + encodeURIComponent(usoJanela))).json();
      renderTotais(resp);
      renderTabela(resp);
      renderStatus(resp);
    } catch (e) {
      var alvo = document.getElementById("uso-tabela");
      if (alvo) alvo.innerHTML = "🔴 não consegui ler /api/uso: " + escaparHtml(String(e));
    }
  }

  function pararPollUso() {
    if (usoTimer) { clearInterval(usoTimer); usoTimer = null; }
  }
  window.__pararPollUso = pararPollUso;

  function iniciarPollUso() {
    pararPollUso();
    carregarUso();
    usoTimer = setInterval(carregarUso, USO_POLL_MS);
  }

  var abasPrincipais = document.getElementById("avisos-abas");
  var painelUso = document.getElementById("uso-painel");
  if (abasPrincipais && painelUso) {
    Array.prototype.forEach.call(abasPrincipais.querySelectorAll(".conv-aba"), function (btn) {
      // listener PRÓPRIO, adicional ao de app-conversas.js — nunca substitui aquele.
      btn.addEventListener("click", function () {
        usoAbaAtiva = btn.getAttribute("data-aba") === "uso";
        painelUso.hidden = !usoAbaAtiva;
        if (usoAbaAtiva) iniciarPollUso();
        else pararPollUso();
      });
    });
  }

  var botoesJanela = document.getElementById("uso-janelas");
  if (botoesJanela) {
    Array.prototype.forEach.call(botoesJanela.querySelectorAll(".conv-aba"), function (btn) {
      btn.addEventListener("click", function () {
        usoJanela = btn.getAttribute("data-janela") || "agora";
        Array.prototype.forEach.call(botoesJanela.querySelectorAll(".conv-aba"), function (b) {
          b.classList.toggle("ativa", b === btn);
        });
        if (usoAbaAtiva) carregarUso();
      });
    });
  }
})();
