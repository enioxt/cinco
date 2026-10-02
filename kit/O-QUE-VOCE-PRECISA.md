# O que você precisa para rodar isto do seu lado

Este arquivo responde uma pergunta só: **o que tem que existir, e quanto custa, para você
manter um agente de inteligência artificial rodando com os seus próprios dados.**

## Antes de qualquer peça: de quem é o que

**Isto não é um serviço que você contrata. São módulos que você instala.**

Cada conta desta lista é sua, aberta por você, no seu nome. As chaves são suas. O banco é
seu. O servidor é seu. O número de WhatsApp é seu. Quem configura, customiza e mantém é
você — e quando quiser mudar qualquer peça, você muda, sem pedir nada a ninguém.

O que existe aqui é o **módulo**: o roteiro que a IA lê, os motores testados, o passo a
passo. A **solução** quem monta é você, do seu jeito, para o seu caso.

Consequência prática, e é o ponto todo: **os seus dados não passam por nós.** Não
hospedamos, não guardamos, não temos acesso, não precisamos ter. Não existe painel nosso
onde os seus documentos apareçam. Se você apagar tudo hoje, não sobra cópia em lugar
nenhum fora do que é seu.

Isso também significa que **a responsabilidade de manter é sua** — e é por isso que este
arquivo existe: para você saber exatamente no que está entrando antes de entrar. Se em
algum degrau você quiser ajuda para configurar, é conversa à parte; o módulo continua seu
em qualquer cenário.

---

Está em quatro degraus. **O degrau 1 já resolve muita coisa e não custa nada.** Só suba
quando o degrau anterior estiver de pé — cada um acrescenta uma peça e uma conta.

Nada aqui é obrigatório. Você escolhe onde parar.

---

## Degrau 1 — o agente lendo o seu repositório · **custo: zero**

O mínimo que já entrega valor. Nenhum servidor, nenhum banco, nenhuma chave.

| peça | para quê | custo |
| --- | --- | --- |
| Uma conta no GitHub | guardar o repositório | grátis |
| Uma IA que aceite arquivo de instrução | Claude, ChatGPT, Copilot, Cursor — a que você já usa | você já paga, ou usa o plano grátis dela |
| O arquivo `AGENTES.md` | é o roteiro que a IA lê ao abrir a pasta | grátis, licença MIT |

**Como:** salve o `AGENTES.md` na raiz do seu repositório e abra a IA apontando para
aquela pasta. Ela lê e conduz o resto em perguntas.

**O que você ganha:** uma IA que já chega sabendo as regras da casa — não inventar número,
dizer quando não sabe, não decidir no seu lugar.

**O que você ainda não tem:** memória entre conversas, e ninguém falando com você pelo
WhatsApp.

---

## Degrau 2 — memória e busca nos seus documentos · **custo: zero para começar**

Aqui o agente para de esquecer. Você guarda os seus documentos num banco e ele passa a
responder com base neles, em vez de responder de cabeça.

| peça | para quê | custo |
| --- | --- | --- |
| **Supabase** | banco de dados + busca por texto | plano gratuito: 2 projetos, 500 MB de banco, 5 GB de tráfego/mês |

O plano gratuito do Supabase costuma dar conta de um acervo de documentos de uma empresa
pequena por bastante tempo. **Duas ressalvas honestas:** projeto sem uso por uma semana é
pausado (você reativa com um clique), e o limite que estoura primeiro na prática é o de
tráfego, não o de espaço.

**O que você ganha:** o agente responde citando os seus documentos, e você sabe de onde
saiu cada resposta.

---

## Degrau 3 — o WhatsApp · **custo: um servidor pequeno, mensal**

É o degrau que mais muda o dia a dia, e o que mais exige atenção.

| peça | para quê | custo |
| --- | --- | --- |
| **Evolution API** | é o que conversa com o WhatsApp | o programa é gratuito e de código aberto |
| Um servidor para ela morar | precisa ficar ligado o tempo todo | as VPS mais simples do mercado custam algumas dezenas de reais por mês — confira no provedor |
| **Um número de WhatsApp separado** | o número do agente | um chip pré-pago resolve |

**Leia isto antes de ligar:**

- **Use um número novo, nunca o seu pessoal.** Banimento vem principalmente de número que
  inicia conversa com muita gente diferente em pouco tempo. Número que só *responde* quem
  falou primeiro corre risco bem menor.
- **Um número, poucas conversas no começo.** Conexão com centenas de grupos ao mesmo tempo
  sobrecarrega e o WhatsApp começa a limitar.
- **A Evolution API não é a API oficial do WhatsApp.** Ela funciona bem e é o que usamos,
  mas é uma ponte não-oficial: pode quebrar quando o WhatsApp muda algo do lado dele.
- **Um detalhe que custa caro descobrir sozinho:** o endpoint de buscar mensagens dela
  aceita um filtro por conversa e **ignora** o filtro, devolvendo a conta inteira com
  resposta normal de sucesso. Se você for ler mensagens, leia direto do banco dela, com o
  filtro no `WHERE`. É bug conhecido, sem correção até hoje.

**O que você ganha:** as pessoas falam com o agente de onde já estão.

---

## Degrau 4 — o modelo que responde · **custo: por uso**

O agente precisa de um modelo de linguagem para escrever as respostas.

| peça | para quê | custo |
| --- | --- | --- |
| **OpenRouter** | uma chave só, acesso a modelos de vários fornecedores | paga por uso; modelos baratos custam centavos por conversa |
| **Groq** | transcrição de áudio e modelos rápidos | tem camada gratuita com limite diário |

**A escolha do modelo muda a qualidade mais do que qualquer outra peça.** Modelo barato
responde rápido e raso; modelo bom entende o contexto e recomenda. Vale começar barato
para provar que o fluxo funciona, e subir quando alguém de verdade estiver do outro lado.

**Se você não quiser chave nenhuma:** dá para o agente do WhatsApp apenas *registrar* o
pedido, e uma pessoa (ou a IA que você já paga, na sua máquina) responder depois. Custo
zero por mensagem, resposta não é instantânea. É uma troca legítima.

---

## Resumo em uma tabela

| você quer | degraus | custo mensal aproximado |
| --- | --- | --- |
| IA que entende o seu repositório | 1 | zero |
| IA que responde com base nos seus documentos | 1+2 | zero |
| Agente atendendo no WhatsApp | 1+2+3+4 | servidor pequeno + chip pré-pago + uso do modelo |

---

## Três avisos que valem mais que qualquer configuração

1. **O que decide não é a ferramenta, é o material.** Um agente com as melhores peças e sem
   os seus documentos responde bonito e vazio. Junte o que já existe — manual, planilha,
   print, áudio de alguém explicando. Bagunçado serve.
2. **Comece por uma área, não pela empresa inteira.** Uma bem feita vira o molde das outras.
3. **Toda resposta tem que dizer de onde saiu.** Resposta boa sem fonte é o que destrói a
   confiança na terceira semana.

---

*Parte do kit em `https://cinco.ia.br/kit/` — licença MIT. Nenhum valor aqui é cotação: são
ordens de grandeza de setembro de 2026, e preço muda. Confira no site de cada serviço antes
de decidir — inclusive porque os planos gratuitos citados mudam de limite com frequência.*
