/**
 * rotas-conversas.ts — GET /api/conversas + GET /api/sessoes-vivas (NOTIFICACOES-HISTORICO-
 * NA-TELA-001). Thin HTTP layer sobre coletores-conversas.ts/coletores-sessoes.ts — mesmo
 * contrato de tratarHistoricoGet/tratarNotificacoesGet: sempre 200, fonte ilegível vira
 * "⚪ ..." dentro da resposta (=R13-c), nunca um 500.
 *
 * "-vivas" (não "/api/sessoes" puro): esse nome já existe em orquestra-viva.ts (sessões por
 * TRANSCRIPT, listarSessoes() de coletores-agentes.ts) — colidiria e a 2ª entrada no
 * if-chain nunca rodaria. Aqui é processo vivo AGORA (ps), fonte diferente, nome diferente.
 */
import { montarConversas } from "./coletores-conversas";
import { montarSessoesVivas } from "./coletores-sessoes";

export async function tratarConversasGet(url: URL): Promise<Response> {
  const horasParam = Number(url.searchParams.get("horas") ?? "48");
  const horas = Number.isFinite(horasParam) && horasParam > 0 ? horasParam : 48;
  return Response.json(montarConversas(horas));
}

export async function tratarSessoesGet(): Promise<Response> {
  return Response.json(montarSessoesVivas());
}
