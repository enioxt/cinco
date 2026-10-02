/**
 * coletores-conexoes.ts — EGOS-APP-CONTA-E-VERSAO-001 fatia 3 "CONEXÕES" (corte Enio 06/09:
 * "ver o que está conectado, qual email do GitHub, qual número WhatsApp por exemplo").
 * Fato gerador: o .git/config deste repo tinha user.email t@t.com e 30 commits saíram
 * assinados "teste" sem nenhuma tela avisar — cada item aqui é MEDIDO por comando/arquivo,
 * NUNCA inferido; ausência declarada (`nao-configurado` + `falta`) é diferente de erro real
 * (`falhou` + mensagem) — R13 (nada de sucesso-fantasso, nada de 500 fingindo verde).
 * NUNCA ecoa token/senha/chave (R-SEC-007): identificador é e-mail/login/número/host, nada mais.
 * WhatsApp NÃO chama a Evolution API na medição automática (R-WPP-ACCESS-001) — só mostra o
 * que está declarado em .env/.env.local; medirWhatsappAgora() é a ação sob demanda do botão.
 *
 * LEIGOS fatia 3 (corte Enio 08/09, vídeo 20:42 "ainda com dados de sistema, não está sendo
 * feito para um usuário"): `humano` é a 1ª linha que qualquer pessoa lê (frase sem jargão);
 * `detalhe` continua existindo — cru, técnico — mas migra para o tooltip da camada 2 no
 * front (app-conexoes.js), nunca some (R-SIMPLIFICAR "dobrar, não amputar"). NÃO reescreve a
 * medição/estado, só acrescenta a frase — cebola por cima do que já existia.
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import { lerJobSeguro, REPO_DIR } from "./nucleo";

export type EstadoConexao = "medido" | "falhou" | "nao-configurado";

export interface Conexao {
  id: string;
  rotulo: string;
  estado: EstadoConexao;
  identificador: string;
  humano: string;
  detalhe: string;
  medidoEm: string;
  falta?: string;
}

const TIMEOUT_MS = 3_000;

function conexao(
  id: string, rotulo: string, estado: EstadoConexao, identificador: string, humano: string, detalhe: string, medidoEm: string, falta?: string,
): Conexao {
  return falta
    ? { id, rotulo, estado, identificador, humano, detalhe, medidoEm, falta }
    : { id, rotulo, estado, identificador, humano, detalhe, medidoEm };
}

/** spawn com timeout manual via AbortController (mesmo padrão de rotas-documentos.ts:gitAsync) —
 *  nunca lança: erro de spawn (binário ausente) ou abort viram { ok:false, err } (=R13). */
async function rodar(cmd: string[], opts: { cwd?: string; timeoutMs?: number } = {}): Promise<{ ok: boolean; out: string; err: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? TIMEOUT_MS);
  try {
    const proc = Bun.spawn(cmd, { cwd: opts.cwd, stdout: "pipe", stderr: "pipe", signal: controller.signal });
    const out = (await new Response(proc.stdout).text()).trim();
    const err = (await new Response(proc.stderr).text()).trim();
    const code = await proc.exited;
    return { ok: code === 0, out, err };
  } catch (e) {
    return { ok: false, out: "", err: e instanceof Error ? e.message : String(e) };
  } finally {
    clearTimeout(timer);
  }
}

/** git: user.name/user.email do REPO_DIR + de onde vem — avisa quando o local diverge do
 *  global (fato gerador: t@t.com local assinando 30 commits sem ninguém perceber). */
export async function medirGit(): Promise<Conexao> {
  const agora = new Date().toISOString();
  const [local, global, nome, origem] = await Promise.all([
    rodar(["git", "config", "--local", "user.email"], { cwd: REPO_DIR }),
    rodar(["git", "config", "--global", "user.email"]),
    rodar(["git", "config", "user.name"], { cwd: REPO_DIR }),
    rodar(["git", "config", "--show-origin", "user.email"], { cwd: REPO_DIR }),
  ]);
  const localEmail = local.ok ? local.out : "";
  const globalEmail = global.ok ? global.out : "";
  const email = localEmail || globalEmail;
  if (!email) {
    return conexao("git", "Git", "nao-configurado", "", "Ainda não sabemos quem assina o que muda no código", "sem user.email configurado (nem local, nem global)", agora, 'rode: git config user.email "voce@exemplo.com"');
  }
  const divergeGlobal = Boolean(localEmail) && localEmail !== globalEmail;
  const fonte = origem.ok ? origem.out.split("\t")[0] : "⚪";
  const detalhe = `${nome.ok && nome.out ? nome.out : "⚪"} <${email}>${divergeGlobal ? " · local ≠ global" : ""} · origem: ${fonte}`;
  const humanoGit = divergeGlobal
    ? "Assinando como uma conta diferente da principal desta máquina — confira se é intencional"
    : "Sabemos quem assina cada mudança de código nesta máquina";
  return conexao("git", "Git", "medido", email, humanoGit, detalhe, agora);
}

