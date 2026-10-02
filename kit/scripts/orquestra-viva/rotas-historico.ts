/**
 * rotas-historico.ts — GET /api/historico?horas=24 (APP-HISTORICO-E-TELEMETRIA-001, corte
 * Enio 13/09 verbatim: "organize o egos app, ele está iniciando várias vezes, estude todas,
 * ative a observabilidade completa, transparência radical, telemetria no egos app, com
 * histórico de tudo, pulsos micélio").
 *
 * Agrega, numa única timeline, as fontes de telemetria que este programa acabou de criar
 * (ledger de eventos da casca/launcher/atualizador) com as que já existiam espalhadas
 * (sessões do Claude Code, pulso micélio por superfície, heartbeats, fila de agentes) —
 * mesmo molde de `rotas-notificacoes.ts`: fonte ilegível vira "⚪ ..." em `fontes.<nome>` e a
 * resposta é SEMPRE 200 (=R13-c: "não sei" nunca derruba o endpoint inteiro).
 */
import { existsSync, openSync, closeSync, fstatSync, readSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PULSE_DIR, REPO_DIR } from "./nucleo";
import { heartbeatsRecentes } from "./coletores-agentes";

export type FonteHistorico = "casca" | "launcher" | "atualizador" | "sessao" | "pulso" | "heartbeat";

export interface ItemHistorico {
  quando: string;
  fonte: FonteHistorico;
  tipo: string;
  titulo: string;
  detalhe?: Record<string, unknown>;
}

export interface ResumoHistorico {
  sessoesClaude: number;
  aberturasCasca: number;
  aparecas: number;
  aparecasSuprimidos: number;
  duplicatasRecusadas: number;
  reiniciosServidor: number;
}

export interface RespostaHistorico {
  geradoEm: string;
  horas: number;
  resumo: ResumoHistorico;
  itens: ItemHistorico[];
  fontes: Record<string, string>;
}

function caminhoEventos(): string {
  return (process.env.EGOS_APP_EVENTOS ?? "").trim() || join(process.env.HOME ?? "", ".egos", "egos-app-eventos.jsonl");
}
function caminhoRuleEvents(): string {
  return (process.env.EGOS_RULE_EVENTS ?? "").trim() || join(process.env.HOME ?? "", ".claude", "telemetry", "rule-events.jsonl");
}
function caminhoAtualizadorLog(): string {
  return (process.env.EGOS_ATUALIZADOR_LOG ?? "").trim() || join(process.env.HOME ?? "", ".egos", "logs", "egos-app-atualizador.log");
}

/** Lê só os últimos `bytes` de um arquivo — evita reabrir 6,9MB de rule-events.jsonl a cada
 *  chamada do endpoint (custo desprezível vira custo real em poll de 30s). A 1ª linha do
 *  bloco lido pode vir cortada no meio; ela é descartada (a linha seguinte não é). */
function lerCauda(caminho: string, bytes: number): string {
  const fd = openSync(caminho, "r");
  try {
    const tamanho = fstatSync(fd).size;
    const inicio = Math.max(0, tamanho - bytes);
    const tamanhoLido = tamanho - inicio;
    const buf = Buffer.alloc(tamanhoLido);
    readSync(fd, buf, 0, tamanhoLido, inicio);
    const texto = buf.toString("utf-8");
    return inicio > 0 ? texto.slice(texto.indexOf("\n") + 1) : texto;
  } finally {
    closeSync(fd);
  }
}

function dentroDaJanela(iso: string, desdeMs: number): boolean {
  const t = Date.parse(iso);
  return Number.isFinite(t) && t >= desdeMs;
}

