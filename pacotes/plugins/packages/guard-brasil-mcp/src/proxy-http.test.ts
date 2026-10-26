import "./teste-sem-supabase.js";
import { afterEach, describe, expect, test } from "bun:test";
import { startHttpServer, type HttpHandle } from "./http.js";

/**
 * Defeito irmão do #1163 (item da fila forja de 23/10): com trustProxy ligado, o Guard HTTP lia a 1ª entrada do
 * X-Forwarded-For de QUALQUER conexão. Quem alcança a porta (outro container da ponte docker) escrevia o cabeçalho e
 * ganhava um balde novo de rate limit a cada pedido. Agora o cabeçalho só vale quando o SOCKET é um proxy listado.
 */
const H = { "content-type": "application/json", accept: "application/json, text/event-stream" };
let h: HttpHandle | undefined;
afterEach(async () => { await h?.close(); h = undefined; });

/** Dispara n POSTs; devolve quantos levaram 429. O limite é checado antes do corpo, então o corpo pode ser mínimo. */
async function rajada(n: number, xff: (i: number) => string | undefined): Promise<number> {
  let bloqueios = 0;
  for (let i = 0; i < n; i++) {
    const extra = xff(i);
    const r = await fetch(`${h!.url}/mcp`, { method: "POST", headers: { ...H, ...(extra ? { "x-forwarded-for": extra } : {}) }, body: "{}" });
    await r.arrayBuffer();
    if (r.status === 429) bloqueios++;
  }
  return bloqueios;
}

describe("trustProxy: X-Forwarded-For só vale quando a conexão é de proxy listado", () => {
  test("vizinho (socket fora da lista) alternando o cabeçalho: 1 origem, 125 pedidos -> 5 bloqueios", async () => {
    // A lista só tem 10.255.255.1; o cliente do teste fala de 127.0.0.1, ou seja, é um "vizinho" qualquer.
    h = await startHttpServer({ port: 0, quiet: true, trustProxy: true, trustedProxies: "10.255.255.1" });
    expect(await rajada(125, (i) => `203.0.113.${i % 250}`)).toBe(5);
  });

  test("sem listar nada, o padrão é só loopback: o proxy local é confiável e cada cliente do cabeçalho tem seu balde", async () => {
    h = await startHttpServer({ port: 0, quiet: true, trustProxy: true });
    expect(await rajada(125, (i) => `203.0.113.${i % 250}`)).toBe(0);
  });

  test("proxy listado: vale a entrada mais à direita que não é proxy (a que o proxy anexou), não a que o cliente escreveu à esquerda", async () => {
    h = await startHttpServer({ port: 0, quiet: true, trustProxy: true, rateLimitPerMinute: 3, trustedProxies: "127.0.0.1,::1" });
    // O cliente forja a esquerda, mas o proxy anexou 198.51.100.7 à direita: tudo é uma origem só -> 4º pedido bloqueado.
    expect(await rajada(4, (i) => `10.9.9.${i}, 198.51.100.7`)).toBe(1);
  });

  test("trustProxy desligado: o cabeçalho nunca conta", async () => {
    h = await startHttpServer({ port: 0, quiet: true, rateLimitPerMinute: 3 });
    expect(await rajada(4, (i) => `203.0.113.${i}`)).toBe(1);
  });
});
