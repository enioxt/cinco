/**
 * rotas-app4.ts — REFATORACAO-ORGANICA-001 (04/09): extraído de orquestra-viva.ts.
 * Os 4 blocos do EGOS App (EGOS-APP-4BLOCOS-001): gerar apresentação (.md → .html),
 * Banda no App (2ª opinião via scripts/banda.ts), observabilidade e Guard Brasil, mais
 * o leaderboard (commits reais dos últimos 7 dias). Zero mudança de comportamento — só
 * onde o código mora.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { lerAliases, montarLeaderboard } from "../lib/leaderboard";
import { lerPerfil, resolverRepos } from "../lib/perfil";
import { REPO_DIR, ultimaMedicaoPulse } from "./nucleo";

// ── BLOCO 1: GERAR APRESENTAÇÃO (EGOS-APP-4BLOCOS-001, corte Enio 02/09) ──────────────
// Lista .md de docs/presentations/ e docs/jobs/ (30 mais recentes por data), e gera o
// par .html via scripts/md-para-html.ts --cebola (ADOPT — o motor já existia, aqui só
// se aponta o botão pra ele). Caminho é validado DENTRO do repo antes de rodar nada —
// ".." ou caminho absoluto fora da árvore = 400, nunca chega a spawnar processo.
export function listarMdRecentes(): { caminho: string; mtime: string }[] {
  const pastas = [join(REPO_DIR, "docs", "presentations"), join(REPO_DIR, "docs", "jobs")];
  const achados: { caminho: string; mtime: string; ms: number }[] = [];
  for (const pasta of pastas) {
    if (!existsSync(pasta)) continue;
    for (const f of readdirSync(pasta)) {
      if (!f.endsWith(".md")) continue;
      const caminhoAbs = join(pasta, f);
      try {
        const st = statSync(caminhoAbs);
        if (!st.isFile()) continue;
        achados.push({ caminho: caminhoAbs.slice(REPO_DIR.length + 1), mtime: new Date(st.mtimeMs).toISOString(), ms: st.mtimeMs });
      } catch { /* ilegível — pula, não derruba a lista */ }
    }
  }
  return achados.sort((a, b) => b.ms - a.ms).slice(0, 30).map(({ caminho, mtime }) => ({ caminho, mtime }));
}

/** Verdadeiro só se `caminhoRelativo` resolve DENTRO do repo — barra "../" e absoluto fora. */
export function caminhoDentroDoRepo(caminhoRelativo: string): string | null {
  if (!caminhoRelativo || caminhoRelativo.includes("\0")) return null;
  const alvo = resolve(REPO_DIR, caminhoRelativo);
  if (alvo !== REPO_DIR && !alvo.startsWith(REPO_DIR + "/")) return null;
  return alvo;
}

export async function tratarGerarHtml(req: Request): Promise<Response> {
  let corpo: { md?: string };
  try { corpo = await req.json(); } catch { return Response.json({ ok: false, erro: "corpo não é JSON" }, { status: 400 }); }
  const md = (corpo.md ?? "").trim();
  if (!md.endsWith(".md")) return Response.json({ ok: false, erro: "md precisa terminar em .md" }, { status: 400 });
  const alvo = caminhoDentroDoRepo(md);
  if (!alvo) return Response.json({ ok: false, erro: `caminho fora do repo recusado: ${md}` }, { status: 400 });
  if (!existsSync(alvo)) return Response.json({ ok: false, erro: `não existe: ${md}` }, { status: 400 });
  try {
    const proc = Bun.spawnSync([process.execPath, join(REPO_DIR, "scripts", "md-para-html.ts"), alvo, "--cebola"], {
      cwd: REPO_DIR,
      stdout: "pipe",
      stderr: "pipe",
    });
    const htmlPath = alvo.replace(/\.md$/, ".html");
    if (proc.exitCode !== 0 || !existsSync(htmlPath)) {
      return Response.json({ ok: false, erro: `md-para-html.ts falhou (exit ${proc.exitCode}): ${proc.stderr.toString("utf-8").slice(0, 800)}` }, { status: 500 });
    }
    const st = statSync(htmlPath);
    const idadeMin = Math.round((Date.now() - st.mtimeMs) / 60000);
    return Response.json({ ok: true, html: htmlPath.slice(REPO_DIR.length + 1), idadeMin });
  } catch (e) {
    return Response.json({ ok: false, erro: `exceção rodando o motor: ${e instanceof Error ? e.message : String(e)}` }, { status: 500 });
  }
}

