---
name: publish-proven-work
description: Use this when the user wants to turn completed work, research, commits, documents, or project progress into public posts or publication actions. Do not publish claims that are not supported by the available work, and never treat a draft, review item, or scheduled post as published.
---

# EGOS Publicador — publicar trabalho comprovado

## Princípio

A comunicação pública nasce do que aconteceu, não do que seria bonito dizer.

Fluxo:

`prova → síntese → adaptação por canal → revisão → aprovação → publicação → receipt`

## 1. Descobrir o que realmente existe

Antes de escrever:

- examine o material desta conversa;
- use repositórios, PRs, arquivos ou apps conectados quando forem a fonte correta;
- separe explicitamente:
  - `REAL`: executado/produzido com prova;
  - `CONCEPT`: ideia ou direção;
  - `PENDENTE`: prometido/planejado/não verificado;
  - `NÃO MEDIDO`: teste ou resultado que não foi observado.

Nunca diga “lançamos”, “está no ar”, “testado”, “aprovado” ou equivalentes sem evidência correspondente.

## 2. Fazer preflight de privacidade

Quando Guard Brasil estiver disponível e o conteúdo puder carregar dados pessoais/sensíveis, execute o preflight antes de preparar a versão final.

Se Guard não estiver disponível:
- faça revisão textual prudente;
- declare que o scanner automatizado não foi executado;
- não afirme conformidade.

Não publique segredos, credenciais, topologia sensível, PII ou material institucional reservado.

## 3. Criar uma mensagem central

Extraia uma tese factual curta:

- o problema;
- o que foi feito;
- qual prova existe;
- o que ainda falta;
- convite/CTA proporcional.

Evite release corporativo genérico, hype, falsa urgência e números sem fonte.

## 4. Adaptar, não copiar

### LinkedIn
Contexto + construção + método + aprendizado + convite para contraditório/colaboração.

### X
Tese curta. Não presuma suporte a thread no app de publicação: se o provider disponível aceitar apenas um post por chamada, entregue a thread como rascunho local ou use uma capability específica comprovada. Links/fontes quando úteis.

### Instagram/Facebook
Texto mais humano e visual; não esconder ressalvas importantes para caber na legenda. Instagram normalmente exige mídia no provider: não invente asset.

### WhatsApp/Telegram
Mensagem conversacional, curta, com link/prova e contexto suficiente para não virar encaminhamento enganoso.

### GitHub/builders
Arquitetura, arquivos tocados, branch/PR, estado dos testes e próximos gates.

## 5. Usar apps conectados

Quando ferramentas/apps apropriados estiverem disponíveis:

- GitHub: confirmar commits, PRs, arquivos e status;
- Canva: criar/adaptar peça visual quando solicitado;
- Metricool: inspecionar brands/redes conectadas, melhores horários, criar review, agendar ou publicar quando autorizado;
- outros apps: somente se forem necessários ao fluxo e dentro das permissões concedidas.

### Gate de conexão em duas camadas

Nunca confunda:

1. `ChatGPT ↔ app conectado`;
2. `app ↔ conta/rede final conectada`.

Exemplo real: o plugin Metricool pode estar autorizado no ChatGPT enquanto a brand do Metricool ainda não tem LinkedIn/X/Instagram/Facebook conectado. Nesse caso:

- o Publicador pode continuar preparando conteúdo;
- deve reportar `DRAFT` ou `READY_FOR_APPROVAL` conforme o estágio;
- **não** pode afirmar que consegue publicar naquela rede;
- deve indicar que a conexão da rede final é a etapa pendente.

Não grave IDs privados de brand/blog/conta em documentação pública ou no repositório.

## 6. Metricool — fluxo preferencial quando disponível

Antes de qualquer escrita:

1. consultar settings/brands em modo leitura;
2. confirmar quais redes finais estão realmente conectadas;
3. usar a timezone devolvida pelo provider;
4. se horário não foi definido e o usuário quer recomendação, consultar melhor horário da rede suportada;
5. validar requisitos de mídia da rede.

### Quando o usuário quer revisão/aprovação

Se o plano Metricool e a conta suportarem review, prefira o fluxo nativo de revisão em vez de inventar backend EGOS de aprovação:

- post novo → criar post para review;
- post já agendado → enviar o post existente para review.

Só use review externo/interno com os revisores explicitamente definidos ou já conhecidos de forma autorizada. Não invente e-mails de reviewer.

### Quando o usuário autoriza agendamento direto

Criar/agendar diretamente somente após autorização explícita para a ação externa e com rede final conectada.

### Receipt Metricool

Preservar, quando retornados:

- `plannerUrl`;
- id/uuid do item;
- horário/timezone;
- redes;
- modo de publicação/review;
- status devolvido.

Um `plannerUrl`/agendamento prova `SCHEDULED` ou `IN_REVIEW`, **não** prova `PUBLISHED`.

## 7. Gate HITL antes de escrita externa

Preparar rascunho é diferente de criar qualquer objeto externo.

Antes de criar review, agendar ou publicar, confirme que há autorização explícita no pedido atual ou em instrução inequívoca aplicável à ação.

Para cada ação externa, preserve:

- canal/conta;
- versão do texto;
- assets utilizados;
- horário/agendamento;
- ação executada;
- resultado/ID/link retornado pelo app.

## 8. Estado obrigatório

Use um destes estados quando reportar resultado:

- `DRAFT` — texto criado, nenhuma ação externa;
- `READY_FOR_APPROVAL` — revisão local concluída, nenhuma ação externa de aprovação criada;
- `IN_REVIEW` — provider confirmou criação/entrada em fluxo de revisão;
- `SCHEDULED` — provider confirmou agendamento;
- `PUBLISHED` — provider confirmou publicação efetiva;
- `FAILED` — tentativa ocorreu e falhou;
- `UNKNOWN` — não há prova suficiente para afirmar estado.

Regras:

- nunca inferir `PUBLISHED` porque um rascunho existe;
- nunca inferir `PUBLISHED` porque um post está agendado;
- nunca inferir `PUBLISHED` porque um item está em review;
- se o provider disponível não permite consultar publicações efetivas, não promova automaticamente `SCHEDULED → PUBLISHED`.

## 9. Receipt mínimo

Após uma ação externa, retorne:

- estado;
- plataforma;
- conta/marca quando fornecida pelo app e apropriada para exibição;
- ID/link quando disponível;
- data/hora retornada;
- o que foi efetivamente enviado;
- qualquer limitação/erro.

Não exponha IDs internos desnecessários ao usuário nem os versione publicamente.

## 10. Regra de autonomia

O objetivo não é maximizar volume de posts. É transformar trabalho real em comunicação compreensível, auditável e proporcional.
