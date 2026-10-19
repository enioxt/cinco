#!/usr/bin/env bun
/**
 * Validador local mínimo dos plugins EGOS.
 *
 * Fonte dos limites: documentação pública OpenAI Plugins consultada em 2026-10-13.
 * Este gate NÃO substitui o validador/uploader oficial da OpenAI.
 *
 * Uso:
 *   bun scripts/plugins/validate-plugin-packages.ts
 *   bun scripts/plugins/validate-plugin-packages.ts plugins/guard-brasil
 *   bun scripts/plugins/validate-plugin-packages.ts --rede   # também confere as 3 URLs EGOS na rede
 *
 * PLUGIN-TRAZ-AO-EGOS-001 (regra do Enio, 14/10 ~04h25): "tudo nos plugins que publicarmos deve
 * trazer ao EGOS, para sermos encontrados fácil e para melhoria ficar simples e ágil". Todo
 * plugin.json precisa de: (1) `homepage` na página da capacidade em https://egos.ia.br/portas/;
 * (2) `repository` git público (https://github.com/<dono>/<repo>); (3) canal de melhoria em
 * `bugs.url` (issues do repositório ou página do site egos.ia.br). Sem isso, o gate recusa.
 * Estático por padrão (sem rede); `--rede` prova que as URLs existem de verdade — página que cai
 * no fallback da SPA, âncora ausente ou repositório privado (404 sem login) reprovam.
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { blocosFaltando, PAGINAS_CAPACIDADE } from "../lib/molde-capacidade.ts";

const repoRoot = resolve(import.meta.dir, "../..");
const pluginsRoot = join(repoRoot, "plugins");

const errors: string[] = [];
const warnings: string[] = [];

function fail(scope: string, message: string) {
  errors.push(`${scope}: ${message}`);
}

function warn(scope: string, message: string) {
  warnings.push(`${scope}: ${message}`);
}

function isOneLine(value: unknown): value is string {
  return typeof value === "string" && !/[\r\n]/.test(value);
}

function assertString(
  scope: string,
  label: string,
  value: unknown,
  max: number,
  required = true,
) {
  if (value == null && !required) return;
  if (typeof value !== "string" || value.trim() === "") {
    fail(scope, `${label} deve ser string não vazia`);
    return;
  }
  if (value.length > max) fail(scope, `${label} tem ${value.length} caracteres; máximo ${max}`);
}

function validHttpUrl(value: unknown): boolean {
  if (typeof value !== "string" || value.trim() === "") return false;
  try {
    const u = new URL(value);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

const GITHUB_REPO = /^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+?(?:\.git)?\/?$/;
const GITHUB_ISSUES = /^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/issues\/?$/;
const PAGINA_PORTAS = /^https:\/\/egos\.ia\.br\/portas\//;
const PAGINA_EGOS = /^https:\/\/egos\.ia\.br\//;

/** URLs que o gate de rede precisa provar, por pacote. */
const paraRede: Array<{ scope: string; homepage?: string; repository?: string; canal?: string }> = [];

/** PLUGIN-TRAZ-AO-EGOS-001 — checagem estática (sempre roda). Exportada para o golden. */
export function egosLinksErros(m: any): string[] {
  const erros: string[] = [];
  const homepage = m?.homepage;
  if (typeof homepage !== "string" || !PAGINA_PORTAS.test(homepage)) {
    erros.push("homepage deve ser a página da capacidade em https://egos.ia.br/portas/ (PLUGIN-TRAZ-AO-EGOS-001)");
  }
  const repo = typeof m?.repository === "string" ? m.repository : m?.repository?.url;
  if (typeof repo !== "string" || !GITHUB_REPO.test(repo)) {
    erros.push("repository deve ser repositório git público https://github.com/<dono>/<repo> (PLUGIN-TRAZ-AO-EGOS-001)");
  }
  const canal = typeof m?.bugs === "string" ? m.bugs : m?.bugs?.url;
  if (typeof canal !== "string" || !(GITHUB_ISSUES.test(canal) || PAGINA_EGOS.test(canal))) {
    erros.push("bugs.url (canal de melhoria) deve ser URL de issues no GitHub ou página do egos.ia.br (PLUGIN-TRAZ-AO-EGOS-001)");
  }
  return erros;
}


