/**
 * perfil.ts — perfil por pessoa (EGOS-APP-TEMPLATES-5-001, corte Enio 04/09: "customizável,
 * forkável; um advogado configura no app dele um fork: integrações, WhatsApp, as
 * peças que ele mais faz"). Fork = copiar o app e escrever o perfil, nunca editar o .ts
 * (EGOS_SURFACES_ROUTING.md §10.3 item 1).
 *
 * Ordem de resolução (nessa ordem, primeiro que existir vence):
 *   EGOS_PERFIL (env, caminho explícito) → ~/.egos/perfil.json → config/perfil.default.json
 * Ausente/ilegível nunca lança (=R13) — cai no perfil mínimo vazio, dito como origem "minimo".
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

export interface AtalhoPerfil {
  rotulo: string;
  tipo: "skill" | "comando" | "loop" | "agente" | string;
  id: string;
  /** integração exigida por ESTE atalho (não pelo item do catálogo — o catálogo não declara
   *  dependência de integração; quem sabe é a pessoa que escreveu o perfil). Ausente = livre. */
  integracao?: string;
}

/** Layout de UM modo de tela ("25"|"50"|"100" — MODOS-TELA-25-50-100-001, corte Enio 05/09:
 *  "escolher o que aparece mais, primeiro, maior, tudo isso, modular"). `modulos` = o que
 *  aparece e a ORDEM (primeiro = primeiro); `destaque` = id do card que ocupa 2 colunas e
 *  vem primeiro. Sem entrada para um modo, o app DERIVA de `Perfil.modulos` (compatível
 *  com perfil sem layouts — nenhum perfil existente quebra). */
export interface LayoutModo {
  modulos: string[];
  destaque?: string;
}

/** Preferência de UM tipo de notificação (SN-2-ABRIR-E-PERGUNTAR-001, programa
 *  SISTEMA-NERVOSO-DO-APP-001): `tipo` é a chave do objeto (hoje = a `fonte` de
 *  rotas-notificacoes.ts — fila/avisos/heartbeat/mesa). `respostas` guarda as últimas
 *  escolhas do humano na ORDEM em que chegaram (mais recente por último) — é sobre essa
 *  ordem que `decidirPerguntar` decide se ainda pergunta. */
export interface PreferenciaNotificacao {
  modo: string;
  auto_abrir: boolean;
  respostas: string[];
}

export interface Perfil {
  nome: string;
  dominios: string[];
  integracoes: string[];
  atalhos: AtalhoPerfil[];
  repos: string[];
  agentes: string[];
  modulos: string[];
  /** chave = modo de tela ("25"|"50"|"100"); ausente/vazio = deriva de `modulos`. */
  layouts: Record<string, LayoutModo>;
  /** chave = tipo de notificação (fila/avisos/heartbeat/mesa); ausente = nunca perguntado. */
  notificacoes: Record<string, PreferenciaNotificacao>;
  /** marca própria no cabeçalho (texto + glifo em data:image/svg local); ausente = marca EGOS. */
  marca?: { texto: string; glifo?: string };
}

export const PERFIL_MINIMO: Perfil = {
  nome: "EGOS APP",
  dominios: [],
  integracoes: [],
  atalhos: [],
  repos: [],
  agentes: [],
  modulos: [],
  layouts: {},
  notificacoes: {},
};

/** Últimas N respostas contam; a regra é "3 IGUAIS SEGUIDAS" (corte Enio, R-ESCUTA-DO-PEDIDO
 *  aplicado ao próprio app: perguntar de novo depois que a pessoa já respondeu 3x igual é
 *  gastar a atenção dela para confirmar o que ela já disse — R-PENDENCIA-1-LINHA-001 aplicado
 *  aqui). Função PURA (R-DECIDE-DETERMINISTICO-001): mesma entrada, mesma saída, sem estado
 *  escondido — o teste que embaralha a entrada é o que prova que a ORDEM importa, não a
 *  contagem total. Histórico com <3 respostas sempre pergunta (nada para inferir ainda). */
export function decidirPerguntar(historico: string[]): boolean {
  if (historico.length < 3) return true;
  const ultimasTres = historico.slice(-3);
  const todasIguais = ultimasTres.every((v) => v === ultimasTres[0]);
  return !todasIguais;
}

