// SIMPLICITY_OVERRIDE: coletores de sessoes/subagentes/timers/cron/motores MOVIDOS de scripts/orquestra-viva.ts (1667L) na refatoracao organica de 04/09 — codigo movido, nao escrito; proximo passo separa timers/cron (sistema) de sessoes/subagentes (Claude Code).
/**
 * coletores-agentes.ts — REFATORACAO-ORGANICA-001 (04/09): extraído de orquestra-viva.ts.
 * Telemetria agregada de agentes: sessões Claude vivas, subagentes despachados, workflows,
 * motores agendados (timers/cron), time em campo (papéis/corridas/heartbeats/skills) e o
 * espelho da sessão atual (transcript lido, nunca gravado por aqui). Zero mudança de
 * comportamento — só onde o código mora.
 */
import { closeSync, existsSync, openSync, readdirSync, readFileSync, readSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import { homedir } from "node:os";
import { renderCorpo } from "../md-para-html";
import { type BlocosResposta, type Leigo, extrairCaminhos, separarBlocos, traduzirParaLeigo } from "./blocos-resposta";
import { type EscutaEstado, type EstadoGlobal, type JobResumo, REPO_DIR, lerJobSeguro, montarEstado } from "./nucleo";

// ── AGENTES (corte Enio 2026-08-31, CENTRAL-CAMADA-AGENTES-001): a orquestra-viva
// vira CENTRAL DE CONTROLE — /agentes agrega telemetria JÁ EXISTENTE em disco (sessões
// Claude vivas, subagentes despachados, workflows, motores agendados) pra provar
// "centenas de agentes orquestrados" com números REAIS, nunca inventados. Cada bloco
// fail-open COM VOZ (R13-c): fonte ilegível vira {n:null, detalhe:"⚪ NAO-MEDIDO: ..."},
// nunca zero silencioso. Zero rede externa — tudo lido do disco/processos LOCAIS.

const AGENT_RUNS_DIR = join(process.env.HOME ?? "", ".egos", "agent-runs");
const CLAUDE_PROJETOS_DIR = join(process.env.HOME ?? "", ".claude", "projects");

export interface Contagem {
  n: number | null;
  detalhe: string;
}

export function naoMedido(motivo: string): Contagem {
  return { n: null, detalhe: `⚪ NAO-MEDIDO: ${motivo}` };
}

export function ehHoje(mtimeMs: number, hojeISO: string): boolean {
  return new Date(mtimeMs).toISOString().slice(0, 10) === hojeISO;
}

export function listarSubdiretorios(dir: string): string[] {
  try {
    return readdirSync(dir).filter((d) => {
      try {
        return statSync(join(dir, d)).isDirectory();
      } catch {
        return false;
      }
    });
  } catch {
    return [];
  }
}

export async function contarSessoesClaudeVivas(): Promise<Contagem> {
  try {
    const proc = Bun.spawn(["pgrep", "-x", "claude"], { stdout: "pipe", stderr: "pipe" });
    const out = (await new Response(proc.stdout).text()).trim();
    const code = await proc.exited;
    // pgrep sai 1 quando NENHUM processo casa — não é erro, é zero medido de verdade.
    if (code !== 0 && code !== 1) return naoMedido(`pgrep saiu com código ${code}`);
    const n = out ? out.split("\n").filter(Boolean).length : 0;
    return { n, detalhe: "pgrep -x claude (processos vivos nesta máquina)" };
  } catch (e) {
    return naoMedido(`pgrep indisponível: ${(e as Error).message}`);
  }
}

export interface ContagemDia extends Contagem {
  hoje: number | null;
}

/** ~/.egos/agent-runs/*.jsonl — o ledger append-only que os próprios agentes
 *  escrevem (ver telemetria da Forja etc.). "hoje" usa mtime do arquivo. */
export function contarAgentRuns(): ContagemDia {
  if (!existsSync(AGENT_RUNS_DIR)) {
    return { n: null, hoje: null, detalhe: "⚪ NAO-MEDIDO: ~/.egos/agent-runs não existe nesta máquina" };
  }
  let arquivos: string[];
  try {
    arquivos = readdirSync(AGENT_RUNS_DIR).filter((f) => f.endsWith(".jsonl"));
  } catch (e) {
    return { n: null, hoje: null, detalhe: `⚪ NAO-MEDIDO: ~/.egos/agent-runs ilegível (${(e as Error).message})` };
  }
  const hojeISO = new Date().toISOString().slice(0, 10);
  let hoje = 0;
  for (const f of arquivos) {
    try {
      const st = statSync(join(AGENT_RUNS_DIR, f));
      if (ehHoje(st.mtimeMs, hojeISO)) hoje++;
    } catch {
      /* arquivo individual ilegível não derruba a contagem total — só não entra no "hoje" */
    }
  }
  return {
    n: arquivos.length,
    hoje,
    detalhe: `${arquivos.length} arquivo(s) .jsonl em ~/.egos/agent-runs (ledger append-only de subagentes)`,
  };
}

export interface ContagemSessoes extends ContagemDia {
  sessoesComPasta: number;
}

/** Conta agent-*.jsonl dentro de <projeto>/<sessão>/subagents/ em TODAS as sessões
 *  Claude Code desta máquina — NUNCA lê conteúdo (pode ter dado sensível), só conta arquivos. */
export function contarSubagentesSessoesClaude(): ContagemSessoes {
  if (!existsSync(CLAUDE_PROJETOS_DIR)) {
    return { n: null, hoje: null, sessoesComPasta: 0, detalhe: "⚪ NAO-MEDIDO: ${DIR_IA}/projects não existe nesta máquina" };
  }
  const hojeISO = new Date().toISOString().slice(0, 10);
  let total = 0;
  let hoje = 0;
  let sessoesComPasta = 0;
  for (const projeto of listarSubdiretorios(CLAUDE_PROJETOS_DIR)) {
    const projetoDir = join(CLAUDE_PROJETOS_DIR, projeto);
    for (const sessao of listarSubdiretorios(projetoDir)) {
      const subDir = join(projetoDir, sessao, "subagents");
      if (!existsSync(subDir)) continue;
      let arquivos: string[];
      try {
        arquivos = readdirSync(subDir).filter((f) => f.startsWith("agent-") && f.endsWith(".jsonl"));
      } catch {
        continue; // sessão ilegível individualmente não derruba a varredura inteira
      }
      if (arquivos.length === 0) continue;
      sessoesComPasta++;
      total += arquivos.length;
      for (const f of arquivos) {
        try {
          const st = statSync(join(subDir, f));
          if (ehHoje(st.mtimeMs, hojeISO)) hoje++;
        } catch {
          /* idem */
        }
      }
    }
  }
  return {
    n: total,
    hoje,
    sessoesComPasta,
    detalhe: `${sessoesComPasta} sessão(ões) Claude Code com subagents/ despachados nesta máquina`,
  };
}

export interface ContagemWorkflows extends Contagem {
  sessoesComPasta: number;
}

/** Conta wf_*.json dentro de <projeto>/<sessão>/workflows/ — mesma varredura de
 *  contarSubagentesSessoesClaude, domínio diferente (workflow ≠ subagente). */
export function contarWorkflows(): ContagemWorkflows {
  if (!existsSync(CLAUDE_PROJETOS_DIR)) {
    return { n: null, sessoesComPasta: 0, detalhe: "⚪ NAO-MEDIDO: ${DIR_IA}/projects não existe nesta máquina" };
  }
  let total = 0;
  let sessoesComPasta = 0;
  for (const projeto of listarSubdiretorios(CLAUDE_PROJETOS_DIR)) {
    const projetoDir = join(CLAUDE_PROJETOS_DIR, projeto);
    for (const sessao of listarSubdiretorios(projetoDir)) {
      const wfDir = join(projetoDir, sessao, "workflows");
      if (!existsSync(wfDir)) continue;
      let arquivos: string[];
      try {
        arquivos = readdirSync(wfDir).filter((f) => /^wf_.*\.json$/.test(f));
      } catch {
        continue;
      }
      if (arquivos.length === 0) continue;
      sessoesComPasta++;
      total += arquivos.length;
    }
  }
  return { n: total, sessoesComPasta, detalhe: `${sessoesComPasta} sessão(ões) com workflows/ registrados nesta máquina` };
}

// ITEM NOMEADO de motor (timer systemd ou linha de cron) — APP-DESIGN-DO-ENIO-001 fatia 2
// (04/09): antes só o NÚMERO chegava ao front; o clique em "Motores" e "Serviços" abria a
// mesma gaveta genérica sem nome nenhum. `proxima`/`ultima` em ISO (⚪/null quando a fonte
// não mede — cron não expõe next-run sem parser de expressão, então fica ⚪ SEMPRE ali).
export interface ItemMotor {
  nome: string;
  agenda?: string;
  proxima: string | null;
  ultima: string | null;
}

export interface ContagemMotor extends Contagem {
  itens: ItemMotor[];
}

export function microsParaIso(v: unknown): string | null {
  const n = typeof v === "number" ? v : NaN;
  if (!Number.isFinite(n) || n <= 0) return null;
  const d = new Date(n / 1000);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export async function contarTimersSystemd(): Promise<ContagemMotor> {
  try {
    const proc = Bun.spawn(["systemctl", "--user", "list-timers", "--all", "--output=json"], { stdout: "pipe", stderr: "pipe" });
    const out = await new Response(proc.stdout).text();
    const code = await proc.exited;
    if (code !== 0) return { ...naoMedido(`systemctl --user saiu com código ${code}`), itens: [] };
    let arr: unknown;
    try {
      arr = JSON.parse(out);
    } catch {
      return { ...naoMedido("systemctl --user devolveu JSON ilegível"), itens: [] };
    }
    if (!Array.isArray(arr)) return { ...naoMedido("systemctl --user devolveu formato inesperado (esperava array)"), itens: [] };
    // ordena por próxima execução (soonest-first) — o Enio quer ver o que vai disparar
    // primeiro, não a ordem alfabética que o systemd devolve.
    const itens: ItemMotor[] = (arr as Array<Record<string, unknown>>)
      .map((t) => ({ nome: String(t.unit ?? "⚪ sem nome"), proxima: microsParaIso(t.next), ultima: microsParaIso(t.last) }))
      .sort((a, b) => (a.proxima ?? "9999").localeCompare(b.proxima ?? "9999"))
      .slice(0, 20);
    return { n: arr.length, detalhe: "systemctl --user list-timers --all --output=json", itens };
  } catch (e) {
    return { ...naoMedido(`systemctl indisponível: ${(e as Error).message}`), itens: [] };
  }
}

export async function contarCrontab(): Promise<ContagemMotor> {
  try {
    const proc = Bun.spawn(["crontab", "-l"], { stdout: "pipe", stderr: "pipe" });
    const out = await new Response(proc.stdout).text();
    const err = await new Response(proc.stderr).text();
    const code = await proc.exited;
    if (code !== 0) {
      if (/no crontab/i.test(err)) return { n: 0, detalhe: "crontab -l: sem crontab para este usuário", itens: [] };
      return { ...naoMedido(`crontab -l saiu com código ${code}: ${err.trim() || "sem detalhe"}`), itens: [] };
    }
    // rótulo: comentário "# NOME: descrição" na linha imediatamente acima do job nomeia
    // o job seguinte (padrão já usado no crontab desta casa — "# EGOS-GOV: ..."); sem
    // comentário casando o padrão, cai no 1º argumento de com-heartbeat.sh (a maioria dos
    // jobs já passa por ali) e, na falta dos dois, no início cru do comando.
    let rotuloPendente: string | null = null;
    const itens: ItemMotor[] = [];
    for (const linhaBruta of out.split("\n")) {
      const t = linhaBruta.trim();
      if (!t) continue;
      if (t.startsWith("#")) {
        const m = /^#\s*([A-Za-z][\w-]*)\s*:/.exec(t);
        rotuloPendente = m ? m[1] : rotuloPendente;
        continue;
      }
      if (/^(SHELL|PATH|MAILTO)=/.test(t)) continue;
      const campos = t.split(/\s+/);
      if (campos.length < 6) continue; // não tem os 5 campos de agenda + comando — não é job
      const agenda = campos.slice(0, 5).join(" ");
      const comando = campos.slice(5).join(" ");
      const viaHeartbeat = /com-heartbeat\.sh\s+(\S+)/.exec(comando);
      const nome = rotuloPendente ?? (viaHeartbeat ? viaHeartbeat[1] : comando.slice(0, 48));
      itens.push({ nome, agenda, proxima: null, ultima: null });
      rotuloPendente = null;
    }
    return { n: itens.length, detalhe: "crontab -l, linhas ativas (sem comentário/env)", itens };
  } catch (e) {
    return { ...naoMedido(`crontab indisponível: ${(e as Error).message}`), itens: [] };
  }
}

export async function montarAgentes(): Promise<Record<string, unknown>> {
  const [sessoesVivas, timers, cron, filaEstado] = await Promise.all([
    contarSessoesClaudeVivas(),
    contarTimersSystemd(),
    contarCrontab(),
    montarEstado(),
  ]);
  const agentRuns = contarAgentRuns();
  const sessoesClaude = contarSubagentesSessoesClaude();
  const workflows = contarWorkflows();

  // fila/escutas: REUSA montarEstado() (mesma lógica do /estado) — nunca recalcula por conta própria.
  let filaAgentes = 0;
  let filaEscutasVivas = 0;
  let filaPendentes = 0;
  let filaEmAndamento = 0;
  for (const a of Object.values(filaEstado.agentes)) {
    filaAgentes++;
    if (a.escuta.status === "viva") filaEscutasVivas++;
    filaPendentes += a.pendentes.length;
    filaEmAndamento += a.emAndamento.length;
  }

  return {
    sessoesVivas,
    subagentes: {
      // dois domínios DIFERENTES, não somados sem âncora (R-IDENTIFICADOR-OPACO-001):
      // agentRuns é o ledger que os agentes escrevem sozinhos; sessoesClaude é o que o
      // harness Claude Code grava por sessão. Podem se sobrepor, não são o mesmo dado.
      agentRuns,
      sessoesClaude,
    },
    workflows,
    motores: { timers, cron },
    fila: { agentes: filaAgentes, escutasVivas: filaEscutasVivas, pendentes: filaPendentes, emAndamento: filaEmAndamento },
    // VPS: página LOCAL e rápida — não chama a VPS. Lê o que a sentinela (health-check
    // periódico — a cadência é do crontab, bloco SENTINELA-EXTERNA-001; NÃO digitar o número
    // aqui: dizia "30 min" e o crontab rodava */10) já gravou em ~/.egos/vps-sentinela.json.
    // Era "20 serviços (censo 30/08, ⚪ estático)" até 05/09 — o único número morto da home.
    // Rotulado "VPS:" (fatia 2, 04/09) — a palavra "serviços" só ocorre AQUI na tela
    // inteira; o módulo Serviços mede as 7 integrações locais, dado diferente.
    vps: lerVpsSentinela(),
    geradoEm: new Date().toISOString(),
  };
}

// ── TIME EM CAMPO (corte Enio 2026-08-31, TIME-EM-CAMPO-001): miniatura do EGOS APP —
// "o visual do TIME DE AGENTES EM CAMPO" — alimentada só por disco LOCAL já existente
// (fila.ts + ~/.egos/agent-runs + ~/.egos/heartbeat). Zero LLM, zero rede externa.
// Reusa montarEstado() para os papéis — não recalcula pendentes/em-andamento do zero.

const HEARTBEAT_DIR = join(process.env.HOME ?? "", ".egos", "heartbeat");

export interface PapelEmCampo {
  papel: string;
  pendentesTotal: number;
  emAndamentoTotal: number;
  pendentesRecentes: JobResumo[];
  emAndamentoRecentes: JobResumo[];
  // PEDIDO-AGENTE-NOMEADO-001 (PCA-55, corte Enio 05/09): o detalhe do papel na gaveta
  // precisa do bloco "feitos" e do estado de escuta (pid/hora) pro tooltip — nucleo.ts já
  // media os dois em estadoDeAgente(); só faltava chegar aqui (ADOPT, não recalcula).
  concluidosTotal: number;
  concluidosRecentes: JobResumo[];
  escuta: EscutaEstado;
}

export function papeisEmCampo(estado: EstadoGlobal, agentesPerfil: string[] = []): PapelEmCampo[] {
  // perfil.agentes vazio = sem filtro (comportamento anterior: mostra tudo que a fila tem).
  // Não-vazio = só os papéis que o perfil declara (fork enxuto só vê o time dele).
  const entradas = agentesPerfil.length
    ? Object.entries(estado.agentes).filter(([papel]) => agentesPerfil.includes(papel))
    : Object.entries(estado.agentes);
  return entradas.map(([papel, dados]) => ({
    papel,
    pendentesTotal: dados.pendentes.length,
    emAndamentoTotal: dados.emAndamento.length,
    concluidosTotal: dados.concluidosTotal,
    concluidosRecentes: dados.concluidosUltimos,
    escuta: dados.escuta,
    // últimos 3 por ordem de arquivo (mesma convenção de concluidosUltimos em estadoDeAgente:
    // id do job carrega o timestamp, listarOrdenado já ordena alfabético≈cronológico).
    pendentesRecentes: dados.pendentes.slice(-3).reverse(),
    emAndamentoRecentes: dados.emAndamento.slice(-3).reverse(),
  }));
}

export interface CorridaResumo {
  nome: string;
  mtime: string;
  resumo: string | null;
}

/** Extrai um resumo curto da ÚLTIMA linha de um .jsonl — aceita status/evento (como pedido)
 *  e action/result (formato real da telemetria dos braços, ver `.claude/agents/*.md`).
 *  Linha ilegível ou sem nenhum desses campos → null (front mostra só o nome do arquivo). */
export function resumirLinhaCorrida(linha: string): string | null {
  let j: unknown;
  try {
    j = JSON.parse(linha);
  } catch {
    return null;
  }
  if (!j || typeof j !== "object") return null;
  const o = j as Record<string, unknown>;
  const partes = [o.status, o.evento, o.action, o.result].filter(
    (v): v is string => typeof v === "string" && v.length > 0
  );
  return partes.length ? partes.slice(0, 2).join(" · ") : null;
}

export function ultimaLinhaDoArquivo(caminho: string): string | null {
  try {
    const linhas = readFileSync(caminho, "utf-8").split("\n").map((l) => l.trim()).filter(Boolean);
    if (!linhas.length) return null;
    return resumirLinhaCorrida(linhas[linhas.length - 1]);
  } catch {
    return null;
  }
}

/** 5 mais recentes por MTIME (não por nome — "FORJA-autoheal-run.jsonl" não carrega
 *  timestamp no nome; "sentinela-<epoch>.jsonl" carrega, mas nem todo arquivo segue o padrão). */
export function corridasRecentes(): { itens: CorridaResumo[] } | { erro: string } {
  if (!existsSync(AGENT_RUNS_DIR)) {
    return { erro: "⚪ NAO-MEDIDO: ~/.egos/agent-runs não existe nesta máquina" };
  }
  let arquivos: string[];
  try {
    arquivos = readdirSync(AGENT_RUNS_DIR).filter((f) => f.endsWith(".jsonl"));
  } catch (e) {
    return { erro: `⚪ NAO-MEDIDO: ~/.egos/agent-runs ilegível (${(e as Error).message})` };
  }
  const comMtime = arquivos.map((f) => {
    const caminho = join(AGENT_RUNS_DIR, f);
    let mtimeMs = 0;
    try {
      mtimeMs = statSync(caminho).mtimeMs;
    } catch {
      /* arquivo individual ilegível não derruba a varredura — só vai pro fim da lista */
    }
    return { f, caminho, mtimeMs };
  });
  comMtime.sort((a, b) => b.mtimeMs - a.mtimeMs);
  const itens = comMtime.slice(0, 5).map(({ f, caminho, mtimeMs }) => ({
    nome: f.replace(/\.jsonl$/, ""),
    mtime: mtimeMs ? new Date(mtimeMs).toISOString() : "⚪",
    resumo: ultimaLinhaDoArquivo(caminho),
  }));
  return { itens };
}

export interface HeartbeatResumo {
  nome: string;
  status: string | null;
  timestamp: string | null;
}

/** ~/.egos/heartbeat/*.json — NÃO duplica check-heartbeats.ts (aquele julga staleness
 *  contra o crontab e emite veredito 🔴/🟡); isto só EXIBE o que está gravado, sem veredito. */
export function heartbeatsRecentes(): { itens: HeartbeatResumo[] } | { erro: string } {
  if (!existsSync(HEARTBEAT_DIR)) {
    return { erro: "⚪ NAO-MEDIDO: ~/.egos/heartbeat não existe nesta máquina" };
  }
  let arquivos: string[];
  try {
    arquivos = readdirSync(HEARTBEAT_DIR).filter((f) => f.endsWith(".json") && !f.startsWith("."));
  } catch (e) {
    return { erro: `⚪ NAO-MEDIDO: ~/.egos/heartbeat ilegível (${(e as Error).message})` };
  }
  const itens = arquivos.sort().map((f) => {
    const nome = f.replace(/\.json$/, "");
    const j = lerJobSeguro(join(HEARTBEAT_DIR, f));
    if (!j) return { nome, status: null, timestamp: null };
    return {
      nome,
      status: typeof j.status === "string" ? j.status : null,
      timestamp: typeof j.timestamp === "string" ? j.timestamp : null,
    };
  });
  return { itens };
}

// ── SKILLS EM USO (corte Enio 01/09: "uso sendo noticiado a cada movimento") ─────────────
// O skill-usage-tracker JÁ mede diariamente (cron 13h) e logava para um destino sem leitor
// nas superfícies locais (medido: grep skill-usage no /start e aqui = 0). Este tile é o
// leitor. Cache de 30min: o tracker varre logs de sessão inteiros — caro para todo poll.
let skillsCache: { dados: unknown; em: number } | null = null;
export async function skillsEmUso(): Promise<unknown> {
  if (skillsCache && Date.now() - skillsCache.em < 30 * 60 * 1000) return skillsCache.dados;
  try {
    const proc = Bun.spawn([process.execPath, join(import.meta.dir, "skill-usage-tracker.ts"), "--json", "--days=30"], {
      stdout: "pipe", stderr: "ignore",
    });
    const bruto = await new Response(proc.stdout).text();
    const json = JSON.parse(bruto) as { skills?: Array<{ skill: string; count: number; last_used: string }> };
    const top = (json.skills ?? []).slice(0, 8);
    skillsCache = { dados: { top, medidoEm: new Date().toISOString() }, em: Date.now() };
    return skillsCache.dados;
  } catch (e) {
    // ⚪ dito, nunca tile sumido — medidor que falha em silêncio é o defeito que este tile cura
    return { erro: `⚪ NÃO-MEDIDO: tracker falhou daqui (${e instanceof Error ? e.message : String(e)})` };
  }
}

export async function montarTimeEmCampo(): Promise<Record<string, unknown>> {
  const estado = await montarEstado();
  return {
    papeis: papeisEmCampo(estado, estado.perfilAtivo.agentes),
    corridas: corridasRecentes(),
    heartbeats: heartbeatsRecentes(),
    skills: await skillsEmUso(),
    filaExiste: estado.filaExiste,
    geradoEm: new Date().toISOString(),
  };
}

// ── ESPELHO DA SESSÃO (corte Enio 03/09: "o EGOS APP é essa frente: trabalhar por loops,
// visualizando o que está acontecendo aqui, com layout do Claude Code"). Fonte = o transcript
// que o Claude Code já grava em ${DIR_IA}/projects/<repo>/<sessão>.jsonl — nada novo é
// gravado, o app só LÊ (ADOPT). Regras: pensamento (thinking) nunca sai daqui; resultado de
// ferramenta é casado pelo tool_use_id; sem transcript = ⚪ dito, nunca lista vazia calada. ──
export interface LinhaDiff { s: "-" | "+" | " "; t: string }
export interface FerramentaEspelho { id: string; nome: string; resumo: string; ok: boolean | null; resultado: string; diff?: LinhaDiff[] }

/** B12 (mapa 06/09): diff inline de Edit/Write como no Claude Code. Sem LCS — apara prefixo e sufixo
 *  comuns e mostra o miolo como -/+. É o que o olho precisa para conferir a edição; diff perfeito é
 *  custo sem ganho aqui. Write = arquivo inteiro como +, limitado a 80 linhas (o resto é dito). */
export function diffDaFerramenta(nome: string, input: Record<string, unknown>): LinhaDiff[] | undefined {
  const s = (v: unknown) => (typeof v === "string" ? v : "");
  if (nome === "Write") {
    const ls = s(input.content).split("\n"); const out: LinhaDiff[] = ls.slice(0, 80).map((t) => ({ s: "+", t }));
    if (ls.length > 80) out.push({ s: " ", t: `… +${ls.length - 80} linha(s)` });
    return out.length ? out : undefined;
  }
  if (nome !== "Edit") return undefined;
  const a = s(input.old_string).split("\n"), b = s(input.new_string).split("\n");
  let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++;
  let j = 0; while (j < a.length - i && j < b.length - i && a[a.length - 1 - j] === b[b.length - 1 - j]) j++;
  const out: LinhaDiff[] = [];
  if (i > 0) out.push({ s: " ", t: a[i - 1] });
  for (const t of a.slice(i, a.length - j)) out.push({ s: "-", t });
  for (const t of b.slice(i, b.length - j)) out.push({ s: "+", t });
  if (j > 0) out.push({ s: " ", t: a[a.length - j] });
  return out.length ? out : undefined;
}
export interface TurnoEspelho { papel: "humano" | "agente"; hora: string; texto: string; html?: string; blocos?: BlocosResposta; leigo?: Leigo; caminhos?: string[]; ferramentas: FerramentaEspelho[] }

// RV-7-RESPOSTA-CLICAVEL-E-LEIGA-001 (corte Enio 08/09): VOCAB é o mesmo config/vocabulario.json
// que o /app.js injeta em window.VOCAB (orquestra-viva.ts) — lido uma vez aqui e cacheado em
// módulo (arquivo não muda em produção sem reiniciar o processo; releitura a cada turno seria
// I/O sem ganho). Ilegível → cache vira {} (traduzirParaLeigo degrada para manchete sem <abbr>,
// nunca quebra o turno — R13: falha visível não é a mesma coisa que falha travando a tela).
let vocabCache: Record<string, unknown> | null = null;
function lerVocabParaLeigo(): Record<string, unknown> {
  if (vocabCache) return vocabCache;
  let lido: Record<string, unknown> = {};
  try {
    lido = JSON.parse(readFileSync(join(REPO_DIR, "config", "vocabulario.json"), "utf-8"));
  } catch { /* silencio-ok: sem vocabulário legível, manchete sai sem <abbr> — nunca quebra o turno */ }
  vocabCache = lido;
  return lido;
}

/** Pasta-raiz dos transcripts do Claude Code. Sobrescrevível em teste (EGOS_CLAUDE_PROJECTS). */
function pastaProjetos(): string { return (process.env.EGOS_CLAUDE_PROJECTS ?? "").trim() || join(homedir(), ".claude", "projects"); }

export interface SessaoResumo { id: string; caminho: string; repo: string; modificadoEm: string; viva: boolean; abertura: string }

/** Todas as sessões desta máquina, em TODAS as pastas de projeto (worktrees incluídos), mais recente
 *  primeiro. B9 do mapa de 06/09: o app olhava só a pasta do checkout principal e, com o trabalho num
 *  worktree, espelhava uma sessão das 09:26 às 16:43 — dado errado dito com cara de vivo. */
export function listarSessoes(limite = 12): SessaoResumo[] {
  const raiz = pastaProjetos();
  if (!existsSync(raiz)) return [];
  const todas: SessaoResumo[] = [];
  for (const pasta of readdirSync(raiz)) {
    const dir = join(raiz, pasta);
    let arquivos: string[] = [];
    try { arquivos = readdirSync(dir).filter((f) => f.endsWith(".jsonl")); } catch { continue; }
    for (const f of arquivos) {
      const caminho = join(dir, f);
      let t = 0; try { t = statSync(caminho).mtimeMs; } catch { continue; }
      // nome da pasta é lossy ("/"→"-", e "UI-UX-Orca" vira 3 pedaços): o transcript grava `cwd`, que é a verdade
      todas.push({ id: basename(f, ".jsonl"), caminho, repo: pasta.replace(/^-+/, "").split("-").filter(Boolean).slice(-1)[0] ?? pasta, modificadoEm: new Date(t).toISOString(), viva: Date.now() - t < 10 * 60_000, abertura: "" });
    }
  }
  todas.sort((a, b) => (a.modificadoEm < b.modificadoEm ? 1 : -1));
  const top = todas.slice(0, limite);
  for (const s of top) { const c = cabecalhoDoTranscript(s.caminho); s.abertura = c.abertura; if (c.cwd) s.repo = basename(c.cwd); }
  return top;
}

/** Cabeçalho do transcript: `cwd` (repo real) + primeira frase do humano (nome legível). Lê só o começo. */
function cabecalhoDoTranscript(caminho: string): { abertura: string; cwd: string } {
  let cwd = "";
  try {
    const fd = openSync(caminho, "r"); const buf = Buffer.alloc(64 * 1024); const n = readSync(fd, buf, 0, buf.length, 0); closeSync(fd);
    for (const l of buf.toString("utf-8", 0, n).split("\n")) {
      try {
        const d = JSON.parse(l) as { type?: string; cwd?: string; message?: { content?: unknown } };
        if (!cwd && typeof d.cwd === "string" && d.cwd) cwd = d.cwd;
        if (d.type !== "user") continue;
        const c = d.message?.content;
        const texto = typeof c === "string" ? c : Array.isArray(c) ? (c as Record<string, unknown>[]).filter((b) => b.type === "text").map((b) => String(b.text ?? "")).join(" ") : "";
        const limpo = texto.replace(/<[^>]+>[\s\S]*?<\/[^>]+>/g, "").replace(/\s+/g, " ").trim();
        if (limpo) return { abertura: limpo.length > 90 ? limpo.slice(0, 87) + "…" : limpo, cwd };
      } catch { /* linha partida no limite do buffer */ }
    }
  } catch { /* ilegível = sem abertura, o hash ainda identifica */ }
  return { abertura: "", cwd };
}

/** Transcript a espelhar: explícito (env) → pedido pela UI (id) → sessão atual → a mais recente da MÁQUINA. */
export function transcriptDaSessao(idPedido?: string): string | null {
  const explicito = (process.env.EGOS_SESSAO_JSONL ?? "").trim();
  if (explicito && !idPedido) return explicito;
  const sessoes = listarSessoes(400);
  if (idPedido) { const s = sessoes.find((x) => x.id === idPedido); return s ? s.caminho : null; }
  const atual = (process.env.CLAUDE_CODE_SESSION_ID ?? "").trim();
  if (atual) { const s = sessoes.find((x) => x.id === atual); if (s) return s.caminho; }
  return sessoes.length ? sessoes[0].caminho : null;
}

export function resumoDaFerramenta(nome: string, input: Record<string, unknown>): string {
  const s = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : JSON.stringify(v));
  let r = "";
  if (nome === "Bash") r = s(input.description) || s(input.command);
  else if (["Edit", "Write", "Read", "NotebookEdit"].includes(nome)) r = s(input.file_path).split("/").slice(-2).join("/");
  else if (nome === "Agent") r = s(input.description) || s(input.subagent_type);
  else if (nome === "Skill") r = `/${s(input.skill)}`;
  else if (nome === "Grep" || nome === "Glob") r = s(input.pattern);
  else r = s(input);
  return r.length > 120 ? r.slice(0, 117) + "…" : r;
}

export function textoDeResultado(c: unknown): string {
  if (typeof c === "string") return c;
  if (Array.isArray(c)) return c.map((b) => (b && typeof b === "object" && typeof (b as { text?: string }).text === "string" ? (b as { text: string }).text : "")).join("\n");
  return "";
}

export function lerEspelhoDaSessao(n: number, idPedido?: string): Record<string, unknown> {
  const fonte = transcriptDaSessao(idPedido);
  const agora = new Date().toISOString();
  if (!fonte || !existsSync(fonte)) {
    return { ok: false, erro: `⚪ NÃO-MEDIDO: transcript da sessão não encontrado (${fonte ?? "pasta ${DIR_IA}/projects/<repo> ausente"})`, turnos: [], medidoEm: agora };
  }
  const linhas = readFileSync(fonte, "utf-8").split("\n").filter((l) => l.trim().length > 0);
  const turnos: TurnoEspelho[] = [];
  const porId = new Map<string, FerramentaEspelho>();
  for (const l of linhas) {
    let d: { type?: string; timestamp?: string; message?: { content?: unknown } };
    try { d = JSON.parse(l); } catch { continue; }
    if (d.type !== "user" && d.type !== "assistant") continue;
    const hora = d.timestamp ?? "";
    const conteudo = d.message?.content;
    if (d.type === "user") {
      if (typeof conteudo === "string") { turnos.push({ papel: "humano", hora, texto: conteudo, ferramentas: [] }); continue; }
      if (!Array.isArray(conteudo)) continue;
      const textos: string[] = [];
      for (const b of conteudo as Record<string, unknown>[]) {
        if (b.type === "tool_result") {
          const f = porId.get(String(b.tool_use_id));
          if (f) { f.ok = b.is_error !== true; f.resultado = textoDeResultado(b.content).slice(0, 2000); }
        } else if (b.type === "text" && typeof b.text === "string") textos.push(b.text);
      }
      if (textos.length) turnos.push({ papel: "humano", hora, texto: textos.join("\n"), ferramentas: [] });
      continue;
    }
    if (!Array.isArray(conteudo)) continue;
    const t: TurnoEspelho = { papel: "agente", hora, texto: "", ferramentas: [] };
    for (const b of conteudo as Record<string, unknown>[]) {
      if (b.type === "thinking") continue; // o pensamento não é da tela — nunca
      if (b.type === "text" && typeof b.text === "string") t.texto += (t.texto ? "\n" : "") + b.text;
      if (b.type === "tool_use") {
        const inp = (b.input as Record<string, unknown>) ?? {};
        const f: FerramentaEspelho = { id: String(b.id ?? ""), nome: String(b.name ?? "?"), resumo: resumoDaFerramenta(String(b.name ?? ""), inp), ok: null, resultado: "" };
        const d = diffDaFerramenta(f.nome, inp); if (d) f.diff = d;
        t.ferramentas.push(f); if (f.id) porId.set(f.id, f);
      }
    }
    if (t.texto || t.ferramentas.length) turnos.push(t);
  }
  // B11 (mapa 06/09): o agente escreve markdown; sem renderizar, asteriscos e cercas saíam literais
  // na bolha. ADOPT do renderCorpo da casa (md-para-html.ts, forma aprovada 27/08) — o servidor
  // entrega HTML, o front só exibe. Só o agente: a fala do humano continua literal, como ele digitou.
  // RV-2-BLOCOS-001: turno com os 3 marcadores (📊/🕳️/➡️) ganha `t.blocos` — o HTML
  // segue vindo só do CORPO (sem os blocos), o front desenha os cartões separados.
  // RV-4-CAMINHOS-001: caminho de arquivo citado na prosa vira link clicável no front
  // (a rota /api/documentos/abrir é quem confirma/recusa — aqui só reconhece a FORMA).
  for (const t of turnos) if (t.papel === "agente" && t.texto) {
    const blocos = separarBlocos(t.texto);
    if (blocos) {
      t.blocos = blocos;
      t.html = renderCorpo(blocos.corpo).blocos.map((b) => b.html).join("");
      t.leigo = traduzirParaLeigo(blocos, lerVocabParaLeigo());
    } else t.html = renderCorpo(t.texto).blocos.map((b) => b.html).join("");
    const caminhos = extrairCaminhos(t.texto);
    if (caminhos.length) t.caminhos = caminhos;
  }
  return { ok: true, fonte, sessao: basename(fonte, ".jsonl"), total_linhas: linhas.length, total_turnos: turnos.length, turnos: turnos.slice(-n), medidoEm: agora };
}

/** Sentinela da VPS (scripts/health-check-service.ts → ~/.egos/vps-sentinela.json). ⚪ dito se não há arquivo. */
function lerVpsSentinela(): string {
  try {
    const caminho = join(process.env.HOME ?? "", ".egos", "vps-sentinela.json");
    const d = JSON.parse(readFileSync(caminho, "utf-8")) as { veredito?: string; medidoEm?: string; caidos?: string[] };
    const caidos = Array.isArray(d.caidos) ? d.caidos : [];
    const hora = d.medidoEm ? new Date(d.medidoEm).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "⚪";
    const idadeMin = d.medidoEm ? Math.round((Date.now() - Date.parse(d.medidoEm)) / 60000) : NaN;
    const velho = Number.isFinite(idadeMin) && idadeMin > 90 ? ` · ⚪ ${idadeMin} min sem medir` : "";
    return `VPS: ${d.veredito ?? "⚪"} · ${caidos.length} serviços caído(s)${caidos.length ? " (" + caidos.join(", ") + ")" : ""} · medido às ${hora}${velho}`;
  } catch {
    return "VPS: ⚪ sentinela sem medição (~/.egos/vps-sentinela.json ausente)";
  }
}
