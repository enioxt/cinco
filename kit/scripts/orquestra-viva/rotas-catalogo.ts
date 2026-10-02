/**
 * rotas-catalogo.ts — REFATORACAO-ORGANICA-001 (04/09): extraído de orquestra-viva.ts.
 * Catálogo (EGOS-APP-DO-TODO-001): lê federacao.json (público ou local ou EGOS_FEDERACAO_JSON),
 * expõe busca/filtro por tipo/categoria e o detalhe por item com a última mudança medida
 * por git. NÃO gera índice novo (=ADOPT). Zero mudança de comportamento — só onde o
 * código mora.
 */
import { existsSync, readdirSync } from "node:fs";
import { fraseDe, quantasFrases } from "../lib/frases-publicas";
import { join } from "node:path";
import { REPO_DIR, lerJobSeguro } from "./nucleo";

// ── CATÁLOGO (EGOS-APP-DO-TODO-001, corte Enio 02/09): mostra o que já temos — o que
// está medido (prova real) colorido, o que é só declarado em CINZA/"em desenvolvimento",
// mas clicável. NÃO gera índice novo (=ADOPT): lê apps/egos-landing/public/federacao.json,
// já produzido por scripts/federacao-indice.ts, e reporta a idade do próprio índice —
// ⚪ dito se o arquivo faltar ou vier ilegível, nunca lista vazia em silêncio (=R13-c).
export interface ItemCatalogo {
  id: string;
  nome: string;
  tipo: string;
  categoria: string;
  descricao: string;
  fonte: string;
  prova: string | null;
  estado: "medido" | "declarado" | "em-desenvolvimento" | "nao-ativado" | string;
  tags: string[];
  /** só em itens "nao-ativado" (censo local): o que falta / por que está parado. */
  falta?: string;
}

const FEDERACAO_JSON = join(REPO_DIR, "apps", "egos-landing", "public", "federacao.json");
// SKILLS-ACHAVEIS-APP-001 (acréscimo 04/09): outro braço passou a gerar um SUPERCONJUNTO
// local (~/.egos/federacao-local.json — projetos/integrações/loops além do público), com
// tipos novos (motor/golden/gate/app/projeto/integracao/loop) e estados novos
// (em-desenvolvimento/nao-ativado + campo `falta`). Ordem de resolução, mesma forma de
// EGOS_PERFIL: env explícito → local da máquina → público versionado. Nunca lança (=R13).
const FEDERACAO_LOCAL_JSON = join(process.env.HOME ?? "", ".egos", "federacao-local.json");

export function resolverFonteFederacao(): { caminho: string; origem: "env" | "local" | "publico" } {
  const explicito = (process.env.EGOS_FEDERACAO_JSON ?? "").trim();
  if (explicito && existsSync(explicito)) return { caminho: explicito, origem: "env" };
  if (existsSync(FEDERACAO_LOCAL_JSON)) return { caminho: FEDERACAO_LOCAL_JSON, origem: "local" };
  return { caminho: FEDERACAO_JSON, origem: "publico" };
}

export function lerFederacaoJson(): { itens: ItemCatalogo[]; resumo: Record<string, unknown>; geradoEm: string; fonteCaminho: string; fonteOrigem: string } | null {
  const { caminho, origem } = resolverFonteFederacao();
  const conteudo = lerJobSeguro(caminho);
  if (!conteudo) return null;
  const j = conteudo as Record<string, unknown>;
  if (!Array.isArray(j.itens)) return null;
  return {
    itens: j.itens as ItemCatalogo[],
    resumo: (j.resumo as Record<string, unknown>) ?? {},
    geradoEm: String(j.gerado_em ?? ""),
    fonteCaminho: caminho,
    fonteOrigem: origem,
  };
}

