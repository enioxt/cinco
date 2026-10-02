/* app-documentos.js — HISTORICO-DOCUMENTOS-001 (corte Enio 05/09: "no EGOS APP deve ir
   mostrando o histórico completo de documentos .md, .html, .pdf criados, para eu acessar
   facilmente todos eles, sem precisar ficar navegando em várias pastas"). ARQUIVO NOVO —
   consome /api/documentos, /api/documentos/raizes e /api/documentos/abrir (rotas-documentos.ts).
   Reusa escaparHtml/horaLocal/preencherModulo/abrirGaveta/fecharGaveta, já globais no mesmo
   escopo IIFE quando concatenado por /app.js (mesmo padrão de app-catalogo.js). NÃO wireado
   ainda: ver bloco INTEGRAÇÃO no fim do arquivo — Prime cola em orquestra-viva.ts/.html.

   Camada 1 (ícone+número), camada 2 (a gaveta com filtro/busca), camada 3 (clique abre o
   arquivo local via /api/documentos/abrir — nunca sai da máquina, =P4). */

  // ── estado do filtro (persiste enquanto a gaveta fica aberta) ──────────────────────
  let docFiltro = { tipo: "todos", raiz: "", dias: 0, q: "" };
  let docExpandidoIdx = null;
  let docUltimoResumo = null;

  function formatarBytes(n) {
    if (typeof n !== "number" || !Number.isFinite(n)) return "⚪";
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  }

  function idadeCurta(iso) {
    const ms = Date.now() - new Date(iso).getTime();
    if (!Number.isFinite(ms) || ms < 0) return "⚪";
    const min = Math.floor(ms / 60000);
    if (min < 1) return "há <1min";
    if (min < 60) return `há ${min}min`;
    const h = Math.floor(min / 60);
    if (h < 24) return `há ${h}h`;
    return `há ${Math.floor(h / 24)}d`;
  }

  // ── MÓDULO na home: número = total, linha1 = último criado + hora, linha2 = contagem por tipo
  async function atualizarModuloDocumentos() {
    if (!document.getElementById("mod-documentos")) return;
    try {
      const r = await fetch("/api/documentos?tipo=todos&n=1");
      const j = await r.json();
      const resumo = j.resumo || {};
      const total = typeof resumo.total === "number" ? resumo.total : null;
      if (total === null) { preencherModulo("documentos", "⚪", "⚪ não medido", ""); return; }
      const ultimo = Array.isArray(j.itens) && j.itens[0] ? j.itens[0] : null;
      const linha1 = ultimo
        ? `${ultimo.origem || "⚪"} ${escaparHtml(ultimo.nome)}${ultimo.estado && ultimo.estado !== "⚪" ? " · " + escaparHtml((ESTADO_HUMANO[ultimo.estado] || {}).rotulo || ultimo.estado) : ""} · ${horaLocal(ultimo.mtime)}`
        : "⚪ nenhum documento nas raízes declaradas";
      // DOC-HISTORICO-NA-HOME-001 (corte Enio 10/09: "esse histórico poderia ficar em um
      // espaço na página principal, se clicar expande"). O card É esse espaço e o clique JÁ
      // abre a gaveta — não nasce superfície nova (=ADOPT-BEFORE-BUILD). O que muda é o QUE
      // ele diz: contar .md/.html/.pdf informa o formato, e formato não é notícia. O que é
      // notícia é o que saiu daqui e o que voltou.
      //
      // O denominador viaja junto (R-UNIVERSO-DECLARADO-001): sem o total, "2 saíram" deixa
      // quem lê achar que só existem 2 documentos.
      const pe = resumo.porEstado || {};
      const saiu = (pe.enviado || 0) + (pe.confirmado || 0);
      const linha2 = saiu === 0
        ? `nenhum marcado como enviado · ${total} sem histórico registrado`
        : `${saiu} de ${total} saíram daqui · ${pe.confirmado || 0} confirmados · ${pe.pronto || 0} prontos sem sair`;
      // Cor da bolinha é medição, não decoração: verde só quando há confirmação registrada;
      // amarelo quando saiu e ninguém confirmou (é isso que merece o olho dele).
      const cor = (pe.confirmado || 0) > 0 ? "verde" : saiu > 0 ? "amarelo" : "cinza";
      preencherModulo("documentos", String(total), linha1, linha2, cor);
    } catch (e) {
      preencherModulo("documentos", "⚪", "🔴 falha ao medir documentos", "");
    }
  }

  // ── GAVETA: busca/filtra e lista ────────────────────────────────────────────────────
  async function carregarDocumentos() {
    const lista = document.getElementById("documentos-lista");
    const meta = document.getElementById("documentos-meta");
    if (!lista) return;
    meta && (meta.textContent = "⚪ carregando…");
    const p = new URLSearchParams();
    p.set("tipo", docFiltro.tipo || "todos");
    if (docFiltro.raiz) p.set("raiz", docFiltro.raiz);
    if (docFiltro.dias) p.set("dias", String(docFiltro.dias));
    if (docFiltro.q) p.set("q", docFiltro.q);
    p.set("n", "500");
    try {
      const r = await fetch(`/api/documentos?${p.toString()}`);
      const j = await r.json();
      renderDocumentos(j);
    } catch (e) {
      if (meta) meta.textContent = "🔴 falha ao consultar /api/documentos";
      lista.innerHTML = "";
    }
  }

  function popularSelectDinamico(id, contagem, rotuloTodos) {
    const sel = document.getElementById(id);
    if (!sel) return;
    const atual = sel.value;
    const chaves = Object.keys(contagem || {}).sort((a, b) => (contagem[b] || 0) - (contagem[a] || 0));
    sel.innerHTML = `<option value="">${rotuloTodos}</option>` +
      chaves.map((k) => `<option value="${escaparHtml(k)}">${escaparHtml(k)} (${contagem[k]})</option>`).join("");
    if (chaves.includes(atual)) sel.value = atual;
  }

  // ── ESTADO DO DOCUMENTO (DOC-ESTADO-NA-TELA-001, corte Enio 10/09) ─────────────────
  // A API já servia `estado`, `destino`, `mudancas` e `estadoDesde` desde 09/08 e a LINHA
  // jogava tudo fora: 3.167 documentos apareciam iguais e saber o que tinha sido enviado
  // exigia abrir um por um. Aqui não se mede nada novo — só se desenha o que já vinha.
  //
  // VOCABULARIO-LEIGO-001: o dono não lê código nem jargão de status. `enviado` vira "saiu
  // daqui", `confirmado` vira "chegou e responderam". E `⚪` diz "ninguém marcou", NUNCA
  // "não enviado" — as duas coisas são diferentes e confundi-las é o erro que este campo
  // existe para evitar (=R13-c: ausência de registro não é prova de ausência de evento).
  const ESTADO_HUMANO = {
    rascunho: { rotulo: "rascunho", cor: "cinza", ajuda: "começado, ainda não está pronto" },
    pronto: { rotulo: "pronto", cor: "amarelo", ajuda: "terminado, mas ainda não saiu daqui" },
    enviado: { rotulo: "saiu daqui", cor: "acento", ajuda: "eu mandei — não quer dizer que leram" },
    confirmado: { rotulo: "chegou", cor: "verde", ajuda: "o outro lado confirmou o recebimento" },
  };

  function seloEstadoDoc(item) {
    const e = ESTADO_HUMANO[item.estado];
    if (!e) {
      return '<span class="doc-estado e-nao-medido" title="ninguém marcou o estado deste documento — isto NÃO quer dizer que ele não foi enviado">⚪ sem marca</span>';
    }
    const destino = item.destino ? ` → ${escaparHtml(item.destino)}` : "";
    return `<span class="doc-estado e-${e.cor}" title="${escaparHtml(e.ajuda)}">${escaparHtml(e.rotulo)}${destino}</span>`;
  }

  /** A proveniência em uma frase: quantas vezes mudou de mão e desde quando está parado. */
  function proveniencia(item) {
    if (!item.mudancas) return "";
    const vezes = item.mudancas === 1 ? "1 mudança de estado" : `${item.mudancas} mudanças de estado`;
    const desde = item.estadoDesde ? ` · última ${idadeCurta(item.estadoDesde)}` : "";
    return `${vezes}${desde}`;
  }

  function linhaDocumento(item, idx) {
    const par = item.par ? ` <span title="abre o .html (par de ${escaparHtml(item.nome)})">↳ par .html</span>` : "";
    const expandida = docExpandidoIdx === idx;
    const prov = proveniencia(item);
    // O detalhe expandido é a "cebola": a linha de cima decide, isto aqui explica. Cada
    // pedaço só aparece se existir — seção vazia com rótulo bonito é ruído que ensina a
    // ignorar a área inteira.
    const detalhe = expandida
      ? `<div class="doc-linha-detalhe">
           <div class="dd-caminho">${escaparHtml(item.caminho)} · ${formatarBytes(item.tamanho)}</div>
           ${prov ? `<div class="dd-prov">${escaparHtml(prov)}</div>` : ""}
           ${item.observacao ? `<div class="dd-obs"><b>o que aconteceu:</b> ${escaparHtml(item.observacao)}</div>` : ""}
           ${item.proximaAcao ? `<div class="dd-prox"><b>próxima ação:</b> ${escaparHtml(item.proximaAcao)}</div>` : ""}
           ${!item.observacao && !item.proximaAcao ? '<div class="dd-vazio">nenhuma observação escrita — abra o documento para marcar estado, destino e próxima ação</div>' : ""}
         </div>`
      : "";
    return `
      <div class="doc-linha" data-doc-idx="${idx}">
        <div class="doc-linha-topo">
          <span class="doc-origem" title="origem">${item.origem}</span>
          <span class="doc-nome">${escaparHtml(item.nome)}${par}</span>
          ${seloEstadoDoc(item)}
          <span class="doc-selo">.${escaparHtml(item.tipo)}</span>
          <span class="doc-raiz">${escaparHtml(item.raiz)}</span>
          <span class="doc-idade">${idadeCurta(item.mtime)}</span>
          <button type="button" class="btn-header doc-abrir" data-doc-abrir="${idx}">abrir</button>
          <button type="button" class="btn-header doc-copiar" data-doc-copiar="${idx}">copiar caminho</button>
          <button type="button" class="btn-header doc-copiar-arquivo" data-doc-copiar-arquivo="${idx}">copiar arquivo</button>
        </div>
        ${item.proximaAcao && !expandida ? `<div class="doc-linha-prox">↻ ${escaparHtml(item.proximaAcao)}</div>` : ""}
        ${detalhe}
      </div>`;
  }

  let docItensAtuais = [];

  function renderDocumentos(j) {
    const lista = document.getElementById("documentos-lista");
    const meta = document.getElementById("documentos-meta");
    if (!lista) return;
    docUltimoResumo = j.resumo || null;
    docItensAtuais = Array.isArray(j.itens) ? j.itens : [];
    popularSelectDinamico("documentos-tipo", (j.resumo || {}).porTipo, "todos os tipos");
    popularSelectDinamico("documentos-raiz", (j.resumo || {}).porRaiz, "todas as raízes");
    const universo = (j.resumo && typeof j.resumo.total === "number") ? j.resumo.total : "⚪";
    const tetoTexto = j.resumo && j.resumo.teto ? ` · teto de ${j.resumo.teto} atingido nesta varredura` : "";
    if (meta) meta.textContent = `${docItensAtuais.length} de ${universo}${tetoTexto} · varrido ${horaLocal((j.resumo || {}).varridoEm)}`;
    lista.innerHTML = docItensAtuais.length
      ? docItensAtuais.map(linhaDocumento).join("")
      : `<div class="doc-vazio">⚪ nenhum documento encontrado com este filtro</div>`;

    lista.querySelectorAll("[data-doc-idx]").forEach((linha) => {
      linha.addEventListener("click", (e) => {
        if (e.target.closest("[data-doc-abrir], [data-doc-copiar], [data-doc-copiar-arquivo]")) return;
        const idx = Number(linha.dataset.docIdx);
        docExpandidoIdx = docExpandidoIdx === idx ? null : idx;
        renderDocumentos(j);
      });
    });
    // DV-1-VISUALIZADOR-ESTADO-COMENTARIO-001: "abrir" passa a abrir o visualizador DENTRO
    // do app (abrirDocumentoVivo, definida em app-documento-vivo.js — vem depois deste
    // arquivo na concatenação de /app.js). O xdg-open antigo virou o botão "abrir fora"
    // dentro do próprio visualizador (dv-abrir-fora).
    lista.querySelectorAll("[data-doc-abrir]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const item = docItensAtuais[Number(btn.dataset.docAbrir)];
        if (!item) return;
        if (typeof abrirDocumentoVivo === "function") abrirDocumentoVivo(item);
      });
    });
    lista.querySelectorAll("[data-doc-copiar]").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const item = docItensAtuais[Number(btn.dataset.docCopiar)];
        if (!item) return;
        const original = btn.textContent;
        try {
          await navigator.clipboard.writeText(item.caminho);
          btn.textContent = "copiado ✓";
        } catch {
          btn.textContent = "🔴 sem permissão de clipboard";
        }
        setTimeout(() => { btn.textContent = original; }, 2000);
      });
    });
    lista.querySelectorAll("[data-doc-copiar-arquivo]").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const item = docItensAtuais[Number(btn.dataset.docCopiarArquivo)];
        if (!item) return;
        const original = btn.textContent;
        btn.textContent = "copiando…";
        try {
          const r = await fetch("/api/documentos/copiar-arquivo", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ caminho: item.caminho }),
          });
          const j = await r.json();
          btn.textContent = j.ok ? "copiado ✓" : `🔴 ${j.erro || "falhou"}`;
        } catch (err) {
          btn.textContent = `🔴 ${err instanceof Error ? err.message : "falha de rede"}`;
        }
        setTimeout(() => { btn.textContent = original; }, 2500);
      });
    });
  }

  function inicializarFiltrosDocumentos() {
    const busca = document.getElementById("documentos-busca");
    const tipo = document.getElementById("documentos-tipo");
    const raiz = document.getElementById("documentos-raiz");
    const periodo = document.getElementById("documentos-periodo");
    if (busca) {
      let t = null;
      busca.addEventListener("input", () => {
        clearTimeout(t);
        t = setTimeout(() => { docFiltro.q = busca.value.trim(); carregarDocumentos(); }, 250);
      });
    }
    if (tipo) tipo.addEventListener("change", () => { docFiltro.tipo = tipo.value || "todos"; carregarDocumentos(); });
    if (raiz) raiz.addEventListener("change", () => { docFiltro.raiz = raiz.value || ""; carregarDocumentos(); });
    if (periodo) {
      periodo.querySelectorAll("[data-doc-dias]").forEach((b) => {
        b.addEventListener("click", () => {
          docFiltro.dias = Number(b.dataset.docDias) || 0;
          periodo.querySelectorAll("[data-doc-dias]").forEach((x) => x.classList.remove("ativo"));
          b.classList.add("ativo");
          carregarDocumentos();
        });
      });
    }
    const fechar = document.getElementById("documentos-fechar");
    if (fechar) fechar.addEventListener("click", () => fecharGaveta("documentos-overlay"));
    const btn = document.getElementById("btn-documentos");
    // GAVETA-ABRE-CARREGADA-001: quem carrega é a gaveta, não o botão.
    window.__ABRIDORES = window.__ABRIDORES || {};
    window.__ABRIDORES["documentos-overlay"] = carregarDocumentos;
    if (btn) btn.addEventListener("click", () => abrirGaveta("documentos-overlay"));
  }

  document.addEventListener("DOMContentLoaded", inicializarFiltrosDocumentos);

