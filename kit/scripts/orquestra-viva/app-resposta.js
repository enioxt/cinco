/* app-resposta.js — RV-7-RESPOSTA-CLICAVEL-E-LEIGA-001 (corte Enio 08/09). Domínio: os 3
   cartões fixos da resposta (📊/🕳️/➡️, RV-2), o cartão de PCA embutido (parser em
   blocos-resposta.ts:separarPCA), a manchete leiga (blocos-resposta.ts:traduzirParaLeigo)
   com "ver como eu disse" dobrável, o link clicável de caminho (RV-4) e o clique-para-copiar
   de SHA citado. cartaoBlocos/linkarCaminhos MOVIDOS de app-nucleo.js (não escritos de
   novo) — aquele arquivo já estava acima do teto de 600L (WARN) antes desta fatia; o
   código MOVE, não empilha (R-REFACTOR-ORG-001). Só USA (nunca declara) escaparHtml/
   horaLocal/GAVETAS de app-nucleo.js — vem por ÚLTIMO na concatenação (mesmo padrão de
   app-agentes.js/app-layout.js). Servido concatenado por /app.js (scripts/orquestra-viva.ts,
   registrado em APP_JS_PARTS_PATHS). */

  // RV-2-BLOCOS-001 (corte Enio 08/09): os 3 blocos fixos de toda resposta longa
  // (📊/🕳️/➡️) ganham cartão próprio — hoje o renderCorpo não conhece os marcadores
  // e eles caíam como "###" genérico dentro da bolha. Molde visual do .cartao-ferramenta
  // (mesma borda, mesmo painel) — não é o .modulo-card (aquele é clicável e tem ícone).
  var COR_BOLINHA = { verde: "var(--verde)", amarelo: "var(--amarelo)", vermelho: "var(--vermelho)", branco: "var(--texto-fraco)" };
  function shasParaCodigo(texto, shas) {
    var html = escaparHtml(texto);
    (shas || []).forEach(function (sha) {
      html = html.split(escaparHtml(sha)).join('<code class="sha-copiavel" data-sha="' + escaparHtml(sha) + '">' + escaparHtml(sha) + '</code>');
    });
    return html;
  }
  function paragrafos(texto, shas) {
    return String(texto || "").split(/\n{2,}/).filter(Boolean)
      .map(function (p) { return '<p>' + shasParaCodigo(p, shas).replace(/\n/g, '<br>') + '</p>'; }).join("");
  }

  // ── RV-7 fatia 1: cartão da PCA embutida (separarPCA em blocos-resposta.ts) ─────────
  // Cada opção é um BOTÃO clicável — 1 clique posta "PCA-N: <letra>" para o Prime via
  // POST /comando (rota já existente, mesmo padrão de app-agentes.js). A recomendada
  // ganha ⭐; "fecha quando" fica no rodapé do cartão.
  var LETRA_EMOJI_PCA = { a: "🅰", b: "🅱", c: "🅲", d: "🅳" };
  function cartaoPCA(pca) {
    if (!pca) return "";
    var opcoesHtml = (pca.opcoes || []).map(function (o) {
      var recomendada = pca.recomendo && pca.recomendo.letra === o.letra;
      return '<button type="button" class="btn pca-opcao' + (recomendada ? ' pca-recomendada' : '') + '" data-pca="' + escaparHtml(pca.id) + '" data-letra="' + escaparHtml(o.letra) + '" data-rotulo="' + escaparHtml(o.rotulo) + '">' +
        '<span class="pca-letra">' + (LETRA_EMOJI_PCA[o.letra] || o.letra.toUpperCase()) + (recomendada ? ' ⭐' : '') + '</span> ' +
        '<span class="pca-rotulo">' + escaparHtml(o.rotulo) + '</span>' +
        (o.argumento ? '<span class="pca-argumento">' + escaparHtml(o.argumento) + '</span>' : '') +
        '</button>';
    }).join("");
    var titulo = pca.titulo ? (' · ' + escaparHtml(pca.titulo)) : "";
    var fecha = pca.fechaQuando ? '<div class="pca-fecha">fecha quando: ' + escaparHtml(pca.fechaQuando) + '</div>' : "";
    return '<div class="bloco-card bloco-pca" data-pca-id="' + escaparHtml(pca.id) + '">' +
      '<div class="tt-titulo">🔵 ' + escaparHtml(pca.id) + titulo + '</div>' +
      '<div class="pca-decido">' + escaparHtml(pca.decido) + '</div>' +
      '<div class="pca-opcoes">' + opcoesHtml + '</div>' +
      fecha + '</div>';
  }

  function cartaoBlocos(b, leigo) {
    if (!b) return "";
    var itensHtml = (b.diagnosticoItens || []).map(function (it) {
      return '<div class="bloco-item"><span class="bloco-bolinha" style="background:' + (COR_BOLINHA[it.cor] || COR_BOLINHA.branco) + '"></span>' +
        '<span>' + shasParaCodigo(it.texto, b.shas) + '</span></div>';
    }).join("");
    var diag = '<div class="bloco-card"><div class="tt-titulo">📊 Diagnóstico</div>' + (itensHtml || paragrafos(b.diagnostico, b.shas)) + '</div>';
    var fora = '<div class="bloco-card bloco-fora"><div class="tt-titulo">🕳️ O que ficou de fora</div>' + paragrafos(b.fora, b.shas) + '</div>';
    var escolhi = b.escolhiPor ? '<div class="bloco-escolhi"><em>escolhi por: ' + shasParaCodigo(b.escolhiPor, b.shas) + '</em></div>' : "";
    // RV-7 fatia 3: PRÓXIMA TASK ganha um botão "fazer" — 1 clique posta FAZER: <texto>
    // para o Prime; a 1ª frase (até o 1º ponto) vira o rótulo do botão. Texto vazio
    // (turno sem próxima real) não desenha botão nenhum.
    var proxTexto = String(b.proxima || "").trim();
    var proxFrase = proxTexto ? (/^[^.]*\./.exec(proxTexto) || [proxTexto])[0].trim() : "";
    var btnProxima = proxFrase
      ? '<button type="button" class="btn btn-proxima-fazer" data-texto="' + escaparHtml(proxTexto) + '">➡️ fazer: ' + escaparHtml(proxFrase) + '</button>'
      : "";
    var prox = '<div class="bloco-card bloco-proxima"><div class="tt-titulo">➡️ PRÓXIMA TASK</div>' + paragrafos(b.proxima, b.shas) + escolhi + btnProxima + '</div>';
    var pca = cartaoPCA(b.pca);
    var tecnico = '<div class="blocos-resposta">' + diag + fora + prox + pca + '</div>';

    // RV-7 fatia 4: manchete leiga (traduzirParaLeigo, já calculada no servidor) fica
    // SEMPRE visível; o cartão técnico acima dobra sob "ver como eu disse", fechado por
    // padrão. Sem nenhuma manchete calculável (bloco degenerado), volta a mostrar o
    // cartão técnico direto — comportamento idêntico ao de antes desta fatia.
    var linhasLeigo = [];
    if (leigo && leigo.diagnostico) linhasLeigo.push('<div class="leigo-linha">📊 ' + leigo.diagnostico + '</div>');
    if (leigo && leigo.fora) linhasLeigo.push('<div class="leigo-linha leigo-fora">🕳️ ' + leigo.fora + '</div>');
    if (leigo && leigo.proxima) linhasLeigo.push('<div class="leigo-linha leigo-proxima">➡️ ' + leigo.proxima + '</div>');
    if (leigo && leigo.pca) linhasLeigo.push('<div class="leigo-linha leigo-pca">🔵 ' + leigo.pca + '</div>');
    if (!linhasLeigo.length) return tecnico;
    return '<div class="leigo-manchetes">' + linhasLeigo.join("") + '</div>' +
      '<details class="leigo-detalhe"><summary>ver como eu disse</summary>' + tecnico + '</details>';
  }

  // RV-4-CAMINHOS-001 (corte Enio 08/09): caminho citado no texto (t.caminhos, já
  // extraído no servidor por blocos-resposta.ts) vira <a> que chama a rota EXISTENTE
  // /api/documentos/abrir — nenhuma rota nova aqui. Opera sobre HTML JÁ MONTADO
  // (mesmo padrão de shasParaCodigo acima): substring literal, sem regex.
  function linkarCaminhos(html, caminhos) {
    (caminhos || []).forEach(function (c) {
      var esc = escaparHtml(c);
      html = html.split(esc).join('<a href="#" class="link-caminho" data-caminho="' + esc + '">' + esc + '</a>');
    });
    return html;
  }

  // ── RV-7 fatia 5: rodapé clicável — SHA citado (já em <code class="sha-copiavel">
  // via shasParaCodigo) vira texto copiável no clique; sem rota /api/commit nesta fatia
  // (pedido explícito da task: "NÃO crie rota nova"). ─────────────────────────────────
  function copiarTexto(txt) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(txt);
    return Promise.reject(new Error("clipboard indisponível"));
  }

  // ── RV-7 fatia 2: clique numa opção da PCA posta a resposta para o Prime; 2º clique
  // no mesmo cartão não reenvia (trava em data-respondido ANTES do fetch, não depois). ──
  function tratarCliquePCA(btn) {
    var cartao = btn.closest(".bloco-pca");
    if (!cartao || cartao.dataset.respondido === "1") return;
    cartao.dataset.respondido = "1";
    var letra = btn.dataset.letra, id = cartao.dataset.pcaId, rotulo = btn.dataset.rotulo || "";
    var texto = id + ": " + letra;
    cartao.querySelectorAll(".pca-opcao").forEach(function (b) { b.disabled = true; });
    var marcarStatus = function (msg) {
      var status = cartao.querySelector(".pca-status");
      if (!status) { status = document.createElement("div"); status.className = "pca-status"; cartao.appendChild(status); }
      status.textContent = msg;
    };
    var destravar = function () {
      cartao.dataset.respondido = "0";
      cartao.querySelectorAll(".pca-opcao").forEach(function (b) { b.disabled = false; });
    };
    fetch("/comando", { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ acao: "mensagem", agente: "prime", titulo: texto, corpo: texto + (rotulo ? " — " + rotulo : "") }) })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (j.ok) marcarStatus("respondido: " + letra + " às " + horaLocal(new Date().toISOString()));
        else { destravar(); marcarStatus("🔴 " + (j.erro || "não enviou")); }
      })
      .catch(function (err) { destravar(); marcarStatus("🔴 " + String(err)); }); // silencio-ok: erro de rede vira status visível no próprio cartão, nunca silencioso
  }

  function tratarCliqueProxima(btn) {
    if (btn.dataset.pedindo === "1") return;
    btn.dataset.pedindo = "1";
    btn.disabled = true;
    var texto = btn.dataset.texto || btn.textContent;
    fetch("/comando", { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ acao: "mensagem", agente: "prime", titulo: ("FAZER: " + texto.slice(0, 120)), corpo: "FAZER: " + texto }) })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (j.ok) { btn.textContent = "✓ enviado ao Prime"; }
        else { btn.dataset.pedindo = "0"; btn.disabled = false; btn.textContent = "🔴 não enviou — tentar de novo"; }
      })
      .catch(function (err) { btn.dataset.pedindo = "0"; btn.disabled = false; btn.textContent = "🔴 " + String(err); }); // silencio-ok: erro de rede vira texto do próprio botão
  }

  document.getElementById("conversa-fio").addEventListener("click", function (e) {
    var btnPca = e.target.closest && e.target.closest(".pca-opcao");
    if (btnPca) { tratarCliquePCA(btnPca); return; }
    var btnProx = e.target.closest && e.target.closest(".btn-proxima-fazer");
    if (btnProx) { tratarCliqueProxima(btnProx); return; }
    var sha = e.target.closest && e.target.closest(".sha-copiavel");
    if (sha) {
      copiarTexto(sha.dataset.sha || sha.textContent)
        .then(function () { sha.classList.add("sha-copiado"); setTimeout(function () { sha.classList.remove("sha-copiado"); }, 1200); })
        .catch(function () { /* silencio-ok: clipboard indisponível (http/permissão) — o texto continua selecionável à mão, não é erro que precise de voz própria */ });
      return;
    }
    var a = e.target.closest && e.target.closest(".link-caminho");
    if (!a) return;
    e.preventDefault();
    if (a.dataset.pedindo === "1") return; // 1 pedido por clique
    a.dataset.pedindo = "1";
    var caminho = a.getAttribute("data-caminho");
    var marcarRecusado = function (motivo) {
      var irmao = a.nextElementSibling;
      if (!irmao || !irmao.classList || !irmao.classList.contains("link-caminho-recusado")) {
        irmao = document.createElement("span");
        irmao.className = "link-caminho-recusado";
        irmao.textContent = " ⚪";
        a.insertAdjacentElement("afterend", irmao);
      }
      irmao.title = motivo || "não abriu";
    };
    fetch("/api/documentos/abrir", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ caminho: caminho }) })
      .then(function (r) { return r.json().then(function (j) { return { status: r.status, j: j }; }); })
      .then(function (res) {
        a.dataset.pedindo = "0";
        if (!res.j || !res.j.ok) marcarRecusado((res.j && res.j.erro) || ("HTTP " + res.status));
      })
      .catch(function (err) { a.dataset.pedindo = "0"; marcarRecusado(String(err)); }); // silencio-ok: erro vira ⚪ visível no próprio link, com a mensagem — degradação DITA, não muda
  });
