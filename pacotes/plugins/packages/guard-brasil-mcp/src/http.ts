/**
 * Guard Brasil MCP — Streamable HTTP STATELESS (SDK v1.x).
 *
 * Padrão oficial stateless: a CADA POST cria McpServer + StreamableHTTPServerTransport novos
 * (`sessionIdGenerator: undefined`), trata a request e fecha. Nunca reutiliza transport
 * (bug conhecido da linha 1.25–1.29 com transport stateless reaproveitado).
 *
 * Sem persistência, sem sessão. Nenhum texto/argumento entra em log: este módulo não loga
 * corpo algum; erros externos são mensagens fixas.
 *
 * Métricas (opcional, `metricasFile`): uma linha JSONL de metadado por POST /mcp — ver internal/metricas.ts.
 *
 * Rotas: POST /mcp · GET/DELETE /mcp = 405 · GET /health (sem dados) · resto 404.
 */

import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createGuardServer, MCP_VERSION, TOOL_NAMES } from "./server.js";
import type { PaymentGate } from "./payment.js";
import { x402FromEnv } from "./x402.js";
import { classificar, corpoTemErro, gravarMetrica } from "./internal/metricas.js";

/** Limite do corpo da requisição (SERVER_MAX_BYTES do review-cases.json). */
export const MAX_BODY_BYTES = 64 * 1024;
export const MAX_BATCH_ELEMENTS = 10;

export interface HttpOptions {
  port?: number;
  host?: string;
  maxBodyBytes?: number;
  timeoutMs?: number;
  maxConcurrent?: number;
  rateLimitPerMinute?: number;
  trustProxy?: boolean;
  /** Hosts aceitos no cabeçalho Host (anti DNS rebinding). Padrão: localhost/127.0.0.1/[::1] quando o bind é loopback; sem bind loopback e sem lista, não valida. */
  allowedHosts?: string[];
  /** Origins aceitas (navegador). Padrão: nenhuma — requisição COM Origin e lista vazia é negada; cliente sem Origin passa. */
  allowedOrigins?: string[];
  /** Silencia a linha de boot. Nunca há log de request/corpo, com ou sem quiet. */
  quiet?: boolean;
  /** Arquivo JSONL de métricas (só metadado). Ausente = nada é gravado. */
  metricasFile?: string;
  /** Injeção para teste; padrão = fábrica das 3 tools. */
  serverFactory?: () => McpServer;
  /** Método de pagamento plugável (piloto: x402 em testnet). Padrão: só liga com GUARD_X402=1; null = desligado. */
  payment?: PaymentGate | null;
}

export interface HttpHandle {
  url: string;
  close(): Promise<void>;
}

function sendJson(res: ServerResponse, status: number, body: unknown, extra: Record<string, string> = {}) {
  if (res.headersSent) return;
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json",
    "content-length": Buffer.byteLength(payload),
    "cache-control": "no-store",
    ...extra,
  });
  res.end(payload);
}

const rpcError = (code: number, message: string) => ({ jsonrpc: "2.0", error: { code, message }, id: null });

class BodyTooLarge extends Error {}

