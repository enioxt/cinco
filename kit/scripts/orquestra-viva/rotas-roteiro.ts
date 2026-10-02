/**
 * rotas-roteiro.ts — ROTEIRO-GRUPO-001 (fatia 3: rotas do EGOS APP). Mesmo padrão de
 * `rotas-documento-vivo.ts`: nenhum banco novo, nenhuma reimplementação — tudo delega
 * ao motor `scripts/roteiro-grupo.ts` (ADOPT, R1.3). O app só lê/escreve o mesmo estado
 * que a ponte do WhatsApp já lê/escreve.
 *
 * Convenção de rota deste servidor (ver orquestra-viva.ts): sem segmento dinâmico
 * `/:slug` — o roteador é uma lista plana de `if (pathname === "...")`, então o slug
 * entra por query string (`?slug=`) ou corpo do POST, igual a `/api/documentos/estado`.
 *
 * Nesta fase NÃO existe envio pela rota — só leitura/edição de estado (spec explícita).
 */
import { carregarOpcional, corpoIndisponivel, respostaIndisponivel } from "./opcional";

// Motor pessoal: não viaja no kit público — ausente = a gaveta diz `disponivel:false`, o servidor sobe.
type Item = import("../roteiro-grupo").Item;
type Roteiro = import("../roteiro-grupo").Roteiro;
const NOME_MOTOR = "roteiro-grupo";
const motor = await carregarOpcional(() => import("../roteiro-grupo"), "../roteiro-grupo");

function respostaSlugInvalido(slug: string): Response {
  return Response.json({ erro: `slug inválido: "${slug}" (use apenas a-z, 0-9 e hífen, 1-64 caracteres)` }, { status: 400 });
}

export interface ResumoRoteiro {
  slug: string;
  titulo: string;
  grupo_jid: string;
  instancia: string;
  semana_inicio: string;
  total: number;
  feitos: number;
  atualizado_em: string;
}

function resumir(r: Roteiro): ResumoRoteiro {
  return {
    slug: r.slug,
    titulo: r.titulo,
    grupo_jid: r.grupo_jid,
    instancia: r.instancia,
    semana_inicio: r.semana_inicio,
    total: r.itens.length,
    feitos: r.itens.filter((i) => i.feito).length,
    atualizado_em: r.atualizado_em,
  };
}

// ── GET /api/roteiros — lista resumo ─────────────────────────────────────────
export function montarRoteirosApi(): { roteiros: ResumoRoteiro[]; disponivel?: false; motivo?: string } {
  if (!motor) return { roteiros: [], ...corpoIndisponivel(NOME_MOTOR) };
  const { listarSlugs, carregarRoteiro } = motor;
  const roteiros = listarSlugs()
    .map((slug) => carregarRoteiro(slug))
    .filter((r): r is Roteiro => r !== null)
    .map(resumir);
  return { roteiros };
}

// ── GET /api/roteiros/item?slug=X — detalhe completo ─────────────────────────
export function tratarRoteiroGet(params: URLSearchParams): Response {
  if (!motor) return respostaIndisponivel(NOME_MOTOR);
  const { carregarRoteiro, slugValido } = motor;
  const slug = (params.get("slug") ?? "").trim();
  if (!slug) return Response.json({ erro: "slug vazio" }, { status: 400 });
  if (!slugValido(slug)) return respostaSlugInvalido(slug);
  const r = carregarRoteiro(slug);
  if (!r) return Response.json({ erro: `roteiro "${slug}" não encontrado` }, { status: 404 });
  return Response.json(r);
}

// ── GET /api/roteiros/whatsapp?slug=X — preview do texto renderizado ─────────
export function tratarRoteiroWhatsapp(params: URLSearchParams): Response {
  if (!motor) return respostaIndisponivel(NOME_MOTOR);
  const { carregarRoteiro, renderizarWhatsApp, slugValido } = motor;
  const slug = (params.get("slug") ?? "").trim();
  if (!slug) return Response.json({ erro: "slug vazio" }, { status: 400 });
  if (!slugValido(slug)) return respostaSlugInvalido(slug);
  const r = carregarRoteiro(slug);
  if (!r) return Response.json({ erro: `roteiro "${slug}" não encontrado` }, { status: 404 });
  return Response.json({ texto: renderizarWhatsApp(r) });
}

