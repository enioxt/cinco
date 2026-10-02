#!/usr/bin/env bun
/**
 * vinculo-sessao-pessoa.ts — fonte única do vínculo sessão↔pessoa (PESSOA-POR-SESSAO-001).
 *
 * A conta Claude Code NÃO registra pessoa (cost-state é por sessão, não por operador
 * humano) — o vínculo é declarado à mão pelo Enio, nunca inferido. Arquivo ausente ou
 * sessão sem entrada = "⚪ sem dono declarado" (nunca "Enio" por padrão — R-ORIGEM-LIMPA-001:
 * informação sem prova não avança).
 *
 * Formato em `~/.egos/sessoes-pessoas.json` (caminho sobrescrevível por
 * EGOS_SESSOES_PESSOAS_PATH, único jeito de testar sem tocar o arquivo real do Enio):
 *   { "vinculos": [ { "sessao": "<prefixo ≥8 chars do sessionId>", "pessoa": "<nome>",
 *                      "desde": "<ISO>", "nota": "<opcional>" } ] }
 *
 * Casamento é por PREFIXO (sessionId completo é um UUID — 8 chars já é praticamente único
 * neste acervo local; ver `resolverPrefixo` para a régua que RECUSA prefixo ambíguo).
 */
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync, chmodSync } from "node:fs";
import { dirname, join } from "node:path";
import { homedir } from "node:os";

export interface VinculoSessaoPessoa {
  sessao: string; // prefixo ≥8 chars do sessionId
  pessoa: string;
  desde: string; // ISO
  nota?: string;
}

export interface ArquivoVinculos {
  vinculos: VinculoSessaoPessoa[];
}

export const TAMANHO_MINIMO_PREFIXO = 8;

export function caminhoVinculos(): string {
  return (process.env.EGOS_SESSOES_PESSOAS_PATH ?? "").trim() || join(homedir(), ".egos", "sessoes-pessoas.json");
}

/** Arquivo ausente ou ilegível → lista vazia, NUNCA lança e nunca "descobre" pessoa nenhuma. */
export function lerVinculos(caminho: string = caminhoVinculos()): VinculoSessaoPessoa[] {
  if (!existsSync(caminho)) return [];
  try {
    const bruto = JSON.parse(readFileSync(caminho, "utf-8")) as Partial<ArquivoVinculos>;
    if (!Array.isArray(bruto.vinculos)) return [];
    return bruto.vinculos.filter(
      (v): v is VinculoSessaoPessoa =>
        !!v && typeof v.sessao === "string" && typeof v.pessoa === "string" && typeof v.desde === "string",
    );
  } catch {
    return [];
  }
}

function escreverVinculos(vinculos: VinculoSessaoPessoa[], caminho: string = caminhoVinculos()): void {
  mkdirSync(dirname(caminho), { recursive: true });
  const tmp = `${caminho}.tmp-${process.pid}-${Date.now()}`;
  writeFileSync(tmp, `${JSON.stringify({ vinculos }, null, 2)}\n`);
  try {
    chmodSync(tmp, 0o600);
  } catch {
    // FS sem suporte a chmod (ex.: alguns ambientes de CI) — escrita segue, permissão é
    // reforço, não requisito de correção (o gate de PII/segredo é backstop noutra camada).
  }
  renameSync(tmp, caminho);
}

/** Devolve o nome da pessoa dono do sessionId, ou null se não houver vínculo declarado. */
export function pessoaDaSessao(sessionId: string, vinculos: VinculoSessaoPessoa[]): string | null {
  const achado = vinculos.find((v) => sessionId.startsWith(v.sessao));
  return achado?.pessoa ?? null;
}

// ── Resolução de prefixo contra o acervo local de sessões (para o CLI recusar ambíguo) ──

export interface CandidatoSessao {
  sessionId: string;
  arquivo: string;
}

export type ResolucaoPrefixo =
  | { ok: true; sessionId: string }
  | { ok: false; motivo: "curto" }
  | { ok: false; motivo: "zero" }
  | { ok: false; motivo: "ambiguo"; candidatos: string[] };

/** Casa um prefixo contra a lista de sessionIds vistos localmente (vinda do coletor de
 * gastos) — recusa prefixo curto, prefixo sem match e prefixo com 2+ matches (nomeando
 * os candidatos, para o humano escolher). */
export function resolverPrefixo(prefixo: string, sessionIdsConhecidos: string[]): ResolucaoPrefixo {
  if (prefixo.length < TAMANHO_MINIMO_PREFIXO) return { ok: false, motivo: "curto" };
  const candidatos = sessionIdsConhecidos.filter((id) => id.startsWith(prefixo));
  if (candidatos.length === 0) return { ok: false, motivo: "zero" };
  if (candidatos.length > 1) return { ok: false, motivo: "ambiguo", candidatos };
  return { ok: true, sessionId: candidatos[0]! };
}

export function vincular(
  prefixoOuSessionId: string,
  pessoa: string,
  opts: { nota?: string; agora?: Date; caminho?: string } = {},
): VinculoSessaoPessoa {
  const caminho = opts.caminho ?? caminhoVinculos();
  const atuais = lerVinculos(caminho).filter((v) => v.sessao !== prefixoOuSessionId);
  const novo: VinculoSessaoPessoa = {
    sessao: prefixoOuSessionId,
    pessoa,
    desde: (opts.agora ?? new Date()).toISOString(),
    ...(opts.nota ? { nota: opts.nota } : {}),
  };
  escreverVinculos([...atuais, novo], caminho);
  return novo;
}

/** Remove o vínculo cujo `sessao` é exatamente o prefixo dado. Devolve false se não existia. */
export function desvincular(prefixo: string, caminho: string = caminhoVinculos()): boolean {
  const atuais = lerVinculos(caminho);
  // vincular grava o sessionId inteiro; quem desvincula digita o mesmo prefixo que usou.
  const restantes = atuais.filter((v) => !v.sessao.startsWith(prefixo));
  if (restantes.length === atuais.length) return false;
  escreverVinculos(restantes, caminho);
  return true;
}

export const SEM_DONO = "⚪ sem dono declarado";
