/* app-mcp.js — EGOS-APP-GAVETA-MCP-001 (corte Enio 07/09: "o que entra no app: MCP
   customizado, integrações com MCPs, conectores"). Só USA (nunca declara)
   abrirGaveta/fecharGaveta/escaparHtml de app-gavetas.js/app-nucleo.js — vem por ÚLTIMO na
   concatenação (mesmo padrão de app-conexoes.js). Lê /api/mcp: 10 itens — os 9 servidores
   stdio do .mcp.json do checkout servido + o gateway (packages/mcp-unified-gateway),
   desligado do .mcp.json de propósito. Medição pesada (handshake MCP real) só sob clique em
   "medir agora" (?medir=1) — nunca em loop automático, mesmo espírito do R-WPP-ACCESS-001.
   Nunca exibe token/env — só nome/comando/caminho/contagem de tools (R-SEC-007). */
  var MCP_PONTO = { medido: "🟢", falhou: "🔴", "nao-medido": "⚪" };

  function linhaMcp(s, repoServido) {
    var ponto = MCP_PONTO[(s.saude && s.saude.estado) || "nao-medido"] || "⚪";
    var toolsTexto = s.saude && typeof s.saude.tools === "number" ? (s.saude.tools + " tools") : "⚪ tools";
    var nomesTexto = s.saude && Array.isArray(s.saude.nomes) && s.saude.nomes.length
      ? escaparHtml(s.saude.nomes.join(", "))
      : "";
    var erroTexto = s.saude && s.saude.erro ? escaparHtml(s.saude.erro) : "";
    var detalheTexto = erroTexto || nomesTexto || "⚪ não medido — clique em \"medir agora\"";
    var apontaOutro = s.aponta_para && s.aponta_para !== "⚪" && repoServido && s.aponta_para !== repoServido;
    var apontaTexto = apontaOutro
      ? ('<span class="conexao-detalhe" style="color:#d18b3a">⚠️ aponta para ' + escaparHtml(s.aponta_para) + ' (não o checkout servido)</span>')
      : "";
    return (
      '<div class="conexao-item" data-mcp="' + escaparHtml(s.id) + '">' +
      "<span>" + ponto + "</span>" +
      '<span class="conexao-rotulo">' + escaparHtml(s.nome) + (s.gateway ? " (gateway)" : "") + "</span>" +
      '<span class="conexao-id">' + toolsTexto + "</span>" +
      '<span class="conexao-quando" style="font-family:var(--mono,monospace);font-size:10px;word-break:break-all">' + escaparHtml(s.entrypoint) + "</span>" +
      '<span class="conexao-detalhe">' + detalheTexto + "</span>" +
      apontaTexto +
      "</div>"
    );
  }

  function pintarMcp(j) {
    var alvo = document.getElementById("mcp-lista");
    var resumoEl = document.getElementById("mcp-resumo");
    if (!alvo) return;
    var lista = Array.isArray(j.servidores) ? j.servidores : [];
    var repoServido = j.repoServido || "";
    alvo.innerHTML = lista.length
      ? lista.map(function (s) { return linhaMcp(s, repoServido); }).join("")
      : "⚪ nenhum servidor MCP declarado em .mcp.json";
    if (resumoEl) {
      var r = j.resumo || {};
      var globais = Array.isArray(j.globais) ? j.globais : [];
      resumoEl.innerHTML =
        "🔌 são os plugues que o agente usa para ler/escrever fora da conversa — " +
        (r.total || 0) + " no total · " + (r.no_disco || 0) + " no disco · " +
        (r.saudaveis || 0) + " 🟢 · " + (r.falharam || 0) + " 🔴 · " + (r.nao_medidos || 0) + " ⚪ não medidos" +
        (globais.length ? ("<br>outros MCPs desta conta (só nome): " + escaparHtml(globais.join(", "))) : "");
    }
  }

  async function carregarMcp() {
    var alvo = document.getElementById("mcp-lista");
    if (!alvo) return;
    try {
      var j = await (await fetch("/api/mcp")).json();
      pintarMcp(j);
    } catch (e) {
      alvo.innerHTML = "🔴 não consegui ler /api/mcp: " + escaparHtml(String(e));
    }
  }

  async function medirTodosMcp() {
    var btn = document.getElementById("mcp-medir-todos");
    var alvo = document.getElementById("mcp-lista");
    if (btn) { btn.disabled = true; btn.textContent = "medindo…"; }
    try {
      var j = await (await fetch("/api/mcp?medir=1")).json();
      pintarMcp(j);
    } catch (e) {
      if (alvo) alvo.innerHTML = "🔴 medição falhou: " + escaparHtml(String(e));
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = "medir agora"; }
    }
  }

  var btnMcp = document.getElementById("btn-mcp");
  if (btnMcp) {
    // GAVETA-ABRE-CARREGADA-001: quem carrega é a gaveta, não o botão.
    window.__ABRIDORES = window.__ABRIDORES || {};
    window.__ABRIDORES["mcp-overlay"] = carregarMcp;
    btnMcp.addEventListener("click", function () { abrirGaveta("mcp-overlay"); });
  }
  var mcpFechar = document.getElementById("mcp-fechar");
  if (mcpFechar) {
    mcpFechar.addEventListener("click", function () { fecharGaveta("mcp-overlay"); });
  }
  var btnMedirTodosMcp = document.getElementById("mcp-medir-todos");
  if (btnMedirTodosMcp) {
    btnMedirTodosMcp.addEventListener("click", medirTodosMcp);
  }
  // atalho de tela: #mcp abre direto (mesmo padrão de #conexoes em app-conexoes.js)
  window.addEventListener("load", function () {
    if (location.hash === "#mcp" && btnMcp) btnMcp.click();
  });
