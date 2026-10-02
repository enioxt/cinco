#!/usr/bin/env bun
/**
 * agenda-unificada.ts — FATO GERADOR: corte do Enio 2026-09-04 — "devemos ter um quadro
 * nessa máquina, um app sempre aberto do EGOS, com a agenda… é essa a parte principal do
 * EGOS APP: ter todas as integrações e me entregar toda a agenda, organizar minha vida, o
 * dia inteiro". Motor que LÊ (nunca escreve) as fontes locais já existentes em
 * ~/.egos/agenda/ e devolve uma visão única, por dia, dos próximos N dias.
 *
 * Fontes hoje: gcal.json (Google Calendar, lido manualmente pela sessão — o sync
 * automático está morto, ver GOOGLE-OAUTH-DELETED-CLIENT-001) e compromissos.jsonl
 * (1 JSON por linha, escrito por sessões/canais ao vivo). Arquivo ausente/corrompido
 * NUNCA lança (=R13) — vira fonte "ausente"/"quebrada" com motivo, e a linha ruim de um
 * JSONL vira 1 entrada em `avisos`, nunca derruba o resto do arquivo.
 */
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const OFFSET_BR = "-03:00"; // América/São_Paulo não observa horário de verão desde 2019.

export type EstadoFonte = "viva" | "manual" | "envelhecida" | "ausente" | "quebrada";

export interface Fonte {
  id: "gcal" | "compromissos";
  nome: string;
  estado: EstadoFonte;
  lidoEm?: string;
  motivo?: string;
  n: number;
}

export interface Item {
  inicio: string;
  fim?: string;
  titulo: string;
  local?: string;
  origem: string;
  fonte: "gcal" | "compromissos";
  estado: string;
  hora: string;
  /** PROVA-AGENDA-001: quando o registro entrou na fonte (ISO), se a fonte disse. */
  registradoEm?: string;
  /** PROVA-AGENDA-001: dia da semana REAL da data do item, calculado — nunca copiado do texto. */
  diaSemana?: string;
  /**
   * CONFLITO-DIA-SEMANA-001 (corte Enio 09/09, sobre um compromisso real: "a data está errada, está
   * escrito quinta, mas é quarta feira, de onde veio a informação, deve ter a prova a um
   * clique"). Se o texto do compromisso (título ou origem) NOMEIA um dia da semana e ele
   * não bate com a data, os dois não podem estar certos — e o app não tem como saber qual.
   * Quem decide é o humano; o motor só acusa, nomeando os dois lados.
   */
  conflitoDiaSemana?: string;
}

const DIAS_SEMANA = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

/** Dia da semana da data local do ISO, por cálculo (nunca por leitura do texto). */
export function diaSemanaDe(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return DIAS_SEMANA[d.getDay()] ?? "";
}

/**
 * Devolve o aviso quando o texto nomeia um dia da semana diferente do da data.
 * Só acusa dia NOMEADO: texto sem dia da semana nunca gera conflito (o gate que
 * grita no caminho normal vira ruído e depois vira bypass).
 */
export function conflitoDeDiaSemana(iso: string, ...textos: (string | undefined)[]): string | undefined {
  const real = diaSemanaDe(iso);
  if (!real) return undefined;
  const alvo = textos.filter(Boolean).join(" ").toLowerCase();
  const ditos = DIAS_SEMANA.filter((d) => {
    const base = d === "terça" ? "ter[çc]a" : d === "sábado" ? "s[áa]bado" : d;
    return new RegExp(`\\b${base}(-?feira)?\\b`, "i").test(alvo);
  });
  if (!ditos.length || ditos.includes(real)) return undefined;
  return `o texto diz "${ditos.join("/")}", a data cai em ${real} — um dos dois está errado`;
}

export interface DiaAgenda {
  data: string;
  rotulo: string;
  itens: Item[];
}

export interface Agenda {
  geradoEm: string;
  janelaDias: number;
  fontes: Fonte[];
  dias: DiaAgenda[];
  proximo: Item | null;
  total: number;
  avisos: string[];
}

function dirPadrao(): string {
  return process.env.EGOS_AGENDA_DIR ?? join(homedir(), ".egos", "agenda");
}

function horaOuDiaTodo(inicioIso: string): string {
  if (!inicioIso.includes("T")) return "dia todo";
  const d = new Date(inicioIso);
  if (Number.isNaN(d.getTime())) return "dia todo";
  return d.toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });
}

