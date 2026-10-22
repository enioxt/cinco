import "./teste-sem-supabase.js";
import { describe, expect, test } from "bun:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { createGuardServer, TOOL_NAMES } from "./server.js";

const ANNOTATIONS = { readOnlyHint: true, openWorldHint: false, destructiveHint: false };

describe("registry comum das 3 tools", () => {
  test("golden: exatamente as 3 tools atuais, com as 3 hints do contrato", async () => {
    const { InMemoryTransport } = await import("@modelcontextprotocol/sdk/inMemory.js");
    const [ct, st] = InMemoryTransport.createLinkedPair();
    const server = createGuardServer();
    const client = new Client({ name: "t", version: "0" });
    await Promise.all([server.connect(st), client.connect(ct)]);
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual([...TOOL_NAMES].sort());
    for (const t of tools) expect(t.annotations).toMatchObject(ANNOTATIONS);
    await client.close();
  });
});

describe("stdio continua funcionando", () => {
  test("initialize + listTools + callTool via processo filho", async () => {
    const transport = new StdioClientTransport({
      command: "bun",
      args: [new URL("./index.ts", import.meta.url).pathname],
      env: { PATH: process.env.PATH ?? "", HOME: process.env.HOME ?? "" },
    });
    const client = new Client({ name: "t", version: "0" });
    await client.connect(transport);
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual([...TOOL_NAMES].sort());
    const r: any = await client.callTool({ name: "guard_scan_pii", arguments: { text: "CPF 123.456.789-09" } });
    expect(JSON.parse(r.content[0].text).piiCount).toBeGreaterThan(0);
    await client.close();
  }, 60_000); // sobe um processo real; o padrão de 5 s do bun estoura com a máquina carregada (prova-publica, 21/10). Só o prazo; asserções intactas.
});

describe("rodapé EGOS opcional (GUARD_MCP_RODAPE_EGOS)", () => {
  async function chamar(tool: string) {
    const { InMemoryTransport } = await import("@modelcontextprotocol/sdk/inMemory.js");
    const [ct, st] = InMemoryTransport.createLinkedPair();
    const server = createGuardServer();
    const client = new Client({ name: "t", version: "0" });
    await Promise.all([server.connect(st), client.connect(ct)]);
    const r: any = await client.callTool({ name: tool, arguments: { text: "Texto curto." } });
    await client.close();
    return r.content as Array<{ type: string; text: string }>;
  }
  test("desligado por padrão: só o bloco JSON", async () => {
    delete process.env.GUARD_MCP_RODAPE_EGOS;
    for (const t of TOOL_NAMES) expect(await chamar(t)).toHaveLength(1);
  });
  test("ligado: 2º bloco com egos.ia.br/portas, JSON do 1º bloco intacto", async () => {
    process.env.GUARD_MCP_RODAPE_EGOS = "1";
    try {
      for (const t of TOOL_NAMES) {
        const c = await chamar(t);
        expect(c).toHaveLength(2);
        expect(() => JSON.parse(c[0].text)).not.toThrow();
        expect(c[1].text).toContain("egos.ia.br/portas/#guard-brasil");
      }
    } finally {
      delete process.env.GUARD_MCP_RODAPE_EGOS;
    }
  });
});

describe("versão anunciada", () => {
  test("MCP_VERSION é a do package.json, a mesma que o npm publica", async () => {
    const { MCP_VERSION } = await import("./server.js");
    const pkg = JSON.parse(await Bun.file(new URL("../package.json", import.meta.url)).text());
    expect(MCP_VERSION).toBe(pkg.version);
  });
});
