/**
 * rotas-notificacoes.ts — GET /api/notificacoes (SN-1-FONTE-UNICA-E-ICONE-001, programa
 * SISTEMA-NERVOSO-DO-APP-001). Agrega, numa única resposta, as fontes que hoje já existem
 * espalhadas (fila de agentes, notify-soft-queue, heartbeats, mesa) — nenhuma fonte nova é
 * criada aqui, isto é o LEITOR único que faltava (R13: "fila sem leitor é lixo" aplicado a
 * quatro filas com leitor cada uma isolada e nenhum ponto que as junte).
 *
 * Fonte ilegível nunca derruba a resposta inteira (=R13-c): cada `fontes.<nome>` é "ok" ou
 * uma string começando com "⚪" — o endpoint sempre devolve 200, mesmo com 4 fontes mortas.
 *
 * Cursor de avisos: ${EGOS_STATE_DIR ?? ~/.egos/state}/notificacoes-cursor.json (mesmo padrão
 * de diretório que rotas-documento-vivo.ts usa para o ledger de estado — reuso, não invenção
 * de uma 2ª convenção de onde o estado do app mora).
 */
import { existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  BASE as FILA_BASE,
  listarAgentes,
  listarOrdenado,
  resumoDeArquivo,
  type JobResumo,
} from "./nucleo";
import { heartbeatsRecentes, type HeartbeatResumo } from "./coletores-agentes";

import { traduzirAviso, pedidoAgrupado } from "./aviso-humano";

export type FonteNotificacao = "fila" | "avisos" | "heartbeat" | "mesa" | "pca";
export type Prioridade = "alta" | "normal";

export interface ItemNotificacao {
  id: string;
  fonte: FonteNotificacao;
  agente?: string;
  titulo: string;
  quando: string;
  prioridade: Prioridade;
  gaveta_destino: string;
  /** AVISO-HUMANO-001 (corte Enio 09/09): o que uma pessoa entende, e o pedido pronto. */
  humano?: { titulo: string; oQueE: string; oQueQuebra: string; pedido: string; traduzido: boolean };
}

export interface RegraPrioridade {
  fonte: FonteNotificacao;
  de?: string;
}

export interface RegrasPrioridade {
  alta: RegraPrioridade[];
  normal: "*" | RegraPrioridade[];
}

const REGRAS_PADRAO: RegrasPrioridade = {
  alta: [
    { fonte: "fila", de: "egos-app" },
    { fonte: "fila", de: "humano" },
    { fonte: "heartbeat" },
  ],
  normal: "*",
};

/** Função PURA (R-DECIDE-DETERMINISTICO-001): mesma entrada → mesma saída, sem rede/relógio.
 *  `regras.alta` é a lista que promove; tudo o que não bate vira "normal" (regras.normal="*"
 *  é o único formato hoje suportado — lista explícita fica reservada para quando alguém
 *  precisar restringir "normal" também, e nesse dia deixa de bater tudo por padrão). */
export function classificarPrioridade(
  item: { fonte: FonteNotificacao; de?: string },
  regras: RegrasPrioridade,
): Prioridade {
  const bate = (r: RegraPrioridade) =>
    r.fonte === item.fonte && (r.de === undefined || r.de === item.de);
  return regras.alta.some(bate) ? "alta" : "normal";
}

let regrasCache: { regras: RegrasPrioridade; caminho: string } | null = null;

function caminhoConfigRegras(repoDir: string): string {
  return (process.env.EGOS_NOTIF_REGRAS ?? "").trim() || join(repoDir, "config", "notificacoes-prioridade.json");
}

/** Lê 1x por processo (config versionada, não muda em runtime) — ilegível/ausente cai no
 *  padrão embutido acima, nunca lança (=R13). */
