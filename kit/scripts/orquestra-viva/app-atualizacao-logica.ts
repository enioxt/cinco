/**
 * app-atualizacao-logica.ts — EGOS-APP-ATUALIZACAO-FLUIDA-001 (corte Enio 15/09, verbatim:
 * "deve reiniciar de forma fluida ... não deve ser preciso reiniciar para as alterações
 * entrarem aqui"). FONTE ÚNICA de toda decisão pura do lado do cliente — o navegador NÃO
 * importa TS (mesmo motivo de app-toast-logica.ts), então app-atualizacao.js MIRRORA estas
 * funções byte-a-byte comentadas "mirror de app-atualizacao-logica.ts:<nome>". Mudou aqui →
 * mudar lá também, na mesma revisão.
 */

export type TipoAtualizacao = "ativos" | "servidor" | null;

export interface RespostaAtualizacao {
  desatualizado: boolean;
  tipo: TipoAtualizacao;
  hashVersao: string;
}

export type Acao = "nada" | "aplicar-ativos" | "aplicar-servidor" | "adiar";

/** Dedup — R16-a "menos ruído": a MESMA versão já aplicada/mostrada não avisa de novo. */
export function jaAplicado(hashAtual: string, ultimoAplicado: string | null): boolean {
  return ultimoAplicado !== null && ultimoAplicado === hashAtual;
}

/** Decide a ação sem nenhum efeito colateral (sem fetch, sem DOM) — testável isolada.
 *  Ordem importa: dedup e foco vêm ANTES do tipo, porque os dois valem para os dois casos
 *  (nunca interrompe quem está digitando, nunca repete o mesmo aviso). */
export function decidirAcao(
  resp: RespostaAtualizacao,
  ultimoAplicadoHash: string | null,
  temFocoEmCampo: boolean,
): Acao {
  if (!resp.desatualizado || resp.tipo === null) return "nada";
  if (jaAplicado(resp.hashVersao, ultimoAplicadoHash)) return "nada";
  if (temFocoEmCampo) return "adiar";
  return resp.tipo === "ativos" ? "aplicar-ativos" : "aplicar-servidor";
}

// ── espera do processo voltar (caso "servidor") ──────────────────────────────────────────
export const INTERVALO_ESPERA_MS = 500;
export const TIMEOUT_ESPERA_MS = 15000;
export const TENTATIVAS_MAX = Math.ceil(TIMEOUT_ESPERA_MS / INTERVALO_ESPERA_MS); // 30

/** Loop de espera INJETÁVEL (checar/esperar como parâmetro) — testável sem timer real e sem
 *  rede real. `checar()` que rejeita/lança conta como "ainda não voltou", nunca derruba o
 *  loop (o processo pode estar literalmente no meio do restart). */
export async function esperarServidorVoltar(
  checar: () => Promise<boolean>,
  tentativas: number = TENTATIVAS_MAX,
  esperar: () => Promise<void> = () => new Promise((res) => setTimeout(res, INTERVALO_ESPERA_MS)),
): Promise<boolean> {
  for (let i = 0; i < tentativas; i++) {
    await esperar();
    try {
      if (await checar()) return true;
    } catch {
      // ainda reiniciando — tenta de novo, silêncio aqui não é sucesso-fantasma (=R13-a):
      // quem decide "desistiu" é o `for` acabar, não este catch.
    }
  }
  return false;
}
