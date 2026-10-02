/**
 * rotas-documentos.ts — HISTORICO-DOCUMENTOS-001 (corte Enio 05/09: "no EGOS APP deve ir
 * mostrando o histórico completo de documentos .md, .html, .pdf criados, para eu acessar
 * facilmente todos eles, sem precisar ficar navegando em várias pastas"). Varre raízes
 * DECLARADAS do disco local (nunca a máquina inteira), devolve o índice ordenado por
 * mtime e abre o arquivo com `xdg-open` — dado soberano: a rota só LISTA e ABRE
 * localmente, nada sai da máquina (=P4).
 *
 * ARQUIVO NOVO — não editado por nenhum outro braço nesta sessão. Módulo isolado,
 * zero import de orquestra-viva.ts (evita colisão com quem edita o roteador agora).
 *
 * INTEGRAÇÃO (Prime cola em scripts/orquestra-viva.ts, fora deste arquivo):
 *   1) import: `import { montarDocumentosApi, montarRaizesApi, tratarAbrirDocumento } from "./orquestra-viva/rotas-documentos";`
 *   2) no roteador (junto dos outros `if (url.pathname === ...)`, antes do 404 final):
 *      if (url.pathname === "/api/documentos" && req.method === "GET") return Response.json(await montarDocumentosApi(url.searchParams));
 *      if (url.pathname === "/api/documentos/raizes" && req.method === "GET") return Response.json(montarRaizesApi());
 *      if (url.pathname === "/api/documentos/abrir" && req.method === "POST") return tratarAbrirDocumento(req);
 *   3) em REDE_PRIMEIRO (dentro de SW_JS, no mesmo arquivo): acrescentar `documentos` à
 *      regex — é rota de DADO, nunca cache-primeiro (=R13-c).
 */
import { existsSync, readdirSync, readFileSync, realpathSync, statSync } from "node:fs";
import { mapaDeEstados, type EstadoResolvido } from "./rotas-documento-vivo";
import { basename, dirname, extname, join, relative } from "node:path";
import { resolverCaminhoPerfil } from "../lib/perfil";
import { REPO_DIR } from "./nucleo";

// ── RAÍZES DECLARADAS ────────────────────────────────────────────────────────────────
export interface RaizDeclarada {
  id: string;
  caminho: string;
  /** subcaminhos absolutos excluídos da varredura desta raiz (ex.: docs/jobs é log de job,
   *  não "documento criado para ler" — medido no corte de origem). */
  excluir: string[];
}

const ENV_RAIZES = "EGOS_DOCS_RAIZES";
const EXTENSOES_ACEITAS: Record<string, string> = { ".md": "md", ".html": "html", ".htm": "html", ".pdf": "pdf" };
const PROFUNDIDADE_MAX = 6;
const TETO_ARQUIVOS = 5000;
const CACHE_MS = 60_000;

function expandirTil(caminho: string): string {
  const home = process.env.HOME ?? "";
  if (caminho === "~") return home;
  if (caminho.startsWith("~/")) return join(home, caminho.slice(2));
  return caminho;
}

function raizesPadrao(repoDir: string): RaizDeclarada[] {
  const home = process.env.HOME ?? "";
  const docsDir = join(repoDir, "docs");
  return [
    // docs/jobs = log de job (não "documento criado para ler"); docs/_current_handoffs =
    // ledger de sessão, não documento navegável (medição do corte de origem, 05/09).
    { id: "docs", caminho: docsDir, excluir: [join(docsDir, "jobs"), join(docsDir, "_current_handoffs")] },
    { id: "consulting", caminho: join(repoDir, "consulting"), excluir: [] },
    { id: "relatorios", caminho: join(home, ".egos", "relatorios"), excluir: [] },
    // ~/.egos/analises = análises de terceiro (projeto de sócio/cliente lido em cópia local, fora
    // do git). Corte Enio 14/09: "tudo que avançamos deveria estar sendo me oferecido na tela" —
    // as entregas do dia viviam aqui e a gaveta as recusava como "fora das raízes".
    { id: "analises", caminho: join(home, ".egos", "analises"), excluir: [] },
    { id: "downloads", caminho: join(home, "Downloads"), excluir: [] },
  ];
}

