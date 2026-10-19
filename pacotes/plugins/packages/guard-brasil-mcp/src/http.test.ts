import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { readFileSync } from "node:fs";
import { createGuardServer, TOOL_NAMES } from "./server.js";
import { MAX_BODY_BYTES, recusaHostOrigin, startHttpServer, type HttpHandle } from "./http.js";

const CASES = JSON.parse(
  readFileSync(new URL("../../../plugins/guard-brasil/review-cases.json", import.meta.url), "utf8"),
);
const ACCEPT = "application/json, text/event-stream";
const H = { "content-type": "application/json", accept: ACCEPT };
const rpc = (method: string, params: unknown = {}, id: number | string = 1) =>
  JSON.stringify({ jsonrpc: "2.0", id, method, params });
const INIT = rpc("initialize", {
  protocolVersion: "2025-03-26",
  capabilities: {},
  clientInfo: { name: "t", version: "0" },
});

let h: HttpHandle;
let created = 0;
const seen: McpServer[] = [];
beforeAll(async () => {
  h = await startHttpServer({
    port: 0,
    host: "127.0.0.1",
    quiet: true,
    rateLimitPerMinute: 10_000,
    serverFactory: () => {
      created++;
      const s = createGuardServer();
      seen.push(s);
      return s;
    },
  });
});
afterAll(async () => {
  await h.close();
});

async function connect(url = h.url + "/mcp") {
  const client = new Client({ name: "t", version: "0" });
  await client.connect(new StreamableHTTPClientTransport(new URL(url)));
  return client;
}
async function call(client: Client, name: string, args: Record<string, unknown>) {
  const r: any = await client.callTool({ name, arguments: args });
  return JSON.parse(r.content[0].text);
}

describe("Streamable HTTP stateless: protocolo", () => {
  test("initialize + listTools: exatamente as 3 tools e as 3 hints", async () => {
    const c = await connect();
    const { tools } = await c.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual([...TOOL_NAMES].sort());
    for (const t of tools)
      expect(t.annotations).toMatchObject({ readOnlyHint: true, openWorldHint: false, destructiveHint: false });
    await c.close();
  });

  test("1 chamada de cada tool", async () => {
    const c = await connect();
    expect((await call(c, "guard_scan_pii", { text: "CPF 123.456.789-09" })).piiCount).toBe(1);
    expect((await call(c, "guard_inspect", { text: "CPF 123.456.789-09" })).piiDetected).toBe(true);
    expect((await call(c, "guard_check_safe", { text: "CPF 123.456.789-09" })).safe).toBe(false);
    await c.close();
  });

  test("health separado e sem dados", async () => {
    const r = await fetch(h.url + "/health");
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ status: "ok" });
  });

  test("GET e DELETE em /mcp = 405 (stateless); rota desconhecida = 404", async () => {
    for (const m of ["GET", "DELETE"]) {
      const r = await fetch(h.url + "/mcp", { method: m, headers: { accept: ACCEPT } });
      expect(r.status).toBe(405);
      expect(r.headers.get("allow")).toBe("POST");
    }
    expect((await fetch(h.url + "/outra")).status).toBe(404);
  });
});