function readBody(req: IncomingMessage, limit: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const declared = Number(req.headers["content-length"]);
    if (Number.isFinite(declared) && declared > limit) return reject(new BodyTooLarge());
    const chunks: Buffer[] = [];
    let size = 0;
    req.on("data", (c: Buffer) => {
      size += c.length;
      if (size > limit) {
        chunks.length = 0;
        reject(new BodyTooLarge());
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

const LOOPBACK_HOSTS = ["localhost", "127.0.0.1", "[::1]", "::1"];

/** Valida Host e Origin. Devolve o motivo (categórico) ou null se passa. */
export function recusaHostOrigin(
  req: { headers: Record<string, string | string[] | undefined> },
  bind: string,
  allowedHosts?: string[],
  allowedOrigins: string[] = [],
): string | null {
  const hosts = allowedHosts?.length ? allowedHosts : LOOPBACK_HOSTS.includes(bind) ? LOOPBACK_HOSTS : []; // replicavel-ok: loopback é o invariante anti-rebinding; allowedHosts/GUARD_MCP_HTTP_ALLOWED_HOSTS sobrescreve
  if (hosts.length) {
    const h = String(req.headers.host ?? "").toLowerCase().replace(/:\d+$/, "");
    if (!hosts.map((x) => x.toLowerCase()).includes(h)) return "host not allowed";
  }
  const origin = req.headers.origin;
  if (origin !== undefined && !allowedOrigins.includes(String(origin))) return "origin not allowed";
  return null;
}

export async function startHttpServer(opts: HttpOptions = {}): Promise<HttpHandle> {
  const host = opts.host ?? "127.0.0.1";
  const maxBody = opts.maxBodyBytes ?? MAX_BODY_BYTES;
  const timeoutMs = opts.timeoutMs ?? 10_000;
  const maxConcurrent = opts.maxConcurrent ?? 16;
  const ratePerMin = opts.rateLimitPerMinute ?? 120;
  const factory = opts.serverFactory ?? createGuardServer;
  const payment = opts.payment === undefined ? x402FromEnv() : (opts.payment ?? undefined);

  let inflight = 0;
  const windows = new Map<string, { start: number; count: number }>();
  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [k, w] of windows) if (now - w.start > 60_000) windows.delete(k);
  }, 30_000);
  sweep.unref();

  const clientKey = (req: IncomingMessage) => {
    if (opts.trustProxy) {
      const xff = String(req.headers["x-forwarded-for"] ?? "").split(",")[0]?.trim();
      if (xff) return xff;
    }
    return req.socket.remoteAddress ?? "?";
  };

  const rateLimited = (key: string) => {
    const now = Date.now();
    const w = windows.get(key);
    if (!w || now - w.start >= 60_000) {
      windows.set(key, { start: now, count: 1 });
      return false;
    }
    w.count++;
    return w.count > ratePerMin;
  };

  async function handleMcp(req: IncomingMessage, res: ServerResponse) {
    if (req.method !== "POST") {
      return sendJson(res, 405, rpcError(-32000, "Method not allowed."), { allow: "POST" });
    }
    // Métrica por requisição: só metadado de listas fechadas, gravada quando a resposta termina.
    const t0 = performance.now();
    let classe: { metodo: string; ferramenta: string | null } = { metodo: "invalido", ferramenta: null };
    let erroNoCorpo = false;
    if (opts.metricasFile) {
      // Só o booleano "houve erro" é extraído do que sai; o corpo não é guardado.
      const olhar = (c: unknown) => {
        if (!erroNoCorpo && (typeof c === "string" || c instanceof Uint8Array)) erroNoCorpo = corpoTemErro(Buffer.from(c as never).toString());
      };
      const r = res as unknown as { write: (...a: unknown[]) => boolean; end: (...a: unknown[]) => ServerResponse };
      const writeOriginal = r.write.bind(res);
      const endOriginal = r.end.bind(res);
      r.write = (...a: unknown[]) => (olhar(a[0]), writeOriginal(...a));
      r.end = (...a: unknown[]) => (olhar(a[0]), endOriginal(...a));
      res.once("close", () => {
        const http = res.statusCode;
        gravarMetrica(opts.metricasFile, {
          ...classe,
          ok: res.writableFinished && http < 400 && !erroNoCorpo,
          ms: performance.now() - t0,
          http,
          v: MCP_VERSION,
        });
      });
    }
    if (rateLimited(clientKey(req))) {
      return sendJson(res, 429, rpcError(-32000, "Too many requests."), { "retry-after": "60" });
    }
    if (inflight >= maxConcurrent) {
      return sendJson(res, 503, rpcError(-32000, "Server busy."), { "retry-after": "1" });
    }
    if (!/^application\/json\s*(;|$)/i.test(String(req.headers["content-type"] ?? ""))) {
      return sendJson(res, 415, rpcError(-32000, "Content-Type must be application/json."));
    }

    inflight++;
    let server: McpServer | undefined;
    let transport: StreamableHTTPServerTransport | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const cleanup = () => {
      if (timer) clearTimeout(timer);
      void transport?.close().catch(() => {});
      void server?.close().catch(() => {});
    };
    // inflight só cai quando a resposta termina de fato (close cobre abort do cliente).
    res.once("close", () => {
      inflight--;
      cleanup();
    });

    try {
      let parsed: unknown;
      try {
        parsed = JSON.parse(await readBody(req, maxBody));
      } catch (e) {
        if (e instanceof BodyTooLarge) {
          res.setHeader("connection", "close");
          sendJson(res, 413, rpcError(-32000, "Payload too large."));
          res.once("finish", () => req.destroy());
          return;
        }
        return sendJson(res, 400, rpcError(-32700, "Invalid JSON."));
      }
      if (Array.isArray(parsed) ? parsed.length === 0 || parsed.length > MAX_BATCH_ELEMENTS : typeof parsed !== "object" || parsed === null) {
        return sendJson(res, 400, rpcError(-32600, "Invalid request."));
      }

      classe = classificar(parsed, TOOL_NAMES);

      if (payment) {
        const gate = await payment.check(parsed, req.headers, `http://${host}/mcp`);
        if (gate.reject) return sendJson(res, gate.reject.status, gate.reject.body, gate.reject.headers);
        for (const [k, v] of Object.entries(gate.headers ?? {})) res.setHeader(k, v);
      }

      // Servidor E transport NOVOS por request — nunca reutilizados.
      server = factory();
      transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
      await server.connect(transport);

      const timeout = new Promise<"timeout">((r) => {
        timer = setTimeout(() => r("timeout"), timeoutMs);
      });
      const done = transport.handleRequest(req, res, parsed).then(() => "done" as const);
      if ((await Promise.race([done, timeout])) === "timeout") {
        sendJson(res, 504, rpcError(-32001, "Request timed out."));
        res.end();
      }
    } catch {
      sendJson(res, 500, rpcError(-32603, "Internal server error."));
    }
  }

  let shuttingDown = false;
  const httpServer: Server = createServer((req, res) => {
    if (shuttingDown) res.setHeader("connection", "close");
    // Chamada que estava em voo quando o shutdown começou: termina e a conexão é encerrada.
    res.once("finish", () => {
      if (shuttingDown) setImmediate(() => req.socket.destroy());
    });
    const path = (req.url ?? "").split("?")[0];
    if (path === "/health") {
      if (req.method !== "GET") return sendJson(res, 405, { error: "method not allowed" }, { allow: "GET" });
      return sendJson(res, 200, { status: "ok" });
    }
    if (path === "/mcp") {
      const recusa = recusaHostOrigin(req, host, opts.allowedHosts, opts.allowedOrigins);
      if (recusa) return sendJson(res, 403, rpcError(-32000, "Forbidden: " + recusa + "."));
      return void handleMcp(req, res);
    }
    return sendJson(res, 404, { error: "not found" });
  });
  httpServer.requestTimeout = 30_000;
  httpServer.headersTimeout = 10_000;
  httpServer.keepAliveTimeout = 5_000;

  await new Promise<void>((resolve, reject) => {
    httpServer.once("error", reject);
    httpServer.listen(opts.port ?? 0, host, () => resolve());
  });
  const addr = httpServer.address() as AddressInfo;
  const url = `http://${host}:${addr.port}`;
  if (!opts.quiet) console.error(`[guard-brasil-mcp-http] ouvindo em ${url}/mcp (stateless)`);

  let closing: Promise<void> | undefined;
  return {
    url,
    close() {
      closing ??= new Promise<void>((resolve) => {
        shuttingDown = true;
        clearInterval(sweep);
        const force = setTimeout(() => (httpServer as any).closeAllConnections?.(), 10_000);
        force.unref();
        httpServer.close(() => {
          clearTimeout(force);
          resolve();
        });
        (httpServer as any).closeIdleConnections?.();
      });
      return closing;
    },
  };
}
