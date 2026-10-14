# Guard Brasil plugin — contrato de ferramentas

Status: contrato para migração do MCP stdio existente para MCP remoto; **não prova endpoint público**.

Fonte atual: `packages/guard-brasil-mcp/src/index.ts`.

## Compatibilidade

Manter os nomes atuais durante a primeira migração para não quebrar clientes:

- `guard_inspect`
- `guard_scan_pii`
- `guard_check_safe`

Uma versão posterior pode introduzir nomes de domínio (`guard.inspect_text` etc.) apenas com compatibilidade/versão explícita.

---

## Anotações obrigatórias para review público

A documentação atual do diretório exige que cada tool declare corretamente:

- `readOnlyHint`;
- `openWorldHint`;
- `destructiveHint`;
- justificativa coerente com o comportamento real.

Para o contrato atual das três tools, o alvo é:

```json
{
  "readOnlyHint": true,
  "openWorldHint": false,
  "destructiveHint": false
}
```

**Justificativa comum:** a tool calcula sobre o texto fornecido, não altera dados do usuário, não executa ações externas e não destrói recursos. Telemetria operacional, se existir, não pode conter texto/args brutos nem ser tratada como efeito funcional da tool.

Se a implementação futura passar a consultar rede, persistir conteúdo ou executar ação externa, as anotações devem ser revistas antes de novo scan/submission.

---

## `guard_inspect`

**Descrição recomendada**

> Use this when the user wants a broad privacy and Guard Brasil review of Brazilian text before sharing, publishing, sending, or storing it. Returns detected findings, a masked draft, ATRiAN findings, and explicit `naoMedido`. Do not use as a legal opinion or as a guarantee of complete anonymization.

**Tipo:** read/compute only.

**Input**

```json
{
  "text": "string",
  "mask": true
}
```

**Regras**
- `text` obrigatório;
- `mask` default `true`;
- impor limite de bytes/caracteres no servidor remoto;
- não persistir `text` bruto;
- não colocar `text` bruto em telemetry/receipt;
- resposta precisa expor `naoMedido` quando houver.

**Annotations alvo**

```json
{
  "readOnlyHint": true,
  "openWorldHint": false,
  "destructiveHint": false
}
```

**Justificativa:** somente analisa e transforma o texto recebido; não modifica recursos nem chama serviço externo como parte do comportamento funcional.

---

## `guard_scan_pii`

**Descrição recomendada**

> Use this when the user specifically wants a quick scan for Brazilian personally identifiable information in text. Returns categories/findings, a masked draft, and unclassified residue. Do not use for a full legal or ethical review.

**Tipo:** read/compute only.

**Input**

```json
{
  "text": "string"
}
```

**Annotations alvo**

```json
{
  "readOnlyHint": true,
  "openWorldHint": false,
  "destructiveHint": false
}
```

**Justificativa:** somente classifica/mascara o texto recebido; não modifica recursos nem executa ação externa.

---

## `guard_check_safe`

**Descrição recomendada**

> Use this when the user asks whether a piece of text appears ready for public sharing under the Guard Brasil rules. Returns `safe/canShare`, reason, and `naoMedido`. Do not interpret `safe` as legal compliance, and never return a confident share recommendation when unclassified residue remains.

**Tipo:** read/compute only.

**Input**

```json
{
  "text": "string"
}
```

**Invariant**

`naoMedido.length > 0` não pode produzir afirmação humana equivalente a “seguro/completo/sem PII”.

**Annotations alvo**

```json
{
  "readOnlyHint": true,
  "openWorldHint": false,
  "destructiveHint": false
}
```

**Justificativa:** produz uma avaliação local sobre o texto recebido; não publica, envia, grava ou altera nada em nome do usuário.

---

# Contrato HTTP/MCP remoto

Destino desejado após implementação/prova:

```text
POST https://<domínio-dedicado>/mcp
transport: streamable-http
```

O domínio **não está definido neste documento**. Não usar `mcp.egos.ia.br` por suposição; selecionar somente após inventário da infraestrutura ativa, threat model e teste.

