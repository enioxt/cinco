/**
 * frases-publicas.ts — a frase que descreve uma capacidade PARA FORA, escrita uma vez e
 * lida pelas duas superfícies: a página `cinco.ia.br/federacao` e o catálogo do EGOS APP.
 *
 * FATO GERADOR (corte Enio 2026-09-09): "vamos avançar em forma de skills, de capacidades,
 * no nosso frontend, seja site, seja EGOS app". Medido no mesmo dia: 46 de 111 capacidades
 * do inventário não tinham frase utilizável fora — a descrição do censo foi escrita para
 * dentro (cita incidente, sigla de processo, caminho de governança). Sem um lugar para a
 * frase pública, ela seria escrita duas vezes, e a segunda envelheceria calada.
 *
 * Regra de honestidade: este arquivo é uma FONTE, não um remendo. Item sem entrada aqui
 * continua aparecendo com o que o censo tem — e, quando nem isso serve, aparece como nome
 * sem frase. Inventar descrição de capacidade que não se conferiu é exatamente o erro
 * confiante que a casa persegue.
 *
 * O JSON vive em `config/frases-publicas.json` (chave = id do item no censo).
 */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const RAIZ = process.env.EGOS_REPO_DIR ?? join(import.meta.dir, "..", "..");
const CAMINHO = process.env.EGOS_FRASES_PUBLICAS ?? join(RAIZ, "config", "frases-publicas.json");

let cache: Record<string, string> | null = null;

/** Lê o arquivo uma vez. Ausência não derruba nada: vira mapa vazio (=R13, dito por quem chama). */
export function carregarFrases(caminho: string = CAMINHO): Record<string, string> {
  if (cache && caminho === CAMINHO) return cache;
  let mapa: Record<string, string> = {};
  if (existsSync(caminho)) {
    try {
      const bruto = JSON.parse(readFileSync(caminho, "utf8")) as Record<string, unknown>;
      for (const [k, v] of Object.entries(bruto)) {
        if (k.startsWith("_")) continue; // chaves começadas por _ são comentários do arquivo
        if (typeof v === "string" && v.trim()) mapa[k] = v.trim();
      }
    } catch {
      mapa = {}; // arquivo quebrado = sem frases, nunca frases pela metade
    }
  }
  if (caminho === CAMINHO) cache = mapa;
  return mapa;
}

/** A frase pública do item, ou "" quando ninguém a escreveu ainda. */
export function fraseDe(id: string, caminho?: string): string {
  return carregarFrases(caminho)[id] ?? "";
}

/** Quantas frases existem — o denominador que as duas superfícies publicam. */
export function quantasFrases(caminho?: string): number {
  return Object.keys(carregarFrases(caminho)).length;
}

export function limparCache(): void {
  cache = null;
}
