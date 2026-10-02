/**
 * rotas-roteiro-projeto.ts — GET /api/roteiro-projeto (item 3 de ROTEIRO-CHECKLIST-CONSTANTE-
 * 001, Prime 15/09). Thin HTTP layer sobre `scripts/roteiro-projeto.ts` (`gerar()`) — mesmo
 * contrato de `rotas-conversas.ts`: sempre 200, fonte ilegível vira "⚪ ..." dentro da
 * resposta (=R13-c), nunca um 500 nem um `process.exit` que derrubaria o app inteiro.
 *
 * Nome do arquivo (não "rotas-roteiro.ts" — esse já existe, ROTEIRO-GRUPO-001, checklist do
 * grupo de WhatsApp): programa diferente, arquivo diferente, para não colidir na leitura de
 * quem procura "roteiro" no repo.
 *
 * Variante INTERNA (não a `--publico` do cinco): esta rota serve só o EGOS APP local do
 * Enio — PCA/motivo específico do 'gated' aparece aqui de propósito (R-ENTREGA-PURA-001 é
 * sobre o que sai PARA FORA; dentro de casa a proveniência da decisão é exatamente o que se
 * quer ver).
 */
import { carregarOpcional, respostaIndisponivel } from "./opcional";

// Motor pessoal: não viaja no kit público — ausente = `disponivel:false`, o servidor sobe.
const NOME_MOTOR = "roteiro-projeto";
const motor = await carregarOpcional(() => import("../roteiro-projeto.ts"), "../roteiro-projeto.ts");

export async function tratarRoteiroProjetoGet(): Promise<Response> {
  if (!motor) return respostaIndisponivel(NOME_MOTOR);
  const { gerar, ErroRoteiro } = motor;
  try {
    const roteiro = gerar(14);
    return Response.json({ ok: true, roteiro });
  } catch (e) {
    const msg = e instanceof ErroRoteiro ? e.message : e instanceof Error ? e.message : String(e);
    return Response.json({ ok: false, erro: `⚪ ${msg}` });
  }
}
