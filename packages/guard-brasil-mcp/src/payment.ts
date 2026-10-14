/**
 * Ponto de encaixe do "método de pagamento" do servidor HTTP do Guard (piloto).
 * Um gate olha o corpo JSON-RPC e os cabeçalhos e decide: deixa passar (grátis ou pago),
 * ou rejeita com status/cabeçalhos/corpo próprios (402 + desafio). Implementações:
 *   - x402.ts  (USDC em Base Sepolia, piloto atual)
 *   - futuro: L402 sobre Lightning (ver plugins/guard-brasil/X402_PILOTO.md, seção Lightning)
 */
import type { IncomingHttpHeaders } from "node:http";

export interface GateResult {
  /** Se definido, responde isto e NÃO executa a tool. */
  reject?: { status: number; headers: Record<string, string>; body: unknown };
  /** Cabeçalhos a anexar à resposta quando a tool roda (recibo do pagamento). */
  headers?: Record<string, string>;
}

export interface PaymentGate {
  /** `payload` = corpo JSON-RPC já parseado. Nunca logar payload nem cabeçalhos. */
  check(payload: unknown, headers: IncomingHttpHeaders, resourceUrl: string): Promise<GateResult>;
}
