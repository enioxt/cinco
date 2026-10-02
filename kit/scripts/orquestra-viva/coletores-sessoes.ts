/**
 * coletores-sessoes.ts — GET /api/sessoes (NOTIFICACOES-HISTORICO-NA-TELA-001, corte Enio
 * 14/09: "...mostrando todas as sessões ativas").
 *
 * Processos `claude`/`codex` VIVOS (via `ps`, pedido literal do Enio), nunca transcript —
 * é o inverso de session-registry.ts (aquele conta janelas ATIVAS por mtime de transcript
 * pra detectar colisão; este lista PROCESSOS pra mostrar na tela "o que está rodando agora").
 * session-registry.ts não é importado: é um script CLI com `process.exit()` no top-level —
 * importar dispararia o dispatch dele (=efeito colateral não pedido); a leitura de /proc que
 * ele já faz é replicada aqui em forma de função pura, testável com `ps` injetado.
 *
 * "braço" (item 2 do pedido): sessão cujo PROCESSO PAI também é claude/codex — mesmo padrão
 * que a tmux `egos-whatsapp` (outro braço, hoje em construção — aqui é SÓ LEITURA, nunca
 * escrita: `tmux has-session`, nada de `tmux kill`/`new-session`).
 *
 * papel/assunto: `sh scripts/sessao-ramo.sh --ler <session-id> --json` (PONTE-PAPEL-SEM-START-
 * 001) — session-id vem de `--session-id <uuid>` no argv (claude) ou `resume <uuid>` (codex),
 * nunca de `/proc/<pid>/environ` como 1ª tentativa (environ pode estar redigido/ausente por
 * política do host; argv é o que o processo de fato recebeu). ⚪ quando nenhum dos dois aparece
 * — nunca inventa papel.
 */
import { readFileSync, readlinkSync } from "node:fs";
import { join } from "node:path";
import { REPO_DIR } from "./nucleo";

export interface SessaoViva {
  pid: number;
  ppid: number;
  idadeSeg: number;
  cwd: string;
  motor: "claude" | "codex";
  sessionId: string | null;
  ehBraco: boolean;
  papel: string;
  assunto: string;
}

export interface RespostaSessoes {
  geradoEm: string;
  itens: SessaoViva[];
  pontesTmux: string[]; // sessões tmux conhecidas encontradas vivas (só leitura)
  fontes: Record<string, string>;
}

interface LinhaPs {
  pid: number;
  ppid: number;
  etimes: number;
  args: string;
}

/** `ps -eo pid,ppid,etimes,args --no-headers` puro texto → linhas tipadas. Pedaço isolado
 *  pra ser testável sem depender de processos reais na máquina que roda o golden. */
export function parsearPs(saida: string): LinhaPs[] {
  const linhas: LinhaPs[] = [];
  for (const l of saida.split("\n")) {
    const m = /^\s*(\d+)\s+(\d+)\s+(\d+)\s+(.*)$/.exec(l);
    if (!m) continue;
    linhas.push({ pid: Number(m[1]), ppid: Number(m[2]), etimes: Number(m[3]), args: m[4]! });
  }
  return linhas;
}

/** claude/codex de verdade — nunca o grep que procura por eles, nunca `-p`/`--print`
 *  (subprocesso headless, não é "sessão" pra esta tela; mesma exclusão de session-registry.ts). */
export function ehMotorDeSessao(args: string): "claude" | "codex" | null {
  if (/\b(grep|ps -eo|coletores-sessoes)\b/i.test(args)) return null;
  if (/(^|\s)-p(\s|$)|--print\b/.test(args)) return null;
  if (/\bclaude\b/i.test(args)) return "claude";
  if (/\bcodex\b/i.test(args)) return "codex";
  return null;
}

/** session-id do PRÓPRIO argv: `--session-id <uuid>` (claude) ou `resume <uuid>` (codex). */
export function sessionIdDoArgv(args: string): string | null {
  const uuid = "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}";
  const m = new RegExp(`--session-id[= ](${uuid})`).exec(args) ?? new RegExp(`\\bresume[= ](${uuid})`).exec(args);
  return m ? m[1]! : null;
}

/** Monta SessaoViva a partir das linhas de `ps` já parseadas — pura, testável sem /proc real.
 *  `cwdDe(pid)` e `papelDe(sessionId)` são injetados (I/O real fica em `sessoesVivas()`). */