/** Lê `documentos.raizes` do perfil ativo SEM passar pelo tipo `Perfil` (que não declara
 *  esse campo hoje — normalizarPerfil() descartaria em silêncio). Leitura crua, tolerante
 *  a ausência/JSON inválido (=R13: nunca lança). */
function raizesDoPerfil(repoDir: string): string[] {
  try {
    const { caminho } = resolverCaminhoPerfil(repoDir);
    const bruto = JSON.parse(readFileSync(caminho, "utf-8")) as { documentos?: { raizes?: unknown } };
    const raizes = bruto?.documentos?.raizes;
    if (!Array.isArray(raizes)) return [];
    return raizes.filter((x): x is string => typeof x === "string" && x.trim() !== "");
  } catch {
    return [];
  }
}

function raizesDeLista(lista: string[]): RaizDeclarada[] {
  return lista.map((p, idx) => {
    const abs = expandirTil(p.trim());
    return { id: basename(abs) || `raiz${idx}`, caminho: abs, excluir: [] };
  });
}

/** Ordem: EGOS_DOCS_RAIZES (csv) → perfil.documentos.raizes → padrão do módulo. */
export function resolverRaizesDeclaradas(repoDir: string = REPO_DIR): RaizDeclarada[] {
  const csv = (process.env[ENV_RAIZES] ?? "").trim();
  if (csv) return raizesDeLista(csv.split(","));
  const doPerfil = raizesDoPerfil(repoDir);
  if (doPerfil.length) return raizesDeLista(doPerfil);
  return raizesPadrao(repoDir);
}

// ── VARREDURA ─────────────────────────────────────────────────────────────────────────
interface ItemBruto {
  caminhoAbs: string;
  nome: string;
  tipo: string;
  raizId: string;
  mtimeMs: number;
  tamanho: number;
}

function dentroDeExclusao(caminho: string, excluir: string[]): boolean {
  return excluir.some((ex) => caminho === ex || caminho.startsWith(ex + "/"));
}

function caminharRaiz(raiz: RaizDeclarada, contador: { n: number }, saida: ItemBruto[]): void {
  if (!existsSync(raiz.caminho)) return;
  const pilha: { dir: string; prof: number }[] = [{ dir: raiz.caminho, prof: 0 }];
  while (pilha.length) {
    if (contador.n >= TETO_ARQUIVOS) return;
    const atual = pilha.pop();
    if (!atual) break;
    const { dir, prof } = atual;
    if (dentroDeExclusao(dir, raiz.excluir)) continue;
    let entradas: import("node:fs").Dirent[];
    try {
      entradas = readdirSync(dir, { withFileTypes: true });
    } catch {
      continue; // pasta ilegível — pula, não derruba a varredura inteira (=R13)
    }
    for (const ent of entradas) {
      if (contador.n >= TETO_ARQUIVOS) return;
      if (ent.isSymbolicLink()) continue; // NUNCA segue symlink
      const caminhoAbs = join(dir, ent.name);
      if (ent.isDirectory()) {
        if (ent.name === "node_modules" || ent.name === ".git") continue;
        if (prof + 1 > PROFUNDIDADE_MAX) continue;
        if (dentroDeExclusao(caminhoAbs, raiz.excluir)) continue;
        pilha.push({ dir: caminhoAbs, prof: prof + 1 });
        continue;
      }
      if (!ent.isFile()) continue;
      const tipo = EXTENSOES_ACEITAS[extname(ent.name).toLowerCase()];
      if (!tipo) continue;
      let st;
      try {
        st = statSync(caminhoAbs);
      } catch {
        continue;
      }
      saida.push({ caminhoAbs, nome: ent.name, tipo, raizId: raiz.id, mtimeMs: st.mtimeMs, tamanho: st.size });
      contador.n++;
    }
  }
}

