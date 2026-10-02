/**
 * coletores-mcp.ts — EGOS-APP-GAVETA-MCP-001 (corte Enio 07/09: "o que entra no app: MCP
 * customizado, integrações com MCPs, conectores"). Fato gerador: grep de "mcp" em
 * scripts/orquestra-viva* = 0 antes desta task — o app não mostrava nada do que o .mcp.json
 * do repo servido declara (9 servidores stdio + o gateway desligado desde 10/06).
 *
 * Lê SOMENTE:
 *   - <REPO_DIR>/.mcp.json (o do checkout servido, nunca o de outro repo) — comando/entrypoint/
 *     descrição de cada servidor declarado.
 *   - ${DIR_IA}.json — só as CHAVES de mcpServers (nomes dos servidores GLOBAIS desta conta),
 *     nunca o valor (que pode carregar env/args de outra máquina) — R-SEC-007.
 * NUNCA lê token/env de dentro desses arquivos para exibir.
 *
 * Medição em 2 camadas (leve por padrão, pesada só sob pedido — mesmo espírito do
 * R-WPP-ACCESS-001: nada de sondar tudo "já que estou aqui"):
 *   - padrão: saude = "nao-medido" (⚪) para todos — só existe_no_disco é checado (síncrono, grátis).
 *   - ?medir=1: handshake MCP real por stdio (initialize + tools/list, JSON-RPC 2.0
 *     newline-delimited) contra cada servidor, timeout 6s cada, em paralelo (Promise.allSettled).
 * O gateway (packages/mcp-unified-gateway) nunca é spawnado — está desligado do .mcp.json de
 * propósito; a contagem de tools dele é estática (grep no próprio tools.ts).
 */
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { join } from "node:path";
import { lerJobSeguro, REPO_DIR } from "./nucleo";

export type EstadoSaudeMcp = "medido" | "falhou" | "nao-medido";

export interface SaudeMcp {
  estado: EstadoSaudeMcp;
  /** nº de tools — de tools/list (handshake) ou de contagem estática (gateway). */
  tools?: number;
  /** nomes das tools (nunca o schema completo — só o nome, R-SEC-007 por economia). */
  nomes?: string[];
  /** presente só quando estado="falhou" — 1ª linha do stderr, saneada. */
  erro?: string;
}

export interface ServidorMcp {
  id: string;
  nome: string;
  comando: string;
  entrypoint: string;
  existe_no_disco: boolean;
  /** repo raiz do caminho do entrypoint — acusa quando aponta para OUTRO repo que não o servido. */
  aponta_para: string;
  descricao: string;
  /** true só para o 10º item (gateway) — nunca aparece em .mcp.json, medição sempre estática. */
  gateway?: boolean;
  saude: SaudeMcp;
}

export interface ResumoMcp {
  total: number;
  no_disco: number;
  saudaveis: number;
  falharam: number;
  nao_medidos: number;
}

export interface RespostaMcp {
  medidoEm: string;
  fonte: { projeto: string; globais: string };
  /** repo servido nesta instância — front compara contra aponta_para de cada item. */
  repoServido: string;
  /** só NOMES dos servidores MCP globais desta conta (${DIR_IA}.json) — nunca o resto. */
  globais: string[];
  servidores: ServidorMcp[];
  resumo: ResumoMcp;
}

const HANDSHAKE_TIMEOUT_MS = 6_000;
/** teto global (item 1 da spec) — rede de segurança além do timeout individual: mesmo que
 *  uma sonda trave por bug e ignore seu próprio AbortController, a rota nunca pendura além
 *  disto (=R13, nada de "não sei" virando silêncio infinito). */
const LOTE_TIMEOUT_MS = 10_000;

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/** nunca ecoa token/chave (R-SEC-007) — mesma família de padrão do golden g84z, aplicada
 *  aqui a stderr de processo que pode ter logado env por engano no crash. */
