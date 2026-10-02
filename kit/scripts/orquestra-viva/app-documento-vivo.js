/* app-documento-vivo.js — DV-1-VISUALIZADOR-ESTADO-COMENTARIO-001 (fatia 1 do programa
   DOCUMENTO-VIVO-NO-APP-001). Abre o documento DENTRO do app (iframe same-origin,
   /api/documentos/ver), guarda estado editável (finalizado/critério/destino/status via
   /api/documentos/estado) e reusa POST /comando (já existente, mesmo padrão de
   app-agentes.js) para mandar um recorte/pedido ao Prime. Reusa escaparHtml/horaLocal/
   abrirGaveta/fecharGaveta, globais no mesmo escopo quando concatenado por /app.js —
   nunca redeclara. Vem depois de app-documentos.js: o botão "abrir" da lista passa a
   chamar abrirDocumentoVivo() (ver alteração no handler de lá) em vez do POST direto. */

  let dvItemAtual = null;
  let dvEstadoAtual = null;

  // 3 templates de leitura (DV-2 antecipada, ≤40 linhas por pedido explícito da task) —
  // troca o <style id="tpl"> dentro do iframe same-origin. Nunca toca no layout do app.
  const DV_TEMPLATES = {
    claro: "body{background:#f7f7f5;color:#111;} a{color:#0b62c9;}",
    escuro: "body{background:#0e0e0e;color:#e6e6e6;} a{color:#6db8ff;}",
    impressao: "body{background:#fff;color:#000;max-width:720px;margin:0 auto;font-size:12pt;line-height:1.5;}",
  };

  function dvIframeDoc() {
    const f = document.getElementById("dv-iframe");
    try {
      return f && f.contentDocument;
    } catch {
      return null; // silencio-ok: cross-origin (não deveria acontecer, /ver é same-origin) — sem template, sem quebrar
    }
  }

  function aplicarTemaDocumentoVivo(nome) {
    const doc = dvIframeDoc();
    if (!doc || !doc.head) return;
    let style = doc.getElementById("tpl");
    if (!style) {
      style = doc.createElement("style");
      style.id = "tpl";
      doc.head.appendChild(style);
    }
    style.textContent = DV_TEMPLATES[nome] || "";
    try {
      localStorage.setItem("dv-tema", nome);
    } catch {
      // silencio-ok: sem localStorage (modo privado) o tema só não persiste entre sessões
    }
    document.querySelectorAll("#dv-temas [data-dv-tema]").forEach((b) => {
      b.classList.toggle("ativo", b.dataset.dvTema === nome);
    });
  }

  function dvTemaSalvo() {
    try {
      return localStorage.getItem("dv-tema") || "claro";
    } catch {
      return "claro";
    }
  }

  // ── estado (finalizado/critério/destino/status) ────────────────────────────────────
  // DOC-OBSERVACAO-E-PROXIMA-ACAO-001 (corte Enio 10/09) — os dois campos novos são lidos
  // por id com guarda: se o campo ainda não estiver no HTML, vale "" em vez de estourar.
  // Formulário que quebra inteiro porque um input faltou levaria junto o estado que já
  // funcionava (=R13-a: nada quebra em silêncio, e nada quebra o vizinho).
  function dvValorCampo(id) {
    const el = document.getElementById(id);
    return el ? el.value : "";
  }
  function dvSetCampo(id, valor) {
    const el = document.getElementById(id);
    if (el) el.value = valor || "";
  }

  function dvAtualizarBotoes() {
    const finalizado = !!(dvEstadoAtual && dvEstadoAtual.finalizado);
    const copiar = document.getElementById("dv-copiar-caminho");
    const enviado = document.getElementById("dv-marcar-enviado");
    const confirmado = document.getElementById("dv-marcar-confirmado");
    if (copiar) copiar.disabled = !finalizado;
    if (enviado) enviado.disabled = !finalizado || dvEstadoAtual.status === "enviado";
    // "chegou" só existe depois de "saiu": confirmar recebimento de algo que nunca foi
    // enviado é o registro se contradizendo. E confirmado é ponto final — não se reconfirma.
    if (confirmado) {
      const st = dvEstadoAtual && dvEstadoAtual.status;
      confirmado.disabled = !(st === "enviado");
    }
  }

  function dvPreencherFormulario(estado) {
    dvEstadoAtual = estado;
    document.getElementById("dv-finalizado").checked = !!estado.finalizado;
    document.getElementById("dv-criterio").value = estado.criterio_aceite || "";
    document.getElementById("dv-destino").value = estado.destino || "";
    dvSetCampo("dv-observacao", estado.observacao);
    dvSetCampo("dv-proxima-acao", estado.proxima_acao);
    document.getElementById("dv-status-badge").textContent = estado.status || "rascunho";
    document.getElementById("dv-status-badge").className = `dv-badge dv-badge-${estado.status || "rascunho"}`;
    dvAtualizarBotoes();
  }

  async function dvCarregarEstado() {
    if (!dvItemAtual) return;
    try {
      const r = await fetch(`/api/documentos/estado?caminho=${encodeURIComponent(dvItemAtual.caminho)}`);
      dvPreencherFormulario(await r.json());
    } catch {
      dvPreencherFormulario({ finalizado: false, criterio_aceite: "", destino: "", status: "rascunho", observacao: "", proxima_acao: "" });
    }
  }

  async function dvSalvarEstado(statusForcado) {
    if (!dvItemAtual) return;
    const status = document.getElementById("dv-finalizado").checked
      ? (statusForcado || (dvEstadoAtual && dvEstadoAtual.status !== "rascunho" ? dvEstadoAtual.status : "pronto"))
      : "rascunho";
    const msgEl = document.getElementById("dv-estado-msg");
    msgEl.textContent = "⚪ salvando…";
    try {
      const r = await fetch("/api/documentos/estado", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          caminho: dvItemAtual.caminho,
          finalizado: document.getElementById("dv-finalizado").checked,
          criterio_aceite: document.getElementById("dv-criterio").value,
          destino: document.getElementById("dv-destino").value,
          observacao: dvValorCampo("dv-observacao"),
          proxima_acao: dvValorCampo("dv-proxima-acao"),
          status: statusForcado || status,
        }),
      });
      const j = await r.json();
      if (!r.ok) { msgEl.textContent = `🔴 ${j.erro || "não salvou"}`; return; }
      dvPreencherFormulario(j);
      msgEl.textContent = `🟢 salvo · ${horaLocal(j.atualizado_em)}`;
    } catch (e) {
      msgEl.textContent = `🔴 falha de rede: ${e}`;
    }
  }

  // ── abrir o documento dentro do app ─────────────────────────────────────────────────
  function abrirDocumentoVivo(item) {
    dvItemAtual = item;
    document.getElementById("dv-nome").textContent = item.nome;
    document.getElementById("dv-caminho-oculto").textContent = item.caminho;
    document.getElementById("dv-iframe").src = `/api/documentos/ver?caminho=${encodeURIComponent(item.caminho)}`;
    document.getElementById("dv-comentario").value = "";
    document.getElementById("dv-comentario-status").textContent = "";
    document.getElementById("dv-estado-msg").textContent = "";
    abrirGaveta("documento-vivo-overlay");
    dvCarregarEstado();
    document.getElementById("dv-iframe").addEventListener("load", () => aplicarTemaDocumentoVivo(dvTemaSalvo()), { once: true });
  }

  // ── comentário/recorte para o Prime (reusa POST /comando, mesmo padrão de app-agentes.js) ──
  async function dvEnviarComentario() {
    const ta = document.getElementById("dv-comentario");
    const texto = (ta.value || "").trim();
    const statusEl = document.getElementById("dv-comentario-status");
    if (!texto || !dvItemAtual) { statusEl.textContent = "🔴 escreva o pedido antes de enviar"; return; }
    let trecho = "";
    try {
      const win = document.getElementById("dv-iframe").contentWindow;
      trecho = win && win.getSelection ? win.getSelection().toString().trim() : "";
    } catch {
      trecho = ""; // silencio-ok: cross-origin bloquearia getSelection — /ver é same-origin, mas nunca lança
    }
    const corpo = `[documento-vivo] ${dvItemAtual.caminho}\n` + (trecho ? `trecho: "${trecho}"\n` : "") + `mensagem: ${texto}`;
    statusEl.textContent = "⚪ enviando…";
    try {
      const r = await fetch("/comando", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ acao: "mensagem", agente: "prime", titulo: `documento-vivo: ${dvItemAtual.nome}`.slice(0, 120), corpo }),
      });
      const j = await r.json();
      if (!j.ok) { statusEl.textContent = `🔴 ${j.erro || "não enviou"}`; return; }
      statusEl.textContent = `🟢 na fila do prime, ${horaLocal(new Date().toISOString())}`;
      ta.value = "";
    } catch (e) {
      statusEl.textContent = `🔴 falha de rede: ${e}`;
    }
  }

  async function dvAbrirFora() {
    if (!dvItemAtual) return;
    const btn = document.getElementById("dv-abrir-fora");
    const original = btn.textContent;
    btn.textContent = "abrindo…";
    btn.disabled = true;
    try {
      const r = await fetch("/api/documentos/abrir", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ caminho: dvItemAtual.caminho }),
      });
      const j = await r.json();
      btn.textContent = j.ok ? "aberto ✓" : `🔴 ${(j.erro || "falhou").slice(0, 30)}`;
    } catch (e) {
      btn.textContent = `🔴 ${e}`;
    }
    setTimeout(() => { btn.disabled = false; btn.textContent = original; }, 3000);
  }

  function dvCopiarCaminho() {
    if (!dvItemAtual) return;
    navigator.clipboard.writeText(dvItemAtual.caminho).catch(() => {});
  }

  function inicializarDocumentoVivo() {
    const fechar = document.getElementById("dv-fechar");
    if (fechar) fechar.addEventListener("click", () => fecharGaveta("documento-vivo-overlay"));
    const salvar = document.getElementById("dv-salvar-estado");
    if (salvar) salvar.addEventListener("click", () => dvSalvarEstado());
    const enviadoBtn = document.getElementById("dv-marcar-enviado");
    if (enviadoBtn) enviadoBtn.addEventListener("click", () => dvSalvarEstado("enviado"));
    // "chegou" (confirmado) é ATO DO HUMANO, nunca inferido: ninguém aqui consegue saber
    // que o outro lado leu. O botão registra o que o Enio viu acontecer, e é por isso que
    // ele existe separado de "saiu daqui" — mandar não é ser lido.
    const confirmadoBtn = document.getElementById("dv-marcar-confirmado");
    if (confirmadoBtn) confirmadoBtn.addEventListener("click", () => dvSalvarEstado("confirmado"));
    const copiar = document.getElementById("dv-copiar-caminho");
    if (copiar) copiar.addEventListener("click", dvCopiarCaminho);
    const abrirFora = document.getElementById("dv-abrir-fora");
    if (abrirFora) abrirFora.addEventListener("click", dvAbrirFora);
    const enviarComentario = document.getElementById("dv-comentario-enviar");
    if (enviarComentario) enviarComentario.addEventListener("click", dvEnviarComentario);
    document.querySelectorAll("#dv-temas [data-dv-tema]").forEach((b) => {
      b.addEventListener("click", () => aplicarTemaDocumentoVivo(b.dataset.dvTema));
    });
  }

  document.addEventListener("DOMContentLoaded", inicializarDocumentoVivo);