// ── ORIGEM (🧑/🤖/⚪) — git log, memoizado por diretório (=R-NO-SILENT-FAIL: nunca lança) ──
// PERF-DOCUMENTOS-DOWNLOADS-001 (medido 05/09, corte de escopo declarado — não é o Enio
// quem escreve "documentos" em ~/Downloads, é a rede/o navegador; a distinção 🧑/🤖 não
// tem sinal ali, e a raiz mede ~1.700 .md/.html/.pdf com ~420 sentados dentro de clones
// git de terceiros — 1 `git log` por arquivo estourou >120s na 1ª GET real, medido com
// curl -w %{time_total}, nunca terminou dentro do teto de 3s pedido). Downloads sempre
// "⚪" (dito, nunca inferido calado — =R13-c); as demais raízes mantêm o git log real.
const RAIZ_ORIGEM_IGNORADA = new Set(["downloads"]);
// Timeout por spawn como backstop de defesa-em-profundidade (=R13): mesmo fora de
// "downloads", um repo de terceiro com histórico patológico não pode travar a rota inteira.
const TIMEOUT_GIT_MS = 300;
const cacheGitToplevel = new Map<string, string | null>();

/** git assíncrono (Bun.spawn, nunca spawnSync) com timeout manual via AbortController —
 *  200 spawns SÍNCRONOS mediram 18,6s numa página real (n=200, curl -w %{time_total});
 *  os mesmos 200 EM PARALELO medem ~230ms (medição isolada, ver relatório). O custo por
 *  processo não muda — é I/O-bound e paralelizável; só o SERIAL era o defeito. */
async function gitAsync(args: string[], cwd?: string): Promise<{ ok: boolean; stdout: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_GIT_MS);
  try {
    const proc = Bun.spawn(["git", ...args], { cwd, stdout: "pipe", stderr: "pipe", signal: controller.signal });
    const stdout = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;
    return { ok: exitCode === 0, stdout };
  } catch {
    return { ok: false, stdout: "" }; // abort (timeout) ou spawn falhou — nunca lança (=R13)
  } finally {
    clearTimeout(timer);
  }
}

async function gitToplevelDe(dir: string): Promise<string | null> {
  const cacheado = cacheGitToplevel.get(dir);
  if (cacheado !== undefined) return cacheado;
  const r = await gitAsync(["-C", dir, "rev-parse", "--show-toplevel"]);
  const top = r.ok ? (r.stdout.trim() || null) : null;
  cacheGitToplevel.set(dir, top);
  return top;
}

async function origemDeArquivoSemCache(caminhoAbs: string, raizId: string): Promise<"🧑" | "🤖" | "⚪"> {
  if (RAIZ_ORIGEM_IGNORADA.has(raizId)) return "⚪"; // declarado: ver PERF-DOCUMENTOS-DOWNLOADS-001
  const top = await gitToplevelDe(dirname(caminhoAbs));
  if (!top) return "⚪"; // fora de git — origem não resolvível
  const rel = relative(top, caminhoAbs);
  const r = await gitAsync(["-C", top, "log", "-1", "--format=%an%n%b", "--", rel]);
  if (!r.ok) return "⚪";
  if (!r.stdout.trim()) return "⚪"; // git conhece o repo mas o arquivo nunca foi commitado
  return /claude/i.test(r.stdout) ? "🤖" : "🧑";
}

// PERF-DOCUMENTOS-GITLOG-001 (medido 05/09): a varredura completa pode ter milhares de
// itens (medido: 1.817 só em docs/ deste repo) — computar `git log` de TODOS a cada scan
// travou a 1ª GET por mais de 120s (curl -w %{time_total}, nunca terminou). O custo real
// não é da fronteira do disco (find nos mesmos 1.817 = 0,06s): é 1 processo `git log` por
// arquivo. Correção 1: origem é LAZY — a varredura devolve os itens sem origem calculada;
// quem serve a resposta resolve só os itens que de fato saem na página (n≤2000, default
// 200; o card da home pede n=1). Correção 2 (medida 05/09, ainda >18s no /api/documentos
// SEM ?n= — o default de 200 já bastava): os spawns rodam EM PARALELO (Promise.all com
// teto de concorrência), não em série. Memoizado por caminho (processo inteiro).
const cacheOrigemPorCaminho = new Map<string, "🧑" | "🤖" | "⚪">();
const CONCORRENCIA_ORIGEM = 64;

async function origemDeArquivo(caminhoAbs: string, raizId: string): Promise<"🧑" | "🤖" | "⚪"> {
  const cacheado = cacheOrigemPorCaminho.get(caminhoAbs);
  if (cacheado) return cacheado;
  const origem = await origemDeArquivoSemCache(caminhoAbs, raizId);
  cacheOrigemPorCaminho.set(caminhoAbs, origem);
  return origem;
}