// ── casca/launcher/atualizador: ~/.egos/egos-app-eventos.jsonl ──────────────────────────
function itensDoLedgerEventos(desdeMs: number): { itens: ItemHistorico[]; status: string } {
  const caminho = caminhoEventos();
  if (!existsSync(caminho)) return { itens: [], status: "⚪ NAO-MEDIDO: ledger de eventos do app não existe nesta máquina" };
  try {
    const bruto = readFileSync(caminho, "utf-8");
    const itens: ItemHistorico[] = [];
    for (const linha of bruto.split("\n")) {
      if (!linha.trim()) continue;
      try {
        const j = JSON.parse(linha) as { ts?: string; fonte?: string; tipo?: string; detalhe?: Record<string, unknown> };
        if (typeof j.ts !== "string" || !dentroDaJanela(j.ts, desdeMs)) continue;
        const fonte = (j.fonte === "launcher" || j.fonte === "atualizador" ? j.fonte : "casca") as FonteHistorico;
        itens.push({
          quando: j.ts,
          fonte,
          tipo: String(j.tipo ?? "?"),
          titulo: `${fonte}: ${String(j.tipo ?? "?")}`,
          detalhe: j.detalhe,
        });
      } catch {
        // linha corrompida não derruba as demais
      }
    }
    return { itens, status: "ok" };
  } catch (e) {
    return { itens: [], status: `⚪ NAO-MEDIDO: ledger de eventos ilegível (${(e as Error).message})` };
  }
}

// ── sessões: ${DIR_IA}/telemetry/rule-events.jsonl (só event_name de sessão, cauda de 2MB) ──
const EVENTOS_DE_SESSAO = new Set(["session_started", "session_end", "session_ended"]);
function itensDeSessoes(desdeMs: number): { itens: ItemHistorico[]; status: string } {
  const caminho = caminhoRuleEvents();
  if (!existsSync(caminho)) return { itens: [], status: "⚪ NAO-MEDIDO: rule-events.jsonl não existe nesta máquina" };
  try {
    const texto = lerCauda(caminho, 2 * 1024 * 1024);
    const itens: ItemHistorico[] = [];
    for (const linha of texto.split("\n")) {
      if (!linha.trim()) continue;
      try {
        const j = JSON.parse(linha) as { ts?: string; event_name?: string; hook?: string };
        if (!j.event_name || !EVENTOS_DE_SESSAO.has(j.event_name)) continue;
        if (typeof j.ts !== "string" || !dentroDaJanela(j.ts, desdeMs)) continue;
        itens.push({
          quando: j.ts,
          fonte: "sessao",
          tipo: j.event_name,
          titulo: `sessão: ${j.event_name}`,
        });
      } catch {
        // linha corrompida (ou cortada pela cauda) não derruba as demais
      }
    }
    return { itens, status: "ok" };
  } catch (e) {
    return { itens: [], status: `⚪ NAO-MEDIDO: rule-events.jsonl ilegível (${(e as Error).message})` };
  }
}

// ── atualizador: ~/.egos/logs/egos-app-atualizador.log (linhas 🔴/🟢 com timestamp ISO) ─────
function itensDoLogAtualizador(desdeMs: number): { itens: ItemHistorico[]; status: string } {
  const caminho = caminhoAtualizadorLog();
  if (!existsSync(caminho)) return { itens: [], status: "⚪ NAO-MEDIDO: log do atualizador não existe nesta máquina" };
  try {
    const bruto = readFileSync(caminho, "utf-8");
    const itens: ItemHistorico[] = [];
    for (const linha of bruto.split("\n")) {
      if (!linha.trim()) continue;
      const m = linha.match(/^(\S+)\s+(.*)$/);
      if (!m) continue;
      const [, ts, resto] = m;
      if (!dentroDaJanela(ts, desdeMs)) continue;
      itens.push({ quando: ts, fonte: "atualizador", tipo: "log", titulo: `atualizador: ${resto}` });
    }
    return { itens, status: "ok" };
  } catch (e) {
    return { itens: [], status: `⚪ NAO-MEDIDO: log do atualizador ilegível (${(e as Error).message})` };
  }
}

