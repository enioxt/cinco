/**
 * coletores-conversas.ts — GET /api/conversas (NOTIFICACOES-HISTORICO-NA-TELA-001, sub-item
 * de WHATSAPP-SESSAO-COM-REGRAS-001, corte Enio 14/09 verbatim: "apareceram notificações de
 * conversas — quem enviou, quando? onde está o histórico? Tudo isso tem que aparecer na
 * tela, dentro do EGOS APP, mostrando todas as sessões ativas").
 *
 * Timeline única, mais novos primeiro, últimas 48h por padrão. Duas fontes lidas do disco
 * (mesmo padrão de rotas-historico.ts/rotas-notificacoes.ts: fonte ilegível vira "⚪ ..." em
 * `fontes.<nome>`, nunca derruba a resposta — R13-c):
 *   1. notify-soft-queue.jsonl — dois formatos já em produção, ambos lidos por INTEIRO
 *      (nunca por cursor: rotas-notificacoes.ts já tem cursor pra "não repetir no sino"; aqui
 *      é timeline reabrível, o mesmo item aparece de novo em toda chamada dentro da janela).
 *   2. fila/<agente>/{pendentes,em-andamento,concluidos} — reusa `listarOrdenado`/
 *      `resumoDeArquivo` de nucleo.ts (recebem o diretório por parâmetro, sem depender de
 *      estado fixo). `listarAgentes()` de nucleo.ts NÃO é reusada aqui de propósito: ela lê
 *      `BASE`, uma const de TOPO calculada 1x no import do módulo (`EGOS_FILA_DIR` só conta
 *      se já estivesse setada ANTES do 1º import de nucleo.ts em todo o processo) — em
 *      suíte de teste, qualquer arquivo importado primeiro (ex.: rotas-notificacoes.test.ts)
 *      já congela `BASE` na fila REAL da máquina, e nenhum `process.env.EGOS_FILA_DIR` depois
 *      consegue mudar isso (mesmo defeito do Part A desta task, corrigido lá em
 *      notify-router.ts). `agentesDaFilaAgora()` abaixo é o pedaço equivalente (5L), lido
 *      DENTRO da chamada — dívida de duplicação pequena e declarada, não reinvenção.
 *
 * mensagens-web.ts NÃO entra como fonte própria aqui (pedido dizia "se houver arquivo
 * local") — não há: `listar()` daquele módulo consulta o Supabase por rede, e a regra da
 * casa é zero chamada de rede ao abrir gaveta (mesmo princípio do WhatsApp: lido do disco).
 * O aviso que chega quando a mensagem entra (`mensagem_web_recebida`, escrito por
 * registrarAviso() em mensagens-web-puxar.ts) já cai na fonte 1 — cobertura sem 2ª chamada.
 *
 * P4 (dado soberano): telefone/JID vira só os 4 últimos dígitos; texto de WhatsApp de quem
 * NÃO é o Enio trunca em 60 — mais estreito que o teto geral de 120 de `texto_curto`.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { listarOrdenado, resumoDeArquivo, type JobResumo } from "./nucleo";

/** Mesmo default de nucleo.ts, lido a cada chamada (não em const de topo) — ver comentário
 *  de cabeçalho sobre por que `BASE`/`listarAgentes()` de nucleo.ts não servem aqui. */
function filaBaseAgora(): string {
  return process.env.EGOS_FILA_DIR ?? join(process.env.HOME ?? "", ".egos", "fila");
}

function agentesDaFilaAgora(base: string): string[] {
  if (!existsSync(base)) return [];
  return readdirSync(base).filter((a) => {
    if (a.startsWith(".")) return false;
    try {
      return statSync(join(base, a)).isDirectory();
    } catch {
      return false;
    }
  });
}

export interface ItemConversa {
  quando: string; // ISO
  origem: string;
  quem: string;
  texto_curto: string; // ≤120, e ≤60 quando for WhatsApp de terceiro (P4)
  onde_responder: string;
  eh_teste: boolean;
}

export interface RespostaConversas {
  geradoEm: string;
  horas: number;
  itens: ItemConversa[];
  fontes: Record<string, string>;
}

// ── P4: telefone/JID nunca inteiro na tela ──────────────────────────────────────────────
// Mascara JID bruto e telefone formatado (com parênteses, espaços, pontos ou hífens), deixando
// só os 4 últimos. Aplicado a QUALQUER string exibida, não só ao campo "telefone": o dado pode
// nascer em `titulo`/`corpo`/`de`. A forma formatada vem antes do JID bruto para não deixar
// `(DD) 9XXXX-XXXX` atravessar uma superfície que se declara soberana.
export function mascararTelefones(texto: string): string {
  return texto
    .replace(/(?:\+?55[\s.-]?)?(?:\(?\d{2}\)?[\s.-]?)?\d{4,5}[\s.-]\d{4}/g, (d) => `…${d.replace(/\D/g, "").slice(-4)}`)
    .replace(/\d{8,}/g, (d) => `…${d.slice(-4)}`);
}

/** ≤120 sempre; ≤60 quando `restrito` (WhatsApp de quem não é o Enio — regra mais estreita). */
export function truncar(texto: string, restrito: boolean): string {
  const teto = restrito ? 60 : 120;
  const t = mascararTelefones(texto);
  return t.length > teto ? `${t.slice(0, teto - 1)}…` : t;
}

/** Enio é identificado pelo texto do produto ("enio"/"Enio Rocha"), nunca por telefone —
 *  o telefone já é mascarado antes de chegar aqui em qualquer caso. */
function ehEnio(quem: string): boolean {
  return /^enio\b/i.test(quem.trim());
}

/**
 * Régua de fixture (declarada aqui, não escondida): login/texto que só existe em teste.
 * Achado 14/09: `insert-falha-201` (convite.test.ts §10) vazou 6x pra fila REAL antes do
 * conserto de Part A (EGOS_NOTIFY_QUEUE). Sem lista mágica de nomes: heurística por FORMA —
 *   (a) e-mail sintético @example.com (todo teste de convite/aceite usa esse domínio);
 *   (b) login termina em "-<número>" onde o número é claramente um status HTTP de teste
 *       (200/201/204/400/401/403/404/422/429/500/502/503) — forma que login real não tem;
 *   (c) prefixo/sufixo que só aparece em fixture: "-teste"/"teste-"/"-fake-"/"-mock-"/"-dummy-"/
 *       "colaborador" seguido só de dígito ou letra única (colaborador1..5, colaborador-201…).
 * Advisory (⚪), não gate duro — falso-positivo aqui esconde um item real da tela, nunca
 * commita nem publica nada; calibra com evidência (=R11.4) se um login real cair nela.
 */
export function ehFixtureDeTeste(texto: string): boolean {
  const t = texto.toLowerCase();
  if (/@example\.com/.test(t)) return true;
  if (/-(200|201|204|400|401|403|404|422|429|500|502|503)\b/.test(t)) return true;
  if (/-(teste|fake|mock|dummy)|(teste|fake|mock|dummy)-/.test(t)) return true;
  if (/\bcolaborador[a-z0-9]{0,2}\b/.test(t)) return true;
  if (/^(painel-|repetidor-|corrida-|removido-pelo-fundador|nao-negado|dona-do-no|visitante|qualquer-um|origem-errada|sem-origin|sem-token|sem-supabase|killswitch-off|login-da-sessao)/.test(t)) return true;
  return false;
}

function caminhoAvisos(): string {
  return (process.env.EGOS_NOTIFY_QUEUE ?? "").trim() || join(process.env.HOME ?? "", ".egos", "notify-soft-queue.jsonl");
}

function dentroDaJanela(iso: string | undefined, desdeMs: number): boolean {
  if (!iso) return false;
  const t = Date.parse(iso);
  return Number.isFinite(t) && t >= desdeMs;
}

/** Extrai "quem" de eventos conhecidos da fila (título com forma previsível); sem casar
 *  nenhum padrão, "quem" é o key do evento — nunca inventado, sempre dito. */
function quemDoAvisoFormatoA(key: string, title: string): string {
  const porTitulo =
    /Novo aceite: (\S+)/.exec(title) ??
    /Convite de (\S+) /.exec(title) ??
    /Aceite de (\S+) /.exec(title) ??
    /@(\S+) mandou|de @(\S+)/.exec(title);
  const achado = porTitulo?.[1] ?? porTitulo?.[2];
  return achado ?? key;
}

/** Formato A: {ts,key,title,detail,reason,undelivered?} — já em produção (notify-router.ts,
 *  mensagens-web-puxar.ts). Formato B: {quando,origem,severidade,mensagem,onde} — WhatsApp
 *  DM/grupo (whatsapp-ponte.ts, fora de escopo desta task — só LEITURA aqui). */
function itemDaLinhaAvisos(linha: string): ItemConversa | null {
  let j: Record<string, unknown>;
  try {
    j = JSON.parse(linha);
  } catch {
    return null;
  }
  if (typeof j.quando === "string" && typeof j.mensagem === "string") {
    // Formato B — WhatsApp: "<Nome> falou em (grupo|DM): <texto>"
    const m = /^(.*?) falou em (grupo|DM):\s*(.*)$/s.exec(j.mensagem);
    const quem = m ? m[1]! : String(j.origem ?? "⚪");
    const textoBruto = m ? m[3]! : j.mensagem;
    const restrito = !ehEnio(quem);
    return {
      quando: j.quando,
      origem: String(j.origem ?? "⚪"),
      quem: mascararTelefones(quem),
      texto_curto: truncar(textoBruto, restrito),
      onde_responder: typeof j.onde === "string" ? j.onde : "⚪ sem destino declarado",
      eh_teste: ehFixtureDeTeste(String(j.origem ?? "") + " " + quem + " " + textoBruto),
    };
  }
  if (typeof j.ts === "string" && typeof j.key === "string") {
    // Formato A — notify-router/mensagens-web-puxar.
    const title = typeof j.title === "string" ? j.title : "⚪ sem título";
    const detail = typeof j.detail === "string" ? j.detail : "";
    const quem = quemDoAvisoFormatoA(j.key, title);
    const respondaMatch = /responda:\s*(.+)$/.exec(detail);
    return {
      quando: j.ts,
      origem: `notify:${j.key}`,
      quem: mascararTelefones(quem),
      texto_curto: truncar(title, false),
      onde_responder: respondaMatch ? respondaMatch[1]! : `ver ~/.egos/notify-soft-queue.jsonl (key=${j.key})`,
      eh_teste: ehFixtureDeTeste(`${j.key} ${title} ${detail} ${quem}`),
    };
  }
  return null; // linha de formato desconhecido (ex.: compact_checkpoint) — fora do escopo desta timeline
}

function itensDeAvisos(desdeMs: number): { itens: ItemConversa[]; status: string } {
  const caminho = caminhoAvisos();
  if (!existsSync(caminho)) return { itens: [], status: "⚪ NAO-MEDIDO: notify-soft-queue não existe nesta máquina" };
  try {
    const bruto = readFileSync(caminho, "utf-8");
    const itens: ItemConversa[] = [];
    for (const linha of bruto.split("\n")) {
      if (!linha.trim()) continue;
      const item = itemDaLinhaAvisos(linha);
      if (item && dentroDaJanela(item.quando, desdeMs)) itens.push(item);
    }
    return { itens, status: "ok" };
  } catch (e) {
    return { itens: [], status: `⚪ NAO-MEDIDO: notify-soft-queue ilegível (${(e as Error).message})` };
  }
}

// ── fila: pendentes + em-andamento + concluídos dentro da janela, de TODOS os agentes ────
function itemDoJob(agente: string, j: JobResumo): ItemConversa {
  const de = j.de ?? "⚪";
  return {
    quando: j.criadoEm,
    origem: `fila:${agente}`,
    quem: mascararTelefones(de),
    texto_curto: truncar(j.titulo, false),
    onde_responder: `bun scripts/fila.ts listar ${agente}`,
    eh_teste: ehFixtureDeTeste(`${de} ${j.titulo} ${j.id}`),
  };
}

function itensDaFila(desdeMs: number): { itens: ItemConversa[]; status: string } {
  const base = filaBaseAgora();
  if (!existsSync(base)) return { itens: [], status: "⚪ NAO-MEDIDO: fila não existe nesta máquina" };
  try {
    const itens: ItemConversa[] = [];
    for (const agente of agentesDaFilaAgora(base)) {
      for (const sub of ["pendentes", "em-andamento", "concluidos"] as const) {
        const dir = join(base, agente, sub);
        for (const arq of listarOrdenado(dir)) {
          const j = resumoDeArquivo(dir, arq);
          if (dentroDaJanela(j.criadoEm, desdeMs)) itens.push(itemDoJob(agente, j));
        }
      }
    }
    return { itens, status: "ok" };
  } catch (e) {
    return { itens: [], status: `⚪ NAO-MEDIDO: fila ilegível (${(e as Error).message})` };
  }
}

export function montarConversas(horas = 48): RespostaConversas {
  const desdeMs = Date.now() - horas * 60 * 60 * 1000;
  const avisos = itensDeAvisos(desdeMs);
  const fila = itensDaFila(desdeMs);
  const itens = [...avisos.itens, ...fila.itens].sort((a, b) => (a.quando < b.quando ? 1 : a.quando > b.quando ? -1 : 0)); // desc
  return {
    geradoEm: new Date().toISOString(),
    horas,
    itens,
    fontes: { avisos: avisos.status, fila: fila.status },
  };
}
