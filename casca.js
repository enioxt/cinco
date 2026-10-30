/**
 * casca.js — o mesmo topo, rodapé, pele e chat em QUALQUER página do cinco (30/09).
 *
 * Para quem gera página fora deste repositório (a federação, o painel de login do gateway),
 * o contrato é este e só este:
 *   <head> ... <script src="/casca.js"></script> </head>
 *   <body> <div data-casca="topo"></div> ...conteúdo... <div data-casca="rodape"></div> </body>
 * O script escolhe a pele (?pele= ou a última do seletor), carrega casca.css + peles/<x>.css,
 * esconde o corpo até a pele chegar (trava de 2,5 s) e busca /casca/topo.html e /casca/rodape.html.
 * Sem JavaScript o conteúdo aparece do mesmo jeito, só sem topo, rodapé e pele.
 * Páginas geradas aqui (ferramentas/casca.mjs) já trazem tudo no HTML e só usam este arquivo
 * para o seletor de pele e para os fragmentos, se houver.
 *
 * 30/10/2026 (relato de quem abre o site: "abre feio e depois converte"): o corpo só aparece quando a pele E o topo/rodapé chegaram.
 * Antes aparecia com a pele e o topo vinha depois: 76 px reservados para 80 a 199 reais, e a página inteira
 * descia (medido: CLS 0,17 em /federacao/). O topo e o rodapé agora começam a vir logo, não no DOMContentLoaded,
 * e a fonte da pele A é pré-carregada aqui (a página feita fora não tinha o <link rel="preload">).
 */
(function () {
  if (window.__cascaOk) return;
  window.__cascaOk = true;
  var d = document, h = d.documentElement;
  var PELES = { a: "Carimbo", b: "Letreiro", c: "Linhas" };

  if (!window.CINCO_PELE) {
    var q = new URLSearchParams(location.search).get("pele"), g = null;
    try { g = localStorage.getItem("cinco-pele"); } catch (e) {}
    window.CINCO_PELE = q && PELES[q] ? q : g && PELES[g] ? g : "a";
    h.setAttribute("data-pele", window.CINCO_PELE);
  }
  function link(href, id) {
    var l = d.createElement("link");
    l.rel = "stylesheet"; l.href = href; if (id) l.id = id;
    d.head.appendChild(l);
    return l;
  }
  var cssPronto = false, fragPronto = false, antes = {};
  function revelar() { if (cssPronto && fragPronto) h.classList.add("css-ok"); }
  function busca(nome) {
    return fetch("/casca/" + nome + ".html", { credentials: "same-origin" })
      .then(function (r) { return r.ok ? r.text() : ""; })
      .catch(function () { return ""; });
  }
  if (!d.getElementById("pele-css")) {
    // página feita fora: a pele e a casca chegam por aqui, com o corpo escondido até a pele e o topo virem
    var st = d.createElement("style");
    st.textContent = "html:not(.css-ok) body{opacity:0}";
    d.head.appendChild(st);
    if (window.CINCO_PELE === "a") {
      var pf = d.createElement("link");
      pf.rel = "preload"; pf.as = "font"; pf.type = "font/woff2"; pf.href = "/fontes/a-1.woff2"; pf.crossOrigin = "anonymous";
      d.head.appendChild(pf);
    }
    link("/casca.css");
    var pl = link("/peles/" + window.CINCO_PELE + ".css", "pele-css");
    var ok = function () { cssPronto = true; revelar(); };
    pl.onload = ok;
    pl.onerror = function () { pl.href = "/peles/a.css"; pl.onerror = ok; pl.onload = ok; };
    setTimeout(function () { h.classList.add("css-ok"); }, 2500); // trava: nunca invisível por mais de 2,5 s
    ["topo", "rodape"].forEach(function (n) { antes[n] = busca(n); });
  } else {
    cssPronto = true; // página gerada: a pele já está no <head> e o topo já está no HTML
  }

  function seletor() {
    var n = d.getElementById("seletor-pele");
    if (!n || n.querySelector("button")) return;
    Object.keys(PELES).forEach(function (k, i) {
      if (i) n.appendChild(d.createTextNode(" · "));
      var b = d.createElement("button");
      b.type = "button"; b.textContent = PELES[k];
      b.setAttribute("aria-pressed", String(k === window.CINCO_PELE));
      b.addEventListener("click", function () {
        try { localStorage.setItem("cinco-pele", k); } catch (e) {}
        d.getElementById("pele-css").href = "/peles/" + k + ".css";
        h.setAttribute("data-pele", k); window.CINCO_PELE = k;
        [].forEach.call(n.querySelectorAll("button"), function (x) { x.setAttribute("aria-pressed", String(x === b)); });
      });
      n.appendChild(b);
    });
  }
  function script(src) {
    if (d.querySelector('script[src="' + src + '"]')) return;
    var s = d.createElement("script"); s.src = src; s.defer = true; d.body.appendChild(s);
  }
  function fragmentos() {
    var lugares = [].slice.call(d.querySelectorAll("[data-casca]"));
    return Promise.all(lugares.map(function (el) {
      var nome = el.getAttribute("data-casca");
      if (!/^[a-z0-9-]+$/.test(nome)) return null;
      return (antes[nome] || busca(nome))
        .then(function (t) { if (t) el.innerHTML = t; });
    }));
  }
  function iniciar() {
    fragmentos().then(function () {
      fragPronto = true; revelar();
      seletor();
      script("/sessao.js");
      script("/conversa.js");
    });
  }
  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", iniciar); else iniciar();
})();