function sanitizar(txt: string): string {
  return txt
    .replace(/sk-[A-Za-z0-9]{10,}/gi, "[redigido]")
    .replace(/gh[po]_[A-Za-z0-9]+/gi, "[redigido]")
    .replace(/Bearer\s+[A-Za-z0-9._-]{10,}/gi, "Bearer [redigido]")
    .replace(/apikey["'=:\s]+[A-Za-z0-9._-]{6,}/gi, "apikey=[redigido]")
    .slice(0, 300);
}

/** repo raiz do caminho do entrypoint — para acusar quando ele NÃO é o do REPO_DIR servido
 *  (fato gerador: .mcp.json deste checkout aponta pra ${HOME}/egos, não pra si mesmo). */
function repoRaizDoCaminho(caminho: string): string {
  const idx = caminho.indexOf("/packages/");
  if (idx > 0) return caminho.slice(0, idx);
  return "⚪";
}

async function comTetoGlobal<T>(promessa: Promise<T>, ms: number, valorPadrao: T): Promise<T> {
  return Promise.race([
    promessa,
    new Promise<T>((resolve) => setTimeout(() => resolve(valorPadrao), ms)),
  ]);
}

/** handshake MCP real por stdio — nunca lança (R13): spawn ausente/timeout/crash viram
 *  { estado: "falhou" }. Escrita das 2 mensagens é imediata (sem esperar resposta do
 *  initialize) — o protocolo aceita, e é o que a spec pede ("manda initialize + tools/list"). */
async function medirSaudeMcp(entrypoint: string, cwd: string): Promise<SaudeMcp> {
  if (!existsSync(entrypoint)) {
    return { estado: "falhou", erro: "entrypoint não existe no disco" };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HANDSHAKE_TIMEOUT_MS);
  let proc: Bun.Subprocess<"pipe", "pipe", "pipe"> | null = null;
  try {
    proc = Bun.spawn<"pipe", "pipe", "pipe">([process.execPath, entrypoint], {
      cwd,
      stdin: "pipe",
      stdout: "pipe",
      stderr: "pipe",
      signal: controller.signal,
    });
    const initMsg = JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "orquestra-viva-mcp-probe", version: "1" },
      },
    });
    const listMsg = JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} });
    // Sequência do protocolo (achado do crítico adversarial, 07/09): initialize → ESPERAR a
    // resposta → notifications/initialized → tools/list. A 1ª versão mandava os dois pedidos
    // de uma vez e nunca enviava a notificação; os 9 servidores da casa são permissivos e
    // respondiam mesmo assim — servidor de terceiro conforme à spec recusaria tools/list antes
    // do initialized. Sonda que só funciona com servidor tolerante mede tolerância, não saúde.
    const initializedMsg = JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" });
    proc.stdin.write(initMsg + "\n");
    proc.stdin.flush();
    let listEnviado = false;

    const reader = proc.stdout.getReader();
    let buf = "";
    let toolsResp: Array<{ name?: string }> | null = null;
    let erroInit: string | null = null;
    const deadline = Date.now() + HANDSHAKE_TIMEOUT_MS;
    while (Date.now() < deadline && !toolsResp) {
      const restante = deadline - Date.now();
      const passo = await Promise.race([
        reader.read(),
        new Promise<{ value?: Uint8Array; done: boolean }>((resolve) =>
          setTimeout(() => resolve({ done: true }), Math.max(restante, 0)),
        ),
      ]);
      if (passo.done || !passo.value) break;
      buf += Buffer.from(passo.value).toString("utf-8");
      let idx: number;
      while ((idx = buf.indexOf("\n")) >= 0) {
        const linha = buf.slice(0, idx).trim();
        buf = buf.slice(idx + 1);
        if (!linha) continue;
        try {
          const obj = JSON.parse(linha);
          if (obj?.id === 1 && obj.error) erroInit = JSON.stringify(obj.error).slice(0, 200);
          if (obj?.id === 1 && obj.result && !listEnviado) {
            // só agora o servidor está inicializado: notifica e pede a lista
            proc.stdin.write(initializedMsg + "\n");
            proc.stdin.write(listMsg + "\n");
            proc.stdin.flush();
            listEnviado = true;
          }
          if (obj?.id === 2 && Array.isArray(obj.result?.tools)) toolsResp = obj.result.tools;
        } catch {
          // linha não é JSON (log solto do servidor no stdout) — ignora, não é resposta JSON-RPC
        }
      }
    }
    reader.cancel().catch(() => {});
    if (toolsResp) {
      const nomes = toolsResp.map((t) => (typeof t?.name === "string" && t.name ? t.name : "⚪"));
      return { estado: "medido", tools: nomes.length, nomes };
    }
    const stderrTxt = await new Response(proc.stderr).text().catch(() => "");
    const primeiraLinha = (stderrTxt.split("\n").find((l) => l.trim()) ?? "").trim();
    return {
      estado: "falhou",
      erro: sanitizar(erroInit ?? primeiraLinha ?? "sem resposta de tools/list dentro do timeout (6s)"),
    };
  } catch (e) {
    return { estado: "falhou", erro: sanitizar(`sonda falhou: ${errMsg(e)}`) };
  } finally {
    clearTimeout(timer);
    try {
      proc?.kill();
    } catch {
      // processo já morto — nada a fazer
    }
  }
}

