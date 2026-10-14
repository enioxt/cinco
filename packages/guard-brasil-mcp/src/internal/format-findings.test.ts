/**
 * @egosbr/guard-brasil-mcp — golden case for the field-mapping bug (2026-09-01)
 *
 * Bug: index.ts read f.type/f.maskedValue/f.position off PIIFinding, but the
 * real shape (packages/guard-brasil/src/lib/pii-scanner.ts:8) is
 * { category, label, matched, start, end, suggestion }. Every guard_inspect /
 * guard_scan_pii finding silently came back as `{}` on the wire.
 *
 * This golden drives GuardBrasil.inspect() with a real CPF (same synthetic
 * fixture style as packages/guard-brasil/src/guard.test.ts) and asserts the
 * MCP-shaped finding has a non-empty category/type and a real position —
 * if the mapping regresses to reading the wrong fields, this fails loudly
 * instead of shipping `undefined` silently (R13 — nada quebra em silêncio).
 */

import { describe, expect, it } from "bun:test";
import { GuardBrasil } from "../../../guard-brasil/src/index.js";
import { formatFindingsForMcp } from "./format-findings.js";

// Fake CPF fixture — same construction pattern as guard-brasil/src/guard.test.ts
// (dynamic join so the source never has a literal \d{3}\.\d{3}\.\d{3}-\d{2}).
const mkCpf = (a: string, b: string, c: string, d: string) => [a, b, c].join(".") + "-" + d;
const FAKE_CPF = mkCpf("123", "456", "789", "09");

describe("guard-brasil-mcp — formatFindingsForMcp", () => {
  it("maps CPF finding to a populated type + masked value + position (mask=true)", () => {
    const guard = GuardBrasil.create();
    const result = guard.inspect(`O CPF do solicitante é ${FAKE_CPF}.`);
    const findings = result.masking.findings;
    expect(findings.length).toBeGreaterThan(0);

    const mapped = formatFindingsForMcp(findings, true);
    expect(mapped.length).toBe(findings.length);

    const cpfFinding = mapped.find((f) => f.type === "cpf");
    // If the mapping reads the wrong field names, `type` comes back undefined
    // and this find() returns nothing — that's the exact failure mode of the bug.
    expect(cpfFinding).toBeDefined();
    expect(cpfFinding!.type).toBe("cpf");
    expect(cpfFinding!.value).toBe("[CPF REMOVIDO]");
    expect(cpfFinding!.position.start).toBeGreaterThanOrEqual(0);
    expect(cpfFinding!.position.end).toBeGreaterThan(cpfFinding!.position.start);
    // Masked value must never leak the real CPF back to the caller.
    expect(cpfFinding!.value).not.toContain(FAKE_CPF);
  });

  it("mask=false returns the raw matched CPF substring, still positioned", () => {
    const guard = GuardBrasil.create();
    const result = guard.inspect(`O CPF do solicitante é ${FAKE_CPF}.`);
    const mapped = formatFindingsForMcp(result.masking.findings, false);
    const cpfFinding = mapped.find((f) => f.type === "cpf");
    expect(cpfFinding).toBeDefined();
    expect(cpfFinding!.value).toBe(FAKE_CPF);
  });

  it("returns no findings for clean text", () => {
    const guard = GuardBrasil.create();
    const result = guard.inspect("O processo está em andamento. Aguarde contato.");
    const mapped = formatFindingsForMcp(result.masking.findings, true);
    expect(mapped).toHaveLength(0);
  });

  // Same bug family, second call site (guard_scan_pii in index.ts): it compared
  // `f.type === "CPF"` — PIIFinding has no `type` field, and `category` is
  // lowercase ('cpf', not 'CPF'), so hasCPF/hasCNPJ/hasRG/hasEmail were always
  // false regardless of input. index.ts now reads `f.category` against the
  // lowercase values directly (not through this module — it's a 1-line
  // inline check) — this golden pins the real category values PIIFinding uses,
  // so a future rename is caught here too.
  it("PIIFinding.category is lowercase — guard_scan_pii's hasCPF must compare against 'cpf', not 'CPF'", () => {
    const guard = GuardBrasil.create();
    const result = guard.inspect(`O CPF do solicitante é ${FAKE_CPF}.`);
    const categories = result.masking.findings.map((f) => f.category);
    expect(categories).toContain("cpf");
    expect(categories).not.toContain("CPF");
  });
});
