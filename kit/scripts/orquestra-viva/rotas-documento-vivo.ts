/**
 * rotas-documento-vivo.ts — DV-1-VISUALIZADOR-ESTADO-COMENTARIO-001 (fatia 1 do programa
 * DOCUMENTO-VIVO-NO-APP-001). Abre um documento (.md/.html/.pdf) DENTRO do app (iframe
 * same-origin), guarda um estado editável (finalizado/critério de aceite/destino/status)
 * num ledger append-only fora do git, e reusa `/comando` (já existente) para mandar um
 * recorte/pedido ao Prime.
 *
 * ADOPT — nada aqui reimplementa o que já existe: a fronteira de raiz (fail-closed,
 * symlink resolvido) é `dentroDeAlgumaRaiz`/`resolverRaizesDeclaradas` de
 * `rotas-documentos.ts`; a renderização de .md é `renderCorpo` de `md-para-html.ts`
 * (motor da casa — este arquivo só monta o wrapper HTML, nunca re-parseia markdown).
 *
 * Dado soberano (=P4): o ledger de estado nunca entra no git — vive em
 * `${EGOS_STATE_DIR ?? ~/.egos/state}/documentos-estado.jsonl`, append-only, 1 linha por
 * gravação (histórico completo, nunca sobrescreve — GET devolve só a ÚLTIMA linha do caminho).
 */
import { existsSync, mkdirSync, readFileSync, appendFileSync } from "node:fs";
import { join } from "node:path";
import { renderCorpo } from "../md-para-html";
import { dentroDeAlgumaRaiz, resolverRaizesDeclaradas } from "./rotas-documentos";
import { REPO_DIR } from "./nucleo";

const CASA_CSS_PATH = join(REPO_DIR, "templates", "human-doc", "casa.css");

function escapa(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ── GET /api/documentos/ver ──────────────────────────────────────────────────────────
const CONTENT_TYPE_POR_EXT: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".htm": "text/html; charset=utf-8",
  ".pdf": "application/pdf",
};

// Documento é conteúdo, não código do app. Vale também ao abrir /ver diretamente.
// Sem allow-scripts; allow-same-origin preserva temas e seleção feitos pelo pai.
const HTML_SEGURO_HEADERS = {
  "content-security-policy": "sandbox allow-same-origin; default-src 'none'; script-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src data:; connect-src 'none'; form-action 'none'; base-uri 'none'; frame-ancestors 'self'",
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
  "cache-control": "no-store",
};

function extensaoDe(caminho: string): string {
  const m = caminho.match(/\.[a-zA-Z0-9]+$/);
  return m ? m[0].toLowerCase() : "";
}

/** .md → wrapper HTML mínimo em torno de `renderCorpo` (motor da casa). Não é `monta()` de
 *  md-para-html.ts (não exportada, e traz nav/cebola/textoParaColar — fora do escopo do
 *  visualizador embutido); usa o mesmo CSS da casa para não divergir visualmente. */
