/* app-agente.js — JANELA-AGENTE-WHATSAPP-001 (corte Enio 15/09 15:10, print das duas janelas
   tmux `egos-whatsapp`/`egos-cinco`: "quero esse PID dentro do EGOS APP, perfeito, funcional,
   mas sem visual de terminal"). 6ª aba DENTRO da gaveta "avisos-overlay" que já existe (mesma
   correção Prime de app-conversas.js/app-roteiro-projeto.js: zero botão/overlay novo no
   #header). Arquivo NOVO, servido por ÚLTIMO por /app.js — só USA (nunca declara)
   escaparHtml/horaLocal dos anteriores. NÃo toca app-conversas.js: listener PRÓPRIO em
   #avisos-abas (mesma técnica de app-uso.js/app-roteiro-projeto.js).

   3 direções visuais (pesquisa: docs/design/janela-agente-pesquisa-2026-09-15.md) —
   "conversa" (bolha, default), "editor" (card por linha com borda de papel), "foco" (coluna
   central sem chrome, peso tipográfico faz a hierarquia). Escolha persiste em localStorage
   (per-viewer, nunca chega ao servidor — não é estado compartilhado). Ferramenta vem
   colapsada por padrão (<details>, clique nativo expande — mesmo padrão de app-agentes.js
   para o detalhe do papel). */