const PUBLIC_SITE = join(repoRoot, "apps/egos-landing/public");
const lerPagina = (slug: string): string | null => {
  try { return readFileSync(join(PUBLIC_SITE, "portas", slug, "index.html"), "utf8"); } catch { return null; }
};

/**
 * Decisão do dono (14/10): cada pacote publicado tem página no molde padrão (docs/governance/MODELO_DOC_CAPACIDADE.md).
 * A `homepage` precisa ser /portas/<slug>/ — âncora do índice (/portas/#id) não é página — e a página precisa ter os 12 blocos.
 * `ler` é injetável para o golden.
 */
export function paginaNoMoldeErros(m: any, ler: (slug: string) => string | null = lerPagina): string[] {
  const hp = typeof m?.homepage === "string" ? m.homepage : "";
  const achou = /^https:\/\/egos\.ia\.br\/portas\/([a-z0-9][a-z0-9-]*)\/?$/.exec(hp);
  if (!achou) return ["homepage deve ser a página própria da capacidade (https://egos.ia.br/portas/<nome>/), não o índice nem uma âncora"]; // replicavel-ok: domínio público que se descreve
  const html = ler(achou[1]!);
  if (html == null) return [`página /portas/${achou[1]}/ não existe em apps/egos-landing/public`];
  const falta = blocosFaltando(html);
  return falta.length ? [`página /portas/${achou[1]}/ fora do molde: faltam os blocos ${falta.join(", ")}`] : [];
}

/** Toda página de capacidade conhecida (PAGINAS_CAPACIDADE) existe e tem os blocos do molde. Vazio = ok. */
export function paginasForaDoMolde(ler: (slug: string) => string | null = lerPagina): string[] {
  const erros: string[] = [];
  for (const { slug } of PAGINAS_CAPACIDADE) {
    const html = ler(slug);
    if (html == null) erros.push(`/portas/${slug}/ ausente`);
    else { const f = blocosFaltando(html); if (f.length) erros.push(`/portas/${slug}/ sem os blocos ${f.join(", ")}`); }
  }
  return erros;
}

async function baixar(url: string): Promise<{ status: number; corpo: string }> {
  const r = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(15_000) });
  return { status: r.status, corpo: await r.text() };
}

/** `--rede`: prova que homepage/repo/canal existem para quem não está logado. */
async function verificarRede() {
  const fallback = await baixar("https://egos.ia.br/portas/__rota-inexistente-gate__").catch(() => null);
  for (const { scope, homepage, repository, canal } of paraRede) {
    if (homepage) {
      const u = new URL(homepage);
      const semAncora = homepage.split("#")[0];
      const r = await baixar(semAncora).catch(() => null);
      if (!r || r.status !== 200) fail(scope, `homepage ${semAncora} não respondeu 200 (${r?.status ?? "erro de rede"})`);
      else if (fallback && r.corpo === fallback.corpo) fail(scope, `homepage ${semAncora} é o fallback da SPA, não uma página da capacidade`);
      else if (u.hash && !r.corpo.includes(`id="${decodeURIComponent(u.hash.slice(1))}"`)) {
        fail(scope, `homepage: âncora ${u.hash} não existe em ${semAncora}`);
      }
    }
    for (const [rotulo, url] of [["repository", repository], ["bugs.url", canal]] as const) {
      if (!url) continue;
      const r = await fetch(url.replace(/\.git$/, ""), { redirect: "follow", signal: AbortSignal.timeout(15_000) }).catch(() => null);
      if (!r || r.status !== 200) fail(scope, `${rotulo} ${url} não é público (HTTP ${r?.status ?? "erro de rede"} sem login)`);
    }
  }
}

