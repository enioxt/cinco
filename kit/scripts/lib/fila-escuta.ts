/**
 * fila-escuta.ts — a régua ÚNICA de "alguém está escutando esta fila?" (FILA-SILENCIO-001).
 * Extraída de scripts/fila.ts em 13/10 (SESSOES-SE-COMUNICAM-001) porque um segundo leitor
 * (scripts/fila-sem-leitor.ts, o leitor residente) precisa da mesma resposta: duas cópias da
 * régua divergem (censo dos defeitos que voltam, item 3). 4 estados, nenhum é silêncio.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export type Escuta = { estado: "viva" | "orfa" | "ilegivel" | "ausente"; pid?: number; sessao?: string; armadoEm?: string };

/** Tolerância entre o início do processo e a gravação do `.escutando` (o esperar grava logo ao subir). */
const TOLERANCIA_INICIO_S = 5;

/**
 * Identidade do pid (achado P2 do #750): `kill(pid,0)` só diz que ALGUM processo tem esse número; o pid de um
 * `esperar` morto sem limpeza pode ser reciclado por processo alheio. Régua: o processo vivo tem de ter
 * começado ANTES do `armadoEm` gravado (+ tolerância). Reciclado = nasceu depois = não é o ouvinte.
 * Sem `armadoEm` legível ou sem `ps -o etimes` (não-Linux) a identidade não é verificável: devolve true
 * (comportamento anterior), nunca inventa órfã.
 */
export function pidPertenceAoRegistro(pid: number, armadoEm: unknown, agoraMs: number = Date.now()): boolean {
  const gravadoMs = typeof armadoEm === "string" ? Date.parse(armadoEm) : NaN;
  if (!Number.isFinite(gravadoMs)) return true;
  const r = spawnSync("ps", ["-o", "etimes=", "-p", String(pid)], { encoding: "utf-8", timeout: 3000 });
  const idadeS = Number(String(r.stdout ?? "").trim());
  if (r.status !== 0 || !Number.isFinite(idadeS)) return true;
  const inicioMs = agoraMs - idadeS * 1000;
  return inicioMs <= gravadoMs + TOLERANCIA_INICIO_S * 1000;
}

export function lerEscuta(base: string, agente: string): Escuta {
  const pres = join(base, agente, ".escutando");
  if (!existsSync(pres)) return { estado: "ausente" };
  let p: Record<string, unknown> | null = null;
  try { p = JSON.parse(readFileSync(pres, "utf-8")); } catch { p = null; }
  if (!p || typeof p.pid !== "number") return { estado: "ilegivel" };
  const pid = p.pid as number;
  // sinal 0 não entrega nada: só pergunta ao kernel se o processo existe. Arquivo
  // presente NÃO é ouvinte presente — é o caso que mais engana, porque parece saudável.
  try { process.kill(pid, 0); } catch { return { estado: "orfa", pid, sessao: String(p.sessao ?? "?"), armadoEm: String(p.armadoEm ?? "") }; }
  if (!pidPertenceAoRegistro(pid, p.armadoEm)) return { estado: "orfa", pid, sessao: String(p.sessao ?? "?"), armadoEm: String(p.armadoEm ?? "") };
  return { estado: "viva", pid, sessao: String(p.sessao ?? "?"), armadoEm: String(p.armadoEm ?? "") };
}
