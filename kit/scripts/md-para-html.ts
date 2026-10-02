#!/usr/bin/env bun
/**
 * md-para-html.ts — MOTOR de par humano: `.md` → `.html` autocontido.
 *
 * ═══ POR QUE ESTE MOTOR EXISTE (corte Enio 2026-08-27) ═══
 * "não devemos ficar convertendo .md em html usando LLM, tokens; devemos ter um
 *  fluxo pra isso, mais barato, com o mesmo processo, características."
 *
 * O buraco medido: `scripts/human-doc-html-check.ts` CHECA o par desde 2026-06-16
 * (R-DOC-AUDIENCE-001) e NUNCA existiu quem GERASSE. Resultado: toda conversão
 * caía num agente escrevendo HTML à mão — caro, lento e não-reproduzível (dois
 * agentes, dois HTMLs diferentes do mesmo .md).
 *
 * TAXONOMIA (docs/governance/TAXONOMIA_EXECUCAO.md): "o erro se vê lendo a saída?"
 * Conversão de markdown é MECÂNICA e verificável → MOTOR determinístico com golden,
 * nunca skill. O LLM segue dono do TEXTO; a FORMA é do motor.
 *
 * ═══ CARACTERÍSTICAS PRESERVADAS (ADOPT, não invenção) ═══
 * A casa de estilo em `templates/human-doc/casa.css` foi EXTRAÍDA dos 4 HTMLs
 * aprovados pelo Enio em 2026-08-27 (`5bdc1780`) — mesmas variáveis, mesmo dark
 * mode, mesma tipografia. Zero referência externa (CSP-safe, abre offline).
 *
 * Uso:
 *   bun scripts/md-para-html.ts <arquivo.md> [--saida <arquivo.html>]
 *   bun scripts/md-para-html.ts <arquivo.md> --check    # par existe e está fresco?
 *   bun scripts/md-para-html.ts --golden                # auto-teste
 *
 * O `--check` implementa GATE-FRESCOR-001 (R14-k): HTML mais velho que o .md é
 * artefato morto que abre igual a artefato vivo.
 *
 * `--externo "<marca>"` (MARCA-DE-QUEM-LE-001, R-ENTREGA-PURA-001): peça para
 * FORA da casa (ex.: repositório de terceiro) troca "EGOS" do cabeçalho pela
 * marca dada (sem texto → sem logo) e o rodapé vira só "Gerado em <data>", sem
 * nome de arquivo nem "scripts/md-para-html.ts". Não pula gate nenhum — os
 * audits (link quebrado, pureza R17-a, prova circular, voz humana) continuam
 * rodando sobre o `.md`, que a flag não toca. Sem a flag, saída byte-idêntica.
 */
