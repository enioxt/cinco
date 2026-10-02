/**
 * rotas-email.ts — GMAIL-SO-LEITURA-001 (corte Enio 10/09, recomendação aceita na PCA visual:
 * "só ler/mostrar" antes de "ler e enviar" — envio fica pra depois, decisão dele, não default).
 *
 * Lê os últimos N e-mails do INBOX (metadata: de/assunto/data/trecho — NUNCA o corpo) usando
 * o escopo `gmail.readonly` já concedido (google-autorizar.ts) e o token já vivo em
 * `personal_sources` (tenant=enio, source=gmail — confirmado ativo, atualizado 2026-09-10).
 * Mesmo padrão de refresh de scripts/gmail-sync.ts (getValidToken/refreshAccessToken), mas
 * SEM nenhuma escrita: não classifica, não move label, não apaga, não ingere em base de conhecimento —
 * isso é do motor de sync, este é só o VISOR (=P4, leitura não muda estado).
 *
 * ARQUIVO NOVO — zero import de orquestra-viva.ts, mesmo padrão de rotas-documentos.ts.
 *
 * INTEGRAÇÃO (Prime cola em scripts/orquestra-viva.ts):
 *   1) import: `import { montarEmailApi } from "./orquestra-viva/rotas-email";`
 *   2) no roteador: `if (url.pathname === "/api/email" && req.method === "GET") return Response.json(await montarEmailApi());`
 *   3) em REDE_PRIMEIRO: acrescentar `email` à regex — dado, nunca cache-primeiro.
 */
import { carregarOpcional, corpoIndisponivel, motivoAusente } from "./opcional";

// Integração pessoal (Google): não viaja no kit público — ausente = `disponivel:false`, o servidor sobe.
const NOME_MODULO = "google-oauth";
const google = await carregarOpcional(() => import("../lib/google-oauth.ts"), "../lib/google-oauth.ts");

const TENANT = "enio"; // replicavel-ok: máquina de um único operador (mesmo literal já em gmail-sync.ts/calendar-sync.ts — não há config multi-tenant nesta instância)
const LIMITE_PADRAO = 15;

interface FonteGmail {
  id: string;
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
}

interface ItemEmail {
  id: string;
  de: string;
  assunto: string;
  data: string;
  trecho: string;
  naoLido: boolean;
}

export interface RespostaEmail {
  itens: ItemEmail[];
  resumo: { total: number; limite: number; medidoEm: string };
  status: string;
  /** só presente (false) quando o módulo de integração não existe nesta máquina. */
  disponivel?: false;
  motivo?: string;
}

function supabaseHeaders(chave: string) {
  return { apikey: chave, Authorization: `Bearer ${chave}`, "Content-Type": "application/json" };
}

async function buscarFonte(): Promise<FonteGmail | null> {
  const url = (process.env.SUPABASE_URL ?? "").replace(/\/$/, "");
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!url || !chave) return null;
  const r = await fetch(
    `${url}/rest/v1/personal_sources?tenant=eq.${TENANT}&source=eq.gmail&active=eq.true&limit=1`,
    { headers: supabaseHeaders(chave) },
  );
  if (!r.ok) return null;
  const linhas = (await r.json()) as FonteGmail[];
  return linhas[0] ?? null;
}

async function renovarToken(fonte: FonteGmail): Promise<string | null> {
  if (!google) return null;
  let clientId: string;
  let clientSecret: string;
  try {
    ({ clientId, clientSecret } = google.resolveGooglePersonalOAuthClient());
  } catch {
    return null;
  }
  const r = await fetch("https://oauth2.googleapis.com/token", { // replicavel-ok: endpoint fixo do OAuth do Google, string da spec deles — sem variação possível
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: fonte.refresh_token,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    }),
  });
  const d = (await r.json()) as { access_token?: string; expires_in?: number; error?: string };
  if (d.error || !d.access_token) return null;

  const url = (process.env.SUPABASE_URL ?? "").replace(/\/$/, "");
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const expira = new Date(Date.now() + (d.expires_in ?? 3600) * 1000).toISOString();
  if (url && chave) {
    await fetch(`${url}/rest/v1/personal_sources?id=eq.${fonte.id}`, {
      method: "PATCH",
      headers: { ...supabaseHeaders(chave), Prefer: "return=minimal" },
      body: JSON.stringify({ access_token: d.access_token, token_expires_at: expira }),
    }).catch(() => {}); // atualizar o cache é otimização; falhar aqui não pode derrubar a leitura
  }
  return d.access_token;
}

