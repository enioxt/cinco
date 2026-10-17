#!/usr/bin/env bun
/**
 * gerar-cartoes.ts — lê kit/ferramentas.json (a ÚNICA fonte) e escreve
 *   kit/index.html  (cartões fechados que vão se abrindo, escuro, sem framework)
 *   kit/LEIA-ME.md  (o mesmo conteúdo em texto, para colar inteiro numa IA)
 * Os dois arquivos são GERADOS: nunca edite à mão, edite o JSON e rode de novo.
 *
 * Uso:   bun kit/gerar-cartoes.ts           escreve os dois arquivos
 *        bun kit/gerar-cartoes.ts --check   sai com 1 se algum estiver diferente do que seria gerado
 *        bun kit/gerar-cartoes.ts --fonte <json> --saida <pasta>   (testes)
 * Sem rede, sem dependência: só o bun.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";

const AQUI = import.meta.dir;
const args = process.argv.slice(2);
const opt = (n: string) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
const FONTE = opt("--fonte") ?? join(AQUI, "ferramentas.json");
const SAIDA = opt("--saida") ?? AQUI;
const CHECK = args.includes("--check");

type Medido = { rotulo: string; valor: string };
type Caso = { titulo: string; situacao: string; comando: string; acontece: string; saida?: string; prova: string };
type Caixa = { t: string; s: string };
type Imagem = { tipo: "fluxo" | "terminal"; alt: string; legenda: string; caixas?: Caixa[]; linhas?: string[] };
type Ferramenta = {
  id: string; nome: string; arquivos: string[]; testes: string[]; o_que_e: string; o_que_faz: string[];
  por_que: { texto: string; medido: Medido[] }; imagem: Imagem; casos: Caso[];
};
type Bloco = { t: "p" | "pre" | "quote"; x: string } | { t: "ul"; x: string[] } | { t: "arquivos" };
type Fonte = {
  repo: string; ramo: string; conector: string; pagina_conector: string; conversa: string;
  titulo: string; descricao: string; abertura: string[];
  por_que_estas_5: { titulo: string; texto: string[] };
  medicao: { data: string; como: string };
  ferramentas: Ferramenta[];
  secoes: { titulo: string; blocos: Bloco[] }[];
};

const F: Fonte = JSON.parse(readFileSync(FONTE, "utf-8"));

// ---------- validação: a fonte precisa estar completa, senão o gerador recusa ----------
function validar(): string[] {
  const e: string[] = [];
  for (const f of F.ferramentas) {
    const q = (c: string) => e.push(`${f.id}: falta ${c}`);
    if (!f.nome) q("nome"); if (!f.o_que_e) q("o_que_e");
    if ((f.o_que_faz ?? []).length !== 3) q("o_que_faz com exatamente 3 linhas");
    if (!f.por_que?.texto || !(f.por_que.medido ?? []).length) q("por_que (texto + medido)");
    if (!f.imagem?.alt) q("imagem.alt");
    if (f.imagem?.tipo === "fluxo" && !(f.imagem.caixas ?? []).length) q("imagem.caixas");
    if (f.imagem?.tipo === "terminal" && !(f.imagem.linhas ?? []).length) q("imagem.linhas");
    if ((f.casos ?? []).length < 3) q("pelo menos 3 casos de uso");
    for (const c of f.casos ?? []) for (const k of ["titulo", "situacao", "comando", "acontece", "prova"] as const)
      if (!c[k]) q(`caso "${c.titulo ?? "?"}" sem ${k}`);
  }
  return e;
}
const erros = validar();
if (erros.length) { console.error("ferramentas.json incompleto:\n - " + erros.join("\n - ")); process.exit(1); }

// ---------- utilidades ----------
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
/** Markdown mínimo: `código`, **negrito**, [texto](url). Escapa tudo antes. */
function inline(s: string): string {
  return esc(s)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>")
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, t, u) => {
      const externo = /^https?:/.test(u);
      return `<a href="${u}"${externo ? ' rel="noopener noreferrer"' : ""}>${t}</a>`;
    });
}
const corte = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + "…" : s);
const GH = `https://github.com/${F.repo}`;
const codigoUrl = (arq: string) => `${GH}/blob/${F.ramo}/kit/${arq}`;

