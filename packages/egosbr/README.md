# egosbr

O EGOS de qualquer IA, pela linha de comando. Sem dependências, sem senha, só leitura.

```bash
npx egosbr            # ou: bunx egosbr
```

| Comando | O que faz |
|---|---|
| `egosbr` | Lista todas as portas para usar o EGOS: conector MCP, plugin do Claude Code, este pacote, agente A2A, registro oficial de MCP, kit e código aberto |
| `egosbr instalar <ia>` | O comando ou a configuração exata para `claude-code`, `codex`, `cursor`, `gemini`, `claude-app`, `chatgpt` ou `stdio` |
| `egosbr ferramentas` | As ferramentas do conector público |
| `egosbr diagnostico` | O roteiro "cabe IA?" (7 perguntas), direto do conector |
| `egosbr mcp` | Ponte stdio → conector público, para cliente MCP que só fala stdio |

Cliente MCP que só aceita servidor local (stdio):

```json
{ "mcpServers": { "egos": { "command": "npx", "args": ["-y", "egosbr", "mcp"] } } }
```

O conector é `https://mcp.egos.ia.br/publico/mcp` (Streamable HTTP, sem token). As ferramentas são só de leitura;
quando uma pergunta ainda não tem caminho, o servidor anota a pergunta sem dado pessoal (telefone, e-mail, CPF e nomes
mascarados). Mais: https://egos.ia.br/portas/

Licença MIT.
