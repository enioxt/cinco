/**
 * Métricas do Guard MCP HTTP — só METADADO, uma linha JSONL por requisição em /mcp.
 *
 * Ligado apenas quando GUARD_MCP_METRICAS_FILE aponta um arquivo (a VPS liga; quem instala
 * pelo npm não grava nada). Por linha: { ts, metodo, ferramenta, ok, ms, http, v, origem, casa, cliente, cliente_v, ua }.
 * origem = hash com sal diário do IP, casa = chamada nossa, cliente = clientInfo do initialize (reduzido), ua = família
 * de lista fechada — ver internal/origem.ts. NUNCA gravado: texto, argumento, resposta, IP, cabeçalho, user-agent. `metodo` e `ferramenta` saem de
 * listas fechadas — nome fora da lista vira "outro"/null, nunca o valor recebido.
 * Falha de gravação vai ao stderr uma vez por processo (dita, não silenciosa); a chamada não cai.
 */
import { appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

export const METODOS = ["initialize", "notifications/initialized", "tools/list", "tools/call", "ping"] as const;

export interface LinhaMetrica {
  ts: string;
  metodo: string;
  ferramenta: string | null;
  ok: boolean;
  ms: number;
  http: number;
  v: string;
  origem?: string;
  casa?: boolean;
  cliente?: string | null;
  cliente_v?: string | null;
  ua?: string;
}

/** Classifica o corpo JSON-RPC já parseado em listas fechadas. Nunca devolve texto do usuário. */
export function classificar(parsed: unknown, ferramentas: readonly string[]): { metodo: string; ferramenta: string | null } {
  if (Array.isArray(parsed)) return { metodo: "lote", ferramenta: null };
  if (!parsed || typeof parsed !== "object") return { metodo: "invalido", ferramenta: null };
  const m = (parsed as { method?: unknown }).method;
  const metodo = typeof m === "string" && (METODOS as readonly string[]).includes(m) ? m : "outro";
  if (metodo !== "tools/call") return { metodo, ferramenta: null };
  const n = (parsed as { params?: { name?: unknown } }).params?.name;
  return { metodo, ferramenta: typeof n === "string" && ferramentas.includes(n) ? n : "outra" };
}

/** Só o booleano "a resposta carregou erro" — o corpo não é guardado nem devolvido. */
export function corpoTemErro(corpo: string): boolean {
  return /"isError"\s*:\s*true/.test(corpo) || /"error"\s*:\s*\{/.test(corpo);
}

let avisou = false;

export function gravarMetrica(arquivo: string | undefined, l: Omit<LinhaMetrica, "ts"> & { ts?: string }): void {
  if (!arquivo) return;
  const linha: LinhaMetrica = {
    ts: l.ts ?? new Date().toISOString(),
    metodo: l.metodo,
    ferramenta: l.ferramenta,
    ok: l.ok,
    ms: Math.round(l.ms),
    http: l.http,
    v: l.v,
    // campos de origem só entram quando o chamador os traz (lista fechada, nesta ordem)
    ...(l.origem !== undefined ? { origem: l.origem, casa: l.casa ?? false, cliente: l.cliente ?? null, cliente_v: l.cliente_v ?? null, ua: l.ua ?? "ausente" } : {}),
  };
  try {
    mkdirSync(dirname(arquivo), { recursive: true, mode: 0o700 });
    appendFileSync(arquivo, JSON.stringify(linha) + "\n", { mode: 0o600 });
  } catch (e) {
    if (!avisou) {
      avisou = true;
      console.error(`[guard-brasil-mcp-http/metricas] NÃO GRAVOU: ${(e as Error).message}`);
    }
  }
}
