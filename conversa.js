/**
 * conversa.js — o chat "Converse com o EGOS", igual em todas as páginas (30/09; janela de conversa 20/10).
 *
 * Desenha o próprio botão flutuante e a janela; a página só inclui o script. Links com
 * [data-abrir-chat] (ou href="#conversa") abrem a janela. Sem JS de terceiros.
 *
 * Janela (corte 20/10: "deve abrir uma caixa mais fechada indicando claramente ter iniciado o chat ali"):
 * cabeçalho com nome e estado, balões pessoa/casa com hora, campo fixo embaixo, rolagem interna,
 * minimizar e fechar. A mensagem enviada aparece NA HORA como balão ("enviando…"), antes da
 * resposta do servidor; vira "enviada" ou "não enviada · tentar de novo". Na 1ª mensagem a janela
 * marca "Conversa iniciada". A conversa fica guardada nesta aba (sessionStorage) e reaparece em
 * qualquer página do site. "escrevendo…" só aparece quando a própria página está montando a
 * resposta (perguntas comuns, confirmação): nunca finge que uma pessoa está digitando.
 *
 * Perguntas comuns: vêm da página /faq/ (lida aqui com DOMParser, a mesma fonte da página);
 * não vão ao servidor do chat e funcionam com ele fora do ar.
 *
 * Servidor: GET /conversa/status · GET /conversa/respostas · POST /conversa/mensagem {texto}
 * (cookie anônimo do próprio site). Fora do ar = diz fora do ar; nunca finge enviado.
 *
 * Retorno do toque (corte 20/10: "a pessoa vai clicando e nada acontece na hora"): todo clicável
 * ganha estado pressionado; link para outra página do site acende uma barra de carregamento no
 * topo no mesmo instante e o navegador pré-busca a página quando o dedo/mouse para em cima.
 */
