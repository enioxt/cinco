/**
 * coletores-integracoes.ts — REFATORACAO-ORGANICA-001 (04/09): extraído de orquestra-viva.ts.
 * Sondas de integrações (WhatsApp/pulse/VPS/federação/aceites/orquestra/crônica) — cada
 * sonda NUNCA lança, falha vira "nao-configurada" com o erro dito (R13). Zero mudança de
 * comportamento — só onde o código mora.
 */
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { BASE, CRONICA_DIR, REPO_DIR, lerEscuta, lerJobSeguro, listarAgentes, ultimaMedicaoPulse } from "./nucleo";

// ── INTEGRAÇÕES (corte Enio 2026-08-30 ~09h — Orquestrador App vira "o que ESTA
// máquina integrou": só mostra o que foi de fato medido, e o incompleto aparece
// apagado com dica, nunca escondido. Cada sonda NUNCA lança — falha vira "nao-configurada"
// com o erro dito no detalhe (R13: nada de 500, nada de verde fingido). ──

export type EstadoIntegracao = "ativa" | "configuravel" | "nao-configurada";

export interface Integracao {
  nome: string;
  estado: EstadoIntegracao;
  detalhe: string;
  medidoEm: string;
}

const WHATSAPP_CACHE_MS = 30_000;
let whatsappCache: { ts: number; resultado: Integracao } | null = null;

