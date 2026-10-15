import { afterAll, beforeAll, expect, test } from "bun:test";
import { spawn } from "node:child_process";
import { createServer, type Server } from "node:http";
import { join } from "node:path";

const BIN = join(import.meta.dir, "bin/egosbr.mjs");
const PKG = await Bun.file(join(import.meta.dir, "package.json")).json();
let srv: Server;
let url = "";
const recebidos: unknown[] = [];

// Conector falso: responde initialize, tools/list e tools/call como o público (JSON direto), 202 para notificação.
beforeAll(async () => {
  srv = createServer((req, res) => {
    let b = "";
    req.on("data", (c) => (b += c));
    req.on("end", () => {
      const m = JSON.parse(b);
      recebidos.push(m);
      if (m.id === undefined) { res.writeHead(202).end(); return; }
      const result =
        m.method === "initialize" ? { protocolVersion: "2025-06-18", capabilities: { tools: {} }, serverInfo: { name: "egos-publico", version: "t" } }
        : m.method === "tools/list" ? { tools: [{ name: "diagnostico_0_infinito", description: "d" }] }
        : { content: [{ type: "text", text: JSON.stringify({ motor_versao: "1.0.0", como_usar: "x", dimensoes: [{ ordem: 1, nome: "Problema", pergunta: "Qual?" }] }) }] };
      res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({ jsonrpc: "2.0", id: m.id, result }));
    });
  });
  await new Promise<void>((r) => srv.listen(0, "127.0.0.1", () => r()));
  url = `http://127.0.0.1:${(srv.address() as { port: number }).port}/publico/mcp`;
});
afterAll(() => srv.close());

// Assíncrono de propósito: o conector falso roda neste mesmo processo, e um spawnSync travaria o laço que o atende.
async function rodar(args: string[]): Promise<{ status: number | null; stdout: string }> {
  const p = spawn(process.execPath, [BIN, ...args], { env: { ...process.env, EGOSBR_MCP_URL: url } });
  let stdout = "";
  p.stdout.on("data", (c) => (stdout += c));
  const status = await new Promise<number | null>((r) => p.on("close", r));
  return { status, stdout };
}

test("--version bate com o package.json; --help lista os comandos", async () => {
  expect((await rodar(["--version"])).stdout.trim()).toBe(PKG.version);
  const h = (await rodar(["--help"])).stdout;
  for (const c of ["instalar", "ferramentas", "diagnostico", "mcp"]) expect(h).toContain(c);
});

test("pacote publica só o necessário e tem bin executável por npx/bunx", () => {
  expect(PKG.name).toBe("egosbr");
  expect(PKG.bin).toEqual({ egosbr: "bin/egosbr.mjs" });
  expect(PKG.files).toEqual(["bin/", "portas.json", "README.md", "LICENSE"]);
  expect(PKG.license).toBe("MIT");
  expect(PKG.dependencies).toBeUndefined();
});

test("sem argumentos lista as portas do portas.json empacotado", async () => {
  const r = await rodar([]);
  expect(r.status).toBe(0);
  expect(r.stdout).toContain("Conector MCP público");
  expect(r.stdout).toContain("egosbr");
});

test("instalar devolve o comando de cada cliente; cliente desconhecido sai 2", async () => {
  expect((await rodar(["instalar", "codex"])).stdout).toContain(`codex mcp add egos --url ${url}`);
  expect((await rodar(["instalar", "stdio"])).stdout).toContain('"egosbr"');
  expect((await rodar(["instalar", "xyz"])).status).toBe(2);
});

test("diagnostico e ferramentas falam com o conector (falso) e mostram o resultado", async () => {
  expect((await rodar(["diagnostico"])).stdout).toContain("1. Problema: Qual?");
  expect((await rodar(["ferramentas"])).stdout).toContain("diagnostico_0_infinito");
});

test("ponte stdio: cada linha vira POST; respostas voltam como linhas; notificação não gera saída", async () => {
  const p = spawn(process.execPath, [BIN, "mcp"], { env: { ...process.env, EGOSBR_MCP_URL: url } });
  let out = "";
  p.stdout.on("data", (c) => (out += c));
  p.stdin.write(JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} }) + "\n");
  p.stdin.write(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) + "\n");
  p.stdin.write(JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list" }) + "\n");
  p.stdin.write("isto não é json\n");
  p.stdin.end();
  await new Promise((r) => p.on("close", r));
  const linhas = out.trim().split("\n").map((l) => JSON.parse(l));
  expect(linhas.map((l) => l.id)).toEqual([1, 2, null]);
  expect(linhas[0].result.serverInfo.name).toBe("egos-publico");
  expect(linhas[1].result.tools[0].name).toBe("diagnostico_0_infinito");
  expect(linhas[2].error.code).toBe(-32700);
});

// Guarda contra o portas.json velho dentro do pacote publicado: tem de ser byte a byte o que o gerador da casa produz.
test("portas.json do pacote é idêntico ao gerado por scripts/descoberta-site.ts", async () => {
  const raiz = join(import.meta.dir, "../..");
  const p = spawn("bun", [join(raiz, "scripts/descoberta-site.ts"), "--check"], { cwd: raiz });
  let err = "";
  p.stdout.on("data", () => {});
  p.stderr.on("data", (c) => (err += c));
  const status = await new Promise<number | null>((r) => p.on("close", r));
  expect(status, err).toBe(0);
  const gerado = await Bun.file(join(raiz, "apps/egos-landing/public/portas.json")).text();
  const doPacote = await Bun.file(join(import.meta.dir, "portas.json")).text();
  expect(doPacote).toBe(gerado);
});
