/* SIMPLICITY_OVERRIDE: extraido de app.js (1436L) na refatoracao organica de 04/09, passo 2/3 (divisao por dominio) — codigo MOVIDO, nao escrito. Dominio: historia(cronica) + integracoes(+motores/loops) + time-em-campo + reuniao-ao-vivo + gaveta-manager (fecha uma ao abrir outra). EGOS-App (4 blocos) foi realocado para app-catalogo.js pelo mesmo motivo do CONVERSA em app-nucleo.js: manter este arquivo ≤600L sem quebrar dominio em mais de 3 arquivos. Servido concatenado (2o bloco) por /app.js (scripts/orquestra-viva.ts). */
  // ── CRÔNICA DA ORQUESTRA: overlay com a narrativa gerada por scripts/cronica.ts.
  // Cada nome de agente vivo aparece colorido pela cor do status dele (verde/cinza/vermelho) —
  // mesma paleta dos cartões, para o personagem carregar a cor real na história.
  function corPersonagem(status) {
    if (status === "viva") return "var(--verde)";
    if (status === "surda") return "var(--vermelho)";
    return "var(--cinza)";
  }

  function colorirPersonagens(paragrafoEscapado) {
    if (!estadoAtual) return paragrafoEscapado;
    let out = paragrafoEscapado;
    for (const nome of Object.keys(estadoAtual.agentes)) {
      const cor = corPersonagem(estadoAtual.agentes[nome].escuta.status);
      const nomeRe = nome.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(`\\b(${nomeRe})\\b`, "gi");
      out = out.replace(re, `<span style="color:${cor};font-weight:700">$1</span>`);
    }
    return out;
  }

  function renderCronica(j) {
    const corpo = document.getElementById("cronica-texto");
    const meta = document.getElementById("cronica-meta");
    if (!j.historia) {
      corpo.innerHTML = `<p>${escaparHtml(j.aviso || "⚪ ainda não narrada")}</p>`;
      meta.textContent = "";
      return;
    }
    corpo.innerHTML = j.historia
      .split(/\n{2,}/)
      .filter((p) => p.trim())
      .map((p) => `<p>${colorirPersonagens(escaparHtml(p))}</p>`)
      .join("");
    const contMeta = document.getElementById("cont-cronica-meta");
    if (j.meta) {
      const f = j.meta.fatos || {};
      meta.textContent =
        `narrado em ${new Date(j.meta.geradoEm).toLocaleString("pt-BR")} · tom: ${j.meta.tom} · ` +
        `${f.nAgentes ?? "⚪"} agente(s) · ${f.nJobs ?? "⚪"} job(s) · ${f.nCommits ?? "⚪"} commit(s)`;
      const tomInput = document.getElementById("cronica-tom-input");
      if (!tomInput.value) tomInput.value = j.meta.tom || "";
      // contador (exigência 4): quantos dos 3 fatos técnicos foram de fato medidos —
      // fonte ausente vira ⚪ acima, e não entra na contagem (não inventa dado).
      const medidos = [f.nAgentes, f.nJobs, f.nCommits].filter((v) => v !== undefined && v !== null).length;
      if (contMeta) contMeta.textContent = medidos;
    } else {
      meta.textContent = "";
      if (contMeta) contMeta.textContent = 0;
    }
  }

  async function carregarCronica() {
    try {
      const r = await fetch("/cronica");
      const j = await r.json();
      renderCronica(j);
      return j;
    } catch (e) {
      document.getElementById("cronica-status").className = "erro";
      document.getElementById("cronica-status").textContent = `🔴 falha ao carregar história: ${e}`;
      return null;
    }
  }

  window.__ABRIDORES = window.__ABRIDORES || {};
  window.__ABRIDORES["cronica-overlay"] = function () {
    document.getElementById("cronica-status").textContent = "";
    document.getElementById("cronica-status").className = "";
    carregarCronica();
  };

  function abrirHistoria() {
    abrirGaveta("cronica-overlay");
  }

  function fecharHistoria() {
    fecharGaveta("cronica-overlay");
    cancelarConfirmacaoRecontar();
  }

  let croniaPollTimer = null;

  function pararPollCronica() {
    if (croniaPollTimer) { clearInterval(croniaPollTimer); croniaPollTimer = null; }
  }

  async function recontar(tom) {
    pararPollCronica();
    const statusDiv = document.getElementById("cronica-status");
    const btns = document.querySelectorAll("#cronica-form button.acao");
    statusDiv.className = "";
    statusDiv.textContent = "narrando… ⏳";
    btns.forEach((b) => (b.disabled = true));

    const antes = await carregarCronica();
    const geradoEmAntes = antes && antes.meta ? antes.meta.geradoEm : null;

    let resp;
    try {
      const r = await fetch("/cronica/gerar", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(tom !== undefined ? { tom } : {}),
      });
      resp = await r.json();
    } catch (e) {
      statusDiv.className = "erro";
      statusDiv.textContent = `🔴 falha de rede: ${e}`;
      btns.forEach((b) => (b.disabled = false));
      return;
    }
    if (!resp.ok) {
      statusDiv.className = "erro";
      statusDiv.textContent = `🔴 ${resp.erro}`;
      btns.forEach((b) => (b.disabled = false));
      return;
    }

    // repoll 3s (geração demora — não seguramos a resposta HTTP): compara geradoEm
    // antes/depois porque "historia não-nula" sozinho não prova que ESTA rodada terminou.
    croniaPollTimer = setInterval(async () => {
      const j = await carregarCronica();
      if (j && j.meta && j.meta.geradoEm && j.meta.geradoEm !== geradoEmAntes) {
        pararPollCronica();
        statusDiv.className = "ok";
        statusDiv.textContent = "🟢 narrada";
        btns.forEach((b) => (b.disabled = false));
      }
    }, 3000);
  }

  // ── INTEGRAÇÕES: painel "quartel-general" — o que ESTA máquina já integrou.
  // Selo por estado (🟢 ativa · 🟡 configurável · ⚪ não-configurada/não-medida); tile
  // não-configurada NÃO some — fica apagada (opacity + borda tracejada) com a dica.
  function seloEstado(estado) {
    if (estado === "ativa") return "🟢";
    if (estado === "configuravel") return "🟡";
    return "⚪";
  }

  // estado da escuta em 3 palavras humanas (FATIA 3, VOCABULARIO-LEIGO-001, corte Enio
  // 05/09) — os mesmos 3 estados de sempre (ativa/configuravel/nao-configurada) ganham
  // frase curta ao lado do i.detalhe técnico, que continua aparecendo (não some, só ganha
  // companhia); horaOuNuncaLida é global, definida em app-catalogo.js (mesmo script
  // concatenado — ADOPT, mesmo padrão já usado por horaLocal aqui).
  function estadoEscutaHumano(estado) {
    if (estado === "ativa") return "ligado e respondendo";
    if (estado === "configuravel") return "falta configurar";
    return "ainda não configurado";
  }

  function tileIntegracao(i) {
    return `
        <div class="tile-integracao ${i.estado}">
          <div class="ti-nome">${seloEstado(i.estado)} ${escaparHtml(i.nome)} <span style="color:var(--texto-fraco)">— ${escaparHtml(estadoEscutaHumano(i.estado))}</span></div>
          <div class="ti-detalhe">${escaparHtml(i.detalhe)}</div>
          <div class="ti-hora">${escaparHtml(horaOuNuncaLida(i.medidoEm))}</div>
        </div>`;
  }

  // ── MOTORES E LOOPS (fatia 2, 04/09) — timer systemd ou linha de cron, NOMEADOS, com
  // próxima/última execução (⚪ quando a fonte não mede — cron não computa next-run sem
  // parser de expressão). Mesmo template de tile das integrações, campos diferentes. ──
  function tileMotor(m) {
    const partes = [];
    if (m.agenda) partes.push(`agenda ${m.agenda}`);
    partes.push(m.proxima ? `próxima ${horaLocal(m.proxima)}` : "próxima ⚪ não medida");
    if (m.ultima) partes.push(`última ${horaLocal(m.ultima)}`);
    return `
        <div class="tile-integracao ${m.proxima ? "ativa" : "configuravel"}">
          <div class="ti-nome">${m.proxima ? "🟢" : "⚪"} ${escaparHtml(m.nome)}</div>
          <div class="ti-detalhe">${escaparHtml(partes.join(" · "))}</div>
        </div>`;
  }

  // template GAVETA R-UI-008 (corte Enio 2026-09-01): bloco dobrável com contador,
  // reaproveitado pelas 3 gavetas. Lê o <details> já no DOM antes de sobrescrever o
  // innerHTML — assim o poll de 30s/10s nunca fecha um bloco que a pessoa abriu
  // (mesmo cuidado do dataset.hash no painel lateral, aplicado aqui via `.open`).
  function grupoDobravel(id, titulo, itens, renderItemFn, abertoPadrao, vazioTexto) {
    const existente = document.getElementById(id);
    const aberto = existente ? existente.open : abertoPadrao;
    const corpo = itens.length
      ? `<div class="grade-tiles">${itens.map(renderItemFn).join("")}</div>`
      : `<div class="ti-detalhe">${vazioTexto}</div>`;
    return `<details class="bloco-dobravel" id="${id}" ${aberto ? "open" : ""}><summary>${escaparHtml(titulo)} <span class="cont">${itens.length}</span></summary><div class="corpo-bloco">${corpo}</div></details>`;
  }

  // exigência 1 (R-UI-008): manchete em frase antes de qualquer tile — número dentro
  // da frase, nunca a frase substituída pelo número.
  function mancheteIntegracoes(ativas, config, naoConfig) {
    return `<b>${ativas}</b> integração(ões) ligada(s), <b>${config}</b> configurável(is), <b>${naoConfig}</b> ainda não configurada(s).`;
  }

  function renderIntegracoes(j) {
    const grid = document.getElementById("integracoes-grid");
    const meta = document.getElementById("integracoes-meta");
    const manchete = document.getElementById("integracoes-manchete");
    meta.textContent = `medido em ${horaLocal(j.geradoEm)}`;
    const ativas = j.integracoes.filter((i) => i.estado === "ativa");
    const config = j.integracoes.filter((i) => i.estado === "configuravel");
    const naoConfig = j.integracoes.filter((i) => i.estado === "nao-configurada");
    manchete.innerHTML = mancheteIntegracoes(ativas.length, config.length, naoConfig.length);
    grid.innerHTML =
      grupoDobravel("bloco-integ-ativas", "🟢 Ligadas", ativas, tileIntegracao, true, "nenhuma ligada ainda") +
      grupoDobravel("bloco-integ-config", "🟡 Configuráveis", config, tileIntegracao, false, "nenhuma pendente de configuração") +
      grupoDobravel("bloco-integ-nao", "⚪ Não configuradas", naoConfig, tileIntegracao, false, "nenhuma");
  }

  // ── seção "⚙️ Motores e loops" (fatia 2, 04/09) — populada pelo MESMO /agentes que já
  // roda a cada 10s desde o load (renderAgentes chama isto sempre, gaveta aberta ou não;
  // é o motivo de focarSecaoIntegracoes conseguir focar quase sempre no 1º tiro). ──
  function renderMotoresSecao(j) {
    const meta = document.getElementById("motores-meta");
    const grid = document.getElementById("motores-grid");
    if (!meta || !grid) return;
    const t = j.motores.timers;
    const c = j.motores.cron;
    meta.textContent = `${valorOuBranco(t.n)} timer(s) systemd · ${valorOuBranco(c.n)} job(s) de cron — medido às ${new Date().toLocaleTimeString("pt-BR")}`;
    grid.innerHTML =
      grupoDobravel("bloco-motores-timers", "⏱️ Timers systemd (ordenados por próxima execução)", t.itens || [], tileMotor, true, t.n === null ? "⚪ não medido — " + escaparHtml(t.detalhe) : "nenhum timer") +
      grupoDobravel("bloco-motores-cron", "🗓️ Cron (crontab -l)", c.itens || [], tileMotor, false, c.n === null ? "⚪ não medido — " + escaparHtml(c.detalhe) : "nenhum job ativo");
  }

  // re-poll automático só ENQUANTO o overlay está aberto — fecha = para a sonda,
  // não desperdiça a cota de 30s do WhatsApp com painel escondido (corte Enio 2026-08-30)
  let integracoesPollTimer = null;

  function pararPollIntegracoes() {
    if (integracoesPollTimer) { clearInterval(integracoesPollTimer); integracoesPollTimer = null; }
  }

  async function carregarIntegracoes() {
    const grid = document.getElementById("integracoes-grid");
    const meta = document.getElementById("integracoes-meta");
    meta.textContent = "medindo…";
    try {
      const r = await fetch("/integracoes");
      const j = await r.json();
      renderIntegracoes(j);
    } catch (e) {
      meta.textContent = `🔴 falha ao carregar integrações: ${e}`;
      grid.innerHTML = "";
    }
  }

  // GAVETA-ABRE-CARREGADA-001: o abridor NÃO chama abrirGaveta (seria recursão) — ele só
  // busca e liga o poll; quem abre é abrirGaveta, que o invoca.
  window.__ABRIDORES = window.__ABRIDORES || {};
  window.__ABRIDORES["integracoes-overlay"] = function () {
    document.getElementById("integracoes-meta").textContent = "⚪ carregando…";
    document.getElementById("integracoes-grid").innerHTML = "";
    carregarIntegracoes();
    pararPollIntegracoes();
    integracoesPollTimer = setInterval(carregarIntegracoes, 30000);
  };

  function abrirIntegracoes() {
    abrirGaveta("integracoes-overlay");
  }

  function fecharIntegracoes() {
    fecharGaveta("integracoes-overlay");
  }

  document.getElementById("btn-integracoes").addEventListener("click", abrirIntegracoes);
  document.getElementById("integracoes-fechar").addEventListener("click", fecharIntegracoes);
  document.getElementById("btn-integracoes-atualizar").addEventListener("click", () => carregarIntegracoes());

  // ── TIME EM CAMPO: papéis da fila + corridas de braços + heartbeats, tudo de /time.
  // Mesmo padrão da crônica/integrações — overlay só sonda ENQUANTO aberto.
  function seloHeartbeat(status) {
    if (status === "ok") return "🟢";
    if (status === null || status === undefined) return "⚪";
    return "🔴";
  }

  function renderPapeis(papeis, filaExiste) {
    const grid = document.getElementById("time-papeis-grid");
    document.getElementById("cont-time-papeis").textContent = filaExiste ? papeis.length : 0;
    if (!filaExiste || !papeis.length) {
      grid.innerHTML = `<div class="secao-vazia">⚪ fila ainda não existe neste disco — nenhum agente postou/escutou</div>`;
      return;
    }
    grid.innerHTML = papeis
      .map((p) => {
        const pend = p.pendentesRecentes.length
          ? p.pendentesRecentes.map((j) => `<li>${escaparHtml(j.titulo)}</li>`).join("")
          : `<li class="vazio">nenhum</li>`;
        const and = p.emAndamentoRecentes.length
          ? p.emAndamentoRecentes.map((j) => `<li>${escaparHtml(j.titulo)}</li>`).join("")
          : `<li class="vazio">nenhum</li>`;
        // PCA-55: card abre o detalhe (fazendo/esperando/feitos+pedido); data-tt-* = tooltip.
        const escuta = p.escuta || { status: "surda" };
        const estadoTxt = escuta.status === "viva" ? `viva (pid ${escuta.pid ?? "⚪"})`
          : escuta.status === "orfa" ? `órfã (pid ${escuta.pid ?? "⚪"})`
          : "surda";
        return `
          <div class="papel-card" data-agente="${escaparHtml(p.papel)}" tabindex="0" role="button"
               data-tt-titulo="${escaparHtml(p.papel)}" data-tt-numero="${escaparHtml(estadoTxt)}"
               data-tt-medido="${escaparHtml(escuta.armadoEm || "")}"
               data-tt-abre="Abre fazendo, esperando, feitos e o campo de pedido.">
            <div class="papel-nome">${escaparHtml(p.papel)}</div>
            <div class="papel-contadores">${p.pendentesTotal} pendente(s) · ${p.emAndamentoTotal} em andamento</div>
            <div class="papel-secao-titulo">pendentes recentes</div>
            <ul>${pend}</ul>
            <div class="papel-secao-titulo">em andamento recentes</div>
            <ul>${and}</ul>
          </div>`;
      })
      .join("");
  }

  function renderCorridas(corridas) {
    const div = document.getElementById("time-corridas-lista");
    document.getElementById("cont-time-corridas").textContent = corridas.erro ? 0 : corridas.itens.length;
    if (corridas.erro) {
      div.innerHTML = `<div class="secao-vazia">${escaparHtml(corridas.erro)}</div>`;
      return;
    }
    if (!corridas.itens.length) {
      div.innerHTML = `<div class="secao-vazia">nenhuma corrida registrada ainda</div>`;
      return;
    }
    div.innerHTML = corridas.itens
      .map(
        (c) => `
          <div class="corrida-item">
            <span class="corrida-nome">${escaparHtml(c.nome)}</span>
            <span class="corrida-tempo">${c.mtime === "⚪" ? "⚪" : formatarIdade(c.mtime)}</span>
            <span class="corrida-resumo">${c.resumo ? escaparHtml(c.resumo) : "⚪ sem resumo (linha ilegível ou vazia)"}</span>
          </div>`
      )
      .join("");
  }

  function renderHeartbeats(heartbeats) {
    const grid = document.getElementById("time-heartbeats-grid");
    document.getElementById("cont-time-heartbeats").textContent = heartbeats.erro ? 0 : heartbeats.itens.length;
    if (heartbeats.erro) {
      grid.innerHTML = `<div class="secao-vazia">${escaparHtml(heartbeats.erro)}</div>`;
      return;
    }
    if (!heartbeats.itens.length) {
      grid.innerHTML = `<div class="secao-vazia">nenhum heartbeat gravado ainda</div>`;
      return;
    }
    grid.innerHTML = heartbeats.itens
      .map((h) => {
        const detalhe = h.timestamp ? formatarIdade(h.timestamp) : "⚪ sem timestamp";
        // LEIGOS fatia 3 (08/09): frase humana ao lado do nome técnico — cebola, nunca troca
        // (nome técnico continua na tela). VOCAB.heartbeat pode não ter o nome (heartbeat
        // novo criado depois desta entrega) — sem verbete, some a frase, nunca quebra.
        const vHb = (typeof VOCAB !== "undefined" && VOCAB.heartbeat && VOCAB.heartbeat[h.nome]) || null;
        const humano = vHb ? `<span class="hb-humano">${escaparHtml(vHb.humano)}</span>` : "";
        return `
          <div class="heartbeat-tile">
            <div class="hb-nome">${seloHeartbeat(h.status)} ${escaparHtml(h.nome)}</div>
            ${humano}
            <div class="hb-detalhe">${escaparHtml(h.status ?? "⚪")} · ${detalhe}</div>
          </div>`;
      })
      .join("");
  }

  /* SKILLS EM USO (corte Enio 01/09): o tracker já media diário e o resultado não tinha
     leitor em superfície local — este grid é o leitor. Barra de intensidade proporcional
     ao topo; ⚪ dito quando o tracker falhar, nunca grid sumido. */
  function renderSkills(skills) {
    const grid = document.getElementById("time-skills-grid");
    document.getElementById("cont-time-skills").textContent = (skills && skills.top) ? skills.top.length : 0;
    if (!skills || skills.erro) {
      grid.innerHTML = `<div class="secao-vazia">${escaparHtml((skills && skills.erro) || "⚪ NÃO-MEDIDO")}</div>`;
      return;
    }
    if (!skills.top || !skills.top.length) {
      grid.innerHTML = `<div class="secao-vazia">nenhum uso registrado nos últimos 30 dias</div>`;
      return;
    }
    const max = skills.top[0].count || 1;
    grid.innerHTML = skills.top
      .map((s) => `
        <div class="heartbeat-tile">
          <div class="hb-nome">/${escaparHtml(s.skill)} <span style="color:var(--texto-fraco)">×${s.count}</span></div>
          <div style="height:4px;border-radius:2px;background:rgba(255,255,255,.08);margin-top:4px">
            <span style="display:block;height:100%;border-radius:2px;width:${Math.max(6, Math.round((s.count / max) * 100))}%;background:var(--dourado, #d4a94e)"></span>
          </div>
          <div class="hb-detalhe">último: ${s.last_used ? formatarIdade(s.last_used) : "⚪"}</div>
        </div>`)
      .join("");
  }

  // exigência 1 (R-UI-008): manchete derivada dos MESMOS campos que /time devolve —
  // nenhum campo inventado; fonte ausente (erro/⚪) vira ⚪ na frase, nunca chute.
  function mancheteTime(j) {
    const n = j.filaExiste ? j.papeis.length : null;
    const m = j.corridas && !j.corridas.erro ? j.corridas.itens.length : null;
    const k = j.heartbeats && !j.heartbeats.erro
      ? j.heartbeats.itens.filter((h) => h.status === "ok").length
      : null;
    const b = (v) => (v === null ? "⚪" : `<b>${v}</b>`);
    return `${b(n)} papel(éis) na fila, ${b(m)} corrida(s) recente(s) registrada(s), ${b(k)} motor(es) batendo o pulso agora.`;
  }

  function renderTime(j) {
    document.getElementById("time-meta").textContent = `medido em ${horaLocal(j.geradoEm)}`;
    document.getElementById("time-manchete").innerHTML = mancheteTime(j);
    renderPapeis(j.papeis, j.filaExiste);
    renderCorridas(j.corridas);
    renderHeartbeats(j.heartbeats);
    renderSkills(j.skills);
    // PCA-55: guarda o /time bruto + refaz o detalhe aberto (app-agentes.js, hoisted).
    if (typeof atualizarDetalheSeAberto === "function") atualizarDetalheSeAberto(j);
  }

  let timePollTimer = null;

  function pararPollTime() {
    if (timePollTimer) { clearInterval(timePollTimer); timePollTimer = null; }
  }

  async function carregarTime() {
    try {
      const r = await fetch("/time");
      const j = await r.json();
      renderTime(j);
    } catch (e) {
      document.getElementById("time-meta").textContent = `🔴 falha ao carregar time em campo: ${e}`;
    }
  }

  window.__ABRIDORES["time-overlay"] = function () {
    document.getElementById("time-meta").textContent = "⚪ carregando…";
    carregarTime();
    pararPollTime();
    timePollTimer = setInterval(carregarTime, 10000);
  };

  function abrirTime() {
    abrirGaveta("time-overlay");
  }

  function fecharTime() {
    fecharGaveta("time-overlay");
    if (typeof fecharDetalheAgente === "function") fecharDetalheAgente();
  }
  // clique/teclado no papel-card → abrirDetalheAgente (app-agentes.js, delegação lá).

  document.getElementById("btn-time").addEventListener("click", abrirTime);

  // ── REUNIÃO AO VIVO ────────────────────────────────────────────────────────────────
  // Manchete humana primeiro, falas atrás (R-UI-008); parar é confirmação NOMEADA
  // (R-UI-008 exigência 3) — "parar" apaga trabalho em curso, não é leitura.
  let reuniaoRodando = false;
  let blocoAberto = false; // intenção do humano — o painel nunca decide abrir sozinho
  function pintarReuniao(d) {
    reuniaoRodando = !!d.rodando;
    const luzTopo = document.getElementById("luz-gravar");
    const luzBloco = document.getElementById("luz-reuniao");
    const bloco = document.getElementById("bloco-reuniao");
    const txt = document.getElementById("txt-gravar");
    const btn = document.getElementById("btn-gravar");
    luzTopo.classList.toggle("acesa", reuniaoRodando);
    luzBloco.classList.toggle("acesa", reuniaoRodando);
    btn.classList.toggle("gravando", reuniaoRodando);
    txt.textContent = reuniaoRodando ? "gravando" : "gravar reunião";
    const encerradaAgora = !reuniaoRodando && d.falas > 0;
    // Corte Enio (pós-reunião): o popup NUNCA se abre sozinho — "insiste em ficar por
    // cima" era isto. Abrir é clique no botão do topo; a luz pulsando já é o sinal.
    bloco.hidden = !blocoAberto;
    document.getElementById("btn-parar-gravar").hidden = !reuniaoRodando;
    document.getElementById("btn-fechar-reuniao").hidden = !encerradaAgora;
    const caminho = document.getElementById("reuniao-caminho");
    caminho.hidden = !encerradaAgora;
    if (encerradaAgora) caminho.textContent = `salvo em: ${d.pasta}/transcript.md`;
    const m = document.getElementById("reuniao-manchete");
    m.textContent = reuniaoRodando
      ? `Gravando esta reunião nesta máquina. ${d.falas} fala(s) transcrita(s) até agora, ${d.trechos} trecho(s) de áudio guardados.`
      : encerradaAgora
        ? `Reunião de hoje encerrada — ${d.falas} fala(s) transcrita(s) ficaram guardadas nesta máquina.`
        : "—";
    const falas = document.getElementById("reuniao-falas");
    const html = (d.ultimas || []).map((l) => l.replace(/&/g, "&amp;").replace(/</g, "&lt;")).join("\n");
    if (falas.dataset.hash !== html) {
      // Rola para o fim SÓ se já estava perto do fim (o Enio não perde o lugar se
      // subiu pra reler algo mais cedo — histórico completo pede essa cortesia).
      const pertoDoFim = falas.scrollHeight - falas.scrollTop - falas.clientHeight < 60;
      falas.textContent = html; falas.dataset.hash = html;
      if (pertoDoFim) falas.scrollTop = falas.scrollHeight;
    }
  }
  async function lerReuniao() {
    try { pintarReuniao(await (await fetch("/reuniao")).json()); }
    catch { document.getElementById("reuniao-manchete").textContent = "⚪ não consegui ler o estado da gravação (isto NÃO é 'não está gravando')"; }
  }
  async function comandarReuniao(acao) {
    const r = await fetch("/reuniao/comando", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ acao }),
    }).then((x) => x.json()).catch((e) => ({ ok: false, erro: String(e) }));
    if (!r.ok) alert(`não deu: ${r.erro}`);
    setTimeout(lerReuniao, 1200);
  }
  document.getElementById("btn-gravar").addEventListener("click", () => {
    if (reuniaoRodando) { // gravando: o clique alterna o popup (abrir/fechar), nunca para
      blocoAberto = !blocoAberto;
      document.getElementById("bloco-reuniao").hidden = !blocoAberto;
      return;
    }
    if (document.getElementById("btn-fechar-reuniao").hidden === false || blocoAberto) {
      // já encerrada: clique alterna a visualização do histórico do dia
      blocoAberto = !blocoAberto;
      document.getElementById("bloco-reuniao").hidden = !blocoAberto;
      return;
    }
    blocoAberto = true;
    comandarReuniao("start");
  });
  document.getElementById("btn-copiar-reuniao").addEventListener("click", async (ev) => {
    const btn = ev.currentTarget;
    try {
      const texto = await (await fetch("/reuniao/download")).text();
      await navigator.clipboard.writeText(texto);
      const original = btn.textContent;
      btn.textContent = "✅ copiado"; setTimeout(() => { btn.textContent = original; }, 1800);
    } catch (e) { alert(`não deu pra copiar: ${e}`); }
  });
  document.getElementById("btn-parar-gravar").addEventListener("click", (ev) => {
    const b = ev.currentTarget;
    if (b.dataset.confirmar !== "sim") {
      b.dataset.confirmar = "sim";
      b.textContent = "parar mesmo? (clique de novo)";
      setTimeout(() => { b.dataset.confirmar = ""; b.textContent = "parar"; }, 6000);
      return;
    }
    b.dataset.confirmar = ""; b.textContent = "parar";
    comandarReuniao("stop");
  });
  // FECHAR (corte Enio: "deve fechar a aba, oferecendo para salvar os arquivos,
  // mostrando onde ele vai ficar") — o arquivo JÁ está salvo em disco (nunca depende
  // do clique); "fechar" só oferece o download do que já existe e recolhe o bloco.
  document.getElementById("btn-fechar-reuniao").addEventListener("click", () => {
    document.getElementById("btn-baixar-reuniao").click();
    blocoAberto = false;
    document.getElementById("bloco-reuniao").hidden = true;
  });
  lerReuniao();
  setInterval(lerReuniao, 5000);

  // Arrastar o bloco solto pelo cabeçalho (pointer events — sem lib, zero dependência).
  (function () {
    const bloco = document.getElementById("bloco-reuniao");
    const alca = bloco.querySelector(".reuniao-topo");
    let ativo = false, dx = 0, dy = 0;
    alca.addEventListener("pointerdown", (ev) => {
      if (ev.target.closest("button")) return; // não sequestra o clique do "parar"
      ativo = true; bloco.classList.add("arrastando");
      const r = bloco.getBoundingClientRect();
      dx = ev.clientX - r.left; dy = ev.clientY - r.top;
      alca.setPointerCapture(ev.pointerId);
    });
    alca.addEventListener("pointermove", (ev) => {
      if (!ativo) return;
      const x = Math.min(Math.max(0, ev.clientX - dx), window.innerWidth - bloco.offsetWidth);
      const y = Math.min(Math.max(0, ev.clientY - dy), window.innerHeight - bloco.offsetHeight);
      bloco.style.left = `${x}px`; bloco.style.top = `${y}px`; bloco.style.right = "auto";
    });
    ["pointerup", "pointercancel"].forEach((ev) =>
      alca.addEventListener(ev, () => { ativo = false; bloco.classList.remove("arrastando"); }));
  })();
  document.getElementById("time-fechar").addEventListener("click", fecharTime);

  document.getElementById("btn-historia").addEventListener("click", abrirHistoria);
  document.getElementById("cronica-fechar").addEventListener("click", fecharHistoria);

  // exigência 3 (R-UI-008): recontar gasta 1 chamada de IA — o clique no botão
  // principal NUNCA dispara direto; abre um passo de confirmação nomeado (o que vai
  // acontecer, escrito por extenso) e só o clique em "sim" chama recontar().
  let pendenteRecontar = null; // { tom: string|undefined } | null

  function pedirConfirmacaoRecontar(tom) {
    pendenteRecontar = { tom };
    document.getElementById("cronica-confirmar").style.display = "block";
  }

  function cancelarConfirmacaoRecontar() {
    pendenteRecontar = null;
    document.getElementById("cronica-confirmar").style.display = "none";
  }

  document.getElementById("btn-recontar-tom").addEventListener("click", () => {
    const tom = document.getElementById("cronica-tom-input").value.trim();
    const statusDiv = document.getElementById("cronica-status");
    if (!tom) { statusDiv.className = "erro"; statusDiv.textContent = "🔴 escreva um tom antes de recontar"; return; }
    if (tom.length > 200) { statusDiv.className = "erro"; statusDiv.textContent = "🔴 tom muito longo (máx 200 caracteres)"; return; }
    pedirConfirmacaoRecontar(tom);
  });
  document.getElementById("btn-recontar-agora").addEventListener("click", () => pedirConfirmacaoRecontar(undefined));
  document.getElementById("btn-confirmar-recontar").addEventListener("click", () => {
    const pendente = pendenteRecontar;
    cancelarConfirmacaoRecontar();
    if (pendente) recontar(pendente.tom);
  });
  document.getElementById("btn-cancelar-recontar").addEventListener("click", cancelarConfirmacaoRecontar);

  /* GAVETA MANAGER (2º corte Enio 01/09: "as abas foram encavalando"): porta ÚNICA de
     abrir/fechar — abrir uma gaveta FECHA as outras (parando as sondas delas), fundo e
     ESC fecham pela mesma porta. O 1º remendo fechava a classe mas deixava a sonda viva:
     painel escondido consultando /time a cada 10s é desperdício invisível (=R13-a).
     Clique DENTRO da caixa não fecha (só quando o alvo é o próprio fundo). */
  var GAVETAS = {
    "cronica-overlay": function () { pararPollCronica(); },
    "integracoes-overlay": function () { pararPollIntegracoes(); },
    "time-overlay": function () { pararPollTime(); },
    "agenda-overlay": function () {},
    "catalogo-overlay": function () {},
    "documentos-overlay": function () {},
    // DV-1-VISUALIZADOR-ESTADO-COMENTARIO-001 (08/09): visualizador embutido — sem poll pra
    // parar (o iframe some com o overlay; carregarEstado/salvarEstado só rodam sob clique).
    "documento-vivo-overlay": function () {},
    "app4-overlay": function () {},
    // FATIA 3 (VOCABULARIO-LEIGO-001, 05/09): glossário "o que é isso?" — sem sonda pra
    // parar (window.VOCAB já veio no prelúdio do /app.js, nada aqui faz poll).
    "glossario-overlay": function () {},
    "conversa-overlay": function () { pararPollConversa(); },
    // MODOS-TELA-25-50-100-001 (05/09): editor de layout — sem sonda pra parar (o estado
    // vive em window.__perfilAtivo, já em memória; nada aqui poll-a o servidor).
    "layout-overlay": function () {},
    // EGOS-APP-CONTA-E-VERSAO-001 f1 (06/09): gaveta "sobre" — sem poll. Achado do forja na f3:
    // nasceu sem entrada aqui e fecharGaveta("sobre-overlay") lançava (GAVETAS[id] undefined).
    "sobre-overlay": function () {},
    // EGOS-APP-GAVETA-MCP-001 (07/09): gaveta "MCP" — sem poll (a lista só troca em
    // /api/mcp e /api/mcp?medir=1, os dois só sob clique — nada roda em intervalo).
    "mcp-overlay": function () {},
    // EGOS-APP-GAVETA-WHATSAPP-001 (10/09): gaveta "WhatsApp" — sem poll (a lista só troca
    // em /api/whatsapp, carregada ao abrir; a medição ao vivo é outro clique).
    "whatsapp-overlay": function () {},
    // GMAIL-SO-LEITURA-001 (10/09): gaveta "E-mail" — sem poll (a lista só troca em
    // /api/email, carregada ao abrir; sem escrita nenhuma, é só leitura).
    "email-overlay": function () {},
    // AVISO-HUMANO-001 (09/09): gaveta dos avisos — sem poll próprio (o poll de
    // notificações, que já roda de 5 em 5s, redesenha quando ela está aberta).
    // NOTIFICACOES-HISTORICO-NA-TELA-001 (14/09, correção Prime): ganhou 2 abas novas
    // (Conversas/Sessões, dentro da MESMA gaveta — sem overlay novo, sem botão novo no
    // #header) com poll PRÓPRIO de 30s; para pela mesma porta ao fechar.
    // USO-TEMPO-REAL-MULTI-TENANT-001 (14/09): 4ª aba "Uso" ganhou poll PRÓPRIO de 5s
    // (mais frequente que o de Conversas) — para pela mesma porta ao fechar.
    "avisos-overlay": function () { if (window.__pararPollConversas) window.__pararPollConversas(); if (window.__pararPollUso) window.__pararPollUso(); },
    // APP-HISTORICO-E-TELEMETRIA-001 (13/09): gaveta "histórico" — poll de 30s SÓ enquanto
    // aberta (regra da casa, ver app-historico.js); fechar para o poll pela mesma porta.
    "historico-overlay": function () { if (window.__pararPollHistorico) window.__pararPollHistorico(); },
    // ROTEIRO-GRUPO-001 (14/09): gaveta "Roteiro" — sem poll (a lista só troca sob clique/
    // edição, carregada ao abrir via window.__ABRIDORES em app-roteiro.js).
    "roteiro-overlay": function () {},
  };
  // R-UI-010 v2 — FORMA SÓ POR ATO DO HUMANO (2º corte Enio 07/09, screencast 14:18: "vou
  // clicando e ele vai mudando a forma, não está estável"). A v1 (06/09) expandia a janela para
  // 50% ao abrir gaveta no 25% e devolvia 25% ao fechar — cada gaveta eram DUAS mudanças de
  // geometria, e o vídeo mostra a janela pulando 25→50→100→25 em 26 segundos. Agora a
  // geometria muda só em trocarModo() chamado por botão 25/50/100, Ctrl+1/2/3 ou menu da
  // bandeja — nunca por abrir/fechar/recarregar conteúdo. No 25% a gaveta abre onde está
  // (o botão 50% fica a um clique no cabeçalho); legibilidade é escolha dele, forma também.
  function fecharGaveta(id) {
    var ov = document.getElementById(id);
    if (ov && ov.classList.contains("aberto")) { ov.classList.remove("aberto"); GAVETAS[id](); }
  }
  // GAVETA-ABRE-CARREGADA-001 (corte Enio 09/09, print do sino: "notificações está mostrando
  // time em campo, não carrega, não mostra nada"). O defeito era de DESENHO, não do sino:
  // abrirGaveta() só trocava a classe CSS e quem buscava o dado era o handler do BOTÃO — logo
  // toda abertura que não vinha do botão original (sino, notificação, teclado) mostrava a
  // gaveta com o HTML inicial: "⚪ carregando…" para sempre e contadores em 0. Carregar vira
  // responsabilidade da GAVETA: cada módulo registra seu abridor aqui e abrirGaveta o chama.
  // Abridor que lança NÃO fica em silêncio (=R13): a falha aparece no <meta> da própria gaveta.
  window.__ABRIDORES = window.__ABRIDORES || {};
  function abrirGaveta(id) {
    Object.keys(GAVETAS).forEach(function (k) { if (k !== id) fecharGaveta(k); });
    document.getElementById(id).classList.add("aberto");
    var abridor = window.__ABRIDORES[id];
    if (typeof abridor !== "function") return;
    try {
      abridor();
    } catch (e) {
      var meta = document.querySelector("#" + id + " .gaveta-meta");
      if (meta) meta.textContent = "🔴 falha ao carregar esta gaveta: " + e;
    }
  }
  Object.keys(GAVETAS).forEach(function (id) {
    var ov = document.getElementById(id);
    if (ov) ov.addEventListener("click", function (e) { if (e.target === ov) fecharGaveta(id); });
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") Object.keys(GAVETAS).forEach(fecharGaveta);
  });