describe("adversarial: nenhum transport/servidor reutilizado", () => {
  test("N POSTs independentes (mesmo id JSON-RPC, initialize repetido) -> todos 200 e 1 servidor novo por POST", async () => {
    const before = created;
    const bodies = [INIT, INIT, rpc("tools/list"), rpc("tools/list"), rpc("tools/list")];
    for (const b of bodies) {
      const r = await fetch(h.url + "/mcp", { method: "POST", headers: H, body: b });
      expect(r.status).toBe(200);
      const j: any = await r.json();
      expect(j.error).toBeUndefined();
      expect(j.id).toBe(1);
      expect(r.headers.get("mcp-session-id")).toBeNull();
    }
    expect(created - before).toBe(bodies.length);
    const novos = seen.slice(before);
    expect(new Set(novos).size).toBe(bodies.length);
  });

  test("tools/list sem initialize antes funciona (sem estado entre requests)", async () => {
    const r = await fetch(h.url + "/mcp", { method: "POST", headers: H, body: rpc("tools/list", {}, 77) });
    expect(r.status).toBe(200);
    expect(((await r.json()) as any).result.tools).toHaveLength(3);
  });

  test("8 chamadas concorrentes não se contaminam", async () => {
    const textos = Array.from({ length: 8 }, (_, i) => `CPF 123.456.789-09 marca${i}`);
    const rs = await Promise.all(
      textos.map(async (t) => {
        const c = await connect();
        const o = await call(c, "guard_scan_pii", { text: t });
        await c.close();
        return o;
      }),
    );
    rs.forEach((o, i) => expect(o.textoMascarado).toContain(`marca${i}`));
  });
});

describe("20 casos de review do contrato contra o HTTP", () => {
  // VERMELHO-ANTES (14/10, GUARD-SAUDE-001 / GUARD-RESIDUO-001 / GUARD-ATRIAN-SAFE-001): `saude`,
  // `nao-medido`, `residuo` e `atrian-absoluto` saíam safe:true com naoMedido:[] — vistos falhar
  // nestas asserções antes do conserto do motor. Não há mais "lacuna conhecida" neste bloco.
  let c: Client;
  beforeAll(async () => {
    c = await connect();
  });
  afterAll(async () => {
    await c.close();
  });

  for (const k of CASES.positiveCases) {
    test(`positivo ${k.id}`, async () => {
      const insp = await call(c, "guard_inspect", { text: k.text });
      const safe = await call(c, "guard_check_safe", { text: k.text });
      switch (k.id) {
        case "cpf-formatado":
        case "cpf-sem-pontuacao":
          expect(insp.piiDetected).toBe(true);
          expect(insp.textoMascarado).not.toMatch(/\d{3}\.?\d{3}\.?\d{3}-?\d{2}/);
          break;
        case "email":
        case "telefone":
        case "rg":
        case "nome-contextual":
          expect(insp.piiDetected).toBe(true);
          expect(safe.safe).toBe(false);
          break;
        case "combinado":
          expect(insp.findings.length).toBeGreaterThanOrEqual(2);
          expect(insp.textoMascarado).not.toContain("123.456.789-09");
          break;
        case "saude":
          // dado de saúde (LGPD art. 11) é achado sensível, mascarado; nunca safe.
          expect(insp.piiDetected).toBe(true);
          expect(insp.findings.some((f: any) => f.type === "health_data")).toBe(true);
          expect(insp.textoMascarado).not.toContain("diabetes");
          expect(safe.safe).toBe(false);
          expect(safe.canShare).toBe(false);
          break;
        case "atrian-absoluto":
          expect(insp.atrian.violations.some((v: any) => v.category === "absolute_claim")).toBe(true);
          expect(insp.safe).toBe(false);
          expect(safe.safe).toBe(false);
          expect(safe.motivo).toBe("atrian");
          expect(safe.reason).toContain("absolute_claim");
          break;
        case "nao-medido":
          expect(insp.naoMedido).toContain("codigo-interno");
          expect(safe.safe).toBe(false);
          expect(safe.motivo).toBe("nao-medido");
          expect(safe.naoMedido).toContain("codigo-interno");
          break;
        default:
          throw new Error(`caso sem asserção: ${k.id}`);
      }
    });
  }

  for (const k of CASES.negativeAndBoundaryCases) {
    if (k.generator) continue; // payload grande: teste próprio abaixo
    test(`negativo/limite ${k.id}`, async () => {
      const insp = await call(c, "guard_inspect", { text: k.text });
      const safe = await call(c, "guard_check_safe", { text: k.text });
      switch (k.id) {
        case "institucional":
        case "lei":
        case "cidade-orgao":
        case "maria-da-penha":
          // não inventa PII; resíduo vira naoMedido (bloqueia "safe"), nunca é mascarado como pessoa.
          expect(insp.piiDetected).toBe(false);
          expect(insp.findings).toEqual([]);
          expect(insp.textoMascarado).toBe(k.text);
          expect(insp.naoMedido.length).toBeGreaterThan(0);
          expect(safe.safe).toBe(false);
          break;
        case "cnpj-contexto":
        case "ausencia-nao-garante":
          expect(insp.piiDetected).toBe(false);
          expect(insp.recommendation).not.toMatch(/guarante|legal|compliant|100%/i);
          break;
        case "vazio":
          expect(insp.piiDetected).toBe(false);
          expect(insp.textoMascarado).toBe("");
          break;
        case "residuo":
          // QX-77-OMEGA: resíduo não classificado → naoMedido e nunca safe:true.
          expect(insp.naoMedido).toContain("codigo-interno");
          expect(insp.safe).toBe(false);
          expect(safe.safe).toBe(false);
          expect(safe.motivo).toBe("nao-medido");
          break;
        case "prompt-injection-as-data": {
          // tratado como texto: servidor não executa nada, devolve só a análise do mesmo texto.
          expect(insp.textoMascarado).toContain("Este trecho faz parte do documento analisado.");
          expect(safe.safe).toBe(false);
          expect(Object.keys(insp).sort()).toEqual(
            ["atrian", "findings", "motivo", "naoMedido", "piiDetected", "recommendation", "safe", "textoMascarado"].sort(),
          );
          break;
        }
        default:
          throw new Error(`caso sem asserção: ${k.id}`);
      }
    });
  }

  test("invariante: naoMedido nunca vira safe:true", async () => {
    for (const k of [...CASES.positiveCases, ...CASES.negativeAndBoundaryCases]) {
      if (!k.text) continue;
      const insp = await call(c, "guard_inspect", { text: k.text });
      const safe = await call(c, "guard_check_safe", { text: k.text });
      if (insp.naoMedido.length > 0) {
        expect(safe.safe).toBe(false);
        expect(safe.motivo).toBe("nao-medido");
        expect(insp.safe).toBe(false);
      }
    }
  });

  test("payload-grande: SERVER_MAX_BYTES+1 recusado com 413, sem eco", async () => {
    const big = "A".repeat(MAX_BODY_BYTES + 1);
    const r = await fetch(h.url + "/mcp", {
      method: "POST",
      headers: H,
      body: rpc("tools/call", { name: "guard_scan_pii", arguments: { text: big } }),
    });
    expect(r.status).toBe(413);
    const t = await r.text();
    expect(t).not.toContain("AAAAAAAAAA");
    expect(t.length).toBeLessThan(500);
  });
});