export function montarSessoes(
  linhas: LinhaPs[],
  cwdDe: (pid: number) => string,
  papelDe: (sessionId: string) => { papel: string; assunto: string },
): SessaoViva[] {
  const porPid = new Map(linhas.map((l) => [l.pid, l]));
  const itens: SessaoViva[] = [];
  for (const l of linhas) {
    const motor = ehMotorDeSessao(l.args);
    if (!motor) continue;
    const pai = porPid.get(l.ppid);
    const ehBraco = pai !== undefined && ehMotorDeSessao(pai.args) !== null;
    const sessionId = sessionIdDoArgv(l.args);
    const { papel, assunto } = sessionId ? papelDe(sessionId) : { papel: "⚪", assunto: "⚪" };
    itens.push({
      pid: l.pid,
      ppid: l.ppid,
      idadeSeg: l.etimes,
      cwd: cwdDe(l.pid),
      motor,
      sessionId,
      ehBraco,
      papel,
      assunto,
    });
  }
  return itens.sort((a, b) => a.idadeSeg - b.idadeSeg); // mais nova primeiro
}

function cwdReal(pid: number): string {
  try {
    return readlinkSync(`/proc/${pid}/cwd`);
  } catch {
    return "⚪ NAO-MEDIDO: /proc indisponível ou sem permissão";
  }
}

/** `--ler` nunca lança, nunca exige repo git (lido no código de sessao-ramo.sh) — timeout
 *  curto porque isto roda dentro do orçamento de um GET de gaveta, não em background. */
function papelReal(sessionId: string): { papel: string; assunto: string } {
  try {
    const saida = Bun.spawnSync(
      ["sh", "scripts/sessao-ramo.sh", "--ler", sessionId, "--json"],
      { cwd: REPO_DIR, stdout: "pipe", stderr: "ignore", timeout: 2000 },
    );
    const texto = saida.stdout.toString("utf-8").trim();
    const j = texto ? JSON.parse(texto) : {};
    return {
      papel: typeof j.papel === "string" && j.papel ? j.papel : "⚪",
      assunto: typeof j.assunto === "string" && j.assunto ? j.assunto : "⚪",
    };
  } catch {
    return { papel: "⚪", assunto: "⚪" };
  }
}

/** Leitura, nunca escrita (item 2 do pedido: "outro braço está criando: só leia"). */
function tmuxSessoesConhecidas(): string[] {
  const conhecidas = ["egos-whatsapp"];
  const vivas: string[] = [];
  for (const nome of conhecidas) {
    try {
      const r = Bun.spawnSync(["tmux", "has-session", "-t", nome], { stdout: "ignore", stderr: "ignore", timeout: 1000 });
      if (r.exitCode === 0) vivas.push(nome);
    } catch {
      // tmux ausente/indisponível — não é erro, é ⚪ silencioso aqui (fontes.tmux relata)
    }
  }
  return vivas;
}

function psReal(): { linhas: LinhaPs[]; status: string } {
  try {
    const r = Bun.spawnSync(["ps", "-eo", "pid,ppid,etimes,args", "--no-headers"], { stdout: "pipe", stderr: "pipe", timeout: 3000 });
    if (r.exitCode !== 0) return { linhas: [], status: `⚪ NAO-MEDIDO: ps saiu ${r.exitCode} (${r.stderr.toString("utf-8").slice(0, 200)})` };
    return { linhas: parsearPs(r.stdout.toString("utf-8")), status: "ok" };
  } catch (e) {
    return { linhas: [], status: `⚪ NAO-MEDIDO: ps indisponível (${(e as Error).message})` };
  }
}

export function montarSessoesVivas(): RespostaSessoes {
  const { linhas, status } = psReal();
  const itens = montarSessoes(linhas, cwdReal, papelReal);
  let tmuxStatus = "ok";
  let pontesTmux: string[] = [];
  try {
    pontesTmux = tmuxSessoesConhecidas();
  } catch (e) {
    tmuxStatus = `⚪ NAO-MEDIDO: tmux ilegível (${(e as Error).message})`;
  }
  return {
    geradoEm: new Date().toISOString(),
    itens,
    pontesTmux,
    fontes: { ps: status, tmux: tmuxStatus },
  };
}
