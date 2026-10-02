/* app-toast.js — EGOS-APP-TOAST-001 (corte Enio 15/09 15:05, verbatim: "as notificações do
   EGOS APP devem ser mais veementes para mim, no canto inferior esquerdo, abrir ali; vamos
   configurando como cada mensagem abre — se veio do WhatsApp, uma prévia bonita; se veio de
   outro lugar, de outra forma; a base você já deve estudar e investigar, para ter o tamanho
   certo, customizar o tamanho e o app se manter; usar Apple, Microsoft, os apps indies mais
   bonitos, Linux, para ter UI/UX sempre como os melhores").

   Pesquisa: docs/design/notificacoes-egos-app-pesquisa-2026-09-15.md.
   Lógica pura testada: app-toast-logica.ts (bun test) — este arquivo MIRRORA as mesmas
   funções (comentário "mirror de app-toast-logica.ts:<nome>" em cada uma) porque o
   navegador não importa TS (mesmo padrão de app-notificacoes.js:decidirPerguntar/perfil.ts).

   Arquivo NOVO, servido por ÚLTIMO por /app.js — só USA (nunca declara) abrirGaveta/
   fecharGaveta/escaparHtml/horaLocal dos anteriores. NÃO substitui o .notif-toast de
   app-notificacoes.js (TOAST-VISIVEL-001): aquele é 1 toast center-bottom de CONFIRMAÇÃO
   de posição ("abri aqui, gostou?"); este é uma PILHA multi-origem de PRÉVIA (WhatsApp/PCA/
   monitor/default) no canto inferior-esquerdo — dois componentes, dois propósitos.

   Fonte do dado (DUAS, ambas já existentes — "não crie servidor novo" é respeitado):
     - GET /api/conversas: cobre origem "whatsapp" (prévia de conversa) — ItemConversa NÃO
       tem `id` (ver coletores-conversas.ts), dedupe por chave sintética (mirror de
       chaveConversa). DESVIO DECLARADO: o pedido dizia "fonte do dado: /api/conversas" para
       TODOS os renderizadores, mas os itens de PCA/heartbeat não aparecem nesse formato
       (ver coletores-conversas.ts:139-177 — só formatos "notify:"/"fila:"/WhatsApp) — eles
       vivem em GET /api/notificacoes (que app-notificacoes.js já consome, com item.fonte
       "pca"/"heartbeat"/"fila" e item.id de verdade). Este arquivo lê as DUAS fontes já
       existentes; nenhuma rota nova nasceu para isso.
     - GET /api/notificacoes: cobre "pca" (decisão pendente, letras=botões) e "heartbeat"
       (renderizador "monitor": semáforo+título+comando).
   window.TOASTS_CONFIG vem embutido no preludio de /app.js (mesma técnica de window.VOCAB,
   ver orquestra-viva.ts) a partir de config/toasts.json — o Enio edita esse arquivo sem
   tocar código, pedido explícito ("vamos configurando"). */

