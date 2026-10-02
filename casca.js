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
  if (!d.getElementById("pele-css")) {
    // página feita fora: a pele e a casca chegam por aqui, com o corpo escondido até a pele vir
    var st = d.createElement("style");
    st.textContent = "html:not(.css-ok) body{opacity:0}";
    d.head.appendChild(st);
    link("/casca.css");
    var pl = link("/peles/" + window.CINCO_PELE + ".css", "pele-css");
    var ok = function () { h.classList.add("css-ok"); };
    pl.onload = ok;
    pl.onerror = function () { pl.href = "/peles/a.css"; pl.onerror = ok; pl.onload = ok; };
    setTimeout(ok, 2500);
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
      return fetch("/casca/" + nome + ".html", { credentials: "same-origin" })
        .then(function (r) { return r.ok ? r.text() : ""; })
        .then(function (t) { if (t) el.innerHTML = t; })
        .catch(function () {});
    }));
  }
  function iniciar() {
    fragmentos().then(function () {
      seletor();
      script("/sessao.js");
      script("/conversa.js");
    });
  }
  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", iniciar); else iniciar();
})();