/** Link "sugerir melhoria": abre uma issue já preenchida com o campo e o texto atual. */
function sugerirUrl(f: string, campo: string, atual: string): string {
  const titulo = `[kit/${f}] melhoria em: ${campo}`;
  const corpo = [
    `**Ferramenta:** ${f}`,
    `**Campo:** ${campo}`,
    `**Texto atual:**`,
    "",
    ...corte(atual, 700).split("\n").map((l) => "> " + l),
    "",
    "**O que mudaria (e por quê):**",
    "",
    "",
    "_Não ponha dado pessoal nem senha aqui: esta issue é pública._",
  ].join("\n");
  return `${GH}/issues/new?title=${encodeURIComponent(titulo)}&body=${encodeURIComponent(corpo)}`;
}
const sug = (f: string, campo: string, atual: string) =>
  `<a class="sug" href="${esc(sugerirUrl(f, campo, atual))}" rel="noopener noreferrer" aria-label="Sugerir melhoria: ${esc(campo)}">✎ sugerir melhoria</a>`;

function promptEgos(f: Ferramenta): string {
  return `Quero entender a ferramenta "${f.nome}" do kit do cinco (https://cinco.ia.br/kit/). ${f.o_que_e} O código está em ${codigoUrl(f.arquivos[0])}. Explique em linguagem simples, com um exemplo do meu dia a dia, se serve para o meu caso e o que eu precisaria instalar. Se você tiver o conector do EGOS (${F.conector}), use-o para me responder.`;
}

// ---------- imagens (SVG gerado a partir da fonte) ----------
const W = 496, H = 150;
function svg(im: Imagem): string {
  let corpo = "";
  if (im.tipo === "fluxo") {
    const cs = im.caixas!;
    const n = cs.length, gap = 26, bw = Math.floor((W - 24 - gap * (n - 1)) / n), y = 34, bh = 76;
    cs.forEach((c, i) => {
      const x = 12 + i * (bw + gap);
      corpo += `<rect x="${x}" y="${y}" width="${bw}" height="${bh}" rx="10" fill="#0f1620" stroke="#38d9f5" stroke-opacity=".55"/>`;
      corpo += `<text x="${x + bw / 2}" y="${y + 33}" text-anchor="middle" font-size="${n > 3 ? 13 : 14}" font-weight="700" fill="#e6edf3">${esc(c.t)}</text>`;
      corpo += `<text x="${x + bw / 2}" y="${y + 55}" text-anchor="middle" font-size="10.5" fill="#8b98a8">${esc(corte(c.s, n > 3 ? 18 : 24))}</text>`;
      if (i < n - 1) {
        const ax = x + bw + 4, ay = y + bh / 2;
        corpo += `<path d="M${ax} ${ay} h${gap - 12} m-5 -5 l5 5 l-5 5" fill="none" stroke="#38d9f5" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`;
      }
    });
    corpo += `<text x="12" y="${H - 16}" font-size="10.5" fill="#8b98a8">${esc(corte(im.legenda, 74))}</text>`;
  } else {
    corpo += `<rect x="8" y="8" width="${W - 16}" height="${H - 16}" rx="10" fill="#0a0e13" stroke="#38d9f5" stroke-opacity=".55"/>`;
    im.linhas!.slice(0, 7).forEach((l, i) => {
      const cor = i === 0 ? "#38d9f5" : "#c9d4df";
      corpo += `<text x="20" y="${30 + i * 17}" font-family="ui-monospace,Menlo,Consolas,monospace" font-size="10.5" fill="${cor}" xml:space="preserve">${esc(l)}</text>`;
    });
  }
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(im.alt)}" font-family="ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">${corpo}</svg>`;
}