// ── pulso micélio: ultimaMedicaoPulse() + leitura do state do REPO_DIR (seção ---SUPERFICIES---) ──
function caminhoEstadoPulse(repoDir: string): string {
  const slug = repoDir.replace(/\//g, "-");
  return join(PULSE_DIR, `${slug}.state`);
}

function itemPulso(): { item: ItemHistorico | null; status: string } {
  if (!existsSync(PULSE_DIR)) return { item: null, status: "⚪ NAO-MEDIDO: ~/.egos/pulse não existe nesta máquina" };
  const caminho = caminhoEstadoPulse(REPO_DIR);
  if (!existsSync(caminho)) return { item: null, status: `⚪ NAO-MEDIDO: sem state de pulso para ${REPO_DIR}` };
  try {
    const bruto = readFileSync(caminho, "utf-8");
    const linhas = bruto.split("\n");
    const superficies: Record<string, string> = {};
    let dentro = false;
    let timestamp: number | null = null;
    for (const l of linhas) {
      if (l === "---SUPERFICIES---") { dentro = true; continue; }
      if (l.startsWith("---")) { dentro = false; continue; }
      if (l.startsWith("TIMESTAMP=")) { timestamp = Number(l.slice("TIMESTAMP=".length)) || null; continue; }
      if (dentro) {
        const eq = l.indexOf("=");
        if (eq > 0) superficies[l.slice(0, eq)] = l.slice(eq + 1);
      }
    }
    const quando = timestamp ? new Date(timestamp * 1000).toISOString() : new Date().toISOString();
    return {
      item: {
        quando,
        fonte: "pulso",
        tipo: "pulso-micelio",
        titulo: `pulso micélio: ${Object.keys(superficies).length} superfície(s) medida(s)`,
        detalhe: superficies,
      },
      status: "ok",
    };
  } catch (e) {
    return { item: null, status: `⚪ NAO-MEDIDO: state de pulso ilegível (${(e as Error).message})` };
  }
}

// ── heartbeats: reusa coletores-agentes.ts (nunca duplica leitura de ~/.egos/heartbeat) ────
function itensDeHeartbeats(desdeMs: number): { itens: ItemHistorico[]; status: string } {
  const r = heartbeatsRecentes();
  if ("erro" in r) return { itens: [], status: r.erro };
  const itens: ItemHistorico[] = [];
  for (const h of r.itens) {
    if (!h.timestamp || !dentroDaJanela(h.timestamp, desdeMs)) continue;
    itens.push({
      quando: h.timestamp,
      fonte: "heartbeat",
      tipo: h.status ?? "?",
      titulo: `heartbeat ${h.nome}: ${h.status ?? "⚪"}`,
    });
  }
  return { itens, status: "ok" };
}

function montarResumo(itens: ItemHistorico[]): ResumoHistorico {
  const contar = (fonte: FonteHistorico, tipo: string) => itens.filter((i) => i.fonte === fonte && i.tipo === tipo).length;
  return {
    sessoesClaude: itens.filter((i) => i.fonte === "sessao" && i.tipo === "session_started").length,
    aberturasCasca: contar("launcher", "abriu"),
    aparecas: contar("launcher", "apareca-enviado"),
    aparecasSuprimidos: contar("launcher", "apareca-suprimido"),
    duplicatasRecusadas: itens.filter((i) => i.tipo === "duplicata-recusada").length,
    reiniciosServidor: itens.filter((i) => i.fonte === "atualizador" && i.tipo === "servidor-reiniciado").length,
  };
}

export async function montarHistorico(horas: number): Promise<RespostaHistorico> {
  const desdeMs = Date.now() - horas * 60 * 60 * 1000;
  const eventos = itensDoLedgerEventos(desdeMs);
  const sessoes = itensDeSessoes(desdeMs);
  const atualizador = itensDoLogAtualizador(desdeMs);
  const pulso = itemPulso();
  const heartbeats = itensDeHeartbeats(desdeMs);

  const itens = [
    ...eventos.itens,
    ...sessoes.itens,
    ...atualizador.itens,
    ...(pulso.item ? [pulso.item] : []),
    ...heartbeats.itens,
  ].sort((a, b) => (a.quando < b.quando ? 1 : a.quando > b.quando ? -1 : 0)); // desc

  return {
    geradoEm: new Date().toISOString(),
    horas,
    resumo: montarResumo(itens),
    itens,
    fontes: {
      eventosApp: eventos.status,
      sessoes: sessoes.status,
      atualizador: atualizador.status,
      pulso: pulso.status,
      heartbeats: heartbeats.status,
    },
  };
}

export async function tratarHistoricoGet(url: URL): Promise<Response> {
  const horasParam = Number(url.searchParams.get("horas") ?? "24");
  const horas = Number.isFinite(horasParam) && horasParam > 0 ? horasParam : 24;
  const resposta = await montarHistorico(horas);
  return Response.json(resposta);
}
