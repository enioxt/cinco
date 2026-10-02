/* app-conexoes.js — EGOS-APP-CONTA-E-VERSAO-001 fatia 3 "CONEXÕES" (corte Enio 06/09: "ver o
   que está conectado, qual email do GitHub, qual número WhatsApp por exemplo"). Só USA (nunca
   declara) abrirGaveta/fecharGaveta/GAVETAS/escaparHtml de app-gavetas.js/app-nucleo.js — vem
   por ÚLTIMO na concatenação (mesmo padrão de app-layout.js). Lê /api/conexoes (6 itens
   medidos: git/github/whatsapp/google/vps/claude); o botão "medir agora" do WhatsApp é a
   ÚNICA chamada de rede sob demanda (R-WPP-ACCESS-001) — o resto da gaveta nunca chama a
   Evolution API. Vocabulário leigo já vem em window.VOCAB (VOCABULARIO-LEIGO-001).
   LEIGOS fatia 3 (corte Enio 08/09, vídeo 20:42 "ainda com dados de sistema, não está sendo
   feito para um usuário"): a 1ª linha visível agora é c.humano (frase sem jargão, vinda de
   coletores-conexoes.ts). O dado cru (identificador, detalhe, comando de "falta") NÃO some —
   migra para .conexao-tec, um data-tt-titulo/data-tt-abre que só abre no hover/clique da
   camada 2 (mesmo motor de app-nucleo.js/mostrarTt) — cebola, não amputação. */
  var CONEXOES_PONTO = { medido: "🟢", falhou: "🔴", "nao-configurado": "⚪" };

  function linhaConexao(c) {
    var ponto = CONEXOES_PONTO[c.estado] || "⚪";
    var quando = c.medidoEm ? new Date(c.medidoEm).toLocaleTimeString("pt-BR") : "⚪";
    var humanoTexto = escaparHtml(c.humano || c.rotulo || "⚪");
    var idTexto = c.identificador ? escaparHtml(c.identificador) : "⚪";
    var cruTexto = escaparHtml(c.falta ? c.falta : (c.detalhe || "⚪"));
    var ttAbre = (idTexto !== "⚪" ? idTexto + " · " : "") + cruTexto;
    var botaoMedir = c.id === "whatsapp"
      ? '<button type="button" class="btn-header conexao-btn" data-medir-whatsapp="1">medir agora</button>'
      : "";
    return (
      '<div class="conexao-item" data-conexao="' + escaparHtml(c.id) + '">' +
      "<span>" + ponto + "</span>" +
      '<span class="conexao-rotulo">' + escaparHtml(c.rotulo) + "</span>" +
      '<span class="conexao-humano">' + humanoTexto + "</span>" +
      botaoMedir +
      '<span class="conexao-quando">medido às ' + quando + "</span>" +
      '<abbr class="conexao-tec" tabindex="0" data-tt-titulo="' + escaparHtml(c.rotulo || "dado técnico") + '" data-tt-abre="' + ttAbre + '">detalhes técnicos</abbr>' +
      "</div>"
    );
  }

  function ligarBotaoMedirWhatsapp(alvo) {
    var btn = alvo.querySelector("[data-medir-whatsapp]");
    if (!btn) return;
    btn.addEventListener("click", async function medirAgora() {
      btn.removeEventListener("click", medirAgora);
      btn.disabled = true; btn.textContent = "medindo…";
      try {
        var r = await (await fetch("/api/conexoes/whatsapp/medir", { method: "POST" })).json();
        if (r.conexao) {
          var linha = alvo.querySelector('[data-conexao="whatsapp"]');
          if (linha) linha.outerHTML = linhaConexao(r.conexao);
          ligarBotaoMedirWhatsapp(alvo);
        }
      } catch (e) { btn.disabled = false; btn.textContent = "medir agora (falhou)"; }
    });
  }

  async function carregarConexoes() {
    var alvo = document.getElementById("conexoes-lista");
    if (!alvo) return;
    try {
      var j = await (await fetch("/api/conexoes")).json();
      var lista = Array.isArray(j.conexoes) ? j.conexoes : [];
      alvo.innerHTML = lista.length ? lista.map(linhaConexao).join("") : "⚪ nenhuma conexão medida";
      ligarBotaoMedirWhatsapp(alvo);
    } catch (e) {
      alvo.innerHTML = "🔴 não consegui ler /api/conexoes: " + escaparHtml(String(e));
    }
  }

  var btnConexoes = document.getElementById("btn-conexoes");
  if (btnConexoes) {
    // GAVETA-ABRE-CARREGADA-001: quem carrega é a gaveta, não o botão.
    window.__ABRIDORES = window.__ABRIDORES || {};
    window.__ABRIDORES["conexoes-overlay"] = carregarConexoes;
    btnConexoes.addEventListener("click", function () { abrirGaveta("conexoes-overlay"); });
  }
  var conexoesFechar = document.getElementById("conexoes-fechar");
  if (conexoesFechar) {
    conexoesFechar.addEventListener("click", function () { fecharGaveta("conexoes-overlay"); });
  }
  var sobreVerConexoes = document.getElementById("sobre-ver-conexoes");
  if (sobreVerConexoes) {
    sobreVerConexoes.addEventListener("click", function () {
      fecharGaveta("sobre-overlay");
      abrirGaveta("conexoes-overlay");
      carregarConexoes();
    });
  }
  if (typeof GAVETAS === "object" && GAVETAS) {
    GAVETAS["conexoes-overlay"] = function () {};
  }
  // atalho de tela: #conexoes abre direto (mesmo padrão de #conversa em app-nucleo.js)
  window.addEventListener("load", function () {
    if (location.hash === "#conexoes" && btnConexoes) btnConexoes.click();
  });
