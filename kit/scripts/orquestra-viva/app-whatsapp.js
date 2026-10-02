/* app-whatsapp.js — EGOS-APP-GAVETA-WHATSAPP-001 (corte Enio 10/09: "ele ainda não mostra
   integração nossa com nosso whatsapp, as instâncias que temos, as conversas, o que já
   analisamos, o que já fizemos alguma ação — isso tudo deve estar dentro do egos app").
   Só USA (nunca declara) abrirGaveta/fecharGaveta/escaparHtml/horaLocal dos módulos
   anteriores — vem por ÚLTIMO na concatenação, mesmo padrão de app-mcp.js/app-conexoes.js.
   Lê /api/whatsapp (disco local: cursores da ponte + fila de jobs). Nenhum token aparece;
   o texto que veio do grupo é DADO e sai sempre por escaparHtml, truncado no servidor. */

  function dataCurta(iso) {
    if (!iso) return "⚪";
    var d = new Date(iso);
    if (isNaN(d.getTime())) return "⚪";
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) + " " + horaLocal(iso);
  }

  function linhaInstanciaWpp(i) {
    return (
      '<div class="conexao-item" data-wpp-instancia="' + escaparHtml(i.nome) + '">' +
      "<span>" + (i.conversas > 0 ? "🟢" : "⚪") + "</span>" +
      '<span class="conexao-rotulo">' + escaparHtml(i.nome) + "</span>" +
      '<span class="conexao-id">' + i.conversas + " conversa(s)</span>" +
      '<span class="conexao-quando">última: ' + escaparHtml(dataCurta(i.ultimaEm)) + "</span>" +
      '<span class="conexao-detalhe">' +
      (i.declaradaNoEnv ? "declarada nesta máquina" : "vista na escuta (não é a instância declarada)") +
      "</span>" +
      "</div>"
    );
  }

  function cartaoConversa(c) {
    var acoes = (c.acoes || []).map(function (a) {
      return '<li><span class="conexao-quando">' + escaparHtml(dataCurta(a.quando)) + " · " +
        escaparHtml(a.agente) + "</span> — " + escaparHtml(a.resultado) + "</li>";
    }).join("");
    var naoAnalisadas = (c.pendentes || 0) + (c.emAndamento || 0);
    var ponto = naoAnalisadas > 0 ? "🟡" : (c.analisadas > 0 ? "🟢" : "⚪");
    return (
      '<div class="conexao-item" data-wpp-conversa="' + escaparHtml(c.jid) + '" style="flex-direction:column;align-items:flex-start;gap:4px">' +
      '<div><span>' + ponto + "</span> " +
      '<strong>' + escaparHtml(c.autores.length ? c.autores.join(", ") : c.jid) + "</strong> " +
      '<span class="conexao-id">' + (c.tipo === "grupo" ? "grupo" : "pessoa") + " · " + escaparHtml(c.instancia) + "</span></div>" +
      '<div class="conexao-quando" style="font-family:var(--mono,monospace);font-size:10px;word-break:break-all">' + escaparHtml(c.jid) + "</div>" +
      '<div class="conexao-detalhe">' + c.mensagens + " mensagem(ns) na fila · " + c.analisadas +
      " analisada(s) · " + naoAnalisadas + " esperando · " + c.comAcao + " com ação registrada</div>" +
      (c.ultimoTexto ? '<div class="conexao-detalhe">última (' + escaparHtml(dataCurta(c.ultimaEm)) + '): “' + escaparHtml(c.ultimoTexto) + "”</div>" : "") +
      (acoes ? '<details><summary>o que já fizemos aqui (' + c.comAcao + ")</summary><ul>" + acoes + "</ul></details>" : "") +
      "</div>"
    );
  }

  function pintarCanais(canais) {
    var alvo = document.getElementById("whatsapp-canais");
    if (!alvo) return;
    if (!Array.isArray(canais) || canais.length === 0) {
      alvo.innerHTML = "⚪ nenhum canal de atendimento configurado";
      return;
    }
    alvo.innerHTML = canais.map(function (c) {
      var modelo = c.modelo || "claude-sonnet-5";
      var cli = c.cli || "claude";
      var vivo = c.sessaoViva ? "🟢 viva" : "⚪ não subiu";
      return (
        '<div class="conexao-item" data-wpp-canal="' + escaparHtml(c.nome) + '" style="flex-direction:column;align-items:flex-start;gap:4px">' +
        '<div><span>' + (c.sessaoViva ? "🟢" : "⚪") + "</span> " +
        '<strong>' + escaparHtml(c.nome) + "</strong> " +
        '<span class="conexao-id">' + vivo + " · " + escaparHtml(c.tmux) + "</span></div>" +
        '<div class="conexao-detalhe">modelo: <code>' + escaparHtml(modelo) + "</code> · CLI: <code>" + escaparHtml(cli) +
        "</code> · quem entra: <code>" + escaparHtml(c.quemEntra || "?") + "</code>" +
        (c.esforco ? " · esforço: <code>" + escaparHtml(c.esforco) + "</code>" : "") + "</div>" +
        '<div class="conexao-quando">' + (c.sessionId ? "sessão: " + escaparHtml(String(c.sessionId).slice(0, 24)) + "…" : "sem sessão") +
        (c.atualizadoEm ? " · atualizada " + escaparHtml(dataCurta(c.atualizadoEm)) : "") + "</div>" +
        '<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">' +
        '<label style="font-size:11px">modelo <select data-canal-modelo="' + escaparHtml(c.nome) + '">' +
        CANAIS_MODELOS.map(function (m) { return '<option value="' + escaparHtml(m) + '"' + (m === modelo ? " selected" : "") + ">" + escaparHtml(m) + "</option>"; }).join("") +
        "</select></label>" +
        '<label style="font-size:11px">CLI <select data-canal-cli="' + escaparHtml(c.nome) + '">' +
        ['claude', 'opencode'].map(function (x) { return '<option value="' + x + '"' + (x === cli ? " selected" : "") + ">" + x + "</option>"; }).join("") +
        "</select></label>" +
        '<button data-salvar-canal="' + escaparHtml(c.nome) + '" class="conexao-cta">salvar</button>' +
        '<span data-canal-status="' + escaparHtml(c.nome) + '" style="font-size:11px;color:var(--cor-2,inherit)"></span>' +
        "</div>" +
        "</div>"
      );
    }).join("");
    // liga os botões salvar (um por canal)
    alvo.querySelectorAll("[data-salvar-canal]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var nome = btn.getAttribute("data-salvar-canal");
        var modelo = alvo.querySelector('[data-canal-modelo="' + nome + '"]').value;
        var cli = alvo.querySelector('[data-canal-cli="' + nome + '"]').value;
        salvarCanalConfig(nome, modelo, cli, btn, alvo);
      });
    });
  }

  var CANAIS_MODELOS = [
    "claude-sonnet-5", "claude-opus-5", "claude-haiku-4.5",
    "openrouter/deepseek/deepseek-v4-flash", "openrouter/deepseek/deepseek-v4.1-flash",
    "openrouter/z-ai/glm-5.3-flash", "openrouter/moonshotai/kimi-k3",
    "openrouter/openai/gpt-5.6-sol", "openrouter/openai/gpt-6-astra",
    "openrouter/anthropic/claude-sonnet-5", "openrouter/anthropic/claude-opus-5", "openrouter/anthropic/claude-fable-5.1",
  ];

  /* salvarCanalConfig — lê a lista atual de canais, troca modelo/cli do canal, POST salva. */
  async function salvarCanalConfig(nome, modelo, cli, btn, alvo) {
    var st = alvo.querySelector('[data-canal-status="' + nome + '"]');
    if (btn) { btn.disabled = true; btn.textContent = "salvando…"; }
    try {
      var atual = await (await fetch("/api/whatsapp")).json();
      var canais = (atual.canais || []).map(function (c) {
        if (c.nome === nome) { c.modelo = modelo; c.cli = cli; }
        return c;
      });
      var r = await (await fetch("/api/whatsapp/canais", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(canais),
      })).json();
      if (r.ok) {
        if (st) st.textContent = "🟢 salvo — reinicie a sessão do canal para aplicar";
      } else {
        if (st) st.textContent = "🔴 " + escaparHtml(r.erro || "falha");
      }
    } catch (e) {
      if (st) st.textContent = "🔴 " + escaparHtml(String(e));
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = "salvar"; }
    }
  }

  function pintarWhatsapp(j) {
    var alvoInst = document.getElementById("whatsapp-instancias");
    var alvoConv = document.getElementById("whatsapp-conversas");
    var resumoEl = document.getElementById("whatsapp-resumo");
    var faltaEl = document.getElementById("whatsapp-falta");
    if (!alvoInst || !alvoConv) return;
    var instancias = Array.isArray(j.instancias) ? j.instancias : [];
    var conversas = Array.isArray(j.conversas) ? j.conversas : [];
    pintarCanais(j.canais);
    alvoInst.innerHTML = instancias.length
      ? instancias.map(linhaInstanciaWpp).join("")
      : "⚪ nenhuma instância declarada nem vista na escuta";
    alvoConv.innerHTML = conversas.length
      ? conversas.map(cartaoConversa).join("")
      : "⚪ nenhuma conversa escutada até agora — a ponte grava um cursor por conversa em ~/.egos";
    if (resumoEl) {
      var r = j.resumo || {};
      resumoEl.innerHTML =
        (j.escutaViva ? "🟢 escuta ligada" : "🔴 escuta desligada") + " · " +
        (r.instancias || 0) + " instância(s) · " + (r.conversas || 0) + " conversa(s) · " +
        (r.mensagens || 0) + " mensagem(ns) · " + (r.analisadas || 0) + " analisada(s) · " +
        (r.pendentes || 0) + " esperando · " + (r.comAcao || 0) + " com ação" +
        (j.host ? ("<br>host declarado: " + escaparHtml(j.host)) : "");
    }
    if (faltaEl) {
      var falta = Array.isArray(j.falta) ? j.falta : [];
      faltaEl.innerHTML = falta.length
        ? ("⚪ o que este painel NÃO mede: <ul><li>" + falta.map(escaparHtml).join("</li><li>") + "</li></ul>")
        : "";
    }
  }

  async function carregarWhatsapp() {
    var alvo = document.getElementById("whatsapp-conversas");
    if (!alvo) return;
    try {
      var j = await (await fetch("/api/whatsapp")).json();
      pintarWhatsapp(j);
    } catch (e) {
      alvo.innerHTML = "🔴 não consegui ler /api/whatsapp: " + escaparHtml(String(e));
    }
  }

  /* confirmação ao vivo = 1 chamada única e explícita (R-WPP-ACCESS-001) — reusa a mesma
     rota do botão da gaveta CONEXÕES, nada de sonda nova. */
  async function medirWhatsappAoVivo() {
    var btn = document.getElementById("whatsapp-medir");
    var aoVivoEl = document.getElementById("whatsapp-aovivo");
    if (btn) { btn.disabled = true; btn.textContent = "medindo…"; }
    try {
      var r = await (await fetch("/api/conexoes/whatsapp/medir", { method: "POST" })).json();
      var c = r && r.conexao;
      if (aoVivoEl && c) {
        aoVivoEl.innerHTML = (c.estado === "medido" ? "🟢 " : "🔴 ") +
          escaparHtml(c.humano || "") + " — " + escaparHtml(c.identificador || "⚪") +
          " · " + escaparHtml(c.detalhe || "");
      }
    } catch (e) {
      if (aoVivoEl) aoVivoEl.innerHTML = "🔴 não consegui medir ao vivo: " + escaparHtml(String(e));
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = "confirmar número ao vivo"; }
    }
  }

  var btnWhatsapp = document.getElementById("btn-whatsapp");
  if (btnWhatsapp) {
    // GAVETA-ABRE-CARREGADA-001: quem carrega é a gaveta, não o botão.
    window.__ABRIDORES = window.__ABRIDORES || {};
    window.__ABRIDORES["whatsapp-overlay"] = carregarWhatsapp;
    btnWhatsapp.addEventListener("click", function () { abrirGaveta("whatsapp-overlay"); });
  }
  var whatsappFechar = document.getElementById("whatsapp-fechar");
  if (whatsappFechar) {
    whatsappFechar.addEventListener("click", function () { fecharGaveta("whatsapp-overlay"); });
  }
  var btnMedirWpp = document.getElementById("whatsapp-medir");
  if (btnMedirWpp) {
    btnMedirWpp.addEventListener("click", medirWhatsappAoVivo);
  }
  // atalho de tela: #whatsapp abre direto (mesmo padrão de #mcp em app-mcp.js)
  window.addEventListener("load", function () {
    if (location.hash === "#whatsapp" && btnWhatsapp) btnWhatsapp.click();
  });