function lerRegras(repoDir: string): RegrasPrioridade {
  const caminho = caminhoConfigRegras(repoDir);
  if (regrasCache && regrasCache.caminho === caminho) return regrasCache.regras;
  try {
    const bruto = JSON.parse(readFileSync(caminho, "utf-8"));
    const regras: RegrasPrioridade = {
      alta: Array.isArray(bruto.alta) ? bruto.alta : REGRAS_PADRAO.alta,
      normal: bruto.normal === "*" || Array.isArray(bruto.normal) ? bruto.normal : "*",
    };
    regrasCache = { regras, caminho };
    return regras;
  } catch {
    regrasCache = { regras: REGRAS_PADRAO, caminho };
    return REGRAS_PADRAO;
  }
}

// ── fila: pendentes de TODOS os agentes ──────────────────────────────────────────────────
function itensDaFila(regras: RegrasPrioridade): { itens: ItemNotificacao[]; status: string } {
  if (!existsSync(FILA_BASE)) return { itens: [], status: "⚪ NAO-MEDIDO: fila não existe nesta máquina" };
  try {
    const itens: ItemNotificacao[] = [];
    for (const agente of listarAgentes()) {
      const pendDir = join(FILA_BASE, agente, "pendentes");
      for (const arq of listarOrdenado(pendDir)) {
        const j: JobResumo = resumoDeArquivo(pendDir, arq);
        itens.push({
          id: `fila:${agente}:${j.id}`,
          fonte: "fila",
          agente,
          titulo: j.titulo,
          quando: j.criadoEm,
          prioridade: classificarPrioridade({ fonte: "fila", de: j.de }, regras),
          gaveta_destino: "time-overlay",
        });
      }
    }
    return { itens, status: "ok" };
  } catch (e) {
    return { itens: [], status: `⚪ NAO-MEDIDO: fila ilegível (${(e as Error).message})` };
  }
}

// ── notify-soft-queue: cursor por posição de byte já lida ──────────────────────────────
function estadoDirPath(): string {
  const declarado = (process.env.EGOS_STATE_DIR ?? "").trim();
  return declarado || join(process.env.HOME ?? "", ".egos", "state");
}
function caminhoCursor(): string {
  return join(estadoDirPath(), "notificacoes-cursor.json");
}
function caminhoAvisos(): string {
  return (process.env.EGOS_NOTIFY_QUEUE ?? "").trim() || join(process.env.HOME ?? "", ".egos", "notify-soft-queue.jsonl");
}

function lerCursor(): { bytesLidos: number } {
  const caminho = caminhoCursor();
  if (!existsSync(caminho)) return { bytesLidos: 0 };
  try {
    const j = JSON.parse(readFileSync(caminho, "utf-8"));
    return { bytesLidos: typeof j.bytesLidos === "number" && j.bytesLidos >= 0 ? j.bytesLidos : 0 };
  } catch {
    return { bytesLidos: 0 };
  }
}

function gravarCursor(bytesLidos: number): void {
  const caminho = caminhoCursor();
  try {
    mkdirSync(dirname(caminho), { recursive: true });
    const tmp = `${caminho}.tmp-${process.pid}-${Date.now()}`;
    writeFileSync(tmp, JSON.stringify({ bytesLidos, atualizadoEm: new Date().toISOString() }));
    renameSync(tmp, caminho);
  } catch {
    // silencio-ok: cursor não gravado significa que a próxima chamada relê as mesmas linhas
    // (reapresenta, nunca perde um aviso) — falha aqui degrada para "repete", não para "some".
  }
}

