/**
 * coletores-whatsapp.ts — EGOS-APP-GAVETA-WHATSAPP-001 (corte Enio 10/09: "ele ainda não
 * mostra integração nossa com nosso whatsapp, as instâncias que temos, as conversas, o que
 * já analisamos, o que já fizemos alguma ação — isso tudo deve estar dentro do egos app").
 *
 * ADOPT, não reinvenção: não existe banco novo aqui. Tudo já está no disco desta máquina e
 * este módulo só LÊ e agrupa:
 *   - instâncias  → ~/.egos/whatsapp-ponte.cursor.*.json (uma por conversa escutada, cada
 *                   uma carrega `instancia`) + a instância declarada em .env/.env.local.
 *   - conversas   → jobs da fila (scripts/fila.ts, ~/.egos/fila/<agente>/{pendentes,
 *                   em-andamento,concluidos}) cujo campo `de` começa com "whatsapp:".
 *   - analisadas  → os mesmos jobs em concluidos/ (o agente pegou e fechou).
 *   - ação        → o campo `resultado` do job concluído — é ali que fica escrito o que foi
 *                   feito ("respondido no grupo 22:19", etc.).
 *
 * FRONTEIRA (R-WPP-ACCESS-001 + P4): ZERO chamada à Evolution API na montagem automática.
 * O painel abre lendo só disco local. A conferência ao vivo é ato explícito do botão
 * "medir agora" (medirWhatsappAgora, já existente em coletores-conexoes.ts) — mesma
 * disciplina da gaveta CONEXÕES. Nenhuma chave/token entra na resposta (R-SEC-007).
 *
 * TEXTO EXTERNO É DADO (mesma regra do whatsapp-ponte.ts): o trecho de mensagem que sai
 * daqui vai truncado e é escapado na pintura (app-whatsapp.js), nunca interpretado.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { BASE, lerJobSeguro, listarAgentes, listarOrdenado } from "./nucleo";
import { carregarOpcional, motivoAusente } from "./opcional";

// Canais de atendimento são integração pessoal: não viajam no kit público. Ausentes = lista
// vazia + a lacuna dita em `falta` (nunca "0 canais" como se tivesse medido).
const canaisPuro = await carregarOpcional(() => import("../lib/whatsapp-sessao-puro"), "../lib/whatsapp-sessao-puro");
const canaisEstado = await carregarOpcional(() => import("../lib/whatsapp-sessao-canais"), "../lib/whatsapp-sessao-canais");
const MOTIVO_CANAIS_AUSENTES: string | null =
  !canaisPuro ? motivoAusente("whatsapp-sessao-puro") : !canaisEstado ? motivoAusente("whatsapp-sessao-canais") : null;
import { jsonCanaisAtivos } from "../lib/whatsapp-canais-config";

const HOME = process.env.HOME ?? "";
/** mesma variável e mesmo default do whatsapp-ponte.ts:55 (EGOS_WPP_CURSOR_DIR) — se este
 *  módulo escolhesse outra, o painel leria uma pasta onde a ponte nunca escreve e mostraria
 *  "0 conversas" em silêncio. EGOS_HOME NÃO serve aqui: nesta máquina ela aponta para o
 *  checkout do repo (${HOME}/egos), não para ~/.egos. */
export const EGOS_DIR = process.env["EGOS_WPP_CURSOR_DIR"] ?? join(HOME, ".egos");

export interface AcaoWhatsapp {
  quando: string;
  agente: string;
  resultado: string;
}

export interface ConversaWhatsapp {
  jid: string;
  tipo: "grupo" | "pessoa";
  instancia: string;
  autores: string[];
  mensagens: number;
  pendentes: number;
  emAndamento: number;
  analisadas: number;
  comAcao: number;
  ultimaEm: string;
  ultimoTexto: string;
  acoes: AcaoWhatsapp[];
}

export interface InstanciaWhatsapp {
  nome: string;
  origem: "declarada" | "escuta";
  conversas: number;
  ultimaEm: string;
  declaradaNoEnv: boolean;
}

