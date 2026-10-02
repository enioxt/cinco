/* app-conversas.js — NOTIFICACOES-HISTORICO-NA-TELA-001 (corte Enio 14/09, verbatim:
   "apareceram notificações de conversas — quem enviou, quando? onde está o histórico? Tudo
   isso tem que aparecer na tela, dentro do EGOS APP, mostrando todas as sessões ativas").
   Arquivo NOVO, servido por ÚLTIMO por /app.js — só USA (nunca declara) abrirGaveta/
   fecharGaveta/escaparHtml/horaLocal dos anteriores (mesmo contrato de app-historico.js).

   CORREÇÃO PRIME (14/09): NÃO ganha botão nem gaveta-overlay própria — o header já tinha
   overflow horizontal pré-existente em 464×322/960×600/1025×700 (medido em `main` limpa:
   84/81/122px, ANTES de qualquer coisa desta task) e um botão a mais piorava (g87/g88/g91).
   "Conversas"/"Sessões" viram 2 abas NOVAS dentro da gaveta "avisos-overlay" que já existe
   (aberta por #btn-notificacoes) — zero elemento novo no #header, zero overlay novo. Encadeia
   em window.__ABRIDORES["avisos-overlay"] (GAVETA-ABRE-CARREGADA-001: mesma técnica de
   app-layout.js "a gaveta já tem abridor registrado: encadeia, não substitui").

   Duas abas: Conversas (filtro real/teste, real por padrão) e Sessões. Semáforo de 4 cores
   (=R-SEMAFORO-QUATRO-001): ⚪ quando a FONTE não pôde ser lida — nunca lista vazia calada. */