function itensDeAvisos(): { itens: ItemNotificacao[]; status: string } {
  const caminho = caminhoAvisos();
  if (!existsSync(caminho)) return { itens: [], status: "⚪ NAO-MEDIDO: notify-soft-queue não existe nesta máquina" };
  try {
    const tamanho = statSync(caminho).size;
    const { bytesLidos } = lerCursor();
    const desde = Math.min(bytesLidos, tamanho);
    const bruto = readFileSync(caminho, "utf-8");
    // desde é contado em bytes; para simplicidade e portabilidade (=R14-j) lemos o arquivo
    // inteiro e cortamos por linha a partir do offset aproximado — arquivo é jsonl pequeno
    // (notificações soft, não log de produção), custo desprezível.
    const linhas = bruto.split("\n").filter(Boolean);
    let acumulado = 0;
    const novasLinhas: string[] = [];
    for (const linha of linhas) {
      const tamanhoLinha = Buffer.byteLength(linha, "utf-8") + 1;
      if (acumulado >= desde) novasLinhas.push(linha);
      acumulado += tamanhoLinha;
    }
    gravarCursor(tamanho);
    const itens: ItemNotificacao[] = [];
    for (const linha of novasLinhas) {
      try {
        const j = JSON.parse(linha);
        itens.push({
          id: `avisos:${j.ts ?? linha.length}:${j.key ?? "sem-chave"}`,
          fonte: "avisos",
          titulo: typeof j.title === "string" ? j.title : "⚪ sem título",
          quando: typeof j.ts === "string" ? j.ts : "⚪",
          prioridade: "normal",
          gaveta_destino: "integracoes-overlay",
        });
      } catch {
        // linha corrompida — pulada, não derruba as demais
      }
    }
    return { itens, status: "ok" };
  } catch (e) {
    return { itens: [], status: `⚪ NAO-MEDIDO: notify-soft-queue ilegível (${(e as Error).message})` };
  }
}

// ── heartbeats vermelhos ────────────────────────────────────────────────────────────────
function itensDeHeartbeat(regras: RegrasPrioridade): { itens: ItemNotificacao[]; status: string } {
  const r = heartbeatsRecentes();
  if ("erro" in r) return { itens: [], status: r.erro };
  const vermelhos = r.itens.filter((h: HeartbeatResumo) => h.status === "fail");
  const itens: ItemNotificacao[] = vermelhos.map((h) => ({
    id: `heartbeat:${h.nome}:${h.timestamp ?? "sem-hora"}`,
    fonte: "heartbeat",
    agente: h.nome,
    titulo: `heartbeat vermelho: ${h.nome}`,
    quando: h.timestamp ?? "⚪",
    prioridade: classificarPrioridade({ fonte: "heartbeat" }, regras),
    gaveta_destino: "integracoes-overlay",
  }));
  return { itens, status: "ok" };
}

// ── mesa: `bun scripts/mesa.ts estado --json`, com teto de tempo para não estourar
//    o orçamento de <200ms do endpoint inteiro. ──────────────────────────────────────────
async function itensDeMesa(repoDir: string): Promise<{ itens: ItemNotificacao[]; status: string }> {
  const caminhoMesa = join(repoDir, "scripts", "mesa.ts");
  if (!existsSync(caminhoMesa)) return { itens: [], status: "⚪ NAO-MEDIDO: scripts/mesa.ts não existe" };
  try {
    const proc = Bun.spawn([process.execPath, "scripts/mesa.ts", "estado", "--json"], {
      cwd: repoDir,
      stdout: "pipe",
      stderr: "ignore",
    });
    const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 120));
    const saida = await Promise.race([new Response(proc.stdout).text(), timeout]);
    if (saida === null) {
      proc.kill();
      return { itens: [], status: "⚪ NAO-MEDIDO: mesa.ts não respondeu em 120ms" };
    }
    const j = JSON.parse(saida);
    const tarefas = Array.isArray(j?.tarefas) ? j.tarefas : Array.isArray(j) ? j : [];
    const itens: ItemNotificacao[] = tarefas
      .filter((t: Record<string, unknown>) => t && (t.estado === "bloqueado"))
      .map((t: Record<string, unknown>) => ({
        id: `mesa:${String(t.task ?? t.id ?? "sem-id")}`,
        fonte: "mesa" as const,
        titulo: `mesa: ${String(t.task ?? t.id ?? "tarefa")} bloqueada`,
        quando: typeof t.quando === "string" ? t.quando : "⚪",
        prioridade: "normal" as const,
        gaveta_destino: "conversa-overlay",
      }));
    return { itens, status: "ok" };
  } catch (e) {
    return { itens: [], status: `⚪ NAO-MEDIDO: mesa.ts ilegível (${(e as Error).message})` };
  }
}

