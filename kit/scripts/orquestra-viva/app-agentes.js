/* PEDIDO-AGENTE-NOMEADO-001 (PCA-55, corte Enio 05/09: "a função de mandar pedido a UM agente
   nomeado volta, dentro do módulo/gaveta 'time em campo'"). Arquivo NOVO — app-gavetas.js
   (606L após a mudança mínima de wiring) estourava o teto de 600L se o detalhe do papel
   entrasse ali também; domínio é próprio (detalhe do agente + campo de pedido), então vira
   4º arquivo em vez de forçar big-bang em cima do que já existia (=R-REFACTOR-ORG-001).
   Servido concatenado (4º bloco, depois de app-gavetas.js) por /app.js — funções aqui usam
   escaparHtml/formatarIdade/horaLocal (app-nucleo.js) e renderPapeis/renderTime/fecharTime
   (app-gavetas.js) por hoisting de function declaration: é UM script, ordem de arquivo não
   importa para `function nome(){}` (só para `const`/`let`, que este arquivo não compartilha
   com os outros nesse sentido). Zero rota nova — reusa POST /comando (já existe, ver
   tratarComando em scripts/orquestra-viva.ts) e /time (montarTimeEmCampo). */

  let detalheAgenteAtual = null; // nome do papel cujo detalhe está aberto, ou null (fechado)
  let ultimoEstadoTime = null; // último /time bruto — abrirDetalheAgente/enviarComandoDetalhe leem daqui, nunca refazem fetch

  function papelPorNome(j, nome) {
    return ((j && j.papeis) || []).find((p) => p.papel === nome) || null;
  }

  // 1 job = 1 <li><details> — reusa o padrão CSS .item-dobravel que já existia (app.css) sem
  // consumidor até aqui: item colapsado mostra só o título, clique (nativo, sem JS) expande
  // de/criadoEm/pegoEm/resultado. Nenhum campo inventado — o que o job não tem, não aparece.
  function renderItemDetalhe(job) {
    const partes = [];
    if (job.de) partes.push(`de ${escaparHtml(job.de)}`);
    if (job.criadoEm) partes.push(`criado ${formatarIdade(job.criadoEm)}`);
    if (job.pegoEm) partes.push(`pego ${formatarIdade(job.pegoEm)}`);
    if (job.resultado) partes.push(`resultado: ${escaparHtml(job.resultado)}`);
    return `<li><details class="item-dobravel"><summary>${escaparHtml(job.titulo)}</summary>` +
      `<div class="detalhe">${partes.length ? partes.join(" · ") : "⚪ sem detalhe adicional"}</div></details></li>`;
  }

  function renderBlocoDetalhe(prefixo, itens, total) {
    const contEl = document.getElementById(`cont-detalhe-${prefixo}`);
    if (contEl) contEl.textContent = total;
    const ul = document.getElementById(`detalhe-${prefixo}-lista`);
    if (!ul) return;
    ul.innerHTML = itens.length ? itens.map(renderItemDetalhe).join("") : `<li class="vazio">nenhum</li>`;
  }

  function seloEscuta(status) {
    if (status === "viva") return "🟢";
    if (status === "orfa") return "🔴";
    return "⚪";
  }

  function renderDetalheAgente(p) {
    document.getElementById("time-detalhe-nome-agente").textContent = p.papel;
    const escuta = p.escuta || { status: "surda" };
    const estadoTxt = escuta.status === "viva" ? "escutando agora"
      : escuta.status === "orfa" ? "escuta órfã (processo morto)"
      : "sem escuta";
    document.getElementById("time-detalhe-manchete").innerHTML =
      `${seloEscuta(escuta.status)} <b>${escaparHtml(p.papel)}</b>: ${escaparHtml(estadoTxt)} · ` +
      `${p.pendentesTotal} esperando · ${p.emAndamentoTotal} fazendo · ${p.concluidosTotal} feito(s)`;
    renderBlocoDetalhe("fazendo", p.emAndamentoRecentes, p.emAndamentoTotal);
    renderBlocoDetalhe("esperando", p.pendentesRecentes, p.pendentesTotal);
    renderBlocoDetalhe("feitos", p.concluidosRecentes, p.concluidosTotal);
  }

  // chamado por renderTime() (app-gavetas.js) a cada poll (10s) — mantém o detalhe fresco
  // sem exigir novo clique; agente que sumiu da fila fecha o painel (fail-safe, não trava
  // mostrando dado velho de um papel que não existe mais no /time).
  function atualizarDetalheSeAberto(j) {
    ultimoEstadoTime = j;
    if (!detalheAgenteAtual) return;
    const p = papelPorNome(j, detalheAgenteAtual);
    if (p) renderDetalheAgente(p);
    else fecharDetalheAgente();
  }

  function abrirDetalheAgente(nome) {
    detalheAgenteAtual = nome;
    document.getElementById("time-detalhe").hidden = false;
    document.getElementById("time-detalhe-status").textContent = "";
    const p = papelPorNome(ultimoEstadoTime, nome);
    if (p) renderDetalheAgente(p);
    document.getElementById("time-detalhe").scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  function fecharDetalheAgente() {
    detalheAgenteAtual = null;
    const el = document.getElementById("time-detalhe");
    if (el) el.hidden = true;
  }

  // POST /comando (rota já existente, tratarComando em orquestra-viva.ts) — reusa, não
  // duplica. Agente sem escuta viva: envia mesmo assim e diz na hora (⚪, nunca silêncio) —
  // "fica na fila até alguém armar" é o comportamento real do fila.ts, não uma promessa.
  async function enviarComandoDetalhe(acao, texto) {
    const agente = detalheAgenteAtual;
    const statusEl = document.getElementById("time-detalhe-status");
    if (!agente) return;
    const p = papelPorNome(ultimoEstadoTime, agente);
    const escutaViva = !!(p && p.escuta && p.escuta.status === "viva");
    statusEl.textContent = "⚪ enviando…";
    try {
      const corpo = acao === "ping"
        ? { acao: "ping", agente }
        : { acao: "mensagem", agente, titulo: texto.slice(0, 120), corpo: texto };
      const r = await fetch("/comando", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(corpo),
      });
      const j = await r.json();
      if (!j.ok) { statusEl.textContent = `🔴 ${j.erro || "não enviou"}`; return; }
      const aviso = escutaViva ? "" : " · ⚪ sem escuta agora: fica na fila até alguém armar";
      statusEl.textContent = `🟢 pedido postado na espera${aviso}`;
      statusEl.title = j.caminho || "(caminho não devolvido)";
      if (acao === "mensagem") document.getElementById("time-detalhe-pedido").value = "";
      carregarTime(); // refaz o /time — o bloco "esperando" já mostra o job recém-postado
    } catch (e) {
      statusEl.textContent = `🔴 falha de rede: ${e}`;
    }
  }

  document.getElementById("time-detalhe-fechar").addEventListener("click", fecharDetalheAgente);
  document.getElementById("time-detalhe-enviar").addEventListener("click", () => {
    const ta = document.getElementById("time-detalhe-pedido");
    const texto = (ta.value || "").trim();
    if (!texto) { document.getElementById("time-detalhe-status").textContent = "🔴 escreva o pedido antes de enviar"; return; }
    enviarComandoDetalhe("mensagem", texto);
  });
  document.getElementById("time-detalhe-ping").addEventListener("click", () => enviarComandoDetalhe("ping"));

  // clique/teclado no papel-card → abre o detalhe. Delegação no grid (renderPapeis recria
  // o innerHTML a cada poll) — mesmo padrão de app-gavetas.js para outras listas vivas.
  document.getElementById("time-papeis-grid").addEventListener("click", (e) => {
    const card = e.target.closest(".papel-card[data-agente]");
    if (card) abrirDetalheAgente(card.dataset.agente);
  });
  document.getElementById("time-papeis-grid").addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const card = e.target.closest(".papel-card[data-agente]");
    if (card) { e.preventDefault(); abrirDetalheAgente(card.dataset.agente); }
  });