export async function sondarWhatsapp(): Promise<Integracao> {
  const agora = new Date().toISOString();
  if (whatsappCache && Date.now() - whatsappCache.ts < WHATSAPP_CACHE_MS) {
    return whatsappCache.resultado;
  }
  const base = (process.env.EVOLUTION_API_URL ?? "").replace(/\/$/, "");
  const key = process.env.EVOLUTION_API_KEY ?? "";
  if (!base || !key) {
    return {
      nome: "whatsapp",
      estado: "nao-configurada",
      detalhe: "defina EVOLUTION_API_URL e EVOLUTION_API_KEY em .env.local para conectar",
      medidoEm: agora,
    };
  }
  let resultado: Integracao;
  try {
    const r = await fetch(`${base}/instance/fetchInstances`, {
      headers: { apikey: key },
      signal: AbortSignal.timeout(6_000),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const arr = await r.json();
    const lista = Array.isArray(arr) ? arr : [];
    const instancias = lista.map((i: any) => {
      const nome = i.name ?? i.instance?.instanceName ?? "?";
      const numero = typeof i.number === "string" ? i.number : "";
      const final4 = numero ? numero.slice(-4) : "⚪";
      const estadoConexao = i.connectionStatus ?? i.instance?.state ?? "⚪";
      return { nome, final4, estadoConexao };
    });
    if (instancias.length === 0) {
      resultado = { nome: "whatsapp", estado: "configuravel", detalhe: "nenhuma instância criada ainda", medidoEm: agora };
    } else {
      const detalhe = instancias
        .map((i: { nome: string; final4: string; estadoConexao: string }) => `${i.nome} (final ${i.final4}, ${i.estadoConexao})`)
        .join(" · ");
      const temAberta = instancias.some((i: { estadoConexao: string }) => i.estadoConexao === "open");
      resultado = { nome: "whatsapp", estado: temAberta ? "ativa" : "configuravel", detalhe, medidoEm: agora };
    }
  } catch (e) {
    resultado = { nome: "whatsapp", estado: "nao-configurada", detalhe: `sonda falhou: ${(e as Error).message}`, medidoEm: agora };
  }
  whatsappCache = { ts: Date.now(), resultado };
  return resultado;
}

export function sondarPulse(): Integracao {
  const agora = new Date().toISOString();
  const ultima = ultimaMedicaoPulse();
  if (!ultima) {
    return { nome: "pulse", estado: "nao-configurada", detalhe: "rode scripts/pulse-arquivos.sh para começar a medir o disco a cada mensagem", medidoEm: agora };
  }
  return { nome: "pulse", estado: "ativa", detalhe: "disco medido a cada mensagem", medidoEm: ultima };
}

export function sondarVpsSentinela(): Integracao {
  const agora = new Date().toISOString();
  const caminho = join(process.env.HOME ?? "", ".egos", "vps-sentinela.json");
  if (!existsSync(caminho)) {
    return { nome: "vps-sentinela", estado: "nao-configurada", detalhe: "sentinela da VPS ainda não rodou nesta máquina", medidoEm: agora };
  }
  const j = lerJobSeguro(caminho);
  if (!j || typeof j.veredito !== "string") {
    return { nome: "vps-sentinela", estado: "nao-configurada", detalhe: "vps-sentinela.json existe mas não pôde ser lido", medidoEm: agora };
  }
  const caidos = Array.isArray(j.caidos) ? j.caidos.length : 0;
  const detalhe = `veredito: ${j.veredito}${caidos ? ` · ${caidos} caído(s)` : ""}`;
  const medidoEm = typeof j.medidoEm === "string" ? j.medidoEm : agora;
  return { nome: "vps-sentinela", estado: "ativa", detalhe, medidoEm };
}

/** Procura federacao*.json em ~/.egos e na raiz do repo — só 2 lugares, nunca recursivo. */
export function procurarFederacao(): string | null {
  const candidatos = [join(process.env.HOME ?? "", ".egos"), REPO_DIR];
  for (const dir of candidatos) {
    if (!existsSync(dir)) continue;
    try {
      const achado = readdirSync(dir).find((f) => /^federacao.*\.json$/i.test(f));
      if (achado) return join(dir, achado);
    } catch {
      /* diretório ilegível — segue para o próximo candidato */
    }
  }
  return null;
}

export function sondarFederacao(): Integracao {
  const agora = new Date().toISOString();
  const caminho = procurarFederacao();
  if (!caminho) {
    return { nome: "federacao", estado: "configuravel", detalhe: "crie um índice federacao*.json em ~/.egos ou na raiz do repo para o painel contar os itens", medidoEm: agora };
  }
  const j = lerJobSeguro(caminho);
  if (!j) {
    return { nome: "federacao", estado: "configuravel", detalhe: `${caminho} encontrado mas não é JSON legível`, medidoEm: agora };
  }
  // Formatos soberanos reais de ~/.egos (medidos 2026-09-01): contatos.json usa
  // {contatos,grupos}; membros.json usa {repos,eventos}. A sonda conta TAMANHOS,
  // nunca lê valores — os arquivos carregam telefone (P4, chmod 600).
  const o = j as Record<string, unknown>;
  const tam = (k: string) => (Array.isArray(o[k]) ? (o[k] as unknown[]).length : typeof o[k] === "object" && o[k] !== null ? Object.keys(o[k] as object).length : null);
  let n: number | null = null;
  let detalhe = "";
  if (Array.isArray(j)) { n = j.length; detalhe = `${n} item(ns) no índice`; }
  else if (Array.isArray(o.items)) { n = (o.items as unknown[]).length; detalhe = `${n} item(ns) no índice`; }
  else if (tam("contatos") !== null || tam("grupos") !== null) {
    const c = tam("contatos") ?? 0, g = tam("grupos") ?? 0;
    n = c + g; detalhe = `${c} contato(s) + ${g} grupo(s) no círculo declarado`;
  } else if (tam("repos") !== null || tam("eventos") !== null) {
    const r = tam("repos") ?? 0, e = tam("eventos") ?? 0;
    n = r + e; detalhe = `${r} repo(s) federado(s) · ${e} evento(s) registrados`;
  }
  if (n === null) {
    return { nome: "federacao", estado: "configuravel", detalhe: `${caminho} encontrado, formato não reconhecido — contagem não inventada`, medidoEm: agora };
  }
  return { nome: "federacao", estado: "ativa", detalhe, medidoEm: agora };
}

/**
 * Quem entrou pela porta do cinco (federacao_aceites). Mostra login + quando,
 * nunca e-mail — a tela é para saber QUEM chegou, não para guardar contato (P4).
 * Estado "ativa" com 0 aceites é honesto: a porta responde e ninguém entrou ainda.
 */
export async function sondarAceitesCinco(): Promise<Integracao> {
  const agora = new Date().toISOString();
  const url = (process.env.SUPABASE_URL ?? "").replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!url || !key) {
    return { nome: "cinco-entradas", estado: "nao-configurada", detalhe: "defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY para ver quem entrou pela porta do cinco", medidoEm: agora };
  }
  try {
    const r = await fetch(
      `${url}/rest/v1/federacao_aceites?select=login_github,criado_em&order=criado_em.desc&limit=50`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(6_000) },
    );
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const linhas = (await r.json()) as Array<{ login_github: string; criado_em: string }>;
    const pessoas = [...new Set(linhas.map((l) => l.login_github))];
    const outros = pessoas.filter((p) => p !== "enioxt");
    const ultimo = linhas[0]?.criado_em?.slice(0, 16).replace("T", " ") ?? "⚪";
    const detalhe = outros.length
      ? `${outros.length} pessoa(s) além do fundador: ${outros.join(", ")} · último aceite ${ultimo}`
      : `porta viva · ${linhas.length} aceite(s), só do fundador — ninguém de fora entrou ainda · último ${ultimo}`;
    return { nome: "cinco-entradas", estado: "ativa", detalhe, medidoEm: agora };
  } catch (e) {
    return { nome: "cinco-entradas", estado: "configuravel", detalhe: `não consegui ler os aceites: ${e instanceof Error ? e.message : String(e)} — NÃO-MEDIDO, não é "ninguém entrou"`, medidoEm: agora };
  }
}

export function sondarOrquestra(): Integracao {
  const agora = new Date().toISOString();
  if (!existsSync(BASE)) {
    return { nome: "orquestra", estado: "nao-configurada", detalhe: "fila ainda não existe neste disco — nenhum agente postou/escutou", medidoEm: agora };
  }
  const agentes = listarAgentes();
  let vivas = 0;
  for (const a of agentes) {
    if (lerEscuta(join(BASE, a)).status === "viva") vivas++;
  }
  return {
    nome: "orquestra",
    estado: agentes.length > 0 ? "ativa" : "configuravel",
    detalhe: `${agentes.length} agente(s) na fila · ${vivas} orelha(s) viva(s)`,
    medidoEm: agora,
  };
}

export function sondarCronica(): Integracao {
  const agora = new Date().toISOString();
  const caminho = join(CRONICA_DIR, "historia.json");
  if (!existsSync(caminho)) {
    return { nome: "cronica", estado: "configuravel", detalhe: 'clique em "📖 história" no painel para gerar a primeira crônica', medidoEm: agora };
  }
  const j = lerJobSeguro(caminho);
  if (!j || typeof j.geradoEm !== "string") {
    return { nome: "cronica", estado: "configuravel", detalhe: "historia.json existe mas não pôde ser lido", medidoEm: agora };
  }
  const tom = typeof j.tom === "string" ? j.tom : "⚪";
  return { nome: "cronica", estado: "ativa", detalhe: `narrada com tom: ${tom}`, medidoEm: j.geradoEm };
}

export async function montarIntegracoes(): Promise<{ integracoes: Integracao[]; geradoEm: string }> {
  const [whatsapp, aceites] = await Promise.all([sondarWhatsapp(), sondarAceitesCinco()]);
  const integracoes: Integracao[] = [
    whatsapp,
    aceites,
    sondarPulse(),
    sondarVpsSentinela(),
    sondarFederacao(),
    sondarOrquestra(),
    sondarCronica(),
  ];
  return { integracoes, geradoEm: new Date().toISOString() };
}