function dataBr(iso: string): string {
  const d = new Date(iso);
  // en-CA formata YYYY-MM-DD — mais fácil de comparar/ordenar que pt-BR.
  return d.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

function rotuloDia(dataISOdia: string): string {
  const d = new Date(`${dataISOdia}T12:00:00${OFFSET_BR}`); // meio-dia evita virada de fuso
  const semana = d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", weekday: "short" }).replace(".", "");
  const dm = d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit" });
  return `${semana} ${dm}`;
}

function lerGcal(dir: string, agora: Date, avisos: string[]): { fonte: Fonte; itens: Item[] } {
  const caminho = join(dir, "gcal.json");
  if (!existsSync(caminho)) {
    return { fonte: { id: "gcal", nome: "Google Calendar", estado: "ausente", n: 0, motivo: "arquivo não encontrado — nunca foi lido pela sessão" }, itens: [] };
  }
  try {
    const j = JSON.parse(readFileSync(caminho, "utf-8"));
    const lidoEm: string | undefined = typeof j.lidoEm === "string" ? j.lidoEm : undefined;
    const idadeMs = lidoEm ? agora.getTime() - Date.parse(lidoEm) : Infinity;
    const idadeHoras = idadeMs / 3_600_000;
    const motivoBase: string | undefined = typeof j.motivoNaoAutomatico === "string" ? j.motivoNaoAutomatico : undefined;
    let estado: EstadoFonte;
    let motivo: string | undefined;
    if (!lidoEm || Number.isNaN(Date.parse(lidoEm)) || idadeHoras > 24) {
      estado = "envelhecida";
      motivo = motivoBase ? `lido há mais de 24h — ${motivoBase}` : "lido há mais de 24h (ou data ilegível)";
    } else if (j.modo === "manual-pela-sessao") {
      estado = "manual";
      motivo = motivoBase;
    } else {
      estado = "viva";
      motivo = motivoBase;
    }
    const brutos = Array.isArray(j.eventos) ? j.eventos : [];
    const itens: Item[] = [];
    for (const e of brutos) {
      if (!e || typeof e !== "object" || typeof e.inicio !== "string" || typeof e.titulo !== "string") {
        avisos.push("gcal.json: evento sem inicio/titulo — ignorado");
        continue;
      }
      itens.push({
        inicio: e.inicio,
        fim: typeof e.fim === "string" ? e.fim : undefined,
        titulo: e.titulo,
        local: typeof e.local === "string" ? e.local : undefined,
        origem: typeof e.origem === "string" ? e.origem : (typeof e.calendario === "string" ? e.calendario : "gcal"),
        fonte: "gcal",
        estado: "confirmado",
        hora: horaOuDiaTodo(e.inicio),
        diaSemana: diaSemanaDe(e.inicio),
        conflitoDiaSemana: conflitoDeDiaSemana(e.inicio, e.titulo, e.origem, e.local),
      });
    }
    return { fonte: { id: "gcal", nome: "Google Calendar", estado, lidoEm, motivo, n: itens.length }, itens };
  } catch (e) {
    avisos.push(`gcal.json: JSON inválido — ${e}`);
    return { fonte: { id: "gcal", nome: "Google Calendar", estado: "quebrada", n: 0, motivo: `JSON inválido — ${e}` }, itens: [] };
  }
}

function lerCompromissos(dir: string, avisos: string[]): { fonte: Fonte; itens: Item[] } {
  const caminho = join(dir, "compromissos.jsonl");
  if (!existsSync(caminho)) {
    return { fonte: { id: "compromissos", nome: "Compromissos (WhatsApp/Sympla/sessão)", estado: "ausente", n: 0, motivo: "arquivo não encontrado" }, itens: [] };
  }
  let bruto: string;
  try {
    bruto = readFileSync(caminho, "utf-8");
  } catch (e) {
    return { fonte: { id: "compromissos", nome: "Compromissos (WhatsApp/Sympla/sessão)", estado: "quebrada", n: 0, motivo: `não foi possível ler — ${e}` }, itens: [] };
  }
  const linhas = bruto.split("\n").map((l) => l.trim()).filter(Boolean);
  const itens: Item[] = [];
  for (const linha of linhas) {
    try {
      const o = JSON.parse(linha);
      if (!o || typeof o.inicio !== "string" || typeof o.titulo !== "string") {
        avisos.push("compromissos.jsonl: linha sem inicio/titulo — ignorada");
        continue;
      }
      itens.push({
        inicio: o.inicio,
        fim: typeof o.fim === "string" ? o.fim : undefined,
        titulo: o.titulo,
        local: typeof o.local === "string" ? o.local : undefined,
        origem: typeof o.origem === "string" ? o.origem : (typeof o.fonte === "string" ? o.fonte : "compromissos"),
        fonte: "compromissos",
        estado: typeof o.estado === "string" ? o.estado : "confirmado",
        hora: horaOuDiaTodo(o.inicio),
        registradoEm: typeof o.registradoEm === "string" ? o.registradoEm : undefined,
        diaSemana: diaSemanaDe(o.inicio),
        conflitoDiaSemana: conflitoDeDiaSemana(o.inicio, o.titulo, o.origem, o.local),
      });
    } catch (e) {
      avisos.push(`compromissos.jsonl: linha corrompida — ${e}`);
    }
  }
  return { fonte: { id: "compromissos", nome: "Compromissos (WhatsApp/Sympla/sessão)", estado: "viva", n: itens.length }, itens };
}

function chaveDedupe(i: Item): string {
  return `${i.inicio}|${i.titulo.trim().toLowerCase()}`;
}

export function montarAgenda(opts?: { dir?: string; agora?: Date; dias?: number }): Agenda {
  const dir = opts?.dir ?? dirPadrao();
  const agora = opts?.agora ?? new Date();
  const dias = opts?.dias ?? 45;
  const avisos: string[] = [];

  const gcal = lerGcal(dir, agora, avisos);
  const compromissos = lerCompromissos(dir, avisos);
  const fontes: Fonte[] = [gcal.fonte, compromissos.fonte];

  const hojeIso = dataBr(agora.toISOString());
  const inicioJanela = new Date(`${hojeIso}T00:00:00${OFFSET_BR}`);
  const fimJanela = new Date(inicioJanela.getTime());
  fimJanela.setDate(fimJanela.getDate() + dias);

  const vistos = new Set<string>();
  const todos: Item[] = [];
  for (const i of [...gcal.itens, ...compromissos.itens]) {
    const t = Date.parse(i.inicio);
    if (Number.isNaN(t) || t < inicioJanela.getTime() || t >= fimJanela.getTime()) continue;
    const chave = chaveDedupe(i);
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    todos.push(i);
  }
  todos.sort((a, b) => Date.parse(a.inicio) - Date.parse(b.inicio));

  const porDia = new Map<string, Item[]>();
  for (const i of todos) {
    const data = dataBr(i.inicio);
    if (!porDia.has(data)) porDia.set(data, []);
    porDia.get(data)!.push(i);
  }
  const diasOrdenados = [...porDia.keys()].sort();
  const diasAgenda: DiaAgenda[] = diasOrdenados.map((data) => ({ data, rotulo: rotuloDia(data), itens: porDia.get(data)! }));

  const proximo = todos.find((i) => Date.parse(i.fim ?? i.inicio) >= agora.getTime()) ?? null;

  return { geradoEm: agora.toISOString(), janelaDias: dias, fontes, dias: diasAgenda, proximo, total: todos.length, avisos };
}

function imprimirTabela(a: Agenda): void {
  console.log(`agenda unificada — janela ${a.janelaDias} dias — ${a.total} item(ns)`);
  for (const f of a.fontes) {
    const selo = f.estado === "viva" ? "🟢" : f.estado === "manual" ? "🟡" : f.estado === "envelhecida" ? "🟡" : "🔴";
    console.log(`  ${selo} ${f.nome}: ${f.estado}${f.motivo ? " — " + f.motivo : ""} (${f.n})`);
  }
  if (a.avisos.length) console.log(`  ⚠️  avisos: ${a.avisos.join(" · ")}`);
  console.log("");
  for (const dia of a.dias) {
    console.log(`${dia.rotulo}`);
    for (const i of dia.itens) {
      const badge = i.estado !== "confirmado" ? ` [${i.estado}]` : "";
      console.log(`  ${i.hora}  ${i.titulo}${badge}${i.local ? " · " + i.local : ""}  (${i.fonte})`);
    }
  }
}

if (import.meta.main) {
  const argv = process.argv.slice(2);
  const asJson = argv.includes("--json");
  const idxDias = argv.indexOf("--dias");
  const dias = idxDias >= 0 ? Number(argv[idxDias + 1]) || 45 : 45;
  const agenda = montarAgenda({ dias });
  if (asJson) console.log(JSON.stringify(agenda, null, 2));
  else imprimirTabela(agenda);
}