describe("hardening", () => {
  const post = (body: BodyInit, headers: Record<string, string> = H) =>
    fetch(h.url + "/mcp", { method: "POST", headers, body });

  test("content-type estrito: text/plain = 415", async () => {
    expect((await post("{}", { ...H, "content-type": "text/plain" })).status).toBe(415);
  });
  test("JSON inválido = 400 sem eco do corpo", async () => {
    const r = await post('{"segredo":"SEGREDO-ECO-1"');
    expect(r.status).toBe(400);
    expect(await r.text()).not.toContain("SEGREDO-ECO-1");
  });
  test("batch JSON-RPC acima do limite de elementos = 400", async () => {
    const batch = JSON.stringify(Array.from({ length: 50 }, (_, i) => ({ jsonrpc: "2.0", id: i, method: "tools/list" })));
    expect((await post(batch)).status).toBe(400);
  });
  test("argumentos inválidos devolvem erro sanitizado (sem stack/caminho)", async () => {
    const r = await post(rpc("tools/call", { name: "guard_scan_pii", arguments: { text: 123 } }));
    const t = await r.text();
    expect(t).not.toMatch(/\/home\/|node_modules|\bat .*\(.*:\d+:\d+\)/);
  });
  test("tool inexistente não derruba o servidor", async () => {
    await post(rpc("tools/call", { name: "nao_existe", arguments: {} }));
    expect((await fetch(h.url + "/health")).status).toBe(200);
  });
});

