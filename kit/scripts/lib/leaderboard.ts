/**
 * leaderboard.ts — pontos REAIS por commit (nunca inventados), com faixas.
 *
 * Pontos = 1 por commit no repo, na janela de dias pedida (default 7). Sem
 * peso por tamanho de diff, sem heurística de "qualidade" — commit é o único
 * evento que o git prova sem ambiguidade (=P1, nada aqui é estimado).
 *
 * Faixas: ADOPT de um produto irmão desta casa (gamification.ts)
 * `getRank()` — a lógica de corte por `minPoints` é a mesma; os NOMES do
 * original são temáticos de polícia (Recruta/Agente/Investigador/Inspetor/
 * Delegado/Comissário), acoplados àquele produto. Como pedido ("copie só a
 * função de faixas e declare" quando o tema não serve), os limiares e ícones
 * sobrevivem e os nomes foram trocados por vocabulário neutro.
 *
 * Autor "t" (config git deste kernel, ver `git config user.name`) e qualquer
 * nome batendo em /agent|bot|claude|codex/i não são pessoa — entram no balde
 * "🤖 agentes" (corte do pedido: "autor 't' e agentes contam como
 * '🤖 agentes'").
 */
import { existsSync, readFileSync } from "node:fs";
// GIT-FIXTURE-HOOK-CONSERTO-001 (06/09): `git -C repo` ainda obedece GIT_DIR herdado de hook/worktree —
// o placar leria o repo errado. Spawn nasce sem GIT_*.
const ENV_SEM_GIT: Record<string, string> = Object.fromEntries(
  Object.entries(process.env).filter(([k, v]) => !k.startsWith("GIT_") && v !== undefined),
) as Record<string, string>;

export interface Faixa {
  nome: string;
  minPontos: number;
  icone: string;
}

// Limiares e ícones herdados de RANKS do produto irmão; nomes neutros.
export const FAIXAS: Faixa[] = [
  { nome: "Iniciante", minPontos: 0, icone: "🔰" },
  { nome: "Contribuidor", minPontos: 10, icone: "🔵" },
  { nome: "Ativo", minPontos: 50, icone: "🟢" },
  { nome: "Motor", minPontos: 150, icone: "🟣" },
  { nome: "Pilar", minPontos: 500, icone: "🟡" },
  { nome: "Lenda", minPontos: 1000, icone: "🔴" },
];

export function faixaDe(pontos: number): Faixa {
  let atual = FAIXAS[0];
  for (const f of FAIXAS) if (pontos >= f.minPontos) atual = f;
  return atual;
}

const EH_AGENTE = /^t$|agent|bot|claude|codex/i;

export interface LinhaLeaderboard {
  pessoa: string;
  pontos: number;
  faixa: string;
  icone: string;
  ultimaContribuicao: string;
}

/** Lê `config/leaderboard-aliases.json` se existir; nunca falha alto (=R13). */
export function lerAliases(caminho: string): Record<string, string> {
  if (!existsSync(caminho)) return {};
  try {
    const j = JSON.parse(readFileSync(caminho, "utf-8"));
    return typeof j === "object" && j ? j : {};
  } catch {
    return {};
  }
}

/** git log do repo na janela; nunca lança — repo inacessível vira lista vazia (=R13). */
export function commitsDoRepo(repoPath: string, dias: number, git = spawnGitLog): { autor: string; data: string }[] {
  if (!existsSync(repoPath)) return [];
  const saida = git(repoPath, dias);
  if (!saida) return [];
  return saida
    .split("\n")
    .filter(Boolean)
    .map((linha) => {
      const i = linha.indexOf("|");
      return i === -1 ? { autor: linha, data: "" } : { autor: linha.slice(0, i), data: linha.slice(i + 1) };
    });
}

