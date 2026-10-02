/* app-roteiro-projeto.js — ROTEIRO-CHECKLIST-CONSTANTE-001 item 3 (Prime 15/09, seguindo o
   item 1: "checklist constante mostrando o que falta fazer"). 5ª aba DENTRO da gaveta
   "avisos-overlay" que já existe (mesma correção Prime de app-conversas.js: zero botão/
   overlay novo no #header). Arquivo NOVO, servido por ÚLTIMO por /app.js — só USA (nunca
   declara) escaparHtml dos anteriores. NÃO toca app-conversas.js nem scripts/whatsapp-*:
   adiciona um listener PRÓPRIO nos botões de #avisos-abas (mesma técnica de app-uso.js —
   a troca de aba em si já é tratada por app-conversas.js; este listener só cuida de
   mostrar/esconder o painel "Roteiro do projeto" e ligar/desligar o poll de 60s dele).

   Poll 60s (pedido do Prime): TASKS.md+git log não mudam a cada segundo — 60s é fresco o
   bastante sem martelar o servidor. Semáforo de 4 cores: ⚪ quando /api/roteiro-projeto não
   conseguiu medir (config/TASKS.md ilegível) — nunca lista vazia calada (=R13-c). */
(function () {
  var RTP_POLL_MS = 60000;
  var rtpTimer = null;
  var rtpAbaAtiva = false; // painel "Roteiro do projeto" está visível agora?

  var ROTULO_FASE = {
    feito: "✅ Feito",
    em_curso: "🔵 Em curso",
    gated: "🟡 Gated — ato do Enio",
    proximo: "⬜ Próximo",
  };
  var ORDEM_FASES = ["feito", "em_curso", "gated", "proximo"];

  function linhaItem(it) {
    var extra = "";
    if (it.fase === "feito" && it.data) extra = " (" + escaparHtml(it.data) + (it.sha ? " · " + escaparHtml(it.sha) : "") + ")";
    else if (it.fase === "gated" && it.gated_em) extra = " — destrava: " + escaparHtml(it.gated_em);
    return (
      '<div class="conv-item">' +
      '<div class="conv-item-linha1"><span class="conv-quem">' + escaparHtml(it.id) + "</span></div>" +
      '<div class="conv-texto">' + escaparHtml(it.texto) + extra + "</div>" +
      "</div>"
    );
  }

  function renderFases(roteiro) {
    var partes = [];
    for (var i = 0; i < ORDEM_FASES.length; i++) {
      var fase = ORDEM_FASES[i];
      var itens = (roteiro.fases && roteiro.fases[fase]) || [];
      partes.push('<div class="gaveta-meta" style="margin-top:14px;font-weight:600">' + ROTULO_FASE[fase] + " (" + itens.length + ")</div>");
      if (!itens.length) {
        partes.push('<div class="conv-item">⚪ nenhum item nesta fase.</div>');
        continue;
      }
      partes.push(itens.map(linhaItem).join(""));
    }
    return partes.join("");
  }

  function renderRoteiro(resp) {
    var status = document.getElementById("roteiro-projeto-status");
    var conteudo = document.getElementById("roteiro-projeto-conteudo");
    if (!conteudo) return;
    if (!resp || resp.ok === false) {
      if (status) status.textContent = (resp && resp.erro) || "⚪ não consegui medir";
      conteudo.innerHTML = "⚪ roteiro não pôde ser lido agora.";
      return;
    }
    var r = resp.roteiro || {};
    var u = r.universo || {};
    if (status) {
      status.textContent =
        (r.titulo || "roteiro") + " · " + (u.m_casadas || 0) + " de " + (u.n_tasks_lidas || 0) + " tasks · " +
        (r.gerado_em ? horaLocal(r.gerado_em) : "⚪");
    }
    conteudo.innerHTML = renderFases(r);
  }

  async function carregarRoteiroProjeto() {
    try {
      var resp = await (await fetch("/api/roteiro-projeto")).json();
      renderRoteiro(resp);
    } catch (e) {
      var conteudo = document.getElementById("roteiro-projeto-conteudo");
      if (conteudo) conteudo.innerHTML = "🔴 não consegui ler /api/roteiro-projeto: " + escaparHtml(String(e));
    }
  }

  function pararPollRoteiroProjeto() {
    if (rtpTimer) { clearInterval(rtpTimer); rtpTimer = null; }
  }
  window.__pararPollRoteiroProjeto = pararPollRoteiroProjeto;

  function iniciarPollRoteiroProjeto() {
    pararPollRoteiroProjeto();
    carregarRoteiroProjeto();
    rtpTimer = setInterval(carregarRoteiroProjeto, RTP_POLL_MS);
  }

  var abasPrincipais = document.getElementById("avisos-abas");
  var painelRoteiroProjeto = document.getElementById("roteiro-projeto-painel");
  var btnAbaRoteiroProjeto = null;
  if (abasPrincipais && painelRoteiroProjeto) {
    Array.prototype.forEach.call(abasPrincipais.querySelectorAll(".conv-aba"), function (btn) {
      if (btn.getAttribute("data-aba") === "roteiro-projeto") btnAbaRoteiroProjeto = btn;
      // listener PRÓPRIO, adicional ao de app-conversas.js — nunca substitui aquele.
      btn.addEventListener("click", function () {
        rtpAbaAtiva = btn.getAttribute("data-aba") === "roteiro-projeto";
        painelRoteiroProjeto.hidden = !rtpAbaAtiva;
        if (rtpAbaAtiva) iniciarPollRoteiroProjeto();
        else pararPollRoteiroProjeto();
      });
    });
  }

  // Deep-link #roteiro-projeto — mesma convenção de app-roteiro.js/app-mcp.js/app-whatsapp.js
  // (abre o sino + clica a aba direto ao carregar; útil pra provar visualmente sem clique
  // manual, e pra link direto do Enio).
  window.addEventListener("load", function () {
    if (location.hash !== "#roteiro-projeto") return;
    var btnNotif = document.getElementById("btn-notificacoes");
    if (btnNotif) btnNotif.click();
    if (btnAbaRoteiroProjeto) btnAbaRoteiroProjeto.click();
  });
})();
