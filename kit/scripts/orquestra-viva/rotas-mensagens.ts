/**
 * rotas-mensagens.ts — RESPOSTA-MULTIVIA-001 (fatia EGOS APP). Mesmo padrão de
 * rotas-roteiro.ts: nenhum banco novo, nenhuma reimplementação — tudo delega ao motor
 * `scripts/mensagens-web.ts` (ADOPT, R1.3). O app só lê/escreve o mesmo estado que o CLI e a
 * fila `mensagens-web-puxar.ts` já leem/escrevem.
 *
 * Convenção de rota deste servidor (ver orquestra-viva.ts): sem segmento dinâmico `/:id` —
 * o roteador é uma lista plana de `if (pathname === "...")`, então o id entra por query
 * string (`?id=`) ou corpo do POST, igual a `/api/roteiros/item`.
 *
 * ⚪ declarado (nunca sucesso-fantasma): sem SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY nesta
 * máquina, cada rota devolve 503 com o motivo — nunca lista vazia disfarçada de "sem mensagens".
 */
import { buscarPorId, contarAbertas, lerEnvSupabase, listar, responder } from "../mensagens-web";

function semSupabase(): Response {
  return Response.json(
    { erro: "SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY ausentes nesta máquina — mensagens não disponíveis aqui" },
    { status: 503 },
  );
}

// ── GET /api/mensagens?estado= — lista (texto truncado em 80 letras) ─────────
export async function tratarMensagensGet(params: URLSearchParams): Promise<Response> {
  const env = lerEnvSupabase();
  if (!env) return semSupabase();
  const estadoRaw = params.get("estado") ?? "";
  const estado = estadoRaw === "nova" || estadoRaw === "puxada" || estadoRaw === "respondida" ? estadoRaw : undefined;
  if (estadoRaw && !estado) {
    return Response.json({ erro: `estado inválido: "${estadoRaw}" (use nova|puxada|respondida)` }, { status: 400 });
  }
  const r = await listar(env, { estado });
  if (!r.ok) return Response.json({ erro: r.motivo }, { status: 502 });
  return Response.json({ mensagens: r.valor });
}

// ── GET /api/mensagens/item?id=X — detalhe completo (texto inteiro) ──────────
export async function tratarMensagemItemGet(params: URLSearchParams): Promise<Response> {
  const env = lerEnvSupabase();
  if (!env) return semSupabase();
  const id = (params.get("id") ?? "").trim();
  if (!id) return Response.json({ erro: "id vazio" }, { status: 400 });
  const r = await buscarPorId(env, id);
  if (!r.ok) return Response.json({ erro: r.motivo }, { status: 404 });
  return Response.json(r.valor);
}

// ── POST /api/mensagens/responder {id, texto} — via='app' sempre ────────────
// via é fixo 'app' aqui de propósito: esta rota SÓ existe dentro do EGOS APP — quem chama
// por outra via (CLI/MCP/Telegram) usa o próprio caminho e declara a própria via.
export async function tratarMensagemResponder(req: Request): Promise<Response> {
  const env = lerEnvSupabase();
  if (!env) return semSupabase();
  let corpo: { id?: string; texto?: string; por?: string; sobrescrever?: boolean };
  try {
    corpo = await req.json();
  } catch {
    return Response.json({ erro: "corpo não é JSON válido" }, { status: 400 });
  }
  const id = (corpo.id ?? "").trim();
  const texto = (corpo.texto ?? "").trim();
  if (!id || !texto) return Response.json({ erro: "id e texto são obrigatórios" }, { status: 400 });

  const r = await responder(env, id, texto, { por: corpo.por, via: "app", sobrescrever: corpo.sobrescrever === true });
  if (!r.ok) {
    // "já respondida" e "id inexistente" são recusa do domínio (400), o resto é falha real (502).
    const recusaDominio = r.motivo.includes("já foi respondida") || r.motivo.includes("não encontrada");
    return Response.json({ erro: r.motivo }, { status: recusaDominio ? 400 : 502 });
  }
  return Response.json(r.valor);
}

// ── GET /api/mensagens/abertas — contagem (badge do app) ─────────────────────
export async function tratarMensagensAbertasGet(): Promise<Response> {
  const env = lerEnvSupabase();
  if (!env) return semSupabase();
  const r = await contarAbertas(env);
  if (!r.ok) return Response.json({ erro: r.motivo }, { status: 502 });
  return Response.json({ abertas: r.valor });
}
