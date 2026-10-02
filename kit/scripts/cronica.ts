#!/usr/bin/env bun
// cronica.ts — narra em PT-BR o que a orquestra de agentes fez (lê ~/.egos/fila + git log,
// chama `claude -p ... --model claude-sonnet-5`); EGOS_CRONICA_FAKE=1 pula o LLM p/ goldens.
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const HOME = process.env.HOME ?? "";
const FILA_DIR = process.env.EGOS_FILA_DIR ?? join(HOME, ".egos", "fila");
// [kit do censo, 2026-08-30] o default original apontava literal para o repo egos
// (join(HOME,"enio-dev","producao","egos")) — correto SÓ ali, quebrado em qualquer
// outro repo que copiasse este motor (git log/commits recentes viriam do repo errado).
// Troca por auto-localização (R-REPLICAVEL-001): a raiz é sempre "um nível acima de
// scripts/", onde quer que o motor esteja copiado. EGOS_REPO_DIR continua podendo
// apontar para outro repo quando isso for intencional.
const REPO_DIR = process.env.EGOS_REPO_DIR ?? join(import.meta.dir, "..");
const CRONICA_DIR = process.env.EGOS_CRONICA_DIR ?? join(HOME, ".egos", "cronica");
const TOM_DEFAULT = "caloroso e direto, como quem conta a história da equipe na madrugada";

interface JobConcluido {
  id: string;
  titulo: string;
  de: string;
  criadoEm: string;
  pegoEm: string | null;
  concluidoEm: string | null;
  resultado: string;
  esperaMin: number | null;
  execucaoMin: number | null;
}

interface AgenteFato {
  nome: string;
  pendentes: number;
  emAndamento: number;
  concluidosTotal: number;
  concluidos: JobConcluido[];
  ilegiveis: number;
}

interface Ficha {
  geradoEm: string;
  filaExiste: boolean;
  agentes: AgenteFato[];
  commits: string[];
  tom: string;
  totais: { nAgentes: number; nJobs: number; nCommits: number; ilegiveis: number };
}

interface Config {
  tom?: string;
}

function lerJsonSeguro(caminho: string): Record<string, unknown> | null {
  try {
    return JSON.parse(readFileSync(caminho, "utf-8"));
  } catch {
    return null;
  }
}

function listarJson(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith(".json")).sort();
}

function listarAgentes(base: string): string[] {
  if (!existsSync(base)) return [];
  return readdirSync(base).filter((a) => {
    if (a.startsWith(".")) return false;
    try {
      return statSync(join(base, a)).isDirectory();
    } catch {
      return false;
    }
  });
}

function diffMin(inicio: string | null, fim: string | null): number | null {
  if (!inicio || !fim) return null;
  const t0 = Date.parse(inicio);
  const t1 = Date.parse(fim);
  if (Number.isNaN(t0) || Number.isNaN(t1)) return null;
  return Math.round(((t1 - t0) / 60000) * 10) / 10;
}

