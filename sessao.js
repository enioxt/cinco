/**
 * sessao.js — SESSAO-VISIVEL-001 passo 4.
 *
 * Chip fixo no canto superior direito: "@login · sair" se logado, "entrar" se não. A única
 * fonte de verdade é GET /entrar/quem (o cookie de sessão é HttpOnly — nenhum JS de página lê
 * o cookie diretamente, nem aqui nem em lugar nenhum). Falha de rede/CSP não quebra a página:
 * o chip simplesmente não aparece.
 *
 * Também dispara `sessao:estado` em window com {logado, login, fundador} — páginas com CTA
 * próprio (entrar.html, federação) escutam esse evento em vez de repetir a chamada a /quem.
 */
(function () {
  function escaparHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  var css =
    ".sessao-chip{position:fixed;top:10px;right:10px;z-index:9999;display:flex;gap:8px;" +
    "align-items:center;background:rgba(23,21,15,.85);color:#e9e6df;border:1px solid #3a362d;" +
    "border-radius:999px;padding:6px 12px;font:13px system-ui,-apple-system,sans-serif}" +
    ".sessao-chip a{color:inherit;text-decoration:none}.sessao-chip a:hover{color:#cf9c52}" +
    ".sessao-chip span{opacity:.5}";
  var estilo = document.createElement("style");
  estilo.textContent = css;
  document.head.appendChild(estilo);

  // Página com lugar próprio para a sessão (ex.: o "Entrar" do topo da capa, 30/09) marca o
  // elemento com data-sessao-slot: o estado é escrito ali e o chip fixo não nasce — no celular
  // ele cobriria o cabeçalho. Sem o marcador, vale o chip fixo de sempre.
  var slot = document.querySelector("[data-sessao-slot]");
  var chip = slot || document.createElement("div");
  // o valor do marcador é a classe dos links escritos ali (a pele estiliza .entrar, por exemplo)
  var cls = slot ? ' class="' + escaparHtml(slot.getAttribute("data-sessao-slot") || "") + '"' : "";
  if (!slot) {
    chip.className = "sessao-chip";
    chip.hidden = true;
    document.body.appendChild(chip);
  }

  var destino = encodeURIComponent(location.pathname + location.search);

  fetch("/entrar/quem", { credentials: "same-origin", cache: "no-store" })
    .then(function (r) {
      if (r.status === 200) return r.json();
      return null; // 401 (ou qualquer outra coisa) = trata como "não logado"
    })
    .then(function (d) {
      var logado = !!(d && d.login);
      if (logado) {
        chip.innerHTML =
          "<a" + cls + ' href="/entrar/painel">@' + escaparHtml(d.login) + "</a><span>·</span>" +
          "<a" + cls + ' href="/entrar/sair">sair</a>';
      } else {
        // Achado crítico MÉDIO 2026-09-14: apontar direto para /entrar/start sem `aceite=sim`
        // sempre devolvia 400 "Falta o aceite" — o chip deslogado nunca funcionava. A entrada
        // exige ler a página do aceite primeiro; o link certo é /entrar.html (que propaga
        // `destino` ao botão real, via entrar-aceite.js).
        chip.innerHTML = "<a" + cls + ' href="/entrar.html?destino=' + destino + '">' + (slot ? "Entrar" : "entrar") + "</a>";
      }
      chip.hidden = false;
      // A capa tem um link fixo "minha entrada" no mesmo canto (fallback sem JS). Com o chip
      // visível os dois se sobrepunham (print do Enio, 30/09): o chip assume, o link sai.
      var fixo = document.querySelector(".usuario-fixo");
      if (fixo) fixo.style.display = "none"; // [hidden] perde para o display da classe
      window.dispatchEvent(
        new CustomEvent("sessao:estado", {
          detail: logado ? { logado: true, login: d.login, fundador: !!d.fundador } : { logado: false },
        }),
      );
    })
    .catch(function () {
      /* CSP bloqueou, ou rede caiu — o chip simplesmente não aparece; a página segue igual. */
    });
})();