function renderizarMdComoHtml(md: string, nomeArquivo: string): string {
  const { blocos, titulo } = renderCorpo(md);
  let css = "";
  try {
    css = readFileSync(CASA_CSS_PATH, "utf-8");
  } catch {
    css = ""; // silencio-ok: sem CSS da casa o conteúdo ainda renderiza, só sem o tema (=R13, nunca lança)
  }
  const corpo = blocos.map((b) => b.html).join("\n");
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapa(titulo || nomeArquivo)}</title>
<style>
${css}
body{padding:24px;max-width:900px;margin:0 auto;}
</style>
</head>
<body>
${corpo}
</body>
</html>
`;
}

export async function tratarVerDocumento(params: URLSearchParams): Promise<Response> {
  const caminho = (params.get("caminho") ?? "").trim();
  if (!caminho) return Response.json({ erro: "caminho vazio" }, { status: 400 });

  const raizes = resolverRaizesDeclaradas();
  if (!dentroDeAlgumaRaiz(caminho, raizes)) {
    return Response.json({ erro: "caminho fora das raízes declaradas" }, { status: 403 });
  }
  if (!existsSync(caminho)) return Response.json({ erro: "arquivo não existe" }, { status: 404 });

  const ext = extensaoDe(caminho);
  if (ext === ".md") {
    let md: string;
    try {
      md = readFileSync(caminho, "utf-8");
    } catch (e) {
      return Response.json({ erro: `falha ao ler: ${e instanceof Error ? e.message : String(e)}` }, { status: 500 });
    }
    return new Response(renderizarMdComoHtml(md, caminho), { headers: { ...HTML_SEGURO_HEADERS, "content-type": "text/html; charset=utf-8" } });
  }
  const tipoConteudo = CONTENT_TYPE_POR_EXT[ext];
  if (!tipoConteudo) return Response.json({ erro: `tipo não suportado: ${ext || "(sem extensão)"}` }, { status: 415 });

  // Bun.file streama do disco — sem Content-Disposition: attachment (o pedido é VER
  // dentro do app, nunca baixar).
  return new Response(Bun.file(caminho), { headers: { ...(ext === ".pdf" ? {} : HTML_SEGURO_HEADERS), "content-type": tipoConteudo, "content-disposition": "inline" } });
}

// ── GET/POST /api/documentos/estado ──────────────────────────────────────────────────
export interface EstadoDocumento {
  caminho: string;
  finalizado: boolean;
  criterio_aceite: string;
  destino: string;
  status: "rascunho" | "pronto" | "enviado" | "confirmado";
  atualizado_em: string;
  por: "humano";
  /**
   * DOC-OBSERVACAO-E-PROXIMA-ACAO-001 (corte Enio 10/09: "mostrar o status, o que aconteceu
   * com o documento, destino final, confirmação de recebimento, com observações, sobre
   * possíveis próximas ações, tudo junto com documentos").
   *
   * As duas são texto livre do humano e existem por motivos DIFERENTES, por isso são dois
   * campos e não um: `observacao` olha para TRÁS (o que aconteceu — "mandei no WhatsApp e
   * ele leu sem responder"), `proxima_acao` olha para FRENTE (o que falta — "cobrar
   * segunda"). Um campo só viraria um diário onde a pendência se perde no meio da prosa,
   * que é exatamente o defeito que a lista de documentos já tinha antes do estado entrar.
   *
   * Nenhuma das duas é inferida: campo vazio significa "ninguém escreveu", nunca "não há
   * nada a dizer" (=R13-c — ausência de registro não é prova de ausência de evento).
   */
  observacao: string;
  proxima_acao: string;
}

/**
 * DOC-CONFIRMADO-001 (corte Enio 09/09: "sempre sinalizados se já enviamos, se teve
 * confirmação, se não enviamos, com proveniência"). `enviado` diz o que EU fiz; `confirmado`
 * diz o que O OUTRO LADO fez — e são coisas diferentes: mandar não é ser lido. Sem o quarto
 * estado, um documento enviado há 5 dias e ignorado fica igual a um respondido no mesmo dia.
 */
const STATUS_VALIDOS = new Set(["rascunho", "pronto", "enviado", "confirmado"]);

function estadoDirPath(): string {
  const declarado = (process.env.EGOS_STATE_DIR ?? "").trim();
  return declarado || join(process.env.HOME ?? "", ".egos", "state");
}

function estadoArquivo(): string {
  return join(estadoDirPath(), "documentos-estado.jsonl");
}

function estadoPadrao(caminho: string): EstadoDocumento {
  return {
    caminho,
    finalizado: false,
    criterio_aceite: "",
    destino: "",
    status: "rascunho",
    atualizado_em: "",
    por: "humano",
    observacao: "",
    proxima_acao: "",
  };
}

/** Devolve a ÚLTIMA linha do ledger para `caminho` (append-only: o histórico inteiro fica
 *  no disco, a API só serve o estado corrente). Linha ilegível é pulada, nunca derruba a
 *  leitura inteira (=R13: nunca lança). */
/**
 * A PROVENIÊNCIA: quantas vezes este documento mudou de estado e quando foi a primeira.
 * O ledger é append-only por desenho — a API servia só o estado corrente e jogava fora a
 * história, que é justamente o que responde "desde quando isso está parado?".
 */
export interface EstadoResolvido {
  estado: EstadoDocumento;
  mudancas: number;
  primeira: string;
  ultima: string;
}

/**
 * DOC-ESTADO-SEMPRE-FRESCO-001 (medido 10/09 pelos goldens g110/g111, antes de chegar ao
 * Enio): a lista de documentos cacheia a varredura por 60s. Com o estado embutido nesse
 * cache, marcar "enviado" e voltar para a lista mostrava "sem marca" por até um minuto — a
 * confusão exata que o campo existe para eliminar.
 *
 * A separação certa é por CUSTO, não por conveniência: caminhar 3.167 arquivos e rodar
 * `git log` é caro e merece cache; ler um `.jsonl` é barato e nunca deve envelhecer.
 *
 * De quebra conserta um O(n×m) que o cache escondia: `estadoCorrenteDe` relia o ledger
 * INTEIRO uma vez por documento. Aqui o arquivo é lido UMA vez e vira mapa.
 */
export function mapaDeEstados(): Map<string, EstadoResolvido> {
  const mapa = new Map<string, EstadoResolvido>();
  const arq = estadoArquivo();
  if (!existsSync(arq)) return mapa;
  let texto: string;
  try {
    texto = readFileSync(arq, "utf-8");
  } catch {
    return mapa; // ledger ilegível = nenhum estado conhecido, nunca estado inventado (=R13)
  }
  for (const linha of texto.split("\n")) {
    const l = linha.trim();
    if (!l) continue;
    let e: EstadoDocumento;
    try {
      e = JSON.parse(l);
    } catch {
      continue; // linha corrompida só não conta — não derruba o mapa inteiro
    }
    if (!e || typeof e.caminho !== "string") continue;
    if (typeof e.observacao !== "string") e.observacao = "";
    if (typeof e.proxima_acao !== "string") e.proxima_acao = "";
    const anterior = mapa.get(e.caminho);
    mapa.set(e.caminho, {
      estado: e, // append-only: a última linha lida é o estado corrente
      mudancas: (anterior?.mudancas ?? 0) + (e.atualizado_em ? 1 : 0),
      primeira: anterior?.primeira || e.atualizado_em || "",
      ultima: e.atualizado_em || anterior?.ultima || "",
    });
  }
  return mapa;
}

export function historicoDoDocumento(caminho: string): { mudancas: number; primeira: string; ultima: string } {
  const arq = estadoArquivo();
  const vazio = { mudancas: 0, primeira: "", ultima: "" };
  if (!existsSync(arq)) return vazio;
  let texto: string;
  try {
    texto = readFileSync(arq, "utf-8");
  } catch {
    return vazio; // ledger ilegível = sem história conhecida, nunca história inventada
  }
  const datas: string[] = [];
  for (const linha of texto.split("\n")) {
    if (!linha.trim()) continue;
    try {
      const o = JSON.parse(linha) as EstadoDocumento;
      if (o.caminho === caminho && o.atualizado_em) datas.push(o.atualizado_em);
    } catch {
      // linha corrompida não derruba a contagem — ela só não conta
    }
  }
  if (!datas.length) return vazio;
  datas.sort();
  return { mudancas: datas.length, primeira: datas[0], ultima: datas[datas.length - 1] };
}

export function estadoCorrenteDe(caminho: string): EstadoDocumento | null {
  return lerUltimoEstado(caminho);
}

function lerUltimoEstado(caminho: string): EstadoDocumento | null {
  const arq = estadoArquivo();
  if (!existsSync(arq)) return null;
  let texto: string;
  try {
    texto = readFileSync(arq, "utf-8");
  } catch {
    return null; // silencio-ok: ledger ilegível vira "sem estado salvo" (default), nunca 500
  }
  let ultima: EstadoDocumento | null = null;
  for (const linha of texto.split("\n")) {
    const l = linha.trim();
    if (!l) continue;
    let entrada: EstadoDocumento;
    try {
      entrada = JSON.parse(l);
    } catch {
      continue; // linha corrompida — pula (=R13), não derruba o restante do ledger
    }
    if (entrada.caminho === caminho) ultima = entrada;
  }
  // Linha gravada ANTES de DOC-OBSERVACAO-E-PROXIMA-ACAO-001 não tem os dois campos novos.
  // Normalizo para "" na leitura em vez de migrar o ledger: ele é append-only por desenho
  // (P4/R-MUTACAO-PRESERVA-ANCORA-001 — reescrever a fonte destrói a história que ela existe
  // para guardar). `undefined` chegaria na tela como "undefined" escrito por extenso.
  if (ultima) {
    if (typeof ultima.observacao !== "string") ultima.observacao = "";
    if (typeof ultima.proxima_acao !== "string") ultima.proxima_acao = "";
  }
  return ultima;
}

function gravarEstado(entrada: EstadoDocumento): void {
  const dir = estadoDirPath();
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  appendFileSync(estadoArquivo(), `${JSON.stringify(entrada)}\n`, "utf-8");
}

export function tratarEstadoGet(params: URLSearchParams): Response {
  const caminho = (params.get("caminho") ?? "").trim();
  if (!caminho) return Response.json({ erro: "caminho vazio" }, { status: 400 });
  const salvo = lerUltimoEstado(caminho);
  return Response.json(salvo ?? estadoPadrao(caminho));
}

export async function tratarEstadoPost(req: Request): Promise<Response> {
  let corpo: Partial<EstadoDocumento>;
  try {
    corpo = await req.json();
  } catch {
    return Response.json({ erro: "corpo não é JSON válido" }, { status: 400 });
  }
  const caminho = (corpo.caminho ?? "").trim();
  if (!caminho) return Response.json({ erro: "caminho vazio" }, { status: 400 });

  // mutação → raiz declarada exigida (fail-closed), mesma fronteira de /ver e /abrir.
  const raizes = resolverRaizesDeclaradas();
  if (!dentroDeAlgumaRaiz(caminho, raizes)) {
    return Response.json({ erro: "caminho fora das raízes declaradas" }, { status: 403 });
  }

  const status = (corpo.status ?? "rascunho") as string;
  if (!STATUS_VALIDOS.has(status)) {
    // A lista da mensagem sai do PRÓPRIO conjunto que valida — escrita à mão ela já mentia:
    // dizia "rascunho, pronto, enviado" enquanto `confirmado` era aceito desde 09/09. Erro
    // que ensina a regra errada é pior que erro seco.
    const validos = [...STATUS_VALIDOS].join(", ");
    return Response.json({ erro: `status inválido: ${status} (válidos: ${validos})` }, { status: 400 });
  }
  const finalizado = corpo.finalizado === true;
  if (status === "enviado" && !finalizado) {
    return Response.json({ erro: "status 'enviado' exige finalizado=true — só libera quando finalizar de fato" }, { status: 400 });
  }

  const entrada: EstadoDocumento = {
    caminho,
    finalizado,
    criterio_aceite: typeof corpo.criterio_aceite === "string" ? corpo.criterio_aceite : "",
    destino: typeof corpo.destino === "string" ? corpo.destino : "",
    status: status as EstadoDocumento["status"],
    atualizado_em: new Date().toISOString(),
    por: "humano",
    observacao: typeof corpo.observacao === "string" ? corpo.observacao.slice(0, 2000) : "",
    proxima_acao: typeof corpo.proxima_acao === "string" ? corpo.proxima_acao.slice(0, 2000) : "",
  };
  gravarEstado(entrada);
  return Response.json(entrada);
}
