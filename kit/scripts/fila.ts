#!/usr/bin/env bun
/**
 * fila.ts — fila de jobs ENTRE SESSÕES da mesma máquina (corte Enio 2026-08-29:
 * "3 sessões abertas... atuando através de jobs, de fila de espera, com funções
 * diferentes... com mensagens entre elas").
 *
 * O que é: caixa de entrada por agente em disco (~/.egos/fila/<agente>/), com
 * claim ATÔMICO por rename — duas sessões nunca pegam o mesmo job. A sessão
 * "escuta" com `esperar` (bloqueia até chegar job; task notification acorda o
 * turno). Sem daemon, sem rede: disco + git são o barramento soberano (P4).
 *
 * NÃO é: mesa.ts (quórum de DECISÃO entre janelas), event-bus.ts (in-process,
 * FROZEN), notify-router (alerta a HUMANO). Consulta feita: 0 equivalentes.
 *
 * Estágios: pendentes/ → em-andamento/ (claim: <sessao>__<arquivo>) → concluidos/
 * Job = JSON {id, agente, titulo, corpo, de, criadoEm} (+resultado ao concluir).
 * Limite dito: latência = intervalo do esperar; não há push entre processos.
 *
 * Uso:
 *   bun scripts/fila.ts postar <agente> "<titulo>" [--corpo "<texto>"] [--de <sessao>]
 *   bun scripts/fila.ts listar <agente>
 *   bun scripts/fila.ts pegar <agente> --sessao <id>       # claim atômico ou "vazio"
 *   bun scripts/fila.ts concluir <caminho-do-job> --resultado "<texto>"
 *   bun scripts/fila.ts esperar <agente> [--intervalo 60] [--ciclos 720]
 *   bun scripts/fila.ts estado
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { join, basename } from "node:path";

const BASE = process.env.EGOS_FILA_DIR ?? join(process.env.HOME ?? "", ".egos", "fila");
// L3 (corte Enio 2026-08-30): teto de idade pra job em-andamento gritar ÓRFÃO-SUSPEITO
// no `estado`. Default 30min, override pontual via env — não é config de produto, é
// o limite acima do qual "ainda trabalhando" vira "provavelmente morto e ninguém viu".
const TETO_ORFAO_MIN = Number(process.env.EGOS_FILA_TETO_MIN ?? "30");
const [cmd, agente, ...resto] = process.argv.slice(2);

function arg(nome: string, padrao?: string): string | undefined {
  const i = resto.indexOf(nome);
  return i >= 0 ? resto[i + 1] : padrao;
}
function dirs(a: string) {
  const d = { pend: join(BASE, a, "pendentes"), and: join(BASE, a, "em-andamento"), conc: join(BASE, a, "concluidos") };
  for (const p of Object.values(d)) mkdirSync(p, { recursive: true });
  return d;
}
function lerJob(caminho: string): Record<string, unknown> | null {
  try { return JSON.parse(readFileSync(caminho, "utf-8")); } catch { return null; }
}

// Achado [4] de revisão adversarial (2026-08-30, revisor+Codex): agente vira segmento
// de caminho via join(BASE, agente, ...) sem validação — medido: `postar '../fuga'`
// escreveu fora da base. Todo comando que recebe um nome de agente (direto do CLI, ou
// de dentro do JSON — `concluir` deriva o destino de j.agente) valida antes do join().
// corte Enio 2026-08-30: humano lê relógio de parede — armazenar ISO, MOSTRAR hora local
function horaLocal(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleTimeString("pt-BR", { hour12: false });
}

const RE_AGENTE = /^[a-z0-9._-]+$/;
function validarAgente(a: unknown): void {
  if (typeof a !== "string" || !RE_AGENTE.test(a)) {
    console.error(`agente invalido: "${String(a)}" — exige /^[a-z0-9._-]+$/ (sem barra, sem "..")`);
    process.exit(1);
  }
}

if (cmd === "postar" && agente) {
  validarAgente(agente);
  const titulo = resto.filter((r) => !r.startsWith("--") && resto[resto.indexOf(r) - 1]?.startsWith("--") !== true)[0] ?? "sem-titulo";
  const d = dirs(agente);
  const id = `${Date.now()}-${titulo.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)}`;
  const job = { id, agente, titulo, corpo: arg("--corpo", ""), de: arg("--de", "desconhecida"), criadoEm: new Date().toISOString() };
  writeFileSync(join(d.pend, `${id}.json`), JSON.stringify(job, null, 2));
  console.log(`postado: ${join(d.pend, `${id}.json`)}`);
} else if (cmd === "listar" && agente) {
  validarAgente(agente);
  const d = dirs(agente);
  const itens = readdirSync(d.pend).sort();
  if (!itens.length) { console.log("vazio"); process.exit(0); }
  for (const f of itens) {
    const j = lerJob(join(d.pend, f));
    console.log(j ? `${f} · ${j.titulo} · de ${j.de}` : `${f} · ⚪ NAO-LEGIVEL (json corrompido — dito, nao escondido)`);
  }
} else if (cmd === "pegar" && agente) {
  validarAgente(agente);
  const sessao = arg("--sessao");
  if (!sessao) { console.error("pegar exige --sessao <id>"); process.exit(2); }
  const d = dirs(agente);
  for (const f of readdirSync(d.pend).sort()) {
    const destino = join(d.and, `${sessao}__${f}`);
    try {
      renameSync(join(d.pend, f), destino); // atômico no mesmo fs: só UMA sessão vence
      // L1+L2 (corte Enio 2026-08-30 "me fale se está sendo todo gravado corretamente"):
      // quem pegou e QUANDO vão para DENTRO do JSON. Antes o executor vivia só no nome do
      // arquivo (<sessao>__<id>.json) — mover ou arquivar apagava a autoria (=R-MUTACAO-
      // PRESERVA-ANCORA-001: a âncora sobrevive em campo que os leitores consultam).
      // E sem `pegoEm` o registro não distinguia ESPERA de TRABALHO: o ping de teste ficou
      // 20min parado numa fila surda e, no JSON, isso era idêntico a 20min executando.
      // A escrita vem DEPOIS do rename de propósito: só quem venceu o claim chega aqui.
      const j = lerJob(destino);
      if (j) {
        j.executadoPor = sessao;
        j.pegoEm = new Date().toISOString();
        writeFileSync(destino, JSON.stringify(j, null, 2));
      } else {
        // JSON ilegível não é reescrito — reescrever destruiria o original sem poder lê-lo.
        // Falha DITA, nunca silenciosa (R13-c): o claim vale, a marcação não aconteceu.
        console.error(`⚪ NAO-LEGIVEL: claim feito, mas executadoPor/pegoEm NAO gravados em ${destino}`);
      }
      console.log(destino);
      console.log(readFileSync(destino, "utf-8"));
      process.exit(0);
    } catch { /* outra sessão levou este; tenta o próximo */ }
  }
  console.log("vazio");
} else if (cmd === "concluir" && agente) {
  const caminho = agente; // aqui o 2º arg é o caminho do job em-andamento
  const j = lerJob(caminho);
  if (!j) { console.error(`⚪ NAO-LEGIVEL: ${caminho}`); process.exit(2); }
  validarAgente(j.agente); // [4]: o destino em disco vem de j.agente — mesma regra do CLI
  j.resultado = arg("--resultado", "");
  j.concluidoEm = new Date().toISOString();
  const conc = join(BASE, String(j.agente), "concluidos");
  mkdirSync(conc, { recursive: true });
  // ordem importa: gravar o enriquecido no destino e APAGAR o original —
  // rename por cima sobrescreveria o resultado com a versão velha (g4 pegou).
  writeFileSync(join(conc, basename(caminho)), JSON.stringify(j, null, 2));
  unlinkSync(caminho);
  console.log(`concluido: ${join(conc, basename(caminho))}`);
} else if (cmd === "esperar" && agente) {
  validarAgente(agente);
  const intervalo = Number(arg("--intervalo", "60"));
  const ciclos = Number(arg("--ciclos", "720"));
  const d = dirs(agente);
  // Presença: standby só é real se for MENSURÁVEL (F3 do piloto 29/08 — estado
  // mostrava jobs, não orelhas). Morte suja deixa presença órfã: o estado acusa
  // pelo pid morto, nunca esconde.
  const pres = join(BASE, agente, ".escutando");
  writeFileSync(pres, JSON.stringify({ pid: process.pid, sessao: arg("--sessao", "?"), armadoEm: new Date().toISOString(), intervalo }));
  // Achado [1] de revisão adversarial (2026-08-30): limpar() rodava incondicional no
  // exit — se uma escuta NOVA já tinha rearmado (sobrescrito) a mesma presença antes da
  // VELHA terminar, a saída limpa da velha apagava a presença da nova (dono errado).
  // Conserto: só remove se o arquivo, no momento do exit, ainda é a presença DESTA
  // sessão (pid bate). Arquivo ilegível/sumido: nunca reescreve — avisa e não mexe.
  const limpar = () => {
    let raw: string;
    try { raw = readFileSync(pres, "utf-8"); }
    catch (e) {
      if ((e as NodeJS.ErrnoException)?.code !== "ENOENT") {
        console.error(`⚪ limpar: presença ilegível em ${pres} — não removida (${(e as Error).message})`);
      }
      return; // ENOENT: já não existe, nada a fazer; outro erro: dito, não mexe.
    }
    let p: Record<string, unknown>;
    try { p = JSON.parse(raw); }
    catch { console.error(`⚪ limpar: presença corrompida em ${pres} — não removida`); return; }
    if (p.pid === process.pid) {
      try { unlinkSync(pres); } catch { /* já foi */ }
    } // senão: outra escuta é dona agora — a velha sai sem tocar na presença alheia.
  };
  process.on("exit", limpar);
  console.log(`fila[${agente}]: escutando (${intervalo}s × ${ciclos})`);
  let i = 0;
  const tick = () => {
    const n = readdirSync(d.pend).length;
    if (n > 0) { console.log(`=== ${n} JOB(S) NA FILA de ${agente} — $(pegar) ===`); process.exit(0); }
    if (++i >= ciclos) { console.log("teto atingido sem job — rearmar se a escuta continua"); process.exit(0); }
    setTimeout(tick, intervalo * 1000);
  };
  tick();
} else if (cmd === "estado") {
  if (!existsSync(BASE)) { console.log("fila vazia (diretório não existe)"); process.exit(0); }
  for (const a of readdirSync(BASE)) {
    if (a.startsWith(".")) continue;
    // Achado [5] de revisão adversarial (2026-08-30): statSync sem try derrubava o
    // comando INTEIRO se um diretório sumisse entre o readdir e o stat — alinhado com
    // a política do orquestra-viva.ts (listarAgentes): entrada ilegível não trava o
    // laço, só é pulada (⚪ dita implicitamente pela ausência, nunca throw solto).
    let ehDiretorio: boolean;
    try { ehDiretorio = statSync(join(BASE, a)).isDirectory(); }
    catch { continue; }
    if (!ehDiretorio) continue; // arquivo solto na base não é agente (g7 pegou)
    const d = dirs(a);
    let escuta = "🔴 SEM ESCUTA (agente surdo — rearmar)";
    const pres = join(BASE, a, ".escutando");
    if (existsSync(pres)) {
      const p = lerJob(pres);
      if (p && typeof p.pid === "number") {
        try { process.kill(p.pid as number, 0); escuta = `🟢 escuta VIVA (pid ${p.pid}, sessão ${p.sessao}, armada ${horaLocal(String(p.armadoEm))})`; }
        catch { escuta = `⚪ presença ÓRFÃ (pid ${p.pid} morto — escuta caiu sem limpar; rearmar)`; }
      } else { escuta = "⚪ presença NAO-LEGIVEL — rearmar"; }
    }
    // JOB 5 / L3 (corte Enio 2026-08-30): job em-andamento envelhecido GRITA aqui —
    // não fica escondido atrás de uma contagem "1 em andamento" que parece saudável.
    // Idade = agora - pegoEm; sem pegoEm (job no formato velho, pré-L1L2) nunca vira
    // verde fingido — sai como idade desconhecida, explícito.
    const suspeitos: string[] = [];
    for (const f of readdirSync(d.and)) {
      const j = lerJob(join(d.and, f));
      const pegoEmMs = j && typeof j.pegoEm === "string" ? Date.parse(j.pegoEm) : NaN;
      if (Number.isNaN(pegoEmMs)) { suspeitos.push("⚪ idade desconhecida"); continue; }
      const idadeMin = Math.floor((Date.now() - pegoEmMs) / 60000);
      if (idadeMin > TETO_ORFAO_MIN) suspeitos.push(`🔴 ÓRFÃO-SUSPEITO (${idadeMin}min)`);
    }
    const sufixo = suspeitos.length ? ` · ${suspeitos.join(" · ")}` : "";
    console.log(`${a}: ${readdirSync(d.pend).length} pendente(s) · ${readdirSync(d.and).length} em andamento · ${readdirSync(d.conc).length} concluido(s) · ${escuta}${sufixo}`);
  }
} else {
  console.error("uso: fila.ts postar|listar|pegar|concluir|esperar|estado (ver cabeçalho)");
  process.exit(2);
}
