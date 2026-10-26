/**
 * proxy.ts — de onde vem a requisição, para o limite por origem (25/10/2026).
 *
 * Mesmo contrato de packages/mcp-unified-gateway/src/origem.ts (defeito #1163), SEM importar dele: este pacote é publicado sozinho no npm.
 *
 * DEFEITO (item da fila forja, 23/10): com trustProxy ligado o Guard lia a 1ª entrada do X-Forwarded-For de QUALQUER conexão.
 * Quem alcança a porta (outro container da ponte docker) escreve o cabeçalho como quiser: um IP inventado por pedido ganha
 * um balde novo de rate limit a cada vez. E a 1ª entrada é a que o CLIENTE escreveu, não a que o proxy anexou.
 *
 * Regra: o cabeçalho só vale quando o SOCKET é de proxy identificado (lista de IPs exatos ou CIDR em
 * GUARD_MCP_HTTP_TRUSTED_PROXIES; ausente = só loopback; "none" = ninguém). Com proxy confiável vale a entrada MAIS À
 * DIREITA que não é proxy (a que o nosso proxy anexou). Item ilegível na lista é descartado (confiar em menos, nunca em mais).
 * Em produção: o Caddy em container, IP exato (nunca a faixa da ponte, onde outros containers conectam direto).
 */
import { BlockList, isIP } from "node:net";
import type { IncomingMessage } from "node:http";

/** Padrão: só o loopback. */
export const PROXIES_PADRAO = "127.0.0.0/8,::1"; // replicavel-ok: padrão de loopback; a saída declarada é GUARD_MCP_HTTP_TRUSTED_PROXIES (env), lida em http-bin.ts

export interface Confiaveis {
  inclui(ip: string): boolean;
  itens: string[];
}

/** Tira colchetes, zona IPv6 (%eth0) e o prefixo IPv4-mapeado (::ffff:a.b.c.d). Vazio quando não há endereço. */
export function normalizar(ip: string | undefined | null): string {
  let s = String(ip ?? "").trim();
  if (s.startsWith("[") && s.includes("]")) s = s.slice(1, s.indexOf("]"));
  const z = s.indexOf("%");
  if (z >= 0) s = s.slice(0, z);
  const m = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(s);
  return m ? m[1] : s;
}

export function criarConfiaveis(spec: string | undefined, aviso: (m: string) => void = (m) => console.error(m)): Confiaveis {
  const bruto = (spec === undefined || spec.trim() === "" ? PROXIES_PADRAO : spec).trim();
  const lista = new BlockList();
  const itens: string[] = [];
  if (/^(none|nenhum)$/i.test(bruto)) return { inclui: () => false, itens };
  for (const parte of bruto.split(",").map((x) => x.trim()).filter(Boolean)) {
    const [endereco, prefixo, resto] = parte.split("/");
    const ip = normalizar(endereco);
    const fam = isIP(ip);
    const bits = prefixo === undefined ? undefined : /^\d{1,3}$/.test(prefixo) ? Number(prefixo) : NaN; // "a.b.c.d/" é ilegível, nunca /0
    const max = fam === 4 ? 32 : 128;
    const valido = fam !== 0 && resto === undefined && (bits === undefined || (Number.isInteger(bits) && bits >= 0 && bits <= max));
    if (!valido) { aviso(`[guard-mcp-http/proxy] item ignorado em GUARD_MCP_HTTP_TRUSTED_PROXIES (ilegível): "${parte.slice(0, 60)}"`); continue; }
    const tipo = fam === 4 ? "ipv4" : "ipv6";
    if (bits === undefined) lista.addAddress(ip, tipo); else lista.addSubnet(ip, bits, tipo);
    itens.push(parte);
  }
  return {
    itens,
    inclui(ip: string): boolean {
      const n = normalizar(ip);
      const fam = isIP(n);
      return fam !== 0 && lista.check(n, fam === 4 ? "ipv4" : "ipv6");
    },
  };
}

type ReqMin = Pick<IncomingMessage, "headers" | "socket">;

/** O X-Forwarded-For veio, mas a conexão não é de proxy nosso (foi ignorado)? */
export function xffIgnorado(req: ReqMin, c: Confiaveis): boolean {
  const peer = normalizar(req.socket?.remoteAddress);
  return req.headers["x-forwarded-for"] !== undefined && !(peer && c.inclui(peer));
}

/** IP do cliente (cru: quem chama só usa para balde e hash). Conexão direta ou de proxy desconhecido -> o endereço do socket. */
export function ipDeOrigem(req: ReqMin, c: Confiaveis): string {
  const peer = normalizar(req.socket?.remoteAddress);
  if (!peer) return "?";
  if (!c.inclui(peer)) return peer;
  const h = req.headers["x-forwarded-for"];
  const xff = (Array.isArray(h) ? h.join(",") : String(h ?? "")).split(",").map((x) => normalizar(x)).filter(Boolean);
  for (let i = xff.length - 1; i >= 0; i--) if (!c.inclui(xff[i])) return xff[i];
  return xff.length ? xff[0] : peer;
}
