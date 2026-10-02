/* app-atualizacao.js — EGOS-APP-ATUALIZACAO-VISIVEL-001 (10/09) + EGOS-APP-ATUALIZACAO-
 * FLUIDA-001 (corte Enio 15/09, verbatim: "está chegando com muita frequência sobre nova
 * versão, pedindo para reiniciar, mas ele deve reiniciar de forma fluida, deve ser todo
 * modular aqui no Linux, não deve ser preciso reiniciar para as alterações entrarem aqui").
 *
 * Poll leve (30s) em /api/atualizacao. A resposta agora traz `tipo`: "ativos" (só
 * app-*.js/app-*.css/html/config — a página busca de novo sozinha, SEM tocar o processo) ou
 * "servidor" (*.ts — precisa do restart do systemd). Os dois casos são AUTOMÁTICOS, sem
 * clique e sem faixa — a faixa só aparece se o restart do processo não voltar em 15s.
 *
 * Lógica pura testada em app-atualizacao-logica.ts (bun test) — este arquivo MIRRORA as
 * mesmas funções (comentário "mirror de app-atualizacao-logica.ts:<nome>" em cada uma)
 * porque o navegador não importa TS (mesmo padrão de app-toast.js/app-notificacoes.js).
 *
 * Vem por ÚLTIMO: só USA (nunca declara) IDs/funções dos anteriores — inclusive
 * window.__toastEmpilhar (app-toast.js) e abrirGaveta/fecharGaveta (app-gavetas.js).
 */
