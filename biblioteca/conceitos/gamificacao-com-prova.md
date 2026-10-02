# Gamificação com prova: o que de jogo vale num sistema de trabalho

**O que é:** uma posição sobre jogo, classes, grupos e perfis: mecânica só sobrevive quando ajuda alguém a entender, colaborar ou provar contribuição. Não se transforma a operação inteira em fantasia. "Este sistema", aqui, é qualquer ambiente de trabalho com agentes e pessoas que adote a prática.

## A regra de interpretação

> Mecânica útil pode ficar. Estética, moeda e narrativa só ficam quando ajudam uma pessoa a entender, colaborar ou provar contribuição.

Atividade não é valor. Dar pontos por "mexer no sistema" cria o problema clássico em que a medida vira o alvo e deixa de medir (lei de Goodhart). O que pode receber reconhecimento é entrega verificável, refutação útil, correção, prova, colaboração e progresso consentido.

## Estados de cada peça

Cada peça de uma mecânica declara um estado: real (funciona e tem prova), conceito (desenho sem prova), dormente (parado de propósito) ou histórico (inspiração passada). Quem aplica este método classifica as próprias peças. Nesta biblioteca, o estado de qualquer implementação específica é **declarado pelo autor, não verificável aqui**.

| Peça | Ideia em uma linha |
|---|---|
| Moeda ou token próprio | camada econômica possível, separada e opcional; não é requisito de nada |
| Escada de adoção | progressão por escolha própria; a pessoa decide até onde adotar |
| Régua de contribuição | mede contribuição com prova; quem participa vê e pode contestar a medição |
| Classes | um papel é um contrato: o que faz, o que não faz, que prova entrega, quem revisa |
| Personas | perfis de uso ligados a provas, sem teatro |
| Ativação de persona | a pessoa escolhe o contexto e o produto adapta o comportamento |
| Pontos e ranks | mecânica reaproveitável; o tema específico não |
| Selo "falsificador" | reconhecer quem refuta uma hipótese com prova |

## Como as peças se encaixam sem virar brinquedo

```text
mapa de identidades
   -> cada nó mantém soberania
   -> classe (agente) · persona (contexto) · perfil (humano)
   -> escada de adoção (progressão escolhida)
   -> contribuição provada (placar honesto, se houver)
   -> grupo por propósito
   -> pulso (o sistema prova que está ativo e o que mudou)
```

Elementos de RPG (classes, progressão, coletivos, recompensas) cabem sem mudar a interface para fantasia, desde que a mecânica fique subordinada a autonomia, prova e utilidade.

## Classe sem teatro

O papel de desenvolvedor num conjunto de agentes é um bom exemplo: recebe escopo, implementa, testa e entrega prova. Não decide arquitetura e não valida o próprio trabalho. É uma classe sem avatar nem personagem, só contrato operacional.

## O que fazer a seguir

1. **Régua mínima de contribuição:** contribuição é um evento com fonte (mudança, documento, correção, medição, resultado provado). Sem pontos arbitrários.
2. **Escada com critérios verificáveis**, com a decisão humana no topo.
3. **Grupos por propósito** só quando houver duas ou mais pessoas com trabalho compartilhado real. Nenhum grupo para decorar interface.
4. **Anti-Goodhart:** reconhecer descoberta que poupou trabalho, refutação correta, correção e prova. Nunca "quantidade de posts".
5. **Classe como contrato:** nos cartões de agente, explicitar faz, não faz, prova e revisor.
6. **Frescor visível:** qualquer vitrine pública mostra estado e data da última verificação. Histórico nunca aparece como capacidade atual sem rótulo.

## Referências de método a revalidar antes de implementar

- progressão por níveis de confiança em comunidades, com o topo concedido manualmente;
- métricas de saída verificável em vez de atividade, para evitar o efeito Goodhart;
- grupos de trabalho reais retêm por tarefa, entrega e reputação, e não por token;
- RPG de mesa aplicado ao trabalho tende a funcionar melhor como oficina do que como infraestrutura diária.

Nada disso é implementação. São pontos de partida para quando houver uma tarefa concreta.
