/**
 * rotas-perfil.ts — POST /api/perfil (MODOS-TELA-25-50-100-001, corte Enio 05/09: "editor
 * de layout no próprio app"). Único ponto de escrita do perfil pelo APP — o resto do
 * arquivo (nome/dominios/integracoes/atalhos/repos/agentes/modulos) é editado à mão pelo
 * humano; este endpoint escreve SÓ `layouts`, sempre em ~/.egos (nunca fora — R-NAS-FRONTEIRA-001
 * aplicado a um único arquivo em vez de uma pasta de acervo).
 *
 * Destino: EGOS_PERFIL (se setado) senão ~/.egos/perfil.json — mas só se resolver DENTRO de
 * ~/.egos; fora disso é 403 (a escrita nunca segue um EGOS_PERFIL apontando para outro lugar,
 * mesmo que a LEITURA em lib/perfil.ts siga — ler de qualquer canto é seguro, escrever não).
 * Escrita atômica: tmp + rename, com backup .bak do que existia antes.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { lerPerfil, normalizarLayouts, normalizarNotificacoes, normalizarPerfil, type Perfil } from "../lib/perfil";

function destinoEscrita(): { destino: string; ok: boolean } {
  const home = process.env.HOME ?? "";
  const zona = resolve(join(home, ".egos"));
  const explicito = (process.env.EGOS_PERFIL ?? "").trim();
  const destino = resolve(explicito || join(home, ".egos", "perfil.json"));
  return { destino, ok: resolve(dirname(destino)) === zona };
}

function lerPerfilExistente(destino: string): { perfil: Perfil | null; invalido: boolean } {
  if (!existsSync(destino)) return { perfil: null, invalido: false };
  try {
    return { perfil: normalizarPerfil(JSON.parse(readFileSync(destino, "utf-8"))), invalido: false };
  } catch {
    return { perfil: null, invalido: true };
  }
}

export async function tratarPerfilPost(req: Request, repoDir: string): Promise<Response> {
  let corpo: unknown;
  try {
    corpo = await req.json();
  } catch {
    return Response.json({ ok: false, erro: "corpo não é JSON válido" }, { status: 400 });
  }
  if (!corpo || typeof corpo !== "object" || Array.isArray(corpo)) {
    return Response.json({ ok: false, erro: "corpo deve ser objeto JSON" }, { status: 400 });
  }
  const layoutsBrutos = (corpo as Record<string, unknown>).layouts;
  if (layoutsBrutos !== undefined && (typeof layoutsBrutos !== "object" || layoutsBrutos === null || Array.isArray(layoutsBrutos))) {
    return Response.json({ ok: false, erro: "layouts deve ser objeto {modo: {modulos,destaque}}" }, { status: 400 });
  }
  // SN-2-ABRIR-E-PERGUNTAR-001: 2º campo que este endpoint escreve (era só `layouts`).
  // Mesma régua: objeto puro, chave livre, validado por normalizarNotificacoes (nunca lança).
  const notifBrutas = (corpo as Record<string, unknown>).notificacoes;
  if (notifBrutas !== undefined && (typeof notifBrutas !== "object" || notifBrutas === null || Array.isArray(notifBrutas))) {
    return Response.json({ ok: false, erro: "notificacoes deve ser objeto {tipo: {modo,auto_abrir,respostas}}" }, { status: 400 });
  }

  const { destino, ok: dentroDaZona } = destinoEscrita();
  if (!dentroDaZona) {
    return Response.json({ ok: false, erro: `EGOS_PERFIL fora de ~/.egos — escrita recusada: ${destino}` }, { status: 403 });
  }

  const { perfil: existente, invalido } = lerPerfilExistente(destino);
  if (invalido) {
    return Response.json({ ok: false, erro: `perfil existente em ${destino} não pôde ser lido (JSON inválido)` }, { status: 400 });
  }
  const base = existente ?? lerPerfil(repoDir).perfil;
  // campo ausente no corpo = PRESERVA o que já estava salvo (não zera): campo PRESENTE
  // (mesmo vazio {}) = SUBSTITUI por inteiro. Comportamento anterior de `layouts` era
  // "sempre substitui" porque todo caller até hoje sempre o enviava; preservado aqui
  // com o mesmo resultado prático — a diferença só aparece quando o corpo grava só o
  // OUTRO campo (notificacoes sem layouts, ou vice-versa), e é aí que "sempre zera"
  // apagaria trabalho salvo que o pedido não tocou.
  const layouts = layoutsBrutos !== undefined ? normalizarLayouts(layoutsBrutos) : base.layouts;
  const notificacoes = notifBrutas !== undefined ? normalizarNotificacoes(notifBrutas) : base.notificacoes;
  const atualizado: Perfil = { ...base, layouts, notificacoes };

  try {
    mkdirSync(dirname(destino), { recursive: true });
    if (existsSync(destino)) copyFileSync(destino, `${destino}.bak`);
    const tmp = `${destino}.tmp-${process.pid}-${Date.now()}`;
    writeFileSync(tmp, `${JSON.stringify(atualizado, null, 2)}\n`);
    renameSync(tmp, destino);
  } catch (e) {
    return Response.json({ ok: false, erro: `escrita falhou: ${(e as Error).message}` }, { status: 500 });
  }

  return Response.json({ ok: true, caminho: destino, layouts, notificacoes });
}
