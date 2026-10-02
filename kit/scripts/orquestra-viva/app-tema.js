// app-tema.js — SELETOR-TEMA-001 / TEMA-TROCAVEL-001 (corte Enio 10/09: "devemos ter a
// escolha dos temas mais fácil no egos app, já permitindo mudar de cores facilmente").
// Só troca VALOR (data-tema no <html>, ver :root[data-tema=...] em app.css) — nunca NOME
// de token (mesmo corte de REDESIGN-DO-ENIO-001). Vem por ÚLTIMO na concatenação: só usa
// (nunca declara) nada dos módulos anteriores — é autocontido.
(function () {
  "use strict";
  var CHAVE = "egos-tema";
  // ordem do ciclo — nomes humanos porque o Enio não lê código (No-Code Master, AGENTS.md).
  var TEMAS = [
    { id: "escuro", rotulo: "escuro", sol: false },
    { id: "meia-noite", rotulo: "meia-noite", sol: false },
    { id: "claro", rotulo: "claro", sol: true },
    { id: "alto-contraste", rotulo: "alto contraste", sol: false },
  ];

  function temaAtual() {
    var attr = document.documentElement.getAttribute("data-tema");
    for (var i = 0; i < TEMAS.length; i++) if (TEMAS[i].id === attr) return TEMAS[i];
    return TEMAS[0]; // sem atributo = escuro (o :root base já é este tema)
  }

  function aplicarTema(id, opts) {
    var salvarEscolha = !opts || opts.salvar !== false;
    if (id === "escuro") {
      document.documentElement.removeAttribute("data-tema"); // base já é escuro — sem atributo redundante
    } else {
      document.documentElement.setAttribute("data-tema", id);
    }
    if (salvarEscolha) {
      try { localStorage.setItem(CHAVE, id); } catch (e) { /* aba privada/bloqueada — não quebra a troca */ }
    }
    atualizarBotao();
  }

  function atualizarBotao() {
    var tema = temaAtual();
    var rotulo = document.getElementById("rotulo-tema");
    var icSol = document.getElementById("ic-tema-sol");
    var icLua = document.getElementById("ic-tema-lua");
    var btn = document.getElementById("btn-tema");
    if (rotulo) rotulo.textContent = tema.rotulo;
    if (icSol && icLua) {
      // BUG MEDIDO (10/09): a IDL property .hidden em elemento <svg> não refletiu o
      // atributo de conteúdo neste navegador (getAttribute("hidden") ficava null com
      // .hidden===true) — o seletor CSS [hidden] nunca casava e o ícone "escondido"
      // continuava ocupando layout (.ic media 48px em vez de 24px, achado pelo golden
      // gJ7: empurrava #busca-cmdk pra fora do viewport). setAttribute/removeAttribute
      // direto no atributo é o caminho robusto — não depende da reflexão do IDL. */
      if (tema.sol) { icSol.removeAttribute("hidden"); icLua.setAttribute("hidden", ""); }
      else { icSol.setAttribute("hidden", ""); icLua.removeAttribute("hidden"); }
    }
    if (btn) {
      btn.setAttribute("aria-pressed", tema.id !== "escuro" ? "true" : "false");
      // BTN-HEADER-ICONE-SO-001 (10/09): o .rotulo visível saiu (empurrava #busca-cmdk pra
      // fora do viewport em 1366×768, ver app.css .btn-header-icone-so) — aria-label carrega
      // o nome do tema pra quem usa leitor de tela; a tooltip da camada 2 já mostra pra quem vê.
      btn.setAttribute("aria-label", "Tema: " + tema.rotulo);
    }
  }

  function proximoTema() {
    var atual = temaAtual();
    var idxAtual = TEMAS.findIndex(function (t) { return t.id === atual.id; });
    var prox = TEMAS[(idxAtual + 1) % TEMAS.length];
    aplicarTema(prox.id);
  }

  document.addEventListener("DOMContentLoaded", function () {
    // o script inline do <head> já aplicou o data-tema ANTES do 1º paint (evita flash) —
    // aqui só sincroniza o texto/ícone do botão com o que já está na tela.
    atualizarBotao();
    var btn = document.getElementById("btn-tema");
    if (btn) btn.addEventListener("click", proximoTema);
  });

  // exposto para a gaveta "Aparência" (EXPLORAR, sidebar) escolher um tema específico
  // direto, sem precisar ciclar — mesma função, dois pontos de entrada.
  window.EGOS_APLICAR_TEMA = aplicarTema;
  window.EGOS_TEMAS = TEMAS;
})();
