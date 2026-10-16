/**
 * interacoes.ts — SSOT-1-LOG-DE-INTERACAO-001 (P0). Lugar único que responde "o que o Enio
 * clicou, quando, e para onde foi": ~/.egos/interacoes.jsonl, APPEND-ONLY, 1 linha por
 * clique/resposta humana em qualquer superfície do app.
 *
 * Histórico ≠ estado: dois cliques no mesmo evento geram DUAS linhas aqui, mesmo que o efeito
 * (ex.: preferência no perfil.json) aconteça uma vez. Este módulo só registra; nunca decide
 * efeito e nunca sobrescreve.
 *
 * Esquema da linha: { ts, sessao, superficie, evento_id, tipo_resposta, gaveta_destino, detalhe }
 *  - OBRIGATÓRIOS do chamador: superficie (toast|pca|mesa|fila|proxima-task), evento_id,
 *    tipo_resposta. Faltando qualquer um (ou superficie fora do enum) NÃO grava e devolve
 *    { ok:false, faltando:[...] } — falha visível, nunca linha capenga em silêncio (=R13-a).
 *  - Opcionais (sessao, gaveta_destino, detalhe): ausentes entram na linha como "⚪" — a linha
 *    sempre tem os 7 campos, nunca omite (⚪ = NÃO-MEDIDO, não "vazio").
 *  - Sem PII: `detalhe` é do chamador (R-EVIDENCIA-PADRAO-001); serializado é cortado em 500 chars.
 *
 * Destino: EGOS_INTERACOES_ARQ (golden hermético) senão $HOME/.egos/interacoes.jsonl.
 * Nunca lança: erro de I/O volta em { ok:false, erro } — quem chama decide se mostra.
 */
import { appendFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

export const SUPERFICIES = ["toast", "pca", "mesa", "fila", "proxima-task"] as const;
export type Superficie = (typeof SUPERFICIES)[number];
export const NAO_MEDIDO = "⚪";
export const DETALHE_MAX = 500;

export interface InteracaoEntrada {
  superficie?: string;
  evento_id?: string;
  tipo_resposta?: string;
  sessao?: string;
  gaveta_destino?: string;
  detalhe?: unknown;
}

export interface InteracaoLinha {
  ts: string;
  sessao: string;
  superficie: Superficie;
  evento_id: string;
  tipo_resposta: string;
  gaveta_destino: string;
  detalhe: unknown;
}

export type ResultadoInteracao =
  | { ok: true; caminho: string; linha: InteracaoLinha }
  | { ok: false; faltando?: string[]; erro: string };

export function caminhoInteracoes(): string {
  const explicito = (process.env.EGOS_INTERACOES_ARQ ?? "").trim();
  return explicito || join(process.env.HOME ?? "", ".egos", "interacoes.jsonl");
}

function texto(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

/** Pura: valida e monta a linha (sem I/O, relógio injetável). */
export function montarInteracao(
  entrada: InteracaoEntrada,
  agora: Date = new Date(),
): { ok: true; linha: InteracaoLinha } | { ok: false; faltando: string[]; erro: string } {
  const e = entrada && typeof entrada === "object" ? entrada : {};
  const superficie = texto(e.superficie);
  const evento_id = texto(e.evento_id);
  const tipo_resposta = texto(e.tipo_resposta);
  const faltando: string[] = [];
  if (!superficie) faltando.push("superficie");
  if (!evento_id) faltando.push("evento_id");
  if (!tipo_resposta) faltando.push("tipo_resposta");
  if (superficie && !(SUPERFICIES as readonly string[]).includes(superficie)) {
    return {
      ok: false,
      faltando: [...faltando, "superficie(inválida)"],
      erro: `superficie "${superficie}" fora de ${SUPERFICIES.join("|")}`,
    };
  }
  if (faltando.length) {
    return { ok: false, faltando, erro: `interação não registrada — faltando: ${faltando.join(", ")}` };
  }
  let detalhe: unknown = NAO_MEDIDO;
  if (e.detalhe !== undefined && e.detalhe !== null && e.detalhe !== "") {
    const s = typeof e.detalhe === "string" ? e.detalhe : JSON.stringify(e.detalhe);
    detalhe = s.length > DETALHE_MAX ? `${s.slice(0, DETALHE_MAX)}…[cortado]` : e.detalhe;
  }
  return {
    ok: true,
    linha: {
      ts: agora.toISOString(),
      sessao: texto(e.sessao) || texto(process.env.EGOS_SESSAO) || NAO_MEDIDO,
      superficie: superficie as Superficie,
      evento_id,
      tipo_resposta,
      gaveta_destino: texto(e.gaveta_destino) || NAO_MEDIDO,
      detalhe,
    },
  };
}

/** Única porta de escrita do log de interações. Append-only; nunca lança. */
export function registrarInteracao(entrada: InteracaoEntrada, agora: Date = new Date()): ResultadoInteracao {
  const m = montarInteracao(entrada, agora);
  if (!m.ok) return m;
  const caminho = caminhoInteracoes();
  try {
    mkdirSync(dirname(caminho), { recursive: true });
    appendFileSync(caminho, `${JSON.stringify(m.linha)}\n`);
  } catch (err) {
    return { ok: false, erro: `escrita do log de interações falhou: ${(err as Error).message}` };
  }
  return { ok: true, caminho, linha: m.linha };
}