/** Resolve `origem` só para os itens desta página (efeito colateral: preenche o campo),
 *  em paralelo com teto de concorrência — nunca 1 spawn de cada vez, nunca ilimitado.
 *  Chamada depois do filtro+slice — nunca sobre o universo inteiro da varredura. */
async function resolverOrigemDaPagina(pagina: ItemDoc[]): Promise<ItemDoc[]> {
  let cursor = 0;
  async function worker(): Promise<void> {
    while (cursor < pagina.length) {
      const idx = cursor++;
      const item = pagina[idx];
      if (!item) continue;
      item.origem = await origemDeArquivo(item.caminho, item.raiz);
    }
  }
  const workers = Array.from({ length: Math.min(CONCORRENCIA_ORIGEM, pagina.length) }, () => worker());
  await Promise.all(workers);
  return pagina;
}

export interface ItemDoc {
  caminho: string;
  nome: string;
  tipo: string;
  raiz: string;
  mtime: string;
  tamanho: number;
  origem: "🧑" | "🤖" | "⚪";
  /**
   * DOC-ESTADO-NA-LISTA-001 (corte Enio 09/09: "sempre mostrar a lista completa, mais
   * recentes primeiro, sinalizados se já enviamos, se teve confirmação, se não enviamos,
   * com proveniência"). O ledger de estado já existia desde 08/09 e a LISTA não falava com
   * ele: 200 documentos apareciam todos iguais, e saber o que foi enviado exigia abrir um
   * por um. `⚪` aqui significa "sem estado registrado", nunca "não enviado" — as duas
   * coisas são diferentes e confundi-las é o erro que este campo existe para evitar.
   */
  estado?: "rascunho" | "pronto" | "enviado" | "confirmado" | "⚪";
  destino?: string;
  /** proveniência: quantas vezes mudou de estado e quando — do ledger append-only */
  mudancas?: number;
  estadoDesde?: string;
  /**
   * DOC-OBSERVACAO-E-PROXIMA-ACAO-001 (corte Enio 10/09) — o que aconteceu (para trás) e o
   * que falta (para frente). Só viajam quando têm conteúdo: campo vazio não vira chave no
   * JSON, para a linha da lista não carregar peso que não vai ser desenhado.
   */
  observacao?: string;
  proximaAcao?: string;
  /** só em .md: caminho do .html irmão, quando existe (R-HTML-010 — o par é o que se abre). */
  par?: string;
}

function montarItemDoc(b: ItemBruto, mapa: Map<string, EstadoResolvido>): ItemDoc {
  const item: ItemDoc = {
    caminho: b.caminhoAbs,
    nome: b.nome,
    tipo: b.tipo,
    raiz: b.raizId,
    mtime: new Date(b.mtimeMs).toISOString(),
    tamanho: b.tamanho,
    // "⚪" aqui é PLACEHOLDER, não medição — resolverOrigemDaPagina() sobrescreve antes de
    // sair pela API (ver PERF-DOCUMENTOS-GITLOG-001 acima). Nunca serve este item direto.
    origem: "⚪",
  };
  // O mapa chega pronto de fora (uma leitura do ledger por varredura, não uma por
  // documento) e é SEMPRE fresco — ver DOC-ESTADO-SEMPRE-FRESCO-001 na declaração do cache.
  const r = mapa.get(b.caminhoAbs);
  item.estado = r ? r.estado.status : "⚪";
  if (r?.estado.destino) item.destino = r.estado.destino;
  if (r?.estado.observacao) item.observacao = r.estado.observacao;
  if (r?.estado.proxima_acao) item.proximaAcao = r.estado.proxima_acao;
  if (r?.mudancas) {
    item.mudancas = r.mudancas;
    item.estadoDesde = r.ultima;
  }
  if (b.tipo === "md") {
    const par = b.caminhoAbs.replace(/\.md$/i, ".html");
    if (existsSync(par)) item.par = par;
  }
  return item;
}

