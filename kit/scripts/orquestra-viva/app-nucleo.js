/* SIMPLICITY_OVERRIDE: extraido de app.js (1436L) na refatoracao organica de 04/09, passo 2/3 (divisao por dominio) — codigo MOVIDO, nao escrito. Dominio: estado/poll/dock/modulos-da-home/tooltip-3-camadas/busca-cmdk + CONVERSA (contador do modulo + gaveta completa, realocada aqui — nao para app-gavetas.js — porque e a feature mais acoplada ao dock/home das 6 originalmente listadas, e mante-la em app-gavetas.js estourava o teto de 600L). Servido concatenado com app-gavetas.js + app-catalogo.js, NESTA ORDEM, por /app.js (scripts/orquestra-viva.ts). O conteudo e preservado: o delta em relacao ao app.js anterior e a feature entregue no mesmo commit (filtro por dominio), SEM golden de byte-identidade — a garantia e a suite verde (corrigido 05/09: dizia 'byte-identica'). */
/* SIMPLICITY_OVERRIDE: extraido de scripts/orquestra-viva.html (2473L) na refatoracao organica de 04/09 — codigo MOVIDO, nao escrito; o proximo passo divide por dominio (gavetas / modulos+tooltip / catalogo). Goldens 81/81 fazem grep por blocos contiguos, por isso a divisao e um passo proprio. */
  // ── CAMADA 2 + 3 (APP-3-CAMADAS-ICONE-HOVER-CLIQUE-001, corte Enio 03/09) ──────────
  // Tooltip próprio (não title=, que não existe em toque) para TODO elemento clicável
  // da tela inicial: 7 botões da dock + até 10 módulos + atalhos do perfil.
  // Mouse/teclado: hover/foco mostra, sair/blur esconde, Esc fecha.
  // Toque: 1º toque mostra a camada 2 e NÃO navega; 2º toque (mesmo alvo) navega —
  // detectado via pointerType, nunca por heurística de tempo (evita corrida/instabilidade).
  // PEDIDO-AGENTE-NOMEADO-001 (PCA-55, 05/09): .papel-card[data-agente] entra nas 3 camadas —
  // mesmo hover/foco/toque dos módulos, tooltip lê estado/pid/hora via data-tt-* (ver
  // renderPapeis em app-gavetas.js). Elemento nasce depois (poll de /time), mas o seletor
  // é avaliado a cada evento — closest() casa com o que existir no DOM naquele instante.
  // MODOS-TELA-25-50-100-001 (05/09): pílulas de modo + botão do editor + card "+N"
  // entram nas 3 camadas — mesmo hover/foco/toque dos demais (#mod-mais nasce depois,
  // em app-layout.js, mas o seletor é avaliado a cada evento, então casa igual).
  // TOOLTIP-VERSAO-CAMADA2-001 (08/09 manhã): #versao entrou na seleção — era o único botão
  // do #header ainda no balão nativo do browser (largo, sem borda, sem hierarquia — defeito
  // visto no print do Enio).
  // TOOLTIP-CABECALHO-CAMADA2-001 (08/09 tarde): fecha o resto do cabeçalho + as gavetas —
  // #btn-conexoes, #btn-mcp, #cadencia-estado, #btn-copiar-reuniao, #btn-baixar-reuniao,
  // #btn-baixar-seguro, #btn-integracoes-atualizar, #catalogo-categoria, #conversa-sessao.
  // Zero elemento de orquestra-viva.html no balão nativo do browser a partir daqui
  // (invariante provado por golden — ver g89/g90 em orquestra-viva.test.2.sh).
  // RV-7-RESPOSTA-CLICAVEL-E-LEIGA-001 (08/09): ".leigo-linha abbr[data-tt-titulo]" entra
  // — termo do VOCAB dentro da manchete leiga (traduzirParaLeigo) ganha o mesmo tooltip
  // dos demais (data-tt-titulo, nunca title=); coletarDadosTt já lê esse atributo em
  // primeiro lugar (linha 44), nenhuma mudança no motor do tooltip, só o seletor cresce.
  // LEIGOS-TOOLTIP-CONEXOES-CONTADORES-001 (08/09): ".conexao-tec[data-tt-titulo]" (dado
  // técnico cru das conexões, ver app-conexoes.js) e "#contadores abbr[data-tt-titulo]"
  // ("de plantão"/"desligado(s)", ver atualizarModuloTime abaixo) entram nas 3 camadas —
  // mesmo motor, seletor cresce, nada no motor do tooltip muda.
  const SELETOR_3CAMADAS = ".modulo-card[data-abre], #dock-acoes .btn-header, [data-atalho-idx], .papel-card[data-agente], #modo-tela-wrap .btn-header, #btn-editor-layout, #mod-mais, #versao, #btn-conexoes, #btn-mcp, #cadencia-estado, #btn-copiar-reuniao, #btn-baixar-reuniao, #btn-baixar-seguro, #btn-integracoes-atualizar, #catalogo-categoria, #conversa-sessao, .leigo-linha abbr[data-tt-titulo], .conexao-tec[data-tt-titulo], #contadores abbr[data-tt-titulo]";
  const ttFlutuante = document.getElementById("tt-flutuante");
  let ttAlvoAtual = null;

  function textoMedicaoTt(numero, medidoEmIso) {
    const n = (numero === undefined || numero === null || numero === "" || numero === "⚪")
      ? "⚪ não medido" : numero;
    if (!medidoEmIso) return `${n} · ⚪ hora não medida`;
    const d = new Date(medidoEmIso);
    if (isNaN(d.getTime())) return `${n} · ⚪ hora inválida`;
    return `${n} · medido às ${d.toLocaleTimeString("pt-BR", { hour12: false })}`;
  }

  // lê o dado já visível no DOM (nunca inventa) — módulo: número+medidoEm vêm de
  // preencherModulo(); dock/atalho: vêm de data-tt-* escritos estaticamente no HTML.
  function coletarDadosTt(el) {
    const numeroEl = el.querySelector && el.querySelector(".mod-numero");
    const numero = numeroEl ? numeroEl.textContent.trim() : el.dataset.ttNumero;
    const medidoEm = el.dataset.medidoEm || el.dataset.ttMedido || "";
    const tituloEl = el.querySelector && el.querySelector(".mod-titulo");
    const titulo = el.dataset.ttTitulo || (tituloEl ? tituloEl.textContent.trim() : "") || el.getAttribute("aria-label") || "";
    const abre = el.dataset.ttAbre || "";
    // HOVER-VIDRO-001 (corte Enio 06/09): a cor do número no tooltip é a MESMA do semáforo
    // já pintado na bolinha do card (.mod-bolinha.b-verde/b-vermelho/b-amarelo) — nunca
    // inventa cor nova, só ecoa a que preencherModulo() já decidiu. Dock/atalho não têm
    // bolinha (não medem nada) → sem classe de cor.
    const bolinha = el.querySelector && el.querySelector(".mod-bolinha");
    let cor = "";
    if (bolinha) {
      if (bolinha.classList.contains("b-verde")) cor = "verde";
      else if (bolinha.classList.contains("b-vermelho")) cor = "vermelho";
      else if (bolinha.classList.contains("b-amarelo")) cor = "amarelo";
    }
    return { titulo, numero, medidoEm, abre, cor };
  }

  function posicionarTt(el) {
    const r = el.getBoundingClientRect();
    ttFlutuante.style.left = "-9999px";
    ttFlutuante.style.top = "-9999px";
    const tw = ttFlutuante.offsetWidth, th = ttFlutuante.offsetHeight;
    let left = r.left + r.width / 2 - tw / 2;
    let top = r.top - th - 8;
    let abaixo = false;
    if (top < 4) { top = r.bottom + 8; abaixo = true; } // sem espaço acima: abre abaixo
    left = Math.max(4, Math.min(left, window.innerWidth - tw - 4));
    top = Math.min(top, window.innerHeight - th - 4);
    ttFlutuante.style.left = `${left}px`;
    ttFlutuante.style.top = `${top}px`;
    // setinha (camada visual, HOVER-VIDRO-001): aponta para o alvo, então inverte quando
    // o tooltip abre abaixo em vez de acima.
    ttFlutuante.classList.toggle("tt-seta-baixo", abaixo);
  }

  function mostrarTt(el) {
    if (!el) return;
    const { titulo, numero, medidoEm, abre, cor } = coletarDadosTt(el);
    document.getElementById("tt-titulo").textContent = titulo || "⚪";
    const medicaoEl = document.getElementById("tt-medicao");
    medicaoEl.textContent = textoMedicaoTt(numero, medidoEm);
    medicaoEl.classList.remove("cor-verde", "cor-vermelho", "cor-amarelo");
    if (cor) medicaoEl.classList.add("cor-" + cor);
    // 4ª linha (VOCABULARIO-LEIGO-001): gloss curto do glossário, lido de VOCAB.termo via
    // data-vocab — nunca repete a camada 1 (o tt-abre já cobre "o que o clique abre").
    const glossEl = document.getElementById("tt-gloss");
    const chave = el.dataset.vocab || "";
    const v = (typeof VOCAB !== "undefined" && chave) ? VOCAB.termo[chave] : null;
    glossEl.textContent = v ? v.gloss : "";
    glossEl.hidden = !v;   // sem verbete: some o bloco, nunca imprime "undefined"
    document.getElementById("tt-abre").textContent = abre || "";
    ttFlutuante.hidden = false;
    ttAlvoAtual = el;
    el.setAttribute("aria-describedby", "tt-flutuante");
    posicionarTt(el);
    // entrada com fade+translateY (HOVER-VIDRO-001) — classe aplicada DEPOIS do reflow
    // (offsetWidth força o navegador a computar o estado "hidden=false" antes de animar,
    // senão o transition dispara do mesmo frame e não se vê).
    ttFlutuante.classList.remove("tt-mostrar");
    void ttFlutuante.offsetWidth;
    ttFlutuante.classList.add("tt-mostrar");
  }

  function esconderTt() {
    ttFlutuante.hidden = true;
    ttFlutuante.classList.remove("tt-mostrar", "tt-seta-baixo");
    if (ttAlvoAtual) ttAlvoAtual.removeAttribute("aria-describedby");
    ttAlvoAtual = null;
  }

  // preencherModulo() chama isto quando o poll re-mede um módulo cujo tooltip
  // já está aberto — o número/hora exibidos não podem ficar velhos enquanto abertos.
  function atualizarTooltipSeAberto(el) {
    if (ttAlvoAtual === el) mostrarTt(el);
  }

  document.addEventListener("pointerover", (e) => {
    if (e.pointerType === "touch") return;
    const el = e.target.closest(SELETOR_3CAMADAS);
    if (el) mostrarTt(el);
  });
  document.addEventListener("pointerout", (e) => {
    if (e.pointerType === "touch") return;
    const el = e.target.closest(SELETOR_3CAMADAS);
    if (el && el === ttAlvoAtual) esconderTt();
  });
  document.addEventListener("focusin", (e) => {
    const el = e.target.closest(SELETOR_3CAMADAS);
    if (el) mostrarTt(el);
  });
  document.addEventListener("focusout", (e) => {
    const el = e.target.closest(SELETOR_3CAMADAS);
    if (el && el === ttAlvoAtual) esconderTt();
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") esconderTt(); });

  // marca o tipo de ponteiro no pointerdown (capture, roda antes de qualquer outro
  // listener) — é o único jeito confiável de saber, no click seguinte, se veio de toque.
  document.addEventListener("pointerdown", (e) => {
    const el = e.target.closest(SELETOR_3CAMADAS);
    if (el) el.dataset.pointerTipoAtual = e.pointerType;
    else {
      // toque fora de qualquer elemento das 3 camadas: fecha e reseta o "1º toque"
      document.querySelectorAll("[data-tt-tocado]").forEach((n) => delete n.dataset.ttTocado);
      esconderTt();
    }
  }, true);

  // capture no document: roda ANTES do listener de navegação (que está no próprio
  // elemento, fase bubble) — stopImmediatePropagation() no 1º toque impede a navegação
  // de disparar; no 2º toque deixa passar.
  document.addEventListener("click", (e) => {
    const el = e.target.closest(SELETOR_3CAMADAS);
    if (!el || el.dataset.pointerTipoAtual !== "touch") return;
    if (el.dataset.ttTocado !== "1") {
      e.preventDefault();
      e.stopImmediatePropagation();
      mostrarTt(el);
      el.dataset.ttTocado = "1";
      return;
    }
    delete el.dataset.ttTocado;
    esconderTt();
  }, true);

  // ── MÓDULOS DA TELA INICIAL (REDESIGN-DO-ENIO-001, PCA-54:a 04/09) — substitui a órbita 3D
  // e o painel lateral de agente. A grade CSS (.grade-modulos) acompanha o resize sozinha
  // (grid nativo), sem raio/ângulo calculado — o que a órbita fazia em JS a grade faz em CSS.
  let estadoAtual = null;

  function escaparHtml(s) {
    const d = document.createElement("div");
    d.textContent = String(s ?? "⚪");
    return d.innerHTML;
  }

  // corte Enio 2026-08-30: relógio de parede + origem em toda linha — ISO no disco, local na tela
  function horaLocal(iso) {
    const d = new Date(iso);
    return isNaN(d.getTime()) ? (iso || "⚪") : d.toLocaleTimeString("pt-BR", { hour12: false });
  }
  function formatarIdade(pegoEm) {
    if (!pegoEm) return "⚪ idade desconhecida (sem pegoEm)";
    const inicio = Date.parse(pegoEm);
    if (Number.isNaN(inicio)) return "⚪ idade desconhecida";
    const min = Math.floor((Date.now() - inicio) / 60000);
    if (min < 1) return "há <1min";
    if (min < 60) return `há ${min}min`;
    return `há ${Math.floor(min / 60)}h${min % 60}min`;
  }

  // preenche 1 módulo (número + 2 linhas + title com a hora da medição). Número que o app
  // não mede fica ⚪ (=R13-c) — nunca 0 fingido.
  function preencherModulo(prefixo, numero, linha1Html, linha2Texto, corBolinha) {
    const nEl = document.getElementById(`mod-${prefixo}-numero`);
    if (nEl) nEl.textContent = numero;
    const l1 = document.getElementById(`mod-${prefixo}-linha1`);
    if (l1) l1.innerHTML = `<span class="mod-bolinha${corBolinha ? " b-" + corBolinha : ""}"></span><span>${linha1Html}</span>`;
    const l2 = document.getElementById(`mod-${prefixo}-linha2`);
    if (l2) l2.textContent = linha2Texto || "";
    const card = document.getElementById(`mod-${prefixo}`);
    // APP-3-CAMADAS-ICONE-HOVER-CLIQUE-001: a hora da medição vive em dataset (ISO,
    // legível por máquina) — a camada 2 (tooltip próprio) lê daqui, não de title=""
    // (title não existe em toque, e o app não pode depender só dele). Se o tooltip
    // desta card estiver aberto agora, reposiciona/atualiza o texto na hora.
    if (card) {
      card.dataset.medidoEm = new Date().toISOString();
      if (typeof atualizarTooltipSeAberto === "function") atualizarTooltipSeAberto(card);
    }
  }

  // clique no módulo = clique no botão que já abre a gaveta certa (reuse, não duplica lógica).
  // data-foco (fatia 2, 04/09): quando o botão alvo é #btn-integracoes, mais de 1 módulo
  // aponta pra lá (Motores, Serviços, Porta do cinco, Sentinela VPS) — data-foco diz qual
  // das 2 seções ANCORADAS dentro da gaveta abre já expandida/rolada.
  document.querySelectorAll(".modulo-card[data-abre]").forEach((card) => {
    card.addEventListener("click", () => {
      const alvo = document.getElementById(card.dataset.abre);
      if (alvo) alvo.click();
      if (card.dataset.foco) focarSecaoIntegracoes(card.dataset.foco);
    });
  });

  // a seção só tem conteúdo depois que /agentes (motores) e /integracoes (serviços)
  // responderem — tenta por até ~1.2s (o poll de /agentes já roda desde o load, então na
  // prática o 1º tiro quase sempre acerta) antes de desistir silenciosamente.
  function focarSecaoIntegracoes(secao, tentativas) {
    const restantes = tentativas === undefined ? 10 : tentativas;
    const el = document.getElementById(`secao-${secao}`);
    if (!el) return;
    const temConteudo = el.querySelector(".tile-integracao, .ti-detalhe");
    if (temConteudo) {
      el.querySelectorAll("details.bloco-dobravel").forEach((d) => { d.open = true; });
      el.scrollIntoView({ block: "start" });
      return;
    }
    if (restantes > 0) setTimeout(() => focarSecaoIntegracoes(secao, restantes - 1), 120);
  }

  function atualizarModuloTime(estado) {
    const nomes = Object.keys(estado.agentes || {});
    const total = nomes.length;
    if (!total) { preencherModulo("time", "⚪", "⚪ fila ainda não existe", ""); return; }
    const vivos = nomes.filter((n) => estado.agentes[n].escuta.status === "viva");
    const pendentesTotal = nomes.reduce((s, n) => s + estado.agentes[n].pendentes.length, 0);
    // PCA-55 (05/09): linha2 nomeia quem tem MAIS pendentes ("forja · 3 esperando") — a soma
    // sozinha não diz quem precisa de atenção; sem ninguém pendente, mantém a soma (0).
    const topo = nomes
      .map((n) => ({ nome: n, pend: estado.agentes[n].pendentes.length }))
      .filter((x) => x.pend > 0)
      .sort((a, b) => b.pend - a.pend)[0];
    const linha2 = topo ? `${topo.nome} · ${topo.pend} esperando` : `${pendentesTotal} pendente(s)`;
    preencherModulo(
      "time",
      `${vivos.length}/${total}`,
      vivos.length ? `🟢 ${vivos.map(escaparHtml).join(", ")}` : "🔴 nenhum agente vivo agora",
      linha2,
      vivos.length ? "verde" : "vermelho"
    );
  }

  // módulo "Fila" (2ª fileira, ≥1600px) — mesmo /estado, mesma soma que "Time em campo"
  // já detalha por agente; #mod-fila só existe no DOM em telas largas, então o guard de
  // preencherModulo (getElementById pode voltar null) já cobre telas menores sem erro.
  function atualizarModuloFila(estado) {
    if (!document.getElementById("mod-fila")) return;
    const agentes = Object.values(estado.agentes || {});
    if (!agentes.length) { preencherModulo("fila", "⚪", "⚪ fila ainda não existe", ""); return; }
    let pendentes = 0, emAndamento = 0, agentesComFila = 0;
    for (const a of agentes) {
      if (a.pendentes.length || a.emAndamento.length) agentesComFila++;
      pendentes += a.pendentes.length;
      emAndamento += a.emAndamento.length;
    }
    preencherModulo(
      "fila",
      String(pendentes),
      emAndamento ? `🟡 ${emAndamento} em andamento` : "🟢 nada em andamento",
      `${agentesComFila} agente(s) com fila`,
      emAndamento ? "amarelo" : (pendentes ? undefined : "verde")
    );
  }

  // ── PERFIL = FORK (EGOS-APP-TEMPLATES-5-001, corte Enio 04/09) — a home lê o perfil ativo
  // (perfilAtivo, vindo de /estado, que por sua vez lê scripts/lib/perfil.ts) e decide: nome
  // no título, quais dos 6 módulos aparecem e em que ordem, e o módulo novo "⭐ o que eu mais
  // faço". Aplica UMA vez (a lista de módulos não muda a cada poll de 2s) — flag em
  // window para o golden poder resetar entre cenários sem recarregar a página.
  const MODULOS_CONHECIDOS = ["agenda", "time", "sessoes", "motores", "servicos", "catalogo", "documentos", "conversa"];

  function aplicarPerfilNaHome(perfilAtivo) {
    if (!perfilAtivo || window.__perfilAplicado) return;
    window.__perfilAplicado = true;
    // MODOS-TELA-25-50-100-001 (05/09): cacheia o perfil pra app-layout.js poder
    // reaplicar o layout a cada troca de modo sem precisar re-buscar /estado.
    window.__perfilAtivo = perfilAtivo;
    if (perfilAtivo.nome) document.title = `EGOS — ${perfilAtivo.nome}`;
    // MARCA-POR-PERFIL (30/09; nasceu no corte Enio 18/09, marca local de um perfil de cliente):
    // o mesmo EGOS APP serve outro domínio sem apagar a origem. A marca vem do PERFIL
    // (texto + glifo SVG local), nunca de nome escrito aqui — o app viaja no kit público.
    if (perfilAtivo.marca && perfilAtivo.marca.texto) {
      var marcaTexto = document.getElementById("marca-texto");
      var marcaGlifo = document.getElementById("marca-glifo");
      if (marcaTexto) marcaTexto.textContent = perfilAtivo.marca.texto;
      if (marcaGlifo && perfilAtivo.marca.glifo) {
        marcaGlifo.src = perfilAtivo.marca.glifo;
        marcaGlifo.alt = perfilAtivo.marca.texto;
        marcaGlifo.width = 26;
        marcaGlifo.height = 26;
      }
    }
    if (typeof aplicarLayoutModo === "function") {
      aplicarLayoutModo(window.__modoAtual || "100");
    } else {
      // fallback defensivo — nunca deveria disparar (app-layout.js sempre concatenado
      // em /app.js), preserva o comportamento pré-layouts se algum dia não estiver.
      const modulos = Array.isArray(perfilAtivo.modulos) ? perfilAtivo.modulos : [];
      if (modulos.length) {
        const grade = document.getElementById("grade-modulos");
        MODULOS_CONHECIDOS.forEach((id) => {
          const el = document.getElementById(`mod-${id}`);
          if (el) el.hidden = !modulos.includes(id);
        });
        modulos.forEach((id) => {
          const el = document.getElementById(`mod-${id}`);
          if (el && grade) grade.appendChild(el);
        });
      }
    }
    renderModuloAtalhos(perfilAtivo);
    // FILTRO-DOMINIO-PERFIL (fatia 3, 04/09): definida em app-catalogo.js, chamada daqui
    // (mesmo padrão cross-arquivo de renderModuloAtalhos acima) para ligar/desligar o chip
    // "meus domínios" do catálogo conforme perfil.dominios.
    aplicarPerfilNoCatalogo(perfilAtivo);
  }

  async function poll() {
    try {
      const r = await fetch("/estado");
      const estado = await r.json();
      estadoAtual = estado;
      povoarDestinos(estado); // DESTINO-ESCOLHIVEL-001: select de destino segue o disco a cada poll
      aplicarPerfilNaHome(estado.perfilAtivo);
      atualizarModuloTime(estado);
      atualizarModuloFila(estado);

      // resumo do commit: até o primeiro " — " (padrão das mensagens da casa) ou 72 chars; integral no hover
      const msgInteira = String(estado.git.msg || "");
      const corte = msgInteira.indexOf(" — ");
      let msgCurta = corte > 8 ? msgInteira.slice(0, corte) : msgInteira;
      if (msgCurta.length > 72) msgCurta = msgCurta.slice(0, 71) + "…";
      const gitEl = document.getElementById("git-info");
      gitEl.textContent = `atualizado ${msgCurta.replace(/^\w+\([^)]*\):\s*/, "")}`;
      gitEl.title = `${estado.git.head} — ${msgInteira}`;
      // versão medida (EGOS-APP-CONTA-E-VERSAO-001 f1): v<data>.<nº commits>; ⚪ se o git não respondeu
      // AUTO-RECARGA (corte Enio 05/09 "o EGOS APP se atualiza sozinho"): versão do servidor mudou →
      // a casca recarrega sozinha, mas só com nenhuma gaveta aberta (não derruba o que a pessoa lê/digita)
      if (estado.git.head && estado.git.head !== "⚪") {
        if (!window.__headInicial) window.__headInicial = estado.git.head;
        else if (estado.git.head !== window.__headInicial && !document.querySelector(".gaveta-overlay.aberto")) { location.reload(); return; }
      }
      const vEl = document.getElementById("versao");
      if (vEl) {
        const versaoTxt = estado.git.versao && estado.git.versao !== "⚪" ? estado.git.versao : "⚪ versão";
        vEl.textContent = versaoTxt;
        // TOOLTIP-VERSAO-CAMADA2-001 (08/09): coletarDadosTt() lê data-tt-numero quando não
        // há .mod-numero filho (é o caso dos botões do dock) — atualiza o tooltip se aberto.
        vEl.dataset.ttNumero = versaoTxt;
        atualizarTooltipSeAberto(vEl);
      }
      document.getElementById("pulse-info").textContent = estado.pulse.ultimaMedicao
        ? `checagem ${new Date(estado.pulse.ultimaMedicao).toLocaleTimeString("pt-BR")}`
        : "checagem ⚪ não medida";

      let vivas = 0, surdas = 0, orfas = 0, total = 0;
      for (const d of Object.values(estado.agentes)) {
        total++;
        if (d.escuta.status === "viva") vivas++;
        else if (d.escuta.status === "surda") surdas++;
        else if (d.escuta.status === "orfa") orfas++;
      }
      // denominador SEMPRE (R-UNIVERSO-DECLARADO-001): antes o 3º estado ("orfa") sumia —
      // o topo dizia "0 🟢 · 3 🔴" (soma 3) e o quadro Time dizia "0/4". 1 assistente evaporava.
      document.getElementById("contadores").innerHTML =
        `<span class="contador-viva">${vivas} de ${total} <abbr data-tt-titulo="assistentes" data-tt-abre="Processos automáticos desta máquina trabalhando agora — não são pessoas (antes: 'de plantão').">ativos</abbr></span>` +
        ` · <span class="contador-surda">${surdas} <abbr data-tt-titulo="sem resposta" data-tt-abre="Esperando alguém ligar; o pedido fica guardado até lá (antes: 'desligado(s)').">sem resposta</abbr></span>` +
        (orfas ? ` · <span class="contador-orfa">${orfas} travado(s)</span>` : "");
    } catch (e) {
      // TODO indicador do cabeçalho vira ⚪ — antes só o git virava, e #contadores/#pulse-info
      // ficavam CONGELADOS com o último valor bem-sucedido: a tela seguia exibindo 🟢/🔴 como se
      // tivesse medido agora. Cor sem medição (R-SEMAFORO-QUATRO-001), no código de hoje.
      document.getElementById("git-info").textContent = "⚪ não consegui medir agora";
      document.getElementById("pulse-info").textContent = "checagem ⚪ não medida";
      document.getElementById("contadores").innerHTML =
        '<span class="contador-orfa">⚪ assistentes não medidos</span>';
    }
  }

  function relogio() {
    document.getElementById("relogio").textContent = new Date().toLocaleTimeString("pt-BR");
  }

  // ── módulo Serviços — reusa /integracoes (mesmo dado da gaveta 🔌 integrações) ──
  // linha3 + #integracoes-vps recebem o texto de j.vps vindo de /agentes (renderAgentes),
  // não daqui — /integracoes não tem esse campo (é censo estático, não sonda). Ver R-IDENTIFICADOR-OPACO-001:
  // os 7 "serviços ao vivo" e os "20 serviços" do censo são domínios diferentes, nunca somados.
  async function atualizarModuloServicos() {
    try {
      const r = await fetch("/integracoes");
      const j = await r.json();
      const total = (j.integracoes || []).length;
      if (!total) { preencherModulo("servicos", "⚪", "⚪ não medido", ""); return; }
      const foraDoAr = j.integracoes.filter((i) => i.estado === "nao-configurada");
      preencherModulo(
        "servicos",
        String(total),
        foraDoAr.length ? `🔴 ${escaparHtml(foraDoAr[0].nome)} fora do ar` : "🟢 todos respondem",
        foraDoAr.length > 1 ? `+${foraDoAr.length - 1} outro(s) sem configurar` : "",
        foraDoAr.length ? "vermelho" : "verde"
      );
      atualizarModuloIntegracaoUnica("cinco", "cinco-entradas", j);
      atualizarModuloIntegracaoUnica("sentinela-vps", "vps-sentinela", j);
    } catch (e) {
      preencherModulo("servicos", "⚪", "🔴 falha ao medir integrações", "");
    }
  }

  // 2ª fileira (≥1600px, fatia 2, 04/09): "Porta do cinco" e "Sentinela VPS" são 2 dos 7
  // itens que /integracoes já sonda — não é fonte nova, é o mesmo dado exposto 2× (módulo
  // dedicado + a linha correspondente dentro de "Serviços"). #mod-cinco/#mod-sentinela-vps
  // só existem no DOM em telas largas — mesmo guard de atualizarModuloFila.
  function atualizarModuloIntegracaoUnica(prefixo, nomeIntegracao, j) {
    if (!document.getElementById(`mod-${prefixo}`)) return;
    const item = (j.integracoes || []).find((i) => i.nome === nomeIntegracao);
    if (!item) { preencherModulo(prefixo, "⚪", "⚪ não medido", ""); return; }
    const emoji = item.estado === "ativa" ? "🟢" : item.estado === "configuravel" ? "🟡" : "⚪";
    const cor = item.estado === "ativa" ? "verde" : item.estado === "configuravel" ? "amarelo" : undefined;
    preencherModulo(prefixo, emoji, escaparHtml(item.detalhe || "⚪ sem detalhe").slice(0, 90), "", cor);
  }

  // ── módulo Catálogo — reusa /api/catalogo (mesmo dado da gaveta 📚 catálogo) ──
  async function atualizarModuloCatalogo() {
    try {
      const r = await fetch("/api/catalogo?busca=&tipo=todos&categoria=todas");
      const j = await r.json();
      if (j.erro) { preencherModulo("catalogo", "⚪", j.erro, ""); return; }
      preencherModulo(
        "catalogo",
        String(j.total),
        `🟢 ${j.medidos} pronto(s)`,
        `⚪ ${j.declarados} em desenvolvimento`,
        "verde"
      );
    } catch (e) {
      preencherModulo("catalogo", "⚪", "🔴 falha ao medir catálogo", "");
    }
  }

  // ── módulo Conversa — reusa /api/sessao (mesmo dado da gaveta 💬 conversa) ──
  async function atualizarModuloConversa() {
    try {
      const r = await fetch("/api/sessao?n=5");
      const j = await r.json();
      if (!j.ok || !j.turnos || !j.turnos.length) { preencherModulo("conversa", "⚪", j.erro || "⚪ sem transcript ainda", ""); return; }
      const ultimo = j.turnos[j.turnos.length - 1];
      const pendentesTotal = estadoAtual ? Object.values(estadoAtual.agentes || {}).reduce((s, d) => s + d.pendentes.length, 0) : null;
      // HH:MM (sem segundos) — número curto cabe no card sem colidir com o título (medido no
      // print de 390×844: "11:08:17" encavalava "Conversa" no minimapa/celular).
      const horaCurta = horaLocal(ultimo.hora).slice(0, 5);
      preencherModulo(
        "conversa",
        horaCurta,
        `${j.total_turnos} turno(s) espelhado(s)`,
        pendentesTotal === null ? "⚪ fila não-medida" : `${pendentesTotal} pendente(s) na fila`,
        "verde"
      );
    } catch (e) {
      preencherModulo("conversa", "⚪", "🔴 falha ao ler a sessão", "");
    }
  }

  // ── CONVERSA: espelho ao vivo da sessão (corte Enio 03/09) ──────────────────────────
  var conversaTimer = null;
  var conversaUltimo = "";
  function pararPollConversa() { if (conversaTimer) { clearInterval(conversaTimer); conversaTimer = null; } }
  function cartaoFerramenta(f) {
    var sinal = f.ok === true ? "✓" : f.ok === false ? "✗" : "…";
    var cor = f.ok === true ? "var(--verde)" : f.ok === false ? "var(--vermelho)" : "var(--texto-fraco)";
    // B12: Edit/Write trazem o diff (-/+) como no Claude Code; o resultado da ferramenta vem depois
    var diff = (f.diff && f.diff.length) ? '<pre class="diff">' + f.diff.map(function (l) {
      var cls = l.s === "+" ? "d-add" : l.s === "-" ? "d-del" : "d-ctx";
      return '<span class="' + cls + '">' + l.s + ' ' + escaparHtml(l.t) + '</span>';
    }).join("\n") + '</pre>' : "";
    return '<details class="cartao-ferramenta"' + (diff ? ' open' : '') + '><summary><span style="color:' + cor + '">' + sinal + '</span> <span class="ferr-nome">' + escaparHtml(f.nome) + '</span> <span>' + escaparHtml(f.resumo) + '</span></summary>' + diff +
      (f.resultado ? '<pre>' + escaparHtml(f.resultado) + '</pre>' : '<pre>⚪ sem resultado registrado ainda</pre>') + '</details>';
  }
  // RV-2/4/7 (corte Enio 08/09): cartaoBlocos/linkarCaminhos + o cartão de PCA e a
  // manchete leiga vivem em app-resposta.js (teto de 600L deste arquivo já estourado
  // antes desta fatia — R-REFACTOR-ORG-001: extrai em vez de empilhar aqui).
  function renderConversa(j) {
    var meta = document.getElementById("conversa-meta");
    var fio = document.getElementById("conversa-fio");
    if (!j.ok) { meta.textContent = j.erro || "⚪ sem transcript"; fio.innerHTML = ""; return; }
    meta.textContent = "sessão " + String(j.sessao || "").slice(0, 8) + " · " + j.total_turnos + " turno(s) · lido " + horaLocal(j.medidoEm);
    // a lista marca a sessão que o servidor DE FATO espelhou (a atual pode não ser a mais recente da máquina)
    var selS = document.getElementById("conversa-sessao");
    if (selS && !conversaSessao && j.sessao && selS.value !== j.sessao) { for (var oi = 0; oi < selS.options.length; oi++) if (selS.options[oi].value === j.sessao) { selS.selectedIndex = oi; break; } }
    var chave = j.total_linhas + ":" + j.total_turnos;
    if (chave === conversaUltimo) return; // nada mudou: não re-renderiza (mantém o scroll do humano)
    conversaUltimo = chave;
    fio.innerHTML = j.turnos.map(function (t) {
      var hora = '<span class="msg-hora">' + horaLocal(t.hora) + '</span>';
      var blocos = [];
      if (t.papel === "humano") blocos.push('<div class="msg-humano">' + escaparHtml(t.texto) + hora + '</div>');
      else {
        if (t.texto) {
          var corpoHtml = t.html || escaparHtml(t.texto);
          if (t.caminhos && t.caminhos.length) corpoHtml = linkarCaminhos(corpoHtml, t.caminhos);
          blocos.push('<div class="msg-agente' + (t.html ? ' msg-md' : '') + '">' + corpoHtml + hora + '</div>');
        }
        if (t.blocos) {
          var cartao = cartaoBlocos(t.blocos, t.leigo);
          if (t.caminhos && t.caminhos.length) cartao = linkarCaminhos(cartao, t.caminhos);
          blocos.push(cartao);
        }
        (t.ferramentas || []).forEach(function (f) { blocos.push(cartaoFerramenta(f)); });
      }
      return blocos.join("");
    }).join("");
    fio.scrollTop = fio.scrollHeight;
  }
  var conversaSessao = ""; // "" = a mais recente da máquina (B9: todas as pastas, worktrees incluídos)
  async function carregarConversa() {
    try { var r = await fetch("/api/sessao?n=80" + (conversaSessao ? "&sessao=" + encodeURIComponent(conversaSessao) : "")); renderConversa(await r.json()); }
    catch (e) { document.getElementById("conversa-meta").textContent = "🔴 falha ao ler a sessão: " + e; }
  }
  // lista de sessões (B10): a pessoa escolhe qual janela espelhar; sem lista = ⚪ dito no próprio select
  async function carregarSessoes() {
    var sel = document.getElementById("conversa-sessao"); if (!sel) return;
    try {
      var r = await fetch("/api/sessoes"); var j = await r.json();
      if (!j.ok || !j.sessoes.length) { sel.innerHTML = '<option value="">⚪ nenhuma sessão encontrada nesta máquina</option>'; return; }
      sel.innerHTML = j.sessoes.map(function (s, i) {
        var rot = (s.viva ? "🟢 " : "⚪ ") + horaLocal(s.modificadoEm) + " · " + s.repo + (s.abertura ? " · " + s.abertura : " · " + s.id.slice(0, 8));
        return '<option value="' + escaparHtml(s.id) + '"' + ((conversaSessao ? s.id === conversaSessao : i === 0) ? " selected" : "") + '>' + escaparHtml(rot) + '</option>';
      }).join("");
    } catch (e) { sel.innerHTML = '<option value="">🔴 lista de sessões falhou</option>'; }
  }
  document.getElementById("conversa-sessao").addEventListener("change", function (e) {
    conversaSessao = e.target.value; conversaUltimo = ""; carregarConversa();
  });
  document.getElementById("btn-conversa").addEventListener("click", function () {
    abrirGaveta("conversa-overlay"); conversaUltimo = ""; carregarSessoes(); carregarConversa();
    pararPollConversa(); conversaTimer = setInterval(carregarConversa, 3000);
  });
  document.getElementById("conversa-fechar").addEventListener("click", function () { fecharGaveta("conversa-overlay"); });
  // gaveta "sobre" (versão · SHA · data · ramo · checkout · porta · no ar desde)
  async function carregarSobre() {
    var dl = document.getElementById("sobre-lista");
    try {
      var j = await (await fetch("/api/sobre")).json();
      var g = j.git || {};
      var linhas = [
        ["versão", g.versao || "⚪"], ["commit", (g.head || "⚪") + (g.msg ? " — " + g.msg : "")],
        ["data do commit", g.data || "⚪"], ["commits no histórico", g.total || "⚪"], ["ramo", g.ramo || "⚪"],
        ["serve a partir de", j.repo || "⚪"], ["porta", j.porta || "⚪"],
        ["no ar desde", j.subiuEm ? new Date(j.subiuEm).toLocaleString("pt-BR") : "⚪"],
        ["casca", window.webkit && window.webkit.messageHandlers ? "nativa (GTK + WebKit)" : "navegador"]
      ];
      dl.innerHTML = linhas.map(function (l) { return "<dt>" + escaparHtml(String(l[0])) + "</dt><dd>" + escaparHtml(String(l[1])) + "</dd>"; }).join("");
    } catch (e) { dl.innerHTML = "<dt>🔴</dt><dd>não consegui ler /api/sobre: " + escaparHtml(String(e)) + "</dd>"; }
  }
  document.getElementById("versao").addEventListener("click", function () { abrirGaveta("sobre-overlay"); carregarSobre(); });
  document.getElementById("sobre-fechar").addEventListener("click", function () { fecharGaveta("sobre-overlay"); });
  // atalho de tela: #conversa abre direto na conversa (link no celular e prova visual sem clique)
  window.addEventListener("load", function () { if (location.hash === "#conversa") document.getElementById("btn-conversa").click(); });
  // DESTINO-ESCOLHIVEL-001 (corte Enio 2026-09-12): o select de destino é povoado a cada poll
  // com as filas que o /estado devolve — nunca lista fixa. Cada opção carrega o veredito de
  // escuta (FILA-SILENCIO-001) para o usuário ver ANTES de mandar. Preserva a escolha atual
  // entre polls; se a fila escolhida sumir do disco, cai para coordenadora e diz isso no rótulo.
  function povoarDestinos(estado) {
    var sel = document.getElementById("conversa-destino");
    if (!sel || !estado || !estado.agentes) return;
    var atual = sel.value || "coordenadora";
    var nomes = Object.keys(estado.agentes).sort();
    if (nomes.indexOf("coordenadora") < 0) nomes.unshift("coordenadora"); // destino padrão sempre visível, mesmo sem diretório ainda
    sel.innerHTML = "";
    nomes.forEach(function (n) {
      var a = estado.agentes[n];
      var e = a && a.escuta ? a.escuta : null;
      // só os 3 status que o /estado (nucleo.ts) devolve: viva · orfa · surda — "ilegível" o nucleo
      // funde em surda (divergência declarada com fila.ts, que separa 4; não é resolvida aqui)
      var rot = !e ? "⚪ escuta não medida"
        : e.status === "viva" ? "🟢 escutando (" + (e.sessao || "?") + ")"
        : e.status === "orfa" ? "⚪ órfã — pid " + (e.pid || "?") + " morto, rearmar"
        : "🔴 surda — ninguém escutando";
      var pend = a && a.pendentes ? a.pendentes.length : 0;
      var o = document.createElement("option");
      o.value = n;
      o.textContent = n + " · " + rot + (pend ? " · " + pend + " na fila" : "");
      sel.appendChild(o);
    });
    sel.value = nomes.indexOf(atual) >= 0 ? atual : "coordenadora";
  }

  document.getElementById("conversa-enviar").addEventListener("click", async function () {
    var ta = document.getElementById("conversa-texto");
    var texto = (ta.value || "").trim();
    if (!texto) return;
    var selDest = document.getElementById("conversa-destino");
    var destino = (selDest && selDest.value) || "coordenadora";
    var r = await fetch("/comando", { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ acao: "mensagem", agente: destino, titulo: texto.slice(0, 120), corpo: texto }) });
    var j = await r.json();
    // FILA-SILENCIO-001 (corte Enio 2026-09-12): a mensagem antiga prometia "aparece aqui
    // quando a sessão responder" mesmo com a fila SURDA — promessa que o sistema não podia
    // cumprir, e o silêncio parecia processamento. Agora a tela diz o que o disco diz.
    var meta = document.getElementById("conversa-meta");
    if (!j.ok) { meta.textContent = "🔴 " + (j.erro || "não enviou"); return; }
    meta.textContent = j.ouvinte
      ? "🟢 na fila de " + destino + ", que está escutando — aparece aqui quando ela responder"
      : "🟡 na fila de " + destino + ", mas NINGUÉM está escutando agora (" + (j.escuta || "⚪ não medido") + ") — fica guardado e só será lido quando uma sessão armar a escuta";
    ta.value = "";
  });

  // ── FAIXA AGENTES: números REAIS de /agentes (sessões vivas, subagentes, workflows,
  // motores agendados). Cadência própria de 10s (não os 2s do /estado) porque a sonda
  // spawna pgrep+systemctl+crontab e varre disco — 2s desperdiçaria processo sem ganho
  // visível (números que não mudam segundo a segundo). Cadência declarada no header.
  function valorOuBranco(n) {
    return (n === null || n === undefined) ? "⚪" : String(n);
  }

  function preencherStat(prefixo, valor, sub) {
    const valorEl = document.getElementById(`stat-${prefixo}-valor`);
    if (valorEl) valorEl.textContent = valor;
    const subEl = document.getElementById(`stat-${prefixo}-sub`);
    if (subEl) subEl.textContent = sub || "";
  }

  function renderAgentes(j) {
    preencherStat("sessoes", valorOuBranco(j.sessoesVivas.n), j.sessoesVivas.detalhe);

    const ar = j.subagentes.agentRuns;
    const sc = j.subagentes.sessoesClaude;
    preencherStat(
      "subagentes-hoje",
      valorOuBranco(ar.hoje),
      sc.hoje !== null ? `+${sc.hoje} em sessões desta máquina` : "sessões desta máquina: ⚪ não-medido"
    );
    preencherStat(
      "subagentes-total",
      valorOuBranco(ar.n),
      sc.n !== null ? `+${sc.n} em sessões desta máquina` : "sessões desta máquina: ⚪ não-medido"
    );

    preencherStat(
      "workflows",
      valorOuBranco(j.workflows.n),
      j.workflows.sessoesComPasta ? `${j.workflows.sessoesComPasta} sessão(ões) com workflows/` : ""
    );

    const t = j.motores.timers.n, c = j.motores.cron.n;
    const motoresValor = (t !== null && c !== null) ? String(t + c) : "⚪";
    preencherStat("motores", motoresValor, `${valorOuBranco(t)} timers · ${valorOuBranco(c)} cron`);

    const vpsEl = document.getElementById("stat-vps-valor");
    if (vpsEl) vpsEl.textContent = j.vps;

    // MÓDULOS (mesmo /agentes, mesma leitura — reuse, não novo fetch): sessões + motores/workflows
    preencherModulo(
      "sessoes",
      valorOuBranco(j.sessoesVivas.n),
      (ar.hoje === null || ar.hoje === undefined)
        ? "⚪ tarefas de IA não medidas hoje"
        : `🟢 ${ar.hoje} tarefa(s) de IA hoje`,
      `total: ${valorOuBranco(ar.n)}${sc.n !== null ? " (+" + sc.n + " nesta máquina)" : ""}`,
      j.sessoesVivas.n ? "verde" : undefined
    );
    preencherModulo(
      "motores",
      motoresValor,
      `${valorOuBranco(j.workflows.n)} fluxo(s) a pedido`,
      (t !== null && c !== null) ? `${t + c} no horário marcado` : "⚪ não medido",
      motoresValor !== "⚪" ? "verde" : undefined
    );

    // linha3 do módulo Serviços + linha do topo da seção — mesma string j.vps, os 2
    // únicos lugares da tela com a palavra "serviços" (censo estático, rotulado "VPS:").
    const servLinha3 = document.getElementById("mod-servicos-linha3");
    if (servLinha3) servLinha3.textContent = j.vps;
    const vpsSecao = document.getElementById("integracoes-vps");
    if (vpsSecao) vpsSecao.textContent = j.vps;

    // seção "⚙️ Motores e loops" da gaveta 🔌 integrações — mesmo j, sem 2º fetch.
    renderMotoresSecao(j);
  }

  async function carregarAgentes() {
    try {
      const r = await fetch("/agentes");
      const j = await r.json();
      renderAgentes(j);
    } catch (e) {
      preencherStat("sessoes", "⚪", "falha ao carregar /agentes");
    }
  }

  poll();
  setInterval(poll, 2000);
  carregarAgentes();
  setInterval(carregarAgentes, 10000);
  atualizarModuloServicos();
  setInterval(atualizarModuloServicos, 30000);
  atualizarModuloCatalogo();
  setInterval(atualizarModuloCatalogo, 30000);
  if (typeof atualizarModuloDocumentos === "function") {
    atualizarModuloDocumentos();
    setInterval(atualizarModuloDocumentos, 30000);
  }
  // ROTEIRO-GRUPO-001 (14/09): mesmo padrão de hoisting do bloco acima — atualizarModuloRoteiro
  // só existe se app-roteiro.js foi concatenado (vem DEPOIS deste arquivo em /app.js).
  if (typeof atualizarModuloRoteiro === "function") {
    atualizarModuloRoteiro();
    setInterval(atualizarModuloRoteiro, 30000);
  }
  atualizarModuloConversa();
  setInterval(atualizarModuloConversa, 5000);
  relogio();
  setInterval(relogio, 1000);

  // ── BUSCA ⌘K / "/" (redesign v2 Command) — Ctrl+K ou "/" foca; Enter abre o catálogo
  // já filtrado, REUSANDO o campo/lógica que a gaveta já tinha (#catalogo-busca +
  // carregarCatalogo), nunca uma segunda busca paralela. ──
  (function () {
    var busca = document.getElementById("busca-cmdk");
    if (!busca) return;
    document.addEventListener("keydown", function (e) {
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && document.activeElement !== busca && document.activeElement.tagName !== "INPUT" && document.activeElement.tagName !== "TEXTAREA")) {
        e.preventDefault();
        busca.focus();
        busca.select();
      }
    });
    busca.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        var termo = busca.value.trim();
        abrirGaveta("catalogo-overlay");
        var campoCatalogo = document.getElementById("catalogo-busca");
        if (campoCatalogo) { campoCatalogo.value = termo; }
        carregarCatalogo();
      } else if (e.key === "Escape") {
        busca.blur();
      }
    });
  })();
  // APP-MULTIDISPOSITIVO-001: com service worker + manifest, o Android/tablet/TV oferece
  // "instalar aplicativo" e o app abre em janela própria (standalone). O SW é casca:
  // guarda o esqueleto e NUNCA serve dado de cache como se fosse estado de agora (R13-c).
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch((e) => console.warn("sw não registrou:", e));
    });
  }