// ---------- HTML ----------
function blocoHtml(b: Bloco): string {
  if (b.t === "p") return `<p>${inline(b.x)}</p>`;
  if (b.t === "pre") return `<pre tabindex="0"><code>${esc(b.x)}</code></pre>`;
  if (b.t === "quote") return `<blockquote><p>${inline(b.x)}</p></blockquote>`;
  if (b.t === "ul") return `<ul>${b.x.map((i) => `<li>${inline(i)}</li>`).join("")}</ul>`;
  const li = [`<li><a href="LEIA-ME.md">LEIA-ME.md</a> — este conteúdo em texto, feito para colar inteiro na sua IA</li>`];
  for (const f of F.ferramentas)
    li.push(`<li>${[...f.arquivos, ...f.testes].map((a) => `<a href="${esc(a)}">${esc(a)}</a>`).join(" · ")}</li>`);
  return `<ul>${li.join("")}</ul>`;
}

function cartao(f: Ferramenta): string {
  const campo = (nome: string, atual: string) => sug(f.id, nome, atual);
  const casos = f.casos.map((c, i) => `
      <details class="caso" name="casos-${f.id}">
        <summary><span class="n">${i + 1}</span>${esc(c.titulo)}</summary>
        <div class="caso-c">
          <div class="cp"><h5>Situação</h5><p>${inline(c.situacao)}</p>${campo(`caso ${i + 1} — situação`, c.situacao)}</div>
          <div class="cp"><h5>Comando</h5><pre tabindex="0"><code>${esc(c.comando)}</code></pre>${campo(`caso ${i + 1} — comando`, c.comando)}</div>
          <div class="cp"><h5>O que acontece</h5><p>${inline(c.acontece)}</p>${c.saida ? `<pre tabindex="0" class="saida"><code>${esc(c.saida)}</code></pre>` : ""}${campo(`caso ${i + 1} — o que acontece`, c.acontece)}</div>
          <div class="cp"><h5>Prova</h5><p>${inline(c.prova)}</p>${campo(`caso ${i + 1} — prova`, c.prova)}</div>
        </div>
      </details>`).join("");
  const medidos = f.por_que.medido.map((m) => `<li><span>${esc(m.rotulo)}</span><b>${inline(m.valor)}</b></li>`).join("");
  const codigo = f.arquivos.map((a) => `<a href="${esc(codigoUrl(a))}" rel="noopener noreferrer">${esc(a)}</a>`).join(" · ");
  const teste = f.testes.map((a) => `<a href="${esc(codigoUrl(a))}" rel="noopener noreferrer">${esc(a)}</a>`).join(" · ");
  const p = promptEgos(f);
  const q = encodeURIComponent(p);
  return `
  <details class="cartao" id="${f.id}">
    <summary>
      <div class="img">${svg(f.imagem)}</div>
      <div class="resumo"><h3>${esc(f.nome)}</h3><p>${inline(f.o_que_e)}</p><span class="abrir" aria-hidden="true">ver casos de uso</span></div>
    </summary>
    <div class="corpo">
      <div class="col">
        <section><h4>O que é</h4><p>${inline(f.o_que_e)}</p>${campo("o que é", f.o_que_e)}</section>
        <section><h4>O que faz</h4><ul>${f.o_que_faz.map((l) => `<li>${inline(l)}</li>`).join("")}</ul>${campo("o que faz", f.o_que_faz.join("\n"))}</section>
        <section><h4>Por que está no kit</h4><p>${inline(f.por_que.texto)}</p><ul class="medidos">${medidos}</ul><p class="nota">Medido em ${esc(F.medicao.data)}. ${esc(F.medicao.como)}</p>${campo("por que está no kit", f.por_que.texto)}</section>
        <section><h4>Imagem</h4><p class="nota">${esc(f.imagem.alt)} ${esc(f.imagem.legenda)}</p>${campo("imagem", f.imagem.alt + " " + f.imagem.legenda)}</section>
      </div>
      <div class="col">
        <section><h4>Casos de uso</h4><p class="nota">Abra um por vez.</p><div class="casos">${casos}</div></section>
        <section><h4>Código e testes</h4><p>${codigo}</p><p class="nota">Teste: ${teste}</p></section>
        <section class="egos"><h4>Pergunte ao EGOS</h4>
          <p>Quer saber mais, ou ver se serve para o seu caso? Leve a pergunta para a IA que você já usa:</p>
          <p class="botoes"><a class="bt" href="https://claude.ai/new?q=${q}" rel="noopener noreferrer">Perguntar no Claude</a><a class="bt" href="https://chatgpt.com/?q=${q}" rel="noopener noreferrer">Perguntar no ChatGPT</a><a class="bt" href="${esc(F.conversa)}">Conversar com o cinco</a></p>
          <details class="colar"><summary>ou copie o texto e cole na sua IA</summary><pre tabindex="0"><code>${esc(p)}</code></pre><button type="button" class="bt copiar">Copiar texto</button></details>
          <p class="nota">Com o conector do EGOS na sua IA (<a href="${esc(F.pagina_conector)}" rel="noopener noreferrer">como ligar</a>), ela responde com a base do EGOS. Endereço do conector: <code>${esc(F.conector)}</code></p>
        </section>
      </div>
    </div>
  </details>`;
}