import { readFileSync, writeFileSync, existsSync, statSync, mkdtempSync, utimesSync, appendFileSync, mkdirSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { tmpdir, homedir } from "node:os";
import { carregarOpcional } from "./orquestra-viva/opcional";

// O motor de voz (VOZ-HUMANA-001) não viaja no kit público, e este arquivo é importado pelo
// servidor do app (renderCorpo) — import estático dele derrubava o app na máquina de quem baixa.
// Ausente: a geração segue, mas a ausência do gate é DITA no stderr (=R13-d: gate que não roda
// não pode parecer gate que passou).
const vozCheck = await carregarOpcional(() => import("./voz-humana-check.ts"), "./voz-humana-check.ts");
const RELATORIO_VOZ_AUSENTE = { reprova: false, achados: [] as { sinal: string; detalhe: string; reprova: boolean }[] };
function analisaVoz(md: string, arquivo?: string) {
  return vozCheck ? vozCheck.analisa(md, arquivo) : RELATORIO_VOZ_AUSENTE;
}

const RAIZ = join(import.meta.dir, "..");
const CSS = join(RAIZ, "templates/human-doc/casa.css");

/**
 * Ledger append-only dos escapes do VOZ-HUMANA-001 (RASTRO-DO-QUE-SAIU-001).
 * Resolve NA HORA da chamada, não no import — senão o golden não consegue apontar
 * para um destino descartável e acabaria testando um JSON escrito à mão (=golden que
 * não exercita o motor, defeito nº1 da casa).
 */
export function destinoEscapes(): string {
  return process.env.EGOS_VOZ_ESCAPES ?? join(homedir(), ".egos", "voz-humana-escapes.jsonl");
}

/**
 * Grava o escape. Falha de gravação NÃO barra a geração — mas é DITA, porque
 * "não consegui registrar" e "não houve escape" não podem virar a mesma ausência (R13-c).
 */
export function registrarEscapeVoz(
  arquivo: string,
  motivo: string,
  r: { achados: { sinal: string; reprova: boolean }[]; reprova: boolean },
): void {
  const linha = JSON.stringify({
    ts: new Date().toISOString(),
    regra: "VOZ-HUMANA-001",
    arquivo,
    motivo: motivo.slice(0, 300),
    reprovava: r.reprova,
    sinais: r.achados.filter((a) => a.reprova).map((a) => a.sinal),
  });
  const destino = destinoEscapes();
  try {
    mkdirSync(dirname(destino), { recursive: true });
    appendFileSync(destino, linha + "\n", "utf8");
  } catch (e: any) {
    console.error(`⚪ VOZ-HUMANA-001: escape NÃO registrado em ${destino} (${e?.message ?? e}) — a peça saiu, o rastro não`);
  }
}

// ───────────────────────── markdown → html (subconjunto declarado) ──────────
// Cobre o que a casa de fato usa. O que NÃO cobre sai como parágrafo literal —
// degradar visível é melhor que renderizar errado em silêncio (=R13).
function escapa(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function inline(s: string): string {
  let t = escapa(s);
  // ordem importa: código antes de tudo (protege o conteúdo dentro dele)
  const codigos: string[] = [];
  t = t.replace(/`([^`]+)`/g, (_m, c) => {
    codigos.push(c);
    return `\u0000CODE${codigos.length - 1}\u0000`;
  });
  t = t.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  t = t.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, "$1<em>$2</em>");
  t = t.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  t = t.replace(/\u0000CODE(\d+)\u0000/g, (_m, i) => `<code>${codigos[Number(i)]}</code>`);
  return t;
}

type Bloco = { tipo: string; html: string; recolhido?: boolean };
export type Secao = { id: string; texto: string; nivel: number };

/**
 * TETO_NAV — a barra lateral tem teto para não virar parede de texto. O teto é
 * necessário; o que estava errado era QUEM ele cortava.
 *
 * Fato gerador (2026-08-28): o corte era `slice(0, 14)` — as 14 PRIMEIRAS, na
 * ordem do documento. Numa peça de 15 seções entregue a um parceiro, a que ficou
 * de fora foi a última: "O que não medimos". Justamente a seção que a casa exige
 * em toda entrega, invisível para quem navega pelo índice.
 *
 * Regra nova: seção de primeiro nível (`##`) NUNCA cede lugar. Quem cede é a
 * subseção (`###`), e ela cede da última para a primeira. Se ainda assim não
 * couber, o que sai é dito no rodapé da barra, nunca some calado.
 */
export const TETO_NAV = 14;

export function selecionaNav(secoes: readonly Secao[], teto = TETO_NAV): { nav: Secao[]; omitidas: number } {
  if (secoes.length <= teto) return { nav: [...secoes], omitidas: 0 };
  const principais = secoes.filter((s) => s.nivel <= 2);
  // Espinha primeiro; o resto preenche o que sobrar, na ordem do documento.
  const resto = secoes.filter((s) => s.nivel > 2);
  const vagas = Math.max(0, teto - principais.length);
  const escolhidas = new Set([...principais, ...resto.slice(0, vagas)]);
  const nav = secoes.filter((s) => escolhidas.has(s));
  return { nav, omitidas: secoes.length - nav.length };
}

/**
 * TETO_SLUG — o id da seção (âncora `#s1-...`) tem limite de tamanho; o corte cru
 * (`slice`) partia PALAVRA ao meio quando o limite caía no meio de um token
 * (achado 2026-09-25, revisão do gerador para peça externa). Se o próximo
 * caractere original ainda é alfanumérico, o corte não caiu numa fronteira — volta
 * para o último hífen completo dentro do limite. Sem hífen algum (uma palavra só
 * maior que o limite), não há fronteira para voltar; mantém o corte cru (não há
 * âncora vazia como alternativa). Também tira o hífen que sobra quando o corte cai
 * EXATAMENTE na fronteira (o `.replace(/^-|-$/g,...)` de origem só limpa a ponta do
 * texto INTEIRO, não a ponta do texto já cortado).
 */
export function cortaSlugNaPalavra(s: string, limite: number): string {
  if (s.length <= limite) return s;
  const cortado = s.slice(0, limite);
  const proximo = s[limite];
  if (proximo && proximo !== "-") {
    const iHifen = cortado.lastIndexOf("-");
    if (iHifen > 0) return cortado.slice(0, iHifen);
  }
  return cortado.replace(/-$/, "");
}

/**
 * SECAO-RECOLHIDA-001 (corte Enio 2026-09-26, R-HTML-010 celular — investigador lê a
 * pergunta primeiro, a história/números/anexos recolhidos): agrupa a seção marcada por
 * `<!-- recolher -->` (o `## ` que a sucede, mais os `###`/`####` de dentro) num único
 * `<details class="recolhido" id="<id do h2>">`. PURA — recebe os blocos já renderizados,
 * devolve outro array. Sem nenhum h2 com `recolhido: true`, o loop só reempilha cada bloco
 * sem tocar — é o que sustenta a exigência de byte-identidade sem marcador (g-recolher-byte).
 */
export function aplicaRecolhidos(blocos: readonly Bloco[]): Bloco[] {
  const saida: Bloco[] = [];
  let i = 0;
  while (i < blocos.length) {
    const b = blocos[i];
    if (b.tipo === "h2" && b.recolhido) {
      const id = b.html.match(/id="([^"]+)"/)?.[1] ?? "";
      const tituloHtml = b.html.match(/<h2[^>]*>([\s\S]*)<\/h2>/)?.[1] ?? "";
      const grupo: Bloco[] = [];
      let j = i + 1;
      while (j < blocos.length && blocos[j].tipo !== "h1" && blocos[j].tipo !== "h2") {
        grupo.push(blocos[j]);
        j++;
      }
      const corpo = grupo.map((x) => x.html).join("\n        ");
      saida.push({
        tipo: "details",
        html: `<details class="recolhido" id="${id}"><summary>` +
          `<span class="recolhido-seta" aria-hidden="true"></span>` +
          `<h2>${tituloHtml}</h2>` +
          `<span class="recolhido-dica">toque para abrir</span>` +
          `</summary>\n        ${corpo}\n      </details>`,
      });
      i = j;
      continue;
    }
    saida.push(b);
    i++;
  }
  return saida;
}

export function renderCorpo(md: string): { blocos: Bloco[]; titulo: string; secoes: Secao[] } {
  // RECOLHER-SOBREVIVE-A-LIMPEZA-001 (corte Enio 2026-09-26): `<!-- recolher -->` precisa ser
  // extraído ANTES da remoção geral de comentários HTML abaixo — senão cai na mesma vala do
  // `<!-- Molde: ... -->` (COMENTARIO-NAO-E-AFIRMACAO-001) e nunca chega ao parser de blocos.
  // A sentinela não contém "\n": a contagem de linhas do restante do arquivo não se altera.
  const SENTINEL_RECOLHER = "\u0000RECOLHER\u0000";
  const mdComSentinela = md.replace(/^[ \t]*<!-- recolher -->[ \t]*$/gm, SENTINEL_RECOLHER);
  // COMENTARIO-NAO-E-AFIRMACAO-001 (2026-09-08): comentário HTML no .md é anotação de
  // máquina (ex.: `<!-- Molde: ... -->` do GATE-MOLDE-001) e NÃO chega ao leitor. Antes
  // o renderizador escapava e imprimia como <p> visível — medido: a peça do Alexandre
  // saiu com "&lt;!-- Molde: docs/governance/... --&gt;" na tela. Remove-se preservando as
  // quebras de linha para o número de linha dos achados de pureza continuar certo.
  const linhas = mdComSentinela.replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, "")).split("\n");
  const blocos: Bloco[] = [];
  const secoes: Secao[] = [];
  let titulo = "";
  let i = 0;
  let nSec = 0;
  let nCopiar = 0;
  let recolherPendente = false;

  const slug = (s: string) =>
    "s" + (++nSec) + "-" + cortaSlugNaPalavra(
      s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      40,
    );

  while (i < linhas.length) {
    const l = linhas[i];

    // SECAO-RECOLHIDA-001: a linha do marcador nunca aparece na saída. Só arma a seção
    // seguinte quando a linha IMEDIATAMENTE seguinte é um `## ` — nenhuma linha em branco
    // no meio, nenhum outro tipo de linha; "imediatamente" é literal, não "em algum lugar
    // adiante". Fora dessa condição, a linha só desaparece — o mesmo que qualquer outro
    // comentário — sem marcar nada.
    if (l === SENTINEL_RECOLHER) {
      recolherPendente = /^##\s+/.test(linhas[i + 1] ?? "");
      i++;
      continue;
    }

    if (/^\s*$/.test(l)) { i++; continue; }

    // fence de código — info-string "copiar" (BLOCO-COPIAVEL-001, corte Enio 2026-09-26)
    // reaproveita a classe/JS `.btn-copiar` que já existe para `--colar` (id próprio por
    // bloco: cp-1, cp-2...). Qualquer outra info-string (ou nenhuma) continua como antes.
    const fence = l.match(/^```(\S*)/);
    if (fence) {
      const buf: string[] = [];
      i++;
      while (i < linhas.length && !/^```/.test(linhas[i])) buf.push(linhas[i++]);
      i++;
      const conteudo = escapa(buf.join("\n"));
      if (fence[1] === "copiar") {
        const idCp = `cp-${++nCopiar}`;
        blocos.push({
          tipo: "pre-copiar",
          html: `<button class="btn-copiar" type="button" data-alvo="${idCp}">Copiar</button>\n        <pre id="${idCp}" class="bloco-cod">${conteudo}</pre>`,
        });
      } else {
        blocos.push({ tipo: "pre", html: `<pre class="bloco-cod">${conteudo}</pre>` });
      }
      continue;
    }

    // heading
    const h = l.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      const nivel = h[1].length;
      const texto = h[2].trim();
      const marcadoRecolher = recolherPendente;
      recolherPendente = false;
      if (nivel === 1 && !titulo) { titulo = texto.replace(/[*`]/g, ""); blocos.push({ tipo: "h1", html: `<h1>${inline(texto)}</h1>` }); i++; continue; }
      const id = slug(texto);
      secoes.push({ id, texto: texto.replace(/[*`]/g, "").slice(0, 60), nivel });
      blocos.push({
        tipo: "h" + nivel,
        html: `<h${Math.min(nivel, 3)} id="${id}">${inline(texto)}</h${Math.min(nivel, 3)}>`,
        recolhido: nivel === 2 && marcadoRecolher,
      });
      i++; continue;
    }

    // hr
    if (/^---+\s*$/.test(l)) { blocos.push({ tipo: "hr", html: '<div class="section-divider"></div>' }); i++; continue; }

    // blockquote (vira callout — é assim que a casa usa `>`)
    if (/^>\s?/.test(l)) {
      const buf: string[] = [];
      while (i < linhas.length && /^>\s?/.test(linhas[i])) buf.push(linhas[i++].replace(/^>\s?/, ""));
      const p = buf.join("\n").split(/\n\s*\n/).map((x) => `<p>${inline(x.replace(/\n/g, " ").trim())}</p>`).join("");
      blocos.push({ tipo: "callout", html: `<div class="callout">${p}</div>` });
      continue;
    }

    // tabela
    if (/^\|/.test(l) && i + 1 < linhas.length && /^\|[\s|:-]+\|?\s*$/.test(linhas[i + 1])) {
      const cels = (r: string) => r.replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
      const cab = cels(l);
      i += 2;
      const corpo: string[][] = [];
      while (i < linhas.length && /^\|/.test(linhas[i])) corpo.push(cels(linhas[i++]));
      const th = cab.map((c) => `<th>${inline(c)}</th>`).join("");
      const tr = corpo.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`).join("");
      blocos.push({ tipo: "tabela", html: `<div class="tabela-wrap"><table><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table></div>` });
      continue;
    }

    // lista (ul/ol), com continuação indentada
    const itemUl = /^\s*[-*+]\s+(.*)$/;
    const itemOl = /^\s*\d+[.)]\s+(.*)$/;
    if (itemUl.test(l) || itemOl.test(l)) {
      const ordenada = itemOl.test(l);
      const itens: string[] = [];
      while (i < linhas.length) {
        const m = linhas[i].match(ordenada ? itemOl : itemUl);
        if (m) { itens.push(m[1]); i++; }
        else if (/^\s{2,}\S/.test(linhas[i]) && itens.length) { itens[itens.length - 1] += " " + linhas[i].trim(); i++; }
        else break;
      }
      const tag = ordenada ? "ol" : "ul";
      blocos.push({ tipo: "lista", html: `<${tag}>${itens.map((x) => `<li>${inline(x)}</li>`).join("")}</${tag}>` });
      continue;
    }

    // mídia (MIDIA-NO-PAR-001, corte Enio 2026-09-04 "anexe os resultados, os vídeos no html"):
    // linha só com `![legenda](arquivo)` vira <figure>; .mp4/.webm vira <video controls>,
    // o resto <img>. Caminho relativo ao .html — a pasta viaja junto com a peça.
    const fig = l.match(/^!\[([^\]]*)\]\((\S+?)\)\s*$/);
    if (fig) {
      const [, alt, src] = fig;
      const video = /\.(mp4|webm)$/i.test(src);
      const attr = (x: string) => escapa(x).replace(/"/g, "&quot;");
      const el = video
        ? `<video controls preload="metadata" src="${attr(src)}"></video>`
        : `<img src="${attr(src)}" alt="${attr(alt)}">`;
      blocos.push({ tipo: "figura", html: `<figure class="midia">${el}${alt ? `<figcaption>${inline(alt)}</figcaption>` : ""}</figure>` });
      i++; continue;
    }

    // parágrafo (junta linhas até vazia — o .md quebra em ~78 col, o HTML flui)
    // SENTINELA-E-FRONTEIRA-001 (achado real, corte Enio 2026-09-26, doc de 13 mil
    // palavras): sem o `&& linhas[i] !== SENTINEL_RECOLHER` abaixo, um `<!-- recolher -->`
    // colado a um parágrafo (sem linha em branco antes) era ENGOLIDO como texto do
    // parágrafo — os 2 bytes NUL vazavam pro HTML final e a seção seguinte nunca era
    // marcada, porque quem consome a sentinela corretamente é o topo do loop, nunca este.
    const buf: string[] = [];
    while (i < linhas.length && !/^\s*$/.test(linhas[i]) && linhas[i] !== SENTINEL_RECOLHER
           && !/^(#{1,4}\s|>|\||```|---+\s*$|!\[)/.test(linhas[i])
           && !itemUl.test(linhas[i]) && !itemOl.test(linhas[i])) buf.push(linhas[i++]);
    if (!buf.length) continue;
    const texto = buf.join(" ");

    // CONVENÇÃO DA CASA: parágrafo que abre com "**N. Título.**" vira cartão numerado
    // (é o formato dos 4 HTMLs aprovados em 5bdc1780 — preservado aqui para que o
    // motor produza a MESMA peça que a mão produzia, sem gastar token).
    const cartao = texto.match(/^\*\*(\d+)\.\s+([^*]+?)\*\*\s*(.*)$/s);
    if (cartao) {
      blocos.push({
        tipo: "cartao",
        html: `<div class="qa-item"><div class="qa-head"><span class="qa-num">${cartao[1]}</span>` +
              `<span class="qa-title">${inline(cartao[2].trim())}</span></div>` +
              `<div class="qa-body">${inline(cartao[3].trim())}</div></div>`,
      });
      continue;
    }
    blocos.push({ tipo: "p", html: `<p>${inline(texto)}</p>` });
  }
  // REDE-DE-SEGURANCA-SENTINELA-001 (mesmo corte 2026-09-26): a fronteira do parágrafo
  // acima conserta o caminho REAL medido, mas a substituição da sentinela roda sobre o
  // texto CRU do documento inteiro — se `<!-- recolher -->` aparecer dentro de um fence
  // de código (alguém documentando o próprio marcador num exemplo), o laço do fence
  // engole qualquer linha até o próximo ``` sem saber da sentinela. Em vez de caçar
  // caminho por caminho, a garantia final e incondicional: NENHUM bloco sai com a
  // sentinela dentro — se sobrou, é lixo de um caminho não previsto, e some aqui.
  const blocosSemSentinela = aplicaRecolhidos(blocos).map((b) =>
    b.html.indexOf(SENTINEL_RECOLHER) === -1 ? b : { ...b, html: b.html.split(SENTINEL_RECOLHER).join("") },
  );
  return { blocos: blocosSemSentinela, titulo: titulo || basename("documento"), secoes };
}

// ───────────────────────── texto puro para colar (WhatsApp/e-mail) ──────────
// **negrito** do markdown vira *negrito* do WhatsApp; parágrafo flui numa linha.
export function textoParaColar(md: string): string {
  const corpo = md.replace(/^#.*$/gm, "").replace(/^>.*$/gm, "");
  const paras = corpo.split(/\n\s*\n/);
  return paras
    .map((p) => p.split("\n").map((x) => x.trimEnd()).join(" ").trim())
    .filter(Boolean)
    .map((p) => p.replace(/\*\*([^*]+)\*\*/g, "*$1*").replace(/`([^`]+)`/g, "$1"))
    .join("\n\n");
}

// ── R-ENTREGA-PURA-001 (corte Enio 2026-08-27) ──────────────────────────────
// "esses documentos devem vir já no formato que temos que enviar, sempre, a não
//  ser que eu peça — aí conversamos aqui primeiro."
// Peça de destino externo NÃO carrega instrução interna. O risco não é feiúra:
// é ENVIAR o que não devia ir. Medido no par do Hélio: cabeçalho com hash de HITL,
// número de PCA, SHA de commit e uma seção inteira de "notas internas" dentro do
// documento que seria colado no WhatsApp de um parceiro.
export const MARCADORES_INTERNOS: [RegExp, string][] = [
  [/\bHITL\b/i, "referência a HITL"],
  [/\bPCA-\d+/i, "número de PCA"],
  [/\bSSOT\b/, "referência a SSOT"],
  [/\bRASCUNHO\b/i, "marca de rascunho"],
  [/\[DECIS[ÃA]O ENIO/i, "marcador de decisão pendente"],
  [/\bato do Enio\b/i, "instrução de fluxo interno"],
  [/notas? internas?/i, "seção de notas internas"],
  [/\b[0-9a-f]{7,40}\b(?=[\s`)])/, "hash de commit/registro"],
  [/_SSOT\.md|EGOS_[A-Z_]+\.md|AGENTS\.md|CLAUDE\.md/, "caminho de arquivo interno"],
  [/corte Enio|corte do Enio/i, "referência a corte interno"],
];
/**
 * LINK-QUEBRA-CALADO-001 (medido 2026-09-10, achado pelo Enio olhando a tela).
 *
 * URL com parêntese não-escapado dentro de `[texto](url)` fecha o link do Markdown ANTES da
 * hora. O renderizador não erra — ele obedece — e o resultado é um link mutilado com o resto
 * da URL virando texto solto ao lado. Fato gerador: um endereço de loja terminado em
 * `...(humanoarea)-h.265+-branco/21495/` foi para um documento de compra e chegou quebrado
 * na tela do dono; a página estava no ar o tempo todo.
 *
 * É a família do "nada quebra em silêncio": o link errado ABRE a página errada ou nenhuma, e
 * quem lê culpa a loja. O conserto é `%28`/`%29`, e o gate diz isso na mensagem — apontar o
 * defeito sem dar o conserto transfere trabalho em vez de eliminá-lo.
 */
