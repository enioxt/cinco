#!/usr/bin/env bun
/**
 * whatsapp-canais-config.ts — fonte única da configuração de canais de atendimento
 * (EGOS-ATENDE-CANAIS-001, decisão do dono 16/09: "a mudança desses canais de modelos deve ser
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

/** mesclarCanais — PURA. RECEPCAO-DA-ARQUITETA-001 (item 2): o app só conhece nome/tmux/modelo/cli/esforco/quemEntra (e campos de
 *  runtime) — `/api/whatsapp` expõe só isso — e `salvarCanais` gravava a lista recebida TAL QUAL: um clique em "salvar" apagava
 *  reserva, modeloForte, nascimento, disallowedTools, instancia e as travas do canal. Aqui cada canal recebido parte do canal de MESMO
 *  NOME que já está no arquivo: o que a UI mandou vence, o que ela não conhece fica. Canal só do arquivo (fora da lista) some, como
 *  sempre (a UI manda a lista completa). */
export function mesclarCanais(existentes: unknown, novos: unknown[]): unknown[] {
  const porNome = new Map<string, Record<string, unknown>>();
  if (Array.isArray(existentes)) {
    for (const e of existentes) {
      const o = e as Record<string, unknown> | null;
      if (o && typeof o === "object" && typeof o["nome"] === "string") porNome.set(o["nome"], o);
    }
  }
  return novos.map((n) => {
    const o = n as Record<string, unknown>;
    const antigo = typeof o?.["nome"] === "string" ? porNome.get(o["nome"] as string) : undefined;
    return antigo ? { ...antigo, ...o } : n;
  });
}

/** salvarCanais — grava o array de canais no arquivo persistente (0600), MESCLADO com o que já está lá (mesclarCanais). Nunca lança —
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
    let atuais: unknown = [];
    try { atuais = JSON.parse(lerJsonPersistido() ?? "[]"); } catch { /* arquivo ilegível: nada a preservar (como antes) */ }
    mkdirSync(dirname(CANAIS_CONFIG_PATH), { recursive: true, mode: 0o700 });
    writeFileSync(CANAIS_CONFIG_PATH, JSON.stringify(mesclarCanais(atuais, canais), null, 2), { mode: 0o600 });
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