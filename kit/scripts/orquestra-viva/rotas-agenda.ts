/**
 * rotas-agenda.ts — módulo Agenda do EGOS APP (AGENDA-PASSADO-OPACO-001 + AGENDA-HOJE-COM-CARGA-001
 * + AGENDA-FUTURO-QUE-AVISA-001, corte Enio 10/09). Dá corpo à gaveta "agenda" que já existia
 * (fontes + dias futuros, servidos por `/agenda` → `montarAgenda()`); este arquivo é NOVO e
 * acrescenta as outras duas funções que faltavam:
 *
 *   passado = PROVA  — `coletarPassado()` (git log, módulo comum agenda-metricas.ts)
 *   hoje    = CARGA  — mediana comparável (mesma hora-do-dia, não dia inteiro) + alerta de descanso
 *   futuro  = AVISO  — reusa `montarAgenda()` sem mudança (já servido em `/agenda`)
 *
 * DEFEITO CONHECIDO E COMO FOI RESOLVIDO (comparar hoje pela metade com dias inteiros diz
 * "você fez pouco" toda manhã): `coletarPassado(dias, horaCorte)` conta, para cada dia
 * anterior, só os commits que aconteceram ANTES da mesma hora de agora — a régua vira
 * "mediana comparável", não a mediana do dia inteiro. As DUAS medianas viajam no payload e a
 * tela mostra qual foi usada e por quê (nunca esconde a decisão de desenho).
 *
 * "ACESSO DIRETO AO CLAUDE": `tratarAgendaMandar` NÃO reimplementa correlação — chama
 * `scripts/start-contexto.ts` (motor determinístico já existente, mesmo usado por
 * `agenda-preparar.ts`) para achar o que a máquina já sabe sobre o título, e posta na fila
 * via `scripts/fila.ts postar` (mesmo binário que `/comando` já usa). Timeout curto: uma
 * correlação lenta não pode travar o clique do dono.
 */
import { agenteValido, REPO_DIR } from "./nucleo";
import { montarAgenda, type Agenda } from "../agenda-unificada";
import { carregarOpcional, corpoIndisponivel } from "./opcional";

// Métricas pessoais (histórico do dono): não viajam no kit público — ausente = `disponivel:false`.
type DiaPassado = import("../agenda-metricas").DiaPassado;
const NOME_MODULO = "agenda-metricas";
const metricas = await carregarOpcional(() => import("../agenda-metricas"), "../agenda-metricas");

const JANELA_PASSADO_DIAS = 21;
/** Acima de 1.5× a mediana do dia inteiro, por N dias seguidos, é o sinal de "fiz muito
 *  demais" que a régua tem que enxergar como FORMA (corrida), não como 1 pico isolado. */
const FATOR_ALERTA = 1.5;
const SEQUENCIA_ALERTA = 3;

export interface HojeAgenda {
  data: string;
  /** commits de hoje até agora — dia sempre parcial enquanto o dia não termina. */
  commits: number;
  horaAgora: string;
  regua: {
    /** mediana do dia INTEIRO dos dias anteriores — mostrada por transparência, mas NÃO é o
     *  que decide o veredito de hoje (compará-la com um dia pela metade mentiria). */
    medianaDiaInteiro: number;
    /** mediana comparável: só os commits de cada dia anterior até a MESMA hora de agora —
     *  esta é a que decide o veredito. */
    medianaComparavel: number;
    diasBase: number;
  };
  veredito: "acima" | "dentro" | "abaixo" | "sem-base";
  alertaDescanso: { ativo: boolean; sequenciaDias: number };
}

export interface AgendaCompleta {
  geradoEm: string;
  passado: { dias: DiaPassado[]; avisoGit?: string };
  hoje: HojeAgenda;
  futuro: Agenda | { erro: string };
}

function horaAgoraFracionaria(agora: Date): number {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(agora);
  const h = Number(partes.find((p) => p.type === "hour")?.value ?? "0");
  const m = Number(partes.find((p) => p.type === "minute")?.value ?? "0");
  return h + m / 60;
}

export function montarAgendaCompleta(agora: Date = new Date()): AgendaCompleta | ReturnType<typeof corpoIndisponivel> {
  if (!metricas) return corpoIndisponivel(NOME_MODULO);
  const { coletarPassado, mediana, maiorSequenciaAcima } = metricas;
  const horaAgora = horaAgoraFracionaria(agora);
  const hojeIso = agora.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  const r = coletarPassado(JANELA_PASSADO_DIAS, horaAgora, REPO_DIR);

  const diaDeHoje = r.dias.find((d) => d.data === hojeIso);
  const anteriores = r.dias.filter((d) => d.data !== hojeIso);
  const medianaDiaInteiro = mediana(anteriores.map((d) => d.commits));
  const medianaComparavel = mediana(anteriores.map((d) => d.comparavelAteAgora));
  const commitsHoje = diaDeHoje?.commits ?? 0;

  let veredito: HojeAgenda["veredito"] = "sem-base";
  if (anteriores.length > 0) {
    if (medianaComparavel === 0) {
      veredito = commitsHoje > 0 ? "acima" : "dentro";
    } else {
      const razao = commitsHoje / medianaComparavel;
      veredito = razao > 1.3 ? "acima" : razao > 0.5 ? "dentro" : "abaixo";
    }
  }
  const sequencia = maiorSequenciaAcima(anteriores, medianaDiaInteiro * FATOR_ALERTA);

  const hoje: HojeAgenda = {
    data: hojeIso,
    commits: commitsHoje,
    horaAgora: agora.toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" }),
    regua: { medianaDiaInteiro, medianaComparavel, diasBase: anteriores.length },
    veredito,
    alertaDescanso: { ativo: sequencia >= SEQUENCIA_ALERTA, sequenciaDias: sequencia },
  };

  let futuro: Agenda | { erro: string };
  try {
    futuro = montarAgenda();
  } catch (e) {
    // R13-c: a agenda futura NÃO some da tela em silêncio — vira {erro}, e a tela diz
    // "não consegui medir", nunca desenha um futuro vazio como se não houvesse compromisso.
    futuro = { erro: e instanceof Error ? e.message : String(e) };
  }

  return {
    geradoEm: agora.toISOString(),
    passado: { dias: anteriores, avisoGit: r.avisoGit },
    hoje,
    futuro,
  };
}

