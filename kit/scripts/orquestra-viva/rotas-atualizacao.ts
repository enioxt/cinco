/**
 * rotas-atualizacao.ts — EGOS-APP-ATUALIZACAO-VISIVEL-001 (10/09) + EGOS-APP-ATUALIZACAO-
 * FLUIDA-001 (corte Enio 15/09, verbatim: "está chegando com muita frequência sobre nova
 * versão, pedindo para reiniciar, mas ele deve reiniciar de forma fluida, deve ser todo
 * modular aqui no Linux, não deve ser preciso reiniciar para as alterações entrarem aqui").
 *
 * FATO GERADOR original (10/09): o botão "versão" (nucleo.ts:gitCabeca) lê o git do DISCO em
 * tempo real — então depois de um `git pull` já mostra o SHA novo, MESMO QUE o processo Bun
 * ainda esteja servindo rotas compiladas em memória de ANTES do pull.
 *
 * FATO GERADOR da fatia fluida (15/09): a faixa tratava TODA divergência do mesmo jeito —
 * pedindo reiniciar o PROCESSO (systemd) mesmo quando a única mudança era um `.css`/`.js`
 * de ativos, que a própria página já buscaria de novo (as rotas /app.js, /app.css e / já
 * são servidas com `cache-control: no-store`, ver orquestra-viva.ts — o navegador NUNCA
 * cacheia essas respostas; o que faltava era o CLIENTE decidir se precisa ou não do
 * restart, e o SERVIDOR dizer qual dos dois casos é).
 *
 * O conserto: em vez de comparar só o HEAD do git (granularidade "commit inteiro"), este
 * módulo tira um INSTANTÂNEO por GRUPO de arquivo (mtime+tamanho, não conteúdo — barato) no
 * BOOT do processo e compara contra o instantâneo AGORA:
 *   - grupo "ativos"   — o que o NAVEGADOR busca de novo sozinho (app-*.js, app-*.css,
 *                        orquestra-viva.html, config/vocabulario.json, config/toasts.json).
 *   - grupo "servidor" — o que só entra em vigor com o PROCESSO Bun novo (orquestra-viva.ts
 *                        + todo *.ts de scripts/orquestra-viva/, exceto *.test.ts).
 * Servidor mudou → tipo "servidor" (vence; reiniciar também traz os ativos novos).
 * Só ativos mudaram → tipo "ativos" (a página se vira sozinha, sem tocar no processo).
 * Nenhum dos dois → não desatualizado.
 *
 * ARQUIVO NOVO — zero import de orquestra-viva.ts, mesmo padrão de rotas-documentos.ts.
 */
import { existsSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gitCabeca, type GitCabeca } from "./nucleo";

const DIR_ORQUESTRA_PADRAO = dirname(fileURLToPath(import.meta.url)); // .../scripts/orquestra-viva
const SCRIPTS_DIR_PADRAO = join(DIR_ORQUESTRA_PADRAO, ".."); // .../scripts
const CONFIG_DIR_PADRAO = join(SCRIPTS_DIR_PADRAO, "..", "config"); // .../config

/** Assinatura barata (mtime+tamanho, nunca conteúdo — ler tudo a cada poll de 30s seria
 *  caro de verdade) de um conjunto de arquivos. Arquivo ausente entra como "⚪" — some/
 *  aparece TAMBÉM conta como mudança (R13-c: ausência não é "sem mudança"). Ordenado antes
 *  de juntar: a ordem do `readdirSync` não é garantida entre chamadas/SOs. */
export function assinaturaGrupo(caminhos: string[]): string {
  return caminhos
    .slice()
    .sort()
    .map((c) => {
      try {
        const s = statSync(c);
        return `${c}:${s.mtimeMs}:${s.size}`;
      } catch {
        return `${c}:⚪`;
      }
    })
    .join("|");
}

/** Grupo ATIVOS: tudo que o navegador busca de novo sozinho (nenhum precisa do processo). */
export function arquivosAtivos(
  dirOrquestra = DIR_ORQUESTRA_PADRAO,
  scriptsDir = SCRIPTS_DIR_PADRAO,
  configDir = CONFIG_DIR_PADRAO,
): string[] {
  const arquivos: string[] = [];
  if (existsSync(dirOrquestra)) {
    for (const f of readdirSync(dirOrquestra)) {
      if (/^app-.*\.(js|css)$/.test(f)) arquivos.push(join(dirOrquestra, f));
    }
  }
  arquivos.push(join(scriptsDir, "orquestra-viva.html"));
  arquivos.push(join(configDir, "vocabulario.json"));
  arquivos.push(join(configDir, "toasts.json"));
  return arquivos;
}