export interface WhatsappPainel {
  medidoEm: string;
  host: string;
  escutaViva: boolean;
  instancias: InstanciaWhatsapp[];
  conversas: ConversaWhatsapp[];
  canais: CanalAtendimentoWhatsapp[];
  resumo: {
    instancias: number;
    conversas: number;
    mensagens: number;
    analisadas: number;
    pendentes: number;
    comAcao: number;
  };
  falta: string[];
}

/** Canal de atendimento (EGOS-ATENDE-CANAIS-001, corte Enio 16/09): um canal casa um
 *  número/ grupo do WhatsApp a um modelo e um CLI (claude | opencode) — a triagem por
 *  ORIGEM escolhe o canal (resolverCanal), o canal decide modelo e CLI. Nada hardcoded:
 *  vem de EGOS_WPP_CANAIS (JSON), com fallback fixo CANAIS_FALLBACK. */
export interface CanalAtendimentoWhatsapp {
  nome: string;
  modelo: string;
  cli: string;
  tmux: string;
  esforco?: string;
  quemEntra: string;
  sessaoViva: boolean;
  sessionId: string | null;
  atualizadoEm?: string;
}

interface Cursor { jid: string; instancia: string; ultimoTsIso: string }

/** cursores da ponte: uma conversa escutada por arquivo. Arquivo ilegível é ignorado
 *  (nunca derruba o painel), mas conta como falta declarada. */
export function lerCursores(dir = EGOS_DIR): { cursores: Cursor[]; ilegiveis: number } {
  if (!existsSync(dir)) return { cursores: [], ilegiveis: 0 };
  const cursores: Cursor[] = [];
  let ilegiveis = 0;
  for (const arq of readdirSync(dir)) {
    if (!arq.startsWith("whatsapp-ponte.cursor.") || !arq.endsWith(".json")) continue;
    try {
      const j = JSON.parse(readFileSync(join(dir, arq), "utf8")) as Record<string, unknown>;
      const jid = typeof j["jid"] === "string" ? j["jid"] : "";
      if (!jid) { ilegiveis++; continue; }
      cursores.push({
        jid,
        instancia: typeof j["instancia"] === "string" ? j["instancia"] : "⚪",
        ultimoTsIso: typeof j["ultimoTsIso"] === "string" ? j["ultimoTsIso"] : "",
      });
    } catch { ilegiveis++; }
  }
  return { cursores, ilegiveis };
}

/** "Grupo: X\nAutor: Y\nTexto: Z" — formato gravado pelo whatsapp-ponte.ts no corpo do job. */
function lerCorpo(corpo: string): { autor: string; texto: string } {
  const autor = /^Autor:\s*(.+)$/m.exec(corpo);
  const texto = /^Texto:\s*([\s\S]*)$/m.exec(corpo);
  return {
    autor: autor?.[1]?.trim() ?? "",
    texto: (texto?.[1] ?? "").trim().replace(/\s+/g, " ").slice(0, 160),
  };
}

interface JobWpp {
  jid: string;
  agente: string;
  estado: "pendente" | "em-andamento" | "analisada";
  quando: string;
  autor: string;
  texto: string;
  resultado: string;
}

