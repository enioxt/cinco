/**
 * app-toast-logica.ts — EGOS-APP-TOAST-001 (corte Enio 15/09 15:05, verbatim: "as
 * notificações do EGOS APP devem ser mais veementes para mim, no canto inferior esquerdo,
 * abrir ali; vamos configurando como cada mensagem abre — se veio do WhatsApp, uma prévia
 * bonita; se veio de outro lugar, de outra forma; ... tamanho certo, customizar o tamanho e
 * o app se manter; usar Apple, Microsoft, os apps indies mais bonitos, Linux").
 *
 * FONTE ÚNICA de toda decisão pura (duração/colapso/dedupe/tamanho/cor/renderizador) — o
 * navegador NÃO importa TS (mesmo motivo documentado em app-notificacoes.js:
 * "mirror aqui porque o navegador não importa TS"), então app-toast.js MIRRORA estas
 * funções byte-a-byte comentadas "mirror de app-toast-logica.ts:<nome>". Mudou aqui →
 * mudar lá também, na mesma revisão (R3.4 refatoração orgânica não se aplica: são só ~90L).
 *
 * Pesquisa que fundamenta as decisões: docs/design/notificacoes-egos-app-pesquisa-2026-09-15.md
 * (Apple HIG, Microsoft Fluent/Windows Toast, GNOME HIG/libadwaita AdwToast, Raycast).
 */

export type Prioridade = "alta" | "normal" | "baixa";
export type Renderizador = "whatsapp" | "pca" | "monitor" | "default";

export interface RegraOrigem {
  renderizador: Renderizador;
  prioridade: Prioridade;
  duracaoMs: number;
}

export interface RegistroToasts {
  origens: Record<string, RegraOrigem>;
  cores_por_remetente?: Record<string, string>;
}

/** Decide a regra pela CHAVE mais específica que casar por prefixo (startsWith), com '*'
 *  como fallback obrigatório — R13-c: nunca "silêncio" para origem desconhecida. */
export function resolverRegra(origemOuFonte: string, registro: RegistroToasts): RegraOrigem {
  const chave = String(origemOuFonte || "");
  let melhor: { k: string; v: RegraOrigem } | null = null;
  for (const [k, v] of Object.entries(registro.origens || {})) {
    if (k === "*") continue;
    if (chave === k || chave.startsWith(k)) {
      if (!melhor || k.length > melhor.k.length) melhor = { k, v };
    }
  }
  if (melhor) return melhor.v;
  return registro.origens["*"] || { renderizador: "default", prioridade: "normal", duracaoMs: 7000 };
}

/** GNOME AdwToast: timeout=0 fica até fechar (visto na pesquisa) — aplicamos o mesmo
 *  contrato: duracaoMs<=0 significa "fica até fechar" (prioridade alta), nunca "some em 0ms". */
export function ficaAteFechar(duracaoMs: number): boolean {
  return !(duracaoMs > 0);
}

/** Régua P/M/G — larguras em px (referência: Windows hero image 364×180 fica perto do "M";
 *  não é adotado 1:1, é ancoragem de escala, pedido explícito era "customizar o tamanho"). */
const LARGURA_POR_TAMANHO: Record<string, number> = { P: 280, M: 360, G: 440 };
const ALTURA_MAX_POR_TAMANHO: Record<string, number> = { P: 120, M: 160, G: 220 };

export function tamanhoValido(t: string): "P" | "M" | "G" {
  return t === "P" || t === "M" || t === "G" ? t : "M";
}

export function larguraPx(tamanho: string): number {
  return LARGURA_POR_TAMANHO[tamanhoValido(tamanho)];
}

export function alturaMaxPx(tamanho: string): number {
  return ALTURA_MAX_POR_TAMANHO[tamanhoValido(tamanho)];
}

/** O toast NUNCA sai da viewport (pedido explícito) e nunca empurra o layout (position:
 *  fixed, resolvido em CSS) — aqui só o CLAMP numérico de largura/altura contra a janela,
 *  com margem mínima dos dois lados (mesma margem nos 2 eixos, símples e testável). */
export function clampNaViewport(
  larguraDesejada: number,
  alturaMaxDesejada: number,
  viewportW: number,
  viewportH: number,
  margem = 16,
): { largura: number; alturaMax: number } {
  const largura = Math.max(200, Math.min(larguraDesejada, Math.max(200, viewportW - margem * 2)));
  const alturaMax = Math.max(60, Math.min(alturaMaxDesejada, Math.max(60, viewportH - margem * 2)));
  return { largura, alturaMax };
}

/** Pilha com colapso (padrão Apple: "Show less"/"Clear All" — aqui simplificado a "resto
 *  colapsa em +k", porque o pedido pede PRÉVIA visível, não 1-só como GNOME). */
export function colapsarPilha<T>(itens: T[], maxVisiveis: number): { visiveis: T[]; colapsados: number } {
  const n = Math.max(1, maxVisiveis);
  if (itens.length <= n) return { visiveis: itens, colapsados: 0 };
  return { visiveis: itens.slice(0, n), colapsados: itens.length - n };
}

/** /api/conversas não tem `id` (ver coletores-conversas.ts:ItemConversa) — chave estável
 *  sintética para dedupe client-side, dentro da janela de 48h já filtrada pelo servidor. */
export function chaveConversa(item: { quando?: string; quem?: string; texto_curto?: string; origem?: string }): string {
  return [item.quando || "", item.origem || "", item.quem || "", item.texto_curto || ""].join("|");
}

/** origem começa com algo que "parece WhatsApp" — não há campo dedicado em ItemConversa
 *  (formato B mistura em `origem`/`onde_responder`, ver coletores-conversas.ts:139-160);
 *  detecção por FORMA (mesma técnica de ehFixtureDeTeste), nunca lista mágica de nomes. */
export function pareceWhatsapp(origem: string, ondeResponder: string): boolean {
  const alvo = `${origem} ${ondeResponder}`.toLowerCase();
  return /whatsapp|wpp/.test(alvo);
}

const CORES_PADRAO: Record<string, string> = { enio: "verde", cinco: "azul", jessica: "roxo", jéssica: "roxo" };

/** Cor por REMETENTE (não por canal) — pedido explícito: "Enio verde, cinco azul, Jéssica
 *  roxo". Nome desconhecido → 'cinza', nunca inventa cor nova sem registro (R13-c). */
export function corPorRemetente(nome: string, mapa?: Record<string, string>): string {
  const chave = String(nome || "").trim().toLowerCase().split(/\s+/)[0] || "";
  const registro = mapa || CORES_PADRAO;
  return registro[chave] || "cinza";
}

export function inicialAvatar(nome: string): string {
  const limpo = String(nome || "").trim();
  return limpo ? limpo[0]!.toUpperCase() : "?";
}
