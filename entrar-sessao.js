/**
 * entrar-sessao.js — SESSAO-VISIVEL-001 passo 4, específico de entrar.html.
 * Escuta o evento `sessao:estado` que sessao.js dispara depois de perguntar a /entrar/quem.
 * Se já há sessão válida, troca o CTA "entrar com GitHub" por "você já está dentro como
 * @login → ir ao painel" — sem redirecionar sozinho (a pessoa decide clicar).
 */
(function () {
  window.addEventListener("sessao:estado", function (ev) {
    var botao = document.getElementById("btn-entrar");
    if (!botao || !ev.detail || !ev.detail.logado) return;
    botao.textContent = "você já está dentro como @" + ev.detail.login + " — ir ao painel →";
    botao.href = "/entrar/painel";
    botao.removeAttribute("aria-disabled");
    botao.classList.remove("desabilitado");
    // .aceite-row tem display:flex no CSS da página, que vence a UA-stylesheet de [hidden] —
    // por isso style.display direto, não o atributo hidden (que aqui não esconderia nada).
    var linhaAceite = document.getElementById("aceite");
    if (linhaAceite) {
      var caixaRow = linhaAceite.querySelector(".aceite-row");
      if (caixaRow) caixaRow.style.display = "none";
    }
  });
})();