/** varre a fila inteira e devolve só o que veio do WhatsApp (de: "whatsapp:<jid>"). */
export function lerJobsWhatsapp(base = BASE): JobWpp[] {
  if (!existsSync(base)) return [];
  const pastas: Array<[string, JobWpp["estado"]]> = [
    ["pendentes", "pendente"],
    ["em-andamento", "em-andamento"],
    ["concluidos", "analisada"],
  ];
  const jobs: JobWpp[] = [];
  // lista os agentes do `base` RECEBIDO (não do BASE do módulo) — é o que deixa o golden
  // apontar para uma fila-fixture sem depender da fila real desta máquina.
  const agentes = base === BASE
    ? listarAgentes()
    : readdirSync(base).filter((a) => existsSync(join(base, a, "pendentes")) || existsSync(join(base, a, "concluidos")));
  for (const agente of agentes) {
    for (const [pasta, estado] of pastas) {
      const dir = join(base, agente, pasta);
      if (!existsSync(dir)) continue;
      for (const arq of listarOrdenado(dir)) {
        const j = lerJobSeguro(join(dir, arq));
        if (!j) continue;
        const de = typeof j["de"] === "string" ? j["de"] : "";
        if (!de.startsWith("whatsapp:")) continue;
        const corpo = typeof j["corpo"] === "string" ? j["corpo"] : "";
        const { autor, texto } = lerCorpo(corpo);
        jobs.push({
          jid: de.slice("whatsapp:".length),
          agente,
          estado,
          quando: (typeof j["concluidoEm"] === "string" && j["concluidoEm"])
            || (typeof j["criadoEm"] === "string" ? j["criadoEm"] : ""),
          autor,
          texto,
          resultado: typeof j["resultado"] === "string" ? j["resultado"].trim() : "",
        });
      }
    }
  }
  return jobs;
}

/** escuta viva = processo `whatsapp-ponte.ts escutar` rodando nesta máquina. Sem processo,
 *  as mensagens novas do grupo NÃO estão entrando na fila — e isso se diz, não se omite. */
async function escutaViva(): Promise<boolean> {
  try {
    const proc = Bun.spawn(["pgrep", "-f", "whatsapp-ponte.ts escutar"], { stdout: "pipe", stderr: "pipe" });
    const out = (await new Response(proc.stdout).text()).trim();
    await proc.exited;
    return out.length > 0;
  } catch { return false; }
}

/** coleta os canais de atendimento (EGOS-ATENDE-CANAIS-001): EGOS_WPP_CANAIS (JSON) →
 *  canal com modelo/cli/estado da sessão. Estado vem do disco (~/.egos/state/whatsapp-sessao-*.json);
 *  ilegível/ausente = sessão nunca subiu (⚪), nunca inventa. Nenhum processo é tocado. */
function coletarCanaisAtendimento(): CanalAtendimentoWhatsapp[] {
  if (!canaisPuro || !canaisEstado) return [];
  const canais = canaisPuro.lerCanaisDeJson(jsonCanaisAtivos());
  return canais.map((c) => {
    const estadoPath = canaisEstado.estadoTmuxPathPorCanal(c, HOME);
    let sessaoViva = false;
    let sessionId: string | null = null;
    let atualizadoEm: string | undefined;
    try {
      if (existsSync(estadoPath)) {
        const d = JSON.parse(readFileSync(estadoPath, "utf-8")) as {
          sessionId?: string; iniciada?: boolean; atualizadoEm?: string;
        };
        sessaoViva = d.iniciada === true;
        sessionId = typeof d.sessionId === "string" && d.sessionId ? d.sessionId : null;
        atualizadoEm = typeof d.atualizadoEm === "string" ? d.atualizadoEm : undefined;
      }
    } catch {
      sessaoViva = false; // ⚪ ilegível — nunca afirma viva sem prova
    }
    return {
      nome: c.nome,
      modelo: c.modelo,
      cli: c.cli ?? "claude",
      tmux: c.tmux,
      esforco: c.esforco,
      quemEntra: c.quemEntra,
      sessaoViva,
      sessionId,
      atualizadoEm,
    };
  });
}

