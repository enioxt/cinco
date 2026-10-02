/**
 * rotas-perfis.ts — a BIBLIOTECA de perfis e o botão de trocar.
 *
 * FATO GERADOR (corte Enio 2026-09-09): "já temos vários templates para mudar totalmente,
 * igual temos no EGOS APP, mas ainda não ligamos o botão de mudar — pesquise e já vamos
 * ligar; e compartilhar o EGOS APP é a tarefa mais importante, ter as primeiras pessoas
 * conseguindo configurar".
 *
 * O que a varredura achou (e é o motivo desta rota existir): a task `EGOS-APP-TEMPLATES-5-001`
 * nasceu em 02/09 como "5 personas + seletor de cores + biblioteca de templates", foi
 * REDEFINIDA em 04/09 para "template = perfil" e fechada com o mecanismo pronto — perfil
 * resolvido por `EGOS_PERFIL` → `~/.egos/perfil.json` → `config/perfil.default.json`.
 * O mecanismo funciona; o que nunca existiu foi a TELA. Trocar de perfil hoje exige mexer
 * em variável de ambiente ou editar JSON à mão — e é exatamente isso que impede alguém de
 * fora configurar o próprio app. Sem esta rota, "compartilhar o EGOS APP" entrega um app
 * que só o dono sabe ajustar.
 *
 * Duas rotas, e as duas são estreitas de propósito:
 *   GET  /api/perfis          → lista os perfis disponíveis (nunca escreve)
 *   POST /api/perfis/usar     → adota um deles: copia para ~/.egos/perfil.json
 *
 * FRONTEIRA (mesma de rotas-perfil.ts): a LEITURA pode vir de qualquer lugar; a ESCRITA
 * acontece só dentro de `~/.egos`. Um perfil de exemplo vindo do repo é COPIADO para a
 * zona de escrita — o arquivo versionado nunca é alterado pelo clique de ninguém.
 */

import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { normalizarPerfil, type Perfil } from "../lib/perfil";

export interface PerfilDisponivel {
  /** identificador estável: o caminho relativo ao repo, ou "pessoal" para o de ~/.egos */
  id: string;
  nome: string;
  arquivo: string;
  origem: "exemplo" | "pessoal";
  /** true quando é o que está governando a tela agora */
  ativo: boolean;
  modulos: number;
  dominios: string[];
  integracoes: string[];
  /** a linha "_o_que_e" do JSON, quando o autor escreveu uma — nunca inventada aqui */
  descricao: string;
}

function zonaDeEscrita(): string {
  return resolve(join(process.env.HOME ?? "", ".egos"));
}

function destinoPessoal(): string {
  return join(zonaDeEscrita(), "perfil.json");
}

function lerUm(caminho: string, origem: "exemplo" | "pessoal", repoDir: string): PerfilDisponivel | null {
  try {
    const bruto = JSON.parse(readFileSync(caminho, "utf-8")) as Record<string, unknown>;
    const p: Perfil = normalizarPerfil(bruto);
    const descricao = typeof bruto._o_que_e === "string" ? bruto._o_que_e : "";
    return {
      id: origem === "pessoal" ? "pessoal" : caminho.replace(repoDir + "/", ""),
      nome: p.nome || "(sem nome)",
      arquivo: caminho,
      origem,
      ativo: false,
      modulos: p.modulos.length,
      dominios: p.dominios,
      integracoes: p.integracoes,
      descricao,
    };
  } catch {
    // perfil ilegível não derruba a lista (=R13): ele simplesmente não entra, e a contagem
    // de ilegíveis volta no campo `ilegiveis` para a tela poder dizer que há um problema.
    return null;
  }
}

export interface ListaPerfis {
  perfis: PerfilDisponivel[];
  /** quantos arquivos de perfil não puderam ser lidos — dito, nunca silenciado */
  ilegiveis: number;
  /** o arquivo que governa a tela AGORA, medido — não inferido */
  ativoArquivo: string;
  /** true quando EGOS_PERFIL está setado: nesse caso o clique não muda nada e a tela avisa */
  travadoPorAmbiente: boolean;
}