const CSS = `
:root{color-scheme:dark;--bg:#0a0e13;--bg2:#0f1620;--tx:#e6edf3;--mut:#9aa7b6;--ci:#38d9f5;--linha:rgba(56,217,245,.28)}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{margin:0;background:var(--bg);color:var(--tx);font:16px/1.6 ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased}
a{color:var(--ci)}
a:hover{text-decoration-thickness:2px}
:focus-visible{outline:3px solid var(--ci);outline-offset:3px;border-radius:3px}
.wrap{max-width:1120px;margin:0 auto;padding-inline:clamp(16px,4vw,40px)}
header.topo{padding-block:22px;display:flex;flex-wrap:wrap;gap:8px 22px;align-items:center;border-bottom:1px solid var(--linha)}
header.topo a{font-weight:700;text-decoration:none;font-size:15px}
header.topo a:first-child{margin-right:auto}
h1{font-size:clamp(30px,5.2vw,58px);line-height:1.04;letter-spacing:-.02em;margin:.7em 0 .35em;font-weight:800}
h1 em{font-style:normal;color:var(--ci)}
h2{font-size:clamp(22px,3vw,32px);line-height:1.15;margin:0 0 12px;letter-spacing:-.01em}
.lede p{max-width:70ch;margin:0 0 12px;color:#cfd8e2}
.por-que{border-left:3px solid var(--ci);padding:4px 0 4px 16px;margin:26px 0}
.por-que p{max-width:70ch;margin:0 0 8px}
section.bloco{padding-block:30px;border-top:1px solid var(--linha)}
.grade{display:grid;gap:16px;grid-template-columns:repeat(auto-fill,minmax(min(100%,320px),1fr));margin-top:10px}
.cartao{background:var(--bg2);border:1px solid var(--linha);border-radius:14px;overflow:hidden}
.cartao[open]{grid-column:1/-1;border-color:var(--ci)}
.cartao>summary{list-style:none;cursor:pointer;display:flex;flex-direction:column}
.cartao>summary::-webkit-details-marker,.caso>summary::-webkit-details-marker,.colar>summary::-webkit-details-marker{display:none}
.cartao[open]>summary{border-bottom:1px solid var(--linha)}
.img svg{display:block;width:100%;height:auto;background:var(--bg)}
.resumo{padding:14px 18px 18px;position:relative}
.resumo h3{margin:0 0 4px;font-size:21px;font-weight:800;color:var(--ci);font-family:ui-monospace,Menlo,Consolas,monospace}
.resumo p{margin:0 0 10px;color:#cfd8e2}
.abrir{font-size:13px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--ci)}
.abrir::after{content:" +"}
.cartao[open] .abrir::after{content:" −"}
.cartao[open]>summary{flex-direction:row;flex-wrap:wrap}
.cartao[open] .img{flex:1 1 300px;max-width:520px}
.cartao[open] .resumo{flex:1 1 260px;align-self:center}
.corpo{display:grid;gap:8px 32px;grid-template-columns:repeat(auto-fit,minmax(min(100%,420px),1fr));padding:8px 18px 22px}
.col{min-width:0}
.corpo section{padding-block:14px;border-bottom:1px solid rgba(56,217,245,.14)}
.corpo section:last-child{border-bottom:0}
h4{margin:0 0 6px;font-size:13px;letter-spacing:.1em;text-transform:uppercase;color:var(--mut)}
h5{margin:0 0 2px;font-size:12px;letter-spacing:.09em;text-transform:uppercase;color:var(--ci)}
.corpo p,.corpo li{max-width:68ch}
.corpo ul{padding-left:20px;margin:0 0 8px}
.nota{font-size:14px;color:var(--mut);margin:6px 0}
.medidos{list-style:none;padding:0!important;display:grid;gap:6px;margin:10px 0 6px!important}
.medidos li{border:1px solid var(--linha);border-radius:8px;padding:8px 12px;display:flex;flex-direction:column}
.medidos span{font-size:13px;color:var(--mut)}
.medidos b{font-weight:700}
code{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:.9em;background:rgba(56,217,245,.1);border-radius:4px;padding:0 5px}
pre{margin:6px 0;padding:12px 14px;background:var(--bg);border:1px solid var(--linha);border-radius:8px;overflow-x:auto;font-size:13.5px;line-height:1.55}
pre code{background:none;padding:0}
pre.saida{border-style:dashed}
.casos{display:grid;gap:8px;grid-template-columns:minmax(0,1fr)}.caso,.cp{min-width:0}
.caso{border:1px solid var(--linha);border-radius:10px;background:var(--bg)}
.caso[open]{border-color:var(--ci)}
.caso>summary{cursor:pointer;list-style:none;padding:10px 14px;font-weight:700;display:flex;gap:10px;align-items:baseline}
.caso>summary .n{flex:none;width:24px;height:24px;border:1.5px solid var(--ci);border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:13px;color:var(--ci)}
.caso-c{padding:2px 14px 12px}
.cp{padding-block:8px;border-top:1px solid rgba(56,217,245,.12)}
.cp p{margin:0 0 4px}
.sug{display:inline-block;font-size:12.5px;color:var(--mut);text-decoration:none;border:1px solid transparent;border-radius:999px;padding:1px 8px;margin-top:2px}
.sug:hover,.sug:focus-visible{color:var(--ci);border-color:var(--linha)}
.botoes{display:flex;flex-wrap:wrap;gap:8px}
.bt{font:inherit;font-size:15px;font-weight:700;color:var(--bg);background:var(--ci);border:0;border-radius:999px;padding:8px 16px;text-decoration:none;cursor:pointer;display:inline-block}
.bt:hover{filter:brightness(1.1)}
button.copiar{margin-top:6px}
.colar{margin:10px 0}
.colar>summary{cursor:pointer;color:var(--ci);font-weight:700;font-size:15px}
.estaticas h2{margin-top:6px}
.estaticas p,.estaticas li{max-width:72ch}
.estaticas blockquote{margin:14px 0;padding:2px 0 2px 16px;border-left:4px solid var(--ci);color:#cfd8e2}
.estaticas ul{padding-left:22px}
.estaticas li{margin-bottom:6px}
footer.rodape{border-top:1px solid var(--linha);padding-block:24px 40px;color:var(--mut);font-size:15px}
.regra{font-weight:700;color:var(--tx)}
@media(max-width:600px){.corpo{padding-inline:14px}.resumo{padding-inline:14px}}
@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
`;