(function () {
  // ── retorno do toque: vale para a página inteira, não só para o chat ─────────────────────────
  if (!window.cincoToque) {
    window.cincoToque = true;
    var tq = document.createElement("style");
    tq.textContent =
      "a,button,summary,[role=button],input[type=submit]{-webkit-tap-highlight-color:rgba(35,64,184,.2);touch-action:manipulation}" +
      "a:active,summary:active,[role=button]:active{opacity:.62;transition:none}" +
      "button:not(:disabled):active,input[type=submit]:active,.btn:active{transform:translateY(1px) scale(.97);filter:brightness(.9);transition:none}" +
      "html.cv-indo,html.cv-indo *{cursor:progress!important}" +
      "a.cv-indo-aqui{opacity:.55}" +
      ".cv-barra{position:fixed;top:0;left:0;height:3px;width:0;z-index:99999;background:#2340B8;box-shadow:0 0 6px rgba(35,64,184,.6);pointer-events:none}" +
      "html.cv-indo .cv-barra{animation:cv-barra 6s cubic-bezier(.1,.7,.2,1) forwards}" +
      "@keyframes cv-barra{0%{width:14%}8%{width:35%}40%{width:70%}100%{width:92%}}" +
      "@media (prefers-reduced-motion:reduce){html.cv-indo .cv-barra{animation:none;width:100%;opacity:.7}}";
    document.head.appendChild(tq);
    var barra = document.createElement("div");
    barra.className = "cv-barra";
    barra.setAttribute("aria-hidden", "true");
    var poeBarra = function () { if (!barra.parentNode && document.body) document.body.appendChild(barra); };
    var limpa = function () {
      document.documentElement.classList.remove("cv-indo");
      [].forEach.call(document.querySelectorAll("a.cv-indo-aqui"), function (a) { a.classList.remove("cv-indo-aqui"); a.removeAttribute("aria-busy"); });
    };
    document.addEventListener("click", function (e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var a = e.target && e.target.closest && e.target.closest("a[href]");
      if (!a || a.target === "_blank" || a.hasAttribute("download") || a.hasAttribute("data-abrir-chat")) return;
      var u;
      try { u = new URL(a.href, location.href); } catch (x) { return; }
      if (u.origin !== location.origin) return;
      if (u.pathname === location.pathname && u.search === location.search && u.hash) return; // âncora na mesma página
      poeBarra();
      void barra.offsetWidth; // reinicia a animação
      document.documentElement.classList.add("cv-indo");
      a.classList.add("cv-indo-aqui");
      a.setAttribute("aria-busy", "true");
      setTimeout(limpa, 12000);
    });
    // voltar pelo botão do navegador traz a página da memória: a barra não pode ficar acesa
    window.addEventListener("pageshow", limpa);
    // pré-busca nativa do navegador (Chromium): passou o mouse ou encostou o dedo, a página já vem
    try {
      if (window.HTMLScriptElement && HTMLScriptElement.supports && HTMLScriptElement.supports("speculationrules")) {
        var sr = document.createElement("script");
        sr.type = "speculationrules";
        sr.textContent = JSON.stringify({ prefetch: [{ where: { and: [{ href_matches: "/*" }, { not: { href_matches: "/entrar/*" } }, { not: { href_matches: "/conversa/*" } }] }, eagerness: "moderate" }] });
        document.head.appendChild(sr);
      }
    } catch (x) {}
  }

  if (window.cincoConversa) return;

  var AREAS = [
    { id: "advocacia", nome: "Advocacia" },
    { id: "contabilidade", nome: "Contabilidade" },
    { id: "saude", nome: "Saúde e consultório" },
    { id: "comercio", nome: "Comércio e serviços" },
    { id: "outra", nome: "Outra área" },
  ];
  var DESEJOS = [
    "Organizar documentos e arquivos",
    "Atender clientes pelo WhatsApp",
    "Não perder prazos e rotinas",
    "Saber custo e margem",
    "Entender se a IA serve para o meu trabalho",
    "Outra coisa",
  ];
  // perguntas que o chat oferece primeiro (ids da página /faq/)
  var DESTAQUES = ["o-que-e-egos", "serve-pra-mim", "arquivos-ficam", "quatro-passos", "por-onde-comecar"];
  var CHAVE = "cinco-conversa";

  var AZUL = "#14204A", AZUL2 = "#2340B8";
  var css =
    ".cv-btn{position:fixed;right:16px;bottom:16px;bottom:calc(16px + env(safe-area-inset-bottom,0px));z-index:55;display:flex;align-items:center;gap:10px;font:600 15px/1.2 system-ui,-apple-system,sans-serif;background:" + AZUL + ";color:#fff;border:0;border-radius:999px;padding:12px 18px 12px 14px;min-height:48px;box-shadow:0 6px 20px rgba(10,16,40,.28);cursor:pointer}" +
    ".cv-btn:hover{background:" + AZUL2 + "}.cv-btn svg{width:22px;height:22px;flex:none}" +
    ".cv-btn .cv-ind{width:10px;height:10px;border-radius:50%;background:#9AA3C0;flex:none}" +
    ".cv-btn[data-on='1'] .cv-ind{background:#3DDC84}.cv-btn[aria-expanded='true']{display:none}" +
    ".cv-btn .cv-st{font-weight:500;font-size:13px;opacity:.85}" +
    // o botão é um círculo de 56 px (medido 20/10: com o rótulo à vista ele cobria links no canto da tela);
    // o nome aparece ao passar o mouse ou focar pelo teclado
    ".cv-btn.cv-compacto{width:56px;height:56px;padding:0;justify-content:center}.cv-btn.cv-compacto .cv-rot,.cv-btn.cv-compacto .cv-st{display:none}" +
    ".cv-btn.cv-compacto .cv-ind{position:absolute;top:4px;right:4px;width:12px;height:12px;border:2px solid " + AZUL + "}" +
    ".cv-btn.cv-compacto svg{width:26px;height:26px}" +
    "@media (hover:hover){.cv-btn.cv-compacto:hover,.cv-btn.cv-compacto:focus-visible{width:auto;padding:12px 18px 12px 16px}.cv-btn.cv-compacto:hover .cv-rot,.cv-btn.cv-compacto:focus-visible .cv-rot{display:inline}}" +
    ".cv-btn:focus-visible,.cv-cx button:focus-visible,.cv-cx textarea:focus-visible,.cv-cx a:focus-visible{outline:3px solid #8FA8FF;outline-offset:2px}" +
    ".cv-cx{position:fixed;right:16px;bottom:16px;bottom:calc(16px + env(safe-area-inset-bottom,0px));z-index:60;width:min(400px,calc(100vw - 32px));height:min(620px,calc(100vh - 32px));height:min(620px,calc(100dvh - 32px - env(safe-area-inset-bottom,0px)));overflow:hidden;display:flex;flex-direction:column;background:#fff;color:#111;border:1px solid rgba(20,32,74,.22);border-radius:18px;box-shadow:0 18px 50px rgba(10,16,40,.35),0 2px 6px rgba(10,16,40,.18);font:15px/1.45 system-ui,-apple-system,sans-serif}" +
    ".cv-cx[hidden]{display:none}" +
    ".cv-cx.cv-min{height:auto}.cv-cx.cv-min .cv-corpo,.cv-cx.cv-min .cv-atalhos,.cv-cx.cv-min .cv-pe{display:none}" +
    ".cv-fundo{position:fixed;inset:0;z-index:58;background:rgba(10,16,40,.32)}.cv-fundo[hidden]{display:none}html.cv-aberto,html.cv-aberto body{overflow:hidden}" +
    ".cv-topo{display:flex;align-items:center;gap:10px;padding:10px 8px 10px 14px;background:" + AZUL + ";color:#fff;flex:none}" +
    ".cv-av{width:38px;height:38px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;flex:none}.cv-av svg{width:26px;height:26px}" +
    ".cv-quem{flex:1;min-width:0;cursor:default}.cv-cx.cv-min .cv-quem{cursor:pointer}" +
    ".cv-topo h2{margin:0;font-size:16px;line-height:1.2;color:#fff}.cv-topo p{margin:2px 0 0;font-size:13px;color:#DCE3FF;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" +
    ".cv-ic{font:inherit;display:inline-flex;align-items:center;justify-content:center;width:44px;height:44px;border:0;background:transparent;color:#fff;border-radius:10px;cursor:pointer;flex:none}" +
    ".cv-ic:hover{background:rgba(255,255,255,.14)}.cv-ic svg{width:20px;height:20px}" +
    ".cv-corpo{flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain;padding:14px 12px;display:flex;flex-direction:column;gap:6px;background:#EEF1F7}" +
    ".cv-sep{align-self:center;font-size:12px;font-weight:600;color:#3A4466;background:#DCE2EF;border-radius:999px;padding:3px 12px;margin:6px 0}" +
    ".cv-b{max-width:84%;padding:8px 12px 6px;border-radius:16px;white-space:pre-wrap;overflow-wrap:anywhere;box-shadow:0 1px 1px rgba(10,16,40,.08)}" +
    ".cv-b.eg{background:#fff;color:#111;align-self:flex-start;border-bottom-left-radius:4px}" +
    ".cv-b.eu{background:" + AZUL + ";color:#fff;align-self:flex-end;border-bottom-right-radius:4px}" +
    ".cv-b a{color:" + AZUL2 + ";font-weight:600}" +
    ".cv-h{display:block;text-align:right;font-size:11px;margin-top:2px;color:#5A6385;white-space:nowrap}.cv-b.eu .cv-h{color:#C9D3F5}" +
    ".cv-b.eu.cv-falhou{background:#7A1F12}.cv-b.eu.cv-falhou .cv-h{color:#FFD9D2}" +
    ".cv-de-novo{font:inherit;font-size:12px;font-weight:700;color:#fff;background:transparent;border:1px solid #FFD9D2;border-radius:999px;padding:2px 10px;margin-left:6px;cursor:pointer}" +
    ".cv-esc{align-self:flex-start;background:#fff;border-radius:16px;border-bottom-left-radius:4px;padding:10px 14px;display:flex;align-items:center;gap:8px;font-size:13px;color:#3A4466}" +
    ".cv-esc i{width:7px;height:7px;border-radius:50%;background:#7A84A6;display:inline-block;animation:cv-pula 1s infinite ease-in-out}.cv-esc i:nth-child(2){animation-delay:.15s}.cv-esc i:nth-child(3){animation-delay:.3s}" +
    "@keyframes cv-pula{0%,80%,100%{transform:translateY(0);opacity:.5}40%{transform:translateY(-4px);opacity:1}}" +
    ".cv-chips{display:flex;flex-wrap:wrap;gap:6px;margin:2px 0 4px}" +
    ".cv-chip{font:inherit;font-size:14px;background:#fff;color:" + AZUL + ";border:1.5px solid " + AZUL + ";border-radius:999px;padding:7px 13px;min-height:36px;cursor:pointer;text-align:left}" +
    ".cv-chip:hover{background:" + AZUL + ";color:#fff}" +
    ".cv-atalhos{display:flex;gap:6px;padding:8px 12px 0;overflow-x:auto;flex:none;background:#fff;border-top:1px solid #E1E5EF}" +
    ".cv-atalho{font:inherit;font-size:13px;white-space:nowrap;background:#fff;color:" + AZUL + ";border:1.5px solid #7D88AE;border-radius:999px;padding:6px 12px;min-height:34px;cursor:pointer}" +
    ".cv-atalho:hover{border-color:" + AZUL + "}" +
    ".cv-pe{flex:none;background:#fff;padding:8px 12px 10px;margin:0}" +
    ".cv-linha{display:flex;align-items:flex-end;gap:8px}" +
    ".cv-pe textarea{flex:1;min-width:0;box-sizing:border-box;height:44px;max-height:132px;font:inherit;line-height:1.4;padding:11px 14px;border:1.5px solid #8A93B0;border-radius:22px;resize:none;background:#fff;color:#111}" +
    ".cv-pe textarea::placeholder{color:#5A6385}" +
    ".cv-enviar{display:inline-flex;align-items:center;justify-content:center;width:44px;height:44px;border-radius:50%;background:" + AZUL2 + ";color:#fff;border:0;cursor:pointer;flex:none}" +
    ".cv-enviar svg{width:20px;height:20px}.cv-enviar:disabled{background:#8A93B0;cursor:not-allowed}" +
    ".cv-rodape{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:2px 10px;margin-top:6px;font-size:12px;color:#4A5272}" +
    ".cv-chamar{font:inherit;font-size:13px;font-weight:600;background:transparent;color:" + AZUL2 + ";border:0;text-decoration:underline;text-underline-offset:3px;cursor:pointer;padding:6px 0;min-height:32px}" +
    ".cv-msg{font-size:13px;margin:4px 0 0;color:#7A1F12}.cv-msg:empty{display:none}" +
    "@media (max-width:560px){.cv-cx{right:0;bottom:0;width:100vw;height:calc(100vh - 48px);height:calc(100dvh - 48px);border-radius:18px 18px 0 0;border:0}.cv-cx.cv-min{left:auto;right:12px;bottom:12px;width:calc(100vw - 24px);border-radius:16px}.cv-btn .cv-st{display:none}}" +
    "@media (prefers-reduced-motion:no-preference){.cv-cx{animation:cv-sobe .16s ease-out}@keyframes cv-sobe{from{opacity:0;transform:translateY(10px) scale(.98)}to{opacity:1;transform:none}}}";
  var st = document.createElement("style");
  st.textContent = css;
  document.head.appendChild(st);

  var IC_BALAO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h16v11H9l-5 4z"/></svg>';
  var IC_MIN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 17h12"/></svg>';
  var IC_X = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  var IC_ENV = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3.4 20.4 21 12 3.4 3.6 3.4 10l12 2-12 2z"/></svg>';
  var IC_AV = '<svg viewBox="0 0 100 100" aria-hidden="true"><rect width="100" height="100" rx="50" fill="#2340B8"/><g transform="translate(50 50) scale(.62) translate(-53 -50)" fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"><path d="M68 15 H26 V41"/><path d="M26 41 C40 26 68 28 77 47 C86 68 68 86 50 84 C33 82 25 64 32 53 C40 41 60 44 63 56 C65 64 56 70 49 66"/></g></svg>';

  var btn = document.createElement("button");
  btn.type = "button";
  btn.className = "cv-btn";
  btn.setAttribute("aria-expanded", "false");
  btn.setAttribute("aria-controls", "cv-cx");
  btn.innerHTML = IC_BALAO + '<b class="cv-rot">Converse com o EGOS</b><span class="cv-ind" aria-hidden="true"></span><span class="cv-st">fora do ar</span>';

  var cx = document.createElement("div"); // div, não section: estilo de section da página vazava para a janela (30/09)
  cx.id = "cv-cx";
  cx.className = "cv-cx";
  cx.hidden = true;
  cx.setAttribute("role", "dialog");
  cx.setAttribute("aria-modal", "true");
  cx.setAttribute("aria-labelledby", "cv-tit");
  // fundo: clique fora fecha; enquanto aberta, a página atrás não rola nem recebe foco (B1, 02/10)
  var fundo = document.createElement("div");
  fundo.className = "cv-fundo";
  fundo.hidden = true;
  cx.innerHTML =
    '<div class="cv-topo"><span class="cv-av">' + IC_AV + '</span>' +
    '<div class="cv-quem" id="cv-quem"><h2 id="cv-tit">EGOS</h2><p id="cv-status" role="status">fora do ar</p></div>' +
    '<button type="button" class="cv-ic" id="cv-min" aria-label="Minimizar a conversa" title="Minimizar">' + IC_MIN + '</button>' +
    '<button type="button" class="cv-ic cv-x" aria-label="Fechar a conversa" title="Fechar">' + IC_X + '</button></div>' +
    '<div class="cv-corpo" id="cv-corpo" aria-live="polite"></div>' +
    '<div class="cv-atalhos"><button type="button" class="cv-atalho" id="cv-perguntas">Perguntas comuns</button>' +
    '<button type="button" class="cv-atalho" id="cv-cinco">Explique de um jeito simples</button></div>' +
    '<form class="cv-pe" id="cv-form"><label class="sr" style="position:absolute;left:-9999px" for="cv-txt">Sua mensagem</label>' +
    '<div class="cv-linha"><textarea id="cv-txt" maxlength="1000" rows="1" placeholder="Escreva sua mensagem"></textarea>' +
    '<button type="submit" class="cv-enviar" id="cv-enviar" aria-label="Enviar" title="Enviar" disabled>' + IC_ENV + '</button></div>' +
    '<p class="cv-msg" id="cv-msg" role="status"></p>' +
    '<div class="cv-rodape"><span>Não escreva CPF, telefone ou dados de outra pessoa.</span>' +
    '<button type="button" class="cv-chamar" id="cv-chamar">Chamar o Enio</button></div></form>';

  document.body.appendChild(btn);
  document.body.appendChild(fundo);
  document.body.appendChild(cx);

  var $ = function (s) { return cx.querySelector(s); };
  var corpo = $("#cv-corpo"), txt = $("#cv-txt"), env = $("#cv-enviar"), msg = $("#cv-msg"), stEl = $("#cv-status");
  var on = false, conhecido = false, timer = null, vistas = {}, iniciado = false, apresentado = false, hist = [];

  function guarda(k, v) { try { if (v === undefined) return sessionStorage.getItem(k); sessionStorage.setItem(k, v); } catch (e) { return null; } }
  function hora(t) { var d = t ? new Date(t) : new Date(); return ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2); }
  function salva() { try { sessionStorage.setItem(CHAVE, JSON.stringify(hist.slice(-80))); } catch (e) {} }
  function rola() { corpo.scrollTop = corpo.scrollHeight; }

  // balão: quem = "eg" (a casa) ou "eu" (a pessoa); o = {link, t, estado, naoGuarda}
  function bolha(texto, quem, lnk, o) {
    o = o || {};
    var reg = { q: quem, x: String(texto), t: o.t || Date.now() };
    if (lnk && lnk.href) reg.l = { href: lnk.href, texto: lnk.texto };
    var d = desenha(reg);
    if (!o.naoGuarda) { hist.push(reg); salva(); }
    d._reg = reg;
    return d;
  }
  function desenha(reg) {
    var d = document.createElement("div");
    d.className = "cv-b " + reg.q;
    d.appendChild(document.createTextNode(reg.x));
    if (reg.l && reg.l.href) {
      var a = document.createElement("a");
      a.href = reg.l.href;
      a.textContent = reg.l.texto || "Ler mais";
      d.appendChild(document.createTextNode("\n"));
      d.appendChild(a);
    }
    var h = document.createElement("span");
    h.className = "cv-h";
    h.textContent = hora(reg.t) + (reg.q === "eu" && reg.e ? " · " + reg.e : "");
    d.appendChild(h);
    if (reg.q === "eu" && reg.falhou) d.classList.add("cv-falhou");
    corpo.appendChild(d);
    rola();
    return d;
  }
  function marcaBalao(d, estado, falhou) {
    d._reg.e = estado; d._reg.falhou = !!falhou; salva();
    d.querySelector(".cv-h").textContent = hora(d._reg.t) + " · " + estado;
    d.classList.toggle("cv-falhou", !!falhou);
  }
  function separador(t) {
    var s = document.createElement("div");
    s.className = "cv-sep";
    s.textContent = "Conversa iniciada às " + hora(t);
    corpo.appendChild(s);
    rola();
  }
  // "escrevendo…": só enquanto a própria página monta a resposta
  function escrevendo(ms, depois) {
    var e = document.createElement("div");
    e.className = "cv-esc";
    e.setAttribute("aria-label", "EGOS está escrevendo");
    e.innerHTML = '<i></i><i></i><i></i><span>escrevendo…</span>';
    corpo.appendChild(e);
    rola();
    setTimeout(function () { e.remove(); depois(); }, ms);
  }
  function chips(lista, aoEscolher, sugestao) {
    if (sugestao) { // só UMA fileira de sugestões vale por vez: a nova troca a velha
      [].slice.call(corpo.querySelectorAll(".cv-chips[data-sug]")).forEach(function (x) { x.remove(); });
    }
    var w = document.createElement("div");
    w.className = "cv-chips";
    if (sugestao) w.setAttribute("data-sug", "1");
    lista.forEach(function (it) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "cv-chip";
      b.textContent = it.nome || it;
      b.addEventListener("click", function () { w.remove(); aoEscolher(it); });
      w.appendChild(b);
    });
    corpo.appendChild(w);
    rola();
  }
  function cresce() { txt.style.height = "44px"; txt.style.height = Math.min(132, Math.max(44, txt.scrollHeight + 3)) + "px"; }
  function atualizaEnviar() { env.disabled = !txt.value.trim(); }
  function tempo(u, o) {
    var ct = new AbortController(), t = setTimeout(function () { ct.abort(); }, 6000);
    o = o || {}; o.signal = ct.signal;
    return fetch(u, o).then(function (r) { clearTimeout(t); return r; }, function (e) { clearTimeout(t); throw e; });
  }
  function textoEstado() {
    if (!conhecido) return "verificando…";
    if (iniciado) return on ? "Conversa iniciada · disponível" : "Conversa iniciada · envio fora do ar";
    return on ? "Disponível · uma pessoa responde" : "Fora do ar · perguntas comuns funcionam";
  }
  function pinta() {
    btn.setAttribute("data-on", on ? "1" : "0");
    btn.setAttribute("aria-label", (iniciado ? "Voltar à conversa" : "Converse com o EGOS") + (conhecido ? (on ? " (disponível)" : " (fora do ar)") : ""));
    btn.title = iniciado ? "Voltar à conversa" : "Converse com o EGOS";
    btn.querySelector(".cv-st").textContent = !conhecido ? "" : on ? "disponível" : "fora do ar";
    btn.querySelector(".cv-rot").textContent = iniciado ? "Voltar à conversa" : "Converse com o EGOS";
    stEl.textContent = textoEstado();
  }
  function marcar(ok) {
    on = !!ok; conhecido = true;
    if (on && msg.textContent === DESLIGADO) msg.textContent = ""; // voltou ao ar: a linha velha sai
    pinta();
    atualizaEnviar();
  }
  function status() {
    return tempo("/conversa/status", { cache: "no-store" })
      .then(function (r) { if (!r.ok) throw new Error("http " + r.status); return r.json().catch(function () { return {}; }); })
      .then(function (j) { marcar(!(j && (j.disponivel === false || j.ok === false))); })
      .catch(function () { marcar(false); });
  }
  function respostas() {
    return tempo("/conversa/respostas", { cache: "no-store", credentials: "same-origin" })
      .then(function (r) { if (!r.ok) throw new Error("http " + r.status); return r.json(); })
      .then(function (j) {
        var a = Array.isArray(j) ? j : (j && Array.isArray(j.respostas) ? j.respostas : []);
        a.forEach(function (x) {
          var t = String((x && (x.texto || x.resposta)) || "");
          var k = (x && x.id) || t;
          if (t && !vistas[k]) { vistas[k] = 1; if (!hist.some(function (h) { return h.q === "eg" && h.k === k; })) { var d = bolha(t, "eg"); d._reg.k = k; salva(); } }
        });
      })
      .catch(function () {});
  }
  function comeca(t) {
    if (iniciado) return;
    iniciado = true;
    guarda("cinco-conversa-inicio", String(t));
    separador(t);
    pinta();
  }

  // restaura a conversa desta aba (veio de outra página do site)
  (function () {
    var h = null, ini = +(guarda("cinco-conversa-inicio") || 0);
    try { h = JSON.parse(sessionStorage.getItem(CHAVE) || "null"); } catch (e) {}
    // só volta o que já virou conversa (houve mensagem enviada); antes disso, a apresentação recomeça com os botões
    if (!Array.isArray(h) || !h.length || !ini) { try { sessionStorage.removeItem(CHAVE); } catch (e) {} return; }
    hist = h; apresentado = true;
    h.forEach(function (reg) {
      if (ini && reg.t >= ini && !iniciado) { iniciado = true; separador(ini); }
      if (reg.q === "eu" && reg.e === "enviando…") { reg.e = "não confirmada"; }
      if (reg.k) vistas[reg.k] = 1;
      desenha(reg);
    });
    salva();
  })();

  function inicio() {
    if (apresentado) return;
    apresentado = true;
    bolha("Oi! Sou o EGOS. Ajudo a pôr uma IA para trabalhar no seu computador, com os seus arquivos. Em que área você trabalha?", "eg");
    var area = guarda("cinco-area");
    if (area) { perguntaDesejo(area); return; }
    chips(AREAS, function (a) {
      bolha(a.nome, "eu", null, { naoGuarda: false });
      guarda("cinco-area", a.nome);
      perguntaDesejo(a.nome);
    });
  }
  function perguntaDesejo(area) {
    bolha("O que você quer resolver ou melhorar?", "eg");
    chips(DESEJOS, function (d) {
      txt.value = d === "Outra coisa" ? "Trabalho com " + area.toLowerCase() + ". Quero " : "Trabalho com " + area.toLowerCase() + ". Quero: " + d.toLowerCase() + ".";
      bolha("Deixei a mensagem pronta no campo abaixo. Complete do seu jeito e envie.", "eg");
      txt.focus();
      txt.setSelectionRange(txt.value.length, txt.value.length);
      cresce();
      atualizaEnviar();
    });
  }

  // ── perguntas comuns e "jeito simples": vêm da página /faq/ (a mesma fonte), nada vai ao servidor do chat ──
  var faqP = null;
  function lerFaq(html) {
    var doc = new DOMParser().parseFromString(html, "text/html");
    var f = { grupos: [], destaques: DESTAQUES, explicacao_simples: "" };
    var cs = doc.querySelector(".caixa-simples p");
    f.explicacao_simples = cs ? cs.textContent.trim() : "";
    [].forEach.call(doc.querySelectorAll("section.faq-grupo"), function (s) {
      var g = { titulo: (s.querySelector("h2") || {}).textContent || "", perguntas: [] };
      [].forEach.call(s.querySelectorAll("details.faq-item"), function (d) {
        var simp = d.querySelector(".simples"), rot = simp && simp.querySelector(".faq-rot"), mais = d.querySelector("a.faq-mais");
        var st = simp ? simp.textContent.replace(rot ? rot.textContent : "", "").trim() : "";
        g.perguntas.push({
          id: d.id.replace(/^p-/, ""),
          pergunta: (d.querySelector("summary") || {}).textContent || "",
          resposta: ((d.querySelector(".completa") || {}).textContent || "").trim(),
          simples: st,
          link: mais ? mais.getAttribute("href") : "",
          link_texto: mais ? mais.textContent.trim() : "",
        });
      });
      f.grupos.push(g);
    });
    if (!f.grupos.length) throw new Error("faq vazia");
    return f;
  }
  function faq() {
    if (!faqP) {
      faqP = tempo("/faq/", { credentials: "same-origin" })
        .then(function (r) { if (!r.ok) throw new Error("http " + r.status); return r.text(); })
        .then(lerFaq)
        .catch(function (e) { faqP = null; throw e; });
    }
    return faqP;
  }
  function comFaq(fn) {
    var pronto = false, f = null, falhou = false;
    faq().then(function (x) { f = x; pronto = true; }, function () { falhou = true; pronto = true; });
    escrevendo(450, function espera() {
      if (!pronto) { setTimeout(espera, 120); return; }
      if (falhou) bolha("Não consegui abrir as perguntas agora. Elas estão na página de perguntas comuns.", "eg", { href: "/faq/", texto: "Abrir perguntas comuns" });
      else fn(f);
    });
  }
  function achar(f, id) {
    var r = null;
    (f.grupos || []).forEach(function (g) { (g.perguntas || []).forEach(function (q) { if (q.id === id) r = q; }); });
    return r;
  }
  // o texto "Quero falar com o Enio." marca o pedido de conversa com ele (o aviso chega no WhatsApp dele)
  function pedidoPessoa(extra) {
    var area = guarda("cinco-area");
    return "Quero falar com o Enio." + (area ? " Área: " + area + "." : "") + (extra ? " " + extra : "");
  }
  // "Chamar o Enio": o balão aparece na hora; o texto enviado leva a marca do pedido
  function enviaPedido(extra) {
    abrir(true);
    comeca(Date.now());
    var b = bolha(extra ? "Chamar o Enio: " + extra : "Chamar o Enio", "eu");
    b._envio = pedidoPessoa(extra);
    enviar(b._envio, { balao: b, pessoa: true });
  }
  function listaPerguntas(f, intro) {
    var lista = (f.destaques || []).map(function (id) { return achar(f, id); }).filter(Boolean);
    if (!lista.length) lista = (f.grupos[0] || { perguntas: [] }).perguntas.slice(0, 5);
    bolha(intro, "eg");
    chips(lista.map(function (q) { return { nome: q.pergunta, q: q }; }), function (it) { responder(f, it.q); }, true);
  }
  function seguintes(f, q, jaSimples) {
    var op = [];
    if (!jaSimples && q && q.simples) op.push({ nome: "Explicar de outro jeito", a: "simples" });
    op.push({ nome: "Outra pergunta", a: "lista" }, { nome: "Chamar o Enio", a: "pessoa" });
    chips(op, function (it) {
      if (it.a === "pessoa") { enviaPedido(); return; }
      bolha(it.nome, "eu");
      if (it.a === "simples") escrevendo(400, function () { bolha(q.simples, "eg"); seguintes(f, q, true); });
      else if (it.a === "lista") escrevendo(300, function () { listaPerguntas(f, "Qual outra pergunta?"); });
    }, true);
  }
  function responder(f, q) {
    bolha(q.pergunta, "eu");
    escrevendo(450, function () {
      bolha(q.resposta, "eg", q.link && q.link !== "/#conversa" ? { href: q.link, texto: q.link_texto } : null);
      seguintes(f, q, false);
    });
  }
  function perguntasComuns() {
    abrir(true);
    bolha("Perguntas comuns", "eu");
    comFaq(function (f) {
      listaPerguntas(f, "Escolha uma pergunta. A resposta aparece aqui.");
    });
  }
  function simples() {
    abrir(true);
    bolha("Explique de um jeito simples", "eu");
    comFaq(function (f) {
      bolha(f.explicacao_simples || "O EGOS é um ajudante de IA que trabalha no seu computador, com a sua permissão.", "eg");
      chips([{ nome: "Chamar o Enio", a: "pessoa" }, { nome: "Ver perguntas comuns", a: "lista" }], function (it) {
        if (it.a === "pessoa") { enviaPedido(); return; }
        bolha(it.nome, "eu");
        escrevendo(300, function () { listaPerguntas(f, "Escolha uma pergunta. A resposta aparece aqui."); });
      }, true);
    });
  }

  var DESLIGADO = "O envio está fora do ar agora. Sua mensagem ficou no balão; toque em “tentar de novo” daqui a pouco.";
  var confirmou = false;
  // envia: o balão aparece na hora; o servidor só confirma
  function enviar(texto, o) {
    o = o || {};
    var t = String(texto || "").trim();
    if (!t) return;
    msg.textContent = "";
    var b = o.balao;
    if (!b) {
      comeca(Date.now());
      [].slice.call(corpo.querySelectorAll(".cv-chips")).forEach(function (x) { x.remove(); }); // escreveu do próprio jeito: os botões saem
      b = bolha(t, "eu");
      b._envio = t;
      txt.value = ""; cresce(); atualizaEnviar();
    }
    marcaBalao(b, "enviando…");
    var falha = function () {
      marcaBalao(b, "não enviada", true);
      if (!b.querySelector(".cv-de-novo")) {
        var r = document.createElement("button");
        r.type = "button"; r.className = "cv-de-novo"; r.textContent = "tentar de novo";
        r.addEventListener("click", function () { r.remove(); status().then(function () { enviar(b._envio || b._reg.x, { balao: b, pessoa: o.pessoa }); }); });
        b.querySelector(".cv-h").appendChild(r);
      }
    };
    if (conhecido && !on) { falha(); msg.textContent = DESLIGADO; return; } // servidor fora: diz na tela, não finge envio
    tempo("/conversa/mensagem", {
      method: "POST", credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texto: (b._envio || t).slice(0, 1000) }),
    })
      .then(function (r) {
        if (!r.ok) throw new Error("http " + r.status);
        marcaBalao(b, "enviada ✓");
        if (!on) marcar(true);
        if (o.pessoa) {
          escrevendo(450, function () { bolha("Pedido enviado ao Enio. Ele recebe o aviso no WhatsApp e responde aqui, nesta conversa.", "eg"); });
        } else if (!confirmou) {
          confirmou = true;
          escrevendo(500, function () { bolha("Recebi sua mensagem. Uma pessoa lê e responde aqui, nesta conversa. Pode continuar escrevendo.", "eg"); });
        }
        respostas();
      })
      .catch(function () { falha(); status(); });
  }

  var minimizada = false;
  function abrir(semFoco) {
    guarda("cinco-conversa-aberta", "1");
    cx.hidden = false;
    minimiza(false);
    btn.setAttribute("aria-expanded", "true");
    inicio();
    faq().catch(function () {}); // deixa as perguntas prontas: a resposta aparece na hora
    status().then(respostas);
    clearInterval(timer);
    timer = setInterval(function () { status().then(respostas); }, 20000);
    rola();
    if (!semFoco) txt.focus();
  }
  function minimiza(sim) {
    minimizada = !!sim;
    cx.classList.toggle("cv-min", minimizada);
    cx.setAttribute("aria-modal", minimizada ? "false" : "true");
    fundo.hidden = minimizada;
    document.documentElement.classList.toggle("cv-aberto", !minimizada);
    var m = $("#cv-min");
    m.setAttribute("aria-label", minimizada ? "Abrir a conversa" : "Minimizar a conversa");
    m.title = minimizada ? "Abrir" : "Minimizar";
    m.style.transform = minimizada ? "rotate(180deg)" : "";
    m.innerHTML = minimizada ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>' : IC_MIN;
    if (!minimizada) rola();
  }
  function fechar() {
    guarda("cinco-conversa-aberta", "0");
    cx.hidden = true;
    fundo.hidden = true;
    document.documentElement.classList.remove("cv-aberto");
    btn.setAttribute("aria-expanded", "false");
    clearInterval(timer);
    pinta();
    btn.focus();
  }

  btn.addEventListener("click", function () { abrir(); });
  $(".cv-x").addEventListener("click", fechar);
  $("#cv-min").addEventListener("click", function () { minimiza(!minimizada); if (!minimizada) txt.focus(); });
  $("#cv-quem").addEventListener("click", function () { if (minimizada) { minimiza(false); txt.focus(); } });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !cx.hidden && !minimizada) fechar(); });
  fundo.addEventListener("click", fechar); // clique fora fecha (B1, 02/10); a conversa continua guardada
  // trava de foco: Tab e Shift+Tab giram dentro da janela enquanto ela está aberta (minimizada, a página volta a valer)
  cx.addEventListener("keydown", function (e) {
    if (e.key !== "Tab" || minimizada) return;
    var f = [].filter.call(cx.querySelectorAll('button,textarea,a[href],input,select,[tabindex]:not([tabindex="-1"])'), function (el) { return !el.disabled && el.offsetParent !== null; });
    if (!f.length) return;
    var pri = f[0], ult = f[f.length - 1];
    if (e.shiftKey && document.activeElement === pri) { e.preventDefault(); ult.focus(); }
    else if (!e.shiftKey && document.activeElement === ult) { e.preventDefault(); pri.focus(); }
  });
  txt.addEventListener("input", function () { cresce(); atualizaEnviar(); });
  txt.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); enviar(txt.value); }
  });
  $("#cv-form").addEventListener("submit", function (e) { e.preventDefault(); enviar(txt.value); });
  $("#cv-chamar").addEventListener("click", function () {
    var extra = txt.value.trim();
    txt.value = ""; cresce(); atualizaEnviar();
    enviaPedido(extra);
  });
  $("#cv-perguntas").addEventListener("click", perguntasComuns);
  $("#cv-cinco").addEventListener("click", simples);
  document.addEventListener("click", function (e) {
    var a = e.target && e.target.closest && e.target.closest("[data-abrir-chat],a[href='#conversa'],a[href='/#conversa']");
    if (!a) return;
    e.preventDefault(); // o chat existe em toda página: abre aqui mesmo
    abrir();
  });

  btn.classList.add("cv-compacto");
  pinta();
  window.cincoConversa = { abrir: abrir, fechar: fechar, minimizar: function () { minimiza(true); } };
  if (location.hash === "#conversa" || location.hash === "#privacidade") abrir();
  else if (iniciado && guarda("cinco-conversa-aberta") === "1") {
    // conversa em andamento vinda de outra página: a janela segue à vista, minimizada, sem cobrir a página
    cx.hidden = false; btn.setAttribute("aria-expanded", "true"); minimiza(true);
    status().then(respostas);
  } else status();
})();
