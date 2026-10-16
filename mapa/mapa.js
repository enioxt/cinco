// mapa.js — página /mapa/ do cinco (PCA-419:a). Lê /mapa/mapa.json (gerado no núcleo por scripts/mapa-publico.ts),
// desenha a lista com busca e filtro, e manda o "pedir acesso" pela MESMA porta do chat do cinco (/conversa/mensagem).
// Tudo por textContent: nada do JSON vira HTML. Sem dependência, sem domínio de fora (a CSP só deixa falar consigo mesma).
(function () {
  "use strict";
  var lista = document.getElementById("mp-lista");
  var conta = document.getElementById("mp-conta");
  var vazio = document.getElementById("mp-vazio");
  var busca = document.getElementById("mp-q");
  var chips = document.getElementById("mp-estados");
  if (!lista || !conta) return;

  var ESTADOS = [
    ["todos", "todos"],
    ["vivo", "vivo"],
    ["em obra", "em obra"],
    ["sem medição", "sem medição recente"]
  ];
  var CLASSE = { "vivo": "vivo", "em obra": "obra", "sem medição": "sem" };
  var ROTULO = { "vivo": "vivo", "em obra": "em obra", "sem medição": "sem medição recente" };
  var filtro = "todos";
  var itens = [];

  function el(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;
    return e;
  }
  function semAcento(s) { return String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(); }
  function mesAno(s) { var m = /^(\d{4})-(\d{2})$/.exec(s || ""); return m ? m[2] + "/" + m[1] : null; }

  function formulario(item, caixa, botao) {
    var f = el("form", "mp-pedido");
    f.setAttribute("aria-label", "Pedir acesso a " + item.nome);
    function campo(rot, nome, tipo, max, dica) {
      var l = el("label", null, rot);
      var i = document.createElement(tipo === "textarea" ? "textarea" : "input");
      if (tipo !== "textarea") i.type = tipo;
      i.name = nome; i.maxLength = max; i.required = true;
      if (dica) i.placeholder = dica;
      l.appendChild(i); f.appendChild(l);
      return i;
    }
    var nome = campo("Seu nome", "nome", "text", 60, "Como você quer ser chamado");
    var contato = campo("Como falar com você", "contato", "text", 80, "E-mail ou WhatsApp");
    var porque = campo("Para que você quer", "porque", "textarea", 500, "Conte em poucas linhas o que pretende fazer");
    f.appendChild(el("p", "mp-aviso", "Vai só para o Enio. Não escreva CPF nem senha. A resposta aparece aqui no cinco, neste navegador."));
    var enviar = el("button", "btn", "Enviar pedido"); enviar.type = "submit";
    f.appendChild(enviar);
    var estado = el("p", "mp-estado"); estado.setAttribute("aria-live", "polite");
    f.appendChild(estado);
    f.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var texto = "Pedido de acesso ao mapa · item " + item.id + " · " + item.nome +
        "\nNome: " + nome.value.trim() + "\nContato: " + contato.value.trim() + "\nPor quê: " + porque.value.trim();
      enviar.disabled = true; estado.textContent = "Enviando…";
      fetch("/conversa/mensagem", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ texto: texto }), credentials: "same-origin" })
        .then(function (r) { return r.json().then(function (j) { return { s: r.status, j: j }; }, function () { return { s: r.status, j: {} }; }); })
        .then(function (r) {
          if (r.s === 200 && r.j && r.j.ok) {
            f.replaceChildren(el("p", "mp-estado", "Pedido enviado. O Enio lê e responde aqui no cinco, em até 1 dia útil."));
            botao.hidden = true;
          } else {
            enviar.disabled = false;
            estado.textContent = r.s === 429 ? "Muitos pedidos seguidos. Tente de novo daqui a uma hora." : "Não deu para enviar agora" + (r.j && r.j.erro ? " (" + r.j.erro + ")" : "") + ". Tente de novo mais tarde.";
          }
        }, function () { enviar.disabled = false; estado.textContent = "Sem conexão. Tente de novo mais tarde."; });
    });
    caixa.appendChild(f);
    nome.focus();
  }

  function cartao(item) {
    var li = el("li", "mp-item");
    li.appendChild(el("h3", null, item.nome));
    li.appendChild(el("p", null, item.linha));
    var selos = el("div", "mp-selos");
    selos.appendChild(el("span", "mp-selo " + (CLASSE[item.estado] || ""), ROTULO[item.estado] || item.estado));
    selos.appendChild(el("span", "mp-selo", item.sigilo === "aberto" ? "aberto" : "sob pedido"));
    var q = mesAno(item.conferida);
    if (q) selos.appendChild(el("span", "mp-quando", "conferido em " + q));
    li.appendChild(selos);
    var acoes = el("div", "mp-acoes");
    if (item.sigilo === "aberto" && item.onde) {
      var a = el("a", null, "Ver"); a.href = item.onde; acoes.appendChild(a);
    }
    var b = el("button", null, item.sigilo === "aberto" ? "Pedir ajuda para usar" : "Pedir acesso");
    b.type = "button";
    b.setAttribute("aria-expanded", "false");
    b.addEventListener("click", function () {
      if (li.querySelector("form")) return;
      b.setAttribute("aria-expanded", "true");
      formulario(item, li, b);
    });
    acoes.appendChild(b);
    li.appendChild(acoes);
    return li;
  }

  function desenhar() {
    var q = semAcento(busca ? busca.value : "").trim();
    var n = 0;
    lista.replaceChildren();
    itens.forEach(function (it) {
      if (filtro !== "todos" && it.estado !== filtro) return;
      if (q && semAcento(it.nome + " " + it.linha).indexOf(q) < 0) return;
      lista.appendChild(cartao(it)); n++;
    });
    vazio.hidden = n !== 0;
  }

  function montarChips(m) {
    ESTADOS.forEach(function (e) {
      var qtd = e[0] === "todos" ? m.itens.length : m.itens.filter(function (i) { return i.estado === e[0]; }).length;
      var b = el("button", "mp-chip"); b.type = "button";
      b.appendChild(el("span", null, e[1] + " (" + qtd + ")"));
      b.setAttribute("aria-pressed", e[0] === filtro ? "true" : "false");
      b.addEventListener("click", function () {
        filtro = e[0];
        Array.prototype.forEach.call(chips.querySelectorAll(".mp-chip"), function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
        desenhar();
      });
      chips.appendChild(b);
    });
  }

  fetch("/mapa/mapa.json", { credentials: "same-origin" })
    .then(function (r) { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
    .then(function (m) {
      itens = Array.isArray(m.itens) ? m.itens : [];
      var c = m.contagem || {};
      conta.textContent = itens.length + " coisas no mapa, de " + c.fichas + " registradas. " +
        c.fechadas + " ficam fora por sigilo (polícia, clientes, vida pessoal) e " + c.aposentadas + " foram aposentadas. Refeito em " +
        String(m.gerado_em || "").split("-").reverse().join("/") + ".";
      montarChips(m);
      desenhar();
      if (busca) busca.addEventListener("input", desenhar);
    }, function () { conta.textContent = "Não deu para carregar o mapa agora. Tente recarregar a página."; });
})();
