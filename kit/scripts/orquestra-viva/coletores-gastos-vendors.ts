#!/usr/bin/env bun
/**
 * coletores-gastos-vendors.ts — fontes 3+4 de GASTOS-VISIVEIS-001 (vendors de API paga via
 * `guarda-limites.ts` + Codex via subprocesso), extraído de `coletores-gastos.ts` por
 * R-REFACTOR-ORG-001 (aquele arquivo cruzou 450 linhas ao consertar GASTOS-VISIVEIS-001/2).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { spawnSync } from "node:child_process";
import { carregarOpcional, motivoAusente } from "./opcional";

// Guarda de limites pessoal: não viaja no kit público. Ausente: vendors = [] E a lacuna é dita
// por `motivoGuardaAusente` (o agregador a põe em `fontes`) — nunca "0 vendors" como se medido.
type Veredito = import("../guarda-limites").Veredito;
const guarda = await carregarOpcional(() => import("../guarda-limites"), "../guarda-limites");
export const motivoGuardaAusente: string | null = guarda ? null : motivoAusente("guarda-limites");

export interface VendorGasto {
  vendor: string;
  slug: string;
  estado: Veredito["estado"];
  gastoUsd: number | null;
  tetoUsd: number | null;
  saldoUsd: number | null;
  pctDoTeto: number | null;
  bloqueado: boolean;
}

export interface CodexGasto {
  janela5hRestantePct: number | null;
  janelaSemanalRestantePct: number | null;
  estado: "green" | "yellow" | "red" | "unknown";
  fonte: string;
}

// ── Vendors de API paga (guarda-limites.ts — ADOTADO, sem disparar main()) ──────────────────

let _cacheVendors: { lidoEm: number; resp: VendorGasto[] } | null = null;
// 5min — medirSaldoOpenRouter faz 1 chamada de rede; poll de 60s do app não deve multiplicar
// isso (R-WPP-ACCESS-001 generalizado: menor nº de chamadas que ainda prova o dado).
const TTL_VENDORS_MS = 5 * 60_000;

/** Só para os goldens injetarem registro/HOME fresco a cada teste (mesmo padrão de
 * `_resetCacheWhatsappParaTeste` em `../uso/seguidor.ts`). */
export function _resetCacheVendorsParaTeste(): void {
  _cacheVendors = null;
}

export async function lerVendors(): Promise<VendorGasto[]> {
  if (!guarda) return [];
  const { lerGuardas, avaliar, medirSaldoOpenRouter } = guarda;
  const agora = Date.now();
  if (_cacheVendors && agora - _cacheVendors.lidoEm < TTL_VENDORS_MS) return _cacheVendors.resp;

  const registro = process.env["EGOS_GUARDA_REGISTRO"] ??
    join(homedir(), "enio-dev", "producao", "egos", "docs", "governance", "INTEGRATION_REGISTRY.md");
  let texto: string;
  try {
    texto = readFileSync(registro, "utf8");
  } catch {
    _cacheVendors = { lidoEm: agora, resp: [] };
    return [];
  }
  const guardas = lerGuardas(texto);
  const precisaSaldo = guardas.some((g) => g.tipo === "saldo_usd");
  const saldoOR = precisaSaldo ? await medirSaldoOpenRouter() : undefined;
  const hoje = new Date();
  const resp: VendorGasto[] = guardas
    .filter((g) => g.tipo === "teto_usd" || g.tipo === "saldo_usd")
    .map((g) => {
      const v = avaliar(g, hoje, g.tipo === "saldo_usd" ? { saldo_usd: saldoOR ?? null } : undefined);
      return {
        vendor: v.vendor,
        slug: v.slug,
        estado: v.estado,
        gastoUsd: v.gasto_usd ?? null,
        tetoUsd: v.teto_usd ?? null,
        saldoUsd: v.saldo_usd ?? null,
        pctDoTeto: v.teto_usd && v.gasto_usd !== undefined ? Number(((v.gasto_usd / v.teto_usd) * 100).toFixed(1)) : null,
        bloqueado: v.bloqueado,
      };
    });
  _cacheVendors = { lidoEm: agora, resp };
  return resp;
}

// ── Codex (rodado como SUBPROCESSO — codex-usage.ts chama main() incondicionalmente) ────────

let _cacheCodex: { lidoEm: number; resp: CodexGasto } | null = null;
const TTL_CODEX_MS = 60_000;

export function lerCodex(): CodexGasto {
  const agora = Date.now();
  if (_cacheCodex && agora - _cacheCodex.lidoEm < TTL_CODEX_MS) return _cacheCodex.resp;

  let resp: CodexGasto = {
    janela5hRestantePct: null,
    janelaSemanalRestantePct: null,
    estado: "unknown",
    fonte: "⚪ NAO-MEDIDO: codex-usage.ts não respondeu",
  };
  try {
    const raiz = join(homedir(), "enio-dev", "producao", "egos");
    const proc = spawnSync("bun", [join(raiz, "scripts", "codex-usage.ts"), "--json"], {
      encoding: "utf8",
      timeout: 10_000,
    });
    if (proc.status === 0 && proc.stdout?.trim()) {
      const j = JSON.parse(proc.stdout.trim()) as {
        window_5h_remaining_pct?: number | null;
        weekly_remaining_pct?: number | null;
        alarm_level?: "green" | "yellow" | "red" | "unknown";
        source?: string;
      };
      resp = {
        janela5hRestantePct: j.window_5h_remaining_pct ?? null,
        janelaSemanalRestantePct: j.weekly_remaining_pct ?? null,
        estado: j.alarm_level ?? "unknown",
        fonte: j.source ?? "⚪ desconhecida",
      };
    }
  } catch (e) {
    resp = {
      janela5hRestantePct: null,
      janelaSemanalRestantePct: null,
      estado: "unknown",
      fonte: `⚪ NAO-MEDIDO: ${(e as Error).message}`,
    };
  }
  _cacheCodex = { lidoEm: agora, resp };
  return resp;
}
