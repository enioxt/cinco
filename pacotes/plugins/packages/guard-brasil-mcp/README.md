# @egos/guard-brasil-mcp — Guard Brasil como MCP Server

> **Status:** ✅ Produção | Protocolo: MCP stdio JSON-RPC 2.0

Guard Brasil exposto como MCP server para uso direto em Claude Code, Cursor, Windsurf.

## Tools

| Tool | O que faz |
|---|---|
| `guard_inspect` | Analisa texto e retorna PII encontrado |
| `guard_scan_pii` | Scan completo com categorias e localizações |
| `guard_check_safe` | Verifica se texto é seguro para publicação pública |

Já configurado em `.mcp.json` como `guard-brasil-mcp`.

<!-- EGOS-FILOSOFIA-BEGIN — gerado por scripts/filosofia-ponteiro.ts · NÃO EDITAR À MÃO -->
---

### Filosofia

**A regra roda, a prova abre, você decide.** Este módulo segue os cinco pilares do EGOS —
todo número tem fonte · a IA rascunha e o humano decide · a regra vira trava automática ·
o que é seu fica seu · o que não está pronto se declara.

História, fontes e o que ainda está em aberto: [`FILOSOFIA.md`](../../FILOSOFIA.md)
<!-- EGOS-FILOSOFIA-END -->

## Remote (Streamable HTTP, stateless)

```bash
GUARD_MCP_HTTP_PORT=3917 bun run start:http   # ou: node dist/http.js (após `bun run build`)
```

`POST /mcp` · `GET /health`. Cada POST cria servidor + transport novos (nada de sessão, nada persistido); GET/DELETE em `/mcp` = 405. Limites: corpo 64 KiB, batch ≤ 10, timeout 10 s, 16 concorrentes, 120 req/min por IP. Padrão é `127.0.0.1`; HTTPS/exposição pública é decisão de deploy, fora deste pacote. O stdio (`guard-brasil-mcp`) segue igual.
