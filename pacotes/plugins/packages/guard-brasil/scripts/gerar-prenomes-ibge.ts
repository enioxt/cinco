/**
 * Gera `src/lib/prenomes-ibge.ts` a partir da API pública do IBGE "Nomes no Brasil" (Censo 2010).
 * Rodar: bun run packages/guard-brasil/scripts/gerar-prenomes-ibge.ts [N=500]
 *
 * Método (a API só devolve o top 20 por consulta, então não existe "baixar o top 500" direto):
 *  1. candidatos = união dos rankings top-20 de BR + 27 UFs × 9 décadas × 2 sexos + sementes-prenomes.txt
 *     (nomes comuns lembrados à mão, para cobrir o que nunca foi top 20 de uma UF/década; o IBGE decide a ordem);
 *  2. frequência total de cada candidato (soma das décadas) via /censos/nomes/{n1|n2|...};
 *  3. ordena por frequência total e fica com os N mais frequentes.
 * Limite honesto: um nome que nunca esteve no top 20 de nenhuma UF/década/sexo não entra, mesmo que o
 * total nacional o colocasse no 500 — a cauda do corte é aproximada (ver README do pacote).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const N = Number(process.argv[2] ?? 500);
const BASE = process.env.IBGE_NOMES_API ?? 'https://servicodados.ibge.gov.br/api/v2/censos/nomes';
const UFS = [11,12,13,14,15,16,17,21,22,23,24,25,26,27,28,29,31,32,33,35,41,42,43,50,51,52,53];
const DECADAS = [1930,1940,1950,1960,1970,1980,1990,2000,2010];

async function getJson(url: string, tentativas = 4): Promise<any> {
  for (let i = 0; i < tentativas; i++) {
    const r = await fetch(url);
    if (r.ok) return r.json();
    await new Promise((res) => setTimeout(res, 500 * (i + 1)));
  }
  throw new Error(`IBGE falhou: ${url}`);
}

const candidatos = new Set<string>();
const consultas: string[] = [];
for (const loc of ['BR', ...UFS]) for (const d of DECADAS) for (const s of ['M', 'F'])
  consultas.push(`${BASE}/ranking?localidade=${loc}&decada=${d}&sexo=${s}`);
for (let i = 0; i < consultas.length; i += 12) {
  const lote = await Promise.all(consultas.slice(i, i + 12).map((u) => getJson(u)));
  for (const r of lote) for (const x of r?.[0]?.res ?? []) candidatos.add(String(x.nome));
}
const norm = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
const aqui0 = dirname(fileURLToPath(import.meta.url));
for (const w of readFileSync(join(aqui0, 'sementes-prenomes.txt'), 'utf8').split(/\s+/)) if (w) candidatos.add(norm(w));
// não são prenomes: o registro civil tem "FILHA", "FILHO", "NOME"... no top 20 de algumas décadas
for (const x of ['FILHA', 'FILHO', 'NOME', 'RN', 'BEBE']) candidatos.delete(x);
console.error(`candidatos: ${candidatos.size}`);

const lista = [...candidatos];
const total = new Map<string, number>();
for (let i = 0; i < lista.length; i += 20) {
  const grupo = lista.slice(i, i + 20);
  const r = await getJson(`${BASE}/${encodeURIComponent(grupo.join('|'))}`);
  for (const item of r ?? []) total.set(item.nome, (item.res as { frequencia: number }[]).reduce((a, b) => a + b.frequencia, 0));
}
const top = [...total.entries()].sort((a, b) => b[1] - a[1]).slice(0, N);
const corte = top[top.length - 1];
const aqui = dirname(fileURLToPath(import.meta.url));
const hoje = new Date().toISOString().slice(0, 10);
const corpo = `/**
 * Prenomes brasileiros mais frequentes — GERADO por scripts/gerar-prenomes-ibge.ts (não editar à mão).
 * Fonte: IBGE, "Nomes no Brasil" (Censo Demográfico 2010), API servicodados.ibge.gov.br/api/v2/censos/nomes.
 * Coletado em ${hoje}. ${top.length} nomes, ordenados por frequência total (soma das décadas); corte = ${corte[0]} (${corte[1]} pessoas).
 * Sem acento e em minúsculas (comparação normalizada). Limite: o corte é aproximado (ver cabeçalho do script).
 */
export const PRENOMES_IBGE: readonly string[] = ${JSON.stringify(top.map(([n]) => n.toLowerCase()))};
export const PRENOMES_IBGE_FONTE = { fonte: 'IBGE Nomes no Brasil (Censo 2010)', coletadoEm: '${hoje}', total: ${top.length} } as const;
`;
writeFileSync(join(aqui, '..', 'src', 'lib', 'prenomes-ibge.ts'), corpo);
console.error(`gravado: ${top.length} nomes; corte ${corte[0]} = ${corte[1]}`);