/** github: `gh auth status` — binário ausente ou sem sessão é ausência (nao-configurado),
 *  nunca falha; saída que não bate com o padrão conhecido é o único caso "falhou". */
export async function medirGithub(): Promise<Conexao> {
  const agora = new Date().toISOString();
  const r = await rodar(["gh", "auth", "status"]);
  const texto = `${r.out}\n${r.err}`;
  if (/ENOENT|no such file|not found|comando não encontrado/i.test(r.err)) {
    return conexao("github", "GitHub", "nao-configurado", "", "Não conectado — falta instalar a ferramenta de linha de comando do GitHub", "gh (GitHub CLI) não encontrado nesta máquina", agora, "instalar gh e rodar: gh auth login");
  }
  const login = texto.match(/[Aa]ccount ([^\s(]+)/);
  if (login) {
    const protocolo = texto.match(/[Gg]it operations protocol:\s*(\S+)/);
    return conexao("github", "GitHub", "medido", login[1], "Conectado à sua conta do GitHub", `git operations: ${protocolo ? protocolo[1] : "⚪"}`, agora);
  }
  if (!r.ok) {
    return conexao("github", "GitHub", "nao-configurado", "", "Não conectado — é preciso autorizar uma vez", "gh instalado mas sem sessão ativa", agora, "rode: gh auth login");
  }
  return conexao("github", "GitHub", "falhou", "", "Não consegui confirmar a conexão com o GitHub agora", `saída inesperada de gh auth status: ${texto.slice(0, 200)}`, agora);
}

/** whatsapp: declarado (nunca chamado) — host + nome da instância Evolution do .env/.env.local
 *  desta máquina. Número só sai com o botão "medir agora" (medirWhatsappAgora, R-WPP-ACCESS-001). */
export function medirWhatsapp(): Conexao {
  const agora = new Date().toISOString();
  const base = (process.env.EVOLUTION_API_URL ?? "").trim();
  const instancia = (process.env.WHATSAPP_INSTANCE ?? process.env.EVOLUTION_INSTANCE ?? "").trim();
  if (!base || !instancia) {
    return conexao("whatsapp", "WhatsApp", "nao-configurado", "", "Não conectado — falta declarar qual número usar", "EVOLUTION_API_URL e/ou instância não declarados", agora, "declarar EVOLUTION_API_URL + WHATSAPP_INSTANCE (ou EVOLUTION_INSTANCE) em .env.local");
  }
  return conexao("whatsapp", "WhatsApp", "medido", instancia, "Número declarado — clique em \"medir agora\" para confirmar ao vivo", `host ${base} · número não lido (sob demanda — clique em "medir agora")`, agora);
}

/** ação sob demanda do botão — 1 chamada única à Evolution API, filtrada pela instância
 *  já declarada (nunca a conta inteira sem filtro — R-WPP-ACCESS-001). */
export async function medirWhatsappAgora(): Promise<Conexao> {
  const agora = new Date().toISOString();
  const base = (process.env.EVOLUTION_API_URL ?? "").replace(/\/$/, "");
  const key = process.env.EVOLUTION_API_KEY ?? "";
  const instancia = (process.env.WHATSAPP_INSTANCE ?? process.env.EVOLUTION_INSTANCE ?? "").trim();
  if (!base || !key || !instancia) {
    return conexao("whatsapp", "WhatsApp", "nao-configurado", "", "Não dá para medir agora — faltam dados de acesso declarados", "faltam EVOLUTION_API_URL/KEY/instância para medir agora", agora, "declarar as 3 variáveis em .env.local");
  }
  try {
    const r = await fetch(`${base}/instance/fetchInstances`, { headers: { apikey: key }, signal: AbortSignal.timeout(6_000) });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const arr = await r.json();
    const lista = Array.isArray(arr) ? arr : [];
    const alvo = lista.find((i: any) => (i.name ?? i.instance?.instanceName) === instancia);
    if (!alvo) {
      return conexao("whatsapp", "WhatsApp", "falhou", "", "A instância declarada não apareceu na conta do WhatsApp", `instância "${instancia}" declarada não aparece na conta Evolution`, agora);
    }
    const numero = typeof alvo.number === "string" && alvo.number ? alvo.number : "⚪";
    const estadoConexao = alvo.connectionStatus ?? alvo.instance?.state ?? "⚪";
    return conexao("whatsapp", "WhatsApp", "medido", numero, "Conectado ao número de WhatsApp declarado", `instância ${instancia} · estado: ${estadoConexao}`, agora);
  } catch (e) {
    return conexao("whatsapp", "WhatsApp", "falhou", "", "Não consegui confirmar o WhatsApp agora", `sonda falhou: ${e instanceof Error ? e.message : String(e)}`, agora);
  }
}

/** google: conta do gmail-sync/calendar-sync — o token vive em personal_sources (Supabase),
 *  não em arquivo local (gmail-sync.ts:75-82); mostra só o e-mail da fonte ativa. */
export async function medirGoogle(): Promise<Conexao> {
  const agora = new Date().toISOString();
  const url = (process.env.SUPABASE_URL ?? "").replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!url || !key) {
    return conexao("google", "Google", "nao-configurado", "", "Não conectado — falta declarar o acesso ao banco de dados desta conta", "SUPABASE_URL/SERVICE_ROLE_KEY não declarados — sem eles não dá pra ler personal_sources", agora, "declarar as 2 variáveis em .env.local");
  }
  try {
    const r = await fetch(
      `${url}/rest/v1/personal_sources?tenant=eq.enio&active=eq.true&source=in.(gmail,calendar)&select=account_identifier,source&limit=5`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(TIMEOUT_MS) },
    );
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const linhas = (await r.json()) as Array<{ account_identifier: string; source: string }>;
    if (linhas.length === 0) {
      return conexao("google", "Google", "nao-configurado", "", "Não conectado — nenhuma conta de e-mail/agenda ligada ainda", "nenhuma fonte gmail/calendar ativa em personal_sources", agora, "rodar scripts/gmail-sync.ts ou scripts/calendar-sync.ts para conectar uma conta");
    }
    const contas = [...new Set(linhas.map((l) => l.account_identifier))];
    const fontes = [...new Set(linhas.map((l) => l.source))].join(" + ");
    return conexao("google", "Google", "medido", contas.join(", "), "Conectado à sua conta do Google", `fonte(s) ativa(s): ${fontes}`, agora);
  } catch (e) {
    return conexao("google", "Google", "falhou", "", "Não consegui confirmar a conexão com o Google agora", `não consegui ler personal_sources: ${e instanceof Error ? e.message : String(e)}`, agora);
  }
}