function comoArrayDeString(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

function normalizarAtalho(bruto: unknown): AtalhoPerfil | null {
  if (!bruto || typeof bruto !== "object") return null;
  const o = bruto as Record<string, unknown>;
  const id = typeof o.id === "string" ? o.id.trim() : "";
  if (!id) return null;
  const atalho: AtalhoPerfil = {
    rotulo: typeof o.rotulo === "string" && o.rotulo ? o.rotulo : id,
    tipo: typeof o.tipo === "string" && o.tipo ? o.tipo : "skill",
    id,
  };
  if (typeof o.integracao === "string" && o.integracao) atalho.integracao = o.integracao;
  return atalho;
}

function normalizarLayoutModo(bruto: unknown): LayoutModo | null {
  if (!bruto || typeof bruto !== "object") return null;
  const o = bruto as Record<string, unknown>;
  const modulos = comoArrayDeString(o.modulos);
  const layout: LayoutModo = { modulos };
  if (typeof o.destaque === "string" && o.destaque) layout.destaque = o.destaque;
  return layout;
}

/** Chave livre (não trava em "25"/"50"/"100" — modular, R14-j: quem decide o vocabulário
 *  é o disco, não uma lista fixa aqui), mas entrada inválida é descartada, não lança. */
export function normalizarLayouts(bruto: unknown): Record<string, LayoutModo> {
  if (!bruto || typeof bruto !== "object" || Array.isArray(bruto)) return {};
  const out: Record<string, LayoutModo> = {};
  for (const [chave, valor] of Object.entries(bruto as Record<string, unknown>)) {
    const l = normalizarLayoutModo(valor);
    if (l) out[chave] = l;
  }
  return out;
}

function normalizarPreferenciaNotificacao(bruto: unknown): PreferenciaNotificacao | null {
  if (!bruto || typeof bruto !== "object") return null;
  const o = bruto as Record<string, unknown>;
  const modo = typeof o.modo === "string" && o.modo ? o.modo : "";
  if (!modo) return null;
  return {
    modo,
    auto_abrir: o.auto_abrir === true,
    respostas: comoArrayDeString(o.respostas),
  };
}

/** Chave livre (tipo de notificação — mesmo desenho de `normalizarLayouts`: quem decide o
 *  vocabulário é o disco, não uma lista fixa aqui). Entrada inválida é descartada, não lança. */
export function normalizarNotificacoes(bruto: unknown): Record<string, PreferenciaNotificacao> {
  if (!bruto || typeof bruto !== "object" || Array.isArray(bruto)) return {};
  const out: Record<string, PreferenciaNotificacao> = {};
  for (const [chave, valor] of Object.entries(bruto as Record<string, unknown>)) {
    const p = normalizarPreferenciaNotificacao(valor);
    if (p) out[chave] = p;
  }
  return out;
}

export function normalizarPerfil(bruto: unknown): Perfil {
  const o = (bruto && typeof bruto === "object" ? bruto : {}) as Record<string, unknown>;
  const atalhos = Array.isArray(o.atalhos)
    ? (o.atalhos as unknown[]).map(normalizarAtalho).filter((a): a is AtalhoPerfil => a !== null)
    : [];
  return {
    nome: typeof o.nome === "string" && o.nome ? o.nome : PERFIL_MINIMO.nome,
    dominios: comoArrayDeString(o.dominios),
    integracoes: comoArrayDeString(o.integracoes),
    atalhos,
    repos: comoArrayDeString(o.repos),
    agentes: comoArrayDeString(o.agentes),
    modulos: comoArrayDeString(o.modulos),
    layouts: normalizarLayouts(o.layouts),
    notificacoes: normalizarNotificacoes(o.notificacoes),
    ...normalizarMarca(o.marca),
  };
}

/** Só texto e glifo local (data:image/svg+xml) — nenhum endereço externo entra pelo perfil. */
function normalizarMarca(m: unknown): { marca?: { texto: string; glifo?: string } } {
  if (!m || typeof m !== "object") return {};
  const r = m as Record<string, unknown>;
  if (typeof r.texto !== "string" || !r.texto.trim()) return {};
  const glifo = typeof r.glifo === "string" && r.glifo.startsWith("data:image/svg+xml,") ? r.glifo : undefined;
  return { marca: { texto: r.texto.trim().slice(0, 40), ...(glifo ? { glifo } : {}) } };
}

/** O que a home aplica para um modo: layout declarado (se tiver `modulos` não-vazio) ou
 *  derivado de `Perfil.modulos` (sem destaque) — mesma régua que o front replica em JS
 *  (app-layout.js) porque o navegador não importa TS; mantida aqui para reuso server-side
 *  (rotas-perfil.ts) e para o golden testar a régua uma vez só. */
export function layoutParaModo(perfil: Perfil, modo: string): LayoutModo {
  const l = perfil.layouts[modo];
  if (l && l.modulos.length) return l;
  return { modulos: perfil.modulos };
}

export type OrigemPerfil = "env" | "home" | "default" | "minimo";

export interface PerfilResolvido {
  perfil: Perfil;
  caminho: string;
  origem: OrigemPerfil;
}

/** Só decide QUAL arquivo vale — nunca lê/parseia (isso é `lerPerfil`). */
export function resolverCaminhoPerfil(repoDir: string): { caminho: string; origem: OrigemPerfil } {
  const explicito = (process.env.EGOS_PERFIL ?? "").trim();
  if (explicito && existsSync(explicito)) return { caminho: explicito, origem: "env" };
  const pessoal = join(process.env.HOME ?? "", ".egos", "perfil.json");
  if (existsSync(pessoal)) return { caminho: pessoal, origem: "home" };
  return { caminho: join(repoDir, "config", "perfil.default.json"), origem: "default" };
}

export function lerPerfil(repoDir: string): PerfilResolvido {
  const { caminho, origem } = resolverCaminhoPerfil(repoDir);
  try {
    const j = JSON.parse(readFileSync(caminho, "utf-8"));
    return { perfil: normalizarPerfil(j), caminho, origem };
  } catch {
    // arquivo do perfil escolhido existe mas não pôde ser lido/parseado — nunca lança (=R13);
    // cai no mínimo e diz a origem real do problema, não finge "default".
    return { perfil: PERFIL_MINIMO, caminho, origem: "minimo" };
  }
}

/** Identificador do perfil ativo p/ exibição (`/estado.perfil`): "default" quando caiu no
 *  exemplo versionado, senão o CAMINHO do arquivo que resolveu — é a prova de qual perfil
 *  está no ar, não um rótulo bonito. */
export function nomePerfilAtivo(r: PerfilResolvido): string {
  return r.origem === "default" ? "default" : r.caminho;
}

function expandirTil(caminho: string): string {
  if (caminho === "~") return process.env.HOME ?? "";
  if (caminho.startsWith("~/")) return join(process.env.HOME ?? "", caminho.slice(2));
  return caminho;
}

/**
 * Resolve `perfil.repos` em caminhos de repositórios git reais. Cada entrada pode ser:
 *  (a) um repo em si (tem `.git`) — entra direto;
 *  (b) um diretório-de-repos (cada subpasta com `.git`) — cada subpasta entra.
 * Preserva o comportamento anterior (que escaneava `enio-dev/producao` e usava
 * `enio-dev/piloto/forja` direto) sem hardcode: quem decide é o disco, não o tipo declarado.
 * `~/` expande para HOME (portabilidade — R14-j: literal não-secreto só é dívida quando é a
 * ÚNICA verdade possível; aqui há saída).
 */
export function resolverRepos(entradas: string[]): string[] {
  const repos: string[] = [];
  for (const bruta of entradas) {
    const entrada = expandirTil(bruta);
    if (!existsSync(entrada)) continue;
    try {
      if (existsSync(join(entrada, ".git"))) {
        repos.push(entrada);
        continue;
      }
      if (statSync(entrada).isDirectory()) {
        for (const d of readdirSync(entrada)) {
          const caminho = join(entrada, d);
          try {
            if (statSync(caminho).isDirectory() && existsSync(join(caminho, ".git"))) repos.push(caminho);
          } catch { /* subpasta ilegível — pula */ }
        }
      }
    } catch { /* entrada ilegível — pula */ }
  }
  return repos;
}
