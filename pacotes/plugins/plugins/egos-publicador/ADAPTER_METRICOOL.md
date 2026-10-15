# EGOS Publicador — adapter Metricool

Status: contrato de integração com o app Metricool já disponível no ChatGPT. Não é backend próprio do EGOS.

## Objetivo

Usar o Metricool como executor de distribuição/agendamento **depois** que o EGOS Publicador:

1. provar o que realmente aconteceu;
2. preparar a mensagem por canal;
3. executar preflight de privacidade quando aplicável;
4. obter autorização humana para a ação externa.

O Metricool não é fonte de verdade sobre o conteúdo; ele é provider de publicação.

---

## Gate 0 — duas conexões diferentes

Antes de prometer publicação, verificar separadamente:

```text
ChatGPT → Metricool autorizado?
Metricool → rede final conectada?
```

A primeira não implica a segunda.

Se o app estiver autorizado, mas a brand não tiver a rede de destino conectada:
- continuar com preparação/revisão;
- não criar ação fictícia;
- explicar que falta conectar a rede no Metricool;
- nunca versionar `blogId`, ids internos de conta ou dados privados no GitHub.

---

## Ferramentas do provider observadas

### Leitura

- `getBrandSettings` — brands, redes conectadas, timezone/configuração;
- `getScheduledPosts` — posts ainda agendados;
- `getBestTimeToPostByNetwork` — janela recomendada para redes suportadas.

### Escrita

- `createScheduledPost` — cria agendamento;
- `updateScheduledPost` — altera item agendado;
- `createScheduledPostForReview` — cria item novo já em fluxo de aprovação;
- `sendScheduledPostForReview` — envia item já agendado para aprovação.

Ferramentas e contratos podem mudar; runtime atual prevalece sobre este documento.

---

## Fluxo EGOS recomendado

### 1. Preparação sem escrita

```text
GitHub/artefatos
→ REAL / CONCEPT / PENDENTE / NÃO MEDIDO
→ Guard quando necessário
→ texto por rede
→ preview
```

Estado: `DRAFT` ou `READY_FOR_APPROVAL`.

### 2. Verificar capacidade real do provider

Usar `getBrandSettings`.

Verificar:
- brand selecionada;
- timezone;
- rede final conectada;
- requisitos específicos de mídia.

Não usar memória antiga da conta.

### 3. Horário

Se o usuário já deu data/hora, respeitar.

Se pediu recomendação de horário e a rede é suportada por `getBestTimeToPostByNetwork`, consultar uma janela curta (preferencialmente até 7 dias) e explicar que é recomendação do provider, não certeza de desempenho.

### 4. Review nativo — preferência quando pedido

Se o usuário quer aprovação/revisão antes de publicar e o plano do Metricool suporta a função:

- novo post → `createScheduledPostForReview`;
- já agendado → `sendScheduledPostForReview`.

Revisores:
- usar apenas e-mails explicitamente fornecidos ou legitimamente disponíveis no contexto autorizado;
- nunca adivinhar reviewer;
- explicar `any | all | optional` quando a escolha não estiver definida.

Estado EGOS após receipt: `IN_REVIEW`.

### 5. Agendamento direto

`createScheduledPost` somente quando houver autorização explícita para agendar/publicar no provider.

Receipt com `plannerUrl` → estado `SCHEDULED`.

**Não** promover para `PUBLISHED` apenas porque a data chegou.

### 6. Alteração

`updateScheduledPost` sobrescreve conteúdo imediatamente. Antes de usar:
- recuperar o item original;
- preservar todos os campos não alterados;
- confirmar que a alteração pedida é inequívoca;
- registrar novo id retornado e uuid estável quando o provider assim operar.

### 7. Publicado

Somente usar `PUBLISHED` se uma ferramenta/provider devolver prova explícita de publicação efetiva.

Se o conjunto de tools disponível só mostra agendamentos, o estado depois do horário continua `UNKNOWN` até prova adicional.

---

## Requisitos por rede observados no contrato atual

### Instagram
- post precisa de imagem ou vídeo;
- Reel/Trial Reel precisa de vídeo;
- Story precisa de imagem/vídeo;
- declarar conteúdo gerado/alterado por IA quando aplicável ao campo suportado.

### Facebook
- Reel exige vídeo;
- Story exige imagem/vídeo.

### X / Twitter
- o adapter de agendamento atual exige um único post por chamada e explicitamente instrui a não dividir automaticamente em thread;
- não impor limite local fixo, pois o teto pode depender do tipo de conta; deixar o provider validar.

Consequência: thread de X pode ser preparada como `DRAFT`, mas não deve ser fingida como agendável em múltiplos posts por este caminho sem capability específica comprovada.

### Bluesky
- contrato atual limita texto a 300 caracteres.

### Pinterest
- exige imagem e board.

### YouTube
- exige vídeo, título e classificação de audiência (`madeForKids`), além de outros campos conforme caso.

### TikTok
- exige imagem ou vídeo e campos de privacidade/regras do provider.

### Google Business Profile
- distinguir `publication` (texto) de `photo` (mídia sem texto próprio).

---

## Receipt canônico EGOS

Normalizar a resposta do provider sem apagar o original:

```json
{
  "provider": "metricool",
  "state": "IN_REVIEW|SCHEDULED|PUBLISHED|FAILED|UNKNOWN",
  "targetNetworks": ["linkedin"],
  "scheduledFor": "ISO-8601|null",
  "timezone": "IANA|null",
  "plannerUrl": "string|null",
  "providerId": "private/not-for-public-docs",
  "providerUuid": "private/not-for-public-docs",
  "action": "review|schedule|update|publish",
  "evidence": "provider receipt",
  "error": null
}
```

IDs internos podem ser necessários na sessão operacional, mas não entram automaticamente em commits, posts ou logs públicos.

---

## Falhas esperadas

- app Metricool não autorizado;
- brand sem nenhuma rede conectada;
- rede desejada ausente;
- mídia obrigatória ausente;
- plano sem suporte ao approval flow;
- data no passado;
- texto fora da regra da rede/provider;
- credencial/rede expirada;
- provider rejeita asset/thumbnail/audio.

Qualquer uma dessas falhas vira `FAILED` para a ação tentada e preserva o draft local. Nunca tentar contornar silenciosamente trocando rede, removendo texto ou publicando em outro lugar.

---

## Regra de governança

O Publicador pode automatizar preparação e transporte; **a intenção de publicar é humana**.

`Metricool conectado` não é autorização permanente para publicar tudo.
