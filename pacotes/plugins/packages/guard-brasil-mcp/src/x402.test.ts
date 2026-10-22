import "./teste-sem-supabase.js";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { x402Client } from "@x402/core/client";
import { decodePaymentRequiredHeader, decodePaymentResponseHeader } from "@x402/core/http";
import type { FacilitatorClient } from "@x402/core/server";
import { wrapFetchWithPayment } from "@x402/fetch";
import { ExactEvmScheme } from "@x402/evm/exact/client";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { startHttpServer, type HttpHandle } from "./http.js";
import { createX402Gate, X402_TESTNET } from "./x402.js";

// Carteiras DESCARTÁVEIS geradas no teste: sem fundos, nunca persistidas.
const PAY_TO = privateKeyToAccount(generatePrivateKey()).address;
const payer = privateKeyToAccount(generatePrivateKey());
const TX = "0x" + "ab".repeat(32);

let verifyCalls = 0;
let settleCalls = 0;
let verifyValid = true;
let settleOk = true;
let supportedFails = false;
const mockFacilitator: FacilitatorClient = {
  async getSupported() {
    if (supportedFails) throw new Error("down");
    return { kinds: [{ x402Version: 2, scheme: "exact", network: X402_TESTNET }], extensions: [], signers: {} };
  },
  async verify() {
    verifyCalls++;
    return { isValid: verifyValid, invalidReason: verifyValid ? undefined : "invalid_signature", payer: payer.address };
  },
  async settle() {
    settleCalls++;
    return settleOk
      ? { success: true, transaction: TX, network: X402_TESTNET, payer: payer.address }
      : { success: false, errorReason: "settle_fail", transaction: "", network: X402_TESTNET };
  },
};

const H = { "content-type": "application/json", accept: "application/json, text/event-stream" };
const call = (name: string, args: Record<string, unknown>, id = 1) =>
  JSON.stringify({ jsonrpc: "2.0", id, method: "tools/call", params: { name, arguments: args } });

let h: HttpHandle;
beforeAll(async () => {
  h = await startHttpServer({
    port: 0,
    quiet: true,
    rateLimitPerMinute: 10_000,
    payment: createX402Gate({ payTo: PAY_TO, facilitator: mockFacilitator }),
  });
});
afterAll(async () => {
  await h.close();
});

const payingFetch = () =>
  wrapFetchWithPayment(fetch, new x402Client().register(X402_TESTNET, new ExactEvmScheme(payer)));