/** 10º item — packages/mcp-unified-gateway, desligado do .mcp.json de propósito (10/06).
 *  Contagem de tools é ESTÁTICA (grep de `name: "..."` em tools.ts), nunca spawna: é um
 *  gateway HTTP consolidado, não um servidor stdio individual como os outros 9. */
/** Caminho RESOLVIDO (symlinks seguidos). `${HOME}/egos` é symlink para o checkout de
 *  produção — sem resolver, a gaveta acusava "aponta para outro checkout" em 10 de 10
 *  servidores quando eram o MESMO repo (achado ao ligar em produção, 07/09). Comparar caminho
 *  sem resolver é comparar o nome, não o lugar. Caminho inexistente volta como veio. */
function resolvido(p: string): string {
  try { return realpathSync(p); } catch { return p; }
}

function medirGatewayEstatico(): ServidorMcp {
  const raiz = join(REPO_DIR, "packages", "mcp-unified-gateway");
  const entrypoint = join(raiz, "src", "index.ts");
  const toolsPath = join(raiz, "src", "tools.ts");
  const base = {
    id: "mcp-unified-gateway",
    nome: "mcp-unified-gateway (gateway)",
    comando: "gateway HTTP (não plugado no .mcp.json)",
    entrypoint,
    aponta_para: resolvido(REPO_DIR), // repo raiz, como os outros 9 (raiz aqui é o pacote)
    gateway: true as const,
  };
  if (!existsSync(entrypoint) || !existsSync(toolsPath)) {
    return {
      ...base,
      existe_no_disco: false,
      descricao: "Gateway consolidado de tools EGOS — desligado desde 10/06, não aparece em .mcp.json",
      saude: { estado: "falhou", erro: "arquivos do gateway (index.ts/tools.ts) não encontrados no disco" },
    };
  }
  try {
    const conteudo = readFileSync(toolsPath, "utf-8");
    const tools = (conteudo.match(/^\s*name:\s*["'][a-zA-Z0-9_]+["']/gm) ?? []).length;
    return {
      ...base,
      existe_no_disco: true,
      descricao: `Gateway consolidado de tools EGOS (${tools} tools estáticas) — desligado desde 10/06, não plugado no .mcp.json`,
      saude: tools > 0
        ? { estado: "medido", tools }
        : { estado: "falhou", erro: "0 tools encontradas em tools.ts (contagem estática)" },
    };
  } catch (e) {
    return {
      ...base,
      existe_no_disco: true,
      descricao: "Gateway consolidado de tools EGOS — desligado desde 10/06, não plugado no .mcp.json",
      saude: { estado: "falhou", erro: sanitizar(`não consegui ler tools.ts: ${errMsg(e)}`) },
    };
  }
}

/** só as CHAVES de mcpServers em ${DIR_IA}.json — nunca o valor (pode ter env/token de
 *  outra integração). Ausência/JSON inválido = lista vazia, nunca lança (R13). */
function lerNomesMcpGlobais(): string[] {
  const caminho = join(process.env.HOME ?? "", ".claude.json");
  const j = lerJobSeguro(caminho);
  const servers = j && typeof j === "object" ? (j as Record<string, unknown>).mcpServers : null; // replicavel-ok: "mcpServers" é chave do JSON (${DIR_IA}.json), não host/ambiente
  if (!servers || typeof servers !== "object") return [];
  return Object.keys(servers as Record<string, unknown>);
}

export async function medirMcp(opts: { medir?: boolean } = {}): Promise<RespostaMcp> {
  const agora = new Date().toISOString();
  const mcpJsonPath = join(REPO_DIR, ".mcp.json");
  const claudeJsonPath = join(process.env.HOME ?? "", ".claude.json");
  const projeto = lerJobSeguro(mcpJsonPath) as {
    mcpServers?: Record<string, { command?: string; args?: string[]; description?: string }>;
  } | null;
  const entradas = projeto?.mcpServers ? Object.entries(projeto.mcpServers) : [];

  const pendentes = entradas.map(([nome, cfg]) => {
    const args = Array.isArray(cfg?.args) ? cfg.args : [];
    const entrypoint = args.length > 0 ? String(args[args.length - 1]) : "";
    const existeNoDisco = Boolean(entrypoint) && existsSync(entrypoint);
    const apontaPara = entrypoint ? resolvido(repoRaizDoCaminho(entrypoint)) : "⚪";
    const base: Omit<ServidorMcp, "saude"> = {
      id: nome,
      nome,
      comando: cfg?.command ?? "⚪",
      entrypoint: entrypoint || "⚪",
      existe_no_disco: existeNoDisco,
      aponta_para: apontaPara,
      descricao: typeof cfg?.description === "string" && cfg.description ? cfg.description.slice(0, 220) : "⚪",
    };
    const saudePromise: Promise<SaudeMcp> = !existeNoDisco
      ? Promise.resolve<SaudeMcp>({ estado: "falhou", erro: "entrypoint não existe no disco" })
      : opts.medir
        ? medirSaudeMcp(entrypoint, apontaPara !== "⚪" ? apontaPara : REPO_DIR)
        : Promise.resolve<SaudeMcp>({ estado: "nao-medido" });
    return { base, saudePromise };
  });

  const saudesSettled = await comTetoGlobal(
    Promise.allSettled(pendentes.map((p) => p.saudePromise)),
    LOTE_TIMEOUT_MS,
    pendentes.map(() => ({ status: "rejected", reason: "teto global (10s) estourado" }) as PromiseSettledResult<SaudeMcp>),
  );

  const servidores: ServidorMcp[] = pendentes.map((p, i) => {
    const r = saudesSettled[i];
    const saude: SaudeMcp = r.status === "fulfilled" ? r.value : { estado: "falhou", erro: sanitizar(`sonda não resolveu: ${errMsg(r.reason)}`) };
    return { ...p.base, saude };
  });
  servidores.push(medirGatewayEstatico());

  const resumo: ResumoMcp = {
    total: servidores.length,
    no_disco: servidores.filter((s) => s.existe_no_disco).length,
    saudaveis: servidores.filter((s) => s.saude.estado === "medido").length,
    falharam: servidores.filter((s) => s.saude.estado === "falhou").length,
    nao_medidos: servidores.filter((s) => s.saude.estado === "nao-medido").length,
  };

  return {
    medidoEm: agora,
    fonte: { projeto: mcpJsonPath, globais: claudeJsonPath },
    repoServido: resolvido(REPO_DIR),
    globais: lerNomesMcpGlobais(),
    servidores,
    resumo,
  };
}