function readJson(path: string, scope: string): any | null {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (err) {
    fail(scope, `JSON inválido em ${path}: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}

function validateSkillDir(pluginDir: string, scope: string) {
  const skillsDir = join(pluginDir, "skills");
  if (!existsSync(skillsDir)) return;

  const skillDirs = readdirSync(skillsDir)
    .map((name) => join(skillsDir, name))
    .filter((path) => statSync(path).isDirectory());

  if (skillDirs.length === 0) {
    fail(scope, "skills/ existe, mas não contém nenhuma skill");
    return;
  }

  for (const skillDir of skillDirs) {
    const skillName = basename(skillDir);
    const skillFile = join(skillDir, "SKILL.md");
    if (!existsSync(skillFile)) {
      fail(scope, `skill ${skillName} não contém SKILL.md`);
      continue;
    }
    const text = readFileSync(skillFile, "utf8");
    if (!text.startsWith("---\n")) fail(scope, `skill ${skillName} sem frontmatter YAML`);
    if (!/\nname:\s*\S+/.test(text)) fail(scope, `skill ${skillName} sem name no frontmatter`);
    if (!/\ndescription:\s*\S+/.test(text)) fail(scope, `skill ${skillName} sem description no frontmatter`);
  }
}

function validateMcp(pluginDir: string, manifest: any, scope: string) {
  const mcpPath = join(pluginDir, "mcp.json");
  if (!existsSync(mcpPath)) return;

  const mcp = readJson(mcpPath, scope);
  if (!mcp) return;

  const serialized = JSON.stringify(mcp);
  const forbidden = [
    "localhost",
    "127.0.0.1",
    "0.0.0.0",
    "example.invalid",
    "<domain>",
    "<domínio>",
    "REPLACE_ME",
  ];
  for (const token of forbidden) {
    if (serialized.includes(token)) fail(scope, `mcp.json contém endpoint placeholder/local: ${token}`);
  }

  const iface = manifest?.extensions?.["com.openai"]?.interface ?? {};
  for (const field of ["websiteURL", "privacyPolicyURL", "termsOfServiceURL", "supportURL"]) {
    if (!validHttpUrl(iface[field])) {
      fail(scope, `${field} é obrigatório para pacote com MCP remoto pronto para submissão`);
    }
  }
}

function validatePlugin(pluginDir: string) {
  const scope = basename(pluginDir);
  const manifestPath = join(pluginDir, "plugin.json");
  if (!existsSync(manifestPath)) {
    fail(scope, "plugin.json ausente");
    return;
  }

  const m = readJson(manifestPath, scope);
  if (!m) return;

  if (m.$schema !== "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json") {
    fail(scope, "$schema portátil Agent Plugins ausente/incorreto");
  }

  assertString(scope, "name", m.name, 64);
  if (typeof m.name === "string" && !/^[a-z0-9][a-z0-9-]*$/.test(m.name)) {
    fail(scope, "name deve usar minúsculas, números e hífen simples");
  }

  assertString(scope, "version", m.version, 64);
  if (typeof m.version === "string" && !/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(m.version)) {
    fail(scope, "version deve parecer semver explícito para submissão");
  }

  assertString(scope, "description", m.description, 4000);

  const iface = m?.extensions?.["com.openai"]?.interface;
  if (!iface || typeof iface !== "object") {
    fail(scope, "extensions.com.openai.interface ausente");
    return;
  }

  assertString(scope, "displayName", iface.displayName, 30);
  assertString(scope, "shortDescription", iface.shortDescription, 30);
  assertString(scope, "longDescription", iface.longDescription, 4000);
  assertString(scope, "developerName", iface.developerName, 80);
  assertString(scope, "category", iface.category, 120);

  if (!Array.isArray(iface.capabilities)) {
    fail(scope, "capabilities deve ser array");
  } else {
    if (iface.capabilities.length > 20) fail(scope, "capabilities excede 20 itens");
    iface.capabilities.forEach((cap: unknown, i: number) => {
      if (!isOneLine(cap) || cap.trim() === "" || cap.length > 120) {
        fail(scope, `capabilities[${i}] inválida ou >120 caracteres`);
      }
    });
  }

  if (!Array.isArray(iface.defaultPrompt) || iface.defaultPrompt.length === 0) {
    fail(scope, "defaultPrompt deve conter ao menos um starter prompt");
  } else {
    if (iface.defaultPrompt.length > 3) fail(scope, "defaultPrompt excede 3 itens");
    const normalized = new Set<string>();
    iface.defaultPrompt.forEach((prompt: unknown, i: number) => {
      if (!isOneLine(prompt) || prompt.trim() === "") {
        fail(scope, `defaultPrompt[${i}] deve ser uma linha não vazia`);
        return;
      }
      if (prompt.length > 128) fail(scope, `defaultPrompt[${i}] tem ${prompt.length}; máximo 128`);
      if (/@[A-Za-z0-9_-]+/.test(prompt)) fail(scope, `defaultPrompt[${i}] não deve conter @mention de servidor`);
      const key = prompt.normalize("NFKC").replace(/\s+/g, " ").trim().toLowerCase();
      if (normalized.has(key)) fail(scope, `defaultPrompt[${i}] é duplicado após normalização`);
      normalized.add(key);
    });
  }

  for (const field of ["websiteURL", "privacyPolicyURL", "termsOfServiceURL"]) {
    if (iface[field] != null && !validHttpUrl(iface[field])) fail(scope, `${field} não é URL HTTP(S) válida`);
  }

  if (m.homepage != null && !validHttpUrl(m.homepage)) fail(scope, "homepage não é URL HTTP(S) válida");
  if (m.repository != null && !validHttpUrl(m.repository)) fail(scope, "repository não é URL HTTP(S) válida");

  for (const e of egosLinksErros(m)) fail(scope, e);
  for (const e of paginaNoMoldeErros(m)) fail(scope, e);
  paraRede.push({
    scope,
    homepage: typeof m.homepage === "string" ? m.homepage : undefined,
    repository: typeof m.repository === "string" ? m.repository : m.repository?.url,
    canal: typeof m.bugs === "string" ? m.bugs : m.bugs?.url,
  });

  validateSkillDir(pluginDir, scope);
  validateMcp(pluginDir, m, scope);

  if (!existsSync(join(pluginDir, "mcp.json"))) {
    warn(scope, "sem mcp.json — válido para skills-only ou pacote MCP ainda não conectado");
  }
}

if (import.meta.main) await main();

async function main() {
const rede = process.argv.includes("--rede");
const requested = process.argv.slice(2).filter((a) => a !== "--rede");
const dirs = requested.length
  ? requested.map((p) => resolve(repoRoot, p))
  : readdirSync(pluginsRoot)
      .map((name) => join(pluginsRoot, name))
      .filter((path) => statSync(path).isDirectory() && existsSync(join(path, "plugin.json")));

for (const dir of dirs) validatePlugin(dir);
for (const e of paginasForaDoMolde()) fail("molde", e);
if (rede) await verificarRede();

for (const message of warnings) console.warn(`⚠️ ${message}`);
if (errors.length) {
  for (const message of errors) console.error(`❌ ${message}`);
  console.error(`\n${errors.length} erro(s) de pacote.`);
  process.exit(1);
}

console.log(`✅ ${dirs.length} pacote(s) passou/passaram no gate local de estrutura/limites.`);
console.log("ℹ️  Isso NÃO substitui o uploader/review oficial da OpenAI nem prova funcionamento do MCP.");
}
