/**
 * conversa.js — o chat "Converse com o EGOS", igual em todas as páginas (30/09).
 *
 * Desenha o próprio botão flutuante e a janela; a página só inclui o script. Links com
 * [data-abrir-chat] (ou href="#conversa") abrem a janela. Sem JS de terceiros.
 *
 * Fluxo (pedido Enio 30/09): o EGOS se apresenta e pergunta a ÁREA, depois o que a pessoa
 * quer resolver — botões prontos que montam a mensagem, editável antes de enviar. Enter envia,
 * Shift+Enter pula linha. "Chamar o Enio" manda a mensagem marcada como pedido de conversa
 * com ele (o aviso chega no WhatsApp dele).
 *
 * Perguntas comuns (pedido Enio 30/09): o atalho "Perguntas comuns" e o botão "Não entendi nada, explique
 * como se eu tivesse 5 anos" ficam sempre visíveis e respondem NA HORA, com o texto de /faq.json (o mesmo
 * arquivo que gera a página /faq/). Não vão ao servidor e não viram mensagem para o Enio; com o servidor
 * fora do ar continuam funcionando, só o envio fica desligado.
 *
 * Servidor: GET /conversa/status · GET /conversa/respostas · POST /conversa/mensagem {texto}
 * (cookie anônimo do próprio site). Fora do ar = diz fora do ar; nunca finge enviado.
 */