const JS = `(function(){document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('button.copiar');if(!b)return;var t=b.parentNode.querySelector('pre code');if(!t)return;var ok=function(){var o=b.textContent;b.textContent='Copiado';setTimeout(function(){b.textContent=o},1600)};try{navigator.clipboard.writeText(t.textContent).then(ok,function(){})}catch(x){}});
if(location.hash){var el=document.getElementById(location.hash.slice(1));if(el&&el.tagName==='DETAILS')el.open=true}})();`;

function gerarHtml(): string {
  const titulo = F.titulo;
  const secoes = F.secoes.map((s) => `
  <section class="bloco estaticas"><div class="wrap">
    <h2>${inline(s.titulo)}</h2>
    ${s.blocos.map(blocoHtml).join("\n    ")}
    ${sug("pagina", s.titulo, s.blocos.map((b) => (b.t === "arquivos" ? "" : Array.isArray(b.x) ? b.x.join("\n") : (b as any).x)).join("\n"))}
  </div></section>`).join("");
  return `<!doctype html>
<!-- GERADO por kit/gerar-cartoes.ts a partir de kit/ferramentas.json. Não edite à mão: edite o JSON e rode: bun kit/gerar-cartoes.ts -->
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="referrer" content="no-referrer">
<meta http-equiv="Content-Security-Policy" content="connect-src 'self'; base-uri 'none'; form-action 'self'">
<title>${esc(titulo)} — cinco.ia.br</title>
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<meta name="description" content="${esc(F.descricao)}">
<link rel="canonical" href="https://cinco.ia.br/kit/">
<meta property="og:title" content="${esc(titulo)} — cinco.ia.br">
<meta property="og:description" content="${esc(F.descricao)}">
<meta property="og:url" content="https://cinco.ia.br/kit/">
<meta property="og:type" content="website">
<meta property="og:locale" content="pt_BR">
<meta property="og:image" content="https://cinco.ia.br/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<style>${CSS}</style>
</head>
<body>
<div class="wrap">
  <header class="topo"><a href="/">← cinco.ia.br</a><a href="#ferramentas">As 5 ferramentas</a><a href="O-QUE-VOCE-PRECISA.html">O que você precisa</a><a href="LEIA-ME.md">LEIA-ME.md</a></header>
  <div class="lede">
    <h1>O kit: <em>ferramentas de verdade</em>, incompletas de propósito</h1>
    ${F.abertura.map((p) => `<p>${inline(p)}</p>`).join("\n    ")}
    ${sug("pagina", "texto de abertura", F.abertura.join("\n"))}
  </div>
  <div class="por-que" id="por-que">
    <h2>${esc(F.por_que_estas_5.titulo)}</h2>
    ${F.por_que_estas_5.texto.map((p) => `<p>${inline(p)}</p>`).join("\n    ")}
    ${sug("pagina", "por que estas 5", F.por_que_estas_5.texto.join("\n"))}
  </div>
  <h2 id="ferramentas">As 5 ferramentas</h2>
  <p class="nota">Clique num cartão para abrir. Dentro, os casos de uso se abrem um por vez.</p>
  <div class="grade">${F.ferramentas.map(cartao).join("\n")}
  </div>
</div>
${secoes}
<footer class="rodape"><div class="wrap">
  <p class="regra">A regra roda. A prova abre. Você decide.</p>
  <p>O mesmo texto, sem formatação: <a href="/kit/LEIA-ME.md">LEIA-ME.md</a>. Página gerada de <code>kit/ferramentas.json</code> por <code>kit/gerar-cartoes.ts</code>.</p>
</div></footer>
<script>${JS}</script>
</body>
</html>
`;
}

