// app-prioridades.js — cartão "Prioridades de hoje" (decisão do dono). Autocontido: só lê /prioridades-hoje.
// O servidor decide ok/⚪ (lerParaApp em prioridades-do-dia.ts): lista de outro dia nunca vira "de hoje".
(function () {
  "use strict";
  const card = document.getElementById("mod-prioridades");
  const corpo = document.getElementById("mod-prioridades-lista");
  if (!card || !corpo) return;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  async function carregar() {
    try {
      const j = await (await fetch("/prioridades-hoje")).json();
      if (j.estado !== "ok") { corpo.innerHTML = `<div class="mod-linha"><span>${esc(j.motivo || "⚪ não medido")}</span></div>`; return; }
      corpo.innerHTML = j.top3.length
        ? j.top3.map((i, n) => `<div class="mod-linha"><span>${n + 1}) ${i.tipo === "decisao" ? "decidir: " : ""}${esc(i.titulo_curto)} <small>— ${esc(i.por_que)}</small></span></div>`).join("")
        : `<div class="mod-linha"><span>🟢 nada aberto como prioridade máxima</span></div>`;
    } catch (e) {
      corpo.innerHTML = `<div class="mod-linha"><span>⚪ não consegui ler a lista de hoje</span></div>`;
    }
  }
  carregar();
  setInterval(carregar, 300000);
})();