describe("log/audit não contém texto nem args", () => {
  test("texto secreto não aparece em stdout/stderr durante as 3 tools nem em erros", async () => {
    const SEGREDO = "SEGREDO-LOG-ZZ-4471 CPF 111.444.777-35";
    const out: string[] = [];
    const orig = { e: console.error, l: console.log, w: console.warn, i: console.info };
    const grab = (...a: unknown[]) => void out.push(a.map(String).join(" "));
    console.error = console.log = console.warn = console.info = grab as any;
    try {
      const c = await connect();
      for (const t of TOOL_NAMES) await call(c, t, { text: SEGREDO });
      await c.close();
      await fetch(h.url + "/mcp", { method: "POST", headers: H, body: `{"x":"${SEGREDO}"` });
      await fetch(h.url + "/mcp", { method: "POST", headers: { ...H, "content-type": "text/plain" }, body: SEGREDO });
    } finally {
      Object.assign(console, { error: orig.e, log: orig.l, warn: orig.w, info: orig.i });
    }
    const joined = out.join("\n");
    expect(joined.length).toBeGreaterThan(0); // o audit local escreveu algo (só metadados)
    expect(joined).not.toContain("SEGREDO-LOG-ZZ-4471");
    expect(joined).not.toContain("111.444.777-35");
  });
});

describe("timeout, concorrência, rate limit, shutdown", () => {
  const slow = (ms: number) => () => {
    const s = new McpServer({ name: "slow", version: "0" }, { capabilities: { tools: {} } });
    s.registerTool("guard_scan_pii", { inputSchema: {} as any }, (async () => {
      await new Promise((r) => setTimeout(r, ms));
      return { content: [{ type: "text", text: "{}" }] };
    }) as any);
    return s;
  };
  const callBody = rpc("tools/call", { name: "guard_scan_pii", arguments: {} });

  test("timeout: tool lenta = 504 em ~timeoutMs e o servidor segue de pé", async () => {
    const s = await startHttpServer({ port: 0, quiet: true, timeoutMs: 150, serverFactory: slow(2000) });
    const t0 = Date.now();
    const r = await fetch(s.url + "/mcp", { method: "POST", headers: H, body: callBody });
    const dt = Date.now() - t0;
    expect(r.status).toBe(504);
    expect(dt).toBeGreaterThanOrEqual(140);
    expect(dt).toBeLessThan(1000);
    expect((await fetch(s.url + "/health")).status).toBe(200);
    await s.close();
  });

  test("concurrency limit: acima de maxConcurrent = 503, dentro do limite = 200", async () => {
    const s = await startHttpServer({ port: 0, quiet: true, maxConcurrent: 2, rateLimitPerMinute: 1000, serverFactory: slow(300) });
    const rs = await Promise.all(
      Array.from({ length: 6 }, () => fetch(s.url + "/mcp", { method: "POST", headers: H, body: callBody }).then((r) => r.status)),
    );
    expect(rs.filter((x) => x === 200)).toHaveLength(2);
    expect(rs.filter((x) => x === 503)).toHaveLength(4);
    await s.close();
  });

  test("rate limit por IP: acima de N/min = 429 com retry-after", async () => {
    const s = await startHttpServer({ port: 0, quiet: true, rateLimitPerMinute: 5 });
    const rs: Response[] = [];
    for (let i = 0; i < 8; i++) rs.push(await fetch(s.url + "/mcp", { method: "POST", headers: H, body: rpc("tools/list") }));
    expect(rs.slice(0, 5).every((r) => r.status === 200)).toBe(true);
    expect(rs.slice(5).every((r) => r.status === 429)).toBe(true);
    expect(rs[5].headers.get("retry-after")).toBeTruthy();
    expect((await fetch(s.url + "/health")).status).toBe(200); // health fora do limite
    await s.close();
  });

  test("shutdown: close() espera a chamada em andamento e depois recusa conexões", async () => {
    const s = await startHttpServer({ port: 0, quiet: true, serverFactory: slow(300) });
    const emVoo = fetch(s.url + "/mcp", { method: "POST", headers: H, body: callBody });
    await new Promise((r) => setTimeout(r, 80));
    const fechando = s.close();
    expect((await emVoo).status).toBe(200);
    await fechando;
    await expect(fetch(s.url + "/health")).rejects.toThrow();
  });

  test("restart: processo real sobe, atende, morre limpo em SIGTERM (exit 0) e sobe de novo", async () => {
    const port = 39000 + Math.floor(Math.random() * 500);
    const run = async () => {
      const p = Bun.spawn(["bun", new URL("./http-bin.ts", import.meta.url).pathname], {
        env: { PATH: process.env.PATH ?? "", HOME: process.env.HOME ?? "", GUARD_MCP_HTTP_PORT: String(port) },
        stdout: "pipe",
        stderr: "pipe",
      });
      for (let i = 0; i < 60; i++) {
        try {
          if ((await fetch(`http://127.0.0.1:${port}/health`)).ok) break;
        } catch {}
        await new Promise((r) => setTimeout(r, 100));
      }
      const c = await connect(`http://127.0.0.1:${port}/mcp`);
      expect((await c.listTools()).tools).toHaveLength(3);
      await c.close();
      p.kill("SIGTERM");
      expect(await p.exited).toBe(0);
    };
    await run();
    await run();
  });
});

