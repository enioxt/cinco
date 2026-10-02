/**
 * rotas-pessoas.ts — GET /api/pessoas (WPP-FILA-TRIAGEM-QUEM-E-001, sub-item de
 * WHATSAPP-SESSAO-COM-REGRAS-001). Camada FINA sobre scripts/wpp-triagem.ts (que já é
 * quem lê os cartões de ~/.egos/contatos/ e a régua de ordenação) — mesmo padrão de
 * rotas-conversas.ts: sempre 200, cartão ilegível já some da lista dentro do próprio
 * `listarCartoes()` (=R13-c), nunca derruba a resposta.
 *
 * P4: texto de quem não é do círculo trunca a 60 chars (fraseParaExibicao) — nunca o
 * jid inteiro (jid_mascarado já sai mascarado do motor). Zero chamada de rede aqui.
 */
import { carregarOpcional, corpoIndisponivel } from "./opcional";

// Motor pessoal: não viaja no kit público — ausente = `disponivel:false`, o servidor sobe.
type Cartao = import("../wpp-triagem").Cartao;
const NOME_MOTOR = "wpp-triagem";
const motor = await carregarOpcional(() => import("../wpp-triagem"), "../wpp-triagem");

export interface PessoaApi {
  hash: string;
  jid_mascarado: string;
  pushName: string;
  apelido_circulo: string | null;
  canais: string[];
  n_mensagens: number;
  primeira_em: string;
  ultima_em: string;
  respondido: boolean | null;
  categoria: string;
  confirmado: boolean;
  frase_de_origem: string | null;
  regra: string;
  urgencia: string;
  motor_versao: string;
  atualizadoEm: string;
}

function paraApi(c: Cartao, fraseParaExibicao: (c: Cartao) => string | null): PessoaApi {
  return {
    hash: c.hash,
    jid_mascarado: c.jid_mascarado,
    pushName: c.proposta.pushName,
    apelido_circulo: c.proposta.apelido_circulo,
    canais: c.proposta.canais,
    n_mensagens: c.proposta.n_mensagens,
    primeira_em: c.proposta.primeira_em,
    ultima_em: c.proposta.ultima_em,
    respondido: c.proposta.respondido,
    categoria: c.confirmacao?.categoria ?? c.proposta.categoria_proposta,
    confirmado: c.confirmacao !== null,
    frase_de_origem: fraseParaExibicao(c),
    regra: c.proposta.regra,
    urgencia: c.proposta.urgencia,
    motor_versao: c.proposta.motor_versao,
    atualizadoEm: c.atualizadoEm,
  };
}

export function montarPessoasApi(): { geradoEm: string; pessoas: PessoaApi[]; disponivel?: false; motivo?: string } {
  if (!motor) return { geradoEm: new Date().toISOString(), pessoas: [], ...corpoIndisponivel(NOME_MOTOR) };
  const { fraseParaExibicao, listarCartoes, ordenarCartoesParaExibicao } = motor;
  const cartoes = ordenarCartoesParaExibicao(listarCartoes());
  return { geradoEm: new Date().toISOString(), pessoas: cartoes.map((c) => paraApi(c, fraseParaExibicao)) };
}

export async function tratarPessoasGet(): Promise<Response> {
  return Response.json(montarPessoasApi());
}
