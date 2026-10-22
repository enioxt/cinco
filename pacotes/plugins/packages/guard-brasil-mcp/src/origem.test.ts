import "./teste-sem-supabase.js";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { startHttpServer, type HttpHandle } from "./http.js";
import { _zerarCacheSal, assinaturaDoDia, diaBrt, ehCasa, extrairCliente, familiaUA, hashOrigem, headerCasaConfere, MemoriaClientes, normalizarIp, salDoDia } from "./internal/origem.js";

const nova = () => mkdtempSync(join(tmpdir(), "guard-origem-"));
const AGORA = Date.parse("2026-10-19T15:00:00Z");
const SEM_ENV = { HOME: "/nao-existe" } as NodeJS.ProcessEnv;

describe("hash de origem (sal diário, nunca IP)", () => {
  test("mesmo IP + mesmo dia → mesmo código; IP diferente → outro; 12 hex sem o IP", () => {
    const d = nova();
    const a = hashOrigem("203.0.113.9", d, AGORA);
    expect(a).toMatch(/^[0-9a-f]{12}$/);
    expect(a).toBe(hashOrigem("203.0.113.9", d, AGORA + 3_600_000));
    expect(a).not.toBe(hashOrigem("203.0.113.10", d, AGORA));
    expect(a).not.toContain("203");
  });
  test("o sal vive em sal-AAAA-MM-DD (dia de Brasília) e o de ontem é apagado ao nascer o de hoje", () => {
    const d = nova();
    _zerarCacheSal();
    hashOrigem("1.1.1.1", d, AGORA);
    expect(readdirSync(d)).toEqual(["sal-2026-10-19"]);
    const ontem = hashOrigem("1.1.1.1", d, AGORA);
    const amanha = hashOrigem("1.1.1.1", d, AGORA + 86_400_000);
    expect(readdirSync(d)).toEqual(["sal-2026-10-20"]);
    expect(amanha).not.toBe(ontem); // origem de ontem não liga com a de hoje
  });
  test("reusa o sal que o gateway já criou na pasta (mesmo código para o mesmo IP)", () => {
    const d = nova();
    _zerarCacheSal();
    writeFileSync(join(d, "sal-2026-10-19"), "sal-do-gateway");
    expect(salDoDia(d, "2026-10-19")).toBe("sal-do-gateway");
  });
  test("virada do dia é à meia-noite de Brasília, não UTC", () => {
    expect(diaBrt(Date.parse("2026-10-20T02:59:00Z"))).toBe("2026-10-19");
    expect(diaBrt(Date.parse("2026-10-20T03:00:00Z"))).toBe("2026-10-20");
  });
});

describe("casa", () => {
  const seg = nova();
  writeFileSync(join(seg, "casa-segredo"), "segredo-de-teste\n");
  const env = { EGOS_CASA_SEGREDO_FILE: join(seg, "casa-segredo") } as NodeJS.ProcessEnv;
  const dia = Date.parse("2026-10-19T12:00:00Z");

  test("HMAC do dia idêntico ao do gateway (vetor gerado por mcp-unified-gateway/primeiro-uso.ts)", () => {
    expect(assinaturaDoDia("segredo-de-teste", dia)).toBe("129f290fab91b331173e7d046baf3943");
  });
  test("header confere só com a assinatura de hoje; errado, ausente ou de ontem = fora", () => {
    expect(headerCasaConfere("129f290fab91b331173e7d046baf3943", env, dia)).toBe(true);
    expect(headerCasaConfere("129f290fab91b331173e7d046baf3944", env, dia)).toBe(false);
    expect(headerCasaConfere(undefined, env, dia)).toBe(false);
    expect(headerCasaConfere("129f290fab91b331173e7d046baf3943", env, dia + 86_400_000)).toBe(false);
    expect(headerCasaConfere("129f290fab91b331173e7d046baf3943", SEM_ENV, dia)).toBe(false); // sem segredo na máquina ninguém é casa
  });
  test("IP: loopback e Tailscale são casa; IP público qualquer não", () => {
    for (const ip of ["127.0.0.1", "::1", "::ffff:127.0.0.1", "100.64.0.1", "100.127.255.254", "fd7a:115c:a1e0::1"]) expect(ehCasa({ ip, ua: undefined, headerCasa: undefined }, SEM_ENV)).toBe(true);
    for (const ip of ["203.0.113.9", "100.63.255.255", "100.128.0.1", "172.19.0.1"]) expect(ehCasa({ ip, ua: undefined, headerCasa: undefined }, SEM_ENV)).toBe(false);
  });
  test("GUARD_MCP_CASA_IPS aceita IP exato e CIDR IPv4 (VPS, casa)", () => {
    const e = { ...SEM_ENV, GUARD_MCP_CASA_IPS: "198.51.100.7, 192.0.2.0/24" };
    expect(ehCasa({ ip: "198.51.100.7", ua: undefined, headerCasa: undefined }, e)).toBe(true);
    expect(ehCasa({ ip: "192.0.2.200", ua: undefined, headerCasa: undefined }, e)).toBe(true);
    expect(ehCasa({ ip: "192.0.3.1", ua: undefined, headerCasa: undefined }, e)).toBe(false);
    expect(ehCasa({ ip: "198.51.100.8", ua: undefined, headerCasa: undefined }, e)).toBe(false);
  });
  test("user-agent só conta se GUARD_MCP_CASA_UA estiver ligado (sinal fraco); por padrão não", () => {
    expect(ehCasa({ ip: "203.0.113.9", ua: "egos-mcp-saude/1", headerCasa: undefined }, SEM_ENV)).toBe(false);
    expect(ehCasa({ ip: "203.0.113.9", ua: "EGOS-mcp-saude/1", headerCasa: undefined }, { ...SEM_ENV, GUARD_MCP_CASA_UA: "egos-mcp-saude" })).toBe(true);
  });
  test("normalizarIp", () => expect(normalizarIp("[::FFFF:10.0.0.1]")).toBe("10.0.0.1"));
});