export async function montarCatalogo(busca: string, tipo: string, categoria = "", dominiosPerfil: string[] = []): Promise<Record<string, unknown>> {
  const agora = new Date().toISOString();
  const fonte = lerFederacaoJson();
  if (!fonte) {
    const { caminho } = resolverFonteFederacao();
    return { itens: [], resumo: null, geradoEm: null, erro: `⚪ NÃO-MEDIDO: ${caminho} não encontrado ou ilegível — rode bun scripts/federacao-indice.ts`, medidoEm: agora };
  }
  // tipos saem do DADO completo (antes de qualquer filtro) — nenhuma lista fixa no server
  // nem no front; item de tipo novo (motor/golden/gate/…) aparece sozinho quando o índice cresce.
  const contagemTipo = new Map<string, number>();
  for (const i of fonte.itens) contagemTipo.set(i.tipo, (contagemTipo.get(i.tipo) ?? 0) + 1);
  const tipos = [...contagemTipo.entries()].sort((a, b) => b[1] - a[1]).map(([nome, n]) => ({ nome, n }));

  const buscaBaixa = busca.trim().toLowerCase();
  let itens = fonte.itens;
  if (tipo && tipo !== "todos") itens = itens.filter((i) => i.tipo === tipo);
  // FILTRO-DOMINIO-PERFIL (fatia 3, 04/09): perfil.dominios não tinha consumidor (§10.3 item
  // 2 de EGOS_SURFACES_ROUTING.md) — quando o front manda "dominios" (chip "meus domínios"
  // ligado), restringe aos itens cuja `categoria` bate. Domínio pedido que não existe no
  // universo INTEIRO do índice (não só no filtrado) é dito, nunca vira tela vazia muda
  // (R-UNIVERSO-DECLARADO-001): a régua do "existe" é o dado completo, antes de qualquer
  // outro filtro, senão um tipo/busca escolhido antes acusaria falso-negativo.
  const categoriasNoIndiceCompleto = new Set(fonte.itens.map((i) => i.categoria));
  const dominiosDesconhecidos = dominiosPerfil.filter((d) => !categoriasNoIndiceCompleto.has(d));
  if (dominiosPerfil.length) itens = itens.filter((i) => dominiosPerfil.includes(i.categoria));
  // domínios saem do DADO filtrado por tipo (segundo filtro acompanha o primeiro), com contagem
  const contagem = new Map<string, number>();
  for (const i of itens) contagem.set(i.categoria, (contagem.get(i.categoria) ?? 0) + 1);
  const categorias = [...contagem.entries()].sort((a, b) => b[1] - a[1]).map(([nome, n]) => ({ nome, n }));
  if (categoria && categoria !== "todas") itens = itens.filter((i) => i.categoria === categoria);
  if (buscaBaixa) {
    const semAcento = (t: string) => t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const alvo = semAcento(buscaBaixa);
    itens = itens.filter(
      (i) => semAcento(i.nome).includes(alvo) || semAcento(i.descricao).includes(alvo) || semAcento(i.categoria).includes(alvo)
        || (typeof (i as { busca?: string }).busca === "string" && (i as { busca?: string }).busca!.includes(alvo)),
    );
  }
  // FRASE-UMA-VEZ-DUAS-SUPERFICIES-001 (corte Enio 09/09: "vamos avançar em forma de skills,
  // de capacidades, no nosso frontend, seja site, seja EGOS app"). A frase escrita PARA FORA
  // (config/frases-publicas.json) vale aqui também — o app e a página do cinco mostram o
  // mesmo texto, escrito uma vez. Sem entrada, o item segue com a descrição do censo: a
  // frase pública ACRESCENTA, nunca apaga o que já existia.
  itens = itens.map((i) => {
    const publica = fraseDe(i.id);
    return publica ? { ...i, descricao: publica, descricaoInterna: i.descricao } : i;
  });
  const medidos = fonte.itens.filter((i) => i.estado === "medido").length;
  const declarados = fonte.itens.length - medidos;
  const idadeMin = fonte.geradoEm ? Math.round((Date.now() - new Date(fonte.geradoEm).getTime()) / 60000) : null;
  return {
    itens,
    categorias,
    tipos,
    resumo: fonte.resumo,
    fonteCaminho: fonte.fonteCaminho,
    fonteOrigem: fonte.fonteOrigem,
    medidos,
    declarados,
    frasesPublicas: quantasFrases(),
    total: fonte.itens.length,
    geradoEm: fonte.geradoEm || null,
    idadeMin,
    medidoEm: agora,
    dominiosDesconhecidos,
  };
}

// Camada mais fina do catálogo (SKILLS-ACHAVEIS-APP-001): o item + a última mudança MEDIDA
// por git na fonte dele. O caminho sai do índice (nunca do usuário) — id desconhecido = 404.
export async function detalharItemCatalogo(id: string): Promise<Response> {
  const fonte = lerFederacaoJson();
  if (!fonte) return Response.json({ erro: "⚪ NÃO-MEDIDO: federacao.json ausente" }, { status: 503 });
  const item = fonte.itens.find((i) => i.id === id);
  if (!item) return Response.json({ erro: "item não existe no índice" }, { status: 404 });
  const caminho = item.fonte.replace(/:\d+(-\d+)?$/, "");
  let mudouEm: string | null = null;
  let commit: string | null = null;
  try {
    const proc = Bun.spawn(["git", "log", "-1", "--format=%cI %h", "--", caminho], { cwd: REPO_DIR, stdout: "pipe", stderr: "pipe" });
    const saida = (await new Response(proc.stdout).text()).trim();
    if ((await proc.exited) === 0 && saida) [mudouEm, commit] = saida.split(" ");
  } catch { /* fica null e é dito abaixo */ }
  const mudouHa = mudouEm ? Math.round((Date.now() - new Date(mudouEm).getTime()) / 86400000) : null;
  return Response.json({ ...item, caminho, mudouEm, commit, mudouHa, medidoEm: new Date().toISOString() });
}
