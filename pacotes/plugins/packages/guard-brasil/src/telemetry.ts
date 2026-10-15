/**
 * Guard Brasil Telemetry Recorder
 * Records API calls and inspection events to Supabase guard_brasil_events table
 * Fire-and-forget pattern: non-fatal if Supabase is unavailable
 */

let supabase: any = null;

// ── L0-17 / GUARD-TELEMETRIA-MORTA-001 (2026-07-28) ──────────────────────────────────────
// Era `let supabaseAvailable = false;` com o guard abaixo testando `!== null`. Como o valor
// nasce `false` e nunca é `null`, a comparação era VERDADEIRA na primeiríssima chamada e a
// função devolvia `false` na hora: o Supabase nunca inicializava e todo o bloco de init
// abaixo era código morto. O gravador não podia gravar.
//
// Medido no banco: `guard_brasil_events` tinha UMA linha, de 118 dias atrás. É o registro do
// guarda de PII — P4, matéria de T0. Ele roda, bloqueia e protege; e não deixava rastro de
// nada disso. Perguntado "quantos vazamentos vocês barraram", a resposta honesta era não sei.
//
// `null` = ainda não tentei · `true`/`false` = já tentei e este foi o resultado. O tipo agora
// carrega os três estados que a lógica sempre pressupôs.
let supabaseAvailable: boolean | null = null;

function loadSupabase(): boolean {
  if (supabaseAvailable !== null) return supabaseAvailable;
  try {
    const mod = require('@supabase/supabase-js');
    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      console.warn('[guard-brasil-telemetry] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set — telemetry disabled');
      supabaseAvailable = false;
      return false;
    }

    supabase = mod.createClient(url, key);
    supabaseAvailable = true;
    return true;
  } catch (e) {
    console.warn('[guard-brasil-telemetry] @supabase/supabase-js not available or Supabase init failed');
    supabaseAvailable = false;
    return false;
  }
}

export interface ApiCallMetadata {
  tenant_id?: string;
  input_hash?: string;
  duration_ms?: number;
  session_id?: string;
  api_version?: string;
  [key: string]: any;
}

/**
 * Monta a linha que vai para `guard_brasil_events`.
 *
 * PURA E EXPORTADA de propósito: os invariantes desta função são de privacidade, e privacidade
 * provada uma vez à mão não é privacidade garantida. Separada, ela é testável sem rede — e o
 * golden trava as quatro coisas que precisam continuar verdadeiras (ver telemetry.test.ts).
 */
export function buildEvent(result: any, meta: ApiCallMetadata = {}): Record<string, unknown> {
  const findings = Array.isArray(result?.masking?.findings) ? result.masking.findings : [];
  const piiTypes = [...new Set(findings.map((f: any) => f.category))];

  return {
    tenant_id: meta.tenant_id || 'default',
    event_type: 'pii_inspection',
    input_hash: meta.input_hash,
    pii_types: piiTypes,
    pii_count: findings.length,
    // TRÊS estados, não dois. Era `safe ? 'safe' : 'blocked'`, então todo texto MASCARADO
    // (PII achada, removida, texto entregue) era registrado como "blocked" — e mascarar não é
    // bloquear. Uma auditoria futura leria "N bloqueios" contando mascaramentos junto,
    // superestimando a agressividade do guarda exatamente na métrica usada para calibrá-lo.
    // Achado no 1º live-fire depois de religar.
    // 2026-10-05: o banco aceita SÓ clean|masked|blocked|deferred|escalated
    // (`guard_brasil_events_verdict_check`, lido no pg_constraint). O código mandava 'safe' —
    // todo texto limpo era recusado pelo constraint e o insert morria num console.warn: a tabela
    // tinha 412 'masked' + 12 'blocked' e ZERO limpos. Contar só o que tinha PII é exatamente o
    // denominador escondido do R-UNIVERSO-DECLARADO-001.
    verdict: result?.blocked ? 'blocked' : result?.safe ? 'clean' : 'masked',
    model_id: meta.model_id || 'guard-brasil-v0.2.0',
    cost_usd: result?.cost?.usd || 0,
    duration_ms: meta.duration_ms || 0,
    atrian_score: result?.atrian?.score || null,
    // A coluna é text[]; as violações do ATRiAN são objetos. Objeto em text[] faz o insert
    // INTEIRO falhar — e como o erro é não-fatal, o evento sumiria sem nada mudar na tela.
    atrian_violations: (result?.atrian?.violations ?? []).map((v: any) =>
      typeof v === 'string' ? v : (v?.rule ?? v?.type ?? v?.level ?? 'violacao'),
    ),
    // NUNCA texto processado aqui. Esta tabela registra QUE houve PII, jamais QUAL — o schema
    // foi desenhado assim (input_hash, pii_types, pii_count) e R-SEC-007 é explícito: agente
    // nunca ecoa valor de dado sensível. Gravar a saída transformaria o registro do guarda de
    // PII no maior vazamento de PII do sistema.
    pri_output: null,
    pri_confidence: result?.pri?.confidence || null,
    pri_strategy: result?.pri?.strategy || null,
    policy_pack: result?.summary?.applicablePolicies?.[0] || null,
    status_code: 200,
    session_id: meta.session_id,
    api_version: meta.api_version || 'v1',
  };
}