describe("x402: guard_check_safe cobrado, resto grátis", () => {
  test("sem pagamento: 402 com requisitos (Base Sepolia, US$ 0,005 = 5000 atômicos, payTo do env)", async () => {
    const r = await fetch(h.url + "/mcp", { method: "POST", headers: H, body: call("guard_check_safe", { text: "oi" }) });
    expect(r.status).toBe(402);
    const hdr = r.headers.get("payment-required");
    expect(hdr).toBeTruthy();
    const pr = decodePaymentRequiredHeader(hdr!);
    expect(pr.accepts).toHaveLength(1);
    expect(pr.accepts[0]).toMatchObject({ scheme: "exact", network: X402_TESTNET, amount: "5000", payTo: PAY_TO });
    const body = await r.json();
    expect(body.accepts[0].amount).toBe("5000");
    expect(verifyCalls + settleCalls).toBe(0);
  });

  test("as outras 2 tools e o protocolo seguem grátis (sem 402)", async () => {
    for (const name of ["guard_scan_pii", "guard_inspect"]) {
      const r = await fetch(h.url + "/mcp", { method: "POST", headers: H, body: call(name, { text: "contato fulano@exemplo.com" }) });
      expect(r.status).toBe(200);
    }
    const l = await fetch(h.url + "/mcp", {
      method: "POST",
      headers: H,
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} }),
    });
    expect(l.status).toBe(200);
    expect(verifyCalls + settleCalls).toBe(0);
  });

  test("pagamento válido (mock do facilitador): 200, verify+settle 1x, PAYMENT-RESPONSE com a transação", async () => {
    const r = await payingFetch()(h.url + "/mcp", {
      method: "POST",
      headers: H,
      body: call("guard_check_safe", { text: "texto sem dado pessoal" }),
    });
    expect(r.status).toBe(200);
    const j: any = await r.json();
    expect(JSON.parse(j.result.content[0].text)).toBeTruthy();
    expect(verifyCalls).toBe(1);
    expect(settleCalls).toBe(1);
    const pr = r.headers.get("payment-response");
    expect(pr).toBeTruthy();
    expect(decodePaymentResponseHeader(pr!).transaction).toBe(TX);
  });

  test("pagamento inválido segundo o facilitador: 402, tool não roda, sem settle", async () => {
    verifyValid = false;
    const before = settleCalls;
    const r = await payingFetch()(h.url + "/mcp", { method: "POST", headers: H, body: call("guard_check_safe", { text: "x" }) });
    verifyValid = true;
    expect(r.status).toBe(402);
    expect(settleCalls).toBe(before);
    expect(decodePaymentRequiredHeader(r.headers.get("payment-required")!).error).toBe("invalid_signature");
  });

  test("settle falha: 402, tool não roda", async () => {
    settleOk = false;
    const r = await payingFetch()(h.url + "/mcp", { method: "POST", headers: H, body: call("guard_check_safe", { text: "x" }) });
    settleOk = true;
    expect(r.status).toBe(402);
  });

  test("cabeçalho de pagamento lixo: 402, sem chamar o facilitador", async () => {
    const before = verifyCalls;
    const r = await fetch(h.url + "/mcp", {
      method: "POST",
      headers: { ...H, "payment-signature": "lixo" },
      body: call("guard_check_safe", { text: "x" }),
    });
    expect(r.status).toBe(402);
    expect(verifyCalls).toBe(before);
  });

  test("lote com 2 chamadas pagas: 400 (um pagamento = uma chamada)", async () => {
    const r = await fetch(h.url + "/mcp", {
      method: "POST",
      headers: H,
      body: JSON.stringify([JSON.parse(call("guard_check_safe", { text: "a" }, 1)), JSON.parse(call("guard_check_safe", { text: "b" }, 2))]),
    });
    expect(r.status).toBe(400);
  });

  test("falha fechada: facilitador fora do ar -> 503, nada executa", async () => {
    const gate = createX402Gate({ payTo: PAY_TO, facilitator: { ...mockFacilitator, getSupported: async () => { throw new Error("down"); } } });
    const g = await gate.check(JSON.parse(call("guard_check_safe", { text: "x" })), {}, "http://x/mcp");
    expect(g.reject?.status).toBe(503);
  });

  test("piloto recusa mainnet e payTo inválido", () => {
    expect(() => createX402Gate({ payTo: PAY_TO, facilitator: mockFacilitator, network: "eip155:8453" })).toThrow(/Sepolia/);
    expect(() => createX402Gate({ payTo: "abc", facilitator: mockFacilitator })).toThrow(/X402_PAY_TO/);
  });

  test("texto enviado não aparece em lugar nenhum do corpo do 402", async () => {
    const r = await fetch(h.url + "/mcp", { method: "POST", headers: H, body: call("guard_check_safe", { text: "SEGREDO-fulano@exemplo.com" }) });
    const raw = await r.text();
    expect(raw).not.toContain("SEGREDO");
  });
});

describe("x402 desligado: nada muda", () => {
  test("sem a camada, guard_check_safe responde 200 sem pagamento", async () => {
    const off = await startHttpServer({ port: 0, quiet: true, payment: null });
    const r = await fetch(off.url + "/mcp", { method: "POST", headers: H, body: call("guard_check_safe", { text: "oi" }) });
    expect(r.status).toBe(200);
    await off.close();
  });
});
