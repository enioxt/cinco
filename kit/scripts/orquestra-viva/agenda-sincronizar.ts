/**
 * agenda-sincronizar.ts — o que cada fonte da agenda SABE fazer, e o que acontece quando o
 * humano pede "sincroniza de novo".
 *
 * FATO GERADOR (corte Enio 2026-09-09, print da gaveta Agenda): "deve ser possível interagir
 * com as fontes, ver detalhes, sincronizar ou enviar comandos para sincronizar novamente caso
 * seja necessário". A gaveta mostrava "lido, mas desatualizado — lido há mais de 24h" e não
 * dava NADA para fazer a respeito: fonte que só reclama e não se deixa acionar transfere ao
 * humano um trabalho que a máquina sabe fazer.
 *
 * Desenho, em três regras:
 *  1. Fonte declara se é sincronizável e por qual comando — nada é inferido do nome.
 *  2. Fonte que NÃO se sincroniza (a que a própria conversa escreve) diz isso com todas as
 *     letras, em vez de mostrar um botão que não faz nada. Botão que finge é pior que
 *     ausência de botão, porque some com a dúvida sem resolver o problema.
 *  3. Falha volta INTEIRA para a tela — a linha do erro e o que fazer com ela (=R13: nada
 *     quebra em silêncio). Hoje o calendário falha com `invalid_grant`, e essa palavra
 *     precisa chegar ao Enio junto com a frase "a autorização do Google venceu".
 */

import { join } from "node:path";

const RAIZ = process.env.EGOS_REPO_DIR ?? join(import.meta.dir, "..", "..");

export interface CapacidadeFonte {
  id: string;
  /** o que alimenta esta fonte, em português de gente */
  alimentadaPor: string;
  /** com que frequência o motor automático roda (vazio = não roda sozinha) */
  cadencia: string;
  sincronizavel: boolean;
  /** comando real; vazio quando não é sincronizável */
  comando: string[];
  /** por que não dá para sincronizar — obrigatório quando sincronizavel=false */
  porQueNao?: string;
}

export const CAPACIDADES: Record<string, CapacidadeFonte> = {
  gcal: {
    id: "gcal",
    alimentadaPor: "sua conta do Google Agenda, lida por um motor que roda nesta máquina",
    cadencia: "a cada 4 horas, automático",
    sincronizavel: true,
    comando: [process.execPath, join(RAIZ, "scripts", "calendar-sync.ts"), "--exec"],
  },
  compromissos: {
    id: "compromissos",
    alimentadaPor: "o que você combina por WhatsApp, e-mail ou aqui na conversa — anotado pelo agente",
    cadencia: "sempre que algo é combinado",
    sincronizavel: false,
    comando: [],
    porQueNao:
      "esta fonte não vem de fora: ela é escrita quando você combina alguma coisa. Não há o que buscar — o que existe é pedir ao agente para anotar ou corrigir um compromisso.",
  },
};

export interface ResultadoSync {
  ok: boolean;
  fonte: string;
  /** frase curta para a tela */
  resumo: string;
  /** o erro literal, quando houve — nunca resumido a "falhou" */
  detalhe: string;
  /** o que o humano faz agora, quando há o que fazer */
  oQueFazer: string;
  duracaoMs: number;
}

/**
 * Traduz falhas conhecidas para uma frase que decide, mantendo o erro literal ao lado.
 * Falha desconhecida NUNCA vira frase bonita: volta como está.
 */
export function traduzirFalha(saida: string): { resumo: string; oQueFazer: string } {
  if (/invalid_grant/i.test(saida)) {
    return {
      resumo: "a autorização do Google venceu — o motor não consegue mais ler sua agenda",
      oQueFazer: "reautorizar a conta do Google; enquanto isso, a agenda mostra o que já tinha sido lido, com a data.",
    };
  }
  if (/ENOTFOUND|ECONNREFUSED|network|getaddrinfo/i.test(saida)) {
    return { resumo: "sem rede para falar com a fonte", oQueFazer: "tentar de novo quando a conexão voltar." };
  }
  if (/timeout|timed out/i.test(saida)) {
    return { resumo: "a fonte demorou demais para responder", oQueFazer: "tentar de novo em alguns minutos." };
  }
  return { resumo: "a sincronização falhou", oQueFazer: "ler a linha do erro ao lado — ela é a mensagem do próprio motor." };
}

/**
 * Roda o comando da fonte. NUNCA lança: erro vira ResultadoSync com ok=false (=R13).
 * `executor` existe para os goldens rodarem sem tocar a rede.
 */
export async function sincronizar(
  fonteId: string,
  executor?: (cmd: string[]) => Promise<{ codigo: number; saida: string }>,
): Promise<ResultadoSync> {
  const t0 = Date.now();
  const cap = CAPACIDADES[fonteId];
  if (!cap) {
    return { ok: false, fonte: fonteId, resumo: "esta fonte não existe na agenda", detalhe: `id desconhecido: ${fonteId}`, oQueFazer: "recarregar o app — a lista de fontes mudou.", duracaoMs: 0 };
  }
  if (!cap.sincronizavel) {
    return { ok: false, fonte: fonteId, resumo: "esta fonte não se sincroniza", detalhe: cap.porQueNao ?? "", oQueFazer: "pedir ao agente para anotar ou corrigir o compromisso.", duracaoMs: 0 };
  }

  const rodar =
    executor ??
    (async (cmd: string[]) => {
      const proc = Bun.spawn(cmd, { stdout: "pipe", stderr: "pipe", cwd: RAIZ });
      const [out, err] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
      const codigo = await proc.exited;
      return { codigo, saida: `${out}${err}`.trim() };
    });

  try {
    const { codigo, saida } = await rodar(cap.comando);
    const duracaoMs = Date.now() - t0;
    if (codigo === 0 && !/FAIL|erro|error/i.test(saida)) {
      return { ok: true, fonte: fonteId, resumo: "sincronizado agora", detalhe: saida.split("\n").slice(-3).join(" · ").slice(0, 400), oQueFazer: "", duracaoMs };
    }
    const t = traduzirFalha(saida);
    return { ok: false, fonte: fonteId, resumo: t.resumo, detalhe: saida.split("\n").filter(Boolean).slice(-3).join(" · ").slice(0, 400), oQueFazer: t.oQueFazer, duracaoMs };
  } catch (e) {
    return { ok: false, fonte: fonteId, resumo: "não consegui nem rodar o comando desta fonte", detalhe: String(e).slice(0, 300), oQueFazer: "ver se o motor da fonte existe nesta máquina.", duracaoMs: Date.now() - t0 };
  }
}