(function () {
  var CONV_POLL_MS = 30000;
  var convTimer = null;
  var convAbaAtiva = "avisos"; // "avisos" (default, conteúdo de sempre) | "conversas" | "sessoes"
  var convMostrarTeste = false; // real por padrão
  var convUltimaResposta = null;
  var sessUltimaResposta = null;

  function semaforo(status) {
    return String(status || "").indexOf("⚪") === 0 ? "⚪" : "🟢";
  }

  function linhaConversa(item) {
    return (
      '<div class="conv-item" data-teste="' + (item.eh_teste ? "1" : "0") + '">' +
      '<div class="conv-item-linha1">' +
      '<span class="conv-hora">' + horaLocal(item.quando) + "</span>" +
      '<span class="conv-quem">' + escaparHtml(item.quem || "⚪") + "</span>" +
      '<span class="conv-origem">' + escaparHtml(item.origem || "⚪") + "</span>" +
      (item.eh_teste ? '<span class="conv-origem">🧪 teste</span>' : "") +
      "</div>" +
      '<div class="conv-texto">' + escaparHtml(item.texto_curto || "⚪") + "</div>" +
      '<div class="conv-onde">' + escaparHtml(item.onde_responder || "⚪") + "</div>" +
      "</div>"
    );
  }

  function renderConversas() {
    var alvo = document.getElementById("conversas-timeline");
    if (!alvo || !convUltimaResposta) return;
    var itens = (convUltimaResposta.itens || []).filter(function (i) {
      return convMostrarTeste || !i.eh_teste;
    });
    if (!itens.length) {
      alvo.innerHTML = "⚪ nada nas últimas " + (convUltimaResposta.horas || 48) + "h" + (convMostrarTeste ? "" : " (fora os itens de teste)");
      return;
    }
    alvo.innerHTML = itens.map(linhaConversa).join("");
  }

  function linhaSessao(item) {
    return (
      '<div class="sess-item">' +
      '<div class="sess-item-linha1">' +
      '<span class="conv-hora">' + (item.idadeSeg != null ? Math.round(item.idadeSeg / 60) + "min" : "⚪") + "</span>" +
      '<span class="conv-quem">' + escaparHtml(item.motor || "⚪") + " · pid " + escaparHtml(String(item.pid)) + "</span>" +
      (item.ehBraco ? '<span class="sess-braco">braço</span>' : "") +
      "</div>" +
      '<div class="sess-cwd">' + escaparHtml(item.cwd || "⚪") + "</div>" +
      '<div class="sess-papel">papel: ' + escaparHtml(item.papel || "⚪") + " · assunto: " + escaparHtml(item.assunto || "⚪") + "</div>" +
      "</div>"
    );
  }

  function renderSessoes() {
    var alvo = document.getElementById("sessoes-lista");
    if (!alvo || !sessUltimaResposta) return;
    var itens = sessUltimaResposta.itens || [];
    var partes = itens.map(linhaSessao);
    if (sessUltimaResposta.pontesTmux && sessUltimaResposta.pontesTmux.length) {
      partes.push(
        '<div class="sess-item">🔌 ponte tmux viva: ' + escaparHtml(sessUltimaResposta.pontesTmux.join(", ")) + "</div>",
      );
    }
    alvo.innerHTML = partes.length ? partes.join("") : "⚪ nenhuma sessão claude/codex viva agora";
  }

  function renderAbas() {
    var alvoAbas = document.getElementById("avisos-abas");
    var painelAvisos = document.getElementById("avisos-painel");
    var painelConversas = document.getElementById("conversas-painel");
    var painelSessoes = document.getElementById("sessoes-painel");
    if (alvoAbas) {
      Array.prototype.forEach.call(alvoAbas.querySelectorAll(".conv-aba"), function (btn) {
        var ativa = btn.getAttribute("data-aba") === convAbaAtiva;
        btn.classList.toggle("ativa", ativa);
      });
    }
    if (painelAvisos) painelAvisos.hidden = convAbaAtiva !== "avisos";
    if (painelConversas) painelConversas.hidden = convAbaAtiva !== "conversas";
    if (painelSessoes) painelSessoes.hidden = convAbaAtiva !== "sessoes";
  }

  async function carregarConversas() {
    try {
      var j = await (await fetch("/api/conversas?horas=48")).json();
      convUltimaResposta = j;
      renderConversas();
      var alvoStatus = document.getElementById("conversas-status");
      if (alvoStatus) {
        var fontesRuins = Object.keys(j.fontes || {}).filter(function (k) { return semaforo(j.fontes[k]) === "⚪"; });
        alvoStatus.textContent = fontesRuins.length ? "⚪ fonte(s) sem leitura: " + fontesRuins.join(", ") : "";
      }
    } catch (e) {
      var alvo = document.getElementById("conversas-timeline");
      if (alvo) alvo.innerHTML = "🔴 não consegui ler /api/conversas: " + escaparHtml(String(e));
    }
  }

  async function carregarSessoes() {
    try {
      var j = await (await fetch("/api/sessoes-vivas")).json();
      sessUltimaResposta = j;
      renderSessoes();
    } catch (e) {
      var alvo = document.getElementById("sessoes-lista");
      if (alvo) alvo.innerHTML = "🔴 não consegui ler /api/sessoes: " + escaparHtml(String(e));
    }
  }

  function carregarTudo() {
    carregarConversas();
    carregarSessoes();
  }

  function pararPollConversas() {
    if (convTimer) { clearInterval(convTimer); convTimer = null; }
  }
  window.__pararPollConversas = pararPollConversas;

  function iniciarPollConversas() {
    pararPollConversas();
    carregarTudo();
    convTimer = setInterval(carregarTudo, CONV_POLL_MS);
  }

  var abas = document.getElementById("avisos-abas");
  if (abas) {
    Array.prototype.forEach.call(abas.querySelectorAll(".conv-aba"), function (btn) {
      btn.addEventListener("click", function () {
        convAbaAtiva = btn.getAttribute("data-aba") || "avisos";
        renderAbas();
      });
    });
    renderAbas();
  }

  var chkTeste = document.getElementById("conversas-mostrar-teste");
  if (chkTeste) {
    chkTeste.addEventListener("change", function () {
      convMostrarTeste = !!chkTeste.checked;
      renderConversas();
    });
  }

  // A gaveta "avisos-overlay" já tem abridor registrado (GAVETA-ABRE-CARREGADA-001, mesma
  // técnica de app-layout.js) — encadeia, não substitui: abrir o sino continua renderizando
  // os avisos de sempre, e AGORA TAMBÉM inicia o poll de Conversas/Sessões (que só roda
  // enquanto a gaveta está aberta, parado no fechar abaixo). Fechar/abrir já é botão/gaveta
  // existentes (#avisos-fechar, GAVETAS["avisos-overlay"] em app-gavetas.js) — nada novo ali.
  if (abas) {
    window.__ABRIDORES = window.__ABRIDORES || {};
    var abridorAnterior = window.__ABRIDORES["avisos-overlay"];
    window.__ABRIDORES["avisos-overlay"] = function () {
      if (typeof abridorAnterior === "function") abridorAnterior();
      iniciarPollConversas();
    };
  }
})();