/** Grupo SERVIDOR: só entra em vigor com o processo Bun reiniciado. `.test.ts` fica de fora
 *  de propósito — teste mudar não muda o que está SERVINDO agora. */
export function arquivosServidor(dirOrquestra = DIR_ORQUESTRA_PADRAO, scriptsDir = SCRIPTS_DIR_PADRAO): string[] {
  const arquivos: string[] = [join(scriptsDir, "orquestra-viva.ts")];
  if (existsSync(dirOrquestra)) {
    for (const f of readdirSync(dirOrquestra)) {
      if (f.endsWith(".ts") && !f.endsWith(".test.ts")) arquivos.push(join(dirOrquestra, f));
    }
  }
  return arquivos;
}

export interface Instantaneo {
  ativos: string;
  servidor: string;
}

export function capturarInstantaneo(
  dirOrquestra = DIR_ORQUESTRA_PADRAO,
  scriptsDir = SCRIPTS_DIR_PADRAO,
  configDir = CONFIG_DIR_PADRAO,
): Instantaneo {
  return {
    ativos: assinaturaGrupo(arquivosAtivos(dirOrquestra, scriptsDir, configDir)),
    servidor: assinaturaGrupo(arquivosServidor(dirOrquestra, scriptsDir)),
  };
}

/** "servidor" SEMPRE vence quando os dois grupos mudaram — reiniciar o processo também
 *  serve os ativos novos, então não há caso de perder a atualização dos ativos. */
export function classificarAtualizacao(boot: Instantaneo, atual: Instantaneo): "ativos" | "servidor" | null {
  const servidorMudou = boot.servidor !== atual.servidor;
  const ativosMudaram = boot.ativos !== atual.ativos;
  if (!servidorMudou && !ativosMudaram) return null;
  return servidorMudou ? "servidor" : "ativos";
}

// Capturado UMA VEZ, no import deste módulo — que acontece no boot do processo, antes do
// Bun.serve subir. Nunca reatribuído: é a fotografia do que este processo está SERVINDO.
const BOOT: GitCabeca = await gitCabeca();
const BOOT_EM = new Date().toISOString();
const BOOT_INSTANTANEO: Instantaneo = capturarInstantaneo();

export interface RespostaAtualizacao {
  bootHead: string;
  bootVersao: string;
  bootEm: string;
  headAtual: string;
  versaoAtual: string;
  /** true quando o grupo "ativos" OU o grupo "servidor" mudou desde o boot. */
  desatualizado: boolean;
  /** qual dos dois casos é — só o cliente sabe o que fazer com cada um; `null` quando
   *  `desatualizado` é false. "servidor" vence quando os dois mudaram (ver classificarAtualizacao). */
  tipo: "ativos" | "servidor" | null;
  /** assinatura combinada dos dois grupos AGORA — o cliente guarda o último hash já aplicado
   *  e não avisa de novo pela mesma versão (dedup — R16-a-vizinho: "menos ruído"). Não é
   *  criptográfico, só precisa mudar quando o conteúdo muda. */
  hashVersao: string;
  msgAtual: string;
}

export async function montarAtualizacaoApi(): Promise<RespostaAtualizacao> {
  const atual = await gitCabeca();
  const atualInstantaneo = capturarInstantaneo();
  const tipo = classificarAtualizacao(BOOT_INSTANTANEO, atualInstantaneo);
  return {
    bootHead: BOOT.head,
    bootVersao: BOOT.versao,
    bootEm: BOOT_EM,
    headAtual: atual.head,
    versaoAtual: atual.versao,
    desatualizado: tipo !== null,
    tipo,
    hashVersao: String(Bun.hash(`${atualInstantaneo.ativos}#${atualInstantaneo.servidor}`)),
    msgAtual: atual.msg,
  };
}

/** Só reinicia o serviço systemd DESTE app — nunca outro. Nome do serviço fixo (não vem do
 *  request): superfície de auto-restart não pode aceitar "qual serviço" de fora (isolamento
 *  de escopo, mesmo espírito de R-WPP-ACCESS-001 aplicado a processo local). */
export async function tratarReiniciar(): Promise<Response> {
  try {
    const proc = Bun.spawn(["systemctl", "--user", "restart", "egos-app.service"], {
      stdout: "ignore",
      stderr: "pipe",
      stdin: "ignore",
    });
    proc.unref(); // o processo que chama isto está prestes a morrer — não espera o próprio fim
    return Response.json({ ok: true, aviso: "reiniciando — a tela reconecta sozinha em alguns segundos" });
  } catch (e) {
    return Response.json(
      { ok: false, erro: `falha ao pedir restart: ${e instanceof Error ? e.message : String(e)}` },
      { status: 500 },
    );
  }
}