function auditaLinksQuebrados(textoBruto: string): string[] {
  const achados: string[] = [];
  textoBruto.split("\n").forEach((linha, i) => {
    // O parser do Markdown fecha o link no PRIMEIRO ')'. Então captura-se até ele — e, se o
    // pedaço capturado ainda contém um '(' aberto, a URL verdadeira era maior: o link já
    // nasceu cortado. É teste de desequilíbrio, não de vizinhança — a 1ª versão deste gate
    // olhava o caractere seguinte e falhava quando ele era '-' (medido no próprio caso real).
    for (const m of linha.matchAll(/\]\(([^)\s]*)\)/g)) {
      const url = m[1];
      if (!/^https?:\/\//.test(url)) continue;
      if (!url.includes("(")) continue;
      achados.push(
        `linha ${i + 1}: link cortado por parêntese na URL — o Markdown fecha no primeiro ')' e ` +
          `o resto do endereço vira texto solto. Troque '(' por %28 e ')' por %29.`,
      );
    }
  });
  return achados;
}

function auditaPureza(textoBruto: string): string[] {
  // Alvo de link e URL nua NÃO carregam afirmação do autor: um id numérico de loja
  // ("/produto/1025405") casava com "hash de commit" e barrava a lista de compras
  // (medido 2026-09-04). Apaga-se com espaços do mesmo tamanho para a linha
  // reportada continuar certa.
  // COMENTARIO-NAO-E-AFIRMACAO-001 (2026-09-08, GATE-MOLDE-001): `<!-- Molde: ... -->`
  // é anotação para o gate de molde e NUNCA chega ao leitor (o renderizador descarta o
  // comentário HTML). Texto que o destinatário não vê não é afirmação a ele — mesma
  // doutrina de alvo de link e URL. Apaga-se preservando as quebras de linha para a
  // linha reportada dos demais achados continuar certa.
  const texto = textoBruto
    .replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/\]\([^)]*\)/g, (m) => "]" + " ".repeat(m.length - 1))
    .replace(/https?:\/\/\S+/g, (m) => " ".repeat(m.length));
  return MARCADORES_INTERNOS.filter(([re]) => re.test(texto)).map(([re, rot]) => {
    const m = texto.match(re);
    const linha = texto.slice(0, m!.index ?? 0).split("\n").length;
    return `${rot} (linha ${linha}: "${(m![0] || "").slice(0, 40)}")`;
  });
}

// ── R-PROVA-NAO-E-LINHA-DE-BASE-001 (corte Enio 2026-08-28, PCA-43:a+b) ─────
// Fato gerador, medido no próprio repo: uma peça enviada a um parceiro em 24/08
// afirmava que uma correção estava "provada em três réguas, sem regressão:
// 112/112 · 16/16 · 15/15" — e os MESMOS três números estavam impressos 14 linhas
// acima, na tabela de LINHA DE BASE da suíte do parceiro. Suíte que passa 112/112
// antes e 112/112 depois não diz nada sobre a mudança: a "prova" era
// indistinguível de rodar a suíte sem a correção.
//
// A regra que isto enforça já existia em quatro lugares da casa (teste-de-gate-
// pergunta-se-barra · golden-que-passa-por-coercao · verificar-artefato-nao-fonte
// · R-PARIDADE-REAL-001) e nenhum deles alcançava peça externa. Aqui alcança.
//
// O que se exige NÃO é um número diferente — é a frase que diz o que FALHA sem a
// mudança. Placar idêntico é legítimo (regressão de fato não houve); o que não é
// legítimo é apresentá-lo COMO prova da mudança, sozinho.
const RE_ALEGA_PROVA = /\b(provad[oa]s?|sem regress[ãa]o|nenhuma regress[ãa]o|comprovad[oa]s?)\b/i;
// Reconhece placar de suíte: 112/112, 16/16, 15 de 15.
const RE_PLACAR = /\b(\d{1,5})\s*(?:\/|\s+de\s+)\s*(\d{1,5})\b/g;
// A frase que salva: diz que existe caso que reprova SEM a mudança.
const RE_CASO_QUE_FALHA =
  /(falha|reprova|quebra|vermelh[oa]|n[ãa]o passa)\s+(sem|antes d)|sem (a|o|essa|esse|este|esta) (corre[çc][ãa]o|mudan[çc]a|patch|altera[çc][ãa]o)|mutação|mutante/i;

export interface AchadoDeProva {
  linha: number;
  placar: string;
  linhaDaBase: number;
  trecho: string;
}

/**
 * Acha alegação de prova cujo placar TAMBÉM aparece, no mesmo documento, numa
 * linha que não alega prova nenhuma — isto é, a linha de base. Puro: recebe o
 * texto, devolve os achados. Sem I/O, testável sem arquivo.
 */
export function auditaProvaCircular(texto: string): AchadoDeProva[] {
  const linhas = texto.split("\n");
  const achados: AchadoDeProva[] = [];
  // Onde cada placar aparece SEM alegação de prova por perto = candidato a base.
  const base = new Map<string, number>();
  linhas.forEach((l, i) => {
    if (RE_ALEGA_PROVA.test(l)) return;
    for (const m of l.matchAll(RE_PLACAR)) {
      const chave = `${m[1]}/${m[2]}`;
      if (!base.has(chave)) base.set(chave, i + 1);
    }
  });
  linhas.forEach((l, i) => {
    if (!RE_ALEGA_PROVA.test(l)) return;
    // Alegação que declara o caso que falha sem a mudança está isenta: ela diz
    // o que a suíte sozinha não diz.
    if (RE_CASO_QUE_FALHA.test(l)) return;
    for (const m of l.matchAll(RE_PLACAR)) {
      const chave = `${m[1]}/${m[2]}`;
      const linhaDaBase = base.get(chave);
      if (linhaDaBase === undefined) continue;
      achados.push({
        linha: i + 1,
        placar: chave,
        linhaDaBase,
        trecho: l.trim().slice(0, 80),
      });
    }
  });
  return achados;
}

// ───────────────────────── montagem da página ───────────────────────────────
/** A fonte grande liga por flag OU por marcador no próprio .md — o marcador é o
 * que sobrevive a regeração alheia (medido 2026-09-01: par regerado sem a flag
 * derrubou a acessibilidade em silêncio). */
export function querFonteGrande(md: string, argv: readonly string[]): boolean {
  return argv.includes("--fonte-grande") || md.includes("<!-- md-para-html: fonte-grande -->");
}

// ── MODO CEBOLA (APRESENTACAO-CEBOLA-001, corte Enio 2026-09-02) ────────────
// "linguagem muito técnica; mais simples, ícones, botões, as explicações vão
//  surgindo com os cliques, em camadas, tipo uma cebola" — sobre um diagnóstico
// que o motor gerava plano (todo o texto técnico na frente, de uma vez). Default
// OFF (não quebra os goldens que já existiam); liga por `--cebola` OU por
// front-matter `modo: cebola` no próprio .md (mesma convenção do fonte-grande:
// a preferência viaja NO documento, sobrevive a regeração alheia).
export function querCebola(md: string, argv: readonly string[]): boolean {
  if (argv.includes("--cebola")) return true;
  const fm = md.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return !!fm && /^\s*modo:\s*cebola\s*$/m.test(fm[1]);
}

// ── MARCA-DE-QUEM-LE-001 (R-ENTREGA-PURA-001, corte Enio contexto 2026-09-25) ─
// "documento externo nasce no formato de envio, sem instrução interna nem
//  proveniência de ferramenta" — o cabeçalho fixo "EGOS" e o rodapé "Gerado de
//  <arquivo> por scripts/md-para-html.ts" são proveniência NOSSA (ferramenta e
//  caminho interno), o mesmo tipo de vazamento que a R17-a já cobre para o corpo
//  do texto. `--externo "<marca>"` troca os dois: o header mostra a marca dada
//  (texto vazio → sem logo nenhum) e o rodapé vira só "Gerado em <data>", sem
//  nome de arquivo nem nome da ferramenta. NÃO pula gate nenhum — é troca de
//  APRESENTAÇÃO, os audits (link quebrado, pureza, prova circular, voz humana)
//  continuam rodando sobre o `.md` de entrada, que esta flag nunca toca.
// Convenção igual à de --colar: valor no próximo argv; sem valor (ausente ou
// começando com "--") é marca vazia, não erro — "sem texto → sem logo" é um
// resultado válido, não uma falha de uso.
export function pedeExterno(argv: readonly string[]): string | null {
  const i = argv.indexOf("--externo");
  if (i === -1) return null;
  const v = argv[i + 1];
  return v !== undefined && !v.startsWith("--") ? v : "";
}

