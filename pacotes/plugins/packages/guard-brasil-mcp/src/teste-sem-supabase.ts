// Isolamento de teste: nenhum teste deste pacote fala com o Supabase real.
// Entra por dois caminhos, o mesmo arquivo: (1) bunfig.toml [test] preload, quando o bun roda da pasta do pacote;
// (2) `import "./teste-sem-supabase.js"` como PRIMEIRA linha de cada *.test.ts, porque rodado da raiz do repo
// vale o bunfig da raiz (o do pacote não é lido) e o .env da raiz traz SUPABASE_URL + chave de serviço.
// Apaga qualquer variável SUPABASE_* / EGOS_SUPABASE_* do process.env; idempotente.
const PADRAO = /^(EGOS_)?SUPABASE_/;

export function limparSupabase(env: Record<string, string | undefined>): string[] {
  const removidas: string[] = [];
  for (const k of Object.keys(env)) {
    if (PADRAO.test(k)) { delete env[k]; removidas.push(k); }
  }
  return removidas;
}

limparSupabase(process.env);