describe("Host/Origin (anti DNS rebinding)", () => {
  const rq = (headers: Record<string, string>) => ({ headers });
  test("bind loopback: Host estranho é negado, Host local passa", () => {
    expect(recusaHostOrigin(rq({ host: "evil.com" }), "127.0.0.1")).toBe("host not allowed");
    expect(recusaHostOrigin(rq({ host: "127.0.0.1:3917" }), "127.0.0.1")).toBeNull();
    expect(recusaHostOrigin(rq({ host: "localhost:3917" }), "127.0.0.1")).toBeNull();
    expect(recusaHostOrigin(rq({}), "127.0.0.1")).toBe("host not allowed");
  });
  test("Origin presente com lista vazia = negado; sem Origin passa; na lista passa", () => {
    expect(recusaHostOrigin(rq({ host: "127.0.0.1", origin: "https://evil.com" }), "127.0.0.1")).toBe("origin not allowed");
    expect(recusaHostOrigin(rq({ host: "127.0.0.1" }), "127.0.0.1")).toBeNull();
    expect(recusaHostOrigin(rq({ host: "127.0.0.1", origin: "https://ok.exemplo" }), "127.0.0.1", undefined, ["https://ok.exemplo"])).toBeNull();
    expect(recusaHostOrigin(rq({ host: "127.0.0.1", origin: "https://ok.exemplo.evil" }), "127.0.0.1", undefined, ["https://ok.exemplo"])).toBe("origin not allowed");
  });
  test("bind não-loopback sem lista não valida Host; com lista valida", () => {
    expect(recusaHostOrigin(rq({ host: "mcp.exemplo" }), "172.19.0.1")).toBeNull();
    expect(recusaHostOrigin(rq({ host: "outro" }), "172.19.0.1", ["mcp.exemplo"])).toBe("host not allowed");
  });
  test("servidor real devolve 403 para Origin hostil e para Host de rebinding", async () => {
    const r1 = await fetch(h.url + "/mcp", { method: "POST", headers: { ...H, origin: "https://evil.com" }, body: rpc("tools/list") });
    expect(r1.status).toBe(403);
    const r2 = await fetch(h.url + "/mcp", { method: "POST", headers: { ...H, host: "evil.com" }, body: rpc("tools/list") });
    expect(r2.status).toBe(403);
  });
});
