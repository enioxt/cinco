/**
 * @egosbr/guard-brasil-mcp — internal/shared-utils
 *
 * Inlined from @egos/shared/mcp-audit-lite.ts (kernel `packages/shared` is
 * `"private": true` and never published to npm — a `workspace:*` dependency
 * on it makes any package that declares it unresolvable for external
 * `npm install`, per guard-brasil-mcp's own publish audit, 2026-07-09).
 *
 * This is the ONLY export guard-brasil-mcp consumed from @egos/shared
 * (`trackMcpTool`, plus its private helper `writeMcpAuditEvent`), copied
 * verbatim (self-contained — no further imports from @egos/shared) so this
 * package can be published standalone. Keep in sync manually if the
 * upstream mcp-audit-lite.ts changes; do not re-add `@egos/shared` as a
 * dependency of this package.
 *
 * Original source: packages/shared/src/mcp-audit-lite.ts
 */

// Fallback para a convenção canônica do repo (SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY,
// 163 arquivos) — antes só lia EGOS_SUPABASE_* (6 arquivos), ausente no .env →
// fail-open silencioso = 0 eventos por semanas (INV-STAB-003).
// Lido a cada chamada (não congelado no import): o ambiente decide o destino do audit
// na hora da escrita — e um teste consegue provar o caminho local sem tocar a base real.
function supabaseEnv(): { url?: string; key?: string } {
  return {
    url: process.env.EGOS_SUPABASE_URL || process.env.SUPABASE_URL,
    key:
      process.env.EGOS_SUPABASE_SERVICE_KEY ||
      process.env.EGOS_SUPABASE_KEY ||
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
}

// Aviso ÚNICO no carregamento do módulo (boot do MCP) — não por-call.
// Lição obsidian/fail-open: misconfig deve gritar no boot, não sumir em silêncio.
if (!supabaseEnv().url || !supabaseEnv().key) {
  console.error(
    "[mcp-audit] ⚠️  Supabase env ausente (EGOS_SUPABASE_URL|SUPABASE_URL + *_SERVICE_KEY|SUPABASE_SERVICE_ROLE_KEY) — mcp_audit_events NÃO será persistido. Tool calls só vão para stderr (fail-open).",
  );
}

export interface McpAuditEvent {
  mcp_name: string;
  tool_name: string;
  status: "ok" | "error";
  duration_ms: number;
  error_msg?: string;
}

/**
 * Grava evento de audit no Supabase (best-effort, fail-open).
 * Nunca lança exceção — erros vão para stderr apenas.
 */
export async function writeMcpAuditEvent(event: McpAuditEvent): Promise<void> {
  const { url: SUPABASE_URL, key: SUPABASE_KEY } = supabaseEnv();
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    // Sem config Supabase — log local apenas
    console.error(
      `[mcp-audit] ${event.mcp_name}.${event.tool_name} ${event.status} ${event.duration_ms}ms`
    );
    return;
  }

  // Schema canônico = tabela LIVE mcp_audit_events (Enio 2026-05-29):
  //   server_id, tenant_slug(NOT NULL), tool_name, success, created_at(NOT NULL),
  //   args_hash, idempotency_key, schema_version. NÃO há colunas duration_ms/error_msg.
  // MCPs stdio (governance/memory/knowledge/...) não são tenant-scoped → tenant_slug="system".
  // duration_ms/error_msg ficam só no stderr (sem coluna no schema live).
  const payload = {
    server_id: event.mcp_name,
    tenant_slug: "system",
    tool_name: event.tool_name,
    success: event.status === "ok",
    created_at: new Date().toISOString(),
    schema_version: "1.0",
  };

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/mcp_audit_events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Prefer: "return=minimal",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(3000),
    });
    // Fail-visible (não fail-silent): um 4xx (ex: schema drift) era engolido
    // silenciosamente → semanas sem eventos sem ninguém notar (INV-STAB-003).
    if (!res.ok) {
      console.error(
        `[mcp-audit:err] POST mcp_audit_events HTTP ${res.status} para ${event.mcp_name}.${event.tool_name} — verifique schema da tabela vs payload`,
      );
    }
  } catch {
    // Silencia rede — audit nunca bloqueia o MCP (mas erro HTTP acima é visível)
    console.error(
      `[mcp-audit:warn] falha ao gravar audit ${event.mcp_name}.${event.tool_name} — Supabase indisponível`
    );
  }
}

/**
 * Wrapper utilitário: executa fn e registra audit automaticamente.
 * Preserva exceções originais (re-throw após audit).
 *
 * @example
 * return trackMcpTool("egos-governance", "list_tasks", async () => { ... });
 */
export async function trackMcpTool<T>(
  mcpName: string,
  toolName: string,
  fn: () => Promise<T>
): Promise<T> {
  const t0 = Date.now();
  try {
    const result = await fn();
    await writeMcpAuditEvent({
      mcp_name: mcpName,
      tool_name: toolName,
      status: "ok",
      duration_ms: Date.now() - t0,
    });
    return result;
  } catch (err) {
    await writeMcpAuditEvent({
      mcp_name: mcpName,
      tool_name: toolName,
      status: "error",
      duration_ms: Date.now() - t0,
      error_msg: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}