// ── "acesso direto ao Claude" por item ──────────────────────────────────────────────────
interface Correlato {
  fonte: string;
  titulo: string;
  uma_linha: string;
  score: number;
}

const TIMEOUT_CORRELATO_MS = 12_000;
const SCORE_MINIMO_CORRELATO = 8;
const TETO_CORRELATOS = 2;

/** Reusa start-contexto.ts (o MESMO motor de agenda-preparar.ts) — nunca reimplementa
 *  correlação. Timeout curto via AbortController: um motor lento não pode travar o clique. */
async function correlatosDe(titulo: string): Promise<{ itens: Correlato[]; erro?: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_CORRELATO_MS);
  try {
    // PATH-SEM-BUN-001 (mesma defesa de tratarComando em orquestra-viva.ts, golden g85):
    // systemd não tem "bun" no PATH — spawn por process.execPath, nunca pelo nome.
    const proc = Bun.spawn([process.execPath, "scripts/start-contexto.ts", titulo, "--json"], {
      cwd: REPO_DIR,
      stdout: "pipe",
      stderr: "pipe",
      signal: controller.signal,
    });
    const stdout = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;
    if (exitCode !== 0) return { itens: [], erro: `start-contexto.ts saiu com código ${exitCode}` };
    const j = JSON.parse(stdout) as { fontes?: { nome?: string; fonte?: string; itens?: any[] }[] };
    const itens: Correlato[] = [];
    for (const f of j.fontes ?? []) {
      for (const it of f.itens ?? []) {
        if ((it.score ?? 0) >= SCORE_MINIMO_CORRELATO) {
          itens.push({ fonte: f.nome ?? f.fonte ?? "⚪", titulo: it.titulo ?? "", uma_linha: (it.uma_linha ?? "").slice(0, 180), score: it.score ?? 0 });
        }
      }
    }
    itens.sort((a, b) => b.score - a.score);
    return { itens: itens.slice(0, TETO_CORRELATOS) };
  } catch (e) {
    return { itens: [], erro: e instanceof Error ? e.message.slice(0, 160) : String(e) };
  } finally {
    clearTimeout(timer);
  }
}

export async function tratarAgendaMandar(req: Request): Promise<Response> {
  let corpoReq: { titulo?: string; quando?: string; local?: string; agente?: string };
  try {
    corpoReq = await req.json();
  } catch {
    return Response.json({ ok: false, erro: "corpo não é JSON válido" }, { status: 400 });
  }
  const titulo = (corpoReq.titulo ?? "").trim();
  if (!titulo) return Response.json({ ok: false, erro: "título vazio" }, { status: 400 });
  const agente = (corpoReq.agente ?? "prime").trim();
  if (!agenteValido(agente)) return Response.json({ ok: false, erro: `agente inexistente: ${agente}` }, { status: 400 });

  const { itens: correlatos, erro: erroCorrelato } = await correlatosDe(titulo);
  const linhaCorrelatos = correlatos.length
    ? correlatos.map((c) => `- ${c.titulo} (${c.fonte}) — ${c.uma_linha}`).join("\n")
    : erroCorrelato
      ? `⚪ correlação não rodou — ${erroCorrelato}`
      : "⚪ nada acima do corte de relevância nesta máquina";
  const corpo =
    `[agenda] ${corpoReq.quando ?? "⚪ sem data"}${corpoReq.local ? ` · ${corpoReq.local}` : ""}\n` +
    `o que esta máquina já tem sobre isto:\n${linhaCorrelatos}`;

  try {
    const proc = Bun.spawn(
      [process.execPath, "scripts/fila.ts", "postar", agente, titulo.slice(0, 120), "--de", "egos-app-agenda", "--corpo", corpo],
      { cwd: REPO_DIR, stdout: "pipe", stderr: "pipe" },
    );
    const out = (await new Response(proc.stdout).text()).trim();
    const err = (await new Response(proc.stderr).text()).trim();
    const code = await proc.exited;
    if (code !== 0) return Response.json({ ok: false, erro: err || `fila.ts saiu com código ${code}` }, { status: 500 });
    const m = out.match(/postado:\s*(.+)/);
    return Response.json({ ok: true, caminho: m ? m[1] : out, correlatos: correlatos.length });
  } catch (e) {
    return Response.json({ ok: false, erro: `spawn falhou: ${e instanceof Error ? e.message : String(e)}` }, { status: 500 });
  }
}
