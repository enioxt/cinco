#!/usr/bin/env bun
/**
 * coletores-gastos.ts — GET /api/gastos?periodo=hoje|7d|30d|mes (GASTOS-VISIVEIS-001).
 *
 * Corte do Enio (15/09 17:05): "controle de gastos de todas as nossas sessões, bem visível".
 * Complemento (17:08): "o próprio Claude tem os cálculos" — usa o custo que o PRÓPRIO Claude
 * Code já computa, não uma tabela de preço própria (ver `coletores-gastos-sessoes.ts` para o
 * "o que foi procurado e achado" completo do cost-state — extraído deste arquivo por
 * R-REFACTOR-ORG-001: passou de 500 linhas).
 *
 * JUNÇÃO de 4 fontes — nunca soma `fonte:"claude-code"` (real) com `fonte:"estimado"` (braço)
 * no MESMO número; rankings/série expõem os dois separados:
 *   1. `coletores-gastos-sessoes.ts` — Claude Code REAL, por sessão (cost-state).
 *   2. `../uso/seguidor.ts` (ledger `~/.egos/uso/*.jsonl`) — ESTIMADO, inclui braço (subagente),
 *      que o cost-state NUNCA cobre (medido: 0/849 arquivos de subagente).
 *   3. `../guarda-limites.ts` (`lerGuardas`/`avaliar`) — vendors pagos (gasto/teto/saldo), SEM
 *      disparar `main()` (aquele arquivo já tem `if (import.meta.main)`).
 *   4. `../codex-usage.ts`, rodado como SUBPROCESSO (nunca importado — chama `main()`
 *      incondicionalmente no topo; importar dispararia `codex exec /status` a cada boot).
 *
 * Não achado — janela de assinatura 5h/semanal (`/usage` interativo): procurado em
 * `${DIR_IA}/*.json`, `dashboards/`, `cache/`, `claude doctor`/`--help` — nenhum arquivo local
 * carrega esse número. Fica ⚪ NÃO-MEDIDO, declarado, nunca estimado.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import type { Papel } from "./coletores-gastos-sessoes";
import {
  projectsDirPadrao,
  listarArquivosDeSessaoPrincipal,
  lerSessaoGasto,
  motivoSeguidorAusente,
  TAIL_BYTES,
  type SessaoGasto,
} from "./coletores-gastos-sessoes";
import { estimarUsoSessao, motivoPrecosAusente } from "./coletores-gastos-estimativa";
import { motivoGuardaAusente } from "./coletores-gastos-vendors";

/** Por que a gaveta de gastos NÃO pode ser montada nesta máquina (módulo pessoal ausente), ou null. */
export function motivoGastosIndisponivel(): string | null {
  return motivoSeguidorAusente ?? motivoPrecosAusente;
}
import {
  lerVendors,
  lerCodex,
  _resetCacheVendorsParaTeste,
  type VendorGasto,
  type CodexGasto,
} from "./coletores-gastos-vendors";
import { SEM_DONO } from "./vinculo-sessao-pessoa";

export { _resetCacheVendorsParaTeste };
export type { VendorGasto, CodexGasto } from "./coletores-gastos-vendors";

export type { SessaoGasto, ModeloDeSessao } from "./coletores-gastos-sessoes";

// ── Tipos ────────────────────────────────────────────────────────────────────

export type Periodo = "hoje" | "7d" | "30d" | "mes";

export interface LinhaRankingModelo {
  modelo: string;
  usdReal: number;
  usdEstimadoLedger: number;
}
export interface LinhaRankingPapel {
  papel: Papel;
  usd: number;
  fonte: "claude-code" | "estimado-ledger";
}
export interface LinhaRankingProjeto {
  projeto: string;
  usdReal: number | null; // null = nenhuma sessão do grupo com cost-state (⚪, nunca $0)
  /** Soma de `estimarUsoSessao` das sessões deste projeto sem cost-state — coluna separada,
   * NUNCA somada a `usdReal` (fontes diferentes: cálculo do Claude Code vs. tabela de preço
   * própria — misturar reintroduziria o defeito da família nº5 do CLAUDE.md). */
  usdEstimado: number;
}
export interface LinhaPorPessoa {
  pessoa: string; // nome declarado, ou SEM_DONO ("⚪ sem dono declarado")
  usdReal: number | null; // null = nenhuma sessão da pessoa com cost-state (⚪, nunca $0)
  usdEstimado: number;
  nSessoes: number;
}
export interface DiaSerie {
  data: string; // AAAA-MM-DD
  usdClaudeCodeReal: number;
  usdEstimadoLedger: number;
}

