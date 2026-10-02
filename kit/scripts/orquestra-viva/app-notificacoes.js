/* app-notificacoes.js — SISTEMA-NERVOSO-DO-APP-001 (SN-1 fonte única + ícone / SN-2 abrir e
   perguntar). Arquivo NOVO, servido por ÚLTIMO (depois de app-mcp.js) por /app.js — só USA
   (nunca declara) abrirGaveta/fecharGaveta/escaparHtml/estadoAtual dos anteriores (mesmo
   contrato dos módulos que vieram antes, ver comentário de topo de app-mcp.js/app-conexoes.js).

   SN-1: poll de 5s em GET /api/notificacoes, badge no botão do cabeçalho com o total.
   SN-2: item novo de prioridade "alta" abre a gaveta certa sozinho e pergunta "ficou bom?" —
   a resposta grava em POST /api/perfil (notificacoes[tipo]) e, depois de 3 respostas IGUAIS
   SEGUIDAS, o app para de perguntar e só aplica (decidirPerguntar, mesma regra que
   scripts/lib/perfil.ts — mirror aqui porque o navegador não importa TS, mesmo padrão de
   layoutParaModo espelhado em app-layout.js). */

(function () {
  var NOTIF_POLL_MS = 5000;
  var notifVistos = {};
  var notifTotalAnterior = 0;
  // TOAST-VISIVEL-001 (corte Enio 08/09): guarda o destino da ÚLTIMA notificação processada
  // (não só a de prioridade alta) — é o que o sino do cabeçalho reabre a qualquer momento,
  // mesmo depois do toast já ter sumido. Rótulo em português de gente por gaveta (a rota
  // devolve o id técnico "integracoes-overlay"; ninguém lê isso na tela).
  var notifUltimoDestino = null;
  var ROTULO_GAVETA = {
    "time-overlay": "time em campo",
    "integracoes-overlay": "integrações",
    "conversa-overlay": "conversa",
    "documentos-overlay": "documentos",
    "layout-overlay": "layout",
  };
  function rotuloDaGaveta(id) {
    return ROTULO_GAVETA[id] || id || "um módulo";
  }
  // BACKLOG-NAO-E-EVENTO-001 (achado no g87 do golden suite: pendência que já existia ANTES
  // do app abrir não é "coisa acontecendo agora" — abrir a gaveta/perguntar sozinho na 1ª
  // leitura sequestraria a tela toda vez que houver 1 heartbeat vermelho antigo, o que é o
  // caso comum, não o raro). A 1ª leitura só SEMEIA notifVistos (e atualiza o badge) — zero
  // gaveta, zero toast; só a 2ª leitura em diante trata id-novo como evento de verdade.
  var notifPrimeiraLeitura = true;

  // mirror de scripts/lib/perfil.ts:decidirPerguntar — mesma régua, "3 iguais SEGUIDAS".
  function decidirPerguntar(historico) {
    if (!Array.isArray(historico) || historico.length < 3) return true;
    var ultimasTres = historico.slice(-3);
    return !ultimasTres.every(function (v) { return v === ultimasTres[0]; });
  }

  function preferenciaDoTipo(tipo) {
    try {
      return (window.__estadoAtualNotif && window.__estadoAtualNotif.perfilAtivo &&
        window.__estadoAtualNotif.perfilAtivo.notificacoes &&
        window.__estadoAtualNotif.perfilAtivo.notificacoes[tipo]) || null;
    } catch (e) {
      return null;
    }
  }

  function renderBadge(total, fontes) {
    var badge = document.getElementById("notif-badge");
    var btn = document.getElementById("btn-notificacoes");
    if (!badge || !btn) return;
    if (!total) {
      badge.hidden = true;
      badge.textContent = "0";
    } else {
      badge.hidden = false;
      badge.textContent = String(total > 99 ? "99+" : total);
    }
    var qtdFontesOk = fontes ? Object.keys(fontes).filter(function (k) { return fontes[k] === "ok"; }).length : 0;
    var qtdFontesTotal = fontes ? Object.keys(fontes).length : 0;
    btn.setAttribute(
      "data-tt-abre",
      total
        ? total + " notificação(ões) pendente(s) · clique abre a mais nova · " + qtdFontesOk + "/" + qtdFontesTotal + " fontes lidas"
        : "sem notificações pendentes · " + qtdFontesOk + "/" + qtdFontesTotal + " fontes lidas"
    );
  }

  function itemMaisRecente(itens) {
    if (!itens.length) return null;
    var copia = itens.slice().sort(function (a, b) { return (b.quando || "").localeCompare(a.quando || ""); });
    return copia[0];
  }

  function mostrarToast(texto, gavetaDestino, aoConfirmar, aoMudar) {
    var toast = document.getElementById("notif-toast");
    var textoEl = document.getElementById("notif-toast-texto");
    var destinoEl = document.getElementById("notif-toast-destino");
    var btnReabrir = document.getElementById("notif-toast-reabrir");
    var btnGostei = document.getElementById("notif-toast-gostei");
    var btnMudar = document.getElementById("notif-toast-mudar");
    if (!toast || !textoEl || !btnGostei || !btnMudar) return;
    textoEl.textContent = texto;
    if (destinoEl) destinoEl.textContent = gavetaDestino ? "→ " + rotuloDaGaveta(gavetaDestino) : "";
    toast.hidden = false;
    function limpar() {
      toast.hidden = true;
      if (btnReabrir) btnReabrir.onclick = null;
      btnGostei.onclick = null;
      btnMudar.onclick = null;
    }
    // "ver de novo" NÃO fecha o toast nem conta como resposta — é consulta, não decisão;
    // a pessoa pode reabrir quantas vezes quiser antes de dizer "ficou bom"/"mudar".
    if (btnReabrir) {
      btnReabrir.onclick = function () {
        if (gavetaDestino && typeof abrirGaveta === "function") abrirGaveta(gavetaDestino);
      };
    }
    btnGostei.onclick = function () { limpar(); if (aoConfirmar) aoConfirmar(); };
    btnMudar.onclick = function () { limpar(); if (aoMudar) aoMudar(); };
  }

  function gravarResposta(tipo, modo, resposta) {
    var pref = preferenciaDoTipo(tipo);
    var respostas = (pref && Array.isArray(pref.respostas)) ? pref.respostas.slice() : [];
    respostas.push(resposta);
    if (respostas.length > 20) respostas = respostas.slice(-20); // teto: histórico não cresce sem fim
    var corpo = {};
    corpo.notificacoes = {};
    corpo.notificacoes[tipo] = { modo: modo, auto_abrir: true, respostas: respostas };
    fetch("/api/perfil", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(corpo),
    }).catch(function () { /* silencio-ok: preferência não gravada nesta rodada, próxima tenta de novo */ });
  }

  // window.egosPerguntarPosicao(payload) — chamado pela CASCA nativa (ponte app→webview,
  // egos-app-notificacoes.py) quando ela mesma detecta um item de prioridade alta e já
  // trouxe a janela para frente (_mostrar()); também chamado localmente pelo próprio poll
  // deste arquivo quando a janela já está visível — as duas chamadas convergem na mesma
  // função, então "ficou bom / mudar" tem UM único caminho de resposta.
  window.egosPerguntarPosicao = function (payload) {
    var tipo = (payload && payload.tipo) || "desconhecido";
    var modoAtual = (payload && payload.modo_atual) || window.EGOS_MODO || "?";
    var pref = preferenciaDoTipo(tipo);
    var historico = (pref && pref.respostas) || [];
    if (!decidirPerguntar(historico)) {
      return; // 3 respostas iguais seguidas: aplica direto, não pergunta mais (R-PENDENCIA-1-LINHA-001)
    }
    var titulo = (payload && payload.titulo) || tipo;
    var gavetaDestino = (payload && payload.gaveta_destino) || notifUltimoDestino;
    mostrarToast(
      "Abri aqui por causa de " + titulo + ". Gostou de onde abriu?",
      gavetaDestino,
      function () { gravarResposta(tipo, modoAtual, "gostei"); },
      function () {
        gravarResposta(tipo, modoAtual, "mudei");
        if (typeof abrirGaveta === "function") abrirGaveta("layout-overlay");
      }
    );
  };

  function processarNovos(itens) {
    var ehPrimeira = notifPrimeiraLeitura;
    notifPrimeiraLeitura = false;
    var novosAlta = [];
    for (var i = 0; i < itens.length; i++) {
      var item = itens[i];
      if (!item || !item.id || notifVistos[item.id]) continue;
      notifVistos[item.id] = true;
      if (ehPrimeira) continue; // backlog na 1ª leitura: só marca visto, nunca dispara evento
      if (item.prioridade === "alta") novosAlta.push(item);
    }
    if (!novosAlta.length) return;
    var alvo = itemMaisRecente(novosAlta);
    if (alvo.gaveta_destino) notifUltimoDestino = alvo.gaveta_destino;
    // SN-2 item 5/6: abre a gaveta certa sozinho, depois pergunta.
    if (alvo.gaveta_destino && typeof abrirGaveta === "function") abrirGaveta(alvo.gaveta_destino);
    window.egosPerguntarPosicao({
      tipo: alvo.fonte,
      modo_atual: window.EGOS_MODO || null,
      titulo: alvo.titulo,
      gaveta_destino: alvo.gaveta_destino,
    });
  }

  async function carregarNotificacoes() {
    try {
      var r = await fetch("/api/notificacoes");
      var j = await r.json();
      window.__estadoAtualNotif = { perfilAtivo: (typeof estadoAtual !== "undefined" && estadoAtual) ? estadoAtual.perfilAtivo : null };
      var itens = Array.isArray(j.itens) ? j.itens : [];
      notifItensAtuais = itens; // SINO-DESTINO-REAL-001: o sino precisa do payload de agora.
      notifAgrupado = j.pedidoAgrupado || "";
      // AVISO-HUMANO-001: se a gaveta está aberta, ela acompanha o poll — o que está na tela
      // é o estado de agora, não a foto de quando abriu.
      var ov = document.getElementById("avisos-overlay");
      if (ov && ov.classList.contains("aberto")) renderAvisos();
      var total = typeof j.total === "number" ? j.total : itens.length;
      renderBadge(total, j.fontes);
      if (total !== notifTotalAnterior) {
        // bandeja nativa fica sabendo pelo próprio poll dela (egos-app-notificacoes.py);
        // aqui só é o BADGE do app, sem tocar GTK — casca e app medem a mesma fonte,
        // cada um na própria camada.
      }
      notifTotalAnterior = total;
      processarNovos(itens);
    } catch (e) {
      renderBadge(0, { fila: "⚪", avisos: "⚪", heartbeat: "⚪", mesa: "⚪" });
    }
  }

  // "botões de mudanças devem estar funcionando já" (corte Enio 08/09): o sino do
  // cabeçalho reabre o mesmo destino que a última notificação de verdade apontou — antes
  // ia sempre para "time-overlay", fixo, mesmo quando o evento era de outro módulo.
  // SINO-DESTINO-REAL-001 (corte Enio 09/09, print: "notificações está mostrando time em
  // campo, não carrega, não mostra nada"). Dois defeitos empilhados: (1) notifUltimoDestino
  // só era gravado quando uma notificação NOVA chegava durante a sessão aberta — abrindo o
  // app com 3 avisos já existentes ele valia null e o sino caía no fallback fixo
  // "time-overlay", um painel de sistema que nada tinha a ver com os avisos; (2) a gaveta
  // abria vazia, porque quem carregava era o botão dela (consertado na raiz por
  // GAVETA-ABRE-CARREGADA-001, em app-gavetas.js). Agora o destino sai do PRÓPRIO item mais
  // recente do payload atual, e só cai no genérico quando não há nenhum aviso.
  var notifItensAtuais = [];
  var notifAgrupado = "";

  function escapa(t) {
    return String(t == null ? "" : t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  // AVISO-HUMANO-001: um cartão por aviso — título em português de gente, o que é, o que
  // quebra, e o pedido PRONTO. Dois caminhos, cada um dizendo o que é de verdade: copiar
  // (vai para a área de transferência, você cola no Claude Code) e mandar para a fila (fica
  // registrado e o agente lê quando pega a fila). Prometer "enviei ao Claude" seria
  // sucesso-fantasma: o app não digita na sessão de ninguém.
  function cartaoAviso(item, idx) {
    var h = item.humano || {};
    var pedido = h.pedido || ("Sobre o aviso: " + (item.titulo || "sem título"));
    var selo = h.traduzido === false ? "⚪" : "🔴";
    return '<details class="tile-integracao" style="margin-bottom:10px">' +
      '<summary><strong>' + selo + " " + escapa(h.titulo || item.titulo) + "</strong></summary>" +
      '<div class="ti-detalhe" style="margin-top:6px"><span style="color:var(--texto-fraco)">o que é:</span> ' + escapa(h.oQueE) + "</div>" +
      '<div class="ti-detalhe"><span style="color:var(--texto-fraco)">o que isso quebra:</span> ' + escapa(h.oQueQuebra) + "</div>" +
      '<div class="ti-detalhe" style="color:var(--texto-fraco);font-size:11.5px">motor: ' + escapa(item.agente || item.fonte) + " · " + escapa(item.quando) + "</div>" +
      '<div class="ti-detalhe" style="margin-top:10px"><strong>pedido pronto para o Claude Code</strong> (edite se quiser):</div>' +
      '<textarea id="pedido-' + idx + '" rows="5" style="width:100%;box-sizing:border-box;margin-top:6px;background:var(--fundo,#0b0f17);color:inherit;border:1px solid var(--borda,#2a3346);border-radius:8px;padding:8px;font-size:12.5px">' + escapa(pedido) + "</textarea>" +
      '<div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap">' +
      '<button type="button" class="btn-copiar-pedido" data-idx="' + idx + '" style="padding:5px 12px;border-radius:8px;border:1px solid var(--borda,#2a3346);background:transparent;color:inherit;cursor:pointer">📋 copiar para colar no Claude Code</button>' +
      '<button type="button" class="btn-fila-pedido" data-idx="' + idx + '" style="padding:5px 12px;border-radius:8px;border:1px solid var(--borda,#2a3346);background:transparent;color:inherit;cursor:pointer">📨 mandar para a fila do agente</button>' +
      "</div>" +
      '<div class="ti-detalhe pedido-res" data-res="' + idx + '" hidden></div>' +
      "</details>";
  }

  function renderAvisos() {
    var meta = document.getElementById("avisos-meta");
    var lista = document.getElementById("avisos-lista");
    var agrup = document.getElementById("avisos-agrupado");
    if (!lista) return;
    if (meta) meta.textContent = notifItensAtuais.length + " aviso(s) agora";
    if (agrup) {
      if (notifAgrupado) {
        agrup.hidden = false;
        agrup.innerHTML = '<div class="tile-integracao" style="margin-bottom:12px;border-left:3px solid var(--verde,#4ade80)">' +
          "<strong>Estes avisos parecem ter a mesma causa</strong>" +
          '<textarea id="pedido-agrupado" rows="4" style="width:100%;box-sizing:border-box;margin-top:8px;background:var(--fundo,#0b0f17);color:inherit;border:1px solid var(--borda,#2a3346);border-radius:8px;padding:8px;font-size:12.5px">' + escapa(notifAgrupado) + "</textarea>" +
          '<button type="button" class="btn-copiar-pedido" data-idx="agrupado" style="margin-top:8px;padding:5px 12px;border-radius:8px;border:1px solid var(--borda,#2a3346);background:transparent;color:inherit;cursor:pointer">📋 copiar o pedido único</button>' +
          '<div class="ti-detalhe pedido-res" data-res="agrupado" hidden></div></div>';
      } else {
        agrup.hidden = true;
        agrup.innerHTML = "";
      }
    }
    lista.innerHTML = notifItensAtuais.length
      ? notifItensAtuais.map(cartaoAviso).join("")
      : '<div class="ti-detalhe">🟢 nenhum aviso agora — nada pedindo sua atenção.</div>';
  }

  document.addEventListener("click", function (e) {
    var copiar = e.target.closest && e.target.closest(".btn-copiar-pedido");
    var fila = e.target.closest && e.target.closest(".btn-fila-pedido");
    if (!copiar && !fila) return;
    var idx = (copiar || fila).dataset.idx;
    var campo = document.getElementById("pedido-" + idx);
    var res = document.querySelector('[data-res="' + idx + '"]');
    if (!campo) return;
    if (copiar) {
      navigator.clipboard.writeText(campo.value).then(
        function () { if (res) { res.hidden = false; res.textContent = "🟢 copiado — cole no Claude Code (Ctrl+V)"; } },
        function (err) { if (res) { res.hidden = false; res.textContent = "🔴 o navegador recusou a cópia: " + err + " — selecione o texto e copie à mão"; } }
      );
      return;
    }
    if (res) { res.hidden = false; res.textContent = "⚪ postando na fila…"; }
    fetch("/comando", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ acao: "mensagem", agente: "forja", titulo: "Aviso do sistema: " + (notifItensAtuais[idx] ? (notifItensAtuais[idx].humano || {}).titulo || notifItensAtuais[idx].titulo : "sem título"), corpo: campo.value }),
    })
      .then(function (r) { return r.json(); })
      .then(function (j) { if (res) res.textContent = j.ok ? "🟢 na fila do agente — ele lê quando pegar a fila (não é a conversa aberta)" : "🔴 " + (j.erro || "não entrou na fila"); })
      .catch(function (err) { if (res) res.textContent = "🔴 não consegui falar com o app: " + err; });
  });

  var btnNotif = document.getElementById("btn-notificacoes");
  if (btnNotif) {
    btnNotif.addEventListener("click", function () {
      if (typeof abrirGaveta !== "function") return;
      abrirGaveta("avisos-overlay");
    });
  }
  var fecharAvisos = document.getElementById("avisos-fechar");
  if (fecharAvisos && typeof fecharGaveta === "function") {
    fecharAvisos.addEventListener("click", function () { fecharGaveta("avisos-overlay"); });
  }
  if (window.__ABRIDORES) window.__ABRIDORES["avisos-overlay"] = renderAvisos;

  carregarNotificacoes();
  setInterval(carregarNotificacoes, NOTIF_POLL_MS);
})();