(function () {
  var TOAST_POLL_MS = 10000;
  var TOAST_MAX_VISIVEIS = 4;
  var TOAST_STORAGE_TAMANHO = "egos_toast_tamanho"; // localStorage: P|M|G, per-viewer, nunca do servidor

  // ── mirror de app-toast-logica.ts (fonte única testada) ────────────────────────────────
  function resolverRegra(origemOuFonte, registro) {
    // mirror de app-toast-logica.ts:resolverRegra
    var chave = String(origemOuFonte || "");
    var melhor = null;
    var origens = (registro && registro.origens) || {};
    for (var k in origens) {
      if (!Object.prototype.hasOwnProperty.call(origens, k) || k === "*") continue;
      if (chave === k || chave.indexOf(k) === 0) {
        if (!melhor || k.length > melhor.k.length) melhor = { k: k, v: origens[k] };
      }
    }
    if (melhor) return melhor.v;
    return origens["*"] || { renderizador: "default", prioridade: "normal", duracaoMs: 7000 };
  }
  function ficaAteFechar(duracaoMs) { return !(duracaoMs > 0); } // mirror de ficaAteFechar
  var LARGURA_POR_TAMANHO = { P: 280, M: 360, G: 440 };
  var ALTURA_MAX_POR_TAMANHO = { P: 120, M: 160, G: 220 };
  function tamanhoValido(t) { return (t === "P" || t === "M" || t === "G") ? t : "M"; } // mirror
  function larguraPx(t) { return LARGURA_POR_TAMANHO[tamanhoValido(t)]; } // mirror
  function alturaMaxPx(t) { return ALTURA_MAX_POR_TAMANHO[tamanhoValido(t)]; } // mirror
  function clampNaViewport(lw, ah, vw, vh, margem) { // mirror de clampNaViewport
    margem = margem == null ? 16 : margem;
    var largura = Math.max(200, Math.min(lw, Math.max(200, vw - margem * 2)));
    var alturaMax = Math.max(60, Math.min(ah, Math.max(60, vh - margem * 2)));
    return { largura: largura, alturaMax: alturaMax };
  }
  function colapsarPilha(itens, maxVisiveis) { // mirror de colapsarPilha
    var n = Math.max(1, maxVisiveis);
    if (itens.length <= n) return { visiveis: itens, colapsados: 0 };
    return { visiveis: itens.slice(0, n), colapsados: itens.length - n };
  }
  function chaveConversa(item) { // mirror de chaveConversa
    return [item.quando || "", item.origem || "", item.quem || "", item.texto_curto || ""].join("|");
  }
  function pareceWhatsapp(origem, ondeResponder) { // mirror de pareceWhatsapp
    var alvo = (String(origem || "") + " " + String(ondeResponder || "")).toLowerCase();
    return /whatsapp|wpp/.test(alvo);
  }
  var CORES_PADRAO = { enio: "verde", cinco: "azul", jessica: "roxo", "jéssica": "roxo" };
  function corPorRemetente(nome, mapa) { // mirror de corPorRemetente
    var chave = String(nome || "").trim().toLowerCase().split(/\s+/)[0] || "";
    var registro = mapa || CORES_PADRAO;
    return registro[chave] || "cinza";
  }
  function inicialAvatar(nome) { // mirror de inicialAvatar
    var limpo = String(nome || "").trim();
    return limpo ? limpo[0].toUpperCase() : "?";
  }

  // ── estado ───────────────────────────────────────────────────────────────────────────
  var pilha = []; // [{chave, origem, item, regra, timerId, criadoEm}]
  var vistosConversa = {};
  var vistosNotif = {};
  var toastPrimeiraLeituraConv = true;
  var toastPrimeiraLeituraNotif = true;

  function registroToasts() {
    return (window.TOASTS_CONFIG && window.TOASTS_CONFIG.origens) ? window.TOASTS_CONFIG : { origens: { "*": { renderizador: "default", prioridade: "normal", duracaoMs: 7000 } } };
  }
  function mapaCores() {
    return (window.TOASTS_CONFIG && window.TOASTS_CONFIG.cores_por_remetente) || CORES_PADRAO;
  }

  function tamanhoAtual() {
    try {
      return tamanhoValido(localStorage.getItem(TOAST_STORAGE_TAMANHO) || "M");
    } catch (e) {
      return "M";
    }
  }
  function aplicarTamanho(tam) {
    tam = tamanhoValido(tam);
    var vw = window.innerWidth || 1024;
    var vh = window.innerHeight || 768;
    var c = clampNaViewport(larguraPx(tam), alturaMaxPx(tam), vw, vh, 16);
    document.documentElement.style.setProperty("--toast-largura", c.largura + "px");
    document.documentElement.style.setProperty("--toast-altura-max", c.alturaMax + "px");
    try { localStorage.setItem(TOAST_STORAGE_TAMANHO, tam); } catch (e) { /* localStorage indisponível: segue sem persistir */ }
    var pilhaEl = document.getElementById("toast-pilha");
    if (pilhaEl) {
      pilhaEl.querySelectorAll(".toast-tamanho-controle button").forEach(function (b) {
        b.setAttribute("aria-pressed", b.dataset.tam === tam ? "true" : "false");
      });
    }
  }
  window.addEventListener("resize", function () { aplicarTamanho(tamanhoAtual()); });

  function garantirEsqueleto() {
    if (document.getElementById("toast-pilha")) return;
    var host = document.createElement("div");
    host.id = "toast-pilha";
    host.className = "toast-pilha";
    host.setAttribute("role", "region");
    host.setAttribute("aria-label", "notificações");
    document.body.appendChild(host);
  }

  // ── renderizadores por origem (window.__TOAST_RENDERERS[origem]) ───────────────────────
  window.__TOAST_RENDERERS = window.__TOAST_RENDERERS || {};

  function baseCartao(idDom, prioridade) {
    var div = document.createElement("div");
    div.className = "toast-cartao";
    div.id = idDom;
    div.setAttribute("data-prioridade", prioridade);
    div.setAttribute("role", "status");
    div.setAttribute("aria-live", prioridade === "alta" ? "assertive" : "polite");
    var fechar = document.createElement("button");
    fechar.type = "button";
    fechar.className = "toast-fechar";
    fechar.setAttribute("aria-label", "fechar notificação");
    fechar.textContent = "×";
    fechar.onclick = function () { removerDaPilha(idDom); };
    div.appendChild(fechar);
    return div;
  }

  window.__TOAST_RENDERERS.whatsapp = function (payload, idDom) {
    var div = baseCartao(idDom, payload.prioridade);
    var cor = corPorRemetente(payload.quem, mapaCores());
    div.insertAdjacentHTML("beforeend",
      '<div class="toast-cabeca">' +
      '<span class="toast-avatar" data-cor="' + cor + '">' + escaparHtml(inicialAvatar(payload.quem)) + "</span>" +
      '<span class="toast-nome">' + escaparHtml(payload.quem || "⚪") + "</span>" +
      '<span class="toast-hora">' + horaLocal(payload.quando) + "</span>" +
      "</div>" +
      '<div class="toast-corpo">' + escaparHtml(payload.texto_curto || "⚪") + "</div>" +
      '<div class="toast-acoes">' +
      '<button type="button" data-acao="abrir-conversa">Abrir conversa</button>' +
      '<button type="button" data-acao="ver-janela">Ver janela do agente</button>' +
      "</div>"
    );
    div.querySelector('[data-acao="abrir-conversa"]').onclick = function () {
      if (typeof abrirGaveta === "function") abrirGaveta("avisos-overlay");
      removerDaPilha(idDom);
    };
    div.querySelector('[data-acao="ver-janela"]').onclick = function () {
      if (typeof abrirGaveta === "function") abrirGaveta("avisos-overlay");
      var abaAgente = document.querySelector('#avisos-abas [data-aba="agente"]');
      if (abaAgente) abaAgente.click();
      removerDaPilha(idDom);
    };
    return div;
  };

  window.__TOAST_RENDERERS.pca = function (payload, idDom) {
    var div = baseCartao(idDom, payload.prioridade);
    var letras = Array.isArray(payload.opcoes) && payload.opcoes.length ? payload.opcoes : ["a"];
    var botoes = letras.map(function (l) {
      return '<button type="button" data-letra="' + escaparHtml(l) + '">' + escaparHtml(String(l).toUpperCase()) + "</button>";
    }).join("");
    div.insertAdjacentHTML("beforeend",
      '<div class="toast-cabeca"><span class="toast-nome">🔵 PCA — decisão pendente</span></div>' +
      '<div class="toast-corpo">' + escaparHtml(payload.titulo || "⚪") + "</div>" +
      '<div class="toast-acoes">' + botoes + "</div>"
    );
    div.querySelectorAll(".toast-acoes button").forEach(function (b) {
      b.onclick = function () {
        // NUNCA decide pelo clique — só ABRE a PCA (pedido explícito da task).
        if (payload.gaveta_destino && typeof abrirGaveta === "function") abrirGaveta(payload.gaveta_destino);
        removerDaPilha(idDom);
      };
    });
    return div;
  };

  window.__TOAST_RENDERERS.monitor = function (payload, idDom) {
    var div = baseCartao(idDom, payload.prioridade);
    var selo = payload.selo || "🔴";
    div.insertAdjacentHTML("beforeend",
      '<div class="toast-cabeca"><span class="toast-nome">' + selo + " " + escaparHtml(payload.titulo || "⚪") + "</span></div>" +
      '<div class="toast-corpo">' + escaparHtml(payload.comando || "sem comando de conserto sugerido") + "</div>" +
      '<div class="toast-acoes"><button type="button" data-acao="abrir">Ver avisos</button></div>'
    );
    div.querySelector('[data-acao="abrir"]').onclick = function () {
      if (typeof abrirGaveta === "function") abrirGaveta(payload.gaveta_destino || "avisos-overlay");
      removerDaPilha(idDom);
    };
    return div;
  };

  window.__TOAST_RENDERERS.default = function (payload, idDom) {
    var div = baseCartao(idDom, payload.prioridade);
    div.insertAdjacentHTML("beforeend",
      '<div class="toast-cabeca"><span class="toast-nome">' + escaparHtml(payload.titulo || "⚪") + "</span>" +
      '<span class="toast-hora">' + horaLocal(payload.quando) + "</span></div>" +
      '<div class="toast-corpo">' + escaparHtml(payload.texto_curto || payload.linha || "⚪") + "</div>"
    );
    return div;
  };

  function removerDaPilha(idDom) {
    for (var i = 0; i < pilha.length; i++) {
      if (pilha[i].idDom === idDom) {
        if (pilha[i].timerId) clearTimeout(pilha[i].timerId);
        pilha.splice(i, 1);
        break;
      }
    }
    renderPilha();
  }

  function renderPilha() {
    garantirEsqueleto();
    var host = document.getElementById("toast-pilha");
    if (!host) return;
    var col = colapsarPilha(pilha, TOAST_MAX_VISIVEIS);
    host.innerHTML = "";
    col.visiveis.forEach(function (entrada) {
      var renderer = window.__TOAST_RENDERERS[entrada.renderizador] || window.__TOAST_RENDERERS.default;
      var el = renderer(entrada.payload, entrada.idDom);
      host.appendChild(el);
    });
    if (col.colapsados > 0) {
      var chip = document.createElement("button");
      chip.type = "button";
      chip.className = "toast-colapso";
      chip.textContent = "+" + col.colapsados;
      chip.setAttribute("aria-label", col.colapsados + " notificação(ões) a mais — abrir avisos");
      chip.onclick = function () { if (typeof abrirGaveta === "function") abrirGaveta("avisos-overlay"); };
      host.appendChild(chip);
    }
  }

  function pausarTimer(entrada) {
    if (entrada.timerId) { clearTimeout(entrada.timerId); entrada.timerId = null; }
  }
  function retomarTimer(entrada) {
    if (ficaAteFechar(entrada.duracaoMs)) return; // alta: nunca agenda remoção automática
    entrada.timerId = setTimeout(function () { removerDaPilha(entrada.idDom); }, entrada.duracaoMs);
  }

  function empilhar(chave, origem, payload) {
    var regra = resolverRegra(origem, registroToasts());
    if (regra.prioridade === "baixa") return; // baixa: só gaveta, nunca toast (pedido explícito)
    payload.prioridade = regra.prioridade;
    var idDom = "toast-" + Math.random().toString(36).slice(2);
    var entrada = { chave: chave, idDom: idDom, renderizador: regra.renderizador, payload: payload, duracaoMs: regra.duracaoMs, timerId: null, criadoEm: Date.now() };
    pilha.push(entrada);
    renderPilha();
    var novoEl = document.getElementById(idDom);
    if (novoEl) {
      novoEl.addEventListener("mouseenter", function () { pausarTimer(entrada); });
      novoEl.addEventListener("mouseleave", function () { retomarTimer(entrada); });
      novoEl.addEventListener("focusin", function () { pausarTimer(entrada); });
      novoEl.addEventListener("focusout", function () { retomarTimer(entrada); });
    }
    retomarTimer(entrada);
  }
  // EGOS-APP-ATUALIZACAO-FLUIDA-001 (15/09): exposto para app-atualizacao.js empilhar um toast
  // "app atualizado"/faixa-motivo sem duplicar a pilha — script servido ANTES na concatenação
  // de /app.js, mas só chama isto dentro do handler de DOMContentLoaded (que roda depois de
  // toda a IIFE deste arquivo já ter executado e definido esta função no window).
  window.__toastEmpilhar = empilhar;

  // Esc fecha o mais recente da pilha (topo visual = fim do array, column-reverse).
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape" || !pilha.length) return;
    removerDaPilha(pilha[pilha.length - 1].idDom);
  });

  // ── polling: GET /api/conversas (whatsapp) ──────────────────────────────────────────────
  async function pollConversas() {
    try {
      var j = await (await fetch("/api/conversas?horas=1")).json();
      var itens = Array.isArray(j.itens) ? j.itens : [];
      var ehPrimeira = toastPrimeiraLeituraConv;
      toastPrimeiraLeituraConv = false;
      itens.forEach(function (item) {
        if (item.eh_teste) return;
        var chave = chaveConversa(item);
        if (vistosConversa[chave]) return;
        vistosConversa[chave] = true;
        if (ehPrimeira) return; // backlog na 1ª leitura não dispara toast (=BACKLOG-NAO-E-EVENTO-001)
        if (!pareceWhatsapp(item.origem, item.onde_responder)) return;
        empilhar(chave, "whatsapp", { quem: item.quem, quando: item.quando, texto_curto: item.texto_curto });
      });
    } catch (e) {
      // ⚪ NAO-MEDIDO: /api/conversas ilegível nesta rodada — próximo poll tenta de novo, sem toast fantasma
    }
  }

  // ── polling: GET /api/notificacoes (pca/heartbeat) ──────────────────────────────────────
  async function pollNotificacoes() {
    try {
      var j = await (await fetch("/api/notificacoes")).json();
      var itens = Array.isArray(j.itens) ? j.itens : [];
      var ehPrimeira = toastPrimeiraLeituraNotif;
      toastPrimeiraLeituraNotif = false;
      itens.forEach(function (item) {
        if (!item || !item.id || vistosNotif[item.id]) return;
        vistosNotif[item.id] = true;
        if (ehPrimeira) return; // backlog na 1ª leitura: só marca visto
        var origem = item.fonte === "pca" ? "pca" : (item.fonte === "heartbeat" ? "heartbeat" : String(item.fonte || ""));
        empilhar("notif-" + item.id, origem, {
          titulo: item.titulo, gaveta_destino: item.gaveta_destino, opcoes: item.opcoes,
          selo: item.selo, comando: item.comando,
        });
      });
    } catch (e) {
      // ⚪ NAO-MEDIDO: /api/notificacoes ilegível nesta rodada
    }
  }

  function montarControleDeTamanho() {
    var alvo = document.getElementById("layout-tamanho-toast"); // slot opcional na gaveta de Layout, se existir
    if (!alvo || alvo.dataset.montado) return;
    alvo.dataset.montado = "1";
    var atual = tamanhoAtual();
    alvo.innerHTML = '<div class="toast-tamanho-controle" role="group" aria-label="tamanho das notificações">' +
      ["P", "M", "G"].map(function (t) {
        return '<button type="button" data-tam="' + t + '" aria-pressed="' + (t === atual ? "true" : "false") + '">' + t + "</button>";
      }).join("") + "</div>";
    alvo.querySelectorAll("button").forEach(function (b) {
      b.onclick = function () { aplicarTamanho(b.dataset.tam); };
    });
  }
  if (window.__ABRIDORES) {
    var abridorAnteriorLayout = window.__ABRIDORES["layout-overlay"];
    window.__ABRIDORES["layout-overlay"] = function () {
      if (typeof abridorAnteriorLayout === "function") abridorAnteriorLayout();
      montarControleDeTamanho();
    };
  }

  garantirEsqueleto();
  aplicarTamanho(tamanhoAtual());
  pollConversas();
  pollNotificacoes();
  setInterval(pollConversas, TOAST_POLL_MS);
  setInterval(pollNotificacoes, TOAST_POLL_MS);
})();