// ── POST /api/roteiros/itens {slug, itens:[{n?,texto,dono?,prazo?}], confirmar_remocao?} ──
// Substitui a LISTA de itens, preservando feito/feito_por/feito_em/notas do item que já
// existia com o MESMO `n` (identidade — revisor item 6: casar pelo índice reordena/apaga
// trabalho já feito quando um item do meio é removido). Item sem `n` no corpo é NOVO —
// ganha o próximo n livre. Item que existia e sumiu da lista nova é uma REMOÇÃO: se ele
// tem feito=true ou notas, exige `confirmar_remocao:true` no corpo (edição comum não pode
// apagar trabalho por acidente). Toda chamada bem-sucedida grava um evento "editar".
export async function tratarRoteiroItens(req: Request): Promise<Response> {
  if (!motor) return respostaIndisponivel(NOME_MOTOR);
  const { carregarRoteiro, gravarEventos, salvarRoteiro, slugValido } = motor;
  let corpo: {
    slug?: string;
    itens?: Array<{ n?: number; texto?: string; dono?: string; prazo?: string }>;
    confirmar_remocao?: boolean;
    por?: string;
  };
  try {
    corpo = await req.json();
  } catch {
    return Response.json({ erro: "corpo não é JSON válido" }, { status: 400 });
  }
  const slug = (corpo.slug ?? "").trim();
  if (!slug) return Response.json({ erro: "slug vazio" }, { status: 400 });
  if (!slugValido(slug)) return respostaSlugInvalido(slug);
  if (!Array.isArray(corpo.itens) || corpo.itens.length === 0) {
    return Response.json({ erro: "itens deve ser uma lista não-vazia" }, { status: 400 });
  }
  const atual = carregarRoteiro(slug);
  if (!atual) return Response.json({ erro: `roteiro "${slug}" não encontrado` }, { status: 404 });

  const anteriores = new Map(atual.itens.map((i) => [i.n, i]));
  const nsEnviados = new Set<number>();
  let proximoNGerado = Math.max(0, ...atual.itens.map((i) => i.n)) + 1;

  const novosItens: Item[] = corpo.itens.map((raw) => {
    const texto = typeof raw.texto === "string" ? raw.texto.trim() : "";
    const nRaw = Number(raw.n);
    const n = Number.isFinite(nRaw) && nRaw > 0 ? nRaw : proximoNGerado++;
    nsEnviados.add(n);
    const anterior = anteriores.get(n);
    return {
      n,
      texto: texto || anterior?.texto || `item ${n}`,
      dono: typeof raw.dono === "string" && raw.dono.trim() ? raw.dono.trim() : undefined,
      prazo: typeof raw.prazo === "string" && raw.prazo.trim() ? raw.prazo.trim() : undefined,
      feito: anterior?.feito ?? false,
      feito_por: anterior?.feito_por,
      feito_em: anterior?.feito_em,
      notas: anterior?.notas ?? [],
    };
  });

  const removidos = atual.itens.filter((i) => !nsEnviados.has(i.n));
  const removidosComTrabalho = removidos.filter((i) => i.feito || i.notas.length > 0);
  if (removidosComTrabalho.length > 0 && corpo.confirmar_remocao !== true) {
    return Response.json(
      {
        erro: `remoção de item(ns) com feito/notas exige confirmar_remocao:true — itens: ${removidosComTrabalho
          .map((i) => i.n)
          .join(", ")}`,
      },
      { status: 400 },
    );
  }

  const roteiro: Roteiro = { ...atual, itens: novosItens, atualizado_em: new Date().toISOString() };
  salvarRoteiro(roteiro);
  gravarEventos(slug, [
    { em: roteiro.atualizado_em, tipo: "editar", por: (corpo.por ?? "").trim() || "app", origem: "app" },
  ]);
  return Response.json(roteiro);
}

// ── POST /api/roteiros/marcar {slug, n, por, desfazer?} ──────────────────────
export async function tratarRoteiroMarcar(req: Request): Promise<Response> {
  if (!motor) return respostaIndisponivel(NOME_MOTOR);
  const { processarEGravar, slugValido } = motor;
  let corpo: { slug?: string; n?: number; por?: string; desfazer?: boolean };
  try {
    corpo = await req.json();
  } catch {
    return Response.json({ erro: "corpo não é JSON válido" }, { status: 400 });
  }
  const slug = (corpo.slug ?? "").trim();
  const n = Number(corpo.n);
  const por = (corpo.por ?? "").trim();
  if (!slug || !Number.isFinite(n) || !por) {
    return Response.json({ erro: "slug, n e por são obrigatórios" }, { status: 400 });
  }
  if (!slugValido(slug)) return respostaSlugInvalido(slug);

  const tipo = corpo.desfazer === true ? ("desmarcar" as const) : ("marcar" as const);
  // processarEGravar RELÊ o roteiro do disco antes de aplicar+gravar (revisor item 4) —
  // evita gravar sobre um estado que ficou velho entre o carregarRoteiro de antes e o
  // salvarRoteiro de agora.
  const resultado = processarEGravar(slug, { tipo, ns: [n] }, { por, agora: new Date(), origem: "app" });
  if (resultado.rejeitado) {
    // roteiro === null só na rejeição "não encontrado" (slug some do disco); qualquer
    // outra rejeição (ex.: item inexistente) é 400, como antes.
    return Response.json({ erro: resultado.rejeitado }, { status: resultado.roteiro === null ? 404 : 400 });
  }
  return Response.json(resultado.roteiro);
}

// ── POST /api/roteiros/anotar {slug, n, por, texto} ───────────────────────────
export async function tratarRoteiroAnotar(req: Request): Promise<Response> {
  if (!motor) return respostaIndisponivel(NOME_MOTOR);
  const { processarEGravar, slugValido } = motor;
  let corpo: { slug?: string; n?: number; por?: string; texto?: string };
  try {
    corpo = await req.json();
  } catch {
    return Response.json({ erro: "corpo não é JSON válido" }, { status: 400 });
  }
  const slug = (corpo.slug ?? "").trim();
  const n = Number(corpo.n);
  const por = (corpo.por ?? "").trim();
  const texto = (corpo.texto ?? "").trim();
  if (!slug || !Number.isFinite(n) || !por || !texto) {
    return Response.json({ erro: "slug, n, por e texto são obrigatórios" }, { status: 400 });
  }
  if (!slugValido(slug)) return respostaSlugInvalido(slug);

  const resultado = processarEGravar(slug, { tipo: "anotar", n, texto }, { por, agora: new Date(), origem: "app" });
  if (resultado.rejeitado) {
    return Response.json({ erro: resultado.rejeitado }, { status: resultado.roteiro === null ? 404 : 400 });
  }
  return Response.json(resultado.roteiro);
}
