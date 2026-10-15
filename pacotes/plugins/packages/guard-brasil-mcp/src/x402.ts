/**
 * Camada OPCIONAL x402 (GUARD_X402=1) para o Guard Brasil MCP HTTP. PILOTO: só rede de teste.
 *
 * Só `tools/call` de `guard_check_safe` é cobrado (US$ 0,005). As outras 2 tools e todo o resto
 * do protocolo MCP (initialize, tools/list...) seguem grátis. Desligado, este módulo nem é usado.
 *
 * Fluxo: sem cabeçalho PAYMENT-SIGNATURE -> 402 + PAYMENT-REQUIRED (base64). Com cabeçalho ->
 * casa com os requisitos, `verify` e `settle` no facilitador; só então a tool roda.
 * Falha fechada: facilitador fora do ar, resposta inválida ou rede mainnet -> nada é executado.
 * Nunca loga corpo, argumento nem cabeçalho de pagamento.
 *
 * SDK: @x402/core + @x402/evm 2.28.0 (npm, 29/09/2026). Facilitador de teste: https://x402.org/facilitator.
 */
import { HTTPFacilitatorClient, x402ResourceServer, type FacilitatorClient } from "@x402/core/server";
import {
  decodePaymentSignatureHeader,
  encodePaymentRequiredHeader,
  encodePaymentResponseHeader,
} from "@x402/core/http";
import type { PaymentPayload, PaymentRequired, PaymentRequirements } from "@x402/core/types";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import type { GateResult, PaymentGate } from "./payment.js";

export const PAID_TOOL = "guard_check_safe";
export const X402_PRICE = "$0.005";
/** Base Sepolia. O piloto recusa subir em qualquer outra rede (mainnet exige decisão do Enio). */
export const X402_TESTNET = "eip155:84532";
export const DEFAULT_FACILITATOR = "https://x402.org/facilitator"; // replicavel-ok: facilitador público de teste; sobrescrito por X402_FACILITATOR_URL

export interface X402Options {
  /** Endereço de recebimento (env X402_PAY_TO). */
  payTo: string;
  facilitatorUrl?: string;
  /** Injeção para teste (mock do facilitador). */
  facilitator?: FacilitatorClient;
  network?: string;
}

export type { GateResult, PaymentGate } from "./payment.js";

/** Conta quantas chamadas pagas há no corpo (objeto ou lote). */
export function countPaidCalls(payload: unknown): number {
  const items = Array.isArray(payload) ? payload : [payload];
  let n = 0;
  for (const m of items as any[]) {
    if (m && m.method === "tools/call" && m.params?.name === PAID_TOOL) n++;
  }
  return n;
}

export function x402FromEnv(env: NodeJS.ProcessEnv = process.env): PaymentGate | undefined {
  if (env.GUARD_X402 !== "1") return undefined;
  const payTo = env.X402_PAY_TO ?? "";
  return createX402Gate({ payTo, facilitatorUrl: env.X402_FACILITATOR_URL, network: env.X402_NETWORK });
}

export function createX402Gate(opts: X402Options): PaymentGate {
  const network = (opts.network ?? X402_TESTNET) as `${string}:${string}`;
  if (network !== X402_TESTNET) {
    throw new Error(`x402: piloto só roda em ${X402_TESTNET} (Base Sepolia); mainnet exige decisão do Enio.`);
  }
  if (!/^0x[0-9a-fA-F]{40}$/.test(opts.payTo)) {
    throw new Error("x402: X402_PAY_TO ausente ou não é um endereço 0x de 40 hex.");
  }
  const facilitator = opts.facilitator ?? new HTTPFacilitatorClient({ url: opts.facilitatorUrl ?? DEFAULT_FACILITATOR });
  const server = new x402ResourceServer(facilitator).register(network, new ExactEvmScheme());
  let ready: Promise<void> | undefined;
  const init = () => {
    ready ??= server.initialize().catch((e) => {
      ready = undefined; // tenta de novo na próxima
      throw e;
    });
    return ready;
  };

  const fail = (status: number, message: string): GateResult => ({
    reject: { status, headers: {}, body: { error: message } },
  });

  async function paymentRequired(resourceUrl: string, error?: string): Promise<GateResult> {
    const accepts = await server.buildPaymentRequirements({
      scheme: "exact",
      payTo: opts.payTo,
      price: X402_PRICE,
      network,
      maxTimeoutSeconds: 60,
    });
    const pr: PaymentRequired = await server.createPaymentRequiredResponse(
      accepts,
      { url: resourceUrl, description: "Guard Brasil: guard_check_safe (posso compartilhar este texto?)", mimeType: "application/json" },
      error,
    );
    return {
      reject: {
        status: 402,
        headers: { "payment-required": encodePaymentRequiredHeader(pr), "cache-control": "no-store" },
        body: pr,
      },
    };
  }

  return {
    async check(payload, headers, resourceUrl) {
      const h = headers["payment-signature"];
      const paymentHeader = Array.isArray(h) ? h[0] : h;
      const paid = countPaidCalls(payload);
      if (paid === 0) return {};
      if (paid > 1) return fail(400, "One paid call per request.");
      try {
        await init();
      } catch {
        return fail(503, "Payment facilitator unavailable.");
      }
      try {
        if (!paymentHeader) return await paymentRequired(resourceUrl);
        let pp: PaymentPayload;
        try {
          pp = decodePaymentSignatureHeader(paymentHeader);
        } catch { // silencio-ok: falha fechada (503); sem log para não vazar dado do cliente
          return await paymentRequired(resourceUrl, "invalid_payment_header");
        }
        const accepts: PaymentRequirements[] = await server.buildPaymentRequirements({
          scheme: "exact",
          payTo: opts.payTo,
          price: X402_PRICE,
          network,
          maxTimeoutSeconds: 60,
        });
        const match = server.findMatchingRequirements(accepts, pp);
        if (!match) return await paymentRequired(resourceUrl, "payment_requirements_mismatch");
        const v = await server.verifyPayment(pp, match);
        if (!v.isValid) return await paymentRequired(resourceUrl, v.invalidReason ?? "invalid_payment");
        const s = await server.settlePayment(pp, match);
        if (!s.success) return await paymentRequired(resourceUrl, s.errorReason ?? "settlement_failed");
        return { headers: { "payment-response": encodePaymentResponseHeader(s) } };
      } catch { // silencio-ok: falha fechada (503); sem log para não vazar dado do cliente
        return fail(503, "Payment verification failed.");
      }
    },
  };
}
