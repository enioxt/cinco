import { describe, expect, test } from "bun:test";
import { criarConfiaveis, ipDeOrigem, normalizar, xffIgnorado } from "./proxy.js";

const req = (peer: string, xff?: string) => ({ headers: xff === undefined ? {} : { "x-forwarded-for": xff }, socket: { remoteAddress: peer } }) as never;
const mudo = () => {};

describe("proxy: quem é proxy nosso", () => {
  test("padrão = só loopback (v4, v6 e v4-mapeado)", () => {
    const c = criarConfiaveis(undefined);
    for (const ip of ["127.0.0.1", "127.9.9.9", "::1", "::ffff:127.0.0.1"]) expect(c.inclui(ip)).toBe(true);
    expect(c.inclui("172.19.0.5")).toBe(false);
  });
  test("lista com IP exato: só ele, não a faixa da ponte", () => {
    const c = criarConfiaveis("172.19.0.5");
    expect(c.inclui("172.19.0.5")).toBe(true);
    expect(c.inclui("172.19.0.6")).toBe(false);
  });
  test('"none" = ninguém, nem o loopback', () => {
    const c = criarConfiaveis("none");
    expect(c.inclui("127.0.0.1")).toBe(false);
  });
  test("item ilegível é descartado e avisado; nunca vira confiança maior", () => {
    const avisos: string[] = [];
    const c = criarConfiaveis("lixo, 10.0.0.1/, 10.0.0.2/99, 10.0.0.3", (m) => avisos.push(m));
    expect(c.itens).toEqual(["10.0.0.3"]);
    expect(avisos.length).toBe(3);
    expect(c.inclui("10.0.0.1")).toBe(false);
  });
  test("normalizar", () => {
    expect(normalizar("[::1]")).toBe("::1");
    expect(normalizar("::ffff:10.1.2.3")).toBe("10.1.2.3");
    expect(normalizar(undefined)).toBe("");
  });
});

describe("proxy: origem do cliente", () => {
  const c = criarConfiaveis("172.19.0.5", mudo);
  test("conexão direta de vizinho: o cabeçalho é ignorado, vale o socket", () => {
    expect(ipDeOrigem(req("172.19.0.9", "1.2.3.4"), c)).toBe("172.19.0.9");
    expect(xffIgnorado(req("172.19.0.9", "1.2.3.4"), c)).toBe(true);
  });
  test("sem cabeçalho, nada a ignorar", () => {
    expect(xffIgnorado(req("172.19.0.9"), c)).toBe(false);
  });
  test("proxy listado: vale a entrada mais à direita que não é proxy; o que o cliente escreveu à esquerda não decide", () => {
    expect(ipDeOrigem(req("172.19.0.5", "9.9.9.9, 198.51.100.7"), c)).toBe("198.51.100.7");
    expect(ipDeOrigem(req("172.19.0.5", "198.51.100.7, 172.19.0.5"), c)).toBe("198.51.100.7");
    expect(xffIgnorado(req("172.19.0.5", "198.51.100.7"), c)).toBe(false);
  });
  test("proxy listado sem cabeçalho: o próprio proxy", () => {
    expect(ipDeOrigem(req("172.19.0.5"), c)).toBe("172.19.0.5");
  });
  test("sem endereço no socket: marcador fixo", () => {
    expect(ipDeOrigem({ headers: {}, socket: {} } as never, c)).toBe("?");
  });
});