(function () {
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

  var css =
    ".cv-btn{position:fixed;right:16px;bottom:16px;z-index:55;display:flex;align-items:center;gap:8px;font:600 14px/1.2 system-ui,-apple-system,sans-serif;background:#fff;color:#333;border:2px solid #111;border-radius:999px;padding:10px 16px;box-shadow:0 4px 16px rgba(0,0,0,.18);cursor:pointer}" +
    ".cv-btn b{color:#111}.cv-btn .cv-ind{width:10px;height:10px;border-radius:50%;border:2px solid #777}" +
    ".cv-btn[data-on='1'] .cv-ind{background:#1d7a3a;border-color:#1d7a3a}.cv-btn[aria-expanded='true']{display:none}" +
    ".cv-btn:focus-visible,.cv-cx button:focus-visible,.cv-cx textarea:focus-visible,.cv-cx a:focus-visible{outline:3px solid #2340B8;outline-offset:2px}" +
    ".cv-cx{position:fixed;right:12px;bottom:12px;z-index:60;width:min(390px,calc(100vw - 24px));max-height:calc(100vh - 24px);max-height:calc(100dvh - 24px - env(safe-area-inset-bottom,0px));margin-bottom:env(safe-area-inset-bottom,0px);overflow:auto;overscroll-behavior:contain;display:flex;flex-direction:column;background:#fff;color:#111;border:2px solid #111;border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,.25);font:15px/1.45 system-ui,-apple-system,sans-serif}" +
    ".cv-cx[hidden]{display:none}" +
    ".cv-fundo{position:fixed;inset:0;z-index:58;background:rgba(10,16,40,.28)}.cv-fundo[hidden]{display:none}html.cv-aberto,html.cv-aberto body{overflow:hidden}" +
    ".cv-topo{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:12px 14px;border-bottom:1px solid #e3e3e3}" +
    ".cv-topo h2{margin:0;font-size:16px}.cv-topo p{margin:2px 0 0;font-size:13px;color:#444}" +
    ".cv-x{font:inherit;border:1px solid #111;background:#fff;color:#111;border-radius:8px;padding:4px 10px;cursor:pointer}" +
    ".cv-corpo{flex:1;overflow:auto;padding:12px 14px;display:flex;flex-direction:column;gap:8px}" +
    ".cv-b{max-width:88%;padding:9px 12px;border-radius:14px;white-space:pre-wrap;overflow-wrap:anywhere}" +
    ".cv-b.eg{background:#f1f3f8;align-self:flex-start;border-bottom-left-radius:4px}" +
    ".cv-b.eu{background:#14204A;color:#fff;align-self:flex-end;border-bottom-right-radius:4px}" +
    ".cv-chips{display:flex;flex-wrap:wrap;gap:6px}" +
    ".cv-chip{font:inherit;font-size:14px;background:#fff;color:#14204A;border:1.5px solid #14204A;border-radius:999px;padding:6px 12px;cursor:pointer}" +
    ".cv-chip:hover{background:#14204A;color:#fff}" +
    ".cv-atalhos{display:flex;flex-wrap:wrap;gap:6px;padding:8px 14px 0;border-top:1px solid #e3e3e3}" +
    ".cv-atalho{font:inherit;font-size:13px;line-height:1.25;background:#fff;color:#14204A;border:1.5px solid #14204A;border-radius:999px;padding:5px 10px;cursor:pointer;text-align:left}" +
    ".cv-atalho:hover{background:#14204A;color:#fff}.cv-b a{color:#14204A;font-weight:600}" +
    ".cv-atalhos+.cv-pe{border-top:0;padding-top:6px}" +
    ".cv-pe{border-top:1px solid #e3e3e3;padding:10px 14px 12px}" +
    ".cv-pe textarea{width:100%;box-sizing:border-box;min-height:64px;max-height:160px;font:inherit;padding:8px 10px;border:1.5px solid #555;border-radius:10px;resize:vertical}" +
    ".cv-acoes{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:6px}" +
    ".cv-enviar{font:inherit;font-weight:700;background:#14204A;color:#fff;border:0;border-radius:10px;padding:8px 16px;cursor:pointer}" +
    ".cv-enviar:disabled{opacity:.45;cursor:not-allowed}" +
    ".cv-chamar{font:inherit;font-size:13px;background:transparent;color:#14204A;border:0;text-decoration:underline;cursor:pointer;padding:4px 0}" +
    ".cv-nota{font-size:12px;color:#555;margin:6px 0 0}.cv-msg{font-size:13px;margin:4px 0 0;min-height:1.2em}" +
    "@media (prefers-reduced-motion:no-preference){.cv-cx{animation:cv-sobe .18s ease-out}@keyframes cv-sobe{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}}";
  var st = document.createElement("style");
  st.textContent = css;
  document.head.appendChild(st);

  var btn = document.createElement("button");
  btn.type = "button";
  btn.className = "cv-btn";
  btn.setAttribute("aria-expanded", "false");
  btn.setAttribute("aria-controls", "cv-cx");
  btn.innerHTML = '<span class="cv-ind" aria-hidden="true"></span><b>Converse com o EGOS</b><span class="cv-st">○ fora do ar</span>';

  var cx = document.createElement("div"); // div, não section: estilo de section da página vazava para a janela (30/09)
  cx.id = "cv-cx";
  cx.className = "cv-cx";
  cx.hidden = true;
  cx.setAttribute("role", "dialog");
  cx.setAttribute("aria-modal", "true");
  // fundo: clique fora fecha; enquanto aberta, a página atrás não rola nem recebe foco (B1, 02/10)
  var fundo = document.createElement("div");
  fundo.className = "cv-fundo";
  fundo.hidden = true;
  cx.setAttribute("aria-labelledby", "cv-tit");
  cx.innerHTML =
    '<div class="cv-topo"><div><h2 id="cv-tit">Converse com o EGOS</h2><p id="cv-status" role="status">○ fora do ar</p></div>' +
    '<button type="button" class="cv-x">Fechar</button></div>' +
    '<div class="cv-corpo" id="cv-corpo" aria-live="polite"></div>' +
    '<div class="cv-atalhos"><button type="button" class="cv-atalho" id="cv-perguntas">Perguntas comuns</button>' +
    '<button type="button" class="cv-atalho" id="cv-cinco">Não entendi nada, explique como se eu tivesse 5 anos</button></div>' +
    '<form class="cv-pe" id="cv-form"><label class="sr" style="position:absolute;left:-9999px" for="cv-txt">Sua mensagem</label>' +
    '<textarea id="cv-txt" maxlength="1000" rows="2" placeholder="Escreva aqui. Enter envia."></textarea>' +
    '<div class="cv-acoes"><button type="button" class="cv-chamar" id="cv-chamar">Chamar o Enio</button>' +
    '<button type="submit" class="cv-enviar" id="cv-enviar" disabled>Enviar</button></div>' +
    '<p class="cv-msg" id="cv-msg" role="status"></p>' +
    '<p class="cv-nota">Não escreva CPF, telefone ou dados de outra pessoa.</p></form>';

  document.body.appendChild(btn);
  document.body.appendChild(fundo);
  document.body.appendChild(cx);

  var $ = function (s) { return cx.querySelector(s); };
  var corpo = $("#cv-corpo"), txt = $("#cv-txt"), env = $("#cv-enviar"), msg = $("#cv-msg"), stEl = $("#cv-status");
  var on = false, timer = null, vistas = {}, iniciado = false;

  function guarda(k, v) { try { if (v === undefined) return sessionStorage.getItem(k); sessionStorage.setItem(k, v); } catch (e) { return null; } }
  function bolha(texto, quem, lnk) {
    var d = document.createElement("div");
    d.className = "cv-b " + quem;
    d.textContent = texto;
    if (lnk && lnk.href) {
      var a = document.createElement("a");
      a.href = lnk.href;
      a.textContent = lnk.texto || "Ler mais";
      d.appendChild(document.createTextNode("\n"));
      d.appendChild(a);
    }
    corpo.appendChild(d);
    corpo.scrollTop = corpo.scrollHeight;
    return d;
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
    corpo.scrollTop = corpo.scrollHeight;
  }
  function atualizaEnviar() { env.disabled = !on || !txt.value.trim(); }
  function tempo(u, o) {
    var ct = new AbortController(), t = setTimeout(function () { ct.abort(); }, 6000);
    o = o || {}; o.signal = ct.signal;
    return fetch(u, o).then(function (r) { clearTimeout(t); return r; }, function (e) { clearTimeout(t); throw e; });
  }
  function marcar(ok) {
    on = !!ok;
    var t = on ? "● disponível" : "○ fora do ar";
    btn.setAttribute("data-on", on ? "1" : "0");
    btn.querySelector(".cv-st").textContent = t;
    stEl.textContent = t;
    if (on && msg.textContent === DESLIGADO) msg.textContent = ""; // voltou ao ar: a linha velha sai
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
          if (t && !vistas[k]) { vistas[k] = 1; bolha(t, "eg"); }
        });
      })
      .catch(function () {});
  }

  function inicio() {
    if (iniciado) return;
    iniciado = true;
    bolha("Oi! Eu sou o EGOS, a IA que trabalha com o Enio. Ajudo a colocar uma IA para trabalhar no seu computador, com os seus arquivos. Em que área você trabalha?", "eg");
    var area = guarda("cinco-area");
    if (area) { perguntaDesejo(area); return; }
    chips(AREAS, function (a) {
      bolha(a.nome, "eu");
      guarda("cinco-area", a.nome);
      perguntaDesejo(a.nome);
    });
  }
  function perguntaDesejo(area) {
    bolha("E o que você quer resolver ou melhorar?", "eg");
    chips(DESEJOS, function (d) {
      if (d === "Outra coisa") {
        txt.value = "Trabalho com " + area.toLowerCase() + ". Quero ";
      } else {
        txt.value = "Trabalho com " + area.toLowerCase() + ". Quero: " + d.toLowerCase() + ".";
      }
      bolha("Deixei a mensagem pronta aqui embaixo. Pode completar do seu jeito e apertar Enter.", "eg");
      txt.focus();
      txt.setSelectionRange(txt.value.length, txt.value.length);
      atualizaEnviar();
    });
  }

  // ── perguntas comuns e "explique como se eu tivesse 5 anos": tudo vem de /faq.json, nada vai ao servidor do chat ──
  var faqP = null;
  function faq() {
    if (!faqP) {
      faqP = tempo("/faq.json", { credentials: "same-origin" })
        .then(function (r) { if (!r.ok) throw new Error("http " + r.status); return r.json(); })
        .catch(function (e) { faqP = null; throw e; });
    }
    return faqP;
  }
  function comFaq(fn) {
    faq().then(fn, function () {
      bolha("Não consegui abrir as perguntas agora. Você pode lê-las na página de perguntas comuns.", "eg", { href: "/faq/", texto: "Abrir perguntas comuns" });
    });
  }
  function achar(f, id) {
    var r = null;
    (f.grupos || []).forEach(function (g) { (g.perguntas || []).forEach(function (q) { if (q.id === id) r = q; }); });
    return r;
  }
  function chamarEnio(extra) {
    if (!on) { // servidor fora: diz a verdade, não finge envio
      bolha("O chat está fora do ar e não consigo avisar o Enio agora. Tente de novo daqui a pouco.", "eg");
      return;
    }
    var area = guarda("cinco-area");
    var t = "Quero falar com o Enio." + (area ? " Área: " + area + "." : "") + (extra ? " " + extra : "");
    enviar(t, "Pedido enviado ao Enio. Ele recebe o aviso no WhatsApp e responde por aqui.");
  }
  function listaPerguntas(f, intro) {
    var lista = (f.destaques || []).map(function (id) { return achar(f, id); }).filter(Boolean);
    bolha(intro, "eg");
    chips(lista.map(function (q) { return { nome: q.pergunta, q: q }; }), function (it) { responder(f, it.q); }, true);
  }
  function seguintes(f, q, jaSimples) {
    var op = [];
    if (!jaSimples && q) op.push({ nome: "Explicar de outro jeito", a: "simples" });
    op.push({ nome: "Outra pergunta", a: "lista" }, { nome: "Falar com o Enio", a: "enio" });
    chips(op, function (it) {
      bolha(it.nome, "eu");
      if (it.a === "simples") { bolha(q.simples, "eg"); seguintes(f, q, true); }
      else if (it.a === "lista") listaPerguntas(f, "Qual outra pergunta?");
      else chamarEnio();
    }, true);
  }
  function responder(f, q) {
    bolha(q.pergunta, "eu");
    bolha(q.resposta, "eg", q.link && q.link !== "/#conversa" ? { href: q.link, texto: q.link_texto } : null);
    seguintes(f, q, false);
  }
  function perguntasComuns() {
    bolha("Perguntas comuns", "eu");
    comFaq(function (f) {
      listaPerguntas(f, "Escolha uma pergunta. A resposta aparece aqui na hora.");
      bolha("Quer ver todas?", "eg", { href: "/faq/", texto: "Ver todas as perguntas" });
    });
  }
  function cincoAnos() {
    bolha("Não entendi nada, explique como se eu tivesse 5 anos", "eu");
    comFaq(function (f) {
      bolha(f.explicacao_simples, "eg");
      chips([{ nome: "Falar com o Enio", a: "enio" }, { nome: "Ver perguntas comuns", a: "lista" }], function (it) {
        bolha(it.nome, "eu");
        if (it.a === "enio") chamarEnio();
        else listaPerguntas(f, "Escolha uma pergunta. A resposta aparece aqui na hora.");
      }, true);
    });
  }

  var DESLIGADO = "O envio está desligado agora. As perguntas comuns continuam funcionando.";
  function enviar(texto, aviso) {
    var t = String(texto || "").trim();
    if (!t) return;
    if (!on) { msg.textContent = DESLIGADO; return; } // servidor fora: diz na tela e mantém o texto no campo
    env.disabled = true;
    msg.textContent = "Enviando...";
    tempo("/conversa/mensagem", {
      method: "POST", credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texto: t.slice(0, 1000) }),
    })
      .then(function (r) {
        if (!r.ok) throw new Error("http " + r.status);
        bolha(t, "eu");
        txt.value = "";
        msg.textContent = aviso || "Recebido. A resposta aparece aqui.";
        respostas();
      })
      .catch(function () { msg.textContent = "Não consegui enviar. Sua mensagem continua no campo."; status(); })
      .then(atualizaEnviar);
  }

  function abrir() {
    cx.hidden = false;
    fundo.hidden = false;
    document.documentElement.classList.add("cv-aberto");
    btn.setAttribute("aria-expanded", "true");
    inicio();
    faq().catch(function () {}); // deixa as perguntas prontas: a resposta aparece na hora
    status().then(respostas);
    clearInterval(timer);
    timer = setInterval(function () { status().then(respostas); }, 20000);
    txt.focus();
  }
  function fechar() {
    cx.hidden = true;
    fundo.hidden = true;
    document.documentElement.classList.remove("cv-aberto");
    btn.setAttribute("aria-expanded", "false");
    clearInterval(timer);
    btn.focus();
  }

  btn.addEventListener("click", abrir);
  $(".cv-x").addEventListener("click", fechar);
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !cx.hidden) fechar(); });
  fundo.addEventListener("click", fechar);
  // trava de foco: Tab e Shift+Tab giram dentro da janela enquanto ela está aberta
  cx.addEventListener("keydown", function (e) {
    if (e.key !== "Tab") return;
    var f = [].filter.call(cx.querySelectorAll('button,textarea,a[href],input,select,[tabindex]:not([tabindex="-1"])'), function (el) { return !el.disabled && el.offsetParent !== null; });
    if (!f.length) return;
    var pri = f[0], ult = f[f.length - 1];
    if (e.shiftKey && document.activeElement === pri) { e.preventDefault(); ult.focus(); }
    else if (!e.shiftKey && document.activeElement === ult) { e.preventDefault(); pri.focus(); }
  });
  txt.addEventListener("input", atualizaEnviar);
  txt.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); enviar(txt.value); }
  });
  $("#cv-form").addEventListener("submit", function (e) { e.preventDefault(); enviar(txt.value); });
  $("#cv-chamar").addEventListener("click", function () {
    var extra = txt.value.trim();
    var area = guarda("cinco-area");
    var t = "Quero falar com o Enio." + (area ? " Área: " + area + "." : "") + (extra ? " " + extra : "");
    enviar(t, "Pedido enviado ao Enio. Ele recebe o aviso no WhatsApp e responde por aqui.");
  });
  $("#cv-perguntas").addEventListener("click", perguntasComuns);
  $("#cv-cinco").addEventListener("click", cincoAnos);
  document.addEventListener("click", function (e) {
    var a = e.target && e.target.closest && e.target.closest("[data-abrir-chat],a[href='#conversa'],a[href='/#conversa']");
    if (!a) return;
    e.preventDefault(); // o chat existe em toda página: abre aqui mesmo

    abrir();
  });

  window.cincoConversa = { abrir: abrir, fechar: fechar };
  if (location.hash === "#conversa" || location.hash === "#privacidade") abrir();
  else status();
})();
