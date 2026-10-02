/**
 * nucleo.ts — REFATORACAO-ORGANICA-001 (04/09): módulo comum extraído de orquestra-viva.ts
 * (1667L → módulos por domínio). Núcleo de fila/agentes que TODOS os outros módulos de
 * orquestra-viva/ consomem (BASE/REPO_DIR/montarEstado etc.) — extraído porque 2+ consumidores
 * já precisavam dele (coletores-integracoes.ts, coletores-agentes.ts, rotas-reuniao.ts, e o
 * orquestra-viva.ts principal). Zero mudança de comportamento — só onde o código mora.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { lerPerfil, nomePerfilAtivo, type Perfil } from "../lib/perfil";

export const BASE = process.env.EGOS_FILA_DIR ?? join(process.env.HOME ?? "", ".egos", "fila");
export const PULSE_DIR = join(process.env.HOME ?? "", ".egos", "pulse");
export const REPO_DIR = process.env.EGOS_REPO_DIR ?? join(process.env.HOME ?? "", "enio-dev", "producao", "egos");
// CRÔNICA DA ORQUESTRA (corte Enio 2026-08-30): mesma pasta que scripts/cronica.ts lê/escreve —
// EGOS_CRONICA_DIR precisa bater nos dois lados para os goldens usarem fixture isolada.
export const CRONICA_DIR = process.env.EGOS_CRONICA_DIR ?? join(process.env.HOME ?? "", ".egos", "cronica");
export const CRONICA_TOM_MAX = 200;

export interface JobResumo {
  id: string;
  titulo: string;
  de: string;
  criadoEm: string;
  pegoEm?: string;
  resultado?: string;
}

export interface EscutaEstado {
  status: "viva" | "orfa" | "surda";
  pid?: number;
  sessao?: string;
  armadoEm?: string;
}

export interface AgenteEstado {
  pendentes: JobResumo[];
  emAndamento: JobResumo[];
  concluidosTotal: number;
  concluidosUltimos: JobResumo[];
  escuta: EscutaEstado;
}

export interface EstadoGlobal {
  agentes: Record<string, AgenteEstado>;
  git: GitCabeca;
  pulse: { ultimaMedicao: string | null };
  filaExiste: boolean;
  geradoEm: string;
  /** identificador do perfil ativo (EGOS-APP-TEMPLATES-5-001): "default" ou o caminho do
   *  arquivo resolvido — é prova de qual perfil está no ar, não um rótulo. */
  perfil: string;
  /** perfil resolvido por inteiro — a home lê daqui pra decidir módulos/atalhos/nome. */
  perfilAtivo: Perfil;
}

export function lerJobSeguro(caminho: string): Record<string, unknown> | null {
  try {
    return JSON.parse(readFileSync(caminho, "utf-8"));
  } catch {
    return null;
  }
}

export function resumoDeArquivo(dir: string, arquivo: string): JobResumo {
  const j = lerJobSeguro(join(dir, arquivo));
  if (!j) {
    return { id: arquivo, titulo: "⚪ NAO-LEGIVEL (json corrompido)", de: "⚪", criadoEm: "⚪" };
  }
  // pegoEm/resultado são opcionais de propósito: pendente nunca tem os dois, em-andamento
  // só tem pegoEm (=idade real de trabalho, distinta de espera — ver fila.ts), concluido tem os dois.
  const resumo: JobResumo = {
    id: typeof j.id === "string" ? j.id : arquivo,
    titulo: typeof j.titulo === "string" ? j.titulo : "⚪ sem-titulo",
    de: typeof j.de === "string" ? j.de : "⚪",
    criadoEm: typeof j.criadoEm === "string" ? j.criadoEm : "⚪",
  };
  if (typeof j.pegoEm === "string") resumo.pegoEm = j.pegoEm;
  if (typeof j.resultado === "string" && j.resultado) resumo.resultado = j.resultado;
  return resumo;
}

export function listarOrdenado(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .sort();
}

export function lerEscuta(agenteDir: string): EscutaEstado {
  const pres = join(agenteDir, ".escutando");
  if (!existsSync(pres)) return { status: "surda" };
  const p = lerJobSeguro(pres);
  if (!p || typeof p.pid !== "number") return { status: "surda" };
  try {
    process.kill(p.pid, 0);
    return {
      status: "viva",
      pid: p.pid,
      sessao: typeof p.sessao === "string" ? p.sessao : "⚪",
      armadoEm: typeof p.armadoEm === "string" ? p.armadoEm : "⚪",
    };
  } catch {
    return { status: "orfa", pid: p.pid, sessao: typeof p.sessao === "string" ? p.sessao : "⚪" };
  }
}

