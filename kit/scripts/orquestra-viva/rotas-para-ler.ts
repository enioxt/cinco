/**
 * rotas-para-ler.ts — PARA-LER-001 (corte Enio 15/09). Adaptador HTTP fino sobre o motor
 * `scripts/para-ler.ts` — nenhuma regra nova aqui, só tradução request↔motor. Mesmo padrão
 * de rotas-notificacoes.ts (sempre 200 com payload íntegro) e rotas-documentos.ts (POST
 * de ação devolve {ok,...}).
 *
 * INTEGRAÇÃO (Prime cola em scripts/orquestra-viva.ts):
 *   1) import: `import { montarParaLerApi, tratarParaLerAbrir, tratarParaLerEstado } from "./orquestra-viva/rotas-para-ler";`
 *   2) no roteador, antes do 404 final:
 *      if (url.pathname === "/api/para-ler" && req.method === "GET") return Response.json(montarParaLerApi());
 *      { const m = url.pathname.match(/^\/api\/para-ler\/([^/]+)\/(lido|dispensado|abrir)$/);
 *        if (m && req.method === "POST") {
 *          const [, id, acao] = m;
 *          if (acao === "abrir") return await tratarParaLerAbrir(id);
 *          return tratarParaLerEstado(id, acao as "lido" | "dispensado");
 *        } }
 *   3) em REDE_PRIMEIRO (SW_JS): acrescentar `para-ler` à regex — rota de dado, nunca
 *      cache-primeiro (=R13-c, mesmo motivo de /api/documentos).
 *   4) APP_JS_PARTS_PATHS: acrescentar app-para-ler.js (depois de app-notificacoes.js).
 *      APP_CSS_PARTS_PATHS: acrescentar app-para-ler.css.
 */
import { existsSync } from "node:fs";
import { carregarOpcional, corpoIndisponivel, respostaIndisponivel } from "./opcional";

// Motor pessoal: não viaja no kit público — ausente = `disponivel:false`, o servidor sobe.
const NOME_MOTOR = "para-ler";
const motor = await carregarOpcional(() => import("../para-ler"), "../para-ler");

/** GET /api/para-ler — sempre pendentes; total é o próprio universo desta lista (=P1
 *  R-UNIVERSO-DECLARADO-001: "pendentes" já É o denominador certo aqui, não há filtro
 *  escondido atrás do número). */
export function montarParaLerApi(): {
  itens: ReturnType<NonNullable<typeof motor>["listarPendentes"]>;
  total: number;
  disponivel?: false;
  motivo?: string;
} {
  if (!motor) return { itens: [], total: 0, ...corpoIndisponivel(NOME_MOTOR) };
  const itens = motor.listarPendentes();
  return { itens, total: itens.length };
}

/** POST /api/para-ler/:id/lido | /:id/dispensado */
export function tratarParaLerEstado(idOuPrefixo: string, acao: "lido" | "dispensado"): Response {
  if (!motor) return respostaIndisponivel(NOME_MOTOR);
  const r = motor.marcarEstado(idOuPrefixo, acao);
  if (!r.ok) {
    return Response.json(
      { ok: false, erro: r.erro, candidatos: r.candidatos?.map((c) => ({ id: c.id, titulo: c.titulo })) },
      { status: r.candidatos ? 409 : 404 },
    );
  }
  return Response.json({ ok: true, item: r.item });
}

/**
 * POST /api/para-ler/:id/abrir — abre o arquivo E marca lido (item 4 da task: "Abrir marca
 * como lido automaticamente"). ADOTA o padrão xdg-open de tratarAbrirDocumento
 * (rotas-documentos.ts) — Bun.spawn desacoplado (unref), nunca lança. NÃO adota a checagem
 * de "raízes declaradas" daquele motor: ali a fronteira existe porque a rota BUSCA em disco
 * (varredura ampla); aqui o item já passou pelo próprio gate de curadoria (`adicionar()`
 * recusa caminho inexistente na hora do --add) — a lista de para-ler É o allowlist, cada
 * item citado explicitamente por quem chamou --add, nunca uma varredura de pasta.
 */
export async function tratarParaLerAbrir(idOuPrefixo: string): Promise<Response> {
  if (!motor) return respostaIndisponivel(NOME_MOTOR);
  const r = motor.marcarEstado(idOuPrefixo, "lido");
  if (!r.ok) {
    return Response.json(
      { ok: false, erro: r.erro, candidatos: r.candidatos?.map((c) => ({ id: c.id, titulo: c.titulo })) },
      { status: r.candidatos ? 409 : 404 },
    );
  }
  const caminho = r.item.caminho;
  if (!existsSync(caminho)) {
    return Response.json({ ok: false, aberto: false, item: r.item, erro: "arquivo não existe mais no disco" }, { status: 404 });
  }
  try {
    const proc = Bun.spawn(["xdg-open", caminho], { stdout: "ignore", stderr: "ignore", stdin: "ignore" });
    proc.unref();
    return Response.json({ ok: true, aberto: true, item: r.item });
  } catch (e) {
    return Response.json(
      { ok: false, aberto: false, item: r.item, erro: `falha ao abrir: ${e instanceof Error ? e.message : String(e)}` },
      { status: 500 },
    );
  }
}
