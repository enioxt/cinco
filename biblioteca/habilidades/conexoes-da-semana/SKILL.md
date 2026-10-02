---
name: conexoes-da-semana
description: Sessão semanal que lê as notas e registros recentes e procura ligações que não são óbvias entre eles, para virar decisão, artigo ou tarefa. Use quando alguém pedir "conexões da semana", "conecta minhas notas" ou ao fechar a semana.
---

# Conexões da semana

Quem anota muito raramente relê. Uma vez por semana, esta sessão olha o material dos últimos sete dias e procura o que as notas dizem quando lidas juntas.

## Material de entrada

- notas e capturas da última semana;
- registro de mudanças do trabalho (por exemplo o histórico de commits ou a lista do que foi entregue);
- decisões e perguntas em aberto.

## Os quatro tipos de conexão

1. **Princípio compartilhado.** A nota X e a nota Y falam da mesma coisa com palavras diferentes.
2. **Contradição.** A nota X contradiz o que assumimos em Y e precisa ser resolvido.
3. **Padrão de três ou mais.** X, Y e Z são três exemplos do mesmo fenômeno. Pode virar artigo ou decisão.
4. **Pergunta respondida.** A pergunta aberta em Z foi respondida pelo que se descobriu em X.

## Processo

1. Ler tudo da semana.
2. Procurar candidatas dos quatro tipos.
3. Escolher de 3 a 5, as mais úteis, e descartar as que são só coincidência de palavra.
4. Para cada uma, escrever o registro abaixo.
5. Terminar com uma pergunta: "qual dessas merece virar texto ou tarefa esta semana?"

## Registro de cada conexão

```yaml
conexao:
  tipo: principio_compartilhado | contradicao | padrao | pergunta_respondida
  nota_a: <fonte 1 com data>
  nota_b: <fonte 2 com data>
  insight: <o que a ligação revela, em 1 ou 2 frases>
  acao: artigo | decisao | tarefa | aprofundar | ignorar
  prioridade: 1 a 5
```

## Cuidados

- Toda conexão cita as duas fontes. Ligação sem fonte é palpite.
- Diga quando uma ligação é fraca. "Ignorar" é uma ação válida.
- A escolha final é da pessoa. A sessão propõe, não decide.

## Ritual

Um dia fixo da semana, com um tempo curto reservado. Primeiro a triagem (`triagem-de-notas-soltas`), depois esta sessão. Se a conexão escolhida virar texto, passe pela habilidade `amostras-de-voz-antes-do-texto`.