// ── BANDA NO APP (BANDA-NO-APP-001, corte Enio 02/09 "empacotando em produtos; botões
// simples, complexidade por baixo") — spawna o motor real (scripts/banda.ts), nunca
// reimplementa a Banda; por padrão roda em --dry (ensaio, sem chamar LLM/gastar) e só
// dispara de verdade quando o corpo pede dry:false explicitamente. ────────────────────
const BANDA_TS = join(REPO_DIR, "scripts", "banda.ts");
const BANDA_QUESTAO_MAX = 4000;
const BANDA_CONTEXTO_MAX = 8000;
const BANDA_TIMEOUT_DRY_MS = 20_000;
const BANDA_TIMEOUT_REAL_MS = 180_000;
const BANDA_DIR = join(REPO_DIR, "docs", "banda");

/** Mesmo padrão de validação que tratarGerarHtml/caminhoDentroDoRepo usa, restrito a docs/banda/. */
export function caminhoDentroDeBanda(caminho: string): string | null {
  const alvo = caminhoDentroDoRepo(caminho);
  if (!alvo) return null;
  if (alvo !== BANDA_DIR && !alvo.startsWith(BANDA_DIR + "/")) return null;
  return alvo;
}

export async function tratarBanda(req: Request): Promise<Response> {
  let corpo: { questao?: unknown; contexto?: unknown; dry?: unknown };
  try {
    corpo = await req.json();
  } catch {
    return Response.json({ ok: false, erro: "corpo não é JSON" }, { status: 400 });
  }
  const questao = typeof corpo.questao === "string" ? corpo.questao.trim() : "";
  if (!questao) return Response.json({ ok: false, erro: "questao vazia" }, { status: 400 });
  if (questao.length > BANDA_QUESTAO_MAX) {
    return Response.json({ ok: false, erro: `questao acima do máximo de ${BANDA_QUESTAO_MAX} caracteres` }, { status: 400 });
  }
  const contexto = typeof corpo.contexto === "string" ? corpo.contexto.trim() : "";
  if (contexto.length > BANDA_CONTEXTO_MAX) {
    return Response.json({ ok: false, erro: `contexto acima do máximo de ${BANDA_CONTEXTO_MAX} caracteres` }, { status: 400 });
  }
  // Default é ENSAIO — só roda de verdade (gastando) se o corpo pedir dry:false por escrito.
  const dry = corpo.dry !== false;

  const args = [BANDA_TS, "--question", questao, "--json"];
  if (contexto) args.push("--context", contexto);
  if (dry) args.push("--dry");

  try {
    // EGOS_HOME forçado a REPO_DIR: sem isso o banda.ts resolve a raiz por env ambiente
    // (pode divergir do REPO_DIR do servidor, ex: symlink ~/egos apontando pro checkout
    // principal enquanto o servidor roda num worktree) e o trace nasce fora do que este
    // servidor considera "docs/banda/" — caminhoDentroDeBanda rejeitaria com razão.
    const proc = Bun.spawn([process.execPath, ...args], {
      cwd: REPO_DIR,
      env: { ...process.env, EGOS_HOME: REPO_DIR },
      stdout: "pipe",
      stderr: "pipe",
    });
    const timer = setTimeout(() => { try { proc.kill(); } catch { /* já morreu */ } }, dry ? BANDA_TIMEOUT_DRY_MS : BANDA_TIMEOUT_REAL_MS);
    const out = await new Response(proc.stdout).text();
    const err = (await new Response(proc.stderr).text()).trim();
    const code = await proc.exited;
    clearTimeout(timer);
    if (code !== 0) {
      return Response.json({ ok: false, erro: err || `banda.ts saiu com código ${code}`, dry }, { status: 500 });
    }
    const m = out.match(/===BANDA_JSON_START===\s*([\s\S]*?)\s*===BANDA_JSON_END===/);
    if (!m) {
      return Response.json({ ok: false, erro: "banda.ts não devolveu JSON estruturado (===BANDA_JSON_START/END===)", dry }, { status: 500 });
    }
    let payload: { maestro?: unknown; trace_path?: unknown };
    try {
      payload = JSON.parse(m[1]);
    } catch (e) {
      return Response.json({ ok: false, erro: `JSON da banda inválido: ${e instanceof Error ? e.message : String(e)}`, dry }, { status: 500 });
    }
    let sintese = typeof payload.maestro === "string" ? payload.maestro.trim() : "";
    // --dry devolve texto simulado ("# DRY-RUN output for ...") — não é síntese de verdade,
    // avisamos em vez de fingir que os 4 papéis debateram algo.
    if (dry && (!sintese || /^# DRY-RUN output/.test(sintese))) sintese = "⚪ ensaio: sem síntese";
    const tracePathBruto = typeof payload.trace_path === "string" ? payload.trace_path : "";
    const traceAbs = caminhoDentroDeBanda(tracePathBruto);
    const trace = traceAbs ? traceAbs.slice(REPO_DIR.length + 1) : null;
    const custo_estimado = dry
      ? "US$ 0,00 (ensaio, nenhuma LLM foi chamada)"
      : "US$ 0,03–0,07 (estimativa; ver docs/banda/*.yaml para o custo real)";
    return Response.json({ ok: true, sintese, trace, custo_estimado, dry });
  } catch (e) {
    return Response.json({ ok: false, erro: `exceção rodando o motor: ${e instanceof Error ? e.message : String(e)}`, dry }, { status: 500 });
  }
}

// ── BLOCO 2: OBSERVABILIDADE (EGOS-APP-4BLOCOS-001) ───────────────────────────────────
// Motor `scripts/observabilidade.ts` está sendo escrito por outro braço em paralelo —
// se ainda não existir no disco, o bloco reporta ⚪ NÃO-MEDIDO com o comando esperado,
// nunca inventa números (=R13-c). Pulse e mycelium reaproveitam medidores já existentes
// (ultimaMedicaoPulse, mtime do snapshot) — ADOPT, zero motor novo pra dado que já se mede.
const OBSERVABILIDADE_TS = join(REPO_DIR, "scripts", "observabilidade.ts");
const MYCELIUM_SNAPSHOT = join(REPO_DIR, "apps", "egos-landing", "public", "mycelium-snapshot.json");

export function idadeArquivoMin(caminho: string): number | null {
  if (!existsSync(caminho)) return null;
  try {
    return Math.round((Date.now() - statSync(caminho).mtimeMs) / 60000);
  } catch {
    return null;
  }
}

export async function montarObservabilidade(): Promise<Record<string, unknown>> {
  const agora = new Date().toISOString();
  const pulse = { ultimaMedicao: ultimaMedicaoPulse() };
  const myceliumIdadeMin = idadeArquivoMin(MYCELIUM_SNAPSHOT);
  if (!existsSync(OBSERVABILIDADE_TS)) {
    return {
      itens: [],
      erro: "⚪ NÃO-MEDIDO: scripts/observabilidade.ts ainda não existe neste disco — rode `bun scripts/observabilidade.ts --json` quando o motor chegar",
      comandoEsperado: "bun scripts/observabilidade.ts --json",
      pulse,
      myceliumIdadeMin,
      medidoEm: agora,
    };
  }
  try {
    const proc = Bun.spawnSync([process.execPath, OBSERVABILIDADE_TS, "--json"], { cwd: REPO_DIR, stdout: "pipe", stderr: "pipe" });
    // exit 1 do motor = "há item 🔴" (semáforo), não falha: só é ⚪ se o stdout não for JSON.
    const saida = proc.stdout.toString("utf-8");
    if (![0, 1].includes(proc.exitCode ?? -1) || !saida.trim().startsWith("{")) {
      return { itens: [], erro: `⚪ NÃO-MEDIDO: observabilidade.ts saiu com exit ${proc.exitCode}: ${proc.stderr.toString("utf-8").slice(0, 400)}`, pulse, myceliumIdadeMin, medidoEm: agora };
    }
    const json = JSON.parse(saida);
    return { ...json, pulse, myceliumIdadeMin, medidoEm: agora };
  } catch (e) {
    return { itens: [], erro: `⚪ NÃO-MEDIDO: falha lendo saída de observabilidade.ts (${e instanceof Error ? e.message : String(e)})`, pulse, myceliumIdadeMin, medidoEm: agora };
  }
}

// ── BLOCO 3: GUARD BRASIL (EGOS-APP-4BLOCOS-001) ──────────────────────────────────────
// Lê o HTML da apresentação flagship se já existir (outro braço está escrevendo em
// paralelo) — extrai título + até 3 números da seção "O que já funciona". Sonda ao vivo
// é opcional e desligável via env (EGOS_GUARD_SONDA_OFF=1), timeout curto, nunca lança.
const GUARD_BRASIL_HTML = join(REPO_DIR, "docs", "presentations", "2026-09-02_GUARD-BRASIL_flagship-o-que-temos-e-para-onde-vai.html");

export function extrairCardGuardBrasil(html: string): { titulo: string; numeros: string[] } {
  const tituloM = html.match(/<title>([^<]*)<\/title>/i);
  const bruto = tituloM ? tituloM[1].trim() : "";
  const titulo = bruto && bruto.toLowerCase() !== "documento" ? bruto : "Guard Brasil — o que temos e para onde vai";
  // Modo cebola: cada seção vira um card com <span class="cebola-numero">N</span>. Pegamos os números
  // dos cards a partir de "O que já funciona" (3 no máximo); fora do modo cebola, cai no texto da seção.
  const ini = html.search(/O que já funciona/i);
  const trecho = ini >= 0 ? html.slice(ini, ini + 6000) : html;
  const cebola = [...trecho.matchAll(/cebola-numero"[^>]*>\s*([^<\s][^<]{0,12}?)\s*</g)].map((m) => m[1].trim());
  const numeros = (cebola.length ? cebola : [...trecho.matchAll(/\b\d[\d.,]*%?\b/g)].map((m) => m[0])).slice(0, 3);
  return { titulo, numeros };
}

export async function sondaGuardBrasil(): Promise<"online" | "offline" | "desligada"> {
  if (process.env.EGOS_GUARD_SONDA_OFF === "1") return "desligada";
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 3000);
    const resp = await fetch(`${process.env.EGOS_GUARD_URL ?? "https://guard.egos.ia.br"}/health`, { signal: ctrl.signal });
    clearTimeout(timer);
    return resp.ok ? "online" : "offline";
  } catch {
    return "offline";
  }
}

export async function montarGuardBrasil(): Promise<Record<string, unknown>> {
  const agora = new Date().toISOString();
  const sonda = await sondaGuardBrasil();
  if (!existsSync(GUARD_BRASIL_HTML)) {
    return {
      card: null,
      erro: `⚪ NÃO-MEDIDO: ${GUARD_BRASIL_HTML.slice(REPO_DIR.length + 1)} ainda não existe neste disco`,
      sonda,
      medidoEm: agora,
    };
  }
  try {
    const html = readFileSync(GUARD_BRASIL_HTML, "utf-8");
    return { card: extrairCardGuardBrasil(html), caminho: GUARD_BRASIL_HTML.slice(REPO_DIR.length + 1), sonda, medidoEm: agora };
  } catch (e) {
    return { card: null, erro: `⚪ NÃO-MEDIDO: falha lendo o html (${e instanceof Error ? e.message : String(e)})`, sonda, medidoEm: agora };
  }
}

// ── BLOCO 4: LEADERBOARD (EGOS-APP-4BLOCOS-001) ───────────────────────────────────────
// Pontos = commits reais dos últimos 7 dias (scripts/lib/leaderboard.ts, testado e puro).
// Repos: perfil.repos (EGOS-APP-TEMPLATES-5-001 — os literais enio-dev/... viraram campo
// do perfil, resolvidos por scripts/lib/perfil.ts:resolverRepos). Aliases opcionais em
// config/leaderboard-aliases.json — se faltar, motor segue com {} (=R13, nunca lança).
const LEADERBOARD_ALIASES_JSON = join(REPO_DIR, "config", "leaderboard-aliases.json");

export async function montarLeaderboardApi(): Promise<Record<string, unknown>> {
  const repos = resolverRepos(lerPerfil(REPO_DIR).perfil.repos);
  const linhas = montarLeaderboard(repos, { dias: 7, aliases: lerAliases(LEADERBOARD_ALIASES_JSON) });
  return { top: linhas, geradoEm: new Date().toISOString() };
}
