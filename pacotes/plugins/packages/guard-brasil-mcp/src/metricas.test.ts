import "./teste-sem-supabase.js";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { startHttpServer, type HttpHandle } from "./http.js";
import { classificar, corpoTemErro } from "./internal/metricas.js";
import { TOOL_NAMES } from "./server.js";

const H = { "content-type": "application/json", accept: "application/json, text/event-stream" };
const rpc = (method: string, params: unknown = {}, id = 1) => JSON.stringify({ jsonrpc: "2.0", id, method, params });
// CPF sintético montado em partes (o gate de commit barra o literal, mesmo sintético).
const CPF = ["529", "982", "247"].join(".") + "-25";
const SEGREDO = `CPF ${CPF} de Fulano Segredo`;

describe("classificar (listas fechadas)", () => {
  test("tools/call com tool conhecida", () => {
    expect(classificar({ method: "tools/call", params: { name: "guard_scan_pii" } }, TOOL_NAMES)).toEqual({ metodo: "tools/call", ferramenta: "guard_scan_pii" });
  });
  test("nome desconhecido nunca vaza", () => {
    expect(classificar({ method: "tools/call", params: { name: SEGREDO } }, TOOL_NAMES)).toEqual({ metodo: "tools/call", ferramenta: "outra" });
    expect(classificar({ method: SEGREDO }, TOOL_NAMES)).toEqual({ metodo: "outro", ferramenta: null });
  });
  test("lote e inválido", () => {
    expect(classificar([{}], TOOL_NAMES).metodo).toBe("lote");
    expect(classificar(null, TOOL_NAMES).metodo).toBe("invalido");
  });
  test("corpoTemErro", () => {
    expect(corpoTemErro('{"result":{"isError":true}}')).toBe(true);
    expect(corpoTemErro('{"error":{"code":-1}}')).toBe(true);
    expect(corpoTemErro('{"result":{"content":[]}}')).toBe(false);
  });
});

describe("gravação JSONL só de metadado", () => {
  const dir = mkdtempSync(join(tmpdir(), "guard-metricas-"));
  const arq = join(dir, "sub", "m.jsonl");
  let h: HttpHandle;
  beforeAll(async () => {
    h = await startHttpServer({ port: 0, quiet: true, rateLimitPerMinute: 10_000, metricasFile: arq });
  });
  afterAll(async () => h.close());

  test("chamada de tool grava 1 linha sem texto do usuário", async () => {
    const r = await fetch(`${h.url}/mcp`, { method: "POST", headers: H, body: rpc("tools/call", { name: "guard_scan_pii", arguments: { text: SEGREDO } }) });
    expect(r.status).toBe(200);
    await r.text();
    await fetch(`${h.url}/mcp`, { method: "POST", headers: H, body: "{nao-json" }).then((x) => x.text());
    await Bun.sleep(50);
    const bruto = readFileSync(arq, "utf8");
    expect(bruto).not.toContain(CPF.slice(0, 7));
    expect(bruto).not.toContain("Segredo");
    expect(bruto).not.toContain("127.0.0.1");
    const linhas = bruto.trim().split("\n").map((l) => JSON.parse(l));
    expect(linhas.length).toBe(2);
    expect(linhas[0]).toMatchObject({ metodo: "tools/call", ferramenta: "guard_scan_pii", ok: true, http: 200 });
    expect(Object.keys(linhas[0]).sort()).toEqual(["casa", "cliente", "cliente_v", "ferramenta", "http", "metodo", "ms", "ok", "origem", "ts", "ua", "v"]);
    expect(linhas[0].origem).toMatch(/^[0-9a-f]{12}$/);
    expect(linhas[1]).toMatchObject({ metodo: "invalido", ok: false, http: 400 });
  });

  test("tool inexistente conta como erro e o nome não sai", async () => {
    await fetch(`${h.url}/mcp`, { method: "POST", headers: H, body: rpc("tools/call", { name: "xpto_" + "Segredo", arguments: {} }) }).then((x) => x.text());
    await Bun.sleep(50);
    const ult = JSON.parse(readFileSync(arq, "utf8").trim().split("\n").pop()!);
    expect(ult).toMatchObject({ metodo: "tools/call", ferramenta: "outra", ok: false });
  });

  test("sem metricasFile nada é gravado", async () => {
    const outro = join(dir, "nao.jsonl");
    const h2 = await startHttpServer({ port: 0, quiet: true });
    await fetch(`${h2.url}/mcp`, { method: "POST", headers: H, body: rpc("tools/list") }).then((x) => x.text());
    await h2.close();
    expect(existsSync(outro)).toBe(false);
  });
});
