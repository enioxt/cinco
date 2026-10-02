#!/usr/bin/env bun
/**
 * whatsapp-canais-config.ts — fonte única da configuração de canais de atendimento
 * (EGOS-ATENDE-CANAIS-001, corte Enio 16/09: "a mudança desses canais de modelos deve ser
 * simples, dentro do EGOS APP, no lugar correto; não devemos ter nada, ou quase nada,
 * hardcoded").
 *
 * A config vive em ~/.egos/whatsapp-canais.json (dado do dono, fora do git — P4), com o
 * MESMO schema que EGOS_WPP_CANAIS já usava (nome, tmux, modelo, cli, esforco, quemEntra,
 * nascimento, disallowedTools, grupoJid, instancia). O EGOS APP edita este arquivo (POST
 * /api/whatsapp/canais); o motor (canaisAtivos) e o coletor (montarWhatsapp) leem dele.
 *
 * Precedência (nada hardcoded, falha fecha):
 *   1. arquivo persistente (~/.egos/whatsapp-canais.json) — o que o app salva;
 *   2. env EGOS_WPP_CANAIS (JSON) — para testes/override pontual;
 *   3. CANAIS_FALLBACK (fixo) — última rede, declarado em voz alta.
 *
 * Escrita: SÓ por ato explícito (POST do app / comando) — nunca o coletor escreve.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { homedir } from "node:os";

export const CANAIS_CONFIG_PATH = process.env["EGOS_WPP_CANAIS_FILE"] ?? join(homedir(), ".egos", "whatsapp-canais.json");

/** lerJsonPersistido — raw do arquivo ("" se ausente/ilegível). Nunca lança. */
export function lerJsonPersistido(): string | undefined {
  try {
    if (!existsSync(CANAIS_CONFIG_PATH)) return undefined;
    return readFileSync(CANAIS_CONFIG_PATH, "utf-8");
  } catch {
    return undefined;
  }
}

/** salvarCanais — grava o array de canais no arquivo persistente (0600). Nunca lança —
 *  devolve (ok, motivo). Só aceita array com ao menos 1 canal válido (nome+tmux). */
export function salvarCanais(canais: unknown[]): { ok: boolean; motivo?: string } {
  if (!Array.isArray(canais) || canais.length === 0) {
    return { ok: false, motivo: "lista de canais vazia — recusado (fail-closed)" };
  }
  for (const c of canais) {
    const o = c as Record<string, unknown>;
    if (typeof o?.nome !== "string" || !o.nome || typeof o?.tmux !== "string" || !o.tmux) {
      return { ok: false, motivo: "canal sem nome/tmux — recusado (fail-closed)" };
    }
  }
  try {
    mkdirSync(dirname(CANAIS_CONFIG_PATH), { recursive: true, mode: 0o700 });
    writeFileSync(CANAIS_CONFIG_PATH, JSON.stringify(canais, null, 2), { mode: 0o600 });
    return { ok: true };
  } catch (e) {
    return { ok: false, motivo: (e as Error).message };
  }
}

/** jsonParaCanaisAtivos — a precedência completa, em string: arquivo → env → undefined
 *  (quem chamar decide o fallback). Reusa a lógica existente de lerCanaisDeJson. */
export function jsonCanaisAtivos(): string | undefined {
  const doArquivo = lerJsonPersistido();
  if (doArquivo !== undefined && doArquivo.trim() !== "") return doArquivo;
  return process.env["EGOS_WPP_CANAIS"];
}