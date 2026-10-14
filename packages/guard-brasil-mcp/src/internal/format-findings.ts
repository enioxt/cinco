/**
 * @egosbr/guard-brasil-mcp — internal/format-findings
 *
 * Maps GuardBrasil's PIIFinding[] (packages/guard-brasil/src/lib/pii-scanner.ts)
 * into the shape the MCP tools (guard_inspect, guard_scan_pii) return to callers.
 *
 * BUG (found 2026-09-01): PIIFinding has { category, label, matched, start, end,
 * suggestion } — NOT { type, maskedValue, position }. The inline mapping in
 * index.ts read the wrong field names and silently returned `undefined` for
 * every finding (JSON.stringify drops undefined keys, so callers saw `{}`).
 */

// Keep this import type-only-ish: we only need the shape, not runtime behavior.
import type { PIIFinding } from "../../../guard-brasil/src/lib/pii-scanner.js";

export interface McpFinding {
  type: string;
  value: string;
  position: { start: number; end: number };
}

/**
 * Maps a raw PIIFinding to the MCP wire format.
 * `mask=true` (default) returns the redaction suggestion (e.g. "[CPF REMOVIDO]");
 * `mask=false` returns the raw matched substring.
 */
export function formatFindingForMcp(f: PIIFinding, mask: boolean): McpFinding {
  return {
    type: f.category,
    value: mask ? f.suggestion : f.matched,
    position: { start: f.start, end: f.end },
  };
}

export function formatFindingsForMcp(findings: PIIFinding[], mask: boolean): McpFinding[] {
  return findings.map((f) => formatFindingForMcp(f, mask));
}