export interface RespostaGastos {
  geradoEm: string;
  periodo: Periodo;
  claudeCode: {
    totalUsd: number;
    sessoes: SessaoGasto[];
    top10: SessaoGasto[];
    nota: string;
    /** "N de M sessões com cálculo do Claude Code" — declara o denominador (R-UNIVERSO-
     * DECLARADO-001): M = sessões com atividade no período, N = quantas tinham cost-state. */
    nSessoesComCostState: number;
    nSessoesTotal: number;
  };
  estimadoLedger: {
    totalUsd: number;
    usdNaoMedidoChamadas: number;
    nota: string;
  };
  rankingModelo: LinhaRankingModelo[];
  rankingPapel: LinhaRankingPapel[];
  rankingProjeto: LinhaRankingProjeto[];
  porPessoa: LinhaPorPessoa[];
  serieDiaria: DiaSerie[];
  codex: CodexGasto;
  vendors: VendorGasto[];
  naoMedido: string[];
  fontes: Record<string, string>;
}

// ── Caminhos ─────────────────────────────────────────────────────────────────

function usoDirPadrao(): string {
  return (process.env.EGOS_USO_OUT_DIR ?? "").trim() || join(homedir(), ".egos", "uso");
}

// ── Janela de dias (AAAA-MM-DD, UTC) coberta pelo período pedido ─────────────

export function diasDoPeriodo(periodo: Periodo, agora: Date): string[] {
  if (periodo === "mes") {
    const out: string[] = [];
    const ano = agora.getUTCFullYear();
    const mes = agora.getUTCMonth();
    for (let d = 1; d <= agora.getUTCDate(); d++) {
      out.push(new Date(Date.UTC(ano, mes, d)).toISOString().slice(0, 10));
    }
    return out;
  }
  const dias = periodo === "hoje" ? 1 : periodo === "7d" ? 7 : 30;
  const out: string[] = [];
  for (let i = 0; i < dias; i++) {
    out.push(new Date(agora.getTime() - i * 86_400_000).toISOString().slice(0, 10));
  }
  return out;
}

// ── Ledger estimado (~/.egos/uso/*.jsonl, gravado por ../uso/seguidor.ts — ADOTADO) ─────────

interface LinhaLedgerMinima {
  ts: string;
  papel: Papel;
  modelo: string;
  usd: number | null;
}

function lerLedgerDoDia(usoDir: string, data: string): { linhas: LinhaLedgerMinima[]; status: string } {
  const caminho = join(usoDir, `${data}.jsonl`);
  if (!existsSync(caminho)) return { linhas: [], status: "ok" };
  try {
    const bruto = readFileSync(caminho, "utf-8");
    const linhas: LinhaLedgerMinima[] = [];
    for (const l of bruto.split("\n")) {
      if (!l.trim()) continue;
      try {
        linhas.push(JSON.parse(l) as LinhaLedgerMinima);
      } catch {
        continue;
      }
    }
    return { linhas, status: "ok" };
  } catch (e) {
    return { linhas: [], status: `⚪ NAO-MEDIDO: ${data}.jsonl ilegível (${(e as Error).message})` };
  }
}

// ── Vendors (fonte 3) + Codex (fonte 4) — extraídos para `coletores-gastos-vendors.ts`
// (R-REFACTOR-ORG-001: este arquivo cruzou 450 linhas ao consertar GASTOS-VISIVEIS-001/2).

// ── Agregador principal (junta as 4 fontes) ───────────────────────────────────

