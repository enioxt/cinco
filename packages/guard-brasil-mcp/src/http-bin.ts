#!/usr/bin/env bun
/**
 * Entrada do Guard Brasil MCP via Streamable HTTP (stateless).
 * Env: GUARD_MCP_HTTP_PORT (padrão 3917) · GUARD_MCP_HTTP_HOST (padrão 127.0.0.1)
 *      GUARD_MCP_HTTP_TRUST_PROXY=1 (usa X-Forwarded-For no rate limit, atrás do Caddy).
 *      GUARD_MCP_METRICAS_FILE=<caminho.jsonl> (opcional: 1 linha de metadado por chamada; nunca texto).
 * SIGTERM/SIGINT: para de aceitar, espera as chamadas em andamento e sai com 0.
 */
import { startHttpServer } from "./http.js";

const port = Number(process.env.GUARD_MCP_HTTP_PORT ?? 3917);
if (!Number.isInteger(port) || port < 0 || port > 65535) {
  console.error("[guard-brasil-mcp-http] GUARD_MCP_HTTP_PORT inválida");
  process.exit(2);
}
const handle = await startHttpServer({
  port,
  host: process.env.GUARD_MCP_HTTP_HOST ?? "127.0.0.1",
  trustProxy: process.env.GUARD_MCP_HTTP_TRUST_PROXY === "1",
  metricasFile: process.env.GUARD_MCP_METRICAS_FILE || undefined,
});

let stopping = false;
const stop = () => {
  if (stopping) return;
  stopping = true;
  void handle.close().then(() => process.exit(0));
};
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
