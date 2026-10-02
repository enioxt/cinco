#!/usr/bin/env bun
/**
 * coletores-gastos-estimativa.ts — estimador de custo para sessão PRINCIPAL SEM `cost-state`
 * (GASTOS-VISIVEIS-001, correção 15/09: "sessão sem cost-state some do real").
 *
 * Medido 15/09: só 22 de 53 `${DIR_IA}/projects/*​/*.jsonl` têm linha `cost-state` — a sessão
 * viva e longa desta máquina (24MB) não emitiu nenhuma ainda, e por isso não aparecia em
 * nenhuma tabela ("Top sessões"/"Por pessoa"/"Por projeto"), subcontando o total "real" sem
 * avisar (erro confiante, =R-ORIGEM-LIMPA-001). Este módulo cobre a lacuna: soma `usage` de
 * cada linha `message` do transcript, converte pela ÚNICA tabela de preço do repo
 * (`scripts/lib/precos-claude.ts`) e devolve um total "estimado" — NUNCA confundido com o
 * "real" do Claude Code, que é o que este arquivo não sabe calcular.
 *
 * Leitura por STREAM (readline sobre `createReadStream`) — nunca `readFileSync` do arquivo
 * inteiro: sessões medidas passam de 40MB, e o poll de 60s do app não pode segurar isso em
 * memória a cada rodada por sessão sem cost-state.
 *
 * Dedup por `message.id`: o mesmo `message.id` aparece em múltiplas linhas do streaming
 * (delta de tokens sendo escrito) — sem dedup o total infla (achado documentado no cabeçalho
 * de `precos-claude.ts`: 427 linhas com usage / 231 message.id únicos = 1,85×).
 */
import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { carregarOpcional, motivoAusente } from "./opcional";

// Tabela de preço pessoal: não viaja no kit público. Ausente: `motivoPrecosAusente` diz por quê
// e a rota de gastos responde `disponivel:false`; estimar sem ela falha VISÍVEL (nunca soma 0).
type UsageClaude = import("../lib/precos-claude").UsageClaude;
const precos = await carregarOpcional(() => import("../lib/precos-claude"), "../lib/precos-claude");
export const motivoPrecosAusente: string | null = precos ? null : motivoAusente("precos-claude");
import type { ModeloDeSessao } from "./coletores-gastos-sessoes";

export interface EstimativaSessao {
  modelos: ModeloDeSessao[];
  usdEstimado: number;
  /** true quando 1+ modelo visto não tem preço na tabela — custo desse modelo fica de fora da
   * soma (NUNCA estimado com preço de outro modelo — contrato de `custoUsd`), declarado aqui
   * para o chamador expor "⚪ inclui modelo sem preço tabelado" em vez de silêncio. */
  temModeloSemPreco: boolean;
}

interface AcumuladorModelo {
  usd: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadInputTokens: number;
  cacheCreationInputTokens: number;
}

/**
 * Streama `caminho` linha a linha, soma `usage` por modelo (dedup por `message.id`) e devolve
 * o total estimado. Arquivo ilegível/inexistente devolve estimativa vazia (nunca lança —
 * chamador decide se ⚪ ou soma 0, mas a soma de um conjunto vazio JÁ é 0 legitimamente aqui,
 * diferente do "custo real não medido" que é sempre `null` em `SessaoGasto.usdReal`).
 */
export async function estimarUsoSessao(caminho: string): Promise<EstimativaSessao> {
  if (!precos) throw new Error(motivoAusente("precos-claude"));
  const { custoUsd } = precos;
  const porModelo = new Map<string, AcumuladorModelo>();
  const idsVistos = new Set<string>();
  let temModeloSemPreco = false;

  let stream: ReturnType<typeof createReadStream>;
  try {
    stream = createReadStream(caminho, { encoding: "utf-8" });
  } catch {
    return { modelos: [], usdEstimado: 0, temModeloSemPreco: false };
  }

  const rl = createInterface({ input: stream, crlfDelay: Infinity });
  try {
    for await (const linha of rl) {
      if (!linha || !linha.includes('"usage"')) continue; // prefiltro barato antes do JSON.parse
      let obj: { message?: { id?: string; model?: string; usage?: UsageClaude } };
      try {
        obj = JSON.parse(linha);
      } catch {
        continue;
      }
      const msg = obj.message;
      const usage = msg?.usage;
      if (!usage) continue;
      if (msg?.id) {
        if (idsVistos.has(msg.id)) continue;
        idsVistos.add(msg.id);
      }
      const modelo = msg?.model ?? "⚪ modelo-desconhecido";
      const acc = porModelo.get(modelo) ?? {
        usd: 0,
        inputTokens: 0,
        outputTokens: 0,
        cacheReadInputTokens: 0,
        cacheCreationInputTokens: 0,
      };
      acc.inputTokens += usage.input_tokens ?? 0;
      acc.outputTokens += usage.output_tokens ?? 0;
      acc.cacheReadInputTokens += usage.cache_read_input_tokens ?? 0;
      acc.cacheCreationInputTokens += usage.cache_creation_input_tokens ?? 0;
      const custo = custoUsd(usage, modelo);
      if (custo) acc.usd += custo.usd;
      else temModeloSemPreco = true;
      porModelo.set(modelo, acc);
    }
  } catch {
    // arquivo truncado/corrompido no meio do stream — devolve o que já acumulou (fail visível
    // via temModeloSemPreco continua correto; não há como distinguir aqui sem outro flag, e o
    // caso é raro o bastante para não justificar um campo extra ainda — R-SIMPLIFICAR-001).
  } finally {
    rl.close();
    stream.close();
  }

  const modelos: ModeloDeSessao[] = Array.from(porModelo.entries()).map(([modelo, m]) => ({
    modelo,
    usd: m.usd,
    inputTokens: m.inputTokens,
    outputTokens: m.outputTokens,
    cacheReadInputTokens: m.cacheReadInputTokens,
    cacheCreationInputTokens: m.cacheCreationInputTokens,
  }));
  const usdEstimado = modelos.reduce((acc, m) => acc + m.usd, 0);
  return { modelos, usdEstimado, temModeloSemPreco };
}
