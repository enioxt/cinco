/* app-roteiro.js — ROTEIRO-GRUPO-001 (fatia 3: gaveta "Roteiro" do EGOS APP, 14/09). Cena:
   o Enio abre o app, vê o roteiro da semana com os itens numerados, quem marcou e quando,
   as notas; edita texto/dono/prazo; adiciona/remove item; marca/desmarca; vê o preview
   exato do texto que iria ao WhatsApp — SEM botão de envio (envio é ato humano por CLI,
   spec explícita da task). Só USA (nunca declara) escaparHtml/horaLocal/abrirGaveta/
   fecharGaveta/grupoDobravel — vem por ÚLTIMO na concatenação, mesmo padrão de
   app-whatsapp.js/app-email.js. Consome /api/roteiros* (rotas-roteiro.ts, motor
   scripts/roteiro-grupo.ts — NENHUM dos dois é tocado por este arquivo, R1.3 ADOPT). */

  var rtSlugAtual = null;
  var rtRoteiroAtual = null; // último Roteiro completo carregado (para reconstruir itens ao salvar)

  function rtQuem() {
    var el = document.getElementById("roteiro-quem");
    var v = el ? el.value.trim() : "";
    return v || "Enio";
  }

  // persiste o "quem marca/anota" por conveniência entre aberturas — não é dado
  // compartilhado, só lembrança local (mesmo padrão de conveniência de outras gavetas).
  function rtCarregarQuemSalvo() {
    try {
      var v = window.localStorage.getItem("egos-roteiro-quem");
      if (v) document.getElementById("roteiro-quem").value = v;
    } catch (e) { /* localStorage pode falhar (aba privada) — não quebra a gaveta */ }
  }
  function rtSalvarQuem() {
    try { window.localStorage.setItem("egos-roteiro-quem", rtQuem()); } catch (e) { /* idem */ }
  }

  function rtSetSalvando(estado, texto) {
    var el = document.getElementById("roteiro-salvando");
    if (!el) return;
    el.className = "rt-salvando" + (estado ? " " + estado : "");
    el.textContent = texto || "";
    if (estado === "ok") setTimeout(function () { el.textContent = ""; el.className = "rt-salvando"; }, 2000);
  }

  // ── MÓDULO na home: número = roteiros ativos, linha1 = o mais recente, linha2 = feitos/total
  async function atualizarModuloRoteiro() {
    if (!document.getElementById("mod-roteiro")) return;
    try {
      var r = await fetch("/api/roteiros");
      var j = await r.json();
      var roteiros = Array.isArray(j.roteiros) ? j.roteiros : [];
      if (!roteiros.length) { preencherModulo("roteiro", "⚪", "⚪ nenhum roteiro criado ainda", ""); return; }
      var top = roteiros.slice().sort(function (a, b) {
        return new Date(b.atualizado_em).getTime() - new Date(a.atualizado_em).getTime();
      })[0];
      var linha1 = escaparHtml(top.titulo) + " · " + horaLocal(top.atualizado_em);
      var linha2 = top.feitos + " de " + top.total + " feito(s) nesta semana";
      var cor = top.total > 0 && top.feitos === top.total ? "verde" : top.feitos > 0 ? "amarelo" : "cinza";
      preencherModulo("roteiro", String(roteiros.length), linha1, linha2, cor);
    } catch (e) {
      preencherModulo("roteiro", "⚪", "🔴 falha ao medir roteiros", "");
    }
  }

  // ── LISTA DE ROTEIROS (seletor) ─────────────────────────────────────────────────────
  async function rtCarregarLista() {
    var meta = document.getElementById("roteiro-meta");
    var vazio = document.getElementById("roteiro-vazio");
    var corpo = document.getElementById("roteiro-corpo");
    var sel = document.getElementById("roteiro-slug");
    if (meta) meta.textContent = "⚪ carregando…";
    try {
      var r = await fetch("/api/roteiros");
      var j = await r.json();
      var roteiros = Array.isArray(j.roteiros) ? j.roteiros : [];
      if (!roteiros.length) {
        if (meta) meta.textContent = "";
        if (vazio) vazio.hidden = false;
        if (corpo) corpo.hidden = true;
        if (sel) sel.innerHTML = "";
        rtSlugAtual = null;
        return;
      }
      if (vazio) vazio.hidden = true;
      if (corpo) corpo.hidden = false;
      var manterAtual = roteiros.some(function (x) { return x.slug === rtSlugAtual; });
      var escolhido = manterAtual ? rtSlugAtual : roteiros[0].slug;
      if (sel) {
        sel.innerHTML = roteiros
          .map(function (x) {
            return '<option value="' + escaparHtml(x.slug) + '">' + escaparHtml(x.titulo) +
              " (" + x.feitos + "/" + x.total + ")</option>";
          })
          .join("");
        sel.value = escolhido;
      }
      await rtCarregarRoteiro(escolhido);
    } catch (e) {
      if (meta) meta.textContent = "🔴 falha ao carregar /api/roteiros: " + e;
    }
  }

  // ── ROTEIRO ESCOLHIDO: detalhe + preview do WhatsApp em paralelo ───────────────────
  async function rtCarregarRoteiro(slug) {
    rtSlugAtual = slug;
    var meta = document.getElementById("roteiro-meta");
    if (meta) meta.textContent = "⚪ carregando roteiro…";
    try {
      var resultados = await Promise.all([
        fetch("/api/roteiros/item?slug=" + encodeURIComponent(slug)),
        fetch("/api/roteiros/whatsapp?slug=" + encodeURIComponent(slug)),
      ]);
      var r = await resultados[0].json();
      var wpp = await resultados[1].json();
      if (r.erro) {
        if (meta) meta.textContent = "🔴 " + r.erro;
        return;
      }
      rtRoteiroAtual = r;
      rtRenderRoteiro(r);
      rtRenderPreview(wpp.texto || "");
      if (meta) meta.textContent = "carregado " + horaLocal(r.atualizado_em);
    } catch (e) {
      if (meta) meta.textContent = "🔴 falha ao carregar o roteiro: " + e;
    }
  }

  function rtRenderCabecalho(r) {
    var el = document.getElementById("roteiro-cabecalho");
    if (!el) return;
    var total = r.itens.length;
    var feitos = r.itens.filter(function (i) { return i.feito; }).length;
    var pct = total ? Math.round((feitos / total) * 100) : 0;
    el.innerHTML =
      '<div class="rt-cabecalho-titulo">' + escaparHtml(r.titulo) + "</div>" +
      '<div class="rt-cabecalho-sub">semana de ' + escaparHtml(r.semana_inicio) + " · grupo " +
      escaparHtml(r.grupo_jid) + " · instância " + escaparHtml(r.instancia) + "</div>" +
      '<div class="rt-cabecalho-sub">' + feitos + " de " + total + " feito(s) — atualizado " +
      horaLocal(r.atualizado_em) + "</div>" +
      '<div class="rt-progresso"><span class="rt-progresso-barra" style="width:' + pct + '%"></span></div>';
  }

  function rtLinhaNota(n) {
    return '<div class="rt-nota"><b>' + escaparHtml(n.por) + "</b> (" + horaLocal(n.em) + "): " +
      escaparHtml(n.texto) + "</div>";
  }

  function rtLinhaItem(item) {
    var notas = (item.notas || []).map(rtLinhaNota).join("");
    var feitoInfo = item.feito
      ? "feito por " + escaparHtml(item.feito_por || "⚪") + " · " + (item.feito_em ? horaLocal(item.feito_em) : "⚪")
      : "";
    return (
      '<div class="rt-item' + (item.feito ? " rt-feito" : "") + '" data-n="' + item.n + '">' +
      '<div class="rt-item-topo">' +
      '<span class="rt-n">#' + item.n + "</span>" +
      '<input type="checkbox" class="rt-check"' + (item.feito ? " checked" : "") + " />" +
      '<input type="text" class="rt-texto" value="' + escaparHtml(item.texto) + '" placeholder="o que precisa ser feito" />' +
      '<input type="text" class="rt-dono" value="' + escaparHtml(item.dono || "") + '" placeholder="dono" />' +
      '<input type="text" class="rt-prazo" value="' + escaparHtml(item.prazo || "") + '" placeholder="prazo" />' +
      '<button type="button" class="rt-remover">remover</button>' +
      "</div>" +
      (feitoInfo ? '<div class="rt-feito-info">' + feitoInfo + "</div>" : "") +
      (notas ? '<div class="rt-notas">' + notas + "</div>" : "") +
      '<div class="rt-anotar"><input type="text" class="rt-nota-input" placeholder="nova nota…" />' +
      '<button type="button" class="rt-nota-add">anotar</button></div>' +
      "</div>"
    );
  }

  function rtRenderRoteiro(r) {
    rtRenderCabecalho(r);
    var lista = document.getElementById("roteiro-itens");
    if (!lista) return;
    lista.innerHTML = r.itens.map(rtLinhaItem).join("");
    rtLigarEventosItens();
  }

  function rtRenderPreview(texto) {
    var pre = document.getElementById("roteiro-preview-texto");
    var cont = document.getElementById("roteiro-preview-cont");
    if (pre) pre.textContent = texto || "⚪ sem texto (roteiro sem itens)";
    if (cont) cont.textContent = texto ? String(texto.split("\n").length) : "0";
  }

  // ── coleta o DOM atual em Item[] (n é a posição — o servidor reconstrói por índice,
  // mesma regra de rotas-roteiro.ts §POST /api/roteiros/itens) e salva ────────────────
  function rtColetarItensDoDom() {
    var linhas = document.querySelectorAll("#roteiro-itens .rt-item");
    var itens = [];
    linhas.forEach(function (linha) {
      itens.push({
        texto: linha.querySelector(".rt-texto").value,
        dono: linha.querySelector(".rt-dono").value,
        prazo: linha.querySelector(".rt-prazo").value,
      });
    });
    return itens;
  }

  async function rtSalvarItens() {
    if (!rtSlugAtual) return;
    var itens = rtColetarItensDoDom();
    if (!itens.length) return; // API recusa lista vazia — nunca manda POST inútil
    rtSetSalvando("", "salvando…");
    try {
      var r = await fetch("/api/roteiros/itens", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug: rtSlugAtual, itens: itens }),
      });
      var j = await r.json();
      if (j.erro) { rtSetSalvando("erro", "🔴 " + j.erro); return; }
      rtRoteiroAtual = j;
      rtSetSalvando("ok", "🟢 salvo");
      // recarrega cabeçalho (progresso) e preview — a lista em si não precisa re-render
      // (evitaria perder o foco de quem está digitando).
      rtRenderCabecalho(j);
      var wpp = await (await fetch("/api/roteiros/whatsapp?slug=" + encodeURIComponent(rtSlugAtual))).json();
      rtRenderPreview(wpp.texto || "");
      rtCarregarLista(); // atualiza o resumo (feitos/total) no <select>
    } catch (e) {
      rtSetSalvando("erro", "🔴 falha de rede: " + e);
    }
  }

  async function rtMarcar(n, desfazer) {
    if (!rtSlugAtual) return;
    rtSetSalvando("", "salvando…");
    try {
      var r = await fetch("/api/roteiros/marcar", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug: rtSlugAtual, n: n, por: rtQuem(), desfazer: !!desfazer }),
      });
      var j = await r.json();
      if (j.erro) { rtSetSalvando("erro", "🔴 " + j.erro); return; }
      rtRoteiroAtual = j;
      rtRenderRoteiro(j);
      rtSetSalvando("ok", "🟢 salvo");
      var wpp = await (await fetch("/api/roteiros/whatsapp?slug=" + encodeURIComponent(rtSlugAtual))).json();
      rtRenderPreview(wpp.texto || "");
      rtCarregarLista();
    } catch (e) {
      rtSetSalvando("erro", "🔴 falha de rede: " + e);
    }
  }

  async function rtAnotar(n, texto) {
    if (!rtSlugAtual || !texto.trim()) return;
    rtSetSalvando("", "salvando…");
    try {
      var r = await fetch("/api/roteiros/anotar", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug: rtSlugAtual, n: n, por: rtQuem(), texto: texto.trim() }),
      });
      var j = await r.json();
      if (j.erro) { rtSetSalvando("erro", "🔴 " + j.erro); return; }
      rtRoteiroAtual = j;
      rtRenderRoteiro(j);
      rtSetSalvando("ok", "🟢 anotado");
    } catch (e) {
      rtSetSalvando("erro", "🔴 falha de rede: " + e);
    }
  }

  function rtAdicionarItem() {
    var lista = document.getElementById("roteiro-itens");
    if (!lista) return;
    var n = lista.querySelectorAll(".rt-item").length + 1;
    var div = document.createElement("div");
    div.innerHTML = rtLinhaItem({ n: n, texto: "", dono: "", prazo: "", feito: false, notas: [] });
    lista.appendChild(div.firstChild);
    rtLigarEventosItens();
    var novo = lista.querySelector('.rt-item[data-n="' + n + '"] .rt-texto');
    if (novo) novo.focus();
  }

  function rtLigarEventosItens() {
    document.querySelectorAll("#roteiro-itens .rt-item").forEach(function (linha) {
      var n = Number(linha.dataset.n);

      var check = linha.querySelector(".rt-check");
      if (check && !check.dataset.ligado) {
        check.dataset.ligado = "1";
        check.addEventListener("change", function () { rtMarcar(n, !check.checked); });
      }

      [".rt-texto", ".rt-dono", ".rt-prazo"].forEach(function (sel) {
        var campo = linha.querySelector(sel);
        if (campo && !campo.dataset.ligado) {
          campo.dataset.ligado = "1";
          campo.addEventListener("blur", rtSalvarItens);
          campo.addEventListener("keydown", function (e) { if (e.key === "Enter") campo.blur(); });
        }
      });

      var remover = linha.querySelector(".rt-remover");
      if (remover && !remover.dataset.ligado) {
        remover.dataset.ligado = "1";
        remover.addEventListener("click", function () {
          if (remover.dataset.confirmar !== "sim") {
            remover.dataset.confirmar = "sim";
            remover.textContent = "remover mesmo?";
            setTimeout(function () { remover.dataset.confirmar = ""; remover.textContent = "remover"; }, 5000);
            return;
          }
          linha.remove();
          // renumera as visuais restantes (n na tela é só rótulo — o servidor recalcula
          // pela posição no array ao salvar) e persiste a remoção.
          document.querySelectorAll("#roteiro-itens .rt-item").forEach(function (l, idx) {
            l.dataset.n = String(idx + 1);
            var span = l.querySelector(".rt-n");
            if (span) span.textContent = "#" + (idx + 1);
          });
          rtSalvarItens();
        });
      }

      var notaInput = linha.querySelector(".rt-nota-input");
      var notaBtn = linha.querySelector(".rt-nota-add");
      if (notaBtn && !notaBtn.dataset.ligado) {
        notaBtn.dataset.ligado = "1";
        notaBtn.addEventListener("click", function () {
          var texto = notaInput.value;
          if (!texto.trim()) return;
          notaInput.value = "";
          rtAnotar(Number(linha.dataset.n), texto);
        });
        notaInput.addEventListener("keydown", function (e) { if (e.key === "Enter") notaBtn.click(); });
      }
    });
  }

  function rtInicializar() {
    var btn = document.getElementById("btn-roteiro");
    var fechar = document.getElementById("roteiro-fechar");
    var sel = document.getElementById("roteiro-slug");
    var quem = document.getElementById("roteiro-quem");
    var addBtn = document.getElementById("roteiro-add-item");
    var copiarBtn = document.getElementById("roteiro-copiar");

    rtCarregarQuemSalvo();
    if (quem) quem.addEventListener("change", rtSalvarQuem);

    // GAVETA-ABRE-CARREGADA-001: quem carrega é a gaveta, não o botão.
    window.__ABRIDORES = window.__ABRIDORES || {};
    window.__ABRIDORES["roteiro-overlay"] = rtCarregarLista;
    if (btn) btn.addEventListener("click", function () { abrirGaveta("roteiro-overlay"); });
    if (fechar) fechar.addEventListener("click", function () { fecharGaveta("roteiro-overlay"); });
    if (sel) sel.addEventListener("change", function () { rtCarregarRoteiro(sel.value); });
    if (addBtn) addBtn.addEventListener("click", rtAdicionarItem);
    if (copiarBtn) {
      copiarBtn.addEventListener("click", async function () {
        var texto = document.getElementById("roteiro-preview-texto").textContent || "";
        var original = copiarBtn.textContent;
        try {
          await navigator.clipboard.writeText(texto);
          copiarBtn.textContent = "copiado ✓";
        } catch (e) {
          copiarBtn.textContent = "🔴 sem permissão de clipboard";
        }
        setTimeout(function () { copiarBtn.textContent = original; }, 2000);
      });
    }
    // atalho de tela: #roteiro abre direto (mesmo padrão de #whatsapp em app-whatsapp.js)
    window.addEventListener("load", function () {
      if (location.hash === "#roteiro" && btn) btn.click();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", rtInicializar);
  } else {
    rtInicializar();
  }