export interface ResumoVarredura {
  total: number;
  porTipo: Record<string, number>;
  porRaiz: Record<string, number>;
  /**
   * DOC-HISTORICO-NA-HOME-001 (corte Enio 10/09: "esse histórico na verdade poderia ficar
   * em um espaço na página principal"). Contagem por estado sobre o UNIVERSO varrido, não
   * sobre a página filtrada — é o que o card da Home mostra em uma linha, e por isso ele
   * carrega o denominador junto (R-UNIVERSO-DECLARADO-001): "3 enviados de 3.167" é
   * informação, "3 enviados" sozinho engana.
   * A chave `⚪` conta documento SEM estado registrado — que não é o mesmo que "não
   * enviado", e nunca deve ser somado com `rascunho`.
   */
  porEstado: Record<string, number>;
  varridoEm: string;
  teto?: number;
}

interface VarreduraCompleta {
  itens: ItemDoc[];
  resumo: ResumoVarredura;
}

/**
 * DOC-ESTADO-SEMPRE-FRESCO-001 (medido 10/09 pelos goldens g110/g111): o cache guarda o que
 * é CARO — caminhar as raízes e resolver origem por git. O estado do documento (o ledger
 * `.jsonl`) fica FORA dele e é relido a cada pedido, senão marcar "enviado" e voltar para a
 * lista mostra "sem marca" por até 60s. Antes, `dados` guardava os itens já montados COM o
 * estado dentro; agora guarda só os brutos.
 */
let cache: { chave: string; expiraEm: number; brutos: ItemBruto[]; bateuTeto: boolean } | null = null;

function chaveRaizes(raizes: RaizDeclarada[]): string {
  return raizes.map((r) => `${r.id}:${r.caminho}`).join("|");
}

/** Varre TODAS as raízes declaradas (sem filtro de query) e cacheia 60s — a varredura de
 *  ~/Downloads não pode custar a cada poll do painel. */
export function varrerDocumentos(raizesForcadas?: RaizDeclarada[]): VarreduraCompleta {
  const raizes = raizesForcadas ?? resolverRaizesDeclaradas();
  const chave = chaveRaizes(raizes);
  const agora = Date.now();
  let brutos: ItemBruto[];
  let bateuTeto: boolean;
  if (cache && cache.chave === chave && cache.expiraEm > agora) {
    brutos = cache.brutos;
    bateuTeto = cache.bateuTeto;
  } else {
    const contador = { n: 0 };
    brutos = [];
    for (const raiz of raizes) caminharRaiz(raiz, contador, brutos);
    bateuTeto = contador.n >= TETO_ARQUIVOS;
    cache = { chave, expiraEm: agora + CACHE_MS, brutos, bateuTeto };
  }

  // fora do cache DE PROPÓSITO: uma leitura do ledger por varredura, sempre fresca.
  const mapa = mapaDeEstados();
  const itens = brutos.map((b) => montarItemDoc(b, mapa)).sort((a, b) => new Date(b.mtime).getTime() - new Date(a.mtime).getTime());
  const porTipo: Record<string, number> = {};
  const porRaiz: Record<string, number> = {};
  const porEstado: Record<string, number> = {};
  for (const i of itens) {
    porTipo[i.tipo] = (porTipo[i.tipo] ?? 0) + 1;
    porRaiz[i.raiz] = (porRaiz[i.raiz] ?? 0) + 1;
    const e = i.estado ?? "⚪";
    porEstado[e] = (porEstado[e] ?? 0) + 1;
  }
  const resumo: ResumoVarredura = {
    total: itens.length,
    porTipo,
    porRaiz,
    porEstado,
    varridoEm: new Date(agora).toISOString(),
    ...(bateuTeto ? { teto: TETO_ARQUIVOS } : {}),
  };
  return { itens, resumo };
}

// ── GET /api/documentos ──────────────────────────────────────────────────────────────
export async function montarDocumentosApi(params: URLSearchParams): Promise<Record<string, unknown>> {
  const tipo = (params.get("tipo") ?? "todos").trim();
  const raizId = (params.get("raiz") ?? "").trim();
  const q = (params.get("q") ?? "").trim().toLowerCase();
  const dias = Number(params.get("dias") ?? "0") || 0;
  const nParam = Number(params.get("n") ?? "200");
  const n = Number.isFinite(nParam) && nParam > 0 ? Math.min(2000, Math.floor(nParam)) : 200;

  const { itens, resumo } = varrerDocumentos();
  let filtrados = itens;
  if (tipo && tipo !== "todos") filtrados = filtrados.filter((i) => i.tipo === tipo);
  if (raizId) filtrados = filtrados.filter((i) => i.raiz === raizId);
  if (dias > 0) {
    const limiteMs = Date.now() - dias * 86_400_000;
    filtrados = filtrados.filter((i) => new Date(i.mtime).getTime() >= limiteMs);
  }
  if (q) filtrados = filtrados.filter((i) => i.nome.toLowerCase().includes(q));

  return { resumo, itens: await resolverOrigemDaPagina(filtrados.slice(0, n)) };
}