function agenteFato(base: string, nome: string): AgenteFato {
  const dir = join(base, nome);
  const pendDir = join(dir, "pendentes");
  const andDir = join(dir, "em-andamento");
  const concDir = join(dir, "concluidos");
  const pendArqs = listarJson(pendDir);
  const andArqs = listarJson(andDir);
  const concArqs = listarJson(concDir);

  let ilegiveis = 0;
  const concluidos: JobConcluido[] = [];
  for (const f of concArqs) {
    const j = lerJsonSeguro(join(concDir, f));
    if (!j) {
      ilegiveis++;
      continue;
    }
    const criadoEmRaw = typeof j.criadoEm === "string" ? j.criadoEm : null;
    const pegoEmRaw = typeof j.pegoEm === "string" ? j.pegoEm : null;
    const concluidoEmRaw = typeof j.concluidoEm === "string" ? j.concluidoEm : null;
    const resultadoRaw = typeof j.resultado === "string" && j.resultado.trim() ? j.resultado.trim() : "⚪ sem resultado registrado";
    concluidos.push({
      id: typeof j.id === "string" ? j.id : f,
      titulo: typeof j.titulo === "string" ? j.titulo : "⚪ sem-titulo",
      de: typeof j.de === "string" ? j.de : "⚪",
      criadoEm: criadoEmRaw ?? "⚪",
      pegoEm: pegoEmRaw,
      concluidoEm: concluidoEmRaw,
      resultado: resultadoRaw.length > 400 ? `${resultadoRaw.slice(0, 400)}…` : resultadoRaw,
      esperaMin: diffMin(criadoEmRaw, pegoEmRaw),
      execucaoMin: diffMin(pegoEmRaw, concluidoEmRaw),
    });
  }
  // pendentes/em-andamento não entram na narrativa detalhada, mas JSON corrompido
  // ali também é fato perdido — conta-se junto (⚪ dito, nunca escondido).
  for (const f of pendArqs) if (!lerJsonSeguro(join(pendDir, f))) ilegiveis++;
  for (const f of andArqs) if (!lerJsonSeguro(join(andDir, f))) ilegiveis++;

  return {
    nome,
    pendentes: pendArqs.length,
    emAndamento: andArqs.length,
    concluidosTotal: concArqs.length,
    concluidos,
    ilegiveis,
  };
}

function commitsRecentes(repoDir: string): string[] {
  try {
    const r = Bun.spawnSync(["git", "log", "--oneline", "-15"], { cwd: repoDir, stdout: "pipe", stderr: "pipe" });
    if (r.exitCode !== 0) return [];
    return r.stdout
      .toString("utf-8")
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function lerConfig(dir: string): Config {
  const c = lerJsonSeguro(join(dir, "config.json"));
  return c && typeof c.tom === "string" ? { tom: c.tom } : {};
}

function salvarConfig(dir: string, tom: string): void {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "config.json"), JSON.stringify({ tom }, null, 2));
}

function montarFicha(tom: string): Ficha {
  const filaExiste = existsSync(FILA_DIR);
  const nomes = filaExiste ? listarAgentes(FILA_DIR) : [];
  const agentes = nomes.map((n) => agenteFato(FILA_DIR, n));
  const commits = commitsRecentes(REPO_DIR);
  const nJobs = agentes.reduce((acc, a) => acc + a.pendentes + a.emAndamento + a.concluidosTotal, 0);
  const ilegiveis = agentes.reduce((acc, a) => acc + a.ilegiveis, 0);
  return {
    geradoEm: new Date().toISOString(),
    filaExiste,
    agentes,
    commits,
    tom,
    totais: { nAgentes: agentes.length, nJobs, nCommits: commits.length, ilegiveis },
  };
}

function montarPrompt(ficha: Ficha, vazia: boolean): string {
  const linhas: string[] = [
    `Tom pedido: ${ficha.tom}`,
    "",
    "Você é a CRÔNICA DA ORQUESTRA do EGOS. Narre em PT-BR, prosa contínua — UMA história, não lista —",
    "de 400 a 700 palavras. Cada agente da FICHA é um PERSONAGEM NOMEADO.",
    "NÃO invente fato fora da FICHA DE FATOS abaixo — toda métrica citada (latência, contagem, título)",
    "precisa vir literalmente dela. Traga PELO MENOS um caso concreto com números reais",
    "(ex.: quanto tempo um job esperou ou levou para ser feito, em minutos).",
  ];
  if (vazia) linhas.push("A fila está vazia — diga isso honestamente (nada rodou ainda), não fabrique atividade.");
  linhas.push("", "FICHA DE FATOS (JSON):", JSON.stringify(ficha, null, 2));
  return linhas.join("\n");
}