export async function montarWhatsapp(): Promise<WhatsappPainel> {
  const medidoEm = new Date().toISOString();
  const host = (process.env.EVOLUTION_API_URL ?? "").trim();
  const declarada = (process.env.WHATSAPP_INSTANCE ?? process.env.EVOLUTION_INSTANCE ?? "").trim();
  const { cursores, ilegiveis } = lerCursores();
  const jobs = lerJobsWhatsapp();

  const porJid = new Map<string, ConversaWhatsapp>();
  const instanciaDoJid = new Map(cursores.map((c) => [c.jid, c.instancia]));
  for (const c of cursores) {
    porJid.set(c.jid, {
      jid: c.jid,
      tipo: c.jid.endsWith("@g.us") ? "grupo" : "pessoa",
      instancia: c.instancia,
      autores: [], mensagens: 0, pendentes: 0, emAndamento: 0, analisadas: 0, comAcao: 0,
      ultimaEm: c.ultimoTsIso, ultimoTexto: "", acoes: [],
    });
  }
  for (const j of jobs) {
    let conv = porJid.get(j.jid);
    if (!conv) {
      conv = {
        jid: j.jid,
        tipo: j.jid.endsWith("@g.us") ? "grupo" : "pessoa",
        instancia: instanciaDoJid.get(j.jid) ?? declarada ?? "⚪",
        autores: [], mensagens: 0, pendentes: 0, emAndamento: 0, analisadas: 0, comAcao: 0,
        ultimaEm: "", ultimoTexto: "", acoes: [],
      };
      porJid.set(j.jid, conv);
    }
    conv.mensagens++;
    if (j.estado === "pendente") conv.pendentes++;
    else if (j.estado === "em-andamento") conv.emAndamento++;
    else conv.analisadas++;
    if (j.autor && !conv.autores.includes(j.autor)) conv.autores.push(j.autor);
    if (j.quando && j.quando >= conv.ultimaEm) { conv.ultimaEm = j.quando; conv.ultimoTexto = j.texto; }
    if (j.resultado) {
      conv.comAcao++;
      conv.acoes.push({ quando: j.quando, agente: j.agente, resultado: j.resultado.slice(0, 300) });
    }
  }
  const conversas = [...porJid.values()].sort((a, b) => (b.ultimaEm || "").localeCompare(a.ultimaEm || ""));
  for (const c of conversas) c.acoes = c.acoes.sort((a, b) => (b.quando || "").localeCompare(a.quando || "")).slice(0, 5);

  const instMap = new Map<string, InstanciaWhatsapp>();
  if (declarada) {
    instMap.set(declarada, { nome: declarada, origem: "declarada", conversas: 0, ultimaEm: "", declaradaNoEnv: true });
  }
  for (const c of conversas) {
    if (!c.instancia || c.instancia === "⚪") continue;
    const atual = instMap.get(c.instancia) ?? {
      nome: c.instancia, origem: "escuta" as const, conversas: 0, ultimaEm: "", declaradaNoEnv: c.instancia === declarada,
    };
    atual.conversas++;
    if ((c.ultimaEm || "") > atual.ultimaEm) atual.ultimaEm = c.ultimaEm;
    instMap.set(c.instancia, atual);
  }

  const falta: string[] = [];
  if (!host) falta.push("EVOLUTION_API_URL não declarada nesta máquina — sem host não dá para medir ao vivo");
  if (!declarada) falta.push("WHATSAPP_INSTANCE/EVOLUTION_INSTANCE não declarada em .env.local");
  if (ilegiveis > 0) falta.push(`${ilegiveis} cursor(es) da ponte ilegíveis em ${EGOS_DIR}`);
  const viva = await escutaViva();
  if (conversas.length > 0 && !viva) {
    falta.push("nenhum processo `whatsapp-ponte.ts escutar` rodando — mensagem nova do grupo NÃO entra na fila agora");
  }

  if (MOTIVO_CANAIS_AUSENTES) falta.push(`canais de atendimento não medidos — ${MOTIVO_CANAIS_AUSENTES}`);

  return {
    medidoEm,
    host,
    escutaViva: viva,
    instancias: [...instMap.values()].sort((a, b) => b.conversas - a.conversas),
    conversas,
    canais: coletarCanaisAtendimento(),
    resumo: {
      instancias: instMap.size,
      conversas: conversas.length,
      mensagens: conversas.reduce((s, c) => s + c.mensagens, 0),
      analisadas: conversas.reduce((s, c) => s + c.analisadas, 0),
      pendentes: conversas.reduce((s, c) => s + c.pendentes + c.emAndamento, 0),
      comAcao: conversas.reduce((s, c) => s + c.comAcao, 0),
    },
    falta,
  };
}
