/* app-email.js — GMAIL-SO-LEITURA-001 (10/09, recomendação "só ler/mostrar" da PCA visual).
 * Gaveta E-mail: lista os últimos N do INBOX (de/assunto/data/trecho), SEM enviar/apagar/
 * mover — mesma fronteira do motor server-side (rotas-email.ts). Vem por ÚLTIMO na
 * concatenação: só USA (nunca declara) escaparHtml/horaLocal/abrirGaveta/fecharGaveta dos
 * anteriores. GAVETAS["email-overlay"] registrada de forma ESTÁTICA em app-gavetas.js.
 */
(function () {
  "use strict";

  async function carregarEmail() {
    var meta = document.getElementById("email-meta");
    var lista = document.getElementById("email-lista");
    if (!lista) return;
    if (meta) meta.textContent = "⚪ carregando…";
    try {
      var r = await fetch("/api/email?limite=15");
      var j = await r.json();
      if (j.status !== "ok") {
        if (meta) meta.textContent = j.status;
        lista.innerHTML = '<div class="doc-vazio">' + escaparHtml(j.status) + "</div>";
        return;
      }
      if (meta) {
        meta.textContent = j.resumo.total + " de " + j.resumo.limite + " mais recentes · medido " + horaLocal(j.resumo.medidoEm);
      }
      if (!j.itens.length) {
        lista.innerHTML = '<div class="doc-vazio">⚪ nenhum e-mail encontrado no INBOX</div>';
        return;
      }
      lista.innerHTML = j.itens.map(function (item) {
        var naoLido = item.naoLido ? '<span class="doc-selo" title="não lido">●</span> ' : "";
        return (
          '<div class="doc-linha">' +
          '<div class="doc-linha-topo">' +
          naoLido +
          '<span class="doc-nome">' + escaparHtml(item.assunto) + "</span>" +
          '<span class="doc-raiz">' + escaparHtml(item.de) + "</span>" +
          '<span class="doc-idade">' + escaparHtml(item.data) + "</span>" +
          "</div>" +
          '<div class="doc-linha-prox">' + escaparHtml(item.trecho) + "</div>" +
          "</div>"
        );
      }).join("");
    } catch (e) {
      if (meta) meta.textContent = "🔴 falha ao carregar";
      lista.innerHTML = '<div class="doc-vazio">🔴 ' + escaparHtml(e instanceof Error ? e.message : String(e)) + "</div>";
    }
  }

  function inicializarEmail() {
    var fechar = document.getElementById("email-fechar");
    if (fechar) fechar.addEventListener("click", function () { fecharGaveta("email-overlay"); });
    var btn = document.getElementById("btn-email");
    // GAVETA-ABRE-CARREGADA-001: quem carrega é a gaveta, não o botão.
    window.__ABRIDORES = window.__ABRIDORES || {};
    window.__ABRIDORES["email-overlay"] = carregarEmail;
    if (btn) btn.addEventListener("click", function () { abrirGaveta("email-overlay"); });
  }

  document.addEventListener("DOMContentLoaded", inicializarEmail);
})();