// ── GET /api/documentos/raizes ───────────────────────────────────────────────────────
export function montarRaizesApi(): Record<string, unknown> {
  const raizes = resolverRaizesDeclaradas();
  const { itens } = varrerDocumentos(raizes);
  const contagem = new Map<string, number>();
  for (const i of itens) contagem.set(i.raiz, (contagem.get(i.raiz) ?? 0) + 1);
  return {
    raizes: raizes.map((r) => ({ id: r.id, caminho: r.caminho, existe: existsSync(r.caminho), total: contagem.get(r.id) ?? 0 })),
  };
}

// ── POST /api/documentos/abrir ───────────────────────────────────────────────────────
/** DOCS-BRANCH-404-MORTO-001 (achado 10/09, ao golden g10 de DOCS-COPIAR-ARQUIVO-001):
 *  realpathSync falha pra caminho que ainda não existe, e isso fazia dentroDeAlgumaRaiz
 *  devolver false SEMPRE que o arquivo não existisse — mesmo dentro de uma raiz declarada
 *  — então "arquivo não existe" nunca chegava ao 404 de existsSync(), só ao 403 de
 *  fronteira (em tratarAbrirDocumento E tratarCopiarArquivo, mesma função). Conserto:
 *  quando o caminho inteiro não resolve, resolve o DIRETÓRIO PAI (que precisa existir de
 *  verdade) e recompõe com o nome do arquivo por cima. O nome nunca pode ser ".."/"." —
 *  senão reabriria exatamente o escape que o realpath existe pra fechar (o pai já resolveu
 *  todo ".." que existia no meio do caminho; só o último segmento fica sem resolver). */
function resolverReal(caminho: string): string | null {
  try {
    return realpathSync(caminho);
  } catch {
    const pai = dirname(caminho);
    const nome = basename(caminho);
    if (nome === ".." || nome === "." || nome === "") return null;
    try {
      return realpathSync(pai) + "/" + nome;
    } catch {
      return null;
    }
  }
}

/** Fail-closed: só aceita `caminhoAbs` cujo caminho REAL (resolvido) esteja dentro do
 *  caminho REAL de alguma raiz declarada — barra symlink-escape e "../" residual. */
export function dentroDeAlgumaRaiz(caminhoAbs: string, raizes: RaizDeclarada[]): boolean {
  const alvoReal = resolverReal(caminhoAbs);
  if (!alvoReal) return false;
  for (const raiz of raizes) {
    const raizReal = resolverReal(raiz.caminho);
    if (!raizReal) continue;
    if (alvoReal === raizReal || alvoReal.startsWith(raizReal + "/")) return true;
  }
  return false;
}

export async function tratarAbrirDocumento(req: Request): Promise<Response> {
  let corpo: { caminho?: string };
  try {
    corpo = await req.json();
  } catch {
    return Response.json({ ok: false, erro: "corpo não é JSON válido" }, { status: 400 });
  }
  const caminho = (corpo.caminho ?? "").trim();
  if (!caminho) return Response.json({ ok: false, erro: "caminho vazio" }, { status: 400 });

  const raizes = resolverRaizesDeclaradas();
  if (!dentroDeAlgumaRaiz(caminho, raizes)) {
    return Response.json({ ok: false, erro: "caminho fora das raízes declaradas" }, { status: 403 });
  }
  if (!existsSync(caminho)) return Response.json({ ok: false, erro: "arquivo não existe" }, { status: 404 });

  // R-HTML-010: .md com par .html abre o .html, nunca o .md cru.
  let alvo = caminho;
  if (/\.md$/i.test(caminho)) {
    const par = caminho.replace(/\.md$/i, ".html");
    if (existsSync(par)) alvo = par;
  }

  try {
    const proc = Bun.spawn(["xdg-open", alvo], { stdout: "ignore", stderr: "ignore", stdin: "ignore" });
    proc.unref();
    return Response.json({ ok: true, aberto: true, caminho: alvo });
  } catch (e) {
    return Response.json({ ok: false, aberto: false, erro: `falha ao abrir: ${e instanceof Error ? e.message : String(e)}` }, { status: 500 });
  }
}

