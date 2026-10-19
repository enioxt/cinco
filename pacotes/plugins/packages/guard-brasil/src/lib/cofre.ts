/**
 * COFRE — pseudonimização REVERSÍVEL para conversa com LLM de terceiro.
 *
 * Decisão do dono, 2026-09-01 (reunião ao vivo): "camada SEM IA que anonimiza tudo que for
 * sensível — nomes, CPF, números quebrados que possam identificar algo. Depois a IA
 * trabalha em cima do anonimizado. Depois voltamos os números para o lugar correto,
 * sem IA tocar nos números certos."
 *
 * Desenho, em uma frase: o texto real NUNCA sai da máquina; sai o texto com fichas
 * (`«PESSOA_1»`, `«CPF_1»`), e a tabela ficha→valor fica local. O que a nuvem devolve
 * é reidentificado aqui.
 *
 * Três invariantes que os goldens provam (e por que cada uma existe):
 *  1. FAIL-CLOSED: depois de trocar, o MESMO detector varre a saída. Sobrou PII →
 *     `seguro: false` e o chamador PARA. Confiar na primeira passada é como confiar
 *     num gate que nunca falhou: não é prova, é ausência de evidência.
 *  2. ESTÁVEL: o mesmo valor vira sempre a MESMA ficha no mesmo cofre — senão a IA
 *     perde a noção de que duas frases falam da mesma pessoa e o raciocínio dela quebra.
 *  3. REVERSÍVEL SEM PERDA: reidentificar o texto pseudonimizado devolve o original,
 *     byte a byte. Substituição que não volta é destruição, não anonimização.
 *
 * O cofre é um objeto em memória. NUNCA serialize para disco/rede sem decisão humana
 * (P4) — quem quiser persistir chama `descartarCofre()` no fim e assume o que fez.
 */

import { scanForPII } from './pii-scanner.js';
import type { PIICategory, PIIFinding } from './pii-scanner.js';

/** Ficha → valor real. A ordem de inserção é a ordem de aparição no texto. */
export interface Cofre {
  /** ficha → valor real; ex.: `«CPF_1»` aponta para o CPF que apareceu primeiro. */
  readonly fichas: Map<string, string>;
  /** Quantas fichas por categoria — para o relatório de prova, sem expor valores. */
  readonly porCategoria: Record<string, number>;
}

export interface ResultadoAnonimizacao {
  /** O texto que PODE sair da máquina. */
  texto: string;
  cofre: Cofre;
  /**
   * `false` = a re-varredura ainda achou PII no texto trocado. NÃO ENVIE.
   * Vem com `restantes` dizendo o que sobrou (categoria + posição, nunca o valor).
   */
  seguro: boolean;
  restantes: Array<{ categoria: string; start: number; end: number }>;
}

const ABRE = '«';
const FECHA = '»';

/** Nome da categoria como aparece na ficha: `cpf` → `CPF`, `full_name` → `NOME`. */
function rotulo(categoria: PIICategory | string): string {
  const c = String(categoria);
  if (c === 'full_name' || c === 'person_name' || c === 'name') return 'PESSOA';
  return c.toUpperCase();
}

function criarCofre(): Cofre {
  return { fichas: new Map<string, string>(), porCategoria: {} };
}

/**
 * Troca cada PII por uma ficha estável. Substitui de trás para frente para que as
 * posições devolvidas pelo detector continuem válidas durante o próprio laço.
 */
export function anonimizar(textoOriginal: string, cofreExistente?: Cofre): ResultadoAnonimizacao {
  const cofre = cofreExistente ?? criarCofre();
  const inverso = new Map<string, string>(); // valor real → ficha (garante estabilidade)
  for (const [ficha, valor] of cofre.fichas) inverso.set(valor, ficha);

  const achados: PIIFinding[] = scanForPII(textoOriginal);
  const ordenados = achados.slice().sort((a, b) => b.start - a.start);

  let texto = textoOriginal;
  for (const a of ordenados) {
    const valor = a.matched;
    let ficha = inverso.get(valor);
    if (!ficha) {
      const rot = rotulo(a.category);
      const n = (cofre.porCategoria[rot] ?? 0) + 1;
      cofre.porCategoria[rot] = n;
      ficha = `${ABRE}${rot}_${n}${FECHA}`;
      cofre.fichas.set(ficha, valor);
      inverso.set(valor, ficha);
    }
    texto = texto.slice(0, a.start) + ficha + texto.slice(a.end);
  }

  // Invariante 1 — a saída passa pelo MESMO detector. Sem isto, "anonimizado" é fé.
  const sobraram = scanForPII(texto);
  const restantes = sobraram.map((f) => ({ categoria: String(f.category), start: f.start, end: f.end }));

  return { texto, cofre, seguro: restantes.length === 0, restantes };
}

/** Devolve os valores reais ao texto que voltou da IA. Ficha desconhecida fica intacta. */
export function reidentificar(textoDaIA: string, cofre: Cofre): string {
  let texto = textoDaIA;
  // Fichas mais longas primeiro: «CPF_10» não pode ser comida por «CPF_1».
  const fichas = [...cofre.fichas.keys()].sort((a, b) => b.length - a.length);
  for (const ficha of fichas) {
    texto = texto.split(ficha).join(cofre.fichas.get(ficha) as string);
  }
  return texto;
}

/**
 * Relatório de prova para mostrar ao humano/terceiro: O QUE foi protegido, quantos de
 * cada tipo — e jamais os valores. É a peça que sustenta "nenhum dado sensível saiu".
 */
export function provaDoCofre(r: ResultadoAnonimizacao): string {
  const linhas = Object.entries(r.cofre.porCategoria)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([cat, n]) => `  · ${cat}: ${n}`);
  const cabeca = r.seguro
    ? `🟢 ${r.cofre.fichas.size} item(ns) sensível(is) trocado(s) por ficha antes de qualquer saída; re-varredura não achou resto.`
    : `🔴 NÃO ENVIAR — a re-varredura ainda achou ${r.restantes.length} item(ns) no texto trocado.`;
  return [cabeca, ...(linhas.length ? ['Protegidos (contagem, nunca o valor):', ...linhas] : [])].join('\n');
}

/** Apaga as fichas da memória. Chame ao fim do trabalho — o cofre não deve sobreviver. */
export function descartarCofre(cofre: Cofre): void {
  cofre.fichas.clear();
  for (const k of Object.keys(cofre.porCategoria)) delete cofre.porCategoria[k];
}
