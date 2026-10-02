/**
 * rede-guarda.ts — guarda de acesso do EGOS APP quando ele sai do localhost.
 *
 * Regra (EGOS-APP-CELULAR-001, corte Enio 01/09): o bind fora de 127.0.0.1 é
 * OPT-IN e fail-closed — sem token declarado, o servidor RECUSA subir em rede.
 * Localhost segue como hoje (sem token). Requisição remota só passa com o
 * token exato (query `?t=` na primeira visita → cookie depois).
 *
 * P4: transcrições, WhatsApp e fila passam por aqui — na dúvida, NEGA.
 */

export type ConfigRede = {
  bind: string;
  erro: string | null;
};

/** Decide o bind a partir do ambiente. Rede sem token = erro, nunca sobe. */
export function validarConfigRede(env: Record<string, string | undefined>): ConfigRede {
  const querRede = env.EGOS_APP_REDE === "1";
  if (!querRede) return { bind: "127.0.0.1", erro: null };
  const token = (env.EGOS_APP_TOKEN ?? "").trim();
  if (token.length < 16) {
    return {
      bind: "127.0.0.1",
      erro:
        "EGOS_APP_REDE=1 exige EGOS_APP_TOKEN com 16+ caracteres — sem ele o app fica no localhost (fail-closed).",
    };
  }
  return { bind: "0.0.0.0", erro: null };
}

/** Caminhos servíveis sem token mesmo em rede (nada sensível neles). */
// APP-MULTIDISPOSITIVO-001: instalar o app no celular/TV exige que o instalador leia manifest,
// ícones e o service worker ANTES de qualquer sessão — com token, a instalação não acontece.
// Nenhum deles carrega dado: são casca. O SW, por desenho, não guarda rota de dado em cache.
const PUBLICOS_EM_REDE = new Set(["/manifest.webmanifest", "/icone.svg", "/icone-maskable.svg", "/sw.js"]);

export type Acesso = {
  ok: boolean;
  motivo: string;
  /** token validado agora via query — o chamador grava o cookie. */
  gravarCookie: boolean;
};

/** Julga uma requisição. ipRemoto null = não medido = trata como remoto (NEGA). */
export function decideAcesso(args: {
  ipRemoto: string | null;
  caminho: string;
  tokenQuery: string | null;
  tokenCookie: string | null;
  tokenEsperado: string;
}): Acesso {
  const { ipRemoto, caminho, tokenQuery, tokenCookie, tokenEsperado } = args;
  const local =
    ipRemoto === "127.0.0.1" || ipRemoto === "::1" || ipRemoto === "::ffff:127.0.0.1";
  if (local) return { ok: true, motivo: "localhost", gravarCookie: false };
  if (PUBLICOS_EM_REDE.has(caminho))
    return { ok: true, motivo: "publico-em-rede", gravarCookie: false };
  if (!tokenEsperado)
    return { ok: false, motivo: "rede-sem-token-configurado", gravarCookie: false };
  if (tokenCookie === tokenEsperado)
    return { ok: true, motivo: "cookie", gravarCookie: false };
  if (tokenQuery === tokenEsperado)
    return { ok: true, motivo: "query-primeira-visita", gravarCookie: true };
  return { ok: false, motivo: "token-ausente-ou-errado", gravarCookie: false };
}
