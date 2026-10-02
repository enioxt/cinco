#!/usr/bin/env bun
/**
 * orquestra-viva.ts — servidor local (Bun.serve, 127.0.0.1 apenas) que expõe
 * o estado da fila de jobs (scripts/fila.ts) como JSON + serve a cena 3D.
 * ORQUESTRA-LOCAL v1 — lê o mesmo disco do fila.ts (~/.egos/fila/<agente>/).
 *
 * REFATORACAO-ORGANICA-001 (04/09, incremental/golden-a-cada-passo — R-REFACTOR-ORG-001):
 * este arquivo tinha 1667L (rotas + coletores + spawn misturados). Ficou só servidor +
 * roteador + /estado; cada domínio virou módulo em scripts/orquestra-viva/:
 *   nucleo.ts               — fila/agentes/consts compartilhadas (BASE/REPO_DIR/montarEstado)
 *   rotas-reuniao.ts        — reunião ao vivo + crônica
 *   coletores-integracoes.ts — sondas (whatsapp/pulse/vps/federação/aceites/orquestra/crônica)
 *   coletores-agentes.ts    — telemetria de agentes + time em campo + espelho da sessão
 *   rotas-catalogo.ts       — catálogo/item/federação
 *   rotas-app4.ts           — banda/gerar-html/observabilidade/guard-brasil/leaderboard
 * Zero mudança de comportamento — só onde o código mora (ver diff do HTML servido no relatório).
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import { decideAcesso, validarConfigRede } from "./lib/rede-guarda";
import { montarAgenda } from "./agenda-unificada";
import {
  agenteValido,
  gitCabeca,
  montarEstado,
  REPO_DIR,
} from "./orquestra-viva/nucleo";
import {
  estadoReuniao,
  lerCronica,
  tratarCronicaGerar,
  tratarReuniaoComando,
  tratarReuniaoDownload,
} from "./orquestra-viva/rotas-reuniao";
import { montarIntegracoes } from "./orquestra-viva/coletores-integracoes";
import { medirConexoes, medirWhatsappAgora } from "./orquestra-viva/coletores-conexoes";
import { CAPACIDADES, sincronizar } from "./orquestra-viva/agenda-sincronizar";
import { tratarPerfisGet, tratarPerfisUsar } from "./orquestra-viva/rotas-perfis";
import { medirMcp } from "./orquestra-viva/coletores-mcp";
import { montarWhatsapp } from "./orquestra-viva/coletores-whatsapp";
import { salvarCanais, lerJsonPersistido } from "./lib/whatsapp-canais-config";
import {
  lerEspelhoDaSessao, listarSessoes,
  montarAgentes,
  montarTimeEmCampo,
} from "./orquestra-viva/coletores-agentes";
import { detalharItemCatalogo, montarCatalogo } from "./orquestra-viva/rotas-catalogo";
import {
  listarMdRecentes,
  montarGuardBrasil,
  montarLeaderboardApi,
  montarObservabilidade,
  tratarBanda,
  tratarGerarHtml,
} from "./orquestra-viva/rotas-app4";
import {
  montarDocumentosApi,
  montarRaizesApi,
  tratarAbrirDocumento,
  tratarCopiarArquivo,
} from "./orquestra-viva/rotas-documentos";
import { tratarEmailGet } from "./orquestra-viva/rotas-email";
import { montarAtualizacaoApi, tratarReiniciar } from "./orquestra-viva/rotas-atualizacao";
import {
  tratarEstadoGet,
  tratarEstadoPost,
  tratarVerDocumento,
} from "./orquestra-viva/rotas-documento-vivo";
import { tratarPerfilPost } from "./orquestra-viva/rotas-perfil";
import {
  tratarLayoutPresetsAplicar,
  tratarLayoutPresetsExportar,
  tratarLayoutPresetsGet,
  tratarLayoutPresetsImportar,
} from "./orquestra-viva/rotas-layout-presets";
import { tratarNotificacoesGet } from "./orquestra-viva/rotas-notificacoes";
import { tratarHistoricoGet } from "./orquestra-viva/rotas-historico";
import { tratarConversasGet, tratarSessoesGet } from "./orquestra-viva/rotas-conversas";
import { tratarPessoasGet } from "./orquestra-viva/rotas-pessoas";
// USO-TEMPO-REAL-MULTI-TENANT-001 (14/09): 4ª aba da gaveta "avisos-overlay" — /api/uso lê
// o que scripts/uso/seguidor.ts já extraiu, nunca os .jsonl do Claude Code direto.
import { tratarUsoGet } from "./orquestra-viva/rotas-uso";
// GASTOS-VISIVEIS-001 (corte Enio 15/09 17:05): 7ª aba "Gastos" da mesma gaveta do sino —
// controle de gastos de todas as sessões, distribuído por sessão/papel/modelo/projeto, real
// (cost-state do Claude Code) + estimado (ledger) + Codex + APIs pagas. Ver coletores-gastos.ts.
import { tratarGastosGet } from "./orquestra-viva/rotas-gastos";
// WPP-OBSERVABILIDADE-001 (15/09): bloco WhatsApp no topo da aba "Sessões" do sino — lê
// ~/.egos/uso/whatsapp-monitor.jsonl (gravado pelo timer egos-whatsapp-monitor.timer).
import { tratarWhatsappMonitorGet } from "./orquestra-viva/rotas-whatsapp-monitor";
// ROTEIRO-CHECKLIST-CONSTANTE-001 item 3 (Prime 15/09): 5ª aba "Roteiro do projeto" da
// gaveta "avisos-overlay" — /api/roteiro-projeto lê TASKS.md+git log via
// scripts/roteiro-projeto.ts (mesmo motor do fragmento público do cinco, sem sanitização —
// aqui é o EGOS APP local do Enio). Nome distinto de rotas-roteiro.ts (ROTEIRO-GRUPO-001,
// checklist do grupo de WhatsApp — programa diferente, arquivo diferente).
import { tratarRoteiroProjetoGet } from "./orquestra-viva/rotas-roteiro-projeto";
import { tratarAgenteGet, tratarAgenteEnviar } from "./orquestra-viva/rotas-agente-canal";
import { montarAgendaCompleta, tratarAgendaMandar } from "./orquestra-viva/rotas-agenda";
import {
  montarRoteirosApi,
  tratarRoteiroAnotar,
  tratarRoteiroGet,
  tratarRoteiroItens,
  tratarRoteiroMarcar,
  tratarRoteiroWhatsapp,
} from "./orquestra-viva/rotas-roteiro";
// PARA-LER-001 (corte Enio 15/09): card "Para ler" — a fila explícita do que ainda pede a
// leitura dele; card fica PRIMEIRO da grade (ver orquestra-viva.html). Ver scripts/para-ler.ts.
import {
  montarParaLerApi,
  tratarParaLerAbrir,
  tratarParaLerEstado,
} from "./orquestra-viva/rotas-para-ler";

const PORT = Number(process.env.EGOS_ORQUESTRA_PORT ?? 4599);
const SUBIU_EM = new Date().toISOString();
const HTML_PATH = join(import.meta.dir, "orquestra-viva.html");
// VOCABULARIO-LEIGO-001 (05/09): o vocabulário é DADO (config/vocabulario.json), servido como
// prelúdio da MESMA concatenação de /app.js — nunca rota nova. Três motivos medidos:
// (a) o service worker só cacheia ESQUELETO (ver ESQUELETO abaixo) e uma rota nova falharia
//     offline, sumindo com os rótulos humanos;
// (b) fetch assíncrono corre contra app-catalogo/app-layout, que renderizam antes;
// (c) .json servido por rota não entra na colagem que os goldens estáticos grepam.
const VOCAB_JSON_PATH = join(import.meta.dir, "..", "config", "vocabulario.json");
// EGOS-APP-TOAST-001 (corte Enio 15/09 15:05): registro origem→renderizador/prioridade/
// duração das notificações-toast — mesma técnica de VOCAB_JSON_PATH acima (DADO editável
// pelo Enio sem tocar código, servido como window.TOASTS_CONFIG no preludio de /app.js).
const TOASTS_JSON_PATH = join(import.meta.dir, "..", "config", "toasts.json");
// REFATORACAO-ORGANICA-001 (04/09): CSS/JS que viviam inline no HTML (2473L) saíram
// para arquivos próprios — zero mudança de comportamento, só arquivo menor.
const APP_CSS_PATH = join(import.meta.dir, "orquestra-viva", "app.css");
// REFATORACAO-ORGANICA-001 passo 2/3 (04/09): app.js (1436L) dividido por domínio em 3
// arquivos — servidos concatenados NESTA ORDEM em /app.js (1 script só, escolhido sobre
// 3 <script src> porque mantém intactos os goldens que fazem grep no HTML servido — ver
// scripts/orquestra-viva.test.sh). O split PRESERVA o conteúdo: o único delta em relação
// ao app.js anterior são as ~47 linhas da feature declarada no mesmo commit (filtro por
// domínio do perfil) — o resto é movimentação. NÃO existe golden de byte-identidade; a
// garantia é comportamental (suíte verde). Corrigido 05/09: dizia "byte-idêntica (diff vazio)".
const APP_JS_PARTS_PATHS = [
  join(import.meta.dir, "orquestra-viva", "app-nucleo.js"),
  join(import.meta.dir, "orquestra-viva", "app-gavetas.js"),
  join(import.meta.dir, "orquestra-viva", "app-catalogo.js"),
  // HISTORICO-DOCUMENTOS-001 (05/09): módulo Documentos — vem antes do app-agentes.js
  // por pedido explícito da task; só usa (nunca declara) IDs/funções dos anteriores.
  join(import.meta.dir, "orquestra-viva", "app-documentos.js"),
  // DV-1-VISUALIZADOR-ESTADO-COMENTARIO-001: visualizador embutido — vem logo depois de
  // app-documentos.js (só usa, nunca declara, escaparHtml/horaLocal/abrirGaveta/fecharGaveta
  // dele e dos anteriores).
  join(import.meta.dir, "orquestra-viva", "app-documento-vivo.js"),
  // PEDIDO-AGENTE-NOMEADO-001 (PCA-55, 05/09): 4º arquivo — detalhe do papel + campo de
  // pedido na gaveta "time em campo". Vem por último: só usa (nunca declara) IDs/funções
  // dos 3 anteriores; ordem não muda comportamento dos demais (concatenação continua 1 script).
  join(import.meta.dir, "orquestra-viva", "app-agentes.js"),
  // MODOS-TELA-25-50-100-001 (05/09): 5º arquivo — seletor de modo/ponte com a casca
  // nativa/layout por modo/editor de layout. Vem por ÚLTIMO: só usa (nunca declara)
  // IDs/funções dos anteriores (MODULOS_CONHECIDOS, abrirGaveta/fecharGaveta, aplicarPerfilNaHome).
  join(import.meta.dir, "orquestra-viva", "app-layout.js"),
  // EGOS-APP-CONTA-E-VERSAO-001 fatia 3 (06/09): gaveta "conexões" — vem por último: só usa
  // (nunca declara) abrirGaveta/fecharGaveta/escaparHtml/GAVETAS dos anteriores.
  join(import.meta.dir, "orquestra-viva", "app-conexoes.js"),
  // EGOS-APP-GAVETA-MCP-001 (07/09): gaveta "MCP" — vem por ÚLTIMO: só usa (nunca declara)
  // abrirGaveta/fecharGaveta/escaparHtml dos anteriores; GAVETAS["mcp-overlay"] é registrada
  // de forma ESTÁTICA em app-gavetas.js (não aqui — pedido explícito da task).
  join(import.meta.dir, "orquestra-viva", "app-mcp.js"),
  // SISTEMA-NERVOSO-DO-APP-001 (08/09): badge + toast de notificações — vem por ÚLTIMO:
  // só usa (nunca declara) abrirGaveta/fecharGaveta/estadoAtual dos anteriores.
  // EGOS-APP-GAVETA-WHATSAPP-001 (10/09): gaveta "WhatsApp" — vem por ÚLTIMO: só usa (nunca
  // declara) abrirGaveta/fecharGaveta/escaparHtml/horaLocal dos anteriores; GAVETAS
  // ["whatsapp-overlay"] é registrada de forma ESTÁTICA em app-gavetas.js (mesmo do MCP).
  join(import.meta.dir, "orquestra-viva", "app-whatsapp.js"),
  join(import.meta.dir, "orquestra-viva", "app-notificacoes.js"),
  // RV-7-RESPOSTA-CLICAVEL-E-LEIGA-001 (08/09): cartaoBlocos/linkarCaminhos MOVIDOS de
  // app-nucleo.js (que já estava acima do teto de 600L) + cartão de PCA/manchete leiga/
  // clique-para-copiar de SHA — novos nesta fatia. Vem por ÚLTIMO: só usa (nunca declara)
  // escaparHtml/horaLocal de app-nucleo.js; hoisting de `function` cobre renderConversa()
  // (em app-nucleo.js, servido ANTES) chamar cartaoBlocos() daqui — é 1 script concatenado.
  join(import.meta.dir, "orquestra-viva", "app-resposta.js"),
  // SELETOR-TEMA-001 (10/09): botão de tema do cabeçalho — vem por ÚLTIMO, autocontido
  // (não declara nem depende de IDs/funções dos anteriores).
  join(import.meta.dir, "orquestra-viva", "app-tema.js"),
  // AGENDA-PASSADO-OPACO-001+AGENDA-HOJE-COM-CARGA-001 (10/09): passado/hoje da gaveta
  // Agenda — vem por ÚLTIMO: só USA (nunca declara) escaparHtml/horaLocal/abrirGaveta/
  // fecharGaveta/grupoDobravel dos anteriores; envolve window.__ABRIDORES["agenda-overlay"]
  // (definido em app-catalogo.js) para também carregar passado/hoje quando a gaveta abre.
  join(import.meta.dir, "orquestra-viva", "app-agenda.js"),
  // GMAIL-SO-LEITURA-001 (10/09): gaveta "E-mail" — vem por ÚLTIMO: só USA (nunca declara)
  // escaparHtml/horaLocal/abrirGaveta/fecharGaveta dos anteriores; GAVETAS["email-overlay"]
  // registrada de forma ESTÁTICA em app-gavetas.js (mesmo padrão do MCP/WhatsApp).
  join(import.meta.dir, "orquestra-viva", "app-email.js"),
  // EGOS-APP-ATUALIZACAO-VISIVEL-001 (10/09): faixa de versão desatualizada — autocontido,
  // não declara nem depende de IDs/funções dos anteriores.
  join(import.meta.dir, "orquestra-viva", "app-atualizacao.js"),
  // APP-HISTORICO-E-TELEMETRIA-001 (13/09): gaveta "histórico" — vem por ÚLTIMO: só USA
  // (nunca declara) abrirGaveta/fecharGaveta/escaparHtml/horaLocal dos anteriores;
  // GAVETAS["historico-overlay"] registrada de forma ESTÁTICA em app-gavetas.js.
  join(import.meta.dir, "orquestra-viva", "app-historico.js"),
  // ROTEIRO-GRUPO-001 (14/09): gaveta "Roteiro" — vem por ÚLTIMO: só USA (nunca declara)
  // abrirGaveta/fecharGaveta/escaparHtml/horaLocal dos anteriores; GAVETAS["roteiro-overlay"]
  // registrada de forma ESTÁTICA em app-gavetas.js (mesmo padrão do MCP/WhatsApp/Histórico).
  join(import.meta.dir, "orquestra-viva", "app-roteiro.js"),
  // NOTIFICACOES-HISTORICO-NA-TELA-001 (14/09, correção Prime): NÃO é gaveta própria — 2
  // abas novas (Conversas/Sessões) DENTRO da gaveta "avisos-overlay" que já existe (sem
  // botão novo no #header, sem overlay novo — o header já tinha overflow pré-existente em
  // 464/960/1025px, medido em `main` limpa: 84/81/122px). Vem por ÚLTIMO: só USA (nunca
  // declara) abrirGaveta/fecharGaveta/escaparHtml/horaLocal dos anteriores; encadeia em
  // window.__ABRIDORES["avisos-overlay"] (mesma técnica de app-layout.js).
  join(import.meta.dir, "orquestra-viva", "app-conversas.js"),
  // USO-TEMPO-REAL-MULTI-TENANT-001 (14/09): 4ª aba "Uso" — vem por ÚLTIMO: só usa (nunca
  // declara) escaparHtml/window.__ABRIDORES/GAVETAS dos anteriores (mesma técnica de
  // app-conversas.js — encadeia window.__ABRIDORES["avisos-overlay"], não substitui).
  join(import.meta.dir, "orquestra-viva", "app-uso.js"),
  // WPP-OBSERVABILIDADE-001 (15/09): bloco WhatsApp no TOPO da aba "Sessões" (já existente,
  // ver app-conversas.js) — vem por ÚLTIMO: só usa (nunca declara) escaparHtml/horaLocal dos
  // anteriores. GET /api/whatsapp/monitor, ver rotas-whatsapp-monitor.ts.
  join(import.meta.dir, "orquestra-viva", "app-whatsapp-monitor.js"),
  // ROTEIRO-CHECKLIST-CONSTANTE-001 item 3 (Prime 15/09): 5ª aba "Roteiro do projeto" da
  // gaveta "avisos-overlay" — vem por ÚLTIMO: só usa (nunca declara) escaparHtml dos
  // anteriores; listener PRÓPRIO em #avisos-abas (mesma técnica de app-uso.js — NÃO toca
  // app-conversas.js). GET /api/roteiro-projeto, ver rotas-roteiro-projeto.ts.
  join(import.meta.dir, "orquestra-viva", "app-roteiro-projeto.js"),
  // EGOS-APP-TOAST-001 (corte Enio 15/09 15:05): pilha de toasts multi-origem, canto
  // inferior-esquerdo — vem por ÚLTIMO: só USA (nunca declara) abrirGaveta/escaparHtml/
  // horaLocal dos anteriores; NÃO substitui o .notif-toast de app-notificacoes.js (propósito
  // diferente — ver comentário de topo de app-toast.css). Fonte pura testada em
  // app-toast-logica.ts (mirror manual aqui, navegador não importa TS).
  join(import.meta.dir, "orquestra-viva", "app-toast.js"),
  // JANELA-AGENTE-WHATSAPP-001 (15/09): gaveta "Agentes" (espelho do PID por canal) — vem
  // por ÚLTIMO: só usa (nunca declara) abrirGaveta/fecharGaveta/escaparHtml/horaLocal dos
  // anteriores. GET/POST /api/agente*, ver rotas-agente-canal.ts.
  join(import.meta.dir, "orquestra-viva", "app-agente.js"),
  // GASTOS-VISIVEIS-001 (corte Enio 15/09 17:05): 7ª aba "Gastos" — vem por ÚLTIMO: só usa
  // (nunca declara) escaparHtml dos anteriores; listener PRÓPRIO em #avisos-abas (mesma
  // técnica de app-uso.js — NÃO toca app-conversas.js/app-uso.js). GET /api/gastos, ver
  // rotas-gastos.ts.
  join(import.meta.dir, "orquestra-viva", "app-gastos.js"),
  // PARA-LER-001 (corte Enio 15/09): card "Para ler" — vem por ÚLTIMO: só usa (nunca
  // declara) escaparHtml/horaLocal dos anteriores. GET/POST /api/para-ler*, ver
  // rotas-para-ler.ts / scripts/para-ler.ts.
  join(import.meta.dir, "orquestra-viva", "app-para-ler.js"),
];
const APP_CSS_PARTS_PATHS = [
  APP_CSS_PATH,
  join(import.meta.dir, "orquestra-viva", "app-documentos.css"),
  join(import.meta.dir, "orquestra-viva", "app-documento-vivo.css"),
  // MODOS-TELA-25-50-100-001 (05/09): seletor de modo + destaque/"+N" + editor de layout.
  join(import.meta.dir, "orquestra-viva", "app-layout.css"),
  // SISTEMA-NERVOSO-DO-APP-001 (08/09): badge + toast de notificações.
  join(import.meta.dir, "orquestra-viva", "app-notificacoes.css"),
  // AGENDA-PASSADO-OPACO-001+AGENDA-HOJE-COM-CARGA-001 (10/09): estilos da tira do passado
  // (opacidade graduada) + card de hoje (carga/régua/alerta) — só tokens existentes de app.css.
  join(import.meta.dir, "orquestra-viva", "app-agenda.css"),
  // WPP-OBSERVABILIDADE-001 (15/09): bloco WhatsApp no topo da aba Sessões.
  join(import.meta.dir, "orquestra-viva", "app-whatsapp-monitor.css"),
  // EGOS-APP-ATUALIZACAO-VISIVEL-001 (10/09): faixa "atualização pronta" no topo.
  join(import.meta.dir, "orquestra-viva", "app-atualizacao.css"),
  // APP-HISTORICO-E-TELEMETRIA-001 (13/09): gaveta "histórico" — chips de filtro + timeline.
  join(import.meta.dir, "orquestra-viva", "app-historico.css"),
  // ROTEIRO-GRUPO-001 (14/09): gaveta "Roteiro" — campos editáveis inline + preview do WhatsApp.
  join(import.meta.dir, "orquestra-viva", "app-roteiro.css"),
  // NOTIFICACOES-HISTORICO-NA-TELA-001 (14/09): gaveta "Conversas" — abas + itens da timeline.
  join(import.meta.dir, "orquestra-viva", "app-conversas.css"),
  // USO-TEMPO-REAL-MULTI-TENANT-001 (14/09): gaveta "Uso" — tabela tenant×papel×agente×modelo.
  join(import.meta.dir, "orquestra-viva", "app-uso.css"),
  // EGOS-APP-TOAST-001 (corte Enio 15/09 15:05): pilha de toasts multi-origem.
  join(import.meta.dir, "orquestra-viva", "app-toast.css"),
  // JANELA-AGENTE-WHATSAPP-001 (15/09): gaveta "Agentes" — 3 direções visuais (editor/
  // conversa/foco), ferramentas colapsadas.
  join(import.meta.dir, "orquestra-viva", "app-agente.css"),
  // GASTOS-VISIVEIS-001 (corte Enio 15/09 17:05): gaveta "Gastos" — cartões, série diária
  // (SVG puro, sem lib), tabelas ordenáveis.
  join(import.meta.dir, "orquestra-viva", "app-gastos.css"),
  // PARA-LER-001 (corte Enio 15/09): card "Para ler", 1º da grade.
  join(import.meta.dir, "orquestra-viva", "app-para-ler.css"),
];

async function tratarComando(req: Request): Promise<Response> {
  let corpo: { acao?: string; agente?: string; titulo?: string; corpo?: string };
  try {
    corpo = await req.json();
  } catch {
    return Response.json({ ok: false, erro: "corpo não é JSON válido" }, { status: 400 });
  }
  const { acao, agente } = corpo;
  if (!agente || !agenteValido(agente)) {
    return Response.json({ ok: false, erro: `agente inexistente: ${agente ?? "(vazio)"}` }, { status: 400 });
  }
  if (acao !== "ping" && acao !== "mensagem") {
    return Response.json({ ok: false, erro: `ação desconhecida: ${acao ?? "(vazia)"}` }, { status: 400 });
  }
  const titulo = acao === "ping" ? "PING do painel vivo" : (corpo.titulo || "").trim();
  if (acao === "mensagem" && !titulo) {
    return Response.json({ ok: false, erro: "mensagem exige título" }, { status: 400 });
  }
  const args = ["scripts/fila.ts", "postar", agente, titulo, "--de", "egos-app"];
  if (corpo.corpo) args.push("--corpo", corpo.corpo);

  try {
    const proc = Bun.spawn([process.execPath, ...args], { cwd: REPO_DIR, stdout: "pipe", stderr: "pipe" });
    const out = (await new Response(proc.stdout).text()).trim();
    const err = (await new Response(proc.stderr).text()).trim();
    const code = await proc.exited;
    if (code !== 0) {
      return Response.json({ ok: false, erro: err || `fila.ts saiu com código ${code}` }, { status: 500 });
    }
    const m = out.match(/postado:\s*(.+)/);
    // FILA-SILENCIO-001 (corte Enio 2026-09-12): o `postar` agora diz se alguém está
    // escutando aquela fila. Sem isso a tela respondia "aparece aqui quando a sessão
    // responder" mesmo quando NINGUÉM ia ler — promessa que o sistema não podia cumprir.
    // Repassamos o veredito cru; quem decide o que mostrar é a tela, não este handler.
    const e = out.match(/^escuta:\s*(.+)$/m);
    const escuta = e ? e[1].trim() : "⚪ escuta NÃO-MEDIDA (fila.ts não reportou)";
    return Response.json({ ok: true, caminho: m ? m[1] : out, escuta, ouvinte: /escuta VIVA/.test(escuta) });
  } catch (e) {
    return Response.json({ ok: false, erro: `spawn falhou: ${(e as Error).message}` }, { status: 500 });
  }
}

const configRede = validarConfigRede(process.env);
if (configRede.erro) console.log(`⚪ rede: ${configRede.erro}`);

// APP-MULTIDISPOSITIVO-001 (corte Enio 03/09: "pode ser usado como app no Android, tablet,
// smartphone, televisão, óculos VR que tenha display e capacidade de instalar aplicativos").
// O que o instalador de cada plataforma exige: `display: standalone` (janela própria),
// `start_url` que responda sozinha, e ícone `maskable` (sem ele o Android recorta o logo num
// círculo e come as bordas). `display_override` deixa a TV/óculos abrir sem barra do navegador.
const MANIFEST = JSON.stringify({
  id: "egos-app",
  name: "EGOS APP",
  short_name: "EGOS",
  description: "Painel do sistema EGOS: fila de agentes, catálogo, observabilidade e segunda opinião.",
  lang: "pt-BR",
  start_url: "/",
  scope: "/",
  display: "standalone",
  display_override: ["window-controls-overlay", "standalone", "fullscreen"],
  orientation: "any",
  background_color: "#0b0e14",
  theme_color: "#0b0e14",
  icons: [
    { src: "/icone.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    { src: "/icone-maskable.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
  ],
});
// LOGO-CANONICA-001 (corte Enio 10/09): marca canônica do EGOS — accent ciano #38bdf8,
// SSOT em tools/visual-studio/brands/egos/ (brand.json + logo.svg). Servida do DISCO real
// (mesma técnica de /app.css acima), nunca embutida em base64 no HTML — diferente do
// ICONE_SVG abaixo (placeholder "E5" do PWA, pré-existente, fora de escopo desta task).
const LOGO_SVG_PATH = join(REPO_DIR, "tools", "visual-studio", "brands", "egos", "logo.svg");
const ICONE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="96" height="96" rx="20" fill="#0b0e14"/><text x="48" y="62" font-family="sans-serif" font-size="40" font-weight="700" fill="#4ade80" text-anchor="middle">E5</text></svg>`;
// maskable: o desenho vive dentro do círculo seguro (80% central) porque o Android recorta a borda
const ICONE_MASKABLE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="96" height="96" fill="#0b0e14"/><text x="48" y="59" font-family="sans-serif" font-size="30" font-weight="700" fill="#4ade80" text-anchor="middle">E5</text></svg>`;

// Casca offline (APP-MULTIDISPOSITIVO-001). Regra que o R13-c impõe: rota de DADO é rede-primeiro
// e, sem rede, devolve erro dito — cache velho servido como "estado de agora" seria o silêncio
// que a constituição proíbe. Só o esqueleto (HTML, ícone, manifest) é cache-primeiro.
const SW_JS = `// REDE_PRIMEIRO: /estado, /api/*, /time, /reuniao, /integracoes, /agentes, /cronica, /agenda
const CASCA = "egos-app-casca-__VERSAO__"; // preso à versão do git: casca nova = cache novo, o velho é apagado no activate
const ESQUELETO = ["/", "/manifest.webmanifest", "/icone.svg", "/app.css", "/app.js"];
const REDE_PRIMEIRO = /^\\/(estado|api|time|reuniao|integracoes|agentes|cronica|comando|agenda|documentos)/;

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CASCA).then((c) => c.addAll(ESQUELETO)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CASCA).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== self.location.origin) return;
  if (REDE_PRIMEIRO.test(url.pathname)) return; // dado nunca sai do cache: sem rede, o erro aparece
  // CASCA: REDE PRIMEIRO, cache só como reserva sem rede (CASCA-CACHE-PRIMEIRO-001, 06/09: o print do
  // Enio mostrava HTML de dias atrás — "Motores e workflows", "git · pulse" — com dados de agora; o
  // cache-first com nome fixo v1 congelava a tela para sempre depois da 1ª instalação).
  e.respondWith(
    fetch(e.request).then((r) => {
      if (r.ok) caches.open(CASCA).then((c) => c.put(e.request, r.clone()));
      return r;
    }).catch(() => caches.match(e.request).then((hit) => hit || new Response("⚪ sem rede e sem cópia da casca", { status: 503 }))),
  );
});
`;

const server = Bun.serve({
  hostname: configRede.bind,
  port: PORT,
  async fetch(req, srv) {
    const url = new URL(req.url);
    const cookieToken = (req.headers.get("cookie") ?? "").match(/egos_token=([^;]+)/)?.[1] ?? null;
    const acesso = decideAcesso({
      ipRemoto: srv.requestIP(req)?.address ?? null,
      caminho: url.pathname,
      tokenQuery: url.searchParams.get("t"),
      tokenCookie: cookieToken,
      tokenEsperado: (process.env.EGOS_APP_TOKEN ?? "").trim(),
    });
    if (!acesso.ok) return new Response("acesso negado", { status: 403 });
    if (acesso.gravarCookie) {
      url.searchParams.delete("t");
      return new Response(null, {
        status: 302,
        headers: {
          location: url.pathname + (url.search || ""),
          "set-cookie": `egos_token=${(process.env.EGOS_APP_TOKEN ?? "").trim()}; Path=/; HttpOnly; SameSite=Strict; Max-Age=2592000`,
        },
      });
    }
    if (url.pathname === "/manifest.webmanifest" && req.method === "GET") {
      return new Response(MANIFEST, { headers: { "content-type": "application/manifest+json" } });
    }
    if (url.pathname === "/icone-maskable.svg" && req.method === "GET") {
      return new Response(ICONE_MASKABLE_SVG, { headers: { "content-type": "image/svg+xml; charset=utf-8" } });
    }
    if (url.pathname === "/sw.js" && req.method === "GET") {
      // sem no-cache o navegador serve o SW antigo por até 24h e a correção não chega
      const versaoSw = (await gitCabeca()).head || "sem-git";
      return new Response(SW_JS.replace("__VERSAO__", versaoSw), { headers: { "content-type": "text/javascript; charset=utf-8", "cache-control": "no-store" } });
    }
    if (url.pathname === "/icone.svg" && req.method === "GET") {
      return new Response(ICONE_SVG, { headers: { "content-type": "image/svg+xml" } });
    }
    if (url.pathname === "/logo.svg" && req.method === "GET") {
      if (!existsSync(LOGO_SVG_PATH)) {
        return new Response("logo.svg (marca canônica) não encontrado", { status: 500 });
      }
      return new Response(Bun.file(LOGO_SVG_PATH), { headers: { "content-type": "image/svg+xml; charset=utf-8", "cache-control": "no-store" } });
    }
    if (url.pathname === "/app.css" && req.method === "GET") {
      if (APP_CSS_PARTS_PATHS.some((p) => !existsSync(p))) {
        return new Response("app.css (partes) não encontrado", { status: 500 });
      }
      const partesCss = await Promise.all(APP_CSS_PARTS_PATHS.map((p) => Bun.file(p).text()));
      return new Response(partesCss.join("\n"), { headers: { "content-type": "text/css; charset=utf-8", "cache-control": "no-store" } });
    }
    if (url.pathname === "/app.js" && req.method === "GET") {
      if (APP_JS_PARTS_PATHS.some((p) => !existsSync(p)) || !existsSync(VOCAB_JSON_PATH) || !existsSync(TOASTS_JSON_PATH)) {
        return new Response("app.js (partes) não encontrado", { status: 500 });
      }
      const [vocabTexto, toastsTexto, ...partes] = await Promise.all([
        Bun.file(VOCAB_JSON_PATH).text(),
        Bun.file(TOASTS_JSON_PATH).text(),
        ...APP_JS_PARTS_PATHS.map((p) => Bun.file(p).text()),
      ]);
      const preludio = `window.VOCAB=${vocabTexto};\nwindow.TOASTS_CONFIG=${toastsTexto};\n`;
      return new Response(preludio + partes.join("\n"), { headers: { "content-type": "text/javascript; charset=utf-8", "cache-control": "no-store" } });
    }
    if (url.pathname === "/" && req.method === "GET") {
      if (!existsSync(HTML_PATH)) {
        return new Response("orquestra-viva.html não encontrado", { status: 500 });
      }
      return new Response(Bun.file(HTML_PATH), { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
    }
    if (url.pathname === "/estado" && req.method === "GET") {
      const estado = await montarEstado();
      return Response.json(estado);
    }
    if (url.pathname === "/comando" && req.method === "POST") {
      return tratarComando(req);
    }
    if (url.pathname === "/cronica" && req.method === "GET") {
      return Response.json(lerCronica());
    }
    if (url.pathname === "/cronica/gerar" && req.method === "POST") {
      return tratarCronicaGerar(req);
    }
    if (url.pathname === "/integracoes" && req.method === "GET") {
      return Response.json(await montarIntegracoes());
    }
    if (url.pathname === "/agentes" && req.method === "GET") {
      return Response.json(await montarAgentes());
    }
    if (url.pathname === "/time" && req.method === "GET") {
      return Response.json(await montarTimeEmCampo());
    }
    if (url.pathname === "/agenda" && req.method === "GET") {
      return Response.json(montarAgenda());
    }
    if (url.pathname === "/reuniao" && req.method === "GET") {
      return Response.json(estadoReuniao());
    }
    if (url.pathname === "/reuniao/comando" && req.method === "POST") {
      return tratarReuniaoComando(req);
    }
    if (url.pathname === "/reuniao/download" && req.method === "GET") {
      return tratarReuniaoDownload(req);
    }
    if (url.pathname === "/api/sessao" && req.method === "GET") {
      const n = Math.min(400, Math.max(1, Number(url.searchParams.get("n") ?? 60) || 60));
      const id = (url.searchParams.get("sessao") ?? "").trim().replace(/[^a-zA-Z0-9-]/g, "");
      return Response.json(lerEspelhoDaSessao(n, id || undefined));
    }
    if (url.pathname === "/api/sobre" && req.method === "GET") {
      // gaveta "sobre": o que este app É — versão medida do git, de onde serve, há quanto tempo
      const git = await gitCabeca();
      return Response.json({ ok: true, git, repo: REPO_DIR, porta: PORT, subiuEm: SUBIU_EM, medidoEm: new Date().toISOString() });
    }
    if (url.pathname === "/api/sessoes" && req.method === "GET") {
      const sessoes = listarSessoes(12);
      return Response.json({ ok: true, total: sessoes.length, sessoes, medidoEm: new Date().toISOString() });
    }
    if (url.pathname === "/api/catalogo" && req.method === "GET") {
      const dominiosCsv = (url.searchParams.get("dominios") ?? "").trim();
      const dominiosPerfil = dominiosCsv ? dominiosCsv.split(",").map((d) => d.trim()).filter(Boolean) : [];
      return Response.json(await montarCatalogo(url.searchParams.get("busca") ?? "", url.searchParams.get("tipo") ?? "", url.searchParams.get("categoria") ?? "", dominiosPerfil));
    }
    if (url.pathname === "/api/catalogo/item" && req.method === "GET") {
      return detalharItemCatalogo(url.searchParams.get("id") ?? "");
    }
    if (url.pathname === "/api/apresentacoes" && req.method === "GET") {
      return Response.json({ md: listarMdRecentes() });
    }
    if (url.pathname === "/api/gerar-html" && req.method === "POST") {
      return tratarGerarHtml(req);
    }
    if (url.pathname === "/api/observabilidade" && req.method === "GET") {
      return Response.json(await montarObservabilidade());
    }
    if (url.pathname === "/api/guard-brasil" && req.method === "GET") {
      return Response.json(await montarGuardBrasil());
    }
    if (url.pathname === "/api/leaderboard" && req.method === "GET") {
      return Response.json(await montarLeaderboardApi());
    }
    if (url.pathname === "/api/banda" && req.method === "POST") {
      return tratarBanda(req);
    }
    if (url.pathname === "/api/documentos" && req.method === "GET") {
      return Response.json(await montarDocumentosApi(url.searchParams));
    }
    if (url.pathname === "/api/documentos/raizes" && req.method === "GET") {
      return Response.json(montarRaizesApi());
    }
    if (url.pathname === "/api/documentos/abrir" && req.method === "POST") {
      return tratarAbrirDocumento(req);
    }
    if (url.pathname === "/api/documentos/copiar-arquivo" && req.method === "POST") {
      return tratarCopiarArquivo(req);
    }
    if (url.pathname === "/api/para-ler" && req.method === "GET") {
      return Response.json(montarParaLerApi());
    }
    {
      const m = url.pathname.match(/^\/api\/para-ler\/([^/]+)\/(lido|dispensado|abrir)$/);
      if (m && req.method === "POST") {
        const id = m[1] ?? "";
        const acao = m[2] as "lido" | "dispensado" | "abrir";
        if (acao === "abrir") return await tratarParaLerAbrir(id);
        return tratarParaLerEstado(id, acao);
      }
    }
    if (url.pathname === "/api/email" && req.method === "GET") {
      return tratarEmailGet(url);
    }
    if (url.pathname === "/api/atualizacao" && req.method === "GET") {
      return Response.json(await montarAtualizacaoApi());
    }
    if (url.pathname === "/api/atualizacao/reiniciar" && req.method === "POST") {
      return tratarReiniciar();
    }
    // DV-1-VISUALIZADOR-ESTADO-COMENTARIO-001: /ver serve o conteúdo p/ iframe same-origin;
    // /estado é o ledger append-only (fora do git) de finalizado/critério/destino/status.
    if (url.pathname === "/api/documentos/ver" && req.method === "GET") {
      return tratarVerDocumento(url.searchParams);
    }
    if (url.pathname === "/api/documentos/estado" && req.method === "GET") {
      return tratarEstadoGet(url.searchParams);
    }
    if (url.pathname === "/api/documentos/estado" && req.method === "POST") {
      return tratarEstadoPost(req);
    }
    if (url.pathname === "/api/perfil" && req.method === "POST") {
      return tratarPerfilPost(req, REPO_DIR);
    }
    // GALERIA-DE-LAYOUTS-001 (corte Enio 15/09: "já ativou os layouts diferentes pro EGOS
    // APP? quero testar todos... devemos ter gerador de layouts"). Ver rotas-layout-presets.ts.
    if (url.pathname === "/api/layout-presets" && req.method === "GET") {
      return tratarLayoutPresetsGet();
    }
    if (url.pathname === "/api/layout-presets/aplicar" && req.method === "POST") {
      return tratarLayoutPresetsAplicar(req, REPO_DIR);
    }
    if (url.pathname === "/api/layout-presets/exportar" && req.method === "GET") {
      return tratarLayoutPresetsExportar(url);
    }
    if (url.pathname === "/api/layout-presets/importar" && req.method === "POST") {
      return tratarLayoutPresetsImportar(req);
    }
    if (url.pathname === "/api/notificacoes" && req.method === "GET") {
      return tratarNotificacoesGet(REPO_DIR);
    }
    // APP-HISTORICO-E-TELEMETRIA-001 (corte Enio 13/09): timeline agregada de tudo que a
    // casca/launcher/atualizador/sessões/pulso/heartbeats registram — ver rotas-historico.ts.
    if (url.pathname === "/api/historico" && req.method === "GET") {
      return tratarHistoricoGet(url);
    }
    // NOTIFICACOES-HISTORICO-NA-TELA-001 (corte Enio 14/09): gaveta 🔔 CONVERSAS — timeline
    // de avisos/fila (Conversas) + processos claude/codex vivos (Sessões). Ver rotas-conversas.ts.
    // Nome NÃO é "/api/sessoes" (achado ao ligar o servidor: esse nome já existe acima,
    // §"/api/sessoes" — listarSessoes(), sessões por TRANSCRIPT — colidiria e ficaria
    // inalcançável, 2º handler no if-chain nunca roda). "-vivas" é a distinção real: aqui é
    // processo vivo agora (ps), lá é histórico de transcript.
    if (url.pathname === "/api/conversas" && req.method === "GET") {
      return tratarConversasGet(url);
    }
    if (url.pathname === "/api/sessoes-vivas" && req.method === "GET") {
      return tratarSessoesGet();
    }
    // WPP-FILA-TRIAGEM-QUEM-E-001 (corte Enio 14/09 20:30): quem ainda não tem qualificação
    // na fila de WhatsApp, já categorizado — ver rotas-pessoas.ts / scripts/wpp-triagem.ts.
    if (url.pathname === "/api/pessoas" && req.method === "GET") {
      return tratarPessoasGet();
    }
    // USO-TEMPO-REAL-MULTI-TENANT-001 (corte Enio 14/09): 4ª aba "Uso" da mesma gaveta do
    // sino — tenant×papel×agente×modelo, janela agora/hoje/7d. Ver rotas-uso.ts.
    if (url.pathname === "/api/whatsapp/monitor" && req.method === "GET") {
      return tratarWhatsappMonitorGet();
    }
    if (url.pathname === "/api/uso" && req.method === "GET") {
      return tratarUsoGet(url);
    }
    // GASTOS-VISIVEIS-001 (corte Enio 15/09 17:05): 7ª aba "Gastos" da mesma gaveta do sino —
    // periodo=hoje|7d|30d|mes. Ver rotas-gastos.ts.
    if (url.pathname === "/api/gastos" && req.method === "GET") {
      return tratarGastosGet(url);
    }
    // ROTEIRO-CHECKLIST-CONSTANTE-001 item 3 (Prime 15/09): 5ª aba "Roteiro do projeto" da
    // mesma gaveta do sino — feito/em curso/gated/próximo do programa cinco+WhatsApp+APP.
    if (url.pathname === "/api/roteiro-projeto" && req.method === "GET") {
      return tratarRoteiroProjetoGet();
    }
    // JANELA-AGENTE-WHATSAPP-001 (15/09): espelho do PID por canal (enio-dm|cinco) sem terminal.
    if (url.pathname === "/api/agente" && req.method === "GET") {
      return tratarAgenteGet(url);
    }
    if (url.pathname === "/api/agente/enviar" && req.method === "POST") {
      return tratarAgenteEnviar(req, srv.requestIP(req)?.address ?? null);
    }
    // ROTEIRO-GRUPO-001: checklist semanal vivo de um grupo de WhatsApp. Sem segmento
    // dinâmico /:slug (o roteador deste servidor não tem — ver rotas-roteiro.ts), o
    // slug entra por query string ou corpo do POST, igual a /api/documentos/estado.
    if (url.pathname === "/api/roteiros" && req.method === "GET") {
      return Response.json(montarRoteirosApi());
    }
    if (url.pathname === "/api/roteiros/item" && req.method === "GET") {
      return tratarRoteiroGet(url.searchParams);
    }
    if (url.pathname === "/api/roteiros/whatsapp" && req.method === "GET") {
      return tratarRoteiroWhatsapp(url.searchParams);
    }
    if (url.pathname === "/api/roteiros/itens" && req.method === "POST") {
      return tratarRoteiroItens(req);
    }
    if (url.pathname === "/api/roteiros/marcar" && req.method === "POST") {
      return tratarRoteiroMarcar(req);
    }
    if (url.pathname === "/api/roteiros/anotar" && req.method === "POST") {
      return tratarRoteiroAnotar(req);
    }
    if (url.pathname === "/api/conexoes" && req.method === "GET") {
      const conexoes = await medirConexoes();
      return Response.json({ ok: true, conexoes, medidoEm: new Date().toISOString() });
    }
    // AGENDA-FONTE-ACIONAVEL-001 (corte Enio 09/09): a fonte da agenda deixa de ser um aviso
    // e vira algo que se aciona. GET devolve o que cada fonte é e sabe fazer; POST manda
    // sincronizar de verdade e devolve a falha INTEIRA quando falha (=R13).
    // BIBLIOTECA-DE-PERFIS-001 (corte Enio 09/09): a troca de perfil sai da variável de
    // ambiente e vira botão — sem isso, "compartilhar o EGOS APP" entrega um app que só o
    // dono sabe configurar.
    if (url.pathname === "/api/perfis" && req.method === "GET") {
      return tratarPerfisGet(REPO_DIR);
    }
    if (url.pathname === "/api/perfis/usar" && req.method === "POST") {
      return tratarPerfisUsar(req, REPO_DIR);
    }
    if (url.pathname === "/api/agenda/fontes" && req.method === "GET") {
      // o `comando` fica no servidor: a tela precisa saber SE dá para sincronizar, não com
      // qual binário — caminho de máquina não tem por que atravessar para o navegador.
      const capacidades = Object.fromEntries(
        Object.entries(CAPACIDADES).map(([k, v]) => [k, { ...v, comando: undefined }]),
      );
      return Response.json({ ok: true, capacidades });
    }
    if (url.pathname === "/api/agenda/sincronizar" && req.method === "POST") {
      const corpo = (await req.json().catch(() => ({}))) as { fonte?: string };
      const r = await sincronizar(String(corpo.fonte ?? ""));
      return Response.json(r, { status: r.ok ? 200 : 200 }); // falha é DADO, não erro de HTTP
    }
    // AGENDA-PASSADO-OPACO-001 + AGENDA-HOJE-COM-CARGA-001 + AGENDA-FUTURO-QUE-AVISA-001
    // (corte Enio 10/09): passado (prova, git log) + hoje (carga, régua comparável) + futuro
    // (reusa montarAgenda(), já servido em /agenda). Ver scripts/orquestra-viva/rotas-agenda.ts.
    if (url.pathname === "/api/agenda/completa" && req.method === "GET") {
      return Response.json(montarAgendaCompleta());
    }
    // "acesso direto ao Claude": manda 1 item da agenda para a fila de um agente, com o
    // correlato que start-contexto.ts já sabe sobre o título (reuso, não motor novo).
    if (url.pathname === "/api/agenda/mandar" && req.method === "POST") {
      return tratarAgendaMandar(req);
    }
    if (url.pathname === "/api/conexoes/whatsapp/medir" && req.method === "POST") {
      const conexao = await medirWhatsappAgora();
      return Response.json({ ok: true, conexao });
    }
    // EGOS-APP-GAVETA-WHATSAPP-001 (10/09): instâncias/conversas/analisadas/ações do nosso
    // WhatsApp. Leitura de DISCO local apenas — nenhuma chamada à Evolution API aqui
    // (R-WPP-ACCESS-001); a conferência ao vivo continua sendo o botão de /api/conexoes/whatsapp/medir.
    if (url.pathname === "/api/whatsapp" && req.method === "GET") {
      return Response.json(await montarWhatsapp());
    }
    // EGOS-ATENDE-CANAIS-001 (16/09): POST /api/whatsapp/canais salva a config de canais
    // (modelo/cli/escopo por canal) no arquivo persistente ~/.egos/whatsapp-canais.json —
    // a edição vive DENTRO do EGOS APP, nada hardcoded. Só 127.0.0.1 (mesmo gate das demais).
    if (url.pathname === "/api/whatsapp/canais" && req.method === "POST") {
      const ip = srv.requestIP(req)?.address ?? null;
      if (ip !== "127.0.0.1" && ip !== "::1") {
        return Response.json({ ok: false, erro: "só localhost" }, { status: 403 });
      }
      let canais: unknown[];
      try {
        canais = await req.json() as unknown[];
      } catch {
        return Response.json({ ok: false, erro: "corpo JSON inválido" }, { status: 400 });
      }
      const r = salvarCanais(canais);
      const salvo = lerJsonPersistido();
      return r.ok
        ? Response.json({ ok: true, canais: salvo ? JSON.parse(salvo) : canais })
        : Response.json({ ok: false, erro: r.motivo ?? "falha ao salvar" }, { status: 400 });
    }
    // EGOS-APP-GAVETA-MCP-001 (07/09): ?medir=1 dispara o handshake real (stdio, 6s/servidor);
    // sem o parâmetro é leitura leve (só existe_no_disco) — nunca sonda tudo sem pedido explícito.
    if (url.pathname === "/api/mcp" && req.method === "GET") {
      const medir = url.searchParams.get("medir") === "1";
      const resposta = await medirMcp({ medir });
      return Response.json(resposta);
    }
    return new Response("não encontrado", { status: 404 });
  },
});

console.log(
  `orquestra-viva: ouvindo em http://${configRede.bind}:${server.port}` +
    (configRede.bind === "127.0.0.1" ? "" : " (rede: token exigido fora do localhost)"),
);