/**
 * Record an API call/inspection event to guard_brasil_events table
 * @param result - GuardBrasilResult from guard.inspect()
 * @param meta - Additional metadata (duration, session, etc.)
 */
export async function recordApiCall(
  result: any,
  meta: ApiCallMetadata = {},
): Promise<void> {
  if (!loadSupabase()) {
    return; // Telemetry disabled, exit silently
  }

  try {
    const event = buildEvent(result, meta);

    // O builder do PostgREST é *thenable*, não Promise: tem `then`, NÃO tem `catch`. O código
    // anterior chamava `.catch(...)` nele e estourava TypeError em toda gravação — engolido
    // pelo try/catch de fora, virava um `console.warn` que ninguém lia. Terceiro defeito
    // empilhado neste arquivo, e sozinho já bastava para nada nunca ser gravado.
    // O jeito certo é aguardar e olhar o `error` do envelope, que é como o PostgREST reporta.
    const { error } = await supabase.from('guard_brasil_events').insert([event]);
    if (error) {
      console.warn('[guard-brasil-telemetry] Failed to insert event:', error.message);
      // Não-fatal por desenho: telemetria nunca derruba a proteção. Mas aparece.
    }
  } catch (e) {
    console.warn('[guard-brasil-telemetry] Error recording event:', e);
    // Non-fatal — continue
  }
}

/**
 * Record an API error
 */
export async function recordApiError(
  error: Error,
  meta: ApiCallMetadata = {},
): Promise<void> {
  if (!loadSupabase()) return;

  try {
    await supabase
      .from('guard_brasil_events')
      .insert([
        {
          tenant_id: meta.tenant_id || 'default',
          event_type: 'api_error',
          verdict: 'error',
          status_code: 500,
          error_message: error.message,
          session_id: meta.session_id,
          api_version: meta.api_version || 'v1',
        },
      ])
      .catch(() => {}); // Swallow errors
  } catch (e) {
    // Silent fail
  }
}

/**
 * Get recent events for dashboard
 */
export async function getRecentEvents(
  limit = 50,
  tenantId?: string,
): Promise<any[]> {
  if (!loadSupabase()) return [];

  try {
    let query = supabase
      .from('guard_brasil_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    const { data, error } = await query;

    if (error) {
      console.warn('[guard-brasil-telemetry] Failed to fetch events:', error.message);
      return [];
    }

    return data || [];
  } catch (e) {
    console.warn('[guard-brasil-telemetry] Error fetching events:', e);
    return [];
  }
}
