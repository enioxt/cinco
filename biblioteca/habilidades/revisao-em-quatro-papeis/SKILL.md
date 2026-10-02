---
name: revisao-em-quatro-papeis
description: Revisão de uma decisão importante em quatro papéis em sequência (crítico, apoiador, questionador, maestro). Entrega só a síntese final. Use quando alguém pedir "segunda opinião", "critica isso", "pensa bem" ou antes de uma decisão difícil de desfazer.
---

# Revisão em quatro papéis

Uma decisão importante costuma sair de uma única cabeça: a de quem já está convencido. Esta habilidade força quatro olhares em ordem, cada um lendo o anterior, e devolve uma síntese curta.

## Quando usar

- Mudança de estrutura (arquitetura, banco de dados, organização de pastas ou de processo).
- Decisão de produto, preço ou prioridade com mais de um caminho viável.
- Antes de publicar algo para fora (artigo, proposta, material de cliente).
- Quando a pessoa pedir segunda opinião.

## Quando NÃO usar

Erro de digitação, ajuste trivial, pergunta factual ("o que é X?"), tarefa de rotina. Revisar o que não precisa de revisão só gasta atenção.

## Os quatro papéis, nesta ordem

1. **Crítico.** Ataca a decisão com a melhor objeção possível. Procura o que quebra, o que foi assumido sem prova, o custo escondido. Não suaviza.
2. **Apoiador.** Lê a crítica e defende o que merece ser defendido. Diz qual é o maior potencial e em que condição ele aparece.
3. **Questionador.** Lê os dois e pergunta o que ninguém perguntou: qual premissa sustenta tudo? O que mudaria a resposta? Que informação falta?
4. **Maestro.** Lê os três e decide: o que fazer, o que não fazer, qual o próximo passo e quem precisa aprovar.

Cada papel escreve de verdade, em turnos separados, e vê o que o anterior escreveu. Não vale fingir os quatro em um parágrafo só.

## O que mostrar à pessoa

Somente a síntese do maestro, neste formato:

```yaml
decisao:
  contexto: <o que se decide, em uma frase>
  evidencias:
    - <fonte verificável: arquivo, número com origem, link>
  critica_principal: <uma linha>
  potencial_principal: <uma linha>
  duvida_principal: <uma linha>
  acao_escolhida: <concreta, com estimativa de esforço>
  acao_rejeitada: <o que não fazer e por quê>
  proximo_passo: <executável agora>
  quem_aprova: <pessoa que decide antes de executar>
```

Se a pessoa pedir "mostra a crítica", "mostra o apoiador" ou "mostra as premissas", expanda só aquela parte.

## Regras

- Toda evidência tem fonte. Sem fonte, escreva "sem fonte" ao lado da afirmação.
- Se o questionador achar uma premissa sem prova, o maestro precisa tratá-la: provar, descartar ou deixar declarada como aposta.
- O maestro pode concluir "não fazer nada agora". É uma decisão válida e deve ter motivo escrito.
- Decisão com efeito irreversível (apagar, pagar, publicar, assinar) termina sempre em "quem aprova", e essa pessoa é humana.

## Variações

- **Versão rápida:** os quatro papéis em poucas linhas cada, para decisões médias.
- **Versão com modelos diferentes:** cada papel roda em um modelo distinto, quando a decisão justifica o custo extra. A mistura de famílias de modelo reduz o viés de um só.
