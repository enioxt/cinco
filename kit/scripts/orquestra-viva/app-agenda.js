// app-agenda.js — AGENDA-PASSADO-OPACO-001 + AGENDA-HOJE-COM-CARGA-001 (corte Enio 10/09).
// Vem por ÚLTIMO na concatenação de /app.js: só USA (nunca declara) escaparHtml/horaLocal/
// abrirGaveta/fecharGaveta (app-nucleo.js) e o botão data-ag-* desenhado por tileItemAgenda
// (app-catalogo.js). "futuro — aviso" (fontes + dias) continua sendo desenhado por
// app-catalogo.js/renderAgenda — este arquivo só acrescenta passado + hoje + o clique de
// "mandar ao Claude" (delegado, cobre também os itens do futuro).
(function () {
  "use strict";

  // ── passado: opacidade cresce com o tempo (mais recente = mais opaco/sólido) ──────────
  function opacidadeDoDia(idx, total) {
    if (total <= 1) return 1;
    // idx 0 = mais antigo (a régua vem ordenada por data crescente do backend).
    const t = idx / (total - 1);
    return (0.25 + t * 0.75).toFixed(2);
  }

  function diaCurto(iso) {
    const d = new Date(`${iso}T12:00:00-03:00`);
    if (Number.isNaN(d.getTime())) return iso;
    const semana = d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", weekday: "short" }).replace(".", "");
    const dm = d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit" });
    return `${semana} ${dm}`;
  }

  // AGENDA-PASSADO-OPACO-001: "expandível com cliques, mais cliques mais detalhes" — <details>
  // aninhado, mesmo padrão de grupoDobravel (app-gavetas.js), mas 1 tira horizontal em vez de
  // lista vertical (o passado pede VARREDURA rápida, não leitura linha a linha).
  function tileDiaPassado(d, idx, total) {
    const op = opacidadeDoDia(idx, total);
    const amostra = (d.amostra || []).map((a) => `<li>${escaparHtml(a)}</li>`).join("") || "<li>⚪ sem amostra de mensagem</li>";
    return `<details class="ag-p-dia" style="opacity:${op}">
      <summary><span class="ag-p-data">${escaparHtml(diaCurto(d.data))}</span><span class="ag-p-num">${d.commits}</span></summary>
      <ul class="ag-p-amostra">${amostra}</ul>
    </details>`;
  }

  function renderPassado(passado) {
    const avisoEl = document.getElementById("agenda-passado-aviso");
    const tiraEl = document.getElementById("agenda-passado-tira");
    if (!tiraEl) return;
    if (passado.avisoGit) {
      if (avisoEl) { avisoEl.hidden = false; avisoEl.textContent = `⚪ NÃO-MEDIDO — ${passado.avisoGit}`; }
      tiraEl.innerHTML = "";
      return;
    }
    if (avisoEl) avisoEl.hidden = true;
    const dias = passado.dias || [];
    tiraEl.innerHTML = dias.length
      ? dias.map((d, idx) => tileDiaPassado(d, idx, dias.length)).join("")
      : `<div class="ag-p-dia" style="opacity:1">⚪ nenhum commit na janela — isto não é "não trabalhei", é a janela medida (ver meta acima)</div>`;
  }

  // ── hoje: carga + régua comparável (nunca dia-inteiro × dia-pela-metade) ──────────────
  const ROTULO_VEREDITO = {
    acima: "acima do seu normal",
    dentro: "dentro do seu normal",
    abaixo: "abaixo do seu normal",
    "sem-base": "⚪ sem dias anteriores suficientes para comparar",
  };
  const COR_VEREDITO = { acima: "var(--amarelo)", dentro: "var(--verde)", abaixo: "var(--texto-fraco)", "sem-base": "var(--texto-fraco)" };

  function renderHoje(hoje) {
    const el = document.getElementById("agenda-hoje-card");
    if (!el) return;
    const alerta = hoje.alertaDescanso && hoje.alertaDescanso.ativo
      ? `<div class="ag-h-alerta">⚠️ ${hoje.alertaDescanso.sequenciaDias} dias seguidos acima de 1,5× a mediana — considere descanso.</div>`
      : "";
    el.innerHTML = `
      <div class="ag-h-num">${hoje.commits}</div>
      <div class="ag-h-veredito" style="color:${COR_VEREDITO[hoje.veredito] || "inherit"}">${escaparHtml(ROTULO_VEREDITO[hoje.veredito] || hoje.veredito)}</div>
      <div class="ag-h-regua">régua: mediana de <b>${hoje.regua.medianaComparavel}</b> nos ${hoje.regua.diasBase} dias anteriores, contando <b>até a mesma hora de agora (${escaparHtml(hoje.horaAgora)})</b> — não o dia inteiro (mediana do dia inteiro: ${hoje.regua.medianaDiaInteiro}, mostrada só por referência).</div>
      <div class="ag-h-nota">Por quê: comparar um dia pela metade com dias inteiros diz "você fez pouco" toda manhã. Aqui os dias anteriores só contam até ${escaparHtml(hoje.horaAgora)} também — a comparação é justa.</div>
      ${alerta}`;
  }

  async function carregarAgendaCompleta() {
    try {
      const r = await fetch("/api/agenda/completa");
      const j = await r.json();
      renderPassado(j.passado || {});
      renderHoje(j.hoje || {});
    } catch (e) {
      const tiraEl = document.getElementById("agenda-passado-tira");
      const hojeEl = document.getElementById("agenda-hoje-card");
      if (tiraEl) tiraEl.textContent = `🔴 falha ao carregar passado/hoje: ${e}`;
      if (hojeEl) hojeEl.textContent = "🔴 falha ao carregar";
    }
  }

  // ── "acesso direto ao Claude" — delegado no container do futuro (#agenda-dias), cobre
  // todo item desenhado por app-catalogo.js sem precisar reatachar listener a cada render. ──
  async function mandarAoClaude(btn) {
    const titulo = btn.dataset.agTitulo || "";
    const quando = btn.dataset.agQuando || "";
    const local = btn.dataset.agLocal || "";
    if (!titulo) return;
    const original = btn.textContent;
    btn.disabled = true;
    btn.textContent = "enviando…";
    try {
      const r = await fetch("/api/agenda/mandar", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ titulo, quando, local, agente: "prime" }),
      });
      const j = await r.json();
      btn.textContent = j.ok ? `enviado ✓ (${j.correlatos || 0} correlato(s))` : `🔴 ${(j.erro || "falhou").slice(0, 40)}`;
    } catch (e) {
      btn.textContent = `🔴 ${e}`;
    }
    setTimeout(() => { btn.disabled = false; btn.textContent = original; }, 4000);
  }

  (function ligarMandar() {
    const diasEl = document.getElementById("agenda-dias");
    if (diasEl) {
      diasEl.addEventListener("click", (e) => {
        const btn = e.target.closest && e.target.closest(".ag-mandar");
        if (!btn) return;
        e.preventDefault();
        mandarAoClaude(btn);
      });
    }
  })();

  // agenda-overlay já tem um abridor (carregarAgenda, em app-catalogo.js — o futuro). Este
  // arquivo carrega DEPOIS: envolve o abridor existente para também trazer passado/hoje,
  // sem duplicar a chamada de /agenda (mesmo padrão de "vem por último, só usa" da casa.
  const abridorAnterior = window.__ABRIDORES && window.__ABRIDORES["agenda-overlay"];
  window.__ABRIDORES = window.__ABRIDORES || {};
  window.__ABRIDORES["agenda-overlay"] = function () {
    if (abridorAnterior) abridorAnterior();
    carregarAgendaCompleta();
  };
})();
