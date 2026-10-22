import { limparSupabase } from "./teste-sem-supabase.js";
import { afterEach, describe, expect, test } from "bun:test";
import { trackMcpTool } from "./internal/shared-utils.js";

// Nenhum teste deste pacote pode falar com o Supabase real. Rodado da raiz do repo, o bun carrega o .env
// (SUPABASE_URL + chave de serviço) e o trackMcpTool gravava em mcp_audit_events de produção (2500 linhas
// de teste entre #803 e 21/10). Este arquivo é o alarme: falha se a chave estiver no ambiente do teste
// ou se qualquer tool tentar sair para a rede por causa dela.
const CHAVES = [
  "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_ANON_KEY", "SUPABASE_ACCESS_TOKEN",
  "EGOS_SUPABASE_URL", "EGOS_SUPABASE_SERVICE_KEY", "EGOS_SUPABASE_KEY",
];

describe("isolamento do Supabase nos testes do pacote", () => {
  const fetchOriginal = globalThis.fetch;
  afterEach(() => { globalThis.fetch = fetchOriginal; });

  test("nenhuma chave do Supabase está no ambiente durante os testes", () => {
    const presentes = CHAVES.filter((k) => process.env[k] !== undefined);
    expect(presentes).toEqual([]);
  });

  test("trackMcpTool não faz chamada de rede (audit fica só no stderr)", async () => {
    const chamadas: string[] = [];
    globalThis.fetch = (async (url: unknown) => { chamadas.push(String(url).replace(/\?.*$/, "")); return new Response("{}", { status: 201 }); }) as typeof fetch;
    const r = await trackMcpTool("guard-brasil", "isolamento", async () => 42);
    expect(r).toBe(42);
    expect(chamadas).toEqual([]);
  });
});

describe("limparSupabase", () => {
  test("remove SUPABASE_* e EGOS_SUPABASE_*, preserva o resto", () => {
    const env: Record<string, string | undefined> = { SUPABASE_URL: "a", EGOS_SUPABASE_KEY: "b", SUPABASE_ANON_KEY: "c", PATH: "/bin", GUARD_MCP_HTTP_PORT: "1" };
    const removidas = limparSupabase(env);
    expect(removidas.sort()).toEqual(["EGOS_SUPABASE_KEY", "SUPABASE_ANON_KEY", "SUPABASE_URL"]);
    expect(env).toEqual({ PATH: "/bin", GUARD_MCP_HTTP_PORT: "1" });
  });
});