/** vps: host declarado (VPS_HOST, fallback = precedente scripts/obs-anomaly.ts) + ssh real
 *  (BatchMode, sem senha, 3s) — chave ausente é ausência, ssh sem resposta é falha. */
export async function medirVps(): Promise<Conexao> {
  const agora = new Date().toISOString();
  const host = (process.env.VPS_HOST ?? "${VPS_HOST}").trim();
  const chaveDeclarada = (process.env.SSH_KEY ?? "~/.ssh/hetzner_ed25519").trim();
  const chave = chaveDeclarada.startsWith("~") ? join(process.env.HOME ?? "", chaveDeclarada.slice(1)) : chaveDeclarada;
  if (!existsSync(chave)) {
    return conexao("vps", "VPS", "nao-configurado", host, "Não conectado — falta a chave de acesso ao servidor", `chave SSH não encontrada em ${chave}`, agora, "gerar/copiar a chave declarada em SSH_KEY");
  }
  const r = await rodar(
    ["ssh", "-i", chave, "-o", "BatchMode=yes", "-o", "StrictHostKeyChecking=no", "-o", "ConnectTimeout=3", `root@${host}`, "true"],
    { timeoutMs: 4_000 },
  );
  if (r.ok) return conexao("vps", "VPS", "medido", host, "Conectado ao servidor na internet", "ssh respondeu (BatchMode, sem senha)", agora);
  return conexao("vps", "VPS", "falhou", host, "O servidor na internet não respondeu agora", `ssh não respondeu: ${r.err || "sem saída"}`, agora);
}

/** claude: modelo/esforço de ${DIR_IA}/settings.json + sessão atual (CLAUDE_CODE_SESSION_ID,
 *  mesmo env que coletores-agentes.ts já usa para achar o transcript ativo). */
export function medirClaude(): Conexao {
  const agora = new Date().toISOString();
  const caminho = join(process.env.HOME ?? "", ".claude", "settings.json");
  if (!existsSync(caminho)) {
    return conexao("claude", "Claude Code", "nao-configurado", "", "Não conectado — abra o assistente ao menos uma vez nesta máquina", "settings.json ainda não existe nesta máquina", agora, "abrir o Claude Code ao menos 1x para o arquivo ser gerado");
  }
  const j = lerJobSeguro(caminho);
  if (!j) {
    return conexao("claude", "Claude Code", "falhou", "", "Não consegui ler a configuração do assistente", `${caminho} existe mas não é JSON legível`, agora);
  }
  const modelo = typeof j.model === "string" && j.model ? j.model : "⚪";
  const esforco = typeof j.effortLevel === "string" && j.effortLevel ? j.effortLevel : "⚪";
  const sessao = (process.env.CLAUDE_CODE_SESSION_ID ?? "").trim() || "⚪";
  const ESFORCO_HUMANO: Record<string, string> = { low: "baixa", medium: "média", high: "alta" };
  const esforcoHumano = ESFORCO_HUMANO[esforco] ?? esforco;
  const humanoClaude = `O assistente de programação está ligado, cuidando com atenção ${esforcoHumano}`;
  return conexao("claude", "Claude Code", "medido", modelo, humanoClaude, `esforço: ${esforco} · sessão atual: ${sessao}`, agora);
}

export async function medirConexoes(): Promise<Conexao[]> {
  const [git, github, google, vps] = await Promise.all([medirGit(), medirGithub(), medirGoogle(), medirVps()]);
  return [git, github, medirWhatsapp(), google, vps, medirClaude()];
}
