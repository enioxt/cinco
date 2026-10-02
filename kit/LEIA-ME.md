# O kit — ferramentas de verdade, incompletas de propósito

Isto não é maquete nem promessa: são 5 motores que rodaram esta noite (29→30/08/2026),
com teste automático próprio, e chegam aqui exatamente como foram provados — 54 golden
tests (o nome técnico para "caso de teste que prova um comportamento específico, não só
que o código não quebrou") passando, saída real colada mais abaixo. Nada aqui finge estar
mais pronto do que está — e o que falta está listado, sem enfeite, na seção "incompleto
de propósito".

**Você não precisa entender o código.** Cole este arquivo inteiro na sua inteligência
artificial (Claude Code, Cursor, Windsurf, o que você já usa) e peça para ela rodar os
comandos — é para isso que ele foi escrito.

---

## O que cada ferramenta faz (1 frase cada)

| ferramenta | o que faz |
| --- | --- |
| `scripts/fila.ts` | caixa de entrada em disco para cada "agente" — posta um pedido, outro processo pega com exclusividade garantida (nunca dois pegam o mesmo), conclui e devolve o resultado; funciona entre sessões diferentes na mesma máquina, sem servidor nenhum. |
| `scripts/orquestra-viva.ts` (+ `.html` + `.sh`) | um painel visual ao vivo — sobe um servidor só na sua máquina (`127.0.0.1`, nunca sai dela) e mostra em tempo real quem está trabalhando, o que está pendente e o que já foi concluído, com um clique para mandar um PING. |
| `scripts/vigia-ambiente.sh` | um vigia que dorme, acorda de tempos em tempos, compara o ambiente (arquivos escolhidos, o veredito de um sentinela, o commit mais recente do git) e só avisa quando algo *de fato* mudou — nunca por reflexo (tocar um arquivo sem mudar o conteúdo não conta). |
| `scripts/orquestra-entrar.sh` | a porta única de entrada de uma sessão nova: pergunta qual papel ela vai exercer (coordenadora, forja, revisor...), entrega o resumo certo para aquele papel, e trava para que a mesma janela não vire dois papéis ao mesmo tempo sem querer. |
| `scripts/cronica.ts` | conta em prosa, com ajuda de um modelo de linguagem, o que a orquestra fez a partir dos fatos medidos na fila. A regra escrita no prompt é não inventar número fora da ficha de fatos; o teste automático (54 golden) prova o modo determinístico (`EGOS_CRONICA_FAKE=1` — fila vazia é dita vazia, nada inventado), não a saída real do modelo de linguagem. |

## Como rodar (precisa do `bun` instalado)

```
# se ainda não tem o bun:
curl -fsSL https://bun.sh/install | bash

# um exemplo — postar um pedido para o agente "forja" e ver o estado da fila:
bun kit/scripts/fila.ts postar forja "meu primeiro pedido" --de eu
bun kit/scripts/fila.ts estado

# subir o painel visual (abre no navegador em http://127.0.0.1:4599):
bash kit/scripts/orquestra-viva.sh
```

Se você não quer digitar nada disso, é exatamente aqui que a sua IA entra — peça a ela
para rodar os comandos acima e te mostrar o resultado.

## Leia antes de rodar

- **Tudo roda local.** Nenhuma ferramenta aqui faz chamada de rede para fora, com uma
  exceção declarada: `cronica.ts` no modo `gerar` chama o Claude Code CLI já instalado
  na sua máquina (`claude -p ...`) para escrever a narrativa — se você não tem o Claude
  Code instalado/autenticado, rode com `EGOS_CRONICA_FAKE=1` na frente do comando (o
  motor testa e mostra o formato sem gastar nada).
- O servidor do `orquestra-viva.ts` escuta só em `127.0.0.1` — não é alcançável por
  fora da sua máquina, por desenho.
- As ferramentas escrevem estado em `~/.egos/` (fila, crônica) — é uma pasta de
  trabalho da sua máquina, fora do git, específica de cada computador. Isso é
  intencional: o motor viaja no repositório, o dado fica com você (P4 do EGOS).
- `orquestra-entrar.sh`, no papel "forja", tenta isolar o trabalho num worktree próprio
  chamando um script chamado `worktree-seguro.sh` — **esse script não veio junto neste
  kit** (ver "incompleto de propósito" abaixo); sem ele, a entrada como forja avisa e
  segue sem isolar automaticamente.
- `orquestra-viva.sh` tenta abrir uma janela dedicada com `google-chrome --app`; se você
  não tem o Chrome, abra `http://127.0.0.1:4599` manualmente em qualquer navegador —
  funciona igual, só sem esse atalho.
- Nenhum destes motores tem autenticação própria: quem tem acesso ao disco da máquina
  tem acesso à fila. Foram desenhados para UMA máquina de confiança, não para dividir
  entre pessoas que não confiam entre si sentadas no mesmo computador.

## Como conferir que os testes passam de verdade

Cada ferramenta trouxe o próprio teste (arquivo `*.test.sh`) — rode e veja a saída real,
sem precisar acreditar em ninguém:

```
bash kit/scripts/fila.test.sh
bash kit/scripts/orquestra-viva.test.sh
bash kit/scripts/vigia-ambiente.test.sh
bash kit/scripts/orquestra-entrar.test.sh
bash kit/scripts/cronica.test.sh
```

Cada linha `🟢` é um comportamento específico provado (não "não quebrou", e sim "faz o
que diz que faz"). A saída que vale é a da SUA máquina — rode e veja; nenhuma prova
nossa substitui a sua.

## Baixar os arquivos

Tudo aqui é **licença MIT** — livre para usar, copiar, modificar e forkar; no universo
que nasce na sua máquina, o sol é você. Os arquivos, um a um (clique com o direito →
salvar como, ou peça à sua IA para baixar):

> **O que está aqui pode mudar de casa.** Tudo isso eu compartilho de boa-fé, sem pedir
> nada em troca. Mas pode acontecer de eu fechar um acordo pra trabalhar em algum item
> só com uma pessoa ou empresa — daí ele sai daqui e para de receber versão nova
> publicada neste kit. O que você já baixou sob esta licença MIT continua seu, nos
> termos dela — isso não se desfaz, é como a MIT funciona. Tem interesse em algo
> específico? Me chama antes, pelo contato em [cinco.ia.br](https://cinco.ia.br/#marcar).

- [LEIA-ME.md](LEIA-ME.md) — este arquivo, feito para colar inteiro na sua IA
- [scripts/fila.ts](scripts/fila.ts) · [scripts/fila.test.sh](scripts/fila.test.sh)
- [scripts/orquestra-viva.ts](scripts/orquestra-viva.ts) · [scripts/orquestra-viva.html](scripts/orquestra-viva.html) · [scripts/orquestra-viva.sh](scripts/orquestra-viva.sh) · [scripts/orquestra-viva.test.sh](scripts/orquestra-viva.test.sh)
- [scripts/vigia-ambiente.sh](scripts/vigia-ambiente.sh) · [scripts/vigia-ambiente.test.sh](scripts/vigia-ambiente.test.sh)
- [scripts/orquestra-entrar.sh](scripts/orquestra-entrar.sh) · [scripts/orquestra-entrar.test.sh](scripts/orquestra-entrar.test.sh)
- [scripts/cronica.ts](scripts/cronica.ts) · [scripts/cronica.test.sh](scripts/cronica.test.sh)

De onde isto vem: [cinco.ia.br](https://cinco.ia.br) é o convite e o mapa vivo;
[egos.ia.br](https://egos.ia.br) é a federação EGOS, onde estes motores nasceram e
rodam todo dia; [github.com/enioxt](https://github.com/enioxt) é o mapa geral dos
repositórios.

## Incompleto de propósito

Isto não é a lista do que deu errado — é a lista do que ainda não construímos, dita alto
de propósito, porque terminar escondendo o que falta é pior do que chegar incompleto.

- **Presença entre máquinas diferentes (a federação de verdade) ainda não existe.** Hoje
  a fila e a "escuta viva" só enxergam processos da MESMA máquina (o motor confere o pid
  local); combinar a fila da sua máquina com a de outra pessoa — o próximo passo real da
  federação — ainda não foi construído. É exatamente aqui que a próxima pessoa entra.
- **Sem restart automático (o que chamamos de F2).** Se o processo que "escuta"
  (`fila.ts esperar`) cair — a máquina reiniciar, o processo morrer — ele não volta
  sozinho. Alguém (ou um cron, que também não vem pronto aqui) precisa rearmar.
  `fila.ts estado` mostra honestamente quando isso aconteceu (escuta "órfã" ou "sem
  escuta"); ele nunca finge que está tudo bem.
- **`orquestra-entrar.sh` espera um script de isolamento (`worktree-seguro.sh`) que não
  está neste kit.** Sem ele, o papel "forja" ainda funciona, só não cria automaticamente
  um espaço de trabalho isolado — isso fica manual até alguém trazer esse motor também.
- **`cronica.ts` depende de um LLM externo (via Claude Code CLI) para narrar de verdade.**
  Sem ele instalado e autenticado, só roda no modo de teste (`EGOS_CRONICA_FAKE=1`), que
  prova o formato mas não escreve a história real.
- **Não existe autenticação nem separação de usuários.** Pensado para uma pessoa, uma
  máquina, um nível de confiança. Multiusuário na mesma máquina é território ainda não
  desenhado.

## Antes de tudo: o que você precisa para rodar isto

Peça por peça, degrau por degrau, com o custo de cada uma e o que dá para fazer de graça
— IDE, Supabase, Evolution API, modelo. Está em **[O-QUE-VOCE-PRECISA.html](O-QUE-VOCE-PRECISA.html)**.
O degrau 1 não custa nada e já entrega valor; só suba quando o anterior estiver de pé.

## O convite

Cada lacuna acima é um convite, não uma desculpa. Se alguma dessas peças é exatamente o
que você sabe construir — federação entre máquinas, restart automático, isolamento por
worktree, outra forma de narrar o que a orquestra fez — é aqui que você entra. O motor
que já existe está testado e a prova está colada acima; o que falta, falta de verdade, e
está escrito para que a próxima pessoa não precise adivinhar por onde continuar.
