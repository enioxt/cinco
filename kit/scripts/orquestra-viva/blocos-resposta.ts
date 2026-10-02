// RV-2-BLOCOS-001 (corte Enio 2026-09-08) — toda resposta longa do agente termina em
// 3 blocos fixos (📊 Diagnóstico · 🕳️ O que ficou de fora · ➡️ PRÓXIMA TASK). O
// renderCorpo (md-para-html.ts) não conhece esses marcadores — vira "###" genérico.
// Este módulo é PURO (zero rede, zero relógio, zero I/O): recebe o texto do turno,
// devolve os blocos separados ou `null` quando os 3 marcadores não aparecem — turno
// sem blocos renderiza exatamente como hoje, nada quebra (R-DECIDE-DETERMINISTICO-001).
//
// Medido no turno real desta sessão (b1e96cf0…, linha 5556): o marcador NÃO fica
// sozinho numa linha de cabeçalho — vem inline, "📊 **Diagnóstico** — texto..." no
// mesmo parágrafo. O parser casa só o PREFIXO da linha (nunca a linha inteira) e
// trata o resto da linha como início do conteúdo do bloco — cobre as duas formas
// (cabeçalho isolado ou inline) sem 2 caminhos de código.

export type CorSemaforo = "verde" | "amarelo" | "vermelho" | "branco";

export interface ItemSemaforo {
  cor: CorSemaforo;
  texto: string;
}

export interface OpcaoPCA {
  letra: string;
  rotulo: string;
  argumento: string;
}

export interface BlocoPCA {
  id: string;
  titulo: string;
  decido: string;
  opcoes: OpcaoPCA[];
  recomendo: { letra: string; porque: string };
  escolhiPor: string;
  fechaQuando: string;
  responder: string;
}

export interface BlocosResposta {
  corpo: string;
  diagnostico: string;
  diagnosticoItens: ItemSemaforo[];
  fora: string;
  proxima: string;
  escolhiPor: string;
  shas: string[];
  pca: BlocoPCA | null;
}

export interface Leigo {
  diagnostico: string;
  fora: string;
  proxima: string;
  pca: string;
}