function spawnGitLog(repoPath: string, dias: number): string | null {
  try {
    const proc = Bun.spawnSync(["git", "log", `--since=${dias}.days`, "--format=%an|%aI"], { env: ENV_SEM_GIT,
      cwd: repoPath,
      stdout: "pipe",
      stderr: "pipe",
    });
    if (proc.exitCode !== 0) return null;
    return proc.stdout.toString("utf-8");
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// PLACAR-FEDERACAO-001 — placar "transferência" (fatia de NO-ZERO-APPS-FEDERADOS-001)
//
// O placar de commits acima pontua VOLUME (1 commit = 1 ponto) e por isso é
// vulnerável a Goodhart: commit picado pontua igual a commit que ensina. Este
// segundo placar, separado e paralelo, pontua o que a pessoa ENSINOU/ENTREGOU
// — nunca substitui o de cima, os dois convivem.
//
// RÉGUA (determinística, sem rede, decidida aqui — mude só por corte humano):
// um commit conta 1 ponto de "transferência" quando QUALQUER uma bate:
//   (a) o assunto (1ª linha da mensagem) começa com "docs(" — documentação
//       é, por definição, ensinar algo a quem lê depois;
//   (b) o assunto começa com "feat(" e cita "golden" (case-insensitive) em
//       algum ponto da própria linha — feature que já chega com golden
//       citado prova que o autor deixou a prova andando, não só o código;
//   (c) o commit toca um arquivo cujo nome bate README (qualquer caixa) ou
//       contém "onboarding" no caminho — tocar a porta de entrada de quem
//       chega depois é a forma mais direta de "ensinar".
// Cada commit conta no máximo 1 ponto de transferência (não soma por regra
// batida 2x). Ordem de entrada dos repos/commits não altera o resultado
// (o acumulador é por pessoa, comutativo).
// ---------------------------------------------------------------------------

const RE_DOCS_SUBJECT = /^docs\(/;
const RE_FEAT_COM_GOLDEN = /^feat\(.*golden/i;
const RE_README_OU_ONBOARDING = /(^|\/)readme\.md$|onboarding/i;

export interface CommitTransferencia {
  autor: string;
  data: string;
  assunto: string;
  arquivos: string[];
}

/** git log com assunto + arquivos tocados, delimitado por \x1e (registro) e \x1f (campo). Nunca lança. */
function spawnGitLogTransferencia(repoPath: string, dias: number): string | null {
  try {
    const proc = Bun.spawnSync(
      [
        "git",
        "log",
        `--since=${dias}.days`,
        "--name-only",
        "--format=\x1eAUTOR=%an\x1fDATA=%aI\x1fSUBJECT=%s",
      ],
      { env: ENV_SEM_GIT, cwd: repoPath, stdout: "pipe", stderr: "pipe" },
    );
    if (proc.exitCode !== 0) return null;
    return proc.stdout.toString("utf-8");
  } catch {
    return null;
  }
}

function parseAutorDataSubject(cabecalho: string): { autor: string; data: string; assunto: string } {
  const campos = cabecalho.split("\x1f");
  let autor = "";
  let data = "";
  let assunto = "";
  for (const campo of campos) {
    if (campo.startsWith("AUTOR=")) autor = campo.slice("AUTOR=".length);
    else if (campo.startsWith("DATA=")) data = campo.slice("DATA=".length);
    else if (campo.startsWith("SUBJECT=")) assunto = campo.slice("SUBJECT=".length);
  }
  return { autor, data, assunto };
}

/** Lê `git log --name-only` estruturado por commit; repo inacessível vira lista vazia (=R13). */
export function commitsTransferenciaDoRepo(
  repoPath: string,
  dias: number,
  git = spawnGitLogTransferencia,
): CommitTransferencia[] {
  if (!existsSync(repoPath)) return [];
  const saida = git(repoPath, dias);
  if (!saida) return [];
  return saida
    .split("\x1e")
    .map((bloco) => bloco.trim())
    .filter(Boolean)
    .map((bloco) => {
      const linhas = bloco.split("\n");
      const { autor, data, assunto } = parseAutorDataSubject(linhas[0] ?? "");
      const arquivos = linhas.slice(1).map((l) => l.trim()).filter(Boolean);
      return { autor, data, assunto, arquivos };
    });
}

/** Régua determinística de "transferência" — 1 commit bate 0 ou 1, nunca soma por regra múltipla. */
export function commitEhTransferencia(c: { assunto: string; arquivos: string[] }): boolean {
  if (RE_DOCS_SUBJECT.test(c.assunto)) return true;
  if (RE_FEAT_COM_GOLDEN.test(c.assunto)) return true;
  if (c.arquivos.some((a) => RE_README_OU_ONBOARDING.test(a))) return true;
  return false;
}

export interface LinhaPlacarTransferencia {
  pessoa: string;
  pontos: number;
  faixa: string;
  icone: string;
  ultimaContribuicao: string;
}

/**
 * Placar novo e separado: pontua só commits que bateram a régua de
 * transferência acima. Não altera nem consome `montarLeaderboard` — os dois
 * são exportados lado a lado e o chamador decide quem exibe o quê.
 */
export function montarPlacarTransferencia(
  repos: string[],
  opts: { dias?: number; aliases?: Record<string, string>; git?: (repoPath: string, dias: number) => string | null } = {},
): LinhaPlacarTransferencia[] {
  const dias = opts.dias ?? 7;
  const aliases = opts.aliases ?? {};
  const acumulado = new Map<string, { pontos: number; ultima: string }>();
  for (const repo of repos) {
    for (const c of commitsTransferenciaDoRepo(repo, dias, opts.git ?? spawnGitLogTransferencia)) {
      if (!commitEhTransferencia(c)) continue;
      const pessoa = EH_AGENTE.test(c.autor) ? "🤖 agentes" : (aliases[c.autor] ?? c.autor);
      const atual = acumulado.get(pessoa) ?? { pontos: 0, ultima: "" };
      atual.pontos += 1;
      if (c.data && c.data > atual.ultima) atual.ultima = c.data;
      acumulado.set(pessoa, atual);
    }
  }
  return [...acumulado.entries()]
    .map(([pessoa, v]) => {
      const f = faixaDe(v.pontos);
      return { pessoa, pontos: v.pontos, faixa: f.nome, icone: f.icone, ultimaContribuicao: v.ultima || "⚪" };
    })
    .sort((a, b) => b.pontos - a.pontos || a.pessoa.localeCompare(b.pessoa))
    .slice(0, 10);
}

/** Motor puro e testável: recebe os repos e devolve o top 10, determinístico. */
export function montarLeaderboard(
  repos: string[],
  opts: { dias?: number; aliases?: Record<string, string>; git?: (repoPath: string, dias: number) => string | null } = {},
): LinhaLeaderboard[] {
  const dias = opts.dias ?? 7;
  const aliases = opts.aliases ?? {};
  const acumulado = new Map<string, { pontos: number; ultima: string }>();
  for (const repo of repos) {
    for (const { autor, data } of commitsDoRepo(repo, dias, opts.git ?? spawnGitLog)) {
      const pessoa = EH_AGENTE.test(autor) ? "🤖 agentes" : (aliases[autor] ?? autor);
      const atual = acumulado.get(pessoa) ?? { pontos: 0, ultima: "" };
      atual.pontos += 1;
      if (data && data > atual.ultima) atual.ultima = data;
      acumulado.set(pessoa, atual);
    }
  }
  return [...acumulado.entries()]
    .map(([pessoa, v]) => {
      const f = faixaDe(v.pontos);
      return { pessoa, pontos: v.pontos, faixa: f.nome, icone: f.icone, ultimaContribuicao: v.ultima || "⚪" };
    })
    .sort((a, b) => b.pontos - a.pontos || a.pessoa.localeCompare(b.pessoa))
    .slice(0, 10);
}