// ---------- Markdown ----------
function blocoMd(b: Bloco): string {
  if (b.t === "p") return b.x;
  if (b.t === "pre") return "```\n" + b.x + "\n```";
  if (b.t === "quote") return "> " + b.x;
  if (b.t === "ul") return b.x.map((i) => `- ${i}`).join("\n");
  const li = ["- [LEIA-ME.md](LEIA-ME.md) — este arquivo, feito para colar inteiro na sua IA"];
  for (const f of F.ferramentas) li.push("- " + [...f.arquivos, ...f.testes].map((a) => `[${a}](${a})`).join(" · "));
  return li.join("\n");
}
function gerarMd(): string {
  const o: string[] = [];
  o.push("<!-- GERADO por kit/gerar-cartoes.ts a partir de kit/ferramentas.json. Não edite à mão: edite o JSON e rode: bun kit/gerar-cartoes.ts -->");
  o.push(`# ${F.titulo}`);
  o.push(F.abertura.join("\n\n"));
  o.push("---");
  o.push(`## ${F.por_que_estas_5.titulo}\n\n${F.por_que_estas_5.texto.join("\n\n")}`);
  o.push("## O que cada ferramenta faz (1 frase cada)");
  o.push("| ferramenta | o que faz |\n| --- | --- |\n" + F.ferramentas.map((f) => `| ${f.arquivos.map((a) => "`" + a + "`").join(" + ")} | ${f.o_que_e} |`).join("\n"));
  o.push("## Os cartões");
  o.push(`*Medido em ${F.medicao.data}. ${F.medicao.como}*`);
  for (const f of F.ferramentas) {
    const s: string[] = [];
    s.push(`### ${f.nome}`);
    s.push(`**O que é.** ${f.o_que_e}`);
    s.push("**O que faz.**\n\n" + f.o_que_faz.map((l) => `- ${l}`).join("\n"));
    s.push(`**Por que está no kit.** ${f.por_que.texto}\n\n` + f.por_que.medido.map((m) => `- ${m.rotulo}: ${m.valor}`).join("\n"));
    s.push(`**Imagem (no site).** ${f.imagem.alt} ${f.imagem.legenda}` + (f.imagem.tipo === "terminal" ? "\n\n```\n" + f.imagem.linhas!.join("\n") + "\n```" : ""));
    s.push("**Casos de uso.**\n\n" + f.casos.map((c, i) =>
      `${i + 1}. **${c.titulo}**\n   - Situação: ${c.situacao}\n   - Comando:\n\n     \`\`\`\n${c.comando.split("\n").map((l) => "     " + l).join("\n")}\n     \`\`\`\n\n   - O que acontece: ${c.acontece}` +
      (c.saida ? `\n\n     \`\`\`\n${c.saida.split("\n").map((l) => "     " + l).join("\n")}\n     \`\`\`\n` : "") +
      `\n   - Prova: ${c.prova}`).join("\n\n"));
    s.push(`**Código.** ${f.arquivos.map((a) => `[${a}](${codigoUrl(a)})`).join(" · ")} · testes: ${f.testes.map((a) => `[${a}](${codigoUrl(a)})`).join(" · ")}`);
    s.push(`**Pergunte ao EGOS.** Cole na sua IA: ${promptEgos(f)}\n\nConector do EGOS: \`${F.conector}\` (como ligar: ${F.pagina_conector}).`);
    s.push(`**Sugerir melhoria.** Abra uma issue: ${GH}/issues/new?title=${encodeURIComponent(`[kit/${f.id}] melhoria`)}`);
    o.push(s.join("\n\n"));
  }
  for (const sc of F.secoes) o.push(`## ${sc.titulo}\n\n${sc.blocos.map(blocoMd).join("\n\n")}`);
  return o.join("\n\n") + "\n";
}

// ---------- saída ----------
const saidas: [string, string][] = [["index.html", gerarHtml()], ["LEIA-ME.md", gerarMd()]];
if (CHECK) {
  let dif = 0;
  for (const [nome, txt] of saidas) {
    let atual = "";
    try { atual = readFileSync(join(SAIDA, nome), "utf-8"); } catch {}
    if (atual !== txt) { console.error(`🔴 ${nome} está diferente do que seria gerado — rode: bun kit/gerar-cartoes.ts`); dif++; }
  }
  if (dif) process.exit(1);
  console.log("🟢 index.html e LEIA-ME.md iguais ao gerado");
} else {
  mkdirSync(SAIDA, { recursive: true });
  for (const [nome, txt] of saidas) { writeFileSync(join(SAIDA, nome), txt); console.log(`gerado: ${join(SAIDA, nome)} (${txt.length} bytes)`); }
}