## Transporte mínimo para o SDK atual

O pacote declara `@modelcontextprotocol/sdk ^1.29.0`. Para esse slice:

- preservar `stdio` atual;
- usar o padrão oficial v1 de Streamable HTTP **stateless**;
- criar `McpServer` + `StreamableHTTPServerTransport({ sessionIdGenerator: undefined })` novos por request;
- não reutilizar transport stateless entre requests;
- `GET`/`DELETE` em `/mcp` devem responder 405 no modo stateless, salvo comportamento diferente comprovado pela versão realmente instalada/testada.

Referência oficial do padrão: `https://github.com/modelcontextprotocol/typescript-sdk/blob/v1.x/src/examples/server/simpleStatelessStreamableHttp.ts`.

Não migrar SDK v2 no mesmo PR do transporte remoto.

## Antes de expor publicamente

- endpoint dedicado e HTTPS;
- health/observability sem texto bruto;
- limite de payload;
- limite de elementos de input;
- rate limit;
- timeout;
- CORS/origin conforme necessário pelo protocolo/host;
- sem stack trace ou segredo em erro;
- proteção contra body bombs;
- content-type estrito;
- concurrency limit;
- teste de shutdown/restart;
- dependency audit;
- prompt injection tratado como input não confiável;
- política de retenção declarada.

## Telemetria

Hoje `trackMcpTool` registra apenas metadados da chamada no payload observado (`server_id`, tenant `system`, tool, sucesso, timestamp, versão). Antes do deploy remoto, criar golden que falhe se texto/argumentos brutos passarem a entrar nesse payload.

---

# Casos de produto/golden

## Deve encontrar/revisar

1. CPF formatado.
2. CPF sem pontuação.
3. e-mail.
4. telefone brasileiro.
5. RG/MASP quando coberto.
6. nome em contexto reconhecido.
7. dado de saúde.
8. documento + nome + telefone no mesmo texto.
9. texto que provoca ATRiAN por afirmação absoluta/promessa.
10. resíduo propositalmente fora das regras → `naoMedido`.

## Não deve supermascarar/afirmar

1. texto institucional sem PII conhecida.
2. número de lei.
3. CNPJ quando a política do caso permitir dado empresarial público — ainda deve classificar corretamente, não apagar por reflexo.
4. cidade/órgão público confundido com nome.
5. frase com “Maria da Penha” como nome da lei, não pessoa da conversa.
6. ausência de achado não vira garantia.
7. `naoMedido` bloqueia conclusão absoluta.
8. entrada vazia/absurda falha de forma controlada.
9. payload acima do limite é recusado sem eco.
10. prompt injection dentro do texto é tratado como texto, não instrução do servidor.

---

# Casos para submissão pública do plugin

A regra atual de review do MCP remoto exige **exatamente 5 casos positivos e 3 negativos**. Os goldens acima continuam maiores; para o pacote de submissão escolher um subconjunto provado pelo endpoint real.

## 5 positivos propostos

1. `guard_scan_pii`: CPF formatado → identifica + mascara sem eco indevido.
2. `guard_scan_pii`: nome + telefone + e-mail → identifica categorias e devolve texto mascarado.
3. `guard_inspect`: nome + dado de saúde → mascaramento + achados amplos, sem alegar conformidade jurídica.
4. `guard_inspect`: promessa/afirmação absoluta → retorna achado ATRiAN esperado.
5. `guard_check_safe`: resíduo não classificado → `naoMedido` presente e nenhuma recomendação absoluta de segurança.

## 3 negativos propostos

1. texto institucional limpo → não supermascara e não inventa achados;
2. `Lei Maria da Penha` + cidade/órgão público → preserva entidade institucional e não trata como pessoa da conversa;
3. prompt injection dentro do campo `text` → trata como dado a analisar, não como instrução para executar/publicar/acessar rede.

Esses oito casos só entram no `plugin.json`/review depois de rodados contra o **endpoint de produção** e terem resultado capturado. Não inventar `expected_behavior` que não tenha sido observado.