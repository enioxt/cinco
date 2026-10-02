/**
 * rotas-agente-canal.ts — JANELA-AGENTE-WHATSAPP-001 (corte Enio 15/09 15:10, print das
 * duas janelas tmux `egos-whatsapp`/`egos-cinco`: "quero esse PID dentro do EGOS APP, sem
 * visual de terminal"). GET /api/agente + POST /api/agente/enviar.
 *
 * REUSE-FIRST (R2.5): o parser de JSONL (texto/tool_use/tool_result/markdown/diff) JÁ EXISTE
 * em coletores-agentes.ts (`lerEspelhoDaSessao`, por trás de /api/sessao) — este arquivo NÃO
 * reimplementa parsing de transcript. Ele só (a) resolve qual sessionId pertence a qual canal
 * de WhatsApp (`whatsapp-sessao-canais.ts` + `whatsapp-sessao-puro.ts`, ambos já existentes),
 * (b) filtra os turnos por `desde` (o motor de sessão devolve os N últimos, não por offset —
 * o delta é feito aqui, no front do resultado, não duplicando a leitura do arquivo), (c)
 * classifica a entrada injetada pela ponte WhatsApp (prefixo "📨 WhatsApp de", formato fixo
 * de `montarPromptInjecao` em whatsapp-sessao-puro.ts) como papel `entrada-whatsapp` em vez
 * de `humano` genérico, e (d) manda o envio pelo MESMO injetor (`injetarMensagem`,
 * scripts/whatsapp-sessao.ts) que o motor de produção usa — zero segunda implementação de
 * `tmux send-keys`.
 *
 * P4 — telefone nunca aparece: `autor` da linha injetada pode ser um JID numérico (contato
 * sem apelido resolvido); JID bruto e telefone formatado são mascarados antes de sair pela rota
 * (mesmo padrão de `coletores-conversas.ts`, que já trunca/mascara dado de terceiro — aqui a
 * régua é mais estreita: dígito, não pessoa).
 */
import { existsSync, readFileSync, readSync, openSync, closeSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { lerEspelhoDaSessao, type TurnoEspelho } from "./coletores-agentes";
import { mascararTelefones } from "./coletores-conversas";
import { carregarOpcional, motivoAusente, respostaIndisponivel } from "./opcional";

// Sessão de canal de WhatsApp é integração pessoal: os 3 módulos abaixo não viajam no kit
// público. Ausentes = o painel do agente responde `disponivel:false`, o servidor sobe.
type CanalConfig = import("../lib/whatsapp-sessao-puro").CanalConfig;
const sessaoPuro = await carregarOpcional(() => import("../lib/whatsapp-sessao-puro"), "../lib/whatsapp-sessao-puro");
const sessaoCanais = await carregarOpcional(() => import("../lib/whatsapp-sessao-canais"), "../lib/whatsapp-sessao-canais");
// Import de módulo — seguro: whatsapp-sessao.ts só executa `main()` sob `import.meta.main`
// (guarda no rodapé do arquivo), então importar as funções puras/exportadas aqui não sobe
// nenhuma sessão nem toca a fila.
const sessaoMotor = await carregarOpcional(() => import("../whatsapp-sessao"), "../whatsapp-sessao");
const NOME_AUSENTE: string | null = !sessaoPuro
  ? "whatsapp-sessao-puro"
  : !sessaoCanais
    ? "whatsapp-sessao-canais"
    : !sessaoMotor
      ? "whatsapp-sessao"
      : null;

const HOME = process.env.HOME ?? homedir();

/** Os 3 módulos de canal juntos, ou erro dito — os handlers HTTP checam `NOME_AUSENTE` antes;
 *  aqui só o caminho programático (teste) que chamar sem os módulos falha VISÍVEL, sem inventar. */
function modulosDeCanal() {
  if (!sessaoCanais || !sessaoMotor) throw new Error(motivoAusente(NOME_AUSENTE ?? "whatsapp-sessao"));
  return { ...sessaoCanais, ...sessaoMotor };
}

function canaisConfigurados(): CanalConfig[] {
  if (!sessaoPuro) return [];
  return sessaoPuro.lerCanaisDeJson(process.env.EGOS_WPP_CANAIS); // já degrada para CANAIS_FALLBACK por dentro
}

function canalPorNome(nome: string): CanalConfig | null {
  return canaisConfigurados().find((c) => c.nome === nome) ?? null;
}

function lerSessionIdDoCanal(canal: CanalConfig): string | null {
  if (!sessaoCanais) return null;
  const caminho = sessaoCanais.estadoTmuxPathPorCanal(canal, HOME);
  try {
    const d = JSON.parse(readFileSync(caminho, "utf-8")) as { sessionId?: string };
    return typeof d.sessionId === "string" && d.sessionId ? d.sessionId : null;
  } catch {
    return null; // ⚪ NÃO-MEDIDO: canal nunca subiu / estado ilegível — nunca inventa id
  }
}

const RE_INJETADO = /^📨 WhatsApp de (.+?) às ([\d:]+): «/;
// AGENTE-PAINEL-PROMPT-001 (corte Enio 15/09, bug medido: sessão recebeu 6x o mesmo "oi" e
// não sabia "onde responder" — o prefixo antigo não distinguia painel de WhatsApp nem
// instruía a sessão a responder EM TEXTO, aqui mesmo). Forma fixa, casada por prefixo — a
// mesma técnica de RE_INJETADO para o WhatsApp.
const RE_INJETADO_PAINEL = /^🖥️ Mensagem do Enio pelo EGOS APP às /;
// AGENTE-WEB-001 (corte Enio 23/09): prefixo fixo da entrada injetada pelo servidor público
// `scripts/agente-web.ts` (visitante com link secreto, fora da máquina do Enio) — mesma
// técnica de RE_INJETADO/RE_INJETADO_PAINEL, casada ANTES do fallback "sistema". Checada
// depois do painel (mais específico primeiro não importa aqui — prefixos não colidem).
const RE_INJETADO_SITE = /^🌐 Mensagem pelo site egos\.ia\.br\/egos de /;

export type PapelAgenteCanal = "entrada-whatsapp" | "entrada-painel" | "entrada-site" | "agente" | "ferramenta" | "sistema";

export interface MensagemAgenteCanal {
  papel: PapelAgenteCanal;
  hora: string;
  texto: string;
  html?: string;
  ferramenta?: { nome: string; resumo: string; ok: boolean | null; resultado: string };
}

/** 1 TurnoEspelho pode virar N mensagens (o turno do agente carrega texto + N ferramentas).
 *  Exportada (não só usada internamente) para golden de classificação sem precisar montar um
 *  arquivo de sessão real — ver rotas-agente-canal.test.ts. */
export function turnoParaMensagens(t: TurnoEspelho): MensagemAgenteCanal[] {
  const out: MensagemAgenteCanal[] = [];
  if (t.papel === "humano") {
    const texto = mascararTelefones(t.texto);
    // "sistema" aqui é o fallback honesto: um turno "humano" sem prefixo reconhecido não é
    // entrada de WhatsApp/painel comprovada (pode ser injeção manual de debug) — não afirmamos
    // "entrada-whatsapp"/"entrada-painel" sem a forma exata que a prova exige (=P1, cadeia de
    // proveniência). Painel checado ANTES do WhatsApp — prefixos não colidem, mas a ordem é a
    // do gate mais específico primeiro.
    const papel: PapelAgenteCanal = RE_INJETADO_PAINEL.test(t.texto)
      ? "entrada-painel"
      : RE_INJETADO_SITE.test(t.texto)
        ? "entrada-site"
        : RE_INJETADO.test(t.texto)
          ? "entrada-whatsapp"
          : "sistema";
    out.push({ papel, hora: t.hora, texto });
  } else {
    // O front prioriza `html` quando ele existe. Sanitizar só `texto` deixaria o número
    // reaparecer pela renderização Markdown — P4 precisa valer nos dois caminhos.
    if (t.texto) out.push({
      papel: "agente", hora: t.hora, texto: mascararTelefones(t.texto),
      html: t.html ? mascararTelefones(t.html) : undefined,
    });
    for (const f of t.ferramentas) {
      out.push({
        papel: "ferramenta",
        hora: t.hora,
        texto: mascararTelefones(`${f.nome}: ${f.resumo}`),
        ferramenta: { nome: mascararTelefones(f.nome), resumo: mascararTelefones(f.resumo), ok: f.ok, resultado: mascararTelefones(f.resultado).slice(0, 2000) },
      });
    }
  }
  return out;
}

/** Contexto/tokens do último turno de assistente — leitura best-effort, cauda do arquivo
 *  (mesmo padrão de `cabecalhoDoTranscript`, mas na PONTA). Ausente = null (⚪), nunca 0 fingido. */
function tokensDaCauda(caminho: string): number | null {
  try {
    const tam = statSync(caminho).size;
    const janela = Math.min(tam, 64 * 1024);
    const fd = openSync(caminho, "r");
    const buf = Buffer.alloc(janela);
    readSync(fd, buf, 0, janela, tam - janela);
    closeSync(fd);
    const linhas = buf.toString("utf-8").split("\n").filter((l) => l.trim());
    for (let i = linhas.length - 1; i >= 0; i--) {
      try {
        const d = JSON.parse(linhas[i]!) as { message?: { usage?: Record<string, number> } };
        const u = d.message?.usage;
        if (u) {
          const soma = (u.input_tokens ?? 0) + (u.output_tokens ?? 0) + (u.cache_read_input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0);
          return soma > 0 ? soma : null;
        }
      } catch { /* linha truncada na borda da janela — tenta a anterior */ }
    }
  } catch { /* ⚪ ilegível */ }
  return null;
}

export interface RespostaAgenteCanal {
  ok: boolean;
  canal: string;
  erro?: string;
  status: "vivo" | "ocupado" | "ocioso" | "morta";
  modelo: string | null;
  desdeQuando: string | null;
  contextoTokens: number | null;
  mensagens: MensagemAgenteCanal[];
  desdeNovo: string;
  medidoEm: string;
}

export function montarAgenteCanal(nomeCanal: string, desde: string): RespostaAgenteCanal {
  const medidoEm = new Date().toISOString();
  const canal = canalPorNome(nomeCanal);
  if (!canal) {
    return { ok: false, canal: nomeCanal, erro: `canal desconhecido: ${nomeCanal}`, status: "morta", modelo: null, desdeQuando: null, contextoTokens: null, mensagens: [], desdeNovo: desde, medidoEm };
  }
  const sessionId = lerSessionIdDoCanal(canal);
  const { tmuxSessaoPorCanal, temSessaoViva, ociosoPathPorCanal } = modulosDeCanal();
  const tmuxSessao = tmuxSessaoPorCanal(canal, HOME);
  const vivo = temSessaoViva(tmuxSessao);
  const ociosoPath = ociosoPathPorCanal(canal, HOME);
  const status: RespostaAgenteCanal["status"] = !vivo ? "morta" : existsSync(ociosoPath) ? "ocioso" : "ocupado";
  if (!sessionId) {
    return { ok: true, canal: canal.nome, status, modelo: canal.modelo, desdeQuando: null, contextoTokens: null, mensagens: [], desdeNovo: desde, medidoEm };
  }
  const espelho = lerEspelhoDaSessao(500, sessionId);
  if (!espelho.ok) {
    return { ok: true, canal: canal.nome, status, modelo: canal.modelo, desdeQuando: null, contextoTokens: null, mensagens: [], desdeNovo: desde, medidoEm, erro: String(espelho.erro ?? "") };
  }
  const turnos = (espelho.turnos as TurnoEspelho[]) ?? [];
  const filtrados = desde ? turnos.filter((t) => t.hora > desde) : turnos.slice(-40);
  const mensagens = filtrados.flatMap(turnoParaMensagens);
  const desdeNovo = turnos.length ? turnos[turnos.length - 1]!.hora : desde;
  const fonte = String(espelho.fonte ?? "");
  return {
    ok: true,
    canal: canal.nome,
    status,
    modelo: canal.modelo,
    desdeQuando: null,
    contextoTokens: fonte ? tokensDaCauda(fonte) : null,
    mensagens,
    desdeNovo,
    medidoEm,
  };
}

export async function tratarAgenteGet(url: URL): Promise<Response> {
  if (NOME_AUSENTE) return respostaIndisponivel(NOME_AUSENTE);
  const canal = (url.searchParams.get("canal") ?? "").trim().replace(/[^a-z0-9-]/gi, "");
  const desde = (url.searchParams.get("desde") ?? "").trim();
  if (!canal) return Response.json({ ok: false, erro: "parâmetro canal ausente (enio-dm|cinco)" }, { status: 400 });
  return Response.json(montarAgenteCanal(canal, desde));
}

// IDEMPOTENCIA-ENVIO-PAINEL-001 (corte Enio 15/09, bug medido: 1 clique → 6 injeções
// idênticas na sessão tmux). O cliente manda `id_envio` (uuid gerado no clique); repetir o
// MESMO id dentro da janela abaixo nunca injeta 2x — devolve {duplicado:true} com 200, nunca
// erro (repetição não é falha, é a defesa funcionando). Mapa em memória: este servidor é
// single-process/127.0.0.1 (mesmo gate da rota), não precisa de storage compartilhado.
const ENVIOS_RECENTES = new Map<string, number>(); // chave `${canal}:${id_envio}` → epoch ms
const DEDUP_JANELA_MS = 60_000;

function envioRepetido(chave: string, agoraMs: number): boolean {
  for (const [k, t] of ENVIOS_RECENTES) if (agoraMs - t > DEDUP_JANELA_MS) ENVIOS_RECENTES.delete(k); // varre e podera junto (mapa pequeno)
  return ENVIOS_RECENTES.has(chave);
}

/** montarPromptPainel — PURA. Prefixo fixo (casado por `RE_INJETADO_PAINEL` acima) que (a)
 *  distingue esta entrada de uma mensagem de WhatsApp real e (b) instrui a sessão ONDE
 *  responder — antes disso a sessão recebia texto ambíguo e procurava (sem achar) uma rota
 *  "responder ao painel" que não existe; a resposta dela é só texto normal, lido pelo
 *  próximo GET /api/agente. */
export function montarPromptPainel(texto: string, quando: Date = new Date()): string {
  const horaLocal = quando.toLocaleTimeString("pt-BR", { hour12: false, timeZone: "America/Sao_Paulo" });
  const dataLocal = quando.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  return (
    `🖥️ Mensagem do Enio pelo EGOS APP às ${horaLocal} de ${dataLocal}: «${texto}». ` +
    "Responda aqui mesmo, em texto: esta resposta aparece na janela Agentes do app. NÃO envie pelo WhatsApp."
  );
}

/** POST /api/agente/enviar — SÓ 127.0.0.1 (P2: ação que muda estado — mais estreito que o
 *  gate geral do servidor, que permite rede com token; injetar em tmux não é leitura). */
export async function tratarAgenteEnviar(req: Request, ipRemoto: string | null): Promise<Response> {
  const local = ipRemoto === "127.0.0.1" || ipRemoto === "::1" || ipRemoto === "::ffff:127.0.0.1";
  if (!local) return Response.json({ ok: false, erro: "recusado: só requisição local (127.0.0.1) pode enviar" }, { status: 403 });
  if (NOME_AUSENTE) return respostaIndisponivel(NOME_AUSENTE);
  const { tmuxSessaoPorCanal, temSessaoViva, injetarMensagem } = modulosDeCanal();
  let corpo: { canal?: string; texto?: string; id_envio?: string };
  try { corpo = await req.json(); } catch { return Response.json({ ok: false, erro: "corpo JSON inválido" }, { status: 400 }); }
  const nomeCanal = String(corpo.canal ?? "").trim();
  const texto = String(corpo.texto ?? "").trim();
  const idEnvio = String(corpo.id_envio ?? "").trim();
  if (!nomeCanal || !texto) return Response.json({ ok: false, erro: "canal e texto são obrigatórios" }, { status: 400 });
  const canal = canalPorNome(nomeCanal);
  if (!canal) return Response.json({ ok: false, erro: `canal desconhecido: ${nomeCanal}` }, { status: 400 });
  const tmuxSessao = tmuxSessaoPorCanal(canal, HOME);
  if (!temSessaoViva(tmuxSessao)) return Response.json({ ok: false, erro: "sessão do canal não está viva (PID ausente)" }, { status: 409 });
  const agoraMs = Date.now();
  if (idEnvio) {
    const chave = `${canal.nome}:${idEnvio}`;
    if (envioRepetido(chave, agoraMs)) {
      return Response.json({ ok: true, canal: canal.nome, duplicado: true, enviadoEm: new Date(ENVIOS_RECENTES.get(chave)!).toISOString() });
    }
    ENVIOS_RECENTES.set(chave, agoraMs);
  }
  const r = injetarMensagem(montarPromptPainel(texto, new Date(agoraMs)), tmuxSessao);
  if (!r.ok) return Response.json({ ok: false, erro: r.motivo }, { status: 500 });
  return Response.json({ ok: true, canal: canal.nome, enviadoEm: new Date(agoraMs).toISOString() });
}
