/* app-whatsapp-monitor.js — WPP-OBSERVABILIDADE-001 (corte Enio 15/09 10:35: "vamos
   monitorando e já construindo o sistema de monitoramento completo, ativando ele:
   observabilidade, telemetria, analytics, diagnósticos" do laço WhatsApp).

   Bloco no TOPO da aba "Sessões" já existente (dentro da gaveta "avisos-overlay" — mesma
   correção Prime de app-conversas.js/app-uso.js: zero botão/overlay novo). Arquivo NOVO,
   servido por ÚLTIMO por /app.js — só USA (nunca declara) escaparHtml/horaLocal dos
   anteriores. Listener PRÓPRIO nos botões de #avisos-abas (mesmo padrão de app-uso.js): a
   troca de aba em si já é tratada por app-conversas.js, este só liga/desliga o poll do
   bloco WhatsApp.

   Semáforo de 4 cores (=R-SEMAFORO-QUATRO-001): pinta exatamente a cor que veio de
   /api/whatsapp/monitor — nunca infere. Sem lib externa: barras de mensagens/hora são
   <div> com altura proporcional (style.height). */
(function () {
  var WPP_MON_POLL_MS = 15000;
  var wppMonTimer = null;
  var wppMonAbaAtiva = false;

  function iconeCor(c) {
    return c === "verde" ? "🟢" : c === "amarelo" ? "🟡" : c === "vermelho" ? "🔴" : "⚪";
  }

  function linhaItem(it) {
    return (
      '<span class="wpp-mon-item" title="' + escaparHtml(it.detalhe || "") + '">' +
      iconeCor(it.cor) + ' <span class="wpp-mon-item-nome">' + escaparHtml(it.nome || it.id) + "</span></span>"
    );
  }

  function renderItens(j) {
    var alvo = document.getElementById("wpp-mon-itens");
    if (!alvo) return;
    var itens = Array.isArray(j.itens) ? j.itens : [];
    alvo.innerHTML = itens.length ? itens.map(linhaItem).join("") : "⚪ nenhum item medido ainda";
  }

  function renderStatus(j) {
    var alvo = document.getElementById("wpp-mon-status");
    if (!alvo) return;
    var partes = [];
    if (j.ts) partes.push("medido " + horaLocal(j.ts));
    if (j.resumo) {
      partes.push(
        "🟢" + (j.resumo.verde || 0) + " 🟡" + (j.resumo.amarelo || 0) +
        " 🔴" + (j.resumo.vermelho || 0) + " ⚪" + (j.resumo.naoMedido || 0),
      );
    }
    if (j.status) partes.push(escaparHtml(j.status));
    alvo.innerHTML = partes.join(" · ");
  }

  function renderBarras(j) {
    var alvo = document.getElementById("wpp-mon-barras");
    if (!alvo) return;
    var contagens = j.contagensPorCanal || {};
    var porHora = {};
    Object.keys(contagens).forEach(function (canal) {
      Object.keys(contagens[canal] || {}).forEach(function (hora) {
        porHora[hora] = (porHora[hora] || 0) + contagens[canal][hora];
      });
    });
    var horas = Object.keys(porHora).sort();
    if (!horas.length) {
      alvo.innerHTML = "";
      return;
    }
    var max = Math.max.apply(null, horas.map(function (h) { return porHora[h]; }));
    alvo.innerHTML = horas.map(function (h) {
      var alturaPct = max > 0 ? Math.max(4, Math.round((porHora[h] / max) * 100)) : 4;
      var rotulo = h.slice(11) + "h · " + porHora[h] + " msg";
      return '<div class="wpp-mon-barra" style="height:' + alturaPct + '%" title="' + escaparHtml(rotulo) + '"></div>';
    }).join("");
  }

  function linhaTempo(t) {
    var fmt = function (ms) { return ms === null || ms === undefined ? "⚪" : ms + "ms"; };
    return (
      "<tr><td>" + escaparHtml(t.autor || "⚪") + "</td><td>" + horaLocal(t.ponteLeu) +
      "</td><td>" + fmt(t.injetadoMs) + "</td><td>" + fmt(t.respostaMs) +
      "</td><td>" + fmt(t.totalMs) + "</td></tr>"
    );
  }

  function renderTempos(j) {
    var alvo = document.getElementById("wpp-mon-tempos");
    if (!alvo) return;
    var linhas = Array.isArray(j.tempos) ? j.tempos : [];
    if (!linhas.length) {
      alvo.innerHTML = j.temposErro ? "⚪ " + escaparHtml(j.temposErro) : "⚪ nenhuma mensagem casada nas últimas horas";
      return;
    }
    alvo.innerHTML =
      "<table><thead><tr><th>autor</th><th>ponte leu</th><th>+injetado</th><th>+resposta</th><th>total</th></tr></thead><tbody>" +
      linhas.map(linhaTempo).join("") + "</tbody></table>";
  }

  async function carregarWppMon() {
    try {
      var j = await (await fetch("/api/whatsapp/monitor")).json();
      renderStatus(j);
      renderItens(j);
      renderBarras(j);
      renderTempos(j);
    } catch (e) {
      var alvo = document.getElementById("wpp-mon-itens");
      if (alvo) alvo.innerHTML = "🔴 não consegui ler /api/whatsapp/monitor: " + escaparHtml(String(e));
    }
  }

  function pararPollWppMon() {
    if (wppMonTimer) { clearInterval(wppMonTimer); wppMonTimer = null; }
  }
  window.__pararPollWppMon = pararPollWppMon;

  function iniciarPollWppMon() {
    pararPollWppMon();
    carregarWppMon();
    wppMonTimer = setInterval(carregarWppMon, WPP_MON_POLL_MS);
  }

  var abasPrincipais = document.getElementById("avisos-abas");
  var blocoWppMon = document.getElementById("wpp-mon-bloco");
  if (abasPrincipais && blocoWppMon) {
    Array.prototype.forEach.call(abasPrincipais.querySelectorAll(".conv-aba"), function (btn) {
      // listener PRÓPRIO, adicional ao de app-conversas.js — nunca substitui aquele.
      btn.addEventListener("click", function () {
        wppMonAbaAtiva = btn.getAttribute("data-aba") === "sessoes";
        if (wppMonAbaAtiva) iniciarPollWppMon();
        else pararPollWppMon();
      });
    });
  }
})();