export function listarPerfis(repoDir: string): ListaPerfis {
  const perfis: PerfilDisponivel[] = [];
  let ilegiveis = 0;

  const dirConfig = join(repoDir, "config");
  if (existsSync(dirConfig)) {
    for (const f of readdirSync(dirConfig).sort()) {
      if (!/^perfil\..+\.json$/.test(f)) continue;
      const p = lerUm(join(dirConfig, f), "exemplo", repoDir);
      if (p) perfis.push(p);
      else ilegiveis++;
    }
  }

  const pessoal = destinoPessoal();
  if (existsSync(pessoal)) {
    const p = lerUm(pessoal, "pessoal", repoDir);
    if (p) perfis.unshift(p); // o teu vem primeiro
    else ilegiveis++;
  }

  // qual está no ar AGORA — mesma ordem de resolução de lib/perfil.ts, medida aqui.
  const explicito = (process.env.EGOS_PERFIL ?? "").trim();
  const travadoPorAmbiente = Boolean(explicito && existsSync(explicito));
  const ativoArquivo = travadoPorAmbiente
    ? resolve(explicito)
    : existsSync(pessoal)
      ? resolve(pessoal)
      : resolve(join(dirConfig, "perfil.default.json"));
  for (const p of perfis) p.ativo = resolve(p.arquivo) === ativoArquivo;

  return { perfis, ilegiveis, ativoArquivo, travadoPorAmbiente };
}

export interface ResultadoUso {
  ok: boolean;
  motivo: string;
  /** o que o humano faz agora — vazio quando deu certo e não há nada a fazer */
  oQueFazer: string;
}

/**
 * Adota um perfil: copia o arquivo escolhido para `~/.egos/perfil.json`, com backup do que
 * estava lá. NUNCA escreve fora da zona; NUNCA altera o arquivo de exemplo versionado.
 */
export function usarPerfil(repoDir: string, id: string): ResultadoUso {
  const lista = listarPerfis(repoDir);
  if (lista.travadoPorAmbiente) {
    return {
      ok: false,
      motivo: "este app foi aberto com um perfil fixado por fora (variável de ambiente)",
      oQueFazer: "trocar aqui não teria efeito — reabra o app sem a variável, ou edite o arquivo que ela aponta.",
    };
  }
  const alvo = lista.perfis.find((p) => p.id === id);
  if (!alvo) return { ok: false, motivo: `não existe perfil com o id "${id}"`, oQueFazer: "recarregar a lista — ela mudou desde que a tela abriu." };
  if (alvo.origem === "pessoal") return { ok: true, motivo: "este já é o teu perfil", oQueFazer: "" };

  const destino = destinoPessoal();
  if (resolve(dirname(destino)) !== zonaDeEscrita()) {
    return { ok: false, motivo: "destino fora da zona de escrita", oQueFazer: "isto é defeito nosso — nada foi escrito." };
  }
  try {
    mkdirSync(dirname(destino), { recursive: true });
    if (existsSync(destino)) copyFileSync(destino, `${destino}.bak`);
    copyFileSync(alvo.arquivo, destino);
    return {
      ok: true,
      motivo: `agora o app usa o perfil "${alvo.nome}" — o teu anterior ficou guardado ao lado, com sufixo .bak`,
      oQueFazer: "recarregue a tela para ver a mudança.",
    };
  } catch (e) {
    return { ok: false, motivo: `não consegui escrever: ${String(e).slice(0, 160)}`, oQueFazer: "conferir permissão da pasta pessoal do EGOS." };
  }
}

export function tratarPerfisGet(repoDir: string): Response {
  return Response.json({ ok: true, ...listarPerfis(repoDir), medidoEm: new Date().toISOString() });
}

export async function tratarPerfisUsar(req: Request, repoDir: string): Promise<Response> {
  const corpo = (await req.json().catch(() => ({}))) as { id?: string };
  const r = usarPerfil(repoDir, String(corpo.id ?? ""));
  return Response.json(r); // falha é DADO na tela, não erro de HTTP
}
