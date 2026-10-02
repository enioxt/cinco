/**
 * rotas-reuniao.ts — REFATORACAO-ORGANICA-001 (04/09): extraído de orquestra-viva.ts.
 * Reunião ao vivo (gravador local) + crônica da orquestra (narrativa gerada por
 * scripts/cronica.ts) — agrupados aqui porque nenhum dos dois tem tamanho próprio
 * para módulo dedicado e os dois são "narrativa da sessão lida do disco".
 * Zero mudança de comportamento — só onde o código mora.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { CRONICA_DIR, CRONICA_TOM_MAX, REPO_DIR, lerJobSeguro } from "./nucleo";

// ── REUNIÃO AO VIVO (corte Enio 2026-09-01: "esse botão de gravar deve estar dentro do
// EGOS APP, não faz sentido ser separado"). O painel LÊ O DISCO — não conversa com o
// processo python. Motivo: um servidor a menos para cair, e o estado fica verdadeiro
// mesmo se o motor morrer (pid órfão vira "parado", não "gravando para sempre").

// Caminho do motor de gravação: configurável, com padrão relativo ao repo (o kernel e o
// egos-end são irmãos na árvore de produção). Literal absoluto quebraria a máquina do outro.
const AO_VIVO = process.env.EGOS_AO_VIVO_PY
  ?? join(REPO_DIR, "..", "egos-end", "apps", "gravador-reuniao", "ao_vivo.py");

export function pastaReuniaoHoje(): string {
  return join(process.env.HOME ?? "", "egos-recordings", "ao-vivo", new Date().toISOString().slice(0, 10));
}

/** Estado real da gravação, lido do disco. Processo morto com PID no arquivo = parado. */
export function estadoReuniao(): Record<string, unknown> {
  const pasta = pastaReuniaoHoje();
  const pid = join(pasta, "ao_vivo.pid");
  let rodando = false;
  if (existsSync(pid)) {
    try {
      process.kill(Number(readFileSync(pid, "utf-8").trim()), 0); // sinal 0 = "existe?"
      rodando = true;
    } catch {
      rodando = false; // PID órfão: o motor caiu sem limpar. Dizer "parado" é a verdade.
    }
  }
  const t = join(pasta, "transcript.md");
  const linhas = existsSync(t)
    ? readFileSync(t, "utf-8").split("\n").filter((l) => l.startsWith("["))
    : [];
  // O áudio mora em subpasta por sessão (audio-HHMMSS) desde 01/09 — contar só na raiz
  // devolveria 0 durante uma gravação viva, que é pior que não contar.
  let trechos = 0;
  try {
    for (const d of readdirSync(pasta)) {
      if (!d.startsWith("audio-")) continue;
      trechos += readdirSync(join(pasta, d)).filter((f) => f.startsWith("mic_") && f.endsWith(".wav")).length;
    }
  } catch { /* pasta do dia ainda não existe */ }
  return {
    rodando,
    falas: linhas.length,
    trechos,
    ultimas: linhas, // histórico COMPLETO (corte Enio ao vivo, 15/09) — o scroll é da UI, não do dado
    pasta,
    disponivel: existsSync(AO_VIVO),
  };
}