function textoPuro(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function primeiraFrase(txt: string): string {
  const m = txt.match(/^(.{1,160}?[.!?])(\s|$)/);
  if (m) return m[1].trim();
  return txt.length > 160 ? txt.slice(0, 157).trim() + "…" : txt.trim();
}

/** UM número, se houver — o primeiro que aparece no corpo (não na tabela/prova).
 * Seção sem número no corpo NÃO inventa (=R-DECIDE-DETERMINISTICO-001: função pura,
 * sem chute). */
function achaNumero(txt: string): string | null {
  const m = txt.match(/\d[\d.,]*\s?%/) ?? txt.match(/\d[\d.,]*/);
  return m ? m[0].trim() : null;
}

const RE_EMOJI = /\p{Extended_Pictographic}/u;
function extraiIcone(titulo: string): string {
  const m = titulo.match(RE_EMOJI);
  return m ? m[0] : "📌";
}

// Camada 3 (prova) é o que hoje aparece TODO na frente: tabela, bloco de código,
// e o rastro de proveniência `{claim: ...}` que este motor já não formata como
// nada especial (vira parágrafo comum) — aqui ele some da camada 1/2.
function ehBlocoProva(b: Bloco): boolean {
  if (b.tipo === "tabela" || b.tipo === "pre" || b.tipo === "pre-copiar") return true;
  if (b.tipo === "p" && /\{claim:/.test(b.html)) return true;
  return false;
}

export interface GrupoCebola {
  id: string;
  icone: string;
  manchete: string;
  numero: string | null;
  corpo: Bloco[];
  prova: Bloco[];
}

/** Agrupa os blocos já renderizados por seção de 1º nível (`##`). Puro: recebe
 * os blocos, devolve os grupos + o que veio ANTES da 1ª `##` (intro/callout). */
export function agrupaCebola(blocos: readonly Bloco[]): { grupos: GrupoCebola[]; preambulo: Bloco[] } {
  const grupos: GrupoCebola[] = [];
  const preambulo: Bloco[] = [];
  let atual: GrupoCebola | null = null;
  let n = 0;

  for (const b of blocos) {
    if (b.tipo === "h1") continue; // vira <h1> do documento, tratado à parte
    if (b.tipo === "h2") {
      n++;
      const tituloTexto = textoPuro(b.html);
      atual = { id: `cebola-${n}`, icone: extraiIcone(tituloTexto), manchete: tituloTexto, numero: null, corpo: [], prova: [] };
      grupos.push(atual);
      continue;
    }
    if (!atual) { preambulo.push(b); continue; }
    (ehBlocoProva(b) ? atual.prova : atual.corpo).push(b);
  }

  for (const g of grupos) {
    const primeiroTexto = g.corpo.find((b) => b.tipo === "p" || b.tipo === "cartao" || b.tipo === "lista");
    if (primeiroTexto) {
      const txt = textoPuro(primeiroTexto.html);
      if (txt) g.manchete = primeiraFrase(txt);
    }
    g.numero = achaNumero(g.corpo.map((b) => textoPuro(b.html)).join(" "));
  }
  return { grupos, preambulo };
}

function montaCebola(blocos: Bloco[]): string {
  const { grupos, preambulo } = agrupaCebola(blocos);
  const intro = preambulo.map((b) => b.html).join("\n");
  const cards = grupos.map((g) => `
      <button type="button" class="cebola-card" data-alvo="${g.id}" aria-expanded="false" aria-controls="${g.id}">
        <span class="cebola-icone" aria-hidden="true">${g.icone}</span>
        <span class="cebola-manchete">${escapa(g.manchete)}</span>
        ${g.numero ? `<span class="cebola-numero">${escapa(g.numero)}</span>` : ""}
      </button>`).join("\n");
  const paineis = grupos.map((g) => {
    const corpoHtml = g.corpo.map((b) => b.html).join("\n        ");
    const provaHtml = g.prova.length
      ? `\n        <button type="button" class="cebola-prova-btn" data-alvo="prova-${g.id}" aria-controls="prova-${g.id}">Ver a prova</button>
        <div class="cebola-prova" id="prova-${g.id}" hidden>${g.prova.map((b) => b.html).join("\n        ")}</div>`
      : "";
    return `<div class="cebola-painel" id="${g.id}" hidden>
        ${corpoHtml}${provaHtml}
      </div>`;
  }).join("\n      ");
  return `<div class="cebola-intro">${intro}</div>
      <div class="cebola-grid">${cards}
      </div>
      ${paineis}`;
}

/**
 * DESTINATARIO-DECIDE-O-RODAPE-001 (PCA-100:a, corte Enio 10/09: "sim, sai, vamos manter a
 * seriedade, deixar para nós a parte mais complexa, filosófica, devemos filtrar o máximo e
 * sermos diretos, apresentar o que precisar rápido").
 *
 * O mantra da casa ("A regra roda. A prova abre. Você decide.") é assinatura NOSSA, e numa
 * lista de câmeras que vai para um fornecedor ele é exatamente o "parecer sistema" que o
 * corte manda tirar. Fato gerador: o Enio pediu para tirar a coluna de verificação de um
 * documento de compra, e sobrou o rodapé — que a varredura pegou.
 *
 * O eixo é o DESTINATÁRIO, e ele já existia no comando: `--permitir-interno` significa
 * "esta peça é de uso interno". Reuso desse mesmo sinal em vez de inventar uma segunda flag
 * — duas flags para o mesmo eixo divergem sozinhas na primeira semana.
 *
 * O PADRÃO É O LIMPO. Quem esquece a flag entrega peça sem o mantra; o contrário entregaria
 * conversa nossa a um cliente por esquecimento. O default protege o lado caro do erro.
 */
/** limpaComentariosCss — PURA. Tira todo `/* ... *\/` do CSS antes de colar no HTML entregue.
 *  Fato gerador (25/09, achado da janela Nestlé na página do Hélio, linhas 112-116): o
 *  casa.css é documentado para quem o mantém — nome de regra do kernel, "corte Enio", caminho
 *  de script — e tudo isso ia parar no "ver código-fonte" do cliente. A regra que este
 *  gerador defende (R-ENTREGA-PURA-001: peça externa nasce limpa) era violada por ele mesmo.
 *  O comentário continua no casa.css (é para nós); só não viaja. */
export function limpaComentariosCss(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\n{3,}/g, "\n\n");
}

function monta(md: string, nomeArquivo: string, blocoColar: string | null, fonteGrande = false, cebola = false, interno = false, externo: string | null = null): string {
  const { blocos, titulo, secoes } = renderCorpo(md);
  const temRecolhido = blocos.some((b) => b.tipo === "details");
  const css = limpaComentariosCss(readFileSync(CSS, "utf-8"));
  const sel = selecionaNav(secoes);
  // Modo cebola: os `##` viram cartão clicável, não link de rolagem — a barra
  // lateral apontaria para dentro de um painel `hidden`, então avisa em vez de
  // linkar para o invisível.
  const nav = cebola
    ? `<span class="sidebar-nota">Navegue pelos cartões — clique para abrir cada seção.</span>`
    : sel.nav
        .map((s) => `<a class="sidebar-link" href="#${s.id}">${escapa(s.texto)}</a>`).join("\n        ")
      // Omissão DITA: barra que corta em silêncio faz o leitor concluir que viu tudo.
      + (sel.omitidas ? `\n        <span class="sidebar-nota">+${sel.omitidas} subseção(ões) — role a página</span>` : "");
  const corpo = cebola ? montaCebola(blocos) : blocos.map((b) => b.html).join("\n        ");
  const colar = blocoColar
    ? `<section id="copiar" aria-labelledby="h-copiar">
        <h2 id="h-copiar">Texto para copiar</h2>
        <p>Selecione tudo abaixo e cole no WhatsApp ou e-mail. O negrito já está no formato do WhatsApp.</p>
        <button class="btn-copiar" type="button" data-alvo="texto-colar">Copiar tudo</button>
        <pre id="texto-colar" class="bloco-colar">${escapa(blocoColar)}</pre>
      </section>
      <div class="section-divider"></div>\n      ` : "";
  const hoje = new Date().toISOString().slice(0, 10);
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapa(titulo)}</title>
<style>
${css}
${fonteGrande ? `
html{font-size:20px;}
body{line-height:1.8;}
table{font-size:1em !important;}
th,td{padding:12px 14px !important;}
.sidebar-link{font-size:1em;}` : ""}
.tabela-wrap{overflow-x:auto;margin-bottom:16px;}
table{border-collapse:collapse;width:100%;font-size:14px;}
.midia{margin:20px 0;}.midia img,.midia video{max-width:100%;height:auto;border-radius:var(--radius);border:1px solid var(--border);display:block;}.midia figcaption{font-size:13px;color:var(--text-secondary);margin-top:8px;}
th,td{border:1px solid var(--border);padding:8px 10px;text-align:left;vertical-align:top;}
th{background:var(--surface-alt);font-weight:700;}
.bloco-cod,.bloco-colar{background:var(--code-bg);border:1px solid var(--border);border-radius:var(--radius-sm);
  padding:14px 16px;overflow-x:auto;font-family:'SF Mono','JetBrains Mono',Menlo,Consolas,monospace;
  font-size:13px;line-height:1.6;white-space:pre-wrap;word-break:break-word;margin-bottom:14px;}
.btn-copiar{background:var(--accent);color:#fff;border:0;border-radius:var(--radius-sm);padding:8px 16px;
  font-size:14px;font-weight:700;cursor:pointer;margin-bottom:12px;}
.btn-copiar:hover{opacity:.9;}
.btn-copiar:focus-visible{outline:2px solid var(--text-primary);outline-offset:2px;}${temRecolhido ? `
details.recolhido{border:1px solid var(--border);border-radius:var(--radius);margin-bottom:16px;background:var(--surface);}
details.recolhido>summary{cursor:pointer;list-style:none;display:flex;align-items:baseline;gap:10px;padding:16px 20px;user-select:none;}
details.recolhido>summary::-webkit-details-marker{display:none;}
details.recolhido>summary h2{margin:0;}
.recolhido-seta{display:inline-block;font-size:13px;color:var(--text-muted);}
.recolhido-seta::before{content:'▸';}
details.recolhido[open]>summary .recolhido-seta::before{content:'▾';}
.recolhido-dica{font-size:12px;color:var(--text-muted);font-weight:400;margin-left:auto;}
details.recolhido[open] .recolhido-dica{display:none;}
details.recolhido>*:not(summary){padding:0 20px 20px;}
@media print{
  details.recolhido{border:none;}
  details.recolhido>summary{display:none;}
  details.recolhido>*:not(summary){display:block!important;padding:0;}
}` : ""}
${cebola ? `/* --cebola: camada 1 = cartão · camada 2 = corpo · camada 3 = prova (R14-h/i preservados: contraste via tokens da casa) */
.cebola-intro{margin-bottom:24px;}
.cebola-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:16px;margin-bottom:8px;}
.cebola-card{display:flex;flex-direction:column;align-items:flex-start;gap:8px;text-align:left;
  background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);
  padding:16px;cursor:pointer;font:inherit;color:var(--text-primary);width:100%;}
.cebola-card:hover{border-color:var(--accent);background:var(--accent-soft);}
.cebola-card:focus-visible{outline:2px solid var(--accent);outline-offset:2px;}
.cebola-card[aria-expanded="true"]{border-color:var(--accent);}
.cebola-icone{font-size:28px;line-height:1;}
.cebola-manchete{font-size:16px;font-weight:700;line-height:1.4;}
.cebola-numero{font-size:16px;font-weight:700;color:var(--accent);}
.cebola-painel{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);
  padding:24px;margin:8px 0 24px;}
.cebola-prova-btn{background:var(--surface-alt);color:var(--text-primary);border:1px solid var(--border);
  border-radius:var(--radius-sm);padding:8px 16px;font-size:16px;font-weight:700;cursor:pointer;margin-top:8px;}
.cebola-prova-btn:hover{background:var(--accent-soft);border-color:var(--accent);}
.cebola-prova-btn:focus-visible{outline:2px solid var(--accent);outline-offset:2px;}
.cebola-prova{margin-top:16px;}
@media print{/* no papel TODA camada aparece — PDF com as camadas fechadas entrega documento pela metade */
  .cebola-prova-btn{display:none!important;}
  .cebola-painel[hidden]{display:block!important;}
  .cebola-card{break-after:avoid;page-break-after:avoid;}
  .cebola-card,.cebola-painel{break-inside:avoid;page-break-inside:avoid;}}` : ""}
</style>
</head>
<body>
  <header class="egos-header">
    ${externo === null ? '<div class="header-logo">EGOS<span>documento</span></div>' : (externo ? `<div class="header-logo">${escapa(externo)}</div>` : "")}
    <div class="header-title">${escapa(titulo)}</div>
    <div class="header-actions">
      <button class="btn-icon" id="btn-tema" type="button" aria-label="Alternar tema">🌓</button>
    </div>
  </header>
  <div class="egos-layout">
    <nav class="egos-sidebar" aria-label="Seções">
      <div class="sidebar-section-label">Neste documento</div>
      ${nav}
    </nav>
    <main class="egos-main">
      <div class="content-wrap">
      ${colar}${corpo}
      </div>
    </main>
  </div>
  <footer class="egos-footer">
    ${interno ? '<div class="footer-sig">A regra roda. A prova abre. Você decide.</div>' : ""}
    <div class="footer-prov">${externo === null ? `Gerado de <code>${escapa(nomeArquivo)}</code><br>por <code>scripts/md-para-html.ts</code> em ${hoje}` : `Gerado em ${hoje}`}</div>
  </footer>
<script>
document.getElementById('btn-tema').addEventListener('click',function(){document.body.classList.toggle('dark');});
document.querySelectorAll('.btn-copiar').forEach(function(b){b.addEventListener('click',function(){
  var el=document.getElementById(b.dataset.alvo); if(!el)return;
  navigator.clipboard.writeText(el.textContent).then(function(){var t=b.textContent;b.textContent='Copiado ✓';setTimeout(function(){b.textContent=t;},1600);});
});});
${cebola ? `document.querySelectorAll('.cebola-card,.cebola-prova-btn').forEach(function(b){b.addEventListener('click',function(){
  var el=document.getElementById(b.dataset.alvo); if(!el)return;
  var aberto=!el.hidden; el.hidden=aberto;
  if(b.classList.contains('cebola-card'))b.setAttribute('aria-expanded',String(!aberto));
});});` : ""}${temRecolhido ? `
document.querySelectorAll('.sidebar-link').forEach(function(a){a.addEventListener('click',function(){
  var id=(a.getAttribute('href')||'').slice(1); var el=id&&document.getElementById(id);
  var det=el&&el.closest&&el.closest('details.recolhido'); if(det)det.open=true;
});});
(function(){ if(!location.hash) return; var el=document.getElementById(location.hash.slice(1)); if(!el) return;
  var det=el.closest&&el.closest('details.recolhido'); if(det)det.open=true; el.scrollIntoView();
})();` : ""}
</script>
</body>
</html>
`;
}

// ───────────────────────── CLI ──────────────────────────────────────────────
function golden(): number {
  let ok = 0, falhou = 0;
  const t = (nome: string, cond: boolean) => { if (cond) ok++; else { falhou++; console.error(`  ❌ ${nome}`); } };

  const r1 = renderCorpo("# Título\n\n## Seção\n\nUm **negrito** e `cod`.\n");
  t("g1 h1 vira titulo", r1.titulo === "Título");
  t("g1 h2 vira secao com id", r1.secoes.length === 1 && r1.blocos.some((b) => b.html.includes("<h2 id=")));
  t("g1 negrito e codigo", r1.blocos.some((b) => b.html.includes("<strong>negrito</strong>") && b.html.includes("<code>cod</code>")));

  const r2 = renderCorpo("| A | B |\n|---|---|\n| 1 | 2 |\n");
  t("g2 tabela renderiza", r2.blocos.some((b) => b.html.includes("<table>") && b.html.includes("<td>1</td>")));

  const r3 = renderCorpo("- um\n- dois\n\n1. a\n2. b\n");
  t("g3 ul e ol", r3.blocos.filter((b) => b.tipo === "lista").length === 2);

  const r4 = renderCorpo("Linha um\nlinha dois\n\nOutro.\n");
  t("g4 paragrafo junta linhas quebradas", r4.blocos.some((b) => b.html === "<p>Linha um linha dois</p>"));

  const r5 = renderCorpo("Um <script>alert(1)</script> aqui\n");
  t("g5 html do md e escapado (XSS)", r5.blocos.some((b) => b.html.includes("&lt;script&gt;")) &&
    !r5.blocos.some((b) => b.html.includes("<script>alert")));

  const c = textoParaColar("# Cabec\n\nOi **mundo**\nquebrado aqui.\n\n> nota\n\nFim.\n");
  t("g6 colar: negrito vira asterisco unico", c.includes("*mundo*") && !c.includes("**mundo**"));
  t("g6 colar: paragrafo flui e heading/quote saem", c.includes("Oi *mundo* quebrado aqui.") && !c.includes("Cabec") && !c.includes("nota"));

  // COMENTARIO-NAO-E-AFIRMACAO-001 — os dois lados: nem vaza ao leitor, nem acusa no scanner.
  const rc = renderCorpo("# T\n\n<!-- Molde: docs/governance/EGOS_X_SSOT.md · corte Enio -->\n\nTexto para o cliente.\n");
  t("gc1 comentario HTML NAO vira bloco visivel", !rc.blocos.some((b) => b.html.includes("Molde") || b.html.includes("&lt;!--")));
  t("gc2 comentario HTML nao dispara pureza", auditaPureza("# T\n\n<!-- Molde: docs/governance/EGOS_X_SSOT.md · corte Enio -->\n\nOi.\n").length === 0);
  t("gc3 o MESMO texto fora do comentario ainda dispara (o gate nao afrouxou)", auditaPureza("# T\n\nMolde: EGOS_X_SSOT.md · corte Enio\n").length >= 2);

  const r8 = renderCorpo("**4. Os 5%.** Valem, e são assim.\n\nParágrafo normal.\n");
  t("g8 '**N. Titulo.**' vira cartao numerado da casa", r8.blocos.some((b) =>
    b.tipo === "cartao" && b.html.includes('class="qa-num">4<') && b.html.includes("Os 5%")));
  t("g8 paragrafo comum NAO vira cartao (anti falso-positivo)",
    r8.blocos.filter((b) => b.tipo === "cartao").length === 1 && r8.blocos.some((b) => b.tipo === "p"));

  // R-ENTREGA-PURA-001: os dois lados — barra o sujo, deixa o limpo passar
  const sujo = "Status: RASCUNHO — HITL `d2f218ff0107` (PCA-31). Envio é ato do Enio.\n\nOi.\n";
  const limpo = "Oi, tudo certo? Segue o combinado: 50% da minha parte quando você trouxer.\n";
  const acha = (t: string) => MARCADORES_INTERNOS.filter(([re]) => re.test(t)).length;
  t("g9 peca suja e detectada (rascunho/HITL/PCA/hash/ato do Enio)", acha(sujo) >= 5);
  t("g9 peca limpa NAO e detectada (anti falso-positivo)", acha(limpo) === 0);

  // DESTINATARIO-DECIDE-O-RODAPE-001 (PCA-100:a) — os DOIS lados, porque um só não prova nada:
  // peça de cliente sai sem o mantra da casa, peça interna sai com ele. O default é o limpo,
  // então esquecer a flag entrega documento sóbrio; o inverso vazaria conversa nossa ao cliente.
  t("g-rodape-cliente: sem --permitir-interno, o mantra NAO vai para o cliente",
    !monta("# T\n\ncorpo", "x.md", null, false, false, false).includes("A regra roda"));
  t("g-rodape-interno: com --permitir-interno, o mantra fica na peca nossa",
    monta("# T\n\ncorpo", "x.md", null, false, false, true).includes("A regra roda"));
  t("g-rodape-proveniencia: os DOIS lados mantem 'Gerado de' — tirar o mantra nunca apaga de onde o arquivo veio",
    monta("# T\n\ncorpo", "x.md", null, false, false, false).includes("Gerado de") &&
    monta("# T\n\ncorpo", "x.md", null, false, false, true).includes("Gerado de"));

  // ── MARCA-DE-QUEM-LE-001 (--externo) — peça externa troca marca e rodapé ──
  // g-externo-ausente: SEM a flag (default null), byte-idêntico ao comportamento
  // de antes — mesma chamada que os goldens de cima já provam, aqui isolado.
  const semExterno = monta("# T\n\ncorpo", "plano-Exemplo.md", null, false, false, false);
  t("g-externo-ausente: sem a flag, cabecalho continua EGOS e rodape continua 'Gerado de'",
    semExterno.includes('class="header-logo">EGOS<') && semExterno.includes("Gerado de"));

  const comExterno = monta("# T\n\ncorpo", "plano-Exemplo.md", null, false, false, false, "Efetivo Exemplo");
  t("g-externo-header: com --externo, a marca dada substitui EGOS no cabecalho",
    comExterno.includes('class="header-logo">Efetivo Exemplo</div>') && !comExterno.includes(">EGOS<"));
  t("g-externo-rodape: com --externo, o rodape vira so 'Gerado em <data>' — sem nome do .md nem da ferramenta",
    /Gerado em \d{4}-\d{2}-\d{2}/.test(comExterno) &&
    !comExterno.includes("plano-Exemplo.md") && !comExterno.includes("md-para-html.ts") && !comExterno.includes("Gerado de"));

  const externoSemTexto = monta("# T\n\ncorpo", "plano-Exemplo.md", null, false, false, false, "");
  t("g-externo-sem-texto: --externo com marca vazia tira o logo inteiro (nao deixa div vazia; casa.css continua com a regra, so nao ha markup)",
    !externoSemTexto.includes('<div class="header-logo"') && /Gerado em \d{4}-\d{2}-\d{2}/.test(externoSemTexto));

  t("g-externo-parse: pedeExterno le o valor do argv, string vazia quando ausente-de-valor, null quando a flag nem existe",
    pedeExterno(["x.md", "--externo", "Efetivo Exemplo"]) === "Efetivo Exemplo" &&
    pedeExterno(["x.md", "--externo"]) === "" &&
    pedeExterno(["x.md", "--saida", "y.html"]) === null);

  // LINK-QUEBRA-CALADO-001 — o caso REAL que gerou o gate, e o lado que ele deixa passar.
  t("g-link-quebrado: URL com parentese cru e acusada (o caso do Enio, 10/09)",
    auditaLinksQuebrados("| [Shopar](https://x.com/camera-(humanoarea)-h.265+-branco/21495/) | valor |").length === 1); // replicavel-ok: URL de fixture do golden, nao e host de ambiente
  t("g-link-consertado: a MESMA URL com %28/%29 passa limpa",
    auditaLinksQuebrados("| [Shopar](https://x.com/camera-%28humanoarea%29-h.265+-branco/21495/) | valor |").length === 0); // replicavel-ok: idem
  t("g-link-normal: link comum nao vira falso positivo",
    auditaLinksQuebrados("Veja [a loja](https://www.urbangate.com.br/e0319) hoje.").length === 0); // replicavel-ok: idem
  t("g-link-texto-com-parentese: parentese no TEXTO do link (nao na URL) nao acusa",
    auditaLinksQuebrados("[Shopar (matriz)](https://x.com/produto/1) e outro.").length === 0); // replicavel-ok: idem
  const pag = monta("# T\n\n## S\n\ntexto\n", "x.md", "colar isto");
  t("g7 pagina sem referencia externa", !/src="http|href="http|@import|cdn\./.test(pag));
  t("g7 pagina tem bloco de colar e botao", pag.includes('id="texto-colar"') && pag.includes("btn-copiar"));
  t("g7 divs balanceadas", (pag.match(/<div\b/g) || []).length === (pag.match(/<\/div>/g) || []).length);

  // ── g12 · a barra lateral protege a ESPINHA, nunca corta a última seção ──
  // Fato gerador: peça de 15 seções entregue a parceiro perdeu "O que não medimos"
  // do índice porque o corte era pelas 14 PRIMEIRAS.
  const secs = (n2: number, n3: number) => [
    ...Array.from({ length: n2 }, (_, i) => ({ id: `a${i}`, texto: `H2 ${i}`, nivel: 2 })),
    ...Array.from({ length: n3 }, (_, i) => ({ id: `b${i}`, texto: `H3 ${i}`, nivel: 3 })),
  ];
  const s1 = selecionaNav(secs(8, 7));               // 15 seções, teto 14
  t("g12 nenhuma secao de 1o nivel some do indice",
    s1.nav.filter((s) => s.nivel <= 2).length === 8);
  t("g12 quem cede lugar e a subsecao", s1.nav.length === 14 && s1.omitidas === 1);
  t("g12 cabendo tudo, nada e omitido",
    selecionaNav(secs(5, 5)).omitidas === 0 && selecionaNav(secs(5, 5)).nav.length === 10);
  t("g12 espinha maior que o teto: todas as h2 entram mesmo assim",
    selecionaNav(secs(20, 3)).nav.filter((s) => s.nivel <= 2).length === 20);
  t("g12 a ordem do documento e preservada",
    s1.nav.map((s) => s.id).join(",") === secs(8, 7).filter((_, i) => i < 8 || i < 14).slice(0, 14).map((s) => s.id).join(","));
  // e a omissão aparece na página, em vez de sumir calada
  const pagLonga = monta("# T\n\n" + secs(8, 7).map((s) => `${"#".repeat(s.nivel)} ${s.texto}\n\ntexto.\n`).join("\n"), "x.md", null);
  t("g12 a pagina DIZ quantas subsecoes ficaram fora do indice", pagLonga.includes("sidebar-nota") && pagLonga.includes("+1 subse"));

  // ── g11 · R-PROVA-NAO-E-LINHA-DE-BASE-001 — os dois lados, e o caso REAL ──
  // O texto abaixo é o formato exato do documento de 24/08 que gerou a regra:
  // placar na tabela de linha de base e, adiante, o MESMO placar como prova.
  const provaCircular = [
    "| Suite unitaria (`pnpm test`) | 112/112 |",
    "",
    "E o patch que oferecemos: provado nas tres reguas sem regressao: 112/112 · 16/16.",
  ].join("\n");
  const c1 = auditaProvaCircular(provaCircular);
  t("g11 placar de prova identico ao da linha de base e ACUSADO", c1.length >= 1 && c1[0].placar === "112/112");
  t("g11 o achado aponta as DUAS linhas (a prova e a base)", c1.length >= 1 && c1[0].linha === 3 && c1[0].linhaDaBase === 1);

  // Lado positivo 1: alegação que declara o caso que falha sem a mudança passa.
  const provaHonesta = [
    "| Suite unitaria | 112/112 |",
    "",
    "Provado: 112/112 e um caso novo que reprova sem a correcao.",
  ].join("\n");
  t("g11 alegacao que diz o caso que FALHA sem a mudanca passa", auditaProvaCircular(provaHonesta).length === 0);

  // Lado positivo 2: placar que só existe na alegação (nunca foi linha de base).
  const placarNovo = "Provado: 3 casos novos, 3/3 verdes.";
  t("g11 placar que nao e linha de base do documento passa", auditaProvaCircular(placarNovo).length === 0);

  // Lado positivo 3: documento sem alegação de prova nenhuma não é tocado.
  t("g11 documento sem alegacao de prova passa", auditaProvaCircular("| Suite | 112/112 |\n\nRodamos hoje.").length === 0);

  // ── g13 · o FONTE deste motor não pode carregar byte NUL cru ──────────────
  // SENTINELA-CEGA-GREP-001 (2026-08-28). O sentinela que protege trechos de
  // código PRECISA ser NUL em tempo de execução — mas escrito como escape.
  // Com o byte cru no arquivo, o `grep` classifica o fonte inteiro como binário
  // e devolve exit 1: "nada encontrado", indistinguível de "não procurei".
  // Fato gerador: 3 varreduras seguidas vazias neste arquivo quase viraram o
  // laudo "outra janela apagou o trabalho de hoje". Falso negativo mudo = R13-c.
  const fonteDesteMotor = readFileSync(new URL(import.meta.url).pathname, "utf-8");
  t("g13 o fonte nao tem byte NUL cru (senao o grep fica cego)",
    !fonteDesteMotor.includes("\u0000"));
  // O outro lado — sem ele o conserto viraria "apagar o sentinela e quebrar o <code>":
  t("g13 e o sentinela segue funcionando: codigo inline vira <code>",
    inline("veja `x.ts` aqui").includes("<code>x.ts</code>"));
  t("g13 sentinela sobrevive a negrito e link na mesma linha",
    inline("**forte** `cod` [t](u)").includes("<code>cod</code>"));

  t("g15 marcador no .md liga a fonte grande sem flag (sobrevive a regeracao alheia); sem marcador e sem flag, nao liga",
    querFonteGrande("<!-- md-para-html: fonte-grande -->\n# T", []) &&
    querFonteGrande("# T", ["--fonte-grande"]) &&
    !querFonteGrande("# T", []));

  t("g14 --fonte-grande injeta o CSS de acessibilidade, e so com a flag",
    monta("# T\n\ncorpo", "x.md", null, true).includes("font-size:20px") &&
    !monta("# T\n\ncorpo", "x.md", null).includes("font-size:20px"));

  // ── MODO CEBOLA (APRESENTACAO-CEBOLA-001) — os dois lados de cada golden ──
  const mdCebola = [
    "# Titulo",
    "",
    "> intro callout",
    "",
    "## 1) Secao com numero",
    "",
    "Temos 42 casos resolvidos esta semana. Segue o detalhe do que mudou.",
    "",
    "| A | B |",
    "|---|---|",
    "| 1 | 2 |",
    "",
    "## 2) Secao sem numero",
    "",
    "Nada quantitativo aqui, so prosa sobre o que aconteceu.",
  ].join("\n");

  // g16 · sem --cebola a saida NAO muda (default off preserva os goldens antigos)
  const semCebolaImplicito = monta(mdCebola, "x.md", null);
  const semCebolaExplicito = monta(mdCebola, "x.md", null, false, false);
  t("g16 sem --cebola: parametro implicito e explicito geram bytes identicos",
    semCebolaImplicito === semCebolaExplicito);
  t("g16 sem --cebola: nenhum marcador de camada aparece na saida",
    !semCebolaImplicito.includes("cebola-card") && !semCebolaImplicito.includes("cebola-painel"));

  // g17 · com --cebola: as 3 camadas existem na pagina
  const comCebola = monta(mdCebola, "x.md", null, false, true);
  t("g17 cebola gera as 3 camadas: cartao (1), painel/corpo (2) e prova (3)",
    comCebola.includes("cebola-card") && comCebola.includes("cebola-painel") && comCebola.includes("cebola-prova"));

  // g18 · tabela nunca aparece na camada 1 (o trecho dos cartoes, antes do 1o painel)
  const iGrid = comCebola.indexOf("cebola-grid");
  const iPainel = comCebola.indexOf("cebola-painel");
  t("g18 tabela nunca esta na camada 1 (grade de cartoes)",
    iGrid > -1 && iPainel > iGrid && !comCebola.slice(iGrid, iPainel).includes("<table"));

  // g19 · secao sem numero no corpo nao inventa numero (funcao pura, sem chute)
  const { blocos: blocosCebola } = renderCorpo(mdCebola);
  const { grupos } = agrupaCebola(blocosCebola);
  t("g19 secao com numero no corpo acha o numero",
    grupos[0].numero === "42");
  t("g19 secao sem numero no corpo NAO inventa numero (fica null)",
    grupos[1].numero === null);
  const painelSemNumero = comCebola.slice(comCebola.indexOf(`id="${grupos[1].id}"`) - 400, comCebola.indexOf(`id="${grupos[1].id}"`));
  t("g19 o cartao da secao 2 nao renderiza span de numero",
    !painelSemNumero.includes("cebola-numero"));

  // g21 · IMPRESSAO / PDF (R-PDF-INTEIRO-001) — o papel e destino de primeira classe.
  //       Os dois lados: o que o print ESCONDE e o que ele PRESERVA.
  const impr = semCebolaImplicito;
  const blocoPrint = impr.slice(impr.indexOf("@media print"), impr.indexOf("</style>"));
  t("g21a todo documento carrega bloco de impressao (sem ele o Chrome corta onde calha)",
    impr.includes("@media print") && blocoPrint.length > 100);
  const regraQueEsconde = blocoPrint.replace(/\s+/g, "").match(/[^{}]*\{[^}]*display:none[^}]*\}/g)?.join("") ?? "";
  t("g21b cromo fixo de tela sai do papel (header/sidebar repintam em TODA pagina do PDF)",
    regraQueEsconde.includes(".egos-header") && regraQueEsconde.includes(".egos-sidebar"));
  t("g21c linha de tabela nunca parte no meio, e o cabecalho repete a cada pagina",
    blocoPrint.includes("break-inside:avoid") && blocoPrint.includes("table-header-group"));
  t("g21d proveniencia do gerador nao vai no PDF do cliente (=R-ENTREGA-PURA-001)",
    blocoPrint.includes(".footer-prov") && blocoPrint.includes("display:none"));
  // g21h · R17-a no proprio gerador (achado 25/09): comentario do casa.css NAO viaja no HTML.
  //        Os dois lados: o casa.css continua documentado; o <style> entregue sai sem comentario.
  const cssFonte = readFileSync(CSS, "utf-8");
  const styleEntregue = impr.slice(impr.indexOf("<style>"), impr.indexOf("</style>"));
  t("g21h casa.css segue documentado para quem o mantem (o lado que nao muda)",
    cssFonte.includes("/*") && /R-[A-Z]+(?:-[A-Z]+)*-\d{3}/.test(cssFonte));
  t("g21i o <style> entregue nao carrega nome de regra do kernel, 'corte Enio' nem caminho de script",
    !/R-[A-Z]+(?:-[A-Z]+)*-\d{3}/.test(styleEntregue) && !/corte Enio/i.test(styleEntregue) && !/scripts\//.test(styleEntregue) && !styleEntregue.includes("/*"));
  t("g21j limpaComentariosCss e pura: sem comentario, o CSS volta identico",
    limpaComentariosCss("a{color:red}\nb{margin:0}") === "a{color:red}\nb{margin:0}"
    && limpaComentariosCss("a{color:red}/* x */\n/* R-X-001 corte Enio */b{margin:0}") === "a{color:red}\nb{margin:0}");
  t("g21e papel e A4, nao Letter (default do Chrome headless)",
    blocoPrint.includes("size:A4"));
  t("g21f o print NAO apaga o corpo do documento (senao o PDF sai em branco)",
    !/\.egos-main[^{]*\{[^}]*display:\s*none/.test(blocoPrint) && blocoPrint.includes(".egos-main"));
  const imprCebola = comCebola.slice(comCebola.indexOf("@media print"));
  t("g21g com cebola, o papel abre as camadas fechadas (PDF fechado entrega meio documento)",
    imprCebola.includes("cebola-painel[hidden]") && imprCebola.includes("display:block"));

  // g20 · --check continua funcionando (fresco passa, velho barra) — os dois lados
  const dirTmp = mkdtempSync(join(tmpdir(), "md-para-html-golden-"));
  const mdTmp = join(dirTmp, "doc.md");
  const htmlTmp = join(dirTmp, "doc.html");
  writeFileSync(mdTmp, "# T\n\ncorpo\n");
  writeFileSync(htmlTmp, "<html></html>");
  const agora = new Date();
  const antes = new Date(agora.getTime() - 60_000);
  utimesSync(mdTmp, antes, antes);
  utimesSync(htmlTmp, agora, agora);
  const checkFresco = Bun.spawnSync([process.execPath, import.meta.path, mdTmp, "--check"]);
  t("g20 --check: par fresco (html mais novo que md) sai 0", checkFresco.exitCode === 0);
  utimesSync(mdTmp, agora, agora);
  utimesSync(htmlTmp, antes, antes);
  const checkVelho = Bun.spawnSync([process.execPath, import.meta.path, mdTmp, "--check"]);
  t("g20 --check: par velho (html mais antigo que md) sai != 0 — GATE-FRESCOR", checkVelho.exitCode !== 0);

  // g21 · front-matter `modo: cebola` liga sem flag; sem marcador e sem flag, nao liga
  const mdComFrontMatterCebola = "---\ntitulo: x\nmodo: cebola\n---\n# T\n\ncorpo\n";
  t("g21 front-matter 'modo: cebola' liga o modo sem precisar de --cebola",
    querCebola(mdComFrontMatterCebola, []) && querCebola("# T", ["--cebola"]) && !querCebola("# T", []));

  // g22 · mídia: imagem vira <figure><img>, vídeo vira <video controls>; legenda vira figcaption
  const rMid = renderCorpo("# T\n\n![O lance](midia/lance.mp4)\n\n![Quadro](midia/q.jpg)\n\nTexto ![nao-figura](x.png) no meio.\n");
  const hMid = rMid.blocos.map((b) => b.html).join("\n");
  t("g22 video .mp4 vira <video controls> com figcaption", hMid.includes('<video controls') && hMid.includes('src="midia/lance.mp4"') && hMid.includes("<figcaption>O lance</figcaption>"));
  t("g22 imagem vira <img> com alt", hMid.includes('<img src="midia/q.jpg" alt="Quadro">'));
  t("g22 `![` no MEIO de parágrafo NÃO vira figura (só linha inteira)", rMid.blocos.filter((b) => b.tipo === "figura").length === 2 && hMid.includes("no meio."));
  // g23 · caminho com caractere perigoso é escapado (não injeta HTML)
  const rEsc = renderCorpo("# T\n\n![x](a\"><b.jpg)\n");
  t("g23 src com aspas é escapado (não injeta atributo nem tag)", rEsc.blocos[1].html.includes("&quot;") && !rEsc.blocos[1].html.includes('"><b'));

  // g24 · pureza: id numérico dentro de link NÃO é hash; hash solto continua barrado
  const pLink = auditaPureza("# T\n\nCompre na [Kadri](https://loja.com/produto/1025405) hoje.\n"); // replicavel-ok: URL de fixture do golden, nao e host de ambiente
  const pHash = auditaPureza("# T\n\nregistro 715f2a2a9291 aqui.\n");
  t("g24 id numérico em alvo de link passa limpo", pLink.length === 0);
  t("g24 hash solto no texto continua barrado", pHash.some((x) => x.includes("hash")));

  // g25 · o escape do VOZ-HUMANA-001 deixa RASTRO, e o rastro carrega o PORQUÊ.
  // Escape sem razão registrada é o defeito que o override-ledger nasceu para matar
  // (41 de 41 gravados com "unknown"): vira tecla, não decisão.
  const ledgerTmp = join(mkdtempSync(join(tmpdir(), "voz-esc-")), "escapes.jsonl");
  const envAntes = process.env.EGOS_VOZ_ESCAPES;
  process.env.EGOS_VOZ_ESCAPES = ledgerTmp;
  registrarEscapeVoz("peca.md", "citação literal do cliente", {
    achados: [{ sinal: "travessão", reprova: true }, { sinal: "léxico-bandeira", reprova: false }],
    reprova: true,
  });
  const lido = JSON.parse(readFileSync(ledgerTmp, "utf8").trim());
  t("g25 o escape grava o PORQUÊ, não só o QUE (razão sobrevive fora da sessão)", lido.motivo === "citação literal do cliente");
  t("g25 o escape grava qual sinal foi pulado, e só os reprovados", lido.sinais.length === 1 && lido.sinais[0] === "travessão");

  // g26 · destino impossível: a peça sai, mas a falha é DITA — "não registrei" e
  // "não houve escape" não podem virar a mesma ausência (R13-c).
  process.env.EGOS_VOZ_ESCAPES = "/proc/impossivel/escapes.jsonl";
  let disse = "";
  const errAntes = console.error;
  console.error = (...a: any[]) => { disse += a.join(" "); };
  registrarEscapeVoz("peca.md", "motivo", { achados: [], reprova: true });
  console.error = errAntes;
  t("g26 falha de gravação não lança, mas grita ⚪ (nunca silêncio)", disse.includes("⚪") && disse.includes("o rastro não"));
  if (envAntes === undefined) delete process.env.EGOS_VOZ_ESCAPES; else process.env.EGOS_VOZ_ESCAPES = envAntes;

  // g27 · --externo NÃO afrouxa gate nenhum — prova via CLI real (subprocesso), porque o
  // audit de pureza vive no bloco `import.meta.main`, fora de `monta()`. Peça sob ZONA_ENTREGA
  // com vazamento interno (PCA-12) continua barrada mesmo pedindo apresentação externa.
  const dirExterno = mkdtempSync(join(tmpdir(), "md-para-html-externo-"));
  const dirZona = join(dirExterno, "consulting", "clientes");
  mkdirSync(dirZona, { recursive: true });
  const mdZona = join(dirZona, "doc.md");
  const htmlZona = join(dirZona, "doc.html");
  writeFileSync(mdZona, "# T\n\nReferencia interna PCA-12 vaza aqui.\n");
  const runExterno = Bun.spawnSync([process.execPath, import.meta.path, mdZona, "--saida", htmlZona, "--externo", "Parceiro Teste"]);
  const erroExterno = new TextDecoder().decode(runExterno.stderr);
  t("g27 --externo nao pula R-ENTREGA-PURA-001: PCA-12 continua barrando com a flag presente",
    runExterno.exitCode !== 0 && erroExterno.includes("R-ENTREGA-PURA-001") && !existsSync(htmlZona));

  // g28 · TETO_SLUG corta na PALAVRA INTEIRA, nunca no meio dela (achado na revisão de --externo,
  // 2026-09-25). Os dois lados: o corte que ANTES caía mid-word, e o corte que já caía na
  // fronteira (esse só perde o hífen solto que sobrava).
  t("g28 cortaSlugNaPalavra: cabe no limite, nao mexe", cortaSlugNaPalavra("abc", 10) === "abc");
  t("g28 cortaSlugNaPalavra: corte MID-WORD volta pro ultimo hifen completo (nao para 'viab')",
    cortaSlugNaPalavra("diagnostico-federado-completo-sobre-viabilidade-juridica-antes-de-construir", 40)
      === "diagnostico-federado-completo-sobre");
  t("g28 cortaSlugNaPalavra: corte que ja cai na fronteira so tira o hifen solto",
    cortaSlugNaPalavra("primeira-palavra-bem-grande-demais-para-caber-legalmente-aqui", 40)
      === "primeira-palavra-bem-grande-demais-para");
  t("g28 cortaSlugNaPalavra: palavra unica maior que o limite, sem fronteira nenhuma, mantem o corte cru",
    cortaSlugNaPalavra("a".repeat(50), 40) === "a".repeat(40));
  const rSlugLongo = renderCorpo("# T\n\n## Diagnostico federado completo sobre viabilidade juridica antes de construir\n\ntexto.\n");
  t("g28 o id da secao real nao termina em palavra partida nem em hifen solto",
    rSlugLongo.secoes[0].id === "s1-diagnostico-federado-completo-sobre" && !rSlugLongo.secoes[0].id.endsWith("-"));

  // ── SECAO-RECOLHIDA-001 (<!-- recolher -->) e BLOCO-COPIAVEL-001 (```copiar) ──────────
  // g29 · sem marcador nenhum, a página não muda (mesmo princípio de g16: ternária
  // que não dispara é ternária que não escreve byte nenhum).
  const pagSemRecolher = monta("# T\n\n## S\n\ntexto\n", "x.md", null);
  t("g29 sem <!-- recolher -->, a saida nao contem NENHUM markup/CSS/JS da capacidade",
    !pagSemRecolher.includes("recolhido") && !pagSemRecolher.includes("<details") && !pagSemRecolher.includes("closest"));

  const mdRecolher = [
    "# T",
    "",
    "<!-- recolher -->",
    "## Historia",
    "",
    "parte um.",
    "",
    "### Sub",
    "",
    "parte dois.",
    "",
    "## Numeros",
    "",
    "parte tres sem marcador.",
  ].join("\n");
  const { blocos: bR, secoes: sR } = renderCorpo(mdRecolher);
  const htmlR = bR.map((b) => b.html).join("\n");
  t("g29 o marcador <!-- recolher --> nao aparece na saida", !/recolher\s*-->/.test(htmlR) && !htmlR.includes("<!--"));
  t("g29 a secao marcada vira <details class=recolhido>", htmlR.includes('<details class="recolhido"'));
  const iDet = htmlR.indexOf("<details");
  const iFimDet = htmlR.indexOf("</details>");
  t("g29 o id do details e o MESMO que o h2 teria sem marcador", htmlR.includes(`id="${sR[0].id}"`));
  t("g29 o ### de dentro da secao fica DENTRO do details", htmlR.slice(iDet, iFimDet).includes("parte dois."));
  t("g29 a secao seguinte SEM marcador fica FORA do details", htmlR.indexOf("parte tres sem marcador.") > iFimDet);

  // g29c · outro HTML cru (comentário comum, <details> e <script> digitados à mão) continua
  // escapado como hoje — a capacidade não afrouxa a defesa de XSS/pureza.
  const rManualDetails = renderCorpo("Texto com <script>x()</script> e <details>oi</details> no meio.\n<!-- nota qualquer -->\n");
  const htmlManual = rManualDetails.blocos.map((b) => b.html).join("");
  t("g29c <script> digitado a mao continua escapado", htmlManual.includes("&lt;script&gt;") && !htmlManual.includes("<script>x"));
  t("g29c <details> digitado a mao continua escapado (nao e a marcacao da capacidade)", htmlManual.includes("&lt;details&gt;") && !htmlManual.includes("<details>oi"));
  t("g29c comentario comum continua descartado, so o RECOLHER e especial", !htmlManual.includes("nota qualquer"));

  const pagComRecolher = monta(mdRecolher, "x.md", null);
  t("g29d COM marcador, o CSS/JS da capacidade aparecem (so entao)",
    pagComRecolher.includes("details.recolhido") && pagComRecolher.includes("closest"));
  t("g29e clique na barra lateral / abrir com #id abrem o details (JS presente e aponta pro seletor certo)",
    pagComRecolher.includes("querySelectorAll('.sidebar-link')") && pagComRecolher.includes("el.closest&&el.closest('details.recolhido')"));
  // g29f · R-ENTREGA-PURA-001/R17-a (=g21h/i, que só exercitam o caso sem marcador): o
  // <style> entregue com <!-- recolher --> continua sem comentario nenhum — o CSS novo
  // nao inventa uma segunda porta de vazamento de jargao interno.
  const styleComRecolher = pagComRecolher.slice(pagComRecolher.indexOf("<style>"), pagComRecolher.indexOf("</style>"));
  t("g29f o <style> com <!-- recolher --> ativo continua sem comentario /* */ (mesma regra do g21i, agora tambem no caminho novo)",
    styleComRecolher.includes("details.recolhido") && !styleComRecolher.includes("/*"));

  // g30 · ```copiar``` — dois blocos, ids distintos, botão reaproveita .btn-copiar existente
  const rCopiar = renderCorpo("```copiar\nprimeiro\n```\n\nTexto entre.\n\n```copiar\nsegundo\n```\n");
  const htmlCopiar = rCopiar.blocos.map((b) => b.html).join("\n");
  t("g30 dois blocos ```copiar geram dois botoes com ids DISTINTOS", htmlCopiar.includes('data-alvo="cp-1"') && htmlCopiar.includes('data-alvo="cp-2"'));
  t("g30 cada botao aponta pro PROPRIO <pre> (id casa com data-alvo)", htmlCopiar.includes('id="cp-1"') && htmlCopiar.includes('id="cp-2"'));
  t("g30 conteudo continua escapado dentro do <pre>", htmlCopiar.includes("primeiro") && htmlCopiar.includes("segundo"));
  t("g30 reaproveita a classe .btn-copiar que ja existe (nao inventa botao novo)", (htmlCopiar.match(/class="btn-copiar"/g) || []).length === 2);

  // g30b · ``` normal (sem info-string, ou com outra) NAO ganha botao — so "copiar" e especial
  const rNormal = renderCorpo("```\nconteudo normal\n```\n");
  t("g30b fence sem info-string NAO ganha botao", !rNormal.blocos.some((b) => b.html.includes("btn-copiar")) && rNormal.blocos[0].html.includes('<pre class="bloco-cod">conteudo normal</pre>'));
  const rBash = renderCorpo("```bash\necho oi\n```\n");
  t("g30b fence com OUTRA info-string tambem nao ganha botao", !rBash.blocos.some((b) => b.html.includes("btn-copiar")));

  // ── SENTINELA-E-FRONTEIRA-001 (achado real, corte Enio 2026-09-26, doc de 13 mil
  // palavras): <!-- recolher --> colado a um paragrafo (sem linha em branco antes)
  // vazava 2 bytes NUL pro HTML e nao recolhia a secao seguinte.
  // g31 · marcador COLADO ao paragrafo anterior: fecha o paragrafo E ainda recolhe.
  const mdColado = [
    "# T",
    "",
    "Paragrafo que termina bem aqui.",
    "<!-- recolher -->",
    "## Secao colada",
    "",
    "corpo da secao.",
  ].join("\n");
  const { blocos: bColado } = renderCorpo(mdColado);
  const htmlColado = bColado.map((b) => b.html).join("\n");
  t("g31 marcador colado a paragrafo NAO vaza NUL nem o texto do marcador", !htmlColado.includes("\u0000") && !htmlColado.includes("RECOLHER"));
  t("g31 o paragrafo anterior fecha ANTES do marcador (nao engole a sentinela como texto)", htmlColado.includes("<p>Paragrafo que termina bem aqui.</p>"));
  t("g31 a secao seguinte AINDA recolhe (fronteira reconhecida mesmo colada)", htmlColado.includes('<details class="recolhido"') && htmlColado.includes("Secao colada"));

  // g31b · marcador SEM `## ` imediatamente depois: some sem deixar rastro nenhum.
  const mdSemHeading = [
    "# T",
    "",
    "Paragrafo qualquer.",
    "<!-- recolher -->",
    "Mais texto solto, sem heading algum depois.",
  ].join("\n");
  const { blocos: bSemH } = renderCorpo(mdSemHeading);
  const htmlSemH = bSemH.map((b) => b.html).join("\n");
  t("g31b marcador sem ## depois some sem deixar NUL nem texto do marcador", !htmlSemH.includes("\u0000") && !htmlSemH.includes("RECOLHER"));
  t("g31b nenhum <details> e criado quando nao ha ## imediatamente depois", !htmlSemH.includes("<details"));
  t("g31b o texto antes e depois do marcador continua presente (so a linha do marcador some)",
    htmlSemH.includes("Paragrafo qualquer.") && htmlSemH.includes("Mais texto solto, sem heading algum depois."));

  // g31c · checagem GENERICA e adversarial: marcador escrito DENTRO de um bloco de
  // codigo (o laço do fence não conhece a sentinela — quem garante é a rede de
  // segurança no fim de renderCorpo, não uma lista de caminhos "conhecidos").
  const mdFenceAdversarial = ["# T", "", "```", "<!-- recolher -->", "```", "", "## Depois", "", "texto."].join("\n");
  const { blocos: bFence } = renderCorpo(mdFenceAdversarial);
  const htmlFence = bFence.map((b) => b.html).join("\n");
  t("g31c marcador DENTRO de um bloco de codigo nao vaza NUL (rede de seguranca, nao so o caso feliz)", !htmlFence.includes("\u0000"));
  t("g31c a pagina completa (monta) tambem nunca contem NUL cru", !monta(mdColado, "x.md", null).includes("\u0000"));

  console.log(falhou === 0 ? `🟢 ${ok}/${ok} goldens` : `🔴 ${ok} ok · ${falhou} falharam`);
  return falhou === 0 ? 0 : 1;
}

