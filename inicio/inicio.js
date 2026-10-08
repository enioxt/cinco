(function () {
  "use strict";

  var CHAVE = "cinco-intencao-inicial";

  function sessaoGet(k) {
    try { return sessionStorage.getItem(k); } catch (e) { return null; }
  }

  function sessaoSet(k, v) {
    try {
      if (v === null) sessionStorage.removeItem(k);
      else sessionStorage.setItem(k, v);
    } catch (e) {}
  }

  function bolha(texto, quem) {
    var corpo = document.getElementById("cv-corpo");
    if (!corpo) return;
    var d = document.createElement("div");
    d.className = "cv-b " + quem;
    d.textContent = texto;
    corpo.appendChild(d);
    corpo.scrollTop = corpo.scrollHeight;
  }

  function removerDesejosGenericos() {
    var corpo = document.getElementById("cv-corpo");
    if (!corpo) return;
    var linhas = corpo.querySelectorAll(".cv-chips:not([data-sug])");
    if (linhas.length) linhas[linhas.length - 1].remove();
  }

  function aplicarIntencao() {
    var intencao = sessaoGet(CHAVE);
    var area = sessaoGet("cinco-area");
    var txt = document.getElementById("cv-txt");
    if (!intencao || !area || !txt) return false;

    removerDesejosGenericos();

    if (intencao === "Outra coisa") {
      txt.value = "Trabalho com " + area.toLowerCase() + ". Quero explicar outra coisa: ";
    } else {
      txt.value = "Trabalho com " + area.toLowerCase() + ". Quero: " + intencao.toLowerCase() + ".";
    }

    bolha(intencao, "eu");
    bolha("Usei o atalho que você escolheu e deixei a mensagem pronta. Pode completar ou corrigir antes de enviar.", "eg");
    sessaoSet(CHAVE, null);
    txt.dispatchEvent(new Event("input", { bubbles: true }));
    txt.focus();
    txt.setSelectionRange(txt.value.length, txt.value.length);
    return true;
  }

  document.querySelectorAll("[data-intencao]").forEach(function (el) {
    el.addEventListener("click", function () {
      var valor = String(el.getAttribute("data-intencao") || "").trim();
      if (!valor) return;
      sessaoSet(CHAVE, valor);
      // O handler global do conversa.js abre o chat no mesmo clique. Rodar depois dele
      // permite consumir a intenção imediatamente quando a área já é conhecida.
      setTimeout(aplicarIntencao, 0);
    });
  });

  // Quando a área ainda não existe, o primeiro .cv-chip escolhido é a área. O handler
  // interno do conversa.js grava `cinco-area` antes de o clique chegar ao document;
  // então consumimos a intenção no próximo tick e retiramos a fileira genérica de desejos.
  document.addEventListener("click", function (e) {
    var chip = e.target && e.target.closest && e.target.closest("#cv-corpo .cv-chip");
    if (!chip || !sessaoGet(CHAVE)) return;
    setTimeout(aplicarIntencao, 0);
  });
})();
