#!/usr/bin/env bun
/**
 * coletores-gastos-sessoes.ts — leitor de sessão PRINCIPAL do Claude Code para
 * GASTOS-VISIVEIS-001 (extraído de `coletores-gastos.ts` por R-REFACTOR-ORG-001: aquele
 * arquivo passou de 500 linhas — quebra orgânica, não big-bang, sem perder golden).
 *
 * Achado (15/09, ver `coletores-gastos.ts` para o cabeçalho completo do "o que foi
 * procurado"): cada `${DIR_IA}/projects/<projeto>/<sessionId>.jsonl` (arquivo PRINCIPAL da
 * sessão, nunca os de `<sessão>/subagents/**`) carrega, perto do fim, linha(s)
 * `{"type":"cost-state","sessionId","totalCostUSD","startTime","modelUsage":{...}}` — o
 * PRÓPRIO Claude Code informando o custo real que ele calculou. É cumulativo (medido:
 * 83.90→165.42→192.46→272.08 em 6 emissões do mesmo arquivo) e a ÚLTIMA emissão sempre cai
 * perto do fim do arquivo (medido: 25KB de 44MB; 1,1KB de 15MB; 0,5KB de 13MB) — por isso só
 * lemos os últimos `TAIL_BYTES`, nunca o arquivo inteiro (alguns passam de 40MB; ler tudo a
 * cada poll de 60s do app inviabilizaria o coletor).
 *
 * Correção 15/09 (GASTOS-VISIVEIS-001): sessão cujo `cost-state` cair fora da janela final lida
 * NÃO some mais — `lerSessaoGasto` devolve um "coto" (stub) com `usdReal: null`, `fonte:
 * "estimado"` e `modelos: []`; quem quiser o custo estimado a partir de `message.usage` chama
 * `estimarUsoSessao` (streaming, `coletores-gastos-estimativa.ts`) por cima do mesmo caminho —
 * separado porque aquele é `async` (lê o arquivo inteiro por stream) e este é síncrono (só
 * head+tail, rápido o bastante para rodar em série sobre centenas de arquivos a cada poll).
 * `null` só continua acontecendo quando o ARQUIVO em si não abre (ver `try/catch` abaixo).
 */
