#!/usr/bin/env bun
/**
 * Fumaça MANUAL contra o facilitador público de teste (https://x402.org/facilitator), Base Sepolia.
 * Não roda no `bun test` (rede + carteira). Uso:
 *   X402_PAYER_KEY_FILE=~/.egos/secrets/x402-testnet-payer.key \
 *   X402_PAYTO_KEY_FILE=~/.egos/secrets/x402-testnet-payto.key bun run src/x402-live.ts
 * Arquivos de chave: modo 0600, fora do git, só carteiras de TESTE. A chave nunca é impressa.
 * Para o pagamento passar, a carteira pagadora precisa de USDC de teste na Base Sepolia (faucet.circle.com).
 */
import { privateKeyToAccount } from "viem/accounts";
import { x402Client } from "@x402/core/client";
import { decodePaymentRequiredHeader, decodePaymentResponseHeader } from "@x402/core/http";
import { wrapFetchWithPayment } from "@x402/fetch";
import { ExactEvmScheme } from "@x402/evm/exact/client";
import { startHttpServer } from "./http.js";
import { X402_TESTNET, createX402Gate } from "./x402.js";

const key = async (p: string | undefined, nome: string) => {
  if (!p) throw new Error(`${nome} não definida`);
  return privateKeyToAccount((await Bun.file(p).text()).trim() as `0x${string}`);
};
const payer = await key(process.env.X402_PAYER_KEY_FILE, "X402_PAYER_KEY_FILE");
const payTo = (await key(process.env.X402_PAYTO_KEY_FILE, "X402_PAYTO_KEY_FILE")).address;
const h = await startHttpServer({ port: 0, quiet: true, payment: createX402Gate({ payTo }) });
const body = JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "guard_check_safe", arguments: { text: "oi" } } });
const H = { "content-type": "application/json", accept: "application/json, text/event-stream" };
const r1 = await fetch(h.url + "/mcp", { method: "POST", headers: H, body });
console.log("sem pagamento:", r1.status, "payTo", payTo, "payer", payer.address);
const pay = wrapFetchWithPayment(fetch, new x402Client().register(X402_TESTNET, new ExactEvmScheme(payer)));
const r2 = await pay(h.url + "/mcp", { method: "POST", headers: H, body });
const req = r2.headers.get("payment-required");
const res = r2.headers.get("payment-response");
console.log("com pagamento:", r2.status, req ? decodePaymentRequiredHeader(req).error : "", res ? decodePaymentResponseHeader(res).transaction : "");
await h.close();