async function tokenValido(fonte: FonteGmail): Promise<string | null> {
  const expira = new Date(fonte.token_expires_at ?? 0).getTime();
  if (Date.now() < expira - 60_000) return fonte.access_token;
  return renovarToken(fonte);
}

function headerDe(headers: Array<{ name: string; value: string }>, nome: string): string {
  return headers.find((h) => h.name.toLowerCase() === nome.toLowerCase())?.value ?? "";
}

export async function montarEmailApi(limiteArg?: number): Promise<RespostaEmail> {
  const agora = new Date().toISOString();
  const limite = Math.min(Math.max(limiteArg ?? LIMITE_PADRAO, 1), 50);

  if (!google) {
    return {
      itens: [],
      resumo: { total: 0, limite, medidoEm: agora },
      status: `⚪ NÃO-MEDIDO: ${motivoAusente(NOME_MODULO)}`,
      ...corpoIndisponivel(NOME_MODULO),
    };
  }
  const fonte = await buscarFonte();
  if (!fonte) {
    return {
      itens: [],
      resumo: { total: 0, limite, medidoEm: agora },
      status: "⚪ NÃO-MEDIDO: fonte gmail não configurada (SUPABASE_URL/KEY ausentes ou personal_sources sem linha ativa)",
    };
  }
  const token = await tokenValido(fonte);
  if (!token) {
    return {
      itens: [],
      resumo: { total: 0, limite, medidoEm: agora },
      status: "🔴 falha ao obter token válido — reautorize com scripts/google-autorizar.ts",
    };
  }

  try {
    const rLista = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${limite}&labelIds=INBOX`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!rLista.ok) {
      return {
        itens: [],
        resumo: { total: 0, limite, medidoEm: agora },
        status: `🔴 Gmail API listagem falhou: HTTP ${rLista.status}`,
      };
    }
    const lista = (await rLista.json()) as { messages?: Array<{ id: string }> };
    const ids = (lista.messages ?? []).map((m) => m.id);

    const itens: ItemEmail[] = [];
    for (const id of ids) {
      const rMsg = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}` +
          `?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!rMsg.ok) continue; // 1 mensagem ilegível não derruba a lista inteira (=R13-c)
      const msg = (await rMsg.json()) as {
        id: string;
        snippet?: string;
        labelIds?: string[];
        payload?: { headers?: Array<{ name: string; value: string }> };
      };
      const headers = msg.payload?.headers ?? [];
      itens.push({
        id: msg.id,
        de: headerDe(headers, "From"),
        assunto: headerDe(headers, "Subject") || "(sem assunto)",
        data: headerDe(headers, "Date"),
        trecho: msg.snippet ?? "",
        naoLido: (msg.labelIds ?? []).includes("UNREAD"),
      });
    }

    return { itens, resumo: { total: itens.length, limite, medidoEm: agora }, status: "ok" };
  } catch (e) {
    return {
      itens: [],
      resumo: { total: 0, limite, medidoEm: agora },
      status: `🔴 erro ao ler Gmail: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}

export async function tratarEmailGet(url: URL): Promise<Response> {
  const limiteParam = url.searchParams.get("limite");
  const limite = limiteParam ? Number(limiteParam) : undefined;
  return Response.json(await montarEmailApi(Number.isFinite(limite) ? limite : undefined));
}