import { readdirSync, statSync, openSync, readSync, closeSync, fstatSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { carregarOpcional, motivoAusente } from "./opcional";

// `uso/seguidor` (ledger pessoal de uso) não viaja no kit público. Ausente: `motivoSeguidorAusente`
// diz por quê e a rota de gastos responde `disponivel:false`; chamar `lerSessaoGasto` sem ele
// falha VISÍVEL (nunca inventa papel/projeto).
export type Papel = import("../uso/seguidor").Papel;
const seguidor = await carregarOpcional(() => import("../uso/seguidor"), "../uso/seguidor");
export const motivoSeguidorAusente: string | null = seguidor ? null : motivoAusente("uso/seguidor");
import { lerVinculos, pessoaDaSessao } from "./vinculo-sessao-pessoa";

// ── Tipos ────────────────────────────────────────────────────────────────────

export interface ModeloDeSessao {
  modelo: string;
  usd: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadInputTokens: number;
  cacheCreationInputTokens: number;
}

export interface SessaoGasto {
  sessionId: string;
  sessao8: string;
  projeto: string;
  papel: Papel;
  titulo: string | null;
  inicio: string | null;
  fimArquivo: string;
  /** `null` = sem `cost-state` no trecho lido — NUNCA 0 em silêncio (R13-c). UI mostra ⚪. */
  usdReal: number | null;
  /** Preenchido só quando `usdReal` é `null` e `estimarUsoSessao` já rodou por cima (ver
   * `coletores-gastos-estimativa.ts`); continua `null` até isso acontecer. */
  usdEstimado: number | null;
  modelos: ModeloDeSessao[];
  hasUnknownModelCost: boolean;
  fonte: "claude-code" | "estimado";
  /** Nome declarado à mão em `~/.egos/sessoes-pessoas.json`, ou null — NUNCA "Enio" por
   * inferência (PESSOA-POR-SESSAO-001, =R-ORIGEM-LIMPA-001). */
  pessoa: string | null;
}

// ── Caminhos ─────────────────────────────────────────────────────────────────

export function projectsDirPadrao(): string {
  return (process.env.EGOS_CLAUDE_PROJECTS_DIR ?? "").trim() || join(homedir(), ".claude", "projects");
}

// ── Leitura eficiente de UM .jsonl de sessão principal (head+tail, nunca o arquivo inteiro) ──

export const TAIL_BYTES = 262_144; // 256KB — cost-state/ai-title costumam viver perto do fim
export const HEAD_BYTES = 16_384; // 16KB — a 1ª linha "attachment" (cwd/entrypoint) vive no começo

function lerTrecho(fd: number, tamanhoArquivo: number, inicio: number, bytes: number): string {
  const len = Math.min(bytes, tamanhoArquivo - inicio);
  if (len <= 0) return "";
  const buf = Buffer.alloc(len);
  readSync(fd, buf, 0, len, inicio);
  return buf.toString("utf-8");
}

interface CostStateBruto {
  type: "cost-state";
  sessionId?: string;
  totalCostUSD?: number;
  startTime?: number;
  hasUnknownModelCost?: boolean;
  modelUsage?: Record<
    string,
    {
      inputTokens?: number;
      outputTokens?: number;
      cacheReadInputTokens?: number;
      cacheCreationInputTokens?: number;
      costUSD?: number;
    }
  >;
}

function extrairJson<T>(linhas: string[], tipo: string, ultima: boolean): T | null {
  const candidatas = linhas.filter((l) => l.includes(`"type":"${tipo}"`));
  if (!candidatas.length) return null;
  const escolhida = ultima ? candidatas[candidatas.length - 1]! : candidatas[0]!;
  try {
    return JSON.parse(escolhida) as T;
  } catch {
    return null;
  }
}

// Cache do arquivo de vínculos (mesmo padrão de `_cacheVendors` em coletores-gastos.ts) —
// `lerSessaoGasto` roda 1x por arquivo .jsonl no acervo (pode ser centenas); ler
// `~/.egos/sessoes-pessoas.json` a cada chamada seria FS excessivo para um arquivo pequeno
// que só muda quando o CLI `sessao-pessoa.ts` escreve.
let _cacheVinculos: { lidoEm: number; caminho: string; vinculos: ReturnType<typeof lerVinculos> } | null = null;
const TTL_VINCULOS_MS = 30_000;

/** Só para os goldens forçarem releitura a cada teste (mesmo padrão de `_resetCacheVendorsParaTeste`). */
export function _resetCacheVinculosParaTeste(): void {
  _cacheVinculos = null;
}

function vinculosComCache(): ReturnType<typeof lerVinculos> {
  const caminho = (process.env.EGOS_SESSOES_PESSOAS_PATH ?? "").trim() || "";
  const agora = Date.now();
  if (_cacheVinculos && _cacheVinculos.caminho === caminho && agora - _cacheVinculos.lidoEm < TTL_VINCULOS_MS) {
    return _cacheVinculos.vinculos;
  }
  const vinculos = lerVinculos();
  _cacheVinculos = { lidoEm: agora, caminho, vinculos };
  return vinculos;
}

/**
 * Lê um .jsonl de sessão PRINCIPAL (nunca `<sessão>/subagents/**`, que não tem cost-state) e
 * devolve a sessão de gasto, ou `null` se o cost-state não apareceu no trecho final lido
 * (declarado pelo chamador em `fontes`, nunca tratado como custo zero — R13-c).
 */
export function lerSessaoGasto(caminho: string): SessaoGasto | null {
  let fd: number;
  try {
    fd = openSync(caminho, "r");
  } catch {
    return null;
  }
  try {
    const tamanho = fstatSync(fd).size;
    const head = lerTrecho(fd, tamanho, 0, Math.min(HEAD_BYTES, tamanho));
    const tail = lerTrecho(fd, tamanho, Math.max(0, tamanho - TAIL_BYTES), TAIL_BYTES);

    const linhasHead = head.split("\n").filter(Boolean);
    const linhasTail = tail.split("\n").filter(Boolean);

    const attach = extrairJson<{ cwd?: string; entrypoint?: string; sessionId?: string }>(
      linhasHead,
      "attachment",
      false,
    );
    const cost = extrairJson<CostStateBruto>(linhasTail, "cost-state", true);
    const titulo = extrairJson<{ aiTitle?: string }>(linhasTail, "ai-title", true);

    // Id vem do NOME do arquivo por último recurso, NUNCA só do cost-state — a sessão sem
    // cost-state ainda tem que ser identificável (mesmo achado de `scripts/sessao-pessoa.ts`).
    const idDoArquivo = (caminho.split("/").pop() ?? "").replace(/\.jsonl$/, "");
    const sessionId = cost?.sessionId ?? attach?.sessionId ?? (idDoArquivo || "⚪");
    if (!seguidor) throw new Error(motivoAusente("uso/seguidor"));
    const { tenantDeCwd, derivarPapel } = seguidor;
    const { papel } = derivarPapel({
      filePath: caminho,
      entrypoint: attach?.entrypoint ?? null,
      sessionId,
    });
    const fimArquivo = new Date(statSync(caminho).mtimeMs).toISOString();
    const pessoa = pessoaDaSessao(sessionId, vinculosComCache());

    if (!cost || typeof cost.totalCostUSD !== "number") {
      // Coto (stub): sessão PRINCIPAL sem cost-state no trecho final lido. Antes disparava
      // `return null` e a sessão simplesmente sumia de toda tabela (GASTOS-VISIVEIS-001,
      // achado 15/09). Fica visível com `usdReal: null` (⚪, nunca 0) — `usdEstimado` só é
      // preenchido por quem chamar `estimarUsoSessao` por cima (aggregator decide quando vale
      // o custo de ler o arquivo inteiro).
      return {
        sessionId,
        sessao8: sessionId.slice(0, 8),
        projeto: tenantDeCwd(attach?.cwd),
        papel,
        titulo: titulo?.aiTitle ?? null,
        inicio: null,
        fimArquivo,
        usdReal: null,
        usdEstimado: null,
        modelos: [],
        hasUnknownModelCost: false,
        fonte: "estimado",
        pessoa,
      };
    }

    const modelos: ModeloDeSessao[] = Object.entries(cost.modelUsage ?? {}).map(([modelo, u]) => ({
      modelo,
      usd: u.costUSD ?? 0,
      inputTokens: u.inputTokens ?? 0,
      outputTokens: u.outputTokens ?? 0,
      cacheReadInputTokens: u.cacheReadInputTokens ?? 0,
      cacheCreationInputTokens: u.cacheCreationInputTokens ?? 0,
    }));

    return {
      sessionId,
      sessao8: sessionId.slice(0, 8),
      projeto: tenantDeCwd(attach?.cwd),
      papel,
      titulo: titulo?.aiTitle ?? null,
      inicio: typeof cost.startTime === "number" ? new Date(cost.startTime).toISOString() : null,
      fimArquivo,
      usdReal: cost.totalCostUSD,
      usdEstimado: null,
      modelos,
      hasUnknownModelCost: cost.hasUnknownModelCost ?? false,
      fonte: "claude-code",
      pessoa,
    };
  } finally {
    closeSync(fd);
  }
}

/** Todos os .jsonl de sessão PRINCIPAL (exclui `<sessão>/subagents/**`) sob `projectsDir`. */
export function listarArquivosDeSessaoPrincipal(projectsDir: string): string[] {
  const out: string[] = [];
  let projetos: string[];
  try {
    projetos = readdirSync(projectsDir);
  } catch {
    return out;
  }
  for (const proj of projetos) {
    const dirProj = join(projectsDir, proj);
    let itens: string[];
    try {
      itens = readdirSync(dirProj);
    } catch {
      continue;
    }
    for (const item of itens) {
      if (item.endsWith(".jsonl")) out.push(join(dirProj, item));
    }
  }
  return out;
}