// CLI só quando executado direto: importar este módulo (o EGOS APP adota renderCorpo
// para a gaveta de conversa, B11 de 06/09) não pode rodar a CLI nem sair do processo.
if (import.meta.main) {
  const args = process.argv.slice(2);
  if (args[0] === "--golden") process.exit(golden());

  const entrada = args[0];
  if (!entrada || !entrada.endsWith(".md")) {
    console.error("uso: bun scripts/md-para-html.ts <arquivo.md> [--saida <x.html>] [--check] [--colar <marcador>] [--fonte-grande] [--cebola] [--externo \"<marca>\"]");
    console.error("     bun scripts/md-para-html.ts --golden");
    process.exit(2);
  }
  if (!existsSync(entrada)) { console.error(`[ERRO] não existe: ${entrada}`); process.exit(1); }

  const iSaida = args.indexOf("--saida");
  const saida = iSaida > -1 ? args[iSaida + 1] : entrada.replace(/\.md$/, ".html");

  if (args.includes("--check")) {
    if (!existsSync(saida)) { console.error(`🔴 par ausente: ${saida}`); process.exit(1); }
    const tMd = statSync(entrada).mtimeMs, tHtml = statSync(saida).mtimeMs;
    if (tHtml < tMd) { console.error(`🔴 GATE-FRESCOR: ${basename(saida)} é mais velho que o .md — regere`); process.exit(1); }
    console.log(`🟢 par fresco: ${basename(saida)}`);
    process.exit(0);
  }

  const md = readFileSync(entrada, "utf-8");

  // LINK-QUEBRA-CALADO-001 — vale para TODA peça, interna ou de cliente: link mutilado não
  // tem lado bom. Fica FORA da zona de entrega de propósito, porque o defeito não depende de
  // quem lê. Barra, e diz o conserto na mesma linha.
  const quebrados = auditaLinksQuebrados(md);
  if (quebrados.length && !args.includes("--permitir-link-quebrado")) {
    console.error(`🔴 LINK-QUEBRA-CALADO-001 — ${basename(entrada)} tem link que o Markdown corta no meio:`);
    for (const q of quebrados) console.error(`   · ${q}`);
    console.error("   → o link abriria a página errada (ou nenhuma), e quem lê culparia a loja.");
    process.exit(1);
  }

  // Zona de entrega externa: aqui a pureza é EXIGIDA, não sugerida.
  const ZONA_ENTREGA = /docs\/presentations\/|consulting\/clientes\/|central-egos\/clients\//;
  if (ZONA_ENTREGA.test(entrada) && !args.includes("--permitir-interno")) {
    const achados = auditaPureza(md);
    if (achados.length) {
      console.error(`🔴 R-ENTREGA-PURA-001 — ${basename(entrada)} é peça de entrega e carrega instrução interna:`);
      for (const a of achados) console.error(`   · ${a}`);
      console.error("   → mova o interno para o handoff/memória, ou gere com --permitir-interno se for peça de uso interno.");
      process.exit(1);
    }

    const circulares = auditaProvaCircular(md);
    if (circulares.length && !args.includes("--permitir-prova-circular")) {
      console.error(
        `🔴 R-PROVA-NAO-E-LINHA-DE-BASE-001 — ${basename(entrada)} apresenta como PROVA um placar que ` +
          `o próprio documento já traz como linha de base:`
      );
      for (const c of circulares) {
        console.error(`   · linha ${c.linha}: "${c.trecho}"`);
        console.error(`     o placar ${c.placar} também aparece na linha ${c.linhaDaBase}, sem alegar prova nenhuma.`);
      }
      console.error(
        "   → suíte que dá o mesmo número antes e depois não prova a mudança. Diga o caso que FALHA sem\n" +
          "     ela (\"reprova sem a correção\", \"mutação vermelha\") ou reescreva a frase para não alegar prova.\n" +
          "     Escape declarado: --permitir-prova-circular"
      );
      process.exit(1);
    }
  }
  // VOZ-HUMANA-001 (corte Enio 2026-09-15): nenhuma peça humana sai sem passar pela skill
  // `voz-humana` — e se esquecermos, não passa em silêncio. O motor conta os sinais
  // mecânicos de texto-de-LLM (travessão, "não é X, é Y", gerúndio, léxico-bandeira);
  // a reescrita é da skill. Fail-closed com escape declarado, porque aviso que não barra
  // é aviso que ninguém lê (=R13-b: cabear não é enforçar).
  const iVozOk = args.indexOf("--voz-ok");
  if (!vozCheck) {
    console.error("⚪ VOZ-HUMANA-001 NÃO-MEDIDO: módulo voz-humana-check não instalado nesta máquina — peça gerada SEM o gate de voz.");
  } else if (iVozOk === -1) {
    const r = analisaVoz(md, basename(entrada));
    if (r.reprova) {
      console.error(`🔴 VOZ-HUMANA-001 — ${basename(entrada)} carrega marca de escrita de LLM:`);
      for (const a of r.achados.filter((x) => x.reprova)) console.error(`   · ${a.sinal}: ${a.detalhe}`);
      console.error("   → rode a skill `voz-humana` e reescreva; depois regere.");
      console.error('   → escape declarado: --voz-ok "<motivo>" (o motivo aparece aqui e no log, nunca no HTML).');
      process.exit(1);
    }
  } else {
    const motivo = args[iVozOk + 1];
    if (!motivo || motivo.startsWith("--")) {
      console.error('🔴 VOZ-HUMANA-001: --voz-ok exige motivo escrito — --voz-ok "<motivo>"');
      process.exit(1);
    }
    // RASTRO-DO-QUE-SAIU-001: o escape PRECISA deixar rastro durável. Até 22/09 esta
    // linha prometia "o motivo aparece aqui e no log" e log nenhum existia — a razão
    // morria no stderr da sessão, e escape sem rastro vira tecla, não decisão
    // (é o mesmo defeito que o override-ledger nasceu para matar: 41/41 "unknown").
    registrarEscapeVoz(basename(entrada), motivo, analisaVoz(md, basename(entrada)));
    console.error(`🟡 VOZ-HUMANA-001 pulada por declaração: ${motivo}`);
    console.error(`   registrado em ${destinoEscapes()}`);
  }

  // --colar <marcador>: recorta a partir do heading que contém o marcador até o próximo `---`
  const iColar = args.indexOf("--colar");
  let colar: string | null = null;
  if (iColar > -1 && args[iColar + 1]) {
    const marcador = args[iColar + 1];
    const re = new RegExp(`^#{1,4}\\s.*${marcador}.*$`, "im");
    const m = md.match(re);
    if (!m || m.index === undefined) { console.error(`[ERRO] --colar: nenhum heading contém "${marcador}"`); process.exit(1); }
    const resto = md.slice(m.index + m[0].length);
    const fim = resto.search(/\n---+\s*\n/);
    colar = textoParaColar(fim > -1 ? resto.slice(0, fim) : resto);
  }

  // A preferência de fonte viaja NO .md (marcador), não só na flag: medido em
  // 2026-09-01 — outra janela regerou este par sem a flag e a fonte grande caiu
  // em silêncio. Preferência que vive na invocação morre na primeira regeração
  // alheia (=R-AUTOHEAL-FONTE-001: a superfície que roda não é a que manda).
  // O destinatário decide o rodapé (DESTINATARIO-DECIDE-O-RODAPE-001). Mesmo sinal que já
  // autoriza marcador interno na peça: `--permitir-interno` diz "isto é nosso".
  const ehInterno = args.includes("--permitir-interno");
  // MARCA-DE-QUEM-LE-001: --externo troca a apresentação (header/rodapé), nunca os
  // gates acima — eles já rodaram sobre `md` antes desta linha, ignorando a flag.
  const externo = pedeExterno(args);
  writeFileSync(saida, monta(md, basename(entrada), colar, querFonteGrande(md, args), querCebola(md, args), ehInterno, externo));
  const n = readFileSync(saida, "utf-8");
  console.log(`🟢 gerado: ${saida}`);
  console.log(`   ${n.split("\n").length} linhas · ${(n.length / 1024).toFixed(1)} KB · refs externas: ${(n.match(/src="http|href="http|@import|cdn\./g) || []).length}`);
}
