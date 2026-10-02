---
name: roteiro-de-video-curto
description: Escreve o roteiro de um vídeo curto de cortes secos (30 a 45 segundos) com gancho, lista de cenas, texto na tela, conteúdo do terminal e orçamento de tempo por cena. Use quando pedirem roteiro, storyboard ou lista de cenas de um vídeo curto, antes de montar qualquer coisa.
---

# Roteiro de vídeo curto

O corte do vídeo se decide no roteiro, não na montagem. Reescrever o texto depois de quatorze cenas prontas custa dez vezes mais que acertar a lista de cenas.

## Antes de escrever: três perguntas

Se o pedido é uma frase e uma esperança, entreviste primeiro, ramo por ramo, e responda por conta própria o que puder achar nos arquivos do projeto.

1. **O que a pessoa faz diferente depois de ver?** Se for "ficar sabendo", o vídeo não tem final.
2. **Qual é a única afirmação?** Vídeo curto carrega uma. Duas afirmações são dois vídeos.
3. **Que prova existe?** Cena de terminal precisa de um comando real. Cena de imagem precisa de material real. Sem isso, o vídeo é afirmação em letra grande.

Depois pergunte só o que falta: duração máxima, idioma, com narração ou mudo, material disponível.

## Saída: `ROTEIRO.md`

```markdown
# <título>

- Formato: 1920x1080, 30 quadros por segundo
- Duração alvo: 38 s (1140 quadros)
- Narração: não
- Idioma: pt-BR
- Esquema: fundo escuro, com 4 inversões

| # | Momento | Tipo de cena | Segundos | Quadros |
|---|---------|--------------|----------|---------|
| 1 | Abertura | marca | 1,3 | 39 |
| 2 | Promessa | frase grande | 1,2 | 36 |
| ... | | | | |
| | Total | | 38,0 | 1140 |

## 2. Promessa · frase grande · 1,2 s
Na tela: Roteiro.
Movimento: entrada rápida da palavra, fundo base.
Por quê: primeira das três palavras que definem o produto. Uma por corte.
```

Todo bloco de cena carrega **Na tela**, **Movimento** e **Por quê**. A linha "por quê" impede que uma cena sobreviva só porque foi escrita.

Para cenas de terminal, escreva a lista completa de linhas: comando, saída, pausas.

## Tempo

- Só texto na tela, sem narração: 0,4 s por palavra, mínimo de 1,5 s. Quatro palavras = 1,6 s.
- Com narração: o áudio manda. Escreva a estimativa e troque pela duração medida depois de gravar.
- Terminal: tamanho do comando dividido pela velocidade de digitação, mais as pausas, mais 1 s para ler a última linha. Um terminal de 4 linhas raramente leva menos de 5 s.
- Gancho: a primeira afirmação aparece em até 2 s ou a linha está errada.
- Arredonde para quadros inteiros.

## Estrutura

Marca de abertura, tripleto de palavras, prova (terminal), a virada, o resultado, cartão final.

- **Tripleto:** três cenas de uma palavra, cada uma com animação diferente, de 1,2 a 1,5 s. "Roteiro. Modelo. Vídeo." Use uma vez, cedo.
- **Virada:** uma pergunta ou inversão em fundo invertido, logo antes da segunda prova. É o único ponto em que o vídeo desacelera.

## Texto

- Uma ideia por cena e no máximo quatro palavras por frase grande.
- Nenhuma cena existe só para encher tempo. Corte e encurte o vídeo.
- Saída de terminal tem de ser algo que o comando realmente produz. Inventar um registro plausível é a forma mais rápida de perder quem tenta o comando.
- Termine com o nome e o comando, nada mais.

## Entrega

Mostre a tabela de cenas e peça aprovação de **estrutura, quantidade e duração** antes de escrever os blocos completos.
