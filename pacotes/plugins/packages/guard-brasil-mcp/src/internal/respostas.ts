/**
 * @egosbr/guard-brasil-mcp — internal/respostas
 *
 * Corpo PURO das 3 tools (sem stdio), para os goldens exercitarem exatamente o que o MCP devolve.
 *
 * Em 2026-10-05:
 *  - devolve o TEXTO MASCARADO além dos achados — antes o chamador recebia só a lista e tinha
 *    de mascarar sozinho (ou, pior, publicar o original achando que "achado" = "tratado");
 *  - `guard_check_safe` nunca diz seguro sem medir: resíduo que as regras não classificam
 *    (nome sem rótulo, R$, endereço, OAB, número fora do formato) → `safe:false,
 *    motivo:"nao-medido"` (R13-c). Antes respondia "No PII found".
 */

import type { GuardBrasil } from "../../../guard-brasil/src/index.js";
import { detectarNaoMedido, type SinalNaoMedido } from "./nao-medido.js";
import { formatFindingsForMcp, type McpFinding } from "./format-findings.js";

export type MotivoCheck = "pii-detectada" | "nao-medido" | "atrian" | "limpo";

function avaliar(guard: GuardBrasil, text: string) {
  const result = guard.inspect(text);
  const findings = result.masking.findings || [];
  const textoMascarado = result.output;
  const naoMedido = [...new Set(detectarNaoMedido(textoMascarado).map((a) => a.sinal))] as SinalNaoMedido[];
  // Precedência: resíduo não-medido vence "pii-detectada" — se sobrou algo que as regras não
  // sabem classificar, o texto mascarado NÃO está pronto, e dizer só "tinha PII" esconderia isso.
  const motivo: MotivoCheck =
    naoMedido.length > 0 ? "nao-medido" : findings.length > 0 ? "pii-detectada" : !result.safe ? "atrian" : "limpo";
  return { result, findings, textoMascarado, naoMedido, motivo };
}

export function respostaInspect(guard: GuardBrasil, text: string, mask = true) {
  const { result, findings, textoMascarado, naoMedido, motivo } = avaliar(guard, text);
  return {
    safe: motivo === "limpo",
    motivo,
    piiDetected: findings.length > 0,
    findings: formatFindingsForMcp(findings, mask) as McpFinding[],
    ...(mask ? { textoMascarado } : {}),
    naoMedido,
    atrian: result.atrian,
    recommendation:
      motivo === "nao-medido"
        ? `NÃO-MEDIDO: resíduo que as regras não classificam (${naoMedido.join(", ")}). Revisão humana antes de compartilhar.`
        : findings.length > 0
          ? "Contains Brazilian PII. Use textoMascarado, review before sharing."
          : motivo === "atrian"
            ? "No PII, but ATRiAN flagged the text. Review before sharing."
            : "No PII detected and no unclassified residue.",
  };
}

export function respostaScan(guard: GuardBrasil, text: string) {
  const { findings, textoMascarado, naoMedido } = avaliar(guard, text);
  return {
    piiCount: findings.length,
    types: [...new Set(findings.map((f) => f.category))],
    hasCPF: findings.some((f) => f.category === "cpf"),
    hasCNPJ: findings.some((f) => f.category === "cnpj"),
    hasRG: findings.some((f) => f.category === "rg"),
    hasEmail: findings.some((f) => f.category === "email"),
    hasName: findings.some((f) => f.category === "name"),
    textoMascarado,
    naoMedido,
  };
}

export function respostaCheckSafe(guard: GuardBrasil, text: string) {
  const { result, findings, naoMedido, motivo } = avaliar(guard, text);
  const safe = motivo === "limpo";
  const atrianCats = [...new Set(result.atrian.violations.filter((v: { level: string; category: string }) => v.level !== "info" && v.category !== "invented_acronym").map((v: { category: string }) => v.category))];
  return {
    safe,
    canShare: safe,
    motivo,
    ...(naoMedido.length > 0 ? { naoMedido } : {}),
    reason:
      motivo === "nao-medido"
        ? `Não medido: ${naoMedido.join(", ")} fora das regras — não afirmo que é seguro`
        : motivo === "pii-detectada"
          ? `Contains ${findings.length} PII occurrence(s)`
          : motivo === "atrian"
            ? `ATRiAN violation (${atrianCats.join(", ") || "ver atrian"}) — review before sharing`
            : "No PII found and no unclassified residue",
  };
}