export function listarAgentes(): string[] {
  if (!existsSync(BASE)) return [];
  return readdirSync(BASE).filter((a) => {
    if (a.startsWith(".")) return false;
    try {
      return statSync(join(BASE, a)).isDirectory();
    } catch {
      return false;
    }
  });
}

export function estadoDeAgente(agente: string): AgenteEstado {
  const agenteDir = join(BASE, agente);
  const pendDir = join(agenteDir, "pendentes");
  const andDir = join(agenteDir, "em-andamento");
  const concDir = join(agenteDir, "concluidos");

  const pendArqs = listarOrdenado(pendDir);
  const andArqs = listarOrdenado(andDir);
  const concArqs = listarOrdenado(concDir);

  return {
    pendentes: pendArqs.map((f) => resumoDeArquivo(pendDir, f)),
    emAndamento: andArqs.map((f) => resumoDeArquivo(andDir, f)),
    concluidosTotal: concArqs.length,
    // 5 (não 3): painel lateral tem seção "o que está rolando" pedindo os últimos 5 (corte Enio 2026-08-30).
    concluidosUltimos: concArqs.slice(-5).reverse().map((f) => resumoDeArquivo(concDir, f)),
    escuta: lerEscuta(agenteDir),
  };
}

export interface GitCabeca { head: string; msg: string; versao: string; data: string; total: number; ramo: string }
const GIT_INDISPONIVEL: GitCabeca = { head: "⚪", msg: "⚪ git indisponível", versao: "⚪", data: "", total: 0, ramo: "" };

/** VERSÃO DO APP (EGOS-APP-CONTA-E-VERSAO-001 fatia 1, corte Enio 06/09 "o egos app ainda está sem
 *  versionamento"): derivada do git do checkout que SERVE o app — `v<data do commit>.<nº de commits>`
 *  (ex.: v2026.09.06.6031) + SHA. Nunca digitada à mão: número que a máquina não mede é ⚪. */
export async function gitCabeca(): Promise<GitCabeca> {
  try {
    const run = async (args: string[]) => {
      const proc = Bun.spawn(["git", ...args], { cwd: REPO_DIR, stdout: "pipe", stderr: "pipe" });
      const out = (await new Response(proc.stdout).text()).trim();
      return (await proc.exited) === 0 ? out : "";
    };
    const out = await run(["log", "-1", "--pretty=%h\t%cs\t%s"]);
    if (!out) return GIT_INDISPONIVEL;
    const [head, data, ...resto] = out.split("\t");
    const msg = resto.join("\t") || "⚪";
    const total = Number(await run(["rev-list", "--count", "HEAD"])) || 0;
    const ramo = await run(["branch", "--show-current"]);
    const versao = data && total ? `v${data.replace(/-/g, ".")}.${total}` : "⚪";
    return { head, msg, versao, data, total, ramo };
  } catch {
    return GIT_INDISPONIVEL;
  }
}

export function ultimaMedicaoPulse(): string | null {
  if (!existsSync(PULSE_DIR)) return null;
  let maisRecente: { nome: string; mtimeMs: number } | null = null;
  for (const f of readdirSync(PULSE_DIR)) {
    const caminho = join(PULSE_DIR, f);
    try {
      const st = statSync(caminho);
      if (!st.isFile()) continue;
      if (!maisRecente || st.mtimeMs > maisRecente.mtimeMs) maisRecente = { nome: f, mtimeMs: st.mtimeMs };
    } catch {
      /* ignora arquivo ilegível — não interrompe a varredura */
    }
  }
  return maisRecente ? new Date(maisRecente.mtimeMs).toISOString() : null;
}

export async function montarEstado(): Promise<EstadoGlobal> {
  const filaExiste = existsSync(BASE);
  const agentes: Record<string, AgenteEstado> = {};
  if (filaExiste) {
    for (const a of listarAgentes()) agentes[a] = estadoDeAgente(a);
  }
  const perfilResolvido = lerPerfil(REPO_DIR);
  return {
    agentes,
    git: await gitCabeca(),
    pulse: { ultimaMedicao: ultimaMedicaoPulse() },
    filaExiste,
    perfil: nomePerfilAtivo(perfilResolvido),
    perfilAtivo: perfilResolvido.perfil,
    geradoEm: new Date().toISOString(),
  };
}

export function agenteValido(agente: string): boolean {
  return listarAgentes().includes(agente);
}
