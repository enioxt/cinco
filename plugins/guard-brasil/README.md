# Guard Brasil — pacote de distribuição para ChatGPT

Este diretório empacota uma capability existente do EGOS para descoberta/uso no ecossistema de Plugins do ChatGPT.

**Ele não contém um segundo motor de PII.**

Lógica canônica:

- `../../packages/guard-brasil/`

MCP canônico atual:

- `../../packages/guard-brasil-mcp/`

## Pergunta de entrada

> **Posso compartilhar isso?**

Fluxo P0:

`texto → detectar → mascarar → declarar não medido → humano decide`

Tools existentes a transportar:

- `guard_scan_pii`
- `guard_inspect`
- `guard_check_safe`

## Arquivos deste pacote

- `plugin.json` — metadata portátil do plugin;
- `skills/check-before-sharing/SKILL.md` — comportamento conversacional;
- `TOOL_CONTRACT.md` — contrato das três tools;
- `review-cases.json` — casos sintéticos/adversariais.

## Estado deste diretório

`DRAFT`.

Ainda não existe prova neste branch de:

- MCP remoto HTTPS;
- `mcp.json` real;
- Developer Mode;
- submissão ao diretório;
- publicação.

Não criar URL fictícia para avançar checklist.

## Fronteira jurídica

Guard Brasil fornece mecanismos técnicos de detecção/mascaramento de PII, validação e evidência. Isso **não equivale a declarar conformidade LGPD de uma operação inteira**.

## Fronteira de dados

Não distribuir:

- PII real;
- caso policial/investigativo;
- perfis soberanos/privados;
- credenciais;
- fixtures sensíveis;
- topologia interna desnecessária.

O plugin público deve trabalhar com texto fornecido pelo usuário e regras/capabilities públicas sanitizadas.
