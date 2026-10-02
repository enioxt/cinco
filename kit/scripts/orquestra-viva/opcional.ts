/**
 * opcional.ts — carregamento tolerante de módulo pessoal (KIT-APP-IMPORT-TARDIO-001).
 *
 * O kit público não leva os módulos de integração pessoal (WhatsApp, Google, agenda, gastos…).
 * Import estático deles no topo derrubava o servidor inteiro na máquina de quem baixa. Aqui o
 * módulo é carregado por `import()` dentro de try/catch: ausente = `null` + motivo dito em voz
 * alta; NUNCA dado vazio fingindo ter medido (=R13-a). Só "módulo não encontrado" é tolerado —
 * erro de sintaxe/execução num módulo que EXISTE continua subindo (fail visível).
 */

const RE_AUSENTE = /Cannot find module|Cannot find package|ERR_MODULE_NOT_FOUND|Module not found/i;

/**
 * `especificador` é o MESMO texto passado ao import(). Só vira `null` quando o módulo ausente é
 * ELE: se ele existe e o que falta é algo que ele importa, é quebra de verdade e lança (revisão
 * Prime 30/09 — sem isso, um import perdido por engano na máquina do Enio aparecia como gaveta
 * "não instalada" em vez de erro).
 */
export async function carregarOpcional<T>(carregar: () => Promise<T>, especificador: string): Promise<T | null> {
  try {
    return await carregar();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // Formato do Bun: "Cannot find module '<pedido>' from '<quem pediu>'" — casa só o <pedido>.
    const pedido = msg.match(/Cannot find (?:module|package) ['"]([^'"]+)['"]/)?.[1];
    if (RE_AUSENTE.test(msg) && pedido === especificador) return null;
    throw e;
  }
}

export function motivoAusente(nome: string): string {
  return `módulo ${nome} não instalado nesta máquina`;
}

/** Corpo padrão de gaveta/rota cujo módulo não existe aqui. */
export function corpoIndisponivel(nome: string): { disponivel: false; motivo: string } {
  return { disponivel: false, motivo: motivoAusente(nome) };
}

export function respostaIndisponivel(nome: string): Response {
  return Response.json(corpoIndisponivel(nome));
}