/** DOCS-COPIAR-ARQUIVO-001 (corte Enio 10/09: "deve ter copiar o arquivo, pra já colar em
 *  qualquer lugar") — irmão do "copiar caminho", que copia só o texto do caminho e não serve
 *  para anexar nada. Aqui o ARQUIVO vai para a área de transferência, e quem cola recebe
 *  arquivo: gerenciador de arquivos, e-mail, WhatsApp Web.
 *
 *  A cópia NÃO pode acontecer no navegador: a API de clipboard da página só escreve texto e
 *  imagem, e o EGOS APP é servido em 127.0.0.1 justamente porque pode agir na máquina. Então
 *  o motor é um processo local (scripts/copiar-arquivo-clipboard.py), e ele fica VIVO segurando
 *  a seleção — é assim que a área de transferência funciona no X: quem copiou entrega os bytes
 *  na hora do colar. Uma cópia por vez: a anterior é encerrada antes, senão sobra processo.
 *
 *  Fronteira igual à do abrir: só caminho dentro das raízes DECLARADAS, e o argv vai como
 *  ARRAY (sem shell) — nome de arquivo com aspas/`;` é string, nunca comando. */
let donoDaSelecao: { proc: Bun.Subprocess; caminho: string } | null = null;

export async function tratarCopiarArquivo(req: Request): Promise<Response> {
  let corpo: { caminho?: string };
  try {
    corpo = await req.json();
  } catch {
    return Response.json({ ok: false, erro: "corpo não é JSON válido" }, { status: 400 });
  }
  const caminho = (corpo.caminho ?? "").trim();
  if (!caminho) return Response.json({ ok: false, erro: "caminho vazio" }, { status: 400 });

  const raizes = resolverRaizesDeclaradas();
  if (!dentroDeAlgumaRaiz(caminho, raizes)) {
    return Response.json({ ok: false, erro: "caminho fora das raízes declaradas" }, { status: 403 });
  }
  if (!existsSync(caminho)) return Response.json({ ok: false, erro: "arquivo não existe" }, { status: 404 });
  if (!statSync(caminho).isFile()) return Response.json({ ok: false, erro: "não é um arquivo" }, { status: 400 });

  const motor = join(REPO_DIR, "scripts", "copiar-arquivo-clipboard.py");
  if (!existsSync(motor)) {
    return Response.json({ ok: false, erro: `motor de cópia ausente: ${motor}` }, { status: 500 });
  }

  if (donoDaSelecao) {
    try { donoDaSelecao.proc.kill(); } catch { /* já morreu — a seleção passou para outro */ }
    donoDaSelecao = null;
  }

  try {
    const proc = Bun.spawn(["python3", motor, caminho], { stdout: "pipe", stderr: "pipe", stdin: "ignore" });
    // a 1ª linha do stdout é o veredito do motor; ele a imprime ANTES de entrar no laço que
    // segura a seleção, e sem ela o "copiado ✓" da tela seria um sucesso-fantasma (R13-a).
    // Lê o PRIMEIRO PEDAÇO, não até o fim: o processo fica vivo de propósito, então esperar
    // EOF seria esperar os 30 minutos inteiros.
    const primeiraLinha = await Promise.race([
      proc.stdout.getReader().read().then((r) => (r.value ? new TextDecoder().decode(r.value) : "")),
      Bun.sleep(4_000).then(() => ""),
    ]);
    if (proc.exitCode !== null && proc.exitCode !== 0) {
      const erro = (await new Response(proc.stderr).text()).trim();
      return Response.json({ ok: false, erro: erro || `motor saiu com código ${proc.exitCode}` }, { status: 500 });
    }
    donoDaSelecao = { proc, caminho };
    return Response.json({ ok: true, caminho, detalhe: primeiraLinha.trim() || "⚪ motor não relatou (segue vivo)" });
  } catch (e) {
    return Response.json({ ok: false, erro: `falha ao copiar: ${e instanceof Error ? e.message : String(e)}` }, { status: 500 });
  }
}
