/**
 * rotas-layout-presets.ts — GALERIA-DE-LAYOUTS-001 (corte Enio 15/09: "já ativou os layouts
 * diferentes pro EGOS APP? quero testar todos"). Expõe o núcleo puro `lib/layout-presets.ts`
 * como API — a gaveta ⚙ layout (app-layout.js) chama isto para listar/aplicar/exportar/
 * importar presets, num clique.
 *
 * DÍVIDA DECLARADA (=R13, dito, nunca escondido): o módulo "para-ler" existe no vocabulário
 * de um preset (é um card real do HTML) mas HOJE não é gateável pelo motor de layout —
 * `MODULOS_CONHECIDOS` (app-nucleo.js) não o inclui, e adicioná-lo ali mudaria o
 * comportamento do app do Enio em produção (o card viraria "hidden" para todo perfil
 * existente que não liste "para-ler" em `modulos`, ~/.egos/perfil.json incluso) — risco
 * fora do escopo desta task. `presetParaLayoutModo` filtra para o conjunto gateável antes
 * de escrever; o preset em si continua declarando "para-ler" (honesto no export/import),
 * só não entra na ordem que de fato é ligada/desligada até essa extensão acontecer.
 *
 * Reversibilidade ("voltar ao anterior"): `aplicar` devolve o layout ANTERIOR do modo —
 * quem chama (app-layout.js) guarda esse valor e, para desfazer, faz o MESMO POST que o
 * editor manual já faz (`/api/perfil`) com esse valor de volta. Nenhuma rota nova de
 * "desfazer" — reusa o único ponto de escrita que já existe (rotas-perfil.ts).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { lerPerfil } from "../lib/perfil";
import { carregarOpcional, respostaIndisponivel } from "./opcional";

// Galeria de layouts: não viaja no kit público — ausente = `disponivel:false`, o servidor sobe.
type PresetLayout = import("../lib/layout-presets").PresetLayout;
const NOME_MODULO = "layout-presets";
const presets = await carregarOpcional(() => import("../lib/layout-presets"), "../lib/layout-presets");

// mesmo vocabulário que app-nucleo.js declara em MODULOS_CONHECIDOS — duplicado por
// necessidade (JS de navegador não importa TS, TS de servidor não lê o DOM), mesmo padrão
// já aceito em `layoutParaModo` (perfil.ts) vs `layoutEfetivo` (app-layout.js).
const MODULOS_GATEAVEIS = ["agenda", "time", "sessoes", "motores", "servicos", "catalogo", "documentos", "conversa"];
// vocabulário de VALIDAÇÃO (o que existe de fato como card no HTML) é mais amplo que o
// gateável — inclui cards sempre-visíveis como "para-ler". Mantido em lista curta e
// explícita aqui (mesma dívida documentada no topo do arquivo); o CLI (layout-gerar.ts)
// deriva a lista real do HTML — este endpoint aceita o superconjunto para não recusar
// preset honesto vindo do CLI.
const MODULOS_VALIDOS = [...MODULOS_GATEAVEIS, "para-ler", "roteiro", "email", "atalhos", "fila", "cinco", "sentinela-vps"];

// mesma régua de `destinoEscrita` (rotas-perfil.ts): LER pode vir de qualquer lugar,
// ESCREVER só dentro de ~/.egos — mesmo com EGOS_LAYOUT_PRESETS_PATH explícito
// (R-NAS-FRONTEIRA-001: a fronteira é a PASTA real, nunca uma variável que a contorna).
// Testes isolam trocando HOME (mesmo padrão de orquestra-viva.test.sh, `HOME="$DIR/..."`),
// nunca apontando o path para fora de ~/.egos.
function caminhoPresetsCustom(): { caminho: string; ok: boolean } {
  const home = process.env.HOME ?? "";
  const zona = resolve(join(home, ".egos"));
  const explicito = (process.env.EGOS_LAYOUT_PRESETS_PATH ?? "").trim();
  const caminho = resolve(explicito || join(home, ".egos", "layout-presets.json"));
  return { caminho, ok: resolve(dirname(caminho)) === zona };
}

function lerPresetsCustom(caminho: string): PresetLayout[] {
  if (!existsSync(caminho)) return [];
  try {
    const bruto = JSON.parse(readFileSync(caminho, "utf-8"));
    return Array.isArray(bruto) ? (bruto as PresetLayout[]) : [];
  } catch {
    return [];
  }
}

function todosOsPresets(): PresetLayout[] {
  if (!presets) return [];
  const { caminho } = caminhoPresetsCustom();
  return [...presets.PRESETS_NOMEADOS, ...lerPresetsCustom(caminho)];
}

export function tratarLayoutPresetsGet(): Response {
  if (!presets) return respostaIndisponivel(NOME_MODULO);
  return Response.json({ ok: true, presets: todosOsPresets(), medidoEm: new Date().toISOString() });
}

export async function tratarLayoutPresetsAplicar(req: Request, repoDir: string): Promise<Response> {
  if (!presets) return respostaIndisponivel(NOME_MODULO);
  const corpo = (await req.json().catch(() => ({}))) as { nome?: string; modo?: string };
  const nome = String(corpo.nome ?? "");
  const modo = String(corpo.modo ?? "100");
  const preset = todosOsPresets().find((p) => p.nome === nome);
  if (!preset) {
    return Response.json({ ok: false, erro: `preset "${nome}" não existe` }, { status: 404 });
  }
  const perfilAtual = lerPerfil(repoDir).perfil;
  const anterior = perfilAtual.layouts[modo] ?? null; // null = "não havia layout explícito" (deriva de perfil.modulos)
  const novoLayout = presets.presetParaLayoutModo(preset, MODULOS_GATEAVEIS);
  return Response.json({ ok: true, presetAplicado: preset.nome, modo, layout: novoLayout, anterior });
}

export function tratarLayoutPresetsExportar(url: URL): Response {
  if (!presets) return respostaIndisponivel(NOME_MODULO);
  const nome = url.searchParams.get("nome") ?? "";
  const preset = todosOsPresets().find((p) => p.nome === nome);
  if (!preset) return Response.json({ ok: false, erro: `preset "${nome}" não existe` }, { status: 404 });
  return Response.json({ ok: true, preset });
}

export async function tratarLayoutPresetsImportar(req: Request): Promise<Response> {
  if (!presets) return respostaIndisponivel(NOME_MODULO);
  const corpo = (await req.json().catch(() => null)) as { json?: string } | null;
  if (!corpo || typeof corpo.json !== "string") {
    return Response.json({ ok: false, erro: "corpo deve ser { json: \"<texto do preset>\" }" }, { status: 400 });
  }
  const r = presets.importarPresetJSON(corpo.json, MODULOS_VALIDOS);
  if (!r.ok) return Response.json({ ok: false, erro: r.erro }, { status: 400 });

  const { caminho, ok: dentroDaZona } = caminhoPresetsCustom();
  if (!dentroDaZona) {
    return Response.json({ ok: false, erro: `destino fora de ~/.egos — escrita recusada: ${caminho}` }, { status: 403 });
  }
  try {
    const existentes = lerPresetsCustom(caminho).filter((p) => p.nome !== r.preset.nome);
    mkdirSync(dirname(caminho), { recursive: true });
    writeFileSync(caminho, `${JSON.stringify([...existentes, r.preset], null, 2)}\n`);
  } catch (e) {
    return Response.json({ ok: false, erro: `escrita falhou: ${(e as Error).message}` }, { status: 500 });
  }
  return Response.json({ ok: true, preset: r.preset, caminho });
}