/* ── INTEGRAÇÃO (Prime cola em orquestra-viva.ts e orquestra-viva.html) ────────────────
 * 1) orquestra-viva.ts — acrescentar ao array APP_JS_PARTS_PATHS (depois de app-agentes.js):
 *      join(import.meta.dir, "orquestra-viva", "app-documentos.js"),
 * 2) orquestra-viva.ts — no roteador (mesmo bloco de /app.js), servir app-documentos.css
 *    concatenado com app.css (mesmo padrão do item acima, novo array CSS_PARTS_PATHS ou
 *    um <link rel="stylesheet" href="/app-documentos.css"> + nova rota GET que serve o
 *    arquivo com content-type text/css — a mais simples: nova rota dedicada).
 * 3) orquestra-viva.html — card do módulo na grade (mesmo padrão de mod-catalogo) +
 *    gaveta #documentos-overlay + botão de dock #btn-documentos. Markup mínimo abaixo,
 *    IDs exigidos por este arquivo: mod-documentos(+numero/linha1/linha2), btn-documentos,
 *    documentos-overlay, documentos-fechar, documentos-busca, documentos-tipo (select),
 *    documentos-raiz (select), documentos-periodo (container com [data-doc-dias="7|30|90"]),
 *    documentos-meta, documentos-lista.
 *   <button type="button" class="modulo-card" id="mod-documentos" data-abre="btn-documentos"
 *     data-tt-titulo="Documentos" data-tt-abre="Histórico de .md/.html/.pdf criados nesta máquina.">
 *     <div class="mod-topo">
 *       <div class="mod-icone" style="--tint:var(--acento)">
 *         <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>
 *       </div>
 *       <div class="mod-titulos"><div class="mod-titulo">Documentos</div><div class="mod-subtitulo">md · html · pdf</div></div>
 *       <div class="mod-numero" id="mod-documentos-numero">⚪</div>
 *     </div>
 *     <div class="mod-linha" id="mod-documentos-linha1"><span class="mod-bolinha"></span><span>⚪ não medido</span></div>
 *     <div class="mod-linha" id="mod-documentos-linha2"></div>
 *     <div class="mod-abrir">abrir →</div>
 *   </button>
 *   <button id="btn-documentos" class="btn-header" aria-label="documentos"
 *     data-tt-titulo="Documentos" data-tt-abre="Histórico de .md/.html/.pdf criados nesta máquina.">
 *     <span class="ic" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg></span>
 *     <span class="rotulo">documentos</span>
 *   </button>
 *   <div id="documentos-overlay" class="gaveta-overlay">
 *     <div id="documentos-caixa" class="gaveta">
 *       <button class="fechar" id="documentos-fechar">✕</button>
 *       <h2>📄 Documentos — histórico do que já foi criado</h2>
 *       <div id="documentos-meta" class="gaveta-meta">⚪ carregando…</div>
 *       <div class="doc-filtros">
 *         <input id="documentos-busca" placeholder="buscar por nome…" />
 *         <select id="documentos-tipo"><option value="">todos os tipos</option></select>
 *         <select id="documentos-raiz"><option value="">todas as raízes</option></select>
 *         <span id="documentos-periodo">
 *           <button type="button" data-doc-dias="7">7d</button>
 *           <button type="button" data-doc-dias="30">30d</button>
 *           <button type="button" data-doc-dias="90">90d</button>
 *           <button type="button" data-doc-dias="0" class="ativo">tudo</button>
 *         </span>
 *       </div>
 *       <div id="documentos-lista"></div>
 *     </div>
 *   </div>
 * 4) montarEstado()/poll do painel — chamar atualizarModuloDocumentos() no mesmo ciclo
 *    que já chama atualizarModuloCatalogo() (app-catalogo.js), mesmo padrão.
 * 5) app-documentos.css (arquivo irmão deste): incluir no bundle CSS servido em /app.css.
 */