export interface RespostaNotificacoes {
  geradoEm: string;
  total: number;
  itens: ItemNotificacao[];
  fontes: Record<FonteNotificacao, string>;
  /** um pedido só quando vários avisos têm a MESMA causa provável — "" quando não têm. */
  pedidoAgrupado?: string;
}

/**
 * PCA-NO-SINO-001 (corte Enio 09/09: "HITL, PCA sempre são notificações que devem ficar no
 * EGOS APP"). Até aqui, decisão que esperava por ele vivia SÓ no chat — e morria com a
 * sessão. O `pca-audit.jsonl` que existia audita FORMATO de pergunta, não guarda pergunta
 * aberta: auditar a régua não é o mesmo que lembrar do pedido. Agora há um ledger
 * (`~/.egos/state/pca-abertas.jsonl`) e ele é a 5ª fonte do sino — decisão pendente aparece
 * na tela do dono como qualquer outro aviso, com prioridade ALTA, porque só ele pode fechá-la.
 */
function itensDePca(): { itens: ItemNotificacao[]; status: string } {
  const arq = join(process.env.EGOS_STATE_DIR ?? join(process.env.HOME ?? "", ".egos", "state"), "pca-abertas.jsonl");
  if (!existsSync(arq)) return { itens: [], status: "⚪ NAO-MEDIDO: nenhuma decisão registrada nesta máquina" };
  try {
    const itens: ItemNotificacao[] = [];
    for (const linha of readFileSync(arq, "utf-8").split("\n")) {
      if (!linha.trim()) continue;
      try {
        const o = JSON.parse(linha) as Record<string, unknown>;
        if (!o.id || !o.titulo) continue;
        itens.push({
          id: `pca:${String(o.id)}`,
          fonte: "pca",
          agente: String(o.id),
          titulo: `${String(o.id)} · ${String(o.titulo)}`,
          quando: String(o.aberta_em ?? ""),
          prioridade: "alta", // só o humano fecha: nunca vira ruído de fundo
          gaveta_destino: String(o.gaveta_destino ?? "avisos-overlay"),
        });
      } catch {
        // linha corrompida não derruba as outras decisões
      }
    }
    return { itens, status: "ok" };
  } catch (e) {
    return { itens: [], status: `⚪ NAO-MEDIDO: ledger de decisões ilegível (${(e as Error).message})` };
  }
}

export async function montarNotificacoes(repoDir: string): Promise<RespostaNotificacoes> {
  const regras = lerRegras(repoDir);
  const fila = itensDaFila(regras);
  const avisos = itensDeAvisos();
  const heartbeat = itensDeHeartbeat(regras);
  const mesa = await itensDeMesa(repoDir);
  const pca = itensDePca();
  // AVISO-HUMANO-001: a tradução entra aqui, no fim, para valer em TODA superfície que lê
  // este endpoint — o sino do app, o menu da bandeja e qualquer outra que venha depois.
  // Fosse feita em cada tela, a terceira nasceria com jargão de novo.
  const itens = [...pca.itens, ...fila.itens, ...avisos.itens, ...heartbeat.itens, ...mesa.itens].map((i) => ({
    ...i,
    humano: traduzirAviso(i),
  }));
  return {
    geradoEm: new Date().toISOString(),
    total: itens.length,
    itens,
    pedidoAgrupado: pedidoAgrupado(itens),
    fontes: { fila: fila.status, avisos: avisos.status, heartbeat: heartbeat.status, mesa: mesa.status, pca: pca.status },
  };
}

export async function tratarNotificacoesGet(repoDir: string): Promise<Response> {
  const resposta = await montarNotificacoes(repoDir);
  return Response.json(resposta);
}
