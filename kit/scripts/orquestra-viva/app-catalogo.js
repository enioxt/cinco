/* Extraido de app.js (1436L) na refatoracao organica de 04/09, passo 2/3 (divisao por dominio) — codigo MOVIDO, nao escrito. Dominio: catalogo (grid/filtro/item) + atalhos do perfil (mod-atalhos, chamado por aplicarPerfilNaHome em app-nucleo.js) + EGOS App (4 blocos: gerar HTML/observabilidade/guard-brasil/leaderboard/banda) — realocado de "gavetas" para caber no teto de 600L (ver app-gavetas.js). Servido concatenado (3o bloco, ultimo) por /app.js (scripts/orquestra-viva.ts). Arquivo passou de 500L em 06/09 (LEIGOS fatia 3: glossário + motivo humano); próximo corte de domínio: mover glossário para app-glossario.js (R-REFACTOR-ORG-001), warn do gate é 600L. Rebase 04/09: bloco AGENDA UNIFICADA (fetch /agenda, tiles, renderAgenda) vive aqui; o registro de fechamento ("agenda-overlay" no GAVETAS/fecharGaveta) continua em app-gavetas.js. */
  // ── MOTIVO HUMANO EM CINZA (FATIA 3, VOCABULARIO-LEIGO-001, corte Enio 05/09 "pensei em
  // leigos"): todo item cinza — atalho do perfil, item do catálogo, fonte da agenda — mostra
  // 1 frase sem jargão. window.VOCAB.integracao já nomeia vps/whatsapp/email/federacao/
  // cinco/chave (config/vocabulario.json, fatia 1/2) — reusado aqui em vez de escrever um 2º
  // dicionário (=ADOPT). Texto livre do censo (federacao-universos.ts "estado: X — motivo",
  // "(NEXT n/a)") é limpo do prefixo técnico e do parêntese de código antes de virar frase;
  // hora ausente vira "⚪ nunca lido daqui" — o R-SEMAFORO-QUATRO-001 pede a palavra ao lado
  // da cor, ⚪ sozinho não basta.
  function humanoIntegracao(chave) {
    const v = (window.VOCAB && window.VOCAB.integracao && window.VOCAB.integracao[chave]) || null;
    return (v && v.humano) || chave;
  }

  function humanizarMotivo(bruto, contexto) {
    if (!bruto) return contexto === "agenda" ? "sem compromisso lido hoje" : "não ativado";
    const texto = String(bruto).trim();
    const vocabIntegracao = (window.VOCAB && window.VOCAB.integracao) || {};
    for (const chave of Object.keys(vocabIntegracao)) {
      if (new RegExp(`\\b${chave}\\b`, "i").test(texto)) return `falta ${humanoIntegracao(chave)}`;
    }
    if (contexto === "agenda" && /nenhum|sem compromisso|0 item/i.test(texto)) return "sem compromisso lido hoje";
    // fallback: 1ª frase, sem prefixo técnico "estado:" e sem parêntese de código.
    return (
      texto
        .replace(/^estado:\s*/i, "")
        .replace(/\([^)]*\)/g, "")
        .split(/\s*[—-]\s*/)[0]
        .trim() || "motivo não registrado"
    );
  }

  function horaOuNuncaLida(iso) {
    const h = horaLocal(iso);
    return h === "⚪" ? "⚪ nunca lido daqui" : h;
  }

  function renderModuloAtalhos(perfilAtivo) {
    const card = document.getElementById("mod-atalhos");
    const lista = document.getElementById("mod-atalhos-lista");
    if (!card || !lista) return;
    const atalhos = Array.isArray(perfilAtivo.atalhos) ? perfilAtivo.atalhos : [];
    card.hidden = atalhos.length === 0;
    if (!atalhos.length) return;
    const integracoes = Array.isArray(perfilAtivo.integracoes) ? perfilAtivo.integracoes : [];
    lista.innerHTML = atalhos.map((a, idx) => {
      const falta = a.integracao && !integracoes.includes(a.integracao);
      const rotulo = escaparHtml(a.rotulo || a.id || "atalho");
      // texto VISÍVEL leva "falta" (não só o title/tooltip — R13-c: estado indisponível dito,
      // não escondido atrás de um hover que ninguém passa o mouse).
      const texto = falta ? `⚫ ${rotulo} · ainda não funciona aqui: falta ${escaparHtml(humanoIntegracao(a.integracao))}` : `▶ ${rotulo}`;
      // camada 2 (APP-3-CAMADAS-ICONE-HOVER-CLIQUE-001): data-tt-* substitui title="" —
      // tooltip próprio funciona no toque, title não.
      const ttAbre = falta ? `ainda não funciona aqui: falta ${escaparHtml(humanoIntegracao(a.integracao))}` : `Roda ${escaparHtml(a.tipo || "skill")} — cai na fila da coordenadora.`;
      return `<button type="button" data-atalho-idx="${idx}" ${falta ? "disabled" : ""} ` +
        `data-tt-titulo="${rotulo}" data-tt-abre="${ttAbre}" ` +
        `style="padding:4px 10px;border-radius:999px;border:1px solid var(--borda,#2a3346);background:transparent;color:inherit;` +
        `${falta ? "opacity:0.5;cursor:default" : "cursor:pointer"}">${texto}</button>`;
    }).join("");
    lista.querySelectorAll("[data-atalho-idx]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const a = atalhos[Number(btn.dataset.atalhoIdx)];
        if (!a || btn.disabled) return;
        if (a.tipo === "agente") {
          abrirGaveta("catalogo-overlay");
          document.getElementById("catalogo-busca").value = a.rotulo || "";
          carregarCatalogo();
          return;
        }
        // skill/comando/loop: reusa /comando (mesma rota que a fila do painel já usa) —
        // posta uma mensagem para o 1º agente do perfil (ou "forja" na ausência de perfil).
        const original = btn.textContent;
        btn.disabled = true;
        btn.textContent = "postando…";
        try {
          const agente = (perfilAtivo.agentes && perfilAtivo.agentes[0]) || "forja";
          const r = await fetch("/comando", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              acao: "mensagem",
              agente,
              titulo: `Rodar ${a.tipo || "skill"}: ${a.rotulo || a.id} (${a.id})`,
              corpo: `Pedido pelo atalho "⭐ o que eu mais faço" do EGOS APP (perfil ${perfilAtivo.nome || "?"}).`,
            }),
          });
          const j = await r.json();
          btn.textContent = j.ok ? "postado ✓" : `🔴 ${(j.erro || "falhou").slice(0, 40)}`;
        } catch (e) {
          btn.textContent = `🔴 ${e}`;
        }
        setTimeout(() => { btn.disabled = false; btn.textContent = original; }, 4000);
      });
    });
  }

  // ── CATÁLOGO: o que já temos, medido colorido / declarado em cinza clicável
  // (EGOS-APP-DO-TODO-001, corte Enio 02/09). Lê /api/catalogo, que por sua vez lê
  // apps/egos-landing/public/federacao.json — nenhum índice novo (=ADOPT).
  // 3 estados (SKILLS-ACHAVEIS-APP-001, acréscimo 04/09): medido (🟢, colorido) · declarado/
  // em-desenvolvimento (⚪, cinza tracejado, "em desenvolvimento") · nao-ativado (⚫, cinza
  // tracejado, texto = item.falta — não é o mesmo "não ativado" do perfil/integração; este
  // vem do próprio censo, ex.: projeto pausado). Qualquer outro estado cai no ⚪ genérico.
  function seloCatalogo(i) {
    if (i.estado === "medido") return { emoji: "🟢", cinza: false, sufixo: "" };
    if (i.estado === "nao-ativado") return { emoji: "⚫", cinza: true, sufixo: i.falta ? ` · ${humanizarMotivo(i.falta, i.categoria)}` : " · não ativado" };
    return { emoji: "⚪", cinza: true, sufixo: " · em desenvolvimento" };
  }

  function tileCatalogo(i) {
    const selo = seloCatalogo(i);
    return `
        <div class="tile-integracao ${selo.cinza ? "" : "ativa"}" data-cat-id="${escaparHtml(i.id)}" style="cursor:pointer;${selo.cinza ? "opacity:0.62;border-style:dashed" : ""}">
          <div class="ti-nome">${selo.emoji} ${escaparHtml(i.nome)}</div>
          <div class="ti-detalhe">${escaparHtml(i.categoria)}${escaparHtml(selo.sufixo)}</div>
        </div>`;
  }

  // FILTRO-DOMINIO-PERFIL (fatia 3, 04/09 — SKILLS-ACHAVEIS-APP-001/perfil.dominios sem
  // consumidor até aqui, EGOS_SURFACES_ROUTING.md §10.3 item 2): o catálogo abre já filtrado
  // pelos domínios do perfil ativo quando perfil.dominios não é vazio. Chip liga por padrão
  // (1 clique desliga e mostra tudo); domínio do item é o campo `categoria` do índice.
  // Chamado por aplicarPerfilNaHome (app-nucleo.js) — cross-arquivo, mesmo padrão de
  // atualizarTooltipSeAberto/renderModuloAtalhos.
  let dominiosPerfilAtivo = [];
  let chipDominiosLigado = true;

  function aplicarPerfilNoCatalogo(perfilAtivo) {
    dominiosPerfilAtivo = Array.isArray(perfilAtivo && perfilAtivo.dominios) ? perfilAtivo.dominios : [];
    const linha = document.getElementById("catalogo-dominio-linha");
    if (linha) linha.hidden = dominiosPerfilAtivo.length === 0;
  }

  function renderCatalogo(j) {
    const grid = document.getElementById("catalogo-grid");
    const meta = document.getElementById("catalogo-meta");
    const manchete = document.getElementById("catalogo-manchete");
    if (j.erro) { meta.textContent = j.erro; manchete.innerHTML = ""; grid.innerHTML = ""; return; }
    const idade = j.idadeMin === null ? "⚪ idade não-medida" : `índice de ${j.idadeMin} min atrás`;
    meta.textContent = `${idade} · gerado em ${horaLocal(j.geradoEm)}`;
    manchete.innerHTML = `<b>${j.medidos}</b> medido(s) · <b>${j.declarados}</b> declarado(s)/em desenvolvimento de <b>${j.total}</b> no total.`;
    // contagem "N de M" do filtro por domínio (R-UNIVERSO-DECLARADO-001): N = itens após o
    // filtro (inclui domínio quando ligado), M = universo inteiro do índice (j.total, antes
    // de qualquer filtro). Domínio pedido pelo perfil que não existe no índice é dito, nunca
    // vira tela vazia muda.
    const contDominio = document.getElementById("catalogo-dominio-contagem");
    if (contDominio && dominiosPerfilAtivo.length) {
      const desconhecidos = j.dominiosDesconhecidos || [];
      const baseTexto = `${j.itens.length} de ${j.total}`;
      contDominio.textContent = desconhecidos.length
        ? `${baseTexto} · domínio ${desconhecidos.map((d) => `'${d}'`).join(", ")} não existe no índice`
        : baseTexto;
    }
    // seletor de tipo sai do dado (SKILLS-ACHAVEIS-APP-001) — sem lista fixa: tipo novo no
    // índice (motor/golden/gate/…) aparece sozinho no filtro, sem tocar este arquivo.
    const selTipo = document.getElementById("catalogo-tipo");
    const tipoAtual = selTipo.value || "todos";
    selTipo.innerHTML = `<option value="todos">todos os tipos</option>` +
      (j.tipos || []).map((t) => `<option value="${escaparHtml(t.nome)}">${escaparHtml(t.nome)} (${t.n})</option>`).join("");
    if ([...selTipo.options].some((o) => o.value === tipoAtual)) selTipo.value = tipoAtual;
    // seletor de domínio sai do dado (contagem por domínio), preservando a escolha atual
    const selCat = document.getElementById("catalogo-categoria");
    const atual = selCat.value || "todas";
    selCat.innerHTML = `<option value="todas">todos os domínios</option>` +
      (j.categorias || []).map((c) => `<option value="${escaparHtml(c.nome)}">${escaparHtml(c.nome)} (${c.n})</option>`).join("");
    if ([...selCat.options].some((o) => o.value === atual)) selCat.value = atual;
    grid.innerHTML = j.itens.length
      ? `<div class="grade-tiles">${j.itens.map(tileCatalogo).join("")}</div>`
      : `<div class="ti-detalhe">nenhum item para este filtro</div>`;
    grid.querySelectorAll("[data-cat-id]").forEach((el) => {
      el.addEventListener("click", async () => {
        const item = j.itens.find((x) => x.id === el.dataset.catId);
        if (!item) return;
        const det = document.getElementById("catalogo-detalhe");
        det.style.display = "block";
        // camadas: 1 o que é · 2 onde vive e o que prova · 3 quando mudou (medido por git, sob clique)
        const semDesc = !item.descricao;
        const seloDet = seloCatalogo(item);
        det.innerHTML = `<b>${escaparHtml(item.nome)}</b> · ${escaparHtml(item.tipo)} · <span class="chip">${escaparHtml(item.categoria)}</span> — ${seloDet.emoji} ${item.estado === "medido" ? "medido" : escaparHtml(seloDet.sufixo.replace(/^ · /, ""))}<br>` +
          `${semDesc ? "⚪ sem descrição no arquivo — quem abrir, escreve" : escaparHtml(item.descricao)}<br>` +
          `<details style="margin-top:6px"><summary style="cursor:pointer">onde vive · o que prova · quando mudou</summary>` +
          `<span style="color:var(--texto-fraco)">fonte: ${escaparHtml(item.fonte)}</span><br>` +
          `<span style="color:var(--texto-fraco)">prova: ${item.prova ? escaparHtml(item.prova) : "⚪ prova ausente"}</span><br>` +
          `<span id="cat-mudou" style="color:var(--texto-fraco)">última mudança: medindo…</span></details>`;
        try {
          const r = await fetch(`/api/catalogo/item?id=${encodeURIComponent(item.id)}`);
          const d = await r.json();
          const alvo = document.getElementById("cat-mudou");
          if (!alvo) return;
          alvo.textContent = d.mudouEm
            ? `última mudança: ${horaLocal(d.mudouEm)} (${d.mudouHa} dia(s) atrás, commit ${d.commit})`
            : "última mudança: ⚪ não-medida (fonte fora do git ou sem histórico)";
        } catch (e) { const alvo = document.getElementById("cat-mudou"); if (alvo) alvo.textContent = `última mudança: 🔴 ${e}`; }
      });
    });
  }

  let catalogoTimer = null;
  async function carregarCatalogo() {
    const meta = document.getElementById("catalogo-meta");
    meta.textContent = "medindo…";
    try {
      const busca = encodeURIComponent(document.getElementById("catalogo-busca").value || "");
      const tipo = encodeURIComponent(document.getElementById("catalogo-tipo").value || "todos");
      const categoria = encodeURIComponent(document.getElementById("catalogo-categoria").value || "todas");
      const dominios = (chipDominiosLigado && dominiosPerfilAtivo.length)
        ? `&dominios=${encodeURIComponent(dominiosPerfilAtivo.join(","))}` : "";
      const r = await fetch(`/api/catalogo?busca=${busca}&tipo=${tipo}&categoria=${categoria}${dominios}`);
      renderCatalogo(await r.json());
    } catch (e) {
      meta.textContent = `🔴 falha ao carregar catálogo: ${e}`;
    }
  }
  if (catalogoTimer) clearTimeout(catalogoTimer);
  document.getElementById("catalogo-busca").addEventListener("input", () => {
    clearTimeout(catalogoTimer);
    catalogoTimer = setTimeout(carregarCatalogo, 250);
  });
  document.getElementById("catalogo-tipo").addEventListener("change", carregarCatalogo);
  document.getElementById("catalogo-categoria").addEventListener("change", carregarCatalogo);
  // GAVETA-ABRE-CARREGADA-001: quem carrega é a gaveta, não o botão.
  window.__ABRIDORES = window.__ABRIDORES || {};
  window.__ABRIDORES["catalogo-overlay"] = carregarCatalogo;
  document.getElementById("btn-catalogo").addEventListener("click", () => abrirGaveta("catalogo-overlay"));
  document.getElementById("catalogo-fechar").addEventListener("click", () => fecharGaveta("catalogo-overlay"));
  document.getElementById("catalogo-chip-dominios").addEventListener("click", (ev) => {
    chipDominiosLigado = !chipDominiosLigado;
    ev.currentTarget.setAttribute("aria-pressed", String(chipDominiosLigado));
    ev.currentTarget.style.opacity = chipDominiosLigado ? "1" : "0.55";
    carregarCatalogo();
  });

  // ── EGOS APP — 4 blocos (EGOS-APP-4BLOCOS-001) ──────────────────────────────────────
  function corDoEstado(cor) {
    return cor === "verde" ? "🟢" : cor === "amarelo" ? "🟡" : cor === "vermelho" ? "🔴" : "⚪";
  }

  async function carregarApp4Gerar() {
    const meta = document.getElementById("app4-gerar-meta");
    const lista = document.getElementById("app4-gerar-lista");
    try {
      const r = await fetch("/api/apresentacoes");
      const j = await r.json();
      const itens = j.md || [];
      document.getElementById("cont-app4-gerar").textContent = String(itens.length);
      meta.textContent = itens.length ? `${itens.length} arquivo(s) .md recentes (docs/presentations/ + docs/jobs/)` : "⚪ nenhum .md encontrado";
      lista.innerHTML = itens.map((it) => `
        <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid #1c2434;font-size:12.5px">
          <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${it.caminho}</span>
          <span style="color:var(--texto-fraco)">${it.mtime.slice(0, 10)}</span>
          <button class="btn-header" data-md="${it.caminho}" onclick="gerarHtmlDe(this.dataset.md)">gerar HTML (cebola)</button>
        </div>`).join("");
    } catch (e) {
      meta.textContent = `🔴 falha ao listar .md: ${e}`;
    }
  }

  window.gerarHtmlDe = async function (md) {
    const res = document.getElementById("app4-gerar-resultado");
    res.textContent = "⚪ gerando…";
    try {
      const r = await fetch("/api/gerar-html", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ md }) });
      const j = await r.json();
      if (j.ok) {
        res.innerHTML = `🟢 gerado: ${j.html} (${j.idadeMin} min) — <button class="btn-header" onclick="window.open('/${j.html}', '_blank')">abrir</button>`;
      } else {
        res.textContent = `🔴 ${j.erro}`;
      }
    } catch (e) {
      res.textContent = `🔴 falha: ${e}`;
    }
  };

  async function carregarApp4Obs() {
    const meta = document.getElementById("app4-obs-meta");
    const lista = document.getElementById("app4-obs-lista");
    try {
      const r = await fetch("/api/observabilidade");
      const j = await r.json();
      const n = (j.itens || []).length;
      document.getElementById("cont-app4-obs").textContent = String(n);
      const pulseTxt = j.pulse && j.pulse.ultimaMedicao ? `pulso: ${j.pulse.ultimaMedicao}` : "pulso: ⚪ sem medição";
      const myTxt = j.myceliumIdadeMin === null || j.myceliumIdadeMin === undefined ? "mycelium: ⚪ sem snapshot" : `mycelium: ${j.myceliumIdadeMin} min`;
      if (j.erro) {
        meta.textContent = `${j.erro} · ${pulseTxt} · ${myTxt}`;
        lista.innerHTML = "";
        return;
      }
      meta.textContent = `${pulseTxt} · ${myTxt}`;
      lista.innerHTML = (j.itens || []).map((it) => `<div style="padding:4px 0">${corDoEstado(it.cor)} ${it.nome ?? "?"} — ${it.detalhe ?? ""}</div>`).join("");
    } catch (e) {
      meta.textContent = `🔴 falha: ${e}`;
    }
  }

  async function carregarApp4Guard() {
    const corpo = document.getElementById("app4-guard-corpo");
    try {
      const r = await fetch("/api/guard-brasil");
      const j = await r.json();
      document.getElementById("cont-app4-guard").textContent = j.card ? "1" : "0";
      const sondaTxt = j.sonda === "online" ? "🟢 guard.egos.ia.br online" : j.sonda === "offline" ? "🔴 guard.egos.ia.br offline" : "⚪ sonda desligada";
      if (!j.card) {
        corpo.textContent = `${j.erro} · ${sondaTxt}`;
        return;
      }
      corpo.innerHTML = `<div style="font-weight:600">${j.card.titulo}</div>
        <div style="margin-top:4px">${j.card.numeros.map((n) => `<span style="margin-right:10px">${n}</span>`).join("")}</div>
        <div style="margin-top:8px">${sondaTxt} · <button class="btn-header" onclick="window.open('/${j.caminho}', '_blank')">abrir</button></div>`;
    } catch (e) {
      corpo.textContent = `🔴 falha: ${e}`;
    }
  }

  async function carregarApp4Leaderboard() {
    const lista = document.getElementById("app4-lb-lista");
    try {
      const r = await fetch("/api/leaderboard");
      const j = await r.json();
      const top = j.top || [];
      document.getElementById("cont-app4-lb").textContent = String(top.length);
      if (!top.length) { lista.textContent = "⚪ nenhum commit nos últimos 7 dias nos repos monitorados"; return; }
      lista.innerHTML = top.map((l, i) => `
        <div style="display:flex;gap:8px;padding:4px 0;font-size:12.5px">
          <span style="width:24px">${i + 1}º</span>
          <span style="flex:1">${l.icone} ${l.pessoa}</span>
          <span>${l.pontos} pts</span>
          <span style="color:var(--texto-fraco)">${l.ultimaContribuicao === "⚪" ? "⚪" : l.ultimaContribuicao.slice(0, 10)}</span>
        </div>`).join("");
    } catch (e) {
      lista.textContent = `🔴 falha: ${e}`;
    }
  }

  window.pedirBanda = async function () {
    const questaoEl = document.getElementById("app4-banda-questao");
    const dryEl = document.getElementById("app4-banda-ensaio");
    const res = document.getElementById("app4-banda-resultado");
    const questao = questaoEl.value.trim();
    if (!questao) { res.textContent = "🔴 escreva a questão antes de pedir"; return; }
    res.textContent = "⚪ pedindo à Banda…";
    try {
      const r = await fetch("/api/banda", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ questao, dry: dryEl.checked }),
      });
      const j = await r.json();
      if (!j.ok) { res.textContent = `🔴 ${j.erro}`; return; }
      const abrirTrace = j.trace ? `<div style="margin-top:6px"><details><summary>ver os 4 papéis (trace)</summary><a href="/${j.trace}" target="_blank">${j.trace}</a></details></div>` : "";
      res.innerHTML = `<div style="white-space:pre-wrap">${escaparHtml(j.sintese)}</div><div style="margin-top:6px;color:var(--texto-fraco)">${escaparHtml(String(j.custo_estimado ?? ""))}${j.dry ? " · ensaio" : ""}</div>${abrirTrace}`;
    } catch (e) {
      res.textContent = `🔴 falha: ${e}`;
    }
  };

  function carregarApp4() {
    carregarApp4Gerar();
    carregarApp4Obs();
    carregarApp4Guard();
    carregarApp4Leaderboard();
  }

  window.__ABRIDORES["app4-overlay"] = carregarApp4;
  document.getElementById("btn-app4").addEventListener("click", () => abrirGaveta("app4-overlay"));
  document.getElementById("app4-fechar").addEventListener("click", () => fecharGaveta("app4-overlay"));

  // ── AGENDA UNIFICADA (EGOS-APP-AGENDA-001, corte Enio 04/09) — fetch /agenda,
  // preenche o card da grade + a gaveta. Selo por estado: 🟢 viva · 🟡 manual/envelhecida ·
  // 🔴 ausente/quebrada; não-ativo nunca vira "ok" (=R13-c) — vem em cinza com o motivo.
  // Realocado aqui (não para app-gavetas.js, onde nasceu na fatia original) para caber
  // no teto de 600L — o registro de fechamento ("agenda-overlay") continua em
  // app-gavetas.js, mesmo padrão de catalogo-overlay/app4-overlay. ──
  function seloFonteAgenda(estado) {
    if (estado === "viva") return "🟢";
    if (estado === "manual" || estado === "envelhecida") return "🟡";
    return "🔴";
  }

  // dia curto "qua 10/09" a partir de um ISO — mesma régua do motor (agenda-unificada.ts
  // rotuloDia), só que aqui o card precisa dele ANTES da hora na linha1.
  function rotuloDiaAgenda(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const semana = d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", weekday: "short" }).replace(".", "");
    const dm = d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit" });
    return `${semana} ${dm}`;
  }

  // estado da fonte em 3 palavras humanas (fatia 3 — as fontes reais de hoje são "Google
  // Calendar" e "Compromissos (WhatsApp/Sympla/sessão)"; o mesmo texto vale pra qualquer
  // fonte nova, inclusive a de e-mail que ainda não existe).
  function estadoAgendaHumano(estado) {
    if (estado === "viva") return "lendo sozinho agora";
    if (estado === "manual") return "só quando alguém lê";
    if (estado === "envelhecida") return "lido, mas desatualizado";
    if (estado === "ausente") return "nunca foi lido";
    return "não consegue ler";
  }

  // AGENDA-FONTE-ACIONAVEL-001 (corte Enio 09/09, print da gaveta Agenda: "deve ser possível
  // interagir com as fontes, ver detalhes, sincronizar ou enviar comandos para sincronizar
  // novamente"). A fonte dizia "lido, mas desatualizado — lido há mais de 24h" e não dava
  // nada para fazer: aviso sem ação transfere ao humano um trabalho que a máquina sabe fazer.
  // Agora ela abre (o que é · quem alimenta · de quanto em quanto tempo · quantos itens ·
  // quando foi lido) e traz o botão que roda o motor de verdade, com a falha inteira na tela.
  let capacidadesFonte = {};

  function tileFonteAgenda(f) {
    const selo = seloFonteAgenda(f.estado);
    const naoAtiva = f.estado !== "viva";
    const motivo = naoAtiva
      ? `<div class="ti-detalhe" style="color:var(--texto-fraco)">${escaparHtml(estadoAgendaHumano(f.estado))} — ${escaparHtml(humanizarMotivo(f.motivo, "agenda"))}</div>`
      : "";
    const cap = capacidadesFonte[f.id] || null;
    const detalhes = cap
      ? `<div class="ti-detalhe"><span style="color:var(--texto-fraco)">de onde vem:</span> ${escaparHtml(cap.alimentadaPor)}</div>
         <div class="ti-detalhe"><span style="color:var(--texto-fraco)">atualiza:</span> ${escaparHtml(cap.cadencia)}</div>`
      : `<div class="ti-detalhe" style="color:var(--texto-fraco)">⚪ esta fonte ainda não declarou de onde vem</div>`;
    const acao = !cap
      ? ""
      : cap.sincronizavel
        ? `<button type="button" class="btn-sync-fonte" data-fonte="${escaparHtml(f.id)}" style="margin-top:8px;padding:5px 12px;border-radius:8px;border:1px solid var(--borda,#2a3346);background:transparent;color:inherit;cursor:pointer">↻ sincronizar agora</button>`
        : `<div class="ti-detalhe" style="margin-top:6px;color:var(--texto-fraco)">não há o que sincronizar — ${escaparHtml(cap.porQueNao || "")}</div>`;
    return `
        <details class="tile-integracao ${naoAtiva ? "" : "ativa"}" data-fonte-id="${escaparHtml(f.id)}">
          <summary>
            <span class="ti-nome">${selo} ${escaparHtml(f.nome)} <span style="color:var(--texto-fraco)">(${f.n} item(ns))</span></span>
          </summary>
          ${motivo}
          ${detalhes}
          <div class="ti-hora" style="color:var(--texto-fraco);font-size:11.5px">lido: ${escaparHtml(horaOuNuncaLida(f.lidoEm))}</div>
          ${acao}
          <div class="sync-resultado ti-detalhe" data-fonte-res="${escaparHtml(f.id)}" hidden></div>
        </details>`;
  }

  async function sincronizarFonte(id, btn) {
    const caixa = document.querySelector(`[data-fonte-res="${id}"]`);
    const original = btn.textContent;
    btn.disabled = true;
    btn.textContent = "sincronizando…";
    if (caixa) { caixa.hidden = false; caixa.textContent = "⚪ rodando o motor desta fonte…"; }
    try {
      const r = await fetch("/api/agenda/sincronizar", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ fonte: id }),
      });
      const j = await r.json();
      if (caixa) {
        // a falha volta INTEIRA: frase + linha literal do motor + o que fazer (=R13).
        caixa.innerHTML = `${j.ok ? "🟢" : "🔴"} ${escaparHtml(j.resumo)}` +
          (j.detalhe ? `<br /><span style="color:var(--texto-fraco);font-family:monospace;font-size:11.5px">${escaparHtml(j.detalhe)}</span>` : "") +
          (j.oQueFazer ? `<br /><strong>o que fazer:</strong> ${escaparHtml(j.oQueFazer)}` : "");
      }
      if (j.ok) carregarAgenda();
    } catch (e) {
      if (caixa) caixa.textContent = `🔴 não consegui falar com o app: ${e}`;
    }
    btn.disabled = false;
    btn.textContent = original;
  }

  // PROVA-AGENDA-001 (corte Enio 09/09: "de onde veio a informação, deve ter a prova a um
  // clique"). O item mostrava só o id da fonte — "(compromissos)" — enquanto o registro já
  // guardava origem, quem o registrou e quando. A prova existia no dado e morria antes da
  // tela. Agora cada compromisso abre, em um clique, de onde a informação veio; e conflito
  // entre o dia da semana escrito e a data cai em 🔴, nomeando os dois lados sem decidir.
  function tileItemAgenda(i) {
    const badge = i.estado !== "confirmado" ? ` <span class="chip">${escaparHtml(i.estado)}</span>` : "";
    const conflito = i.conflitoDiaSemana
      ? `<div class="ti-detalhe" style="color:var(--vermelho,#f66)">🔴 ${escaparHtml(i.conflitoDiaSemana)}</div>`
      : "";
    const linhas = [
      ["veio de", i.origem],
      ["fonte", i.fonte],
      ["registrado em", i.registradoEm ? horaLocal(i.registradoEm) : "⚪ a fonte não disse"],
      ["cai em", i.diaSemana || "⚪"],
      ["estado", i.estado],
    ]
      .map(([r, v]) => `<div class="ti-detalhe"><span style="color:var(--texto-fraco)">${r}:</span> ${escaparHtml(String(v ?? "⚪"))}</div>`)
      .join("");
    // AGENDA-FUTURO-QUE-AVISA-001 (10/09): "acesso direto ao Claude" — botão delegado em
    // app-agenda.js (carregado por ÚLTIMO), nunca aqui: este arquivo só desenha o data-*.
    const mandar = `<button type="button" class="ag-mandar" data-ag-titulo="${escaparHtml(i.titulo)}" data-ag-quando="${escaparHtml(rotuloDiaAgenda(i.inicio) + " " + i.hora)}" data-ag-local="${escaparHtml(i.local || "")}">→ mandar ao Claude</button>`;
    return `<details class="ti-detalhe">
        <summary>${escaparHtml(i.hora)} — ${escaparHtml(i.titulo)}${badge}${i.local ? " · " + escaparHtml(i.local) : ""} <span style="color:var(--texto-fraco)">(de onde veio)</span></summary>
        ${conflito}${linhas}${mandar}
      </details>`;
  }

  function resumoLinha2Agenda(fontes) {
    return fontes
      .map((f) => `${seloFonteAgenda(f.estado)} ${f.nome}${f.estado !== "viva" ? " " + f.estado : ""}`)
      .join(" · ");
  }

  function renderAgenda(a) {
    const meta = document.getElementById("agenda-meta");
    if (meta) meta.textContent = `${a.total} item(ns) — janela de ${a.janelaDias} dias — medido em ${horaLocal(a.geradoEm)}`;
    const fontesGrid = document.getElementById("agenda-fontes-grid");
    if (fontesGrid) fontesGrid.innerHTML = a.fontes.map(tileFonteAgenda).join("");
    const contFontes = document.getElementById("cont-agenda-fontes");
    if (contFontes) contFontes.textContent = String(a.fontes.length);
    const diasDiv = document.getElementById("agenda-dias");
    if (diasDiv) {
      diasDiv.innerHTML = a.dias.length
        ? a.dias
            .map((dia, idx) => grupoDobravel(`bloco-agenda-dia-${dia.data}`, dia.rotulo, dia.itens, tileItemAgenda, idx === 0, "sem itens"))
            .join("")
        : `<div class="ti-detalhe">⚪ nenhum item na janela — nenhuma fonte tem compromisso futuro</div>`;
    }
    const proximoTexto = a.proximo
      ? `${rotuloDiaAgenda(a.proximo.inicio)} ${a.proximo.hora} · ${a.proximo.titulo}`.trim().slice(0, 90)
      : "⚪ nenhum compromisso à frente";
    preencherModulo("agenda", String(a.total), escaparHtml(proximoTexto), resumoLinha2Agenda(a.fontes), a.fontes.every((f) => f.estado === "viva") ? "verde" : "amarelo");
  }

  async function carregarAgenda() {
    try {
      // capacidades primeiro: sem elas o tile não sabe se pode oferecer o botão, e um botão
      // que aparece antes de saber se funciona é exatamente o que não pode acontecer.
      if (!Object.keys(capacidadesFonte).length) {
        try {
          const rc = await fetch("/api/agenda/fontes");
          const jc = await rc.json();
          if (jc && jc.capacidades) capacidadesFonte = jc.capacidades;
        } catch (e) { /* fonte sem capacidade declarada cai no ⚪ do tile, dito na tela */ }
      }
      const r = await fetch("/agenda");
      const j = await r.json();
      renderAgenda(j);
    } catch (e) {
      const meta = document.getElementById("agenda-meta");
      if (meta) meta.textContent = `🔴 falha ao carregar agenda: ${e}`;
    }
  }

  // delegação: o grid é reescrito a cada carga, então o ouvinte mora no container.
  (function ligarSyncFonte() {
    const grid = document.getElementById("agenda-fontes-grid");
    if (!grid) return;
    grid.addEventListener("click", (e) => {
      const btn = e.target.closest && e.target.closest(".btn-sync-fonte");
      if (!btn) return;
      e.preventDefault();
      sincronizarFonte(btn.dataset.fonte, btn);
    });
  })();

  window.__ABRIDORES["agenda-overlay"] = carregarAgenda;

  function abrirAgenda() {
    abrirGaveta("agenda-overlay");
  }

  document.getElementById("btn-agenda").addEventListener("click", abrirAgenda);
  document.getElementById("agenda-fechar").addEventListener("click", () => fecharGaveta("agenda-overlay"));
  carregarAgenda();
  setInterval(carregarAgenda, 300000);

  // ── GLOSSÁRIO "O QUE É ISSO?" (FATIA 3, VOCABULARIO-LEIGO-001, corte Enio 05/09):
  // lista window.VOCAB.termo (humano · gloss) com busca — botão na gaveta EGOS App
  // (#btn-glossario, orquestra-viva.html) e atalho no ⌘K. Overlay próprio
  // (glossario-overlay); fecha pelo mesmo gaveta-manager das outras (registro em
  // app-gavetas.js/GAVETAS — arquivo vizinho, carrega antes, mesmo script concatenado).
  function tileGlossario(chave, v) {
    return `<div class="ti-detalhe glossario-item" data-termo="${escaparHtml(chave)}"><b>${escaparHtml(v.humano)}</b> — ${escaparHtml(v.gloss)}</div>`;
  }

  function renderGlossario(filtro) {
    const lista = document.getElementById("glossario-lista");
    if (!lista) return;
    const termo = (window.VOCAB && window.VOCAB.termo) || {};
    const q = (filtro || "").trim().toLowerCase();
    const pares = Object.entries(termo).filter(
      ([chave, v]) => !q || chave.toLowerCase().includes(q) || (v.humano || "").toLowerCase().includes(q) || (v.gloss || "").toLowerCase().includes(q)
    );
    const cont = document.getElementById("glossario-contagem");
    if (cont) cont.textContent = `${pares.length} de ${Object.keys(termo).length} termo(s)`;
    lista.innerHTML = pares.length
      ? pares.map(([chave, v]) => tileGlossario(chave, v)).join("")
      : `<div class="ti-detalhe">⚪ nenhum termo bate com "${escaparHtml(filtro)}"</div>`;
  }

  function abrirGlossario() {
    abrirGaveta("glossario-overlay");
    const campo = document.getElementById("glossario-busca");
    if (campo) campo.value = "";
    renderGlossario("");
  }

  document.getElementById("btn-glossario").addEventListener("click", abrirGlossario);
  document.getElementById("glossario-fechar").addEventListener("click", () => fecharGaveta("glossario-overlay"));
  document.getElementById("glossario-busca").addEventListener("input", (e) => renderGlossario(e.target.value));

  // atalho no ⌘K: o handler de Enter do app-nucleo.js (carrega 1º) sempre abre o
  // catálogo — este listener corre DEPOIS (app-catalogo.js é o último bloco) e, só nas
  // palavras-gatilho do glossário, abre a gaveta certa por cima; o gaveta-manager fecha
  // a do catálogo sozinho (mesma porta única de todas as outras).
  (function () {
    const busca = document.getElementById("busca-cmdk");
    if (!busca) return;
    const GATILHOS = ["?", "glossario", "glossário", "o que é isso", "o que é isso?", "termos"];
    busca.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      if (!GATILHOS.includes(busca.value.trim().toLowerCase())) return;
      abrirGlossario();
      busca.value = "";
      busca.blur();
    });
  })();

