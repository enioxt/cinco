/**
 * entrar-aceite.js — extraído do inline <script> de entrar.html (SESSAO-VISIVEL-001 passo 4:
 * a CSP da página ganhou script-src 'self', que bloqueia script inline sem nonce; em vez de
 * afrouxar com 'unsafe-inline', o comportamento virou arquivo externo, mesma origem).
 * Libera o botão "entrar com GitHub" só depois da caixa de aceite marcada — comportamento
 * inalterado, só o lugar onde o código mora.
 */
(function () {
  var caixa = document.getElementById("aceite-caixa");
  var botao = document.getElementById("btn-entrar");
  // Achado crítico MÉDIO 2026-09-14: o chip deslogado (sessao.js) manda pra cá com
  // ?destino=<página que a pessoa queria> — propaga pro link real do GitHub, senão o destino
  // morre aqui. NOTA (declarada, não escondida): /entrar/start só usa `destino` quando já
  // existe SESSÃO ATIVA (ver entrar.ts, passo 3); o callback de OAuth não carrega destino no
  // `state` (state só prova aceite+CSRF) — então pós-login SEM sessão prévia cai sempre em
  // /entrar/painel. Isto aqui cobre o caso de sessão já ativa que ainda caiu nesta página.
  var destino = new URLSearchParams(location.search).get("destino");
  if (destino) {
    botao.href = "https://cinco.ia.br/entrar/start?aceite=sim&destino=" + encodeURIComponent(destino);
  }
  function atualizar() {
    if (caixa.checked) {
      botao.removeAttribute("aria-disabled");
      botao.classList.remove("desabilitado");
    } else {
      botao.setAttribute("aria-disabled", "true");
      botao.classList.add("desabilitado");
    }
  }
  caixa.addEventListener("change", atualizar);
  botao.addEventListener("click", function (e) {
    if (botao.getAttribute("aria-disabled") === "true") {
      e.preventDefault();
      caixa.focus();
    }
  });
  atualizar();
})();
