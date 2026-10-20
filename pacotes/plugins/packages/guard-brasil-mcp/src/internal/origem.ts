/**
 * Origem das chamadas do Guard MCP HTTP (19/10/2026) — mesmo padrão do gateway (mcp-unified-gateway/src/telemetria.ts),
 * SEM importar dele (este pacote é publicado sozinho no npm).
 *
 *  - origem  = sha256(sal DO DIA + "|" + IP) cortado em 12 hex. O sal é o MESMO arquivo `sal-AAAA-MM-DD` da pasta de telemetria
 *              (a do arquivo de métricas), dia de Brasília; ao nascer o sal do dia os de ontem são apagados. IP cru NUNCA é gravado.
 *  - casa    = true quando a chamada é nossa: header x-egos-casa com o HMAC do dia (mesmo segredo e fórmula do gateway,
 *              primeiro-uso.ts) OU IP de loopback/Tailscale/lista GUARD_MCP_CASA_IPS (IPs exatos e CIDR IPv4: VPS, casa)
 *              OU user-agent com prefixo de GUARD_MCP_CASA_UA (SINAL FRACO: user-agent se falsifica; vazio por padrão).
 *  - cliente = clientInfo.name/version do `initialize`. O servidor é stateless (sem Mcp-Session-Id), então o cliente é guardado em
 *              MEMÓRIA, por origem-do-dia (ou por Mcp-Session-Id se o cliente mandar um), e carimbado nos tools/call seguintes.
 *              Texto livre do cliente é reduzido a [a-z0-9._-] e cortado (nome 40, versão 20).
 *  - ua      = FAMÍLIA do user-agent, de lista fechada; o texto do user-agent nunca é gravado.
 */
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BRT_MS = 3 * 3_600_000;
/** Dia de Brasília (o mesmo do sal e do teto do gateway). */
export const diaBrt = (ms: number): string => new Date(ms - BRT_MS).toISOString().slice(0, 10);

const cacheSal = new Map<string, string>();
export function _zerarCacheSal(): void { cacheSal.clear(); }

/** Sal do dia, na pasta de telemetria. Sem disco gravável: sal por processo e por dia (dito, não escondido). */
export function salDoDia(dir: string, dia: string): string {
  const chave = `${dir}|${dia}`;
  const c = cacheSal.get(chave);
  if (c) return c;
  const f = join(dir, `sal-${dia}`);
  let v: string;
  try {
    if (existsSync(f)) v = readFileSync(f, "utf8").trim();
    else {
      mkdirSync(dir, { recursive: true, mode: 0o700 });
      v = randomBytes(16).toString("hex");
      writeFileSync(f, v, { mode: 0o600 });
      for (const n of readdirSync(dir)) if ((n === "sal" || n.startsWith("sal-")) && n !== `sal-${dia}`) rmSync(join(dir, n), { force: true });
    }
  } catch {
    v = randomBytes(16).toString("hex"); // silencio-ok: sal efêmero por processo; a origem do dia continua consistente dentro dele
  }
  for (const k of cacheSal.keys()) if (k.startsWith(`${dir}|`)) cacheSal.delete(k);
  cacheSal.set(chave, v);
  return v;
}

export function hashOrigem(ip: string, dir: string, agora = Date.now()): string {
  return createHash("sha256").update(salDoDia(dir, diaBrt(agora)) + "|" + ip).digest("hex").slice(0, 12);
}

// ── casa ───────────────────────────────────────────────────────────────────────────────────────────────────────

/** Assinatura do dia (UTC) — idêntica a assinaturaDoDia do gateway (primeiro-uso.ts); teste fixa o vetor. */
export function assinaturaDoDia(segredo: string, agora = Date.now()): string {
  return createHmac("sha256", segredo).update("egos-casa|" + new Date(agora).toISOString().slice(0, 10)).digest("hex").slice(0, 32);
}

function segredoCasa(env: NodeJS.ProcessEnv): string | null {
  const arq = env.EGOS_CASA_SEGREDO_FILE ?? join(env.HOME ?? "/root", ".egos", "segredos", "casa-segredo");
  try { return readFileSync(arq, "utf8").trim() || null; } catch { return null; } // silencio-ok: sem segredo ninguém é casa pelo header
}

export function headerCasaConfere(header: string | undefined, env: NodeJS.ProcessEnv = process.env, agora = Date.now()): boolean {
  if (!header) return false;
  const seg = segredoCasa(env);
  if (!seg) return false;
  const esperado = Buffer.from(assinaturaDoDia(seg, agora));
  const recebido = Buffer.from(header.trim());
  return recebido.length === esperado.length && timingSafeEqual(recebido, esperado);
}

const v4 = (ip: string): number | null => {
  const m = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m || m.slice(1).some((x) => Number(x) > 255)) return null;
  return ((Number(m[1]) << 24) | (Number(m[2]) << 16) | (Number(m[3]) << 8) | Number(m[4])) >>> 0;
};

