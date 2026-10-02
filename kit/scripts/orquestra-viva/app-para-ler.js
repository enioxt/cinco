/* app-para-ler.js — PARA-LER-001 (corte Enio 15/09: "as peças que você está dizendo para eu
   ler, o EGOS APP deveria ser eficiente o suficiente para estar jogando elas na minha cara, e
   eu já ter lido; deveria estar muito fácil o acesso a elas"). Arquivo NOVO, servido por
   ÚLTIMO (depois de app-gastos.js) por /app.js — só USA (nunca declara) escaparHtml/horaLocal
   dos anteriores (mesmo contrato dos módulos que vieram antes, ver topo de app-documentos.js).

   Card autocontido (poll próprio, sem depender do ciclo de atualizarModuloCatalogo() em
   app-nucleo.js — mesmo padrão de app-notificacoes.js): lê GET /api/para-ler, mostra o total
   pendente e as 3 mais novas com título+motivo. "abrir" chama POST .../abrir (abre o arquivo
   E marca lido, numa chamada — item 4 da task); "li" chama POST .../lido sem abrir nada. */

(function () {
  var PARA_LER_POLL_MS = 10000;

  function escapa(t) {
    if (typeof escaparHtml === "function") return escaparHtml(t);
    return String(t == null ? "" : t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function linhaItem(item) {
    // DENSIDADE-PARA-LER-001 (15/09): título/motivo truncam em 2 linhas por CSS
    // (app-para-ler.css); title="" carrega o texto INTEIRO para o tooltip nativo —
    // truncar nunca é perder, é escolher o que aparece primeiro (mesma régua do
    // resto do app, ver data-tt-* nos outros cards).
    return (
      '<div class="para-ler-item" data-para-ler-id="' + escapa(item.id) + '">' +
      '<div class="pl-texto">' +
      '<div class="pl-titulo" title="' + escapa(item.titulo) + '">' + escapa(item.titulo) + "</div>" +
      '<div class="pl-motivo" title="' + escapa(item.motivo) + '">' + escapa(item.motivo) + "</div>" +
      '<div class="pl-origem">' + escapa(item.origem) + "</div>" +
      "</div>" +
      '<div class="pl-acoes">' +
      '<button type="button" class="btn-header pl-abrir" data-pl-abrir="' + escapa(item.id) + '">abrir</button>' +
      '<button type="button" class="btn-header pl-li" data-pl-li="' + escapa(item.id) + '">li</button>' +
      "</div>" +
      "</div>"
    );
  }

  function renderCard(itens, total) {
    var numeroEl = document.getElementById("para-ler-numero");
    var listaEl = document.getElementById("para-ler-lista");
    var vazioEl = document.getElementById("para-ler-vazio");
    var cardEl = document.getElementById("mod-para-ler");
    if (!numeroEl || !listaEl || !vazioEl) return;
    numeroEl.textContent = typeof total === "number" ? String(total) : "⚪";
    if (cardEl) cardEl.classList.toggle("pl-tem-pendente", total > 0);
    if (!itens.length) {
      listaEl.innerHTML = "";
      listaEl.hidden = true;
      vazioEl.hidden = false;
      vazioEl.textContent = "🟢 nada esperando você";
      return;
    }
    vazioEl.hidden = true;
    listaEl.hidden = false;
    // já vem ordenado por criado desc do servidor (listarPendentes) — as 3 mais novas primeiro.
    listaEl.innerHTML = itens.slice(0, 3).map(linhaItem).join("");
  }

  async function carregarParaLer() {
    try {
      var r = await fetch("/api/para-ler");
      var j = await r.json();
      var itens = Array.isArray(j.itens) ? j.itens : [];
      var total = typeof j.total === "number" ? j.total : itens.length;
      renderCard(itens, total);
    } catch (e) {
      var numeroEl = document.getElementById("para-ler-numero");
      if (numeroEl) numeroEl.textContent = "⚪";
    }
  }

  async function marcarLi(id, btn) {
    var original = btn.textContent;
    btn.disabled = true;
    btn.textContent = "…";
    try {
      var r = await fetch("/api/para-ler/" + encodeURIComponent(id) + "/lido", { method: "POST" });
      var j = await r.json();
      if (!j.ok) {
        btn.textContent = "🔴";
        setTimeout(function () { btn.textContent = original; btn.disabled = false; }, 1500);
        return;
      }
      carregarParaLer();
    } catch (e) {
      btn.textContent = "🔴";
      setTimeout(function () { btn.textContent = original; btn.disabled = false; }, 1500);
    }
  }

  async function marcarAbrir(id, btn) {
    var original = btn.textContent;
    btn.disabled = true;
    btn.textContent = "abrindo…";
    try {
      var r = await fetch("/api/para-ler/" + encodeURIComponent(id) + "/abrir", { method: "POST" });
      var j = await r.json();
      if (!j.ok) {
        btn.textContent = "🔴 " + (j.erro || "falhou");
        setTimeout(function () { btn.textContent = original; btn.disabled = false; }, 2500);
        return;
      }
      carregarParaLer();
    } catch (e) {
      btn.textContent = "🔴 falha de rede";
      setTimeout(function () { btn.textContent = original; btn.disabled = false; }, 2500);
    }
  }

  document.addEventListener("click", function (e) {
    var abrir = e.target.closest && e.target.closest("[data-pl-abrir]");
    var li = e.target.closest && e.target.closest("[data-pl-li]");
    if (abrir) {
      e.stopPropagation();
      marcarAbrir(abrir.dataset.plAbrir, abrir);
      return;
    }
    if (li) {
      e.stopPropagation();
      marcarLi(li.dataset.plLi, li);
    }
  });

  carregarParaLer();
  setInterval(carregarParaLer, PARA_LER_POLL_MS);
})();