describe("família de user-agent (lista fechada) e cliente", () => {
  test("família", () => {
    expect(familiaUA(undefined)).toBe("ausente");
    expect(familiaUA("node")).toBe("node");
    expect(familiaUA("Bun/1.3.14")).toBe("bun");
    expect(familiaUA("python-httpx/0.27")).toBe("python");
    expect(familiaUA("curl/8.5.0")).toBe("curl");
    expect(familiaUA("Mozilla/5.0 (X11) Chrome/120")).toBe("navegador");
    expect(familiaUA("claude-code/2.1")).toBe("claude");
    expect(familiaUA("Maria da Silva CPF 000")).toBe("outro"); // texto livre nunca vira valor
  });
  test("clientInfo do initialize é reduzido a [a-z0-9._-] e cortado", () => {
    const c = extrairCliente({ jsonrpc: "2.0", id: 1, method: "initialize", params: { clientInfo: { name: "Claude Code (Maria!)", version: "2.1.0-beta+" + "x".repeat(50) } } });
    expect(c).toEqual({ nome: "claudecodemaria", versao: "2.1.0-beta" + "x".repeat(10) });
    expect(extrairCliente({ method: "tools/call", params: { clientInfo: { name: "x" } } })).toBeNull();
    expect(extrairCliente([{ method: "initialize" }])).toBeNull();
    expect(extrairCliente({ method: "initialize", params: {} })).toBeNull();
    expect(extrairCliente({ method: "initialize", params: { clientInfo: { name: 42 } } })).toBeNull();
  });
  test("memória: guarda, expira por TTL e respeita o teto", () => {
    const m = new MemoriaClientes(1000, 2);
    m.guardar("a", { nome: "x", versao: "1" }, 0);
    expect(m.buscar("a", 500)?.nome).toBe("x");
    expect(m.buscar("a", 1500)).toBeNull();
    m.guardar("a", { nome: "a", versao: null }, 0); m.guardar("b", { nome: "b", versao: null }, 0); m.guardar("c", { nome: "c", versao: null }, 0);
    expect(m.tamanho).toBe(2);
    expect(m.buscar("a", 1)).toBeNull();
  });
});

describe("ponta a ponta: initialize → tools/call carimbado, sem IP nem user-agent crus", () => {
  const dir = nova();
  const arq = join(dir, "t", "guard-chamadas.jsonl");
  const H = { "content-type": "application/json", accept: "application/json, text/event-stream" };
  const rpc = (method: string, params: unknown = {}, id = 1) => JSON.stringify({ jsonrpc: "2.0", id, method, params });
  let h: HttpHandle;
  const seg = nova();
  writeFileSync(join(seg, "casa-segredo"), "segredo-de-teste");
  const antes = { f: process.env.EGOS_CASA_SEGREDO_FILE };
  beforeAll(async () => {
    process.env.EGOS_CASA_SEGREDO_FILE = join(seg, "casa-segredo");
    h = await startHttpServer({ port: 0, quiet: true, rateLimitPerMinute: 10_000, metricasFile: arq, trustProxy: true });
  });
  afterAll(async () => {
    if (antes.f === undefined) delete process.env.EGOS_CASA_SEGREDO_FILE; else process.env.EGOS_CASA_SEGREDO_FILE = antes.f;
    await h.close();
  });
  const post = (body: string, extra: Record<string, string>) => fetch(`${h.url}/mcp`, { method: "POST", headers: { ...H, ...extra }, body }).then((r) => r.text());
  const ler = () => readFileSync(arq, "utf8").trim().split("\n").map((l) => JSON.parse(l));

  test("cliente do initialize carimba o tools/call da mesma origem; origem diferente não herda; casa pelo header", async () => {
    const UA = "Mozilla/5.0 SegredoDoUsuario";
    await post(rpc("initialize", { protocolVersion: "2025-03-26", capabilities: {}, clientInfo: { name: "Cursor", version: "0.45.1" } }), { "x-forwarded-for": "203.0.113.9", "user-agent": UA });
    await post(rpc("tools/call", { name: "guard_scan_pii", arguments: { text: "oi" } }, 2), { "x-forwarded-for": "203.0.113.9", "user-agent": UA });
    await post(rpc("tools/call", { name: "guard_scan_pii", arguments: { text: "oi" } }, 3), { "x-forwarded-for": "198.51.100.77" });
    await post(rpc("tools/list", {}, 4), { "x-forwarded-for": "198.51.100.5", "x-egos-casa": assinaturaDoDia("segredo-de-teste") });
    await Bun.sleep(80);
    const l = ler();
    expect(l[0]).toMatchObject({ metodo: "initialize", cliente: "cursor", cliente_v: "0.45.1", casa: false, ua: "navegador" });
    expect(l[1]).toMatchObject({ metodo: "tools/call", cliente: "cursor", cliente_v: "0.45.1", casa: false, ua: "navegador" });
    expect(l[1].origem).toBe(l[0].origem);
    expect(l[2]).toMatchObject({ cliente: null, cliente_v: null });
    expect(l[2].origem).not.toBe(l[0].origem);
    expect(l[3]).toMatchObject({ metodo: "tools/list", casa: true });
    const bruto = readFileSync(arq, "utf8");
    for (const proibido of ["203.0.113.9", "198.51.100", "SegredoDoUsuario", "Mozilla", "x-egos-casa"]) expect(bruto).not.toContain(proibido);
    expect(existsSync(join(dir, "t", `sal-${diaBrt(Date.now())}`))).toBe(true);
  });
});