export async function agregarGastos(periodo: Periodo, agoraMs: number = Date.now()): Promise<RespostaGastos> {
  const agora = new Date(agoraMs);
  const dias = new Set(diasDoPeriodo(periodo, agora));
  const desdeMs = Math.min(...Array.from(dias).map((d) => Date.parse(d + "T00:00:00.000Z")));

  const fontes: Record<string, string> = {};
  const naoMedido: string[] = [];

  // ── Fonte 1: Claude Code real, por sessão (+ estimado para quem não tem cost-state) ───────
  const projectsDir = projectsDirPadrao();
  const sessoes: SessaoGasto[] = [];
  let nSessoesComCostState = 0;
  if (!existsSync(projectsDir)) {
    fontes.claudeCodeProjects = `⚪ NAO-MEDIDO: ${projectsDir} não existe`;
  } else {
    const arquivos = listarArquivosDeSessaoPrincipal(projectsDir);
    let semCostState = 0;
    for (const arq of arquivos) {
      const s = lerSessaoGasto(arq);
      if (!s) continue; // arquivo ilegível — o único caso que ainda some (nunca chegou a existir)
      const refMs = s.inicio ? Date.parse(s.inicio) : Date.parse(s.fimArquivo);
      if (refMs < desdeMs) continue;
      if (s.usdReal !== null) {
        nSessoesComCostState++;
        sessoes.push(s);
        continue;
      }
      // Sem cost-state, MAS com atividade no período: NUNCA some da lista (GASTOS-VISIVEIS-001,
      // 15/09) — estima por streaming (custo pago 1x por sessão-sem-cost-state, não por poll:
      // o filtro de período acima já descartou tudo fora da janela antes de chegar aqui).
      semCostState++;
      const est = await estimarUsoSessao(arq);
      sessoes.push({
        ...s,
        usdEstimado: est.usdEstimado,
        modelos: est.modelos,
        hasUnknownModelCost: est.temModeloSemPreco,
      });
    }
    if (semCostState) {
      fontes.claudeCodeCostState =
        `⚪ ${semCostState} sessão(ões) sem cost-state no trecho final lido (~${(TAIL_BYTES / 1024).toFixed(0)}KB) — mantida(s) na lista com custo real ⚪ e, quando possível, estimado a partir de usage`;
    }
  }
  sessoes.sort((a, b) => (b.usdReal ?? 0) + (b.usdEstimado ?? 0) - ((a.usdReal ?? 0) + (a.usdEstimado ?? 0)));
  const totalClaudeCode = sessoes.reduce((acc, s) => acc + (s.usdReal ?? 0), 0);
  const nSessoesTotal = sessoes.length;

  // ── Fonte 2: ledger estimado (todas as chamadas, todos os papéis, inclui braço) ──
  const usoDir = usoDirPadrao();
  let totalLedger = 0;
  let usdNaoMedidoChamadas = 0;
  const porModeloLedger = new Map<string, number>();
  const porPapelLedger = new Map<Papel, number>();
  if (!existsSync(usoDir)) {
    fontes.ledgerUso = `⚪ NAO-MEDIDO: ${usoDir} não existe — ../uso/seguidor.ts nunca rodou nesta máquina`;
  } else {
    for (const data of dias) {
      const { linhas, status } = lerLedgerDoDia(usoDir, data);
      if (status !== "ok") fontes[`ledger-${data}`] = status;
      for (const l of linhas) {
        const t = Date.parse(l.ts);
        if (Number.isFinite(t) && t < desdeMs) continue;
        if (l.usd === null || l.usd === undefined) {
          usdNaoMedidoChamadas++;
          continue;
        }
        totalLedger += l.usd;
        porModeloLedger.set(l.modelo, (porModeloLedger.get(l.modelo) ?? 0) + l.usd);
        porPapelLedger.set(l.papel, (porPapelLedger.get(l.papel) ?? 0) + l.usd);
      }
    }
  }

  // ── Rankings (real, sem braço + estimado, ledger, com braço) ──────────────
  // Só sessões COM cost-state entram em "real" aqui — misturar `modelos` de sessão estimada
  // reintroduziria a família nº5 do CLAUDE.md (números de fontes diferentes somados como um só).
  const porModeloReal = new Map<string, number>();
  for (const s of sessoes) {
    if (s.fonte !== "claude-code") continue;
    for (const m of s.modelos) porModeloReal.set(m.modelo, (porModeloReal.get(m.modelo) ?? 0) + m.usd);
  }
  const modelosVistos = new Set([...porModeloReal.keys(), ...porModeloLedger.keys()]);
  const rankingModelo: LinhaRankingModelo[] = Array.from(modelosVistos)
    .map((modelo) => ({ modelo, usdReal: porModeloReal.get(modelo) ?? 0, usdEstimadoLedger: porModeloLedger.get(modelo) ?? 0 }))
    .sort((a, b) => b.usdReal + b.usdEstimadoLedger - (a.usdReal + a.usdEstimadoLedger));

  const porPapelReal = new Map<Papel, number>();
  for (const s of sessoes) porPapelReal.set(s.papel, (porPapelReal.get(s.papel) ?? 0) + (s.usdReal ?? 0));
  const rankingPapel: LinhaRankingPapel[] = [
    ...Array.from(porPapelReal.entries()).map(([papel, usd]) => ({ papel, usd, fonte: "claude-code" as const })),
    { papel: "braço" as Papel, usd: porPapelLedger.get("braço") ?? 0, fonte: "estimado-ledger" as const },
  ].sort((a, b) => b.usd - a.usd);

  // ── Por projeto — real e estimado em colunas separadas, nunca somados (mesmo motivo acima) ──
  const porProjeto = new Map<string, { real: number; estimado: number; nReal: number }>();
  for (const s of sessoes) {
    const acc = porProjeto.get(s.projeto) ?? { real: 0, estimado: 0, nReal: 0 };
    if (s.usdReal !== null) { acc.real += s.usdReal; acc.nReal += 1; }
    acc.estimado += s.usdEstimado ?? 0;
    porProjeto.set(s.projeto, acc);
  }
  const rankingProjeto: LinhaRankingProjeto[] = Array.from(porProjeto.entries())
    .map(([projeto, v]) => ({ projeto, usdReal: v.nReal ? v.real : null, usdEstimado: v.estimado }))
    .sort((a, b) => (b.usdReal ?? 0) + b.usdEstimado - ((a.usdReal ?? 0) + a.usdEstimado));

  // ── Por pessoa (PESSOA-POR-SESSAO-001) — vínculo declarado à mão; null agrupa em SEM_DONO ──
  const porPessoaAcc = new Map<string, { real: number; estimado: number; n: number; nReal: number }>();
  for (const s of sessoes) {
    const chave = s.pessoa ?? SEM_DONO;
    const acc = porPessoaAcc.get(chave) ?? { real: 0, estimado: 0, n: 0, nReal: 0 };
    if (s.usdReal !== null) { acc.real += s.usdReal; acc.nReal += 1; }
    acc.estimado += s.usdEstimado ?? 0;
    acc.n += 1;
    porPessoaAcc.set(chave, acc);
  }
  const porPessoa: LinhaPorPessoa[] = Array.from(porPessoaAcc.entries())
    .map(([pessoa, v]) => ({ pessoa, usdReal: v.nReal ? v.real : null, usdEstimado: v.estimado, nSessoes: v.n }))
    .sort((a, b) => (b.usdReal ?? 0) + b.usdEstimado - ((a.usdReal ?? 0) + a.usdEstimado));

  // ── Série diária (30 dias sempre, independente do período pedido — item (e) do pedido) ────
  const dias30 = diasDoPeriodo("30d", agora);
  const porDiaReal = new Map<string, number>();
  for (const s of sessoes) {
    if (!s.inicio) continue;
    const d = s.inicio.slice(0, 10);
    porDiaReal.set(d, (porDiaReal.get(d) ?? 0) + (s.usdReal ?? 0));
  }
  const porDiaLedger30 = new Map<string, number>();
  if (existsSync(usoDir)) {
    for (const data of dias30) {
      const { linhas } = lerLedgerDoDia(usoDir, data);
      for (const l of linhas) {
        if (l.usd === null || l.usd === undefined) continue;
        const d = l.ts.slice(0, 10);
        porDiaLedger30.set(d, (porDiaLedger30.get(d) ?? 0) + l.usd);
      }
    }
  }
  const serieDiaria: DiaSerie[] = dias30.slice().sort()
    .map((data) => ({ data, usdClaudeCodeReal: porDiaReal.get(data) ?? 0, usdEstimadoLedger: porDiaLedger30.get(data) ?? 0 }));

  // ── Fonte 3 + 4: vendors (guarda-limites) + Codex (subprocesso) ────────────
  if (motivoGuardaAusente) fontes.vendors = `⚪ NAO-MEDIDO: ${motivoGuardaAusente}`;
  const vendors = await lerVendors();
  const codex = lerCodex();

  naoMedido.push(
    "janela de assinatura 5h/semanal (o que `/usage` mostra numa sessão interativa) — nenhum arquivo local encontrado (ver cabeçalho deste arquivo)",
    "sessões da conta feitas fora desta máquina (web claude.ai, outra máquina) — este coletor só lê `${DIR_IA}/projects/` local",
    "custo REAL de braço (subagente) — Claude Code não emite cost-state para `<sessão>/subagents/**`; só existe estimado via ledger",
  );

  return {
    geradoEm: new Date().toISOString(),
    periodo,
    claudeCode: {
      totalUsd: totalClaudeCode,
      sessoes,
      top10: sessoes.slice(0, 10),
      nota: "fonte: Claude Code (cost-state do próprio transcript) — equivalente-API, NÃO é o que a assinatura cobra (assinatura não cobra por token). Não inclui braço (subagentes).",
      nSessoesComCostState,
      nSessoesTotal,
    },
    estimadoLedger: {
      totalUsd: totalLedger,
      usdNaoMedidoChamadas,
      nota: "fonte: estimado (scripts/lib/precos-claude.ts, via ../uso/seguidor.ts) — inclui todos os papéis, inclusive braço. Diverge do real por ser tabela de preço, não o cálculo do Claude Code.",
    },
    rankingModelo,
    rankingPapel,
    rankingProjeto,
    porPessoa,
    serieDiaria,
    codex,
    vendors,
    naoMedido,
    fontes,
  };
}