(function () {
  "use strict";

  var INTERVALO_MS = 30000;
  var CHAVE_HASH = "egos_atualizacao_ultimo_hash"; // localStorage: sobrevive ao reload (dedup)
  var CHAVE_ESTADO = "egos_atualizacao_estado_pendente"; // sessionStorage: só até o próximo load
  var CHAVE_TOAST_PENDENTE = "egos_atualizacao_toast_pendente"; // sessionStorage: idem

  // ── mirror de app-atualizacao-logica.ts ─────────────────────────────────────────────────
  function jaAplicado(hashAtual, ultimoAplicado) { // mirror de jaAplicado
    return ultimoAplicado !== null && ultimoAplicado === hashAtual;
  }
  function decidirAcao(resp, ultimoAplicadoHash, temFocoEmCampo) { // mirror de decidirAcao
    if (!resp.desatualizado || resp.tipo === null) return "nada";
    if (jaAplicado(resp.hashVersao, ultimoAplicadoHash)) return "nada";
    if (temFocoEmCampo) return "adiar";
    return resp.tipo === "ativos" ? "aplicar-ativos" : "aplicar-servidor";
  }
  var INTERVALO_ESPERA_MS = 500; // mirror de INTERVALO_ESPERA_MS
  var TENTATIVAS_MAX = 30; // mirror de TENTATIVAS_MAX (Math.ceil(15000/500))
  function esperarServidorVoltar(checar, tentativas, esperar) { // mirror de esperarServidorVoltar
    tentativas = tentativas == null ? TENTATIVAS_MAX : tentativas;
    esperar = esperar || function () { return new Promise(function (res) { setTimeout(res, INTERVALO_ESPERA_MS); }); };
    var i = 0;
    function proxima() {
      if (i >= tentativas) return Promise.resolve(false);
      i++;
      return esperar().then(function () {
        return Promise.resolve(checar()).catch(function () { return false; });
      }).then(function (ok) {
        return ok ? true : proxima();
      });
    }
    return proxima();
  }

  // ── estado da tela (gaveta aberta, aba ativa, rolagem, campo em edição) ────────────────
  function elementoGavetaAberta() {
    return document.querySelector(".gaveta-overlay.aberto");
  }

  function capturarEstado() {
    var estado = { gaveta: null, aba: null, scrollGaveta: 0, scrollCena: 0, campoId: null, campoValor: null, campoSelInicio: null, campoSelFim: null };
    var aberta = elementoGavetaAberta();
    if (aberta) {
      estado.gaveta = aberta.id;
      var corpo = aberta.querySelector(".gaveta");
      if (corpo) estado.scrollGaveta = corpo.scrollTop;
      var abaAtiva = aberta.querySelector("[data-aba].ativa");
      if (abaAtiva) estado.aba = abaAtiva.getAttribute("data-aba");
    }
    var cena = document.getElementById("cena-container");
    if (cena) estado.scrollCena = cena.scrollTop;
    var foco = document.activeElement;
    if (foco && (foco.tagName === "INPUT" || foco.tagName === "TEXTAREA") && foco.id) {
      estado.campoId = foco.id;
      estado.campoValor = foco.value;
      if (typeof foco.selectionStart === "number") {
        estado.campoSelInicio = foco.selectionStart;
        estado.campoSelFim = foco.selectionEnd;
      }
    }
    return estado;
  }

  function restaurarEstado(estado) {
    if (!estado) return;
    if (estado.gaveta && document.getElementById(estado.gaveta) && typeof abrirGaveta === "function") {
      abrirGaveta(estado.gaveta);
      if (estado.aba) {
        var btnAba = document.querySelector('#' + estado.gaveta + ' [data-aba="' + estado.aba + '"]');
        if (btnAba) btnAba.click();
      }
      var corpo = document.querySelector("#" + estado.gaveta + " .gaveta");
      if (corpo) corpo.scrollTop = estado.scrollGaveta || 0;
    }
    var cena = document.getElementById("cena-container");
    if (cena) cena.scrollTop = estado.scrollCena || 0;
    if (estado.campoId) {
      var campo = document.getElementById(estado.campoId);
      if (campo) {
        campo.value = estado.campoValor || "";
        campo.focus();
        if (estado.campoSelInicio != null && typeof campo.setSelectionRange === "function") {
          try { campo.setSelectionRange(estado.campoSelInicio, estado.campoSelFim); } catch (e) { /* input sem suporte a seleção (ex: type=number) */ }
        }
      }
    }
  }

  function temFocoEmCampoEditavel() {
    var foco = document.activeElement;
    return !!(foco && (foco.tagName === "INPUT" || foco.tagName === "TEXTAREA"));
  }

  // ── toast "app atualizado" (ADOTA a pilha existente — EGOS-APP-TOAST-001) ─────────────
  function avisarAtualizado(motivo) {
    if (typeof window.__toastEmpilhar === "function") {
      window.__toastEmpilhar("atualizacao-" + Date.now(), "atualizacao", {
        titulo: "app atualizado",
        texto_curto: motivo || "os arquivos foram recarregados",
        quando: new Date().toISOString(),
      });
    }
  }

  function mostrarFaixaManual(motivo) {
    var faixa = document.getElementById("atualizacao-faixa");
    var motivoEl = document.getElementById("atualizacao-motivo");
    if (motivoEl) motivoEl.textContent = motivo ? "(" + motivo + ")" : "";
    if (faixa) faixa.hidden = false;
  }

  // ── aplicação AUTOMÁTICA, sem clique, sem faixa (pedido explícito do corte 15/09) ─────
  function aplicarAtivos(resp) {
    try { sessionStorage.setItem(CHAVE_ESTADO, JSON.stringify(capturarEstado())); } catch (e) { /* sessionStorage indisponível — recarrega sem preservar estado */ }
    try { sessionStorage.setItem(CHAVE_TOAST_PENDENTE, "os arquivos foram recarregados"); } catch (e) { /* idem */ }
    try { localStorage.setItem(CHAVE_HASH, resp.hashVersao); } catch (e) { /* dedup fica sem memória entre sessões, mas não trava nada */ }
    location.reload();
  }

  function checarServidorVivo() {
    return fetch("/api/atualizacao", { cache: "no-store" }).then(function (r) { return r.ok; });
  }

  function aplicarServidor(resp) {
    try { sessionStorage.setItem(CHAVE_ESTADO, JSON.stringify(capturarEstado())); } catch (e) { /* ver aplicarAtivos */ }
    var pedido = fetch("/api/atualizacao/reiniciar", { method: "POST" }).catch(function () { /* a própria resposta pode não chegar — o processo já está morrendo */ });
    return pedido.then(function () {
      return esperarServidorVoltar(checarServidorVivo, TENTATIVAS_MAX, undefined);
    }).then(function (voltou) {
      if (voltou) {
        try { sessionStorage.setItem(CHAVE_TOAST_PENDENTE, "o processo reiniciou e voltou"); } catch (e) { /* ver aplicarAtivos */ }
        try { localStorage.setItem(CHAVE_HASH, resp.hashVersao); } catch (e) { /* ver aplicarAtivos */ }
        location.reload();
      } else {
        mostrarFaixaManual("pedimos o restart e o processo não respondeu em 15s — clique para tentar de novo");
      }
    });
  }

  // ── loop de checagem ────────────────────────────────────────────────────────────────────
  var poll = null;
  var emAndamento = false;

  function ultimoAplicadoHash() {
    try { return localStorage.getItem(CHAVE_HASH); } catch (e) { return null; }
  }

  async function checar() {
    if (emAndamento) return; // não empilha 2 aplicações se o poll disparar de novo no meio de um restart
    try {
      var r = await fetch("/api/atualizacao");
      var resp = await r.json();
      var acao = decidirAcao(resp, ultimoAplicadoHash(), temFocoEmCampoEditavel());
      if (acao === "nada" || acao === "adiar") return; // adiar: reavaliado no próximo poll (30s) ou no blur
      emAndamento = true;
      if (acao === "aplicar-ativos") {
        aplicarAtivos(resp);
      } else if (acao === "aplicar-servidor") {
        await aplicarServidor(resp);
      }
    } catch (e) {
      // sem rede/servidor caído: não é "desatualizado", é outra coisa — segue como está.
    } finally {
      emAndamento = false;
    }
  }

  // Nunca durante digitação: ao perder o foco, reavalia na hora (não espera os 30s do poll).
  document.addEventListener("focusout", function (e) {
    var t = e.target;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) {
      setTimeout(checar, 0); // setTimeout: espera o novo activeElement assentar antes de checar foco
    }
  }, true);

  function restaurarAposReload() {
    var motivoToast = null;
    try { motivoToast = sessionStorage.getItem(CHAVE_TOAST_PENDENTE); } catch (e) { /* sem sessionStorage */ }
    if (motivoToast) {
      avisarAtualizado(motivoToast);
      try { sessionStorage.removeItem(CHAVE_TOAST_PENDENTE); } catch (e) { /* ver acima */ }
    }
    var estadoTexto = null;
    try { estadoTexto = sessionStorage.getItem(CHAVE_ESTADO); } catch (e) { /* sem sessionStorage */ }
    if (estadoTexto) {
      try { restaurarEstado(JSON.parse(estadoTexto)); } catch (e) { /* estado corrompido — segue sem restaurar */ }
      try { sessionStorage.removeItem(CHAVE_ESTADO); } catch (e) { /* ver acima */ }
    }
  }

  function inicializarAtualizacao() {
    var btn = document.getElementById("btn-atualizacao-reiniciar");
    if (btn) {
      // botão manual só aparece hoje quando o restart automático NÃO voltou em 15s — o
      // clique tenta o mesmo caminho automático de novo.
      btn.addEventListener("click", async function () {
        btn.disabled = true;
        btn.textContent = "reiniciando…";
        try {
          var r = await fetch("/api/atualizacao");
          var resp = await r.json();
          await aplicarServidor(resp.tipo ? resp : { hashVersao: resp.hashVersao, tipo: "servidor", desatualizado: true });
        } finally {
          btn.disabled = false;
          btn.textContent = "reiniciar agora";
        }
      });
    }
    restaurarAposReload();
    checar();
    poll = setInterval(checar, INTERVALO_MS);
  }

  document.addEventListener("DOMContentLoaded", inicializarAtualizacao);
})();