(function () {
  var AG_POLL_MS = 4000;
  var agTimer = null;
  var agAbaAtiva = false;
  var agCanalAtivo = "enio-dm";
  var agDesde = ""; // offset: hora ISO do último turno já desenhado — só pede o delta
  var agEnviando = false;

  var LS_KEY = "egos_agente_direcao";
  function direcaoSalva() {
    try { return localStorage.getItem(LS_KEY) || "conversa"; } catch (e) { return "conversa"; }
  }
  function salvarDirecao(v) {
    try { localStorage.setItem(LS_KEY, v); } catch (e) { /* privado/sem storage — segue sem persistir */ }
  }

  function seloStatus(status) {
    if (status === "ocupado") return "🟢 trabalhando";
    if (status === "ocioso") return "🟡 ocioso, pronto pra próxima";
    if (status === "morta") return "🔴 sessão não está de pé";
    return "⚪ ⚪ NÃO-MEDIDO";
  }

  function renderStatus(resp) {
    var el = document.getElementById("agente-status");
    if (!el) return;
    if (!resp || resp.ok === false) { el.textContent = "🔴 " + ((resp && resp.erro) || "não consegui medir"); return; }
    var ctx = resp.contextoTokens == null ? "⚪ contexto não medido" : resp.contextoTokens.toLocaleString("pt-BR") + " tokens de contexto";
    el.textContent = seloStatus(resp.status) + " · " + (resp.modelo || "⚪ modelo não medido") + " · " + ctx;
  }

  function bolhaClasse(papel) {
    if (papel === "entrada-whatsapp" || papel === "entrada-painel") return "agente-msg agente-msg-entrada";
    if (papel === "ferramenta") return "agente-msg agente-msg-ferramenta";
    if (papel === "sistema") return "agente-msg agente-msg-sistema";
    return "agente-msg agente-msg-agente";
  }

  // AGENTE-PAINEL-FEEDBACK-001: selo de estado do envio otimista (⏳ enviando → ✅ enviada até
  // a entrada real aparecer no transcript, quando o buffer otimista é descartado — ver
  // carregarAgente). Mensagem sem `_estado` (tudo que vem do servidor) não mostra selo.
  function seloEnvio(estado) {
    if (estado === "enviando") return " ⏳";
    if (estado === "enviada") return " ✅";
    if (estado === "erro") return " 🔴";
    return "";
  }

  function renderFerramenta(m) {
    var f = m.ferramenta || { nome: "?", resumo: "", ok: null, resultado: "" };
    var selo = f.ok === true ? "✅" : f.ok === false ? "🔴" : "⚪";
    return (
      '<details class="agente-ferramenta"><summary>🔧 ' + escaparHtml(f.nome) + " — " + escaparHtml(f.resumo) + " " + selo + "</summary>" +
      '<pre class="agente-ferramenta-resultado">' + escaparHtml(f.resultado || "(sem resultado)") + "</pre></details>"
    );
  }

  function renderMensagem(m) {
    var hora = m.hora ? horaLocal(m.hora) : "";
    var corpo = m.papel === "ferramenta" ? renderFerramenta(m) : (m.html || escaparHtml(m.texto));
    return (
      '<div class="' + bolhaClasse(m.papel) + '">' +
      '<div class="agente-msg-meta">' + escaparHtml(m.papel) + (hora ? " · " + hora : "") + seloEnvio(m._estado) + "</div>" +
      '<div class="agente-msg-corpo">' + corpo + "</div>" +
      "</div>"
    );
  }

  var buffer = []; // mensagens já desenhadas nesta sessão de aba aberta — direção troca sem novo fetch

  function redesenhar() {
    var el = document.getElementById("agente-mensagens");
    if (!el) return;
    el.className = "agente-mensagens agente-dir-" + direcaoSalva();
    if (!buffer.length) { el.innerHTML = "⚪ sem mensagens ainda nesta janela."; return; }
    el.innerHTML = buffer.map(renderMensagem).join("");
    el.scrollTop = el.scrollHeight;
  }

  async function carregarAgente() {
    var statusEl = document.getElementById("agente-status");
    try {
      var url = "/api/agente?canal=" + encodeURIComponent(agCanalAtivo) + (agDesde ? "&desde=" + encodeURIComponent(agDesde) : "");
      var resp = await (await fetch(url)).json();
      renderStatus(resp);
      if (resp && resp.ok && Array.isArray(resp.mensagens) && resp.mensagens.length) {
        // AGENTE-PAINEL-FEEDBACK-001: turnos novos chegaram — qualquer bolha OTIMISTA (a que
        // o próprio clique desenhou, marcada por _idEnvio) já tem a entrada real vinda do
        // servidor entre estes turnos; descarta a otimista em vez de duplicar (regra simples:
        // 1 ciclo de poll com novidade > tentar casar id, texto ou hora).
        buffer = buffer.filter(function (m) { return !m._idEnvio; }).concat(resp.mensagens).slice(-300);
        agDesde = resp.desdeNovo || agDesde;
        redesenhar();
      }
    } catch (e) {
      if (statusEl) statusEl.textContent = "🔴 não consegui ler /api/agente: " + escaparHtml(String(e));
    }
  }

  function trocarCanal(nome) {
    agCanalAtivo = nome;
    agDesde = "";
    buffer = [];
    redesenhar();
    carregarAgente();
    var t = document.getElementById("agente-terminal");
    if (t) t.textContent = "abrir terminal (" + nome + ")";
  }

  function pararPollAgente() {
    if (agTimer) { clearInterval(agTimer); agTimer = null; }
  }
  window.__pararPollAgente = pararPollAgente;

  function iniciarPollAgente() {
    pararPollAgente();
    carregarAgente();
    agTimer = setInterval(carregarAgente, AG_POLL_MS);
  }

  var abasPrincipais = document.getElementById("avisos-abas");
  var painelAgente = document.getElementById("agente-painel");
  var btnAbaAgente = null;
  if (abasPrincipais && painelAgente) {
    Array.prototype.forEach.call(abasPrincipais.querySelectorAll(".conv-aba"), function (btn) {
      if (btn.getAttribute("data-aba") === "agente") btnAbaAgente = btn;
      btn.addEventListener("click", function () {
        agAbaAtiva = btn.getAttribute("data-aba") === "agente";
        painelAgente.hidden = !agAbaAtiva;
        if (agAbaAtiva) iniciarPollAgente();
        else pararPollAgente();
      });
    });
  }

  var canaisEl = document.getElementById("agente-canais");
  if (canaisEl) {
    Array.prototype.forEach.call(canaisEl.querySelectorAll(".conv-aba"), function (btn) {
      btn.addEventListener("click", function () {
        Array.prototype.forEach.call(canaisEl.querySelectorAll(".conv-aba"), function (b) { b.classList.remove("ativa"); });
        btn.classList.add("ativa");
        trocarCanal(btn.getAttribute("data-canal"));
      });
    });
  }

  var direcaoEl = document.getElementById("agente-direcao");
  if (direcaoEl) {
    direcaoEl.value = direcaoSalva();
    direcaoEl.addEventListener("change", function () {
      salvarDirecao(direcaoEl.value);
      redesenhar();
    });
  }

  // IDEMPOTENCIA-ENVIO-PAINEL-001 (corte Enio 15/09, bug medido: 1 clique → 6 injeções
  // idênticas na sessão tmux — causa raiz: zero idempotência em toda a cadeia, nem aqui
  // (nenhuma guarda contra montar o listener mais de uma vez no MESMO botão) nem no servidor
  // (POST sem chave de dedup). `montarEnvio` é chamada 1x no load normal, mas é escrita para
  // ser CHAMADA VÁRIAS VEZES sem empilhar listener — `dataset.ligado` é a guarda; qualquer
  // re-execução futura do bloco de montagem (refactor, reinjeção parcial) já sai defendida.
  // `id_envio` (uuid por clique) fecha o outro lado: mesmo que 2 POSTs saiam por retry de
  // rede/duplo-toque, o servidor só injeta 1x (ver rotas-agente-canal.ts).
  function montarEnvio(btn, ta) {
    if (!btn || !ta) return;
    // mirror de app-agente-logica.ts:deveMontarListener/marcarMontado (navegador não importa
    // TS) — golden da guarda pura em app-agente-logica.test.ts.
    if (btn.dataset.ligado === "1") return; // já montado neste elemento — nunca liga 2x
    btn.dataset.ligado = "1";
    btn.addEventListener("click", async function () {
      var texto = (ta.value || "").trim();
      var statusEl = document.getElementById("agente-status");
      if (!texto || agEnviando) return;
      agEnviando = true;
      btn.disabled = true;
      var rotuloAnterior = btn.textContent;
      btn.textContent = "enviando…";
      var idEnvio = (window.crypto && window.crypto.randomUUID)
        ? window.crypto.randomUUID()
        : (Date.now() + "-" + Math.random().toString(36).slice(2));
      // Feedback otimista (item 3): a bolha aparece na hora, antes da resposta do servidor —
      // troca de selo quando o POST confirma; some sozinha quando a entrada real do
      // transcript chega (ver filtro em carregarAgente).
      var msgOtimista = { papel: "entrada-painel", hora: new Date().toISOString(), texto: texto, _idEnvio: idEnvio, _estado: "enviando" };
      buffer = buffer.concat([msgOtimista]).slice(-300);
      redesenhar();
      try {
        var r = await fetch("/api/agente/enviar", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ canal: agCanalAtivo, texto: texto, id_envio: idEnvio }),
        });
        var j = await r.json();
        if (!j.ok) {
          msgOtimista._estado = "erro";
          redesenhar();
          if (statusEl) statusEl.textContent = "🔴 " + (j.erro || "não enviou");
          return;
        }
        msgOtimista._estado = "enviada";
        ta.value = "";
        redesenhar();
        carregarAgente();
      } catch (e) {
        msgOtimista._estado = "erro";
        redesenhar();
        if (statusEl) statusEl.textContent = "🔴 falha de rede: " + escaparHtml(String(e));
      } finally {
        agEnviando = false;
        btn.disabled = false;
        btn.textContent = rotuloAnterior;
      }
    });
  }
  montarEnvio(document.getElementById("agente-enviar-btn"), document.getElementById("agente-texto"));

  // "abrir terminal" — saída de emergência (pedido explícito): só um lembrete visível de qual
  // sessão tmux olhar; este app não controla janelas de terminal externas.
  var terminalEl = document.getElementById("agente-terminal");
  if (terminalEl) {
    terminalEl.textContent = "abrir terminal (" + agCanalAtivo + ")";
    terminalEl.addEventListener("click", function (e) {
      e.preventDefault();
      var statusEl = document.getElementById("agente-status");
      if (statusEl) statusEl.title = agCanalAtivo === "cinco" ? "tmux attach -t egos-cinco" : "tmux attach -t egos-whatsapp";
      alert("Sessão tmux: " + (agCanalAtivo === "cinco" ? "egos-cinco" : "egos-whatsapp") + " — rode `tmux attach -t <nome>` no terminal da máquina.");
    });
  }

  // Deep-link #agente — mesma convenção de app-roteiro-projeto.js/app-mcp.js.
  window.addEventListener("load", function () {
    if (location.hash !== "#agente") return;
    var btnNotif = document.getElementById("btn-notificacoes");
    if (btnNotif) btnNotif.click();
    if (btnAbaAgente) btnAbaAgente.click();
  });
})();
