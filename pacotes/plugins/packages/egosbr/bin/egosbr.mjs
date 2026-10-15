#!/usr/bin/env node
// egosbr — EGOS na linha de comando. Sem dependências: roda com `npx egosbr` (Node 18+) e `bunx egosbr`.
// Fala só com o conector MCP público do EGOS (sem senha, só leitura). Nada daqui grava nada na sua máquina.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline";

const AQUI = dirname(fileURLToPath(import.meta.url));
const PKG = JSON.parse(readFileSync(join(AQUI, "..", "package.json"), "utf8"));
const MCP_URL = process.env.EGOSBR_MCP_URL || "https://mcp.egos.ia.br/publico/mcp";
const CABECALHOS = { "content-type": "application/json", accept: "application/json, text/event-stream" };

function lerPortas() {
  try {
    return JSON.parse(readFileSync(join(AQUI, "..", "portas.json"), "utf8"));
  } catch {
    return null;
  }
}

/** Corpo de resposta MCP: JSON direto ou SSE (linhas "data: {...}"). Devolve a lista de mensagens JSON-RPC. */
export function lerMensagens(tipo, corpo) {
  if (!corpo || !corpo.trim()) return [];
  if (String(tipo).includes("text/event-stream")) {
    return corpo.split(/\r?\n/).filter((l) => l.startsWith("data:")).map((l) => JSON.parse(l.slice(5).trim()));
  }
  const j = JSON.parse(corpo);
  return Array.isArray(j) ? j : [j];
}

async function postar(msg) {
  const r = await fetch(MCP_URL, { method: "POST", headers: CABECALHOS, body: JSON.stringify(msg), signal: AbortSignal.timeout(30000) });
  const corpo = await r.text();
  if (!r.ok && r.status !== 202) throw new Error(`HTTP ${r.status} do conector: ${corpo.slice(0, 200)}`);
  return lerMensagens(r.headers.get("content-type") || "", corpo);
}

async function chamar(nome, argumentos = {}) {
  const [m] = await postar({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: nome, arguments: argumentos } });
  if (!m || m.error) throw new Error(m?.error?.message || "sem resposta do conector");
  const texto = m.result?.content?.find((c) => c.type === "text")?.text ?? "";
  if (m.result?.isError) throw new Error(texto || "a ferramenta devolveu erro");
  try { return JSON.parse(texto); } catch { return texto; }
}

/** Ponte stdio → conector remoto: cada linha JSON-RPC que chega no stdin vira um POST; cada resposta vira uma linha no stdout. */
async function ponte() {
  process.stderr.write(`[egosbr] ponte MCP stdio → ${MCP_URL}\n`);
  const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });
  let fila = Promise.resolve();
  for await (const linha of rl) {
    if (!linha.trim()) continue;
    fila = fila.then(async () => {
      let msg;
      try { msg = JSON.parse(linha); } catch {
        process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "JSON inválido" } }) + "\n");
        return;
      }
      try {
        for (const r of await postar(msg)) process.stdout.write(JSON.stringify(r) + "\n");
      } catch (e) {
        if (msg && msg.id !== undefined && msg.id !== null) {
          process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id: msg.id, error: { code: -32603, message: `egosbr: ${e.message}` } }) + "\n");
        } else process.stderr.write(`[egosbr] ${e.message}\n`);
      }
    });
  }
  await fila;
}

const INSTALAR = {
  "claude-code": () => `claude mcp add --transport http --scope user egos ${MCP_URL}\n# ou o plugin: claude plugin marketplace add https://egos.ia.br/plugins/marketplace.json && claude plugin install egos@egos`,
  codex: () => `codex mcp add egos --url ${MCP_URL}`,
  cursor: () => `# ~/.cursor/mcp.json\n${JSON.stringify({ mcpServers: { egos: { url: MCP_URL } } }, null, 2)}`,
  gemini: () => `gemini mcp add --transport http --scope user egos ${MCP_URL}`,
  "claude-app": () => `Configurações → Conectores → Adicionar conector personalizado\nNome: egos · URL: ${MCP_URL} · OAuth em branco`,
  chatgpt: () => `Configurações → Modo desenvolvedor → novo conector\nURL: ${MCP_URL} · Autenticação: Nenhuma`,
  stdio: () => `# para cliente MCP que só fala stdio:\n${JSON.stringify({ mcpServers: { egos: { command: "npx", args: ["-y", "egosbr", "mcp"] } } }, null, 2)}`,
};