/** "::ffff:1.2.3.4" → "1.2.3.4"; minúsculas; sem colchetes. */
export const normalizarIp = (ip: string): string => ip.trim().toLowerCase().replace(/^\[|\]$/g, "").replace(/^::ffff:/, "");

function ipCasa(ip: string, listaExtra: string[]): boolean {
  const n = normalizarIp(ip);
  if (n === "::1") return true;
  if (n.startsWith("fd7a:115c:a1e0:")) return true; // Tailscale IPv6
  const num = v4(n);
  if (num !== null) {
    if (n.startsWith("127.")) return true;
    if (num >>> 22 === (v4("100.64.0.0")! >>> 22)) return true; // Tailscale 100.64.0.0/10 // replicavel-ok: faixa CGNAT do Tailscale é constante do protocolo, não identidade de ambiente
  }
  for (const item of listaExtra) {
    const [base, bits] = item.split("/");
    if (bits === undefined) { if (normalizarIp(base) === n) return true; continue; }
    const b = v4(base), len = Number(bits);
    if (num === null || b === null || !Number.isInteger(len) || len < 0 || len > 32) continue;
    const mask = len === 0 ? 0 : (0xffffffff << (32 - len)) >>> 0;
    if ((num & mask) === (b & mask)) return true;
  }
  return false;
}

const lista = (s: string | undefined) => (s ?? "").split(",").map((x) => x.trim()).filter(Boolean);

export function ehCasa(o: { ip: string; ua: string | undefined; headerCasa: string | undefined }, env: NodeJS.ProcessEnv = process.env, agora = Date.now()): boolean {
  if (headerCasaConfere(o.headerCasa, env, agora)) return true;
  if (ipCasa(o.ip, lista(env.GUARD_MCP_CASA_IPS))) return true;
  const ua = (o.ua ?? "").trim().toLowerCase();
  return !!ua && lista(env.GUARD_MCP_CASA_UA).some((p) => ua.startsWith(p.toLowerCase()));
}

// ── user-agent e cliente ──────────────────────────────────────────────────────────────────────────────────────

export const FAMILIAS_UA = ["claude", "mcp-inspector", "node", "bun", "python", "curl", "go", "navegador", "ausente", "outro"] as const;

/** Família do user-agent, de lista fechada. O texto original nunca sai daqui. */
export function familiaUA(ua: string | undefined): (typeof FAMILIAS_UA)[number] {
  const u = (ua ?? "").trim().toLowerCase();
  if (!u) return "ausente";
  if (/claude|anthropic/.test(u)) return "claude";
  if (/inspector/.test(u)) return "mcp-inspector";
  if (/^(node|undici)|node-fetch/.test(u)) return "node";
  if (/^bun\//.test(u)) return "bun";
  if (/python|httpx|aiohttp|urllib/.test(u)) return "python";
  if (/^curl\//.test(u)) return "curl";
  if (/^go-http-client/.test(u)) return "go";
  if (/^mozilla\//.test(u)) return "navegador";
  return "outro";
}

const limpar = (s: unknown, max: number): string | null => {
  if (typeof s !== "string") return null;
  const t = s.toLowerCase().replace(/[^a-z0-9._-]/g, "").slice(0, max);
  return t || null;
};

export interface ClienteMcp { nome: string | null; versao: string | null }

/** clientInfo do corpo de um `initialize` (objeto único). Qualquer outra coisa → null. */
export function extrairCliente(parsed: unknown): ClienteMcp | null {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  const p = parsed as { method?: unknown; params?: { clientInfo?: { name?: unknown; version?: unknown } } };
  if (p.method !== "initialize") return null;
  const ci = p.params?.clientInfo;
  const nome = limpar(ci?.name, 40), versao = limpar(ci?.version, 20);
  return nome || versao ? { nome, versao } : null;
}

/** initialize → guarda; tools/call (e o resto) → consulta. Memória do processo, TTL, teto de entradas; nada vai a disco. */
export class MemoriaClientes {
  private m = new Map<string, { c: ClienteMcp; ate: number }>();
  constructor(private ttlMs = 24 * 3_600_000, private max = 1000) {}
  guardar(chave: string, c: ClienteMcp, agora = Date.now()): void {
    this.m.delete(chave);
    this.m.set(chave, { c, ate: agora + this.ttlMs });
    while (this.m.size > this.max) this.m.delete(this.m.keys().next().value as string);
  }
  buscar(chave: string, agora = Date.now()): ClienteMcp | null {
    const e = this.m.get(chave);
    if (!e) return null;
    if (e.ate < agora) { this.m.delete(chave); return null; }
    return e.c;
  }
  get tamanho(): number { return this.m.size; }
}