// Cópia deliberada do regex de md-para-html.ts:237 (`MARCADORES_INTERNOS`, hash de
// commit/registro) — lá é usado sem flag `g` dentro de um array de auditoria de
// pureza; aqui precisamos de TODAS as ocorrências, então a cópia leva `g`. Pedido
// do task: "reuse se exportado; se não for, copie e diga" — não é exportado.
const RE_SHA = /\b[0-9a-f]{7,40}\b(?=[\s`)]|$)/g;

// Prefixo de linha — NUNCA a linha inteira: o texto do bloco pode continuar na
// mesma linha, depois do marcador (forma inline medida em produção).
const RE_DIAG_PREFIXO = /^\s*#{0,3}\s*📊\s*\*{0,2}\s*Diagn[óo]stico\s*\*{0,2}\s*/i;
const RE_FORA_PREFIXO = /^\s*#{0,3}\s*🕳️\s*\*{0,2}\s*O que ficou de fora\s*\*{0,2}\s*/i;
const RE_PROX_PREFIXO = /^\s*#{0,3}\s*➡️\s*\*{0,2}\s*PR[ÓO]XIMA TASK\s*/i;
const RE_ESCOLHI = /^escolhi por:\s*(.*)$/i;
const RE_EMOJI_ITEM = /🟢|🟡|🔴|⚪/g;
const CORES: Record<string, CorSemaforo> = { "🟢": "verde", "🟡": "amarelo", "🔴": "vermelho", "⚪": "branco" };

function semAsteriscos(s: string): string { return s.replace(/\*\*/g, ""); }

/** Remove o traço de item de lista ("\n- ") que sobra colado no fim de um segmento
 *  quando o bloco vem no formato "- 🟢 texto\n- 🟡 texto" (lista, não parágrafo). */
function limparCaudaDeLista(s: string): string { return s.replace(/\n[-*]\s*$/, ""); }

/** Itens do 📊: varre TODO o conteúdo do bloco por emoji de semáforo (cobre lista
 *  "- 🟢 item" linha a linha E parágrafo inline "🟢 texto. ⚪ texto." no mesmo
 *  parágrafo — mesma varredura, sem 2 caminhos). Sem nenhum emoji → [] (o
 *  chamador cai para prosa simples, não é erro). */
function extrairItens(bloco: string): ItemSemaforo[] {
  const marcas = [...bloco.matchAll(RE_EMOJI_ITEM)];
  const itens: ItemSemaforo[] = [];
  for (let k = 0; k < marcas.length; k++) {
    const m = marcas[k];
    const cor = CORES[m[0]];
    const inicio = (m.index ?? 0) + m[0].length;
    const fim = k + 1 < marcas.length ? (marcas[k + 1].index ?? bloco.length) : bloco.length;
    const texto = semAsteriscos(limparCaudaDeLista(bloco.slice(inicio, fim))).trim();
    if (texto) itens.push({ cor, texto });
  }
  return itens;
}

function extrairShas(texto: string): string[] {
  const achados = texto.match(RE_SHA) ?? [];
  return [...new Set(achados)];
}

// RV-4-CAMINHOS-001 (corte Enio 08/09) — caminho de arquivo citado em prosa livre vira
// link clicável na gaveta CONVERSA (via /api/documentos/abrir, já fail-closed). Puro,
// sem disco: só reconhece a FORMA do caminho (Unix relativo ou absoluto, com extensão),
// nunca confirma existência aqui — quem confirma é a rota. URL (http/https/wa.me) é
// removida ANTES de casar, para "https://x.dev/a/b.js" não virar "a/b.js" citado.
const RE_URL_OU_WA = /(?:https?:\/\/|wa\.me\/)\S+/gi;
const RE_CAMINHO = /\/?(?:[\w.-]+\/)+[\w.-]+\.[A-Za-z0-9]{1,6}\b/g;

// RV-7-RESPOSTA-CLICAVEL-E-LEIGA-001 (corte Enio 08/09) — PCA embutida na PRÓXIMA TASK
// (print 08/09 14:25: "# 🔵 PCA-80", "### ❓ Decido", "### 🔀 Opções", opções em ">",
// "### ⭐ Recomendo → 🅰", "### escolhi por:", "### ✅ Fecha quando ... Responder:").
// Formato-fonte (AGENTS.md §Formato da PCA — VISUAL): cabeçalho H1 "# 🔵 PCA-N · título",
// Recomendo e Fecha-quando podem trazer o conteúdo NA MESMA linha do marcador — por isso
// cada regex captura o resto da linha como grupo (não usa acharMarcador, que fatia por
// posição de caractere, porque aqui o grupo interessa isolado do prefixo variável).
const RE_PCA_HEADER = /^\s*#{1,2}\s*🔵\s*(PCA-\d+)\s*(?:[·:-]\s*(.*))?$/i;
const RE_PCA_DECIDO = /^\s*#{2,3}\s*❓\s*Decido\b\s*[:\-—]?\s*(.*)$/i;
const RE_PCA_OPCOES_HDR = /^\s*#{2,3}\s*🔀\s*Op[çc][õo]es\b.*$/i;
const RE_PCA_RECOMENDO_HDR = /^\s*#{2,3}\s*⭐\s*Recomendo\b\s*(.*)$/i;
const RE_PCA_ESCOLHI_HDR = /^\s*#{0,3}\s*escolhi por:\s*(.*)$/i;
const RE_PCA_FECHA_HDR = /^\s*#{2,3}\s*✅\s*Fecha quando\b\s*(.*)$/i;
// R-PARIDADE-REAL-001 nota técnica: 🅰🅱🅲🅳 são pares substitutos (astral, U+1F170+) — DENTRO
// de uma classe de caracteres [🅰🅱...] sem a flag `u` o regex parte o par em 2 unidades
// UTF-16 e casa errado (medido: exec devolvia "\ud83c" isolado). Alternação de literais
// inteiros (🅰|🅱|🅲|🅳) não sofre disso — mesmo efeito, sem precisar da flag `u`.
const RE_PCA_OPCAO_LINHA = /^\s*>\s*(?:(🅰|🅱|🅲|🅳)|([A-Da-d])\))\s*(.*)$/;
const LETRA_EMOJI: Record<string, string> = { "🅰": "a", "🅱": "b", "🅲": "c", "🅳": "d" };
const RE_RESPONDER = /💬\s*Responder:\s*`?([^`\n]+)`?/i;
const RE_SETA_INICIO = /^(?:→|->)\s*/;
const RE_LETRA_INICIO = /^(?:(🅰|🅱|🅲|🅳)|([A-Da-d])\)?)\s*/;

/** Parser de PCA: opções obrigatórias em bloqueio "> 🅰 rótulo — argumento" (ou "> A)").
 *  Puro, tolerante à ordem "Recomendo"/"Fecha quando" trazerem o conteúdo na própria
 *  linha do marcador (formato real) ou nas linhas seguintes (formato multi-linha).
 *  Sem "Responder:" explícito, deriva `PCA-N: <letra recomendada>` (R-DECIDE-DETERMINISTICO-001:
 *  nunca inventa a letra — usa a que "Recomendo" já apontou, ou a 1ª opção se o parse da
 *  letra de "Recomendo" falhar). Falta de qualquer seção obrigatória (Decido/Opções/
 *  Recomendo/≥1 opção válida) devolve null — nunca uma PCA pela metade. */
export function separarPCA(texto: string): BlocoPCA | null {
  if (!texto) return null;
  const linhas = texto.split("\n");

  const hdr = acharLinhaComMatch(linhas, RE_PCA_HEADER, 0);
  if (!hdr) return null;
  const id = (hdr.m[1] || "").toUpperCase();
  const titulo = (hdr.m[2] || "").trim();

  const decidoHdr = acharLinhaComMatch(linhas, RE_PCA_DECIDO, hdr.indice + 1);
  if (!decidoHdr) return null;
  const opcoesHdr = acharLinhaComMatch(linhas, RE_PCA_OPCOES_HDR, decidoHdr.indice + 1);
  if (!opcoesHdr) return null;
  const recomendoHdr = acharLinhaComMatch(linhas, RE_PCA_RECOMENDO_HDR, opcoesHdr.indice + 1);
  if (!recomendoHdr) return null;

  const decido = montarConteudo(decidoHdr.m[1] ?? "", linhas, decidoHdr.indice + 1, opcoesHdr.indice);

  const opcoes: OpcaoPCA[] = [];
  for (let i = opcoesHdr.indice + 1; i < recomendoHdr.indice; i++) {
    const m = RE_PCA_OPCAO_LINHA.exec(linhas[i]);
    if (!m) continue;
    const letra = m[1] ? LETRA_EMOJI[m[1]] : (m[2] ?? "").toLowerCase();
    const { rotulo, argumento } = dividirRotuloArgumento(semAsteriscos(m[3] ?? ""));
    if (letra && rotulo) opcoes.push({ letra, rotulo, argumento });
  }
  if (!opcoes.length) return null;

  const escolhiHdr = acharLinhaComMatch(linhas, RE_PCA_ESCOLHI_HDR, recomendoHdr.indice + 1);
  const fechaHdr = acharLinhaComMatch(linhas, RE_PCA_FECHA_HDR, (escolhiHdr ? escolhiHdr.indice : recomendoHdr.indice) + 1);

  const fimRecomendo = escolhiHdr ? escolhiHdr.indice : (fechaHdr ? fechaHdr.indice : linhas.length);
  const recomendoTexto = montarConteudo(recomendoHdr.m[1] ?? "", linhas, recomendoHdr.indice + 1, fimRecomendo);
  const semSeta = recomendoTexto.replace(RE_SETA_INICIO, "");
  const mLetra = RE_LETRA_INICIO.exec(semSeta);
  let letraRecomendo = "";
  let porque = semSeta;
  if (mLetra) {
    letraRecomendo = mLetra[1] ? LETRA_EMOJI[mLetra[1]] : (mLetra[2] ?? "").toLowerCase();
    porque = semSeta.slice(mLetra[0].length).replace(/^—\s*/, "").trim();
  }

  const escolhiPor = escolhiHdr
    ? montarConteudo(escolhiHdr.m[1] ?? "", linhas, escolhiHdr.indice + 1, fechaHdr ? fechaHdr.indice : linhas.length).trim()
    : "";

  const fechaBlocoRaw = fechaHdr ? montarConteudo(fechaHdr.m[1] ?? "", linhas, fechaHdr.indice + 1, linhas.length) : "";
  const mResp = RE_RESPONDER.exec(fechaBlocoRaw);
  const letraFinal = letraRecomendo || opcoes[0].letra;
  const responder = mResp ? mResp[1].trim() : `${id}: ${letraFinal}`;
  const fechaQuando = fechaBlocoRaw
    .replace(RE_RESPONDER, "")
    .replace(/[·⋅]\s*$/, "")
    .trim()
    .replace(/^[—-]\s*/, "");

  return { id, titulo, decido, opcoes, recomendo: { letra: letraRecomendo, porque }, escolhiPor, fechaQuando, responder };
}

export function extrairCaminhos(texto: string): string[] {
  if (!texto) return [];
  const semUrls = texto.replace(RE_URL_OU_WA, " ");
  const achados = semUrls.match(RE_CAMINHO) ?? [];
  return [...new Set(achados)];
}

/** Acha a 1ª linha cujo INÍCIO casa o marcador; devolve {indice, resto} onde `resto`
 *  é o que sobrou da própria linha depois do marcador (pode ser texto, não só ""). */
function acharMarcador(linhas: string[], re: RegExp, apartirDe: number): { indice: number; resto: string } | null {
  for (let i = apartirDe; i < linhas.length; i++) {
    const m = re.exec(linhas[i]);
    if (m) return { indice: i, resto: linhas[i].slice(m[0].length) };
  }
  return null;
}

/** Acha a 1ª linha que casa o marcador e devolve o MATCH inteiro (com grupos) —
 *  usado pela PCA, onde o "resto" que interessa é um grupo capturado, não tudo que
 *  sobra depois do casamento inteiro (marcadores da PCA têm sufixo variável, ex.:
 *  "Recomendo → 🅰 — texto", o grupo já isola só o "→ 🅰 — texto"). */
function acharLinhaComMatch(linhas: string[], re: RegExp, apartirDe: number): { indice: number; m: RegExpExecArray } | null {
  for (let i = apartirDe; i < linhas.length; i++) {
    const m = re.exec(linhas[i]);
    if (m) return { indice: i, m };
  }
  return null;
}

function dividirRotuloArgumento(txt: string): { rotulo: string; argumento: string } {
  const idx = txt.indexOf("—");
  if (idx === -1) return { rotulo: txt.trim(), argumento: "" };
  return { rotulo: txt.slice(0, idx).trim(), argumento: txt.slice(idx + 1).trim() };
}

/** Conteúdo de um bloco: o resto da linha do marcador + as linhas seguintes, até
 *  (exclusive) a linha do próximo marcador (ou até o fim). */
function montarConteudo(resto: string, linhas: string[], depoisDe: number, ate: number): string {
  const corpo = [resto, ...linhas.slice(depoisDe, ate)].join("\n").trim();
  return semAsteriscos(corpo);
}

export function separarBlocos(texto: string): BlocosResposta | null {
  if (!texto) return null;
  const linhas = texto.split("\n");

  const diag = acharMarcador(linhas, RE_DIAG_PREFIXO, 0);
  if (!diag) return null;
  const fora = acharMarcador(linhas, RE_FORA_PREFIXO, diag.indice + 1);
  if (!fora) return null;
  const prox = acharMarcador(linhas, RE_PROX_PREFIXO, fora.indice + 1);
  if (!prox) return null;

  const corpo = semAsteriscos(linhas.slice(0, diag.indice).join("\n").trim());
  const blocoDiag = montarConteudo(diag.resto, linhas, diag.indice + 1, fora.indice);
  const blocoFora = montarConteudo(fora.resto, linhas, fora.indice + 1, prox.indice);

  const restoProxLinhas = [prox.resto, ...linhas.slice(prox.indice + 1)];

  // RV-7-RESPOSTA-CLICAVEL-E-LEIGA-001: a PRÓXIMA TASK pode carregar uma PCA embutida
  // (formato medido no print 08/09) — tudo ANTES do cabeçalho da PCA continua sendo
  // "próxima"/"escolhi por" normais; a partir dali vira o campo `pca` próprio.
  let iPca = -1;
  for (let i = 0; i < restoProxLinhas.length; i++) {
    if (RE_PCA_HEADER.test(restoProxLinhas[i])) { iPca = i; break; }
  }
  // "---" isola a PCA (AGENTS.md §Formato da PCA — VISUAL) — separador, não conteúdo
  // da próxima task; some junto quando presente na linha imediatamente anterior.
  if (iPca > 0 && restoProxLinhas[iPca - 1].trim() === "---") iPca -= 1;
  const linhasAntesDaPca = iPca === -1 ? restoProxLinhas : restoProxLinhas.slice(0, iPca);
  const pca = iPca === -1 ? null : separarPCA(restoProxLinhas.slice(iPca).join("\n"));

  let iEscolhi = -1;
  for (let i = 0; i < linhasAntesDaPca.length; i++) {
    if (RE_ESCOLHI.test(linhasAntesDaPca[i].trim())) { iEscolhi = i; break; }
  }
  const proxima = semAsteriscos(
    (iEscolhi === -1 ? linhasAntesDaPca : linhasAntesDaPca.slice(0, iEscolhi)).join("\n").trim()
  );
  const escolhiPor = iEscolhi === -1 ? "" : (RE_ESCOLHI.exec(linhasAntesDaPca[iEscolhi].trim())?.[1] ?? "").trim();

  return {
    corpo,
    diagnostico: blocoDiag,
    diagnosticoItens: extrairItens(blocoDiag),
    fora: blocoFora,
    proxima,
    escolhiPor,
    shas: extrairShas(texto),
    pca,
  };
}

// ── FATIA 4: TRADUÇÃO PARA LEIGOS (RV-7, corte Enio 08/09) ──────────────────────────
// 1 manchete determinística por bloco — sem LLM (o erro se vê lendo; camada LLM fica
// fatia futura declarada, não construída aqui). Bloco vazio → manchete vazia: nunca
// inventa conteúdo que o turno não tinha (R-DECIDE-DETERMINISTICO-001).
function primeiraFrase(txt: string): string {
  const t = (txt || "").trim();
  if (!t) return "";
  const m = /^[^.]*\./.exec(t);
  return (m ? m[0] : t).trim();
}

/** Conta "coisas" em 🕳️: 1 por item de lista ("- "/"* "); sem marcador de lista, o
 *  parágrafo inteiro conta como 1 coisa (nunca 0 quando há texto). */
function contarCoisasFora(txt: string): number {
  if (!txt || !txt.trim()) return 0;
  const itens = txt.split("\n").filter((l) => /^\s*[-*]\s+\S/.test(l));
  return itens.length || 1;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escaparAtributo(s: string): string {
  return String(s || "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Vocabulário vem de config/vocabulario.json (shape solta — sem tipo próprio nesta fatia).
type VocabTermo = { humano?: string; gloss?: string; explicacao?: string; termos?: string[] };
type Vocab = { termo?: Record<string, VocabTermo> } | null | undefined;

/** 1 termo do VOCAB por manchete vira <abbr data-tt-titulo="gloss">termo</abbr> — nunca
 *  aninha (para no 1º achado), nunca reescreve o resto da frase. */
function aplicarVocab(manchete: string, vocab: Vocab): string {
  if (!manchete || !vocab || !vocab.termo) return manchete;
  for (const chave of Object.keys(vocab.termo)) {
    const v = vocab.termo[chave];
    const candidatos = [v.humano, ...(v.termos || [])].filter(Boolean) as string[];
    for (const termo of candidatos) {
      const re = new RegExp(`\\b${escapeRegExp(termo)}\\b`, "i");
      const m = re.exec(manchete);
      if (m) {
        const gloss = v.gloss || v.explicacao || "";
        return (
          manchete.slice(0, m.index) +
          `<abbr data-tt-titulo="${escaparAtributo(gloss)}">${m[0]}</abbr>` +
          manchete.slice((m.index ?? 0) + m[0].length)
        );
      }
    }
  }
  return manchete;
}

/** Pura: recebe o resultado de separarBlocos (ou null) + o VOCAB (config/vocabulario.json,
 *  já carregado pelo chamador) e devolve 1 manchete curta por bloco, sem jargão. Ordem dos
 *  itens de diagnosticoItens não muda a contagem (soma por cor, não por posição). */
export function traduzirParaLeigo(bloco: BlocosResposta | null, vocab: Vocab): Leigo {
  if (!bloco) return { diagnostico: "", fora: "", proxima: "", pca: "" };

  const itens = bloco.diagnosticoItens || [];
  let diagnostico = "";
  if (itens.length) {
    const v = itens.filter((i) => i.cor === "verde").length;
    const a = itens.filter((i) => i.cor === "amarelo").length;
    const r = itens.filter((i) => i.cor === "vermelho").length;
    diagnostico = `${itens.length} medições: ${v} verdes, ${a} amarelas, ${r} vermelhas`;
    const primeiroVermelho = itens.find((i) => i.cor === "vermelho");
    if (primeiroVermelho) diagnostico += ` — ${primeiraFrase(primeiroVermelho.texto)}`;
  } else if (bloco.diagnostico && bloco.diagnostico.trim()) {
    diagnostico = primeiraFrase(bloco.diagnostico);
  }

  const nFora = contarCoisasFora(bloco.fora);
  const fora = nFora > 0 ? `${nFora} coisa${nFora === 1 ? "" : "s"} ficaram de fora deste pedido` : "";

  const proxima = bloco.proxima && bloco.proxima.trim() ? primeiraFrase(bloco.proxima) : "";

  const pca = bloco.pca && bloco.pca.decido ? `Você precisa decidir: ${bloco.pca.decido}` : "";

  return {
    diagnostico: aplicarVocab(diagnostico, vocab),
    fora: aplicarVocab(fora, vocab),
    proxima: aplicarVocab(proxima, vocab),
    pca: aplicarVocab(pca, vocab),
  };
}