function textoFake(ficha: Ficha, vazia: boolean): string {
  if (vazia) {
    return `⚪ CRÔNICA VAZIA — ${ficha.totais.nAgentes} agente(s) na fila, nenhum job rodou ainda. Nada a narrar além disso; nada foi inventado.`;
  }
  const partes: string[] = [`[FAKE] Crônica gerada sem chamar claude (EGOS_CRONICA_FAKE=1). Tom: ${ficha.tom}.`];
  for (const a of ficha.agentes) {
    const ultimo = a.concluidos[0];
    if (ultimo) {
      const espera = ultimo.esperaMin ?? "⚪";
      const execucao = ultimo.execucaoMin ?? "⚪";
      partes.push(
        `${a.nome} concluiu "${ultimo.titulo}" (esperou ${espera}min, executou ${execucao}min) — ` +
          `${a.concluidosTotal} concluído(s) no total, ${a.pendentes} pendente(s), ${a.emAndamento} em andamento.`
      );
    } else {
      partes.push(`${a.nome}: ${a.pendentes} pendente(s), ${a.emAndamento} em andamento, ${a.concluidosTotal} concluído(s).`);
    }
  }
  partes.push(`Commits recentes: ${ficha.totais.nCommits}. JSON ilegíveis contados: ${ficha.totais.ilegiveis}.`);
  return partes.join("\n");
}

function gerar(tomArg: string | undefined): void {
  const cfgAntes = lerConfig(CRONICA_DIR);
  const tom = tomArg ?? cfgAntes.tom ?? TOM_DEFAULT;
  salvarConfig(CRONICA_DIR, tom);

  const ficha = montarFicha(tom);
  const vazia = ficha.totais.nJobs === 0;

  let texto: string;
  if (process.env.EGOS_CRONICA_FAKE === "1") {
    texto = textoFake(ficha, vazia);
  } else {
    const prompt = montarPrompt(ficha, vazia);
    // modelo EXPLÍCITO — R-MODELO-INDICADO-001 (MODEL_DELEGATION_POLICY.md)
    const r = Bun.spawnSync(["claude", "-p", prompt, "--model", "claude-sonnet-5"], {
      timeout: 120_000,
      stdout: "pipe",
      stderr: "pipe",
    });
    const saida = r.stdout ? r.stdout.toString("utf-8").trim() : "";
    const erro = r.stderr ? r.stderr.toString("utf-8").trim() : "";
    if (r.exitCode !== 0 || !saida) {
      const motivo = r.signalCode ? `sinal ${r.signalCode} (provável timeout de 120s)` : `exit code ${r.exitCode}`;
      console.error(`[ERROR] cronica: claude -p falhou (${motivo}) — história anterior preservada, nada sobrescrito`);
      if (erro) console.error(erro);
      process.exit(1);
    }
    texto = saida;
  }

  mkdirSync(CRONICA_DIR, { recursive: true });
  writeFileSync(join(CRONICA_DIR, "historia.md"), texto);
  writeFileSync(
    join(CRONICA_DIR, "historia.json"),
    JSON.stringify(
      {
        geradoEm: new Date().toISOString(),
        tom,
        fatos: { nAgentes: ficha.totais.nAgentes, nJobs: ficha.totais.nJobs, nCommits: ficha.totais.nCommits },
      },
      null,
      2
    )
  );
  console.log(`narrado: ${join(CRONICA_DIR, "historia.md")}`);
}

function argVal(resto: string[], nome: string): string | undefined {
  const i = resto.indexOf(nome);
  return i >= 0 ? resto[i + 1] : undefined;
}

const [cmd, ...resto] = process.argv.slice(2);

if (cmd === "coletar") {
  const cfg = lerConfig(CRONICA_DIR);
  const ficha = montarFicha(cfg.tom ?? TOM_DEFAULT);
  console.log(JSON.stringify(ficha, null, 2));
} else if (cmd === "gerar") {
  gerar(argVal(resto, "--tom"));
} else {
  console.error('uso: cronica.ts coletar|gerar [--tom "<tom>"]');
  process.exit(2);
}