export async function tratarReuniaoComando(req: Request): Promise<Response> {
  let corpo: { acao?: string };
  try { corpo = await req.json(); } catch { return Response.json({ ok: false, erro: "corpo não é JSON" }, { status: 400 }); }
  const acao = corpo.acao;
  if (acao !== "start" && acao !== "stop") {
    return Response.json({ ok: false, erro: `ação desconhecida: ${acao ?? "(vazia)"}` }, { status: 400 });
  }
  if (!existsSync(AO_VIVO)) {
    return Response.json({ ok: false, erro: `motor não encontrado em ${AO_VIVO}` }, { status: 500 });
  }
  try {
    // `start --bg` solta o laço e volta. Sem `--painel`: a luz mora AQUI, no EGOS APP.
    const args = acao === "start" ? [AO_VIVO, "start", "--bg"] : [AO_VIVO, "stop"];
    const proc = Bun.spawn(["python3", ...args], { stdout: "pipe", stderr: "pipe" });
    const out = (await new Response(proc.stdout).text()).trim();
    const err = (await new Response(proc.stderr).text()).trim();
    const code = await proc.exited;
    if (code !== 0) return Response.json({ ok: false, erro: err || `saiu com código ${code}` }, { status: 500 });
    return Response.json({ ok: true, saida: out || err });
  } catch (e) {
    return Response.json({ ok: false, erro: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

/**
 * Baixar a transcrição (corte Enio ao vivo, 15/09: "precisamos do botão de transcrever,
 * baixar e todas as ações necessárias"). Dois formatos, um endpoint:
 *   /reuniao/download            → bruto, como está no disco
 *   /reuniao/download?seguro=1   → passa pelo COFRE antes (Guard Brasil): CPF/telefone/
 *     e-mail viram ficha «CPF_1» — é o único que sai desta máquina para colar numa IA
 *     de terceiro (a mesma garantia da manhã: zero IA no caminho da anonimização).
 */
export async function tratarReuniaoDownload(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const pasta = pastaReuniaoHoje();
  const caminho = join(pasta, "transcript.md");
  if (!existsSync(caminho)) {
    return new Response("ainda não há transcrição hoje", { status: 404 });
  }
  const bruto = readFileSync(caminho, "utf-8");
  const seguro = url.searchParams.get("seguro") === "1";
  if (!seguro) {
    return new Response(bruto, {
      headers: { "Content-Type": "text/markdown; charset=utf-8", "Content-Disposition": `attachment; filename="reuniao-${new Date().toISOString().slice(0, 10)}.md"` },
    });
  }
  const { anonimizar } = await import("../../packages/guard-brasil/src/lib/cofre.js");
  const r = anonimizar(bruto);
  const aviso = r.seguro
    ? `<!-- 🟢 ${r.cofre.fichas.size} item(ns) sensível(is) trocado(s) por ficha; re-varredura não achou resto -->\n`
    : `<!-- 🔴 ATENÇÃO: ${r.restantes.length} item(ns) sensível(is) NÃO puderam ser trocados — revise antes de enviar -->\n`;
  return new Response(aviso + r.texto, {
    headers: { "Content-Type": "text/markdown; charset=utf-8", "Content-Disposition": `attachment; filename="reuniao-${new Date().toISOString().slice(0, 10)}-SEGURO.md"` },
  });
}

export function lerCronica(): { historia: string | null; meta?: Record<string, unknown> | null; aviso?: string } {
  const historiaPath = join(CRONICA_DIR, "historia.md");
  if (!existsSync(historiaPath)) {
    return { historia: null, aviso: "⚪ ainda não narrada" };
  }
  let historia: string;
  try {
    historia = readFileSync(historiaPath, "utf-8");
  } catch {
    return { historia: null, aviso: "⚪ historia.md existe mas não pôde ser lida" };
  }
  const meta = lerJobSeguro(join(CRONICA_DIR, "historia.json"));
  return { historia, meta };
}

export async function tratarCronicaGerar(req: Request): Promise<Response> {
  let corpo: { tom?: unknown } = {};
  try {
    corpo = await req.json();
  } catch {
    /* corpo vazio é válido — tom é opcional */
  }
  const args = ["scripts/cronica.ts", "gerar"];
  if (corpo.tom !== undefined) {
    if (typeof corpo.tom !== "string" || corpo.tom.length === 0 || corpo.tom.length > CRONICA_TOM_MAX) {
      return Response.json(
        { ok: false, erro: `tom precisa ser string não-vazia com até ${CRONICA_TOM_MAX} caracteres` },
        { status: 400 }
      );
    }
    args.push("--tom", corpo.tom);
  }
  try {
    // DETACHED: a narrativa demora (chamada LLM até 120s) — o painel repolla /cronica
    // em vez de segurar esta resposta. stdio ignorado + unref() para não travar o servidor.
    const proc = Bun.spawn([process.execPath, ...args], { cwd: REPO_DIR, stdout: "ignore", stderr: "ignore", stdin: "ignore" });
    proc.unref();
    return Response.json({ ok: true, iniciado: true });
  } catch (e) {
    return Response.json({ ok: false, erro: `spawn falhou: ${(e as Error).message}` }, { status: 500 });
  }
}