const AJUDA = `egosbr ${PKG.version} — o EGOS de qualquer IA

  egosbr                    as portas para usar o EGOS (MCP, plugin, npm, A2A…)
  egosbr instalar <ia>      como ligar: ${Object.keys(INSTALAR).join(", ")}
  egosbr ferramentas        as ferramentas do conector público
  egosbr diagnostico        o roteiro "cabe IA?" (7 perguntas), direto do conector
  egosbr mcp                ponte stdio → conector público (para cliente que só fala stdio)
  --json                    saída em JSON · --version · --help

Conector: ${MCP_URL} (sem senha, só leitura) · https://egos.ia.br/portas/`;

function mostrarPortas(json) {
  const p = lerPortas();
  if (!p) { console.log("portas.json ausente neste pacote; veja https://egos.ia.br/portas/"); return; }
  if (json) { console.log(JSON.stringify(p, null, 2)); return; }
  const rot = { "no-ar": "no ar", "pronto-falta-publicar": "pronto, falta publicar", "codigo-pronto-falta-deploy": "código pronto, falta subir" };
  console.log(`Portas do EGOS (estado conferido em ${p.estado_em})\n`);
  for (const x of p.portas) {
    console.log(`● ${x.nome} — ${rot[x.estado] ?? x.estado}`);
    for (const c of x.como) console.log(`    ${c}`);
  }
  console.log(`\nMais: https://egos.ia.br/portas/ · egosbr --help`);
}

export async function principal(argv) {
  const [cmd, ...resto] = argv;
  const json = argv.includes("--json");
  if (cmd === "--version" || cmd === "-v") { console.log(PKG.version); return 0; }
  if (cmd === "--help" || cmd === "-h" || cmd === "ajuda") { console.log(AJUDA); return 0; }
  if (!cmd || cmd === "portas" || cmd === "--json") { mostrarPortas(json); return 0; }
  if (cmd === "mcp") { await ponte(); return 0; }
  if (cmd === "instalar") {
    const ia = resto.find((x) => !x.startsWith("-"));
    if (!ia || !INSTALAR[ia]) { console.error(`uso: egosbr instalar <${Object.keys(INSTALAR).join("|")}>`); return 2; }
    console.log(INSTALAR[ia]());
    return 0;
  }
  if (cmd === "ferramentas") {
    const [m] = await postar({ jsonrpc: "2.0", id: 1, method: "tools/list" });
    const tools = m?.result?.tools ?? [];
    if (json) console.log(JSON.stringify(tools, null, 2));
    else for (const t of tools) console.log(`● ${t.name}\n    ${t.description}`);
    return tools.length ? 0 : 1;
  }
  if (cmd === "diagnostico") {
    const r = await chamar("diagnostico_0_infinito");
    if (json) { console.log(JSON.stringify(r, null, 2)); return 0; }
    console.log(`Cabe IA? — motor ${r.motor_versao}. ${r.como_usar}\n`);
    for (const d of r.dimensoes ?? []) console.log(`${d.ordem}. ${d.nome}: ${d.pergunta}`);
    console.log(`\nCom as notas, o veredito sai por regra fixa: peça à sua IA para chamar diagnostico_0_infinito com \`notas\`.`);
    return 0;
  }
  console.error(`comando desconhecido: ${cmd}\n\n${AJUDA}`);
  return 2;
}

const direto = process.argv[1] && fileURLToPath(import.meta.url) === (await import("node:fs")).realpathSync(process.argv[1]);
if (direto) {
  principal(process.argv.slice(2)).then((c) => { process.exitCode = c; }, (e) => { console.error(`egosbr: ${e.message}`); process.exitCode = 1; });
}
