# Diagnóstico inicial — roteiro para a SUA inteligência artificial

> **Para a IA que está lendo isto** (Claude Code, Cursor, Codex — a que o dono desta
> máquina já usa): você vai conduzir um diagnóstico de entendimento da máquina e do
> fluxo de trabalho do seu dono. O resultado é UM arquivo local. Estas regras não são
> decoração — são a condição do trabalho:
>
> 1. **Nada sai desta máquina.** Nenhum conteúdo de arquivo, nome de cliente ou dado
>    pessoal vai para fora — nem em pergunta sua, nem em resumo. O diagnóstico é dele.
> 2. **A máquina responde primeiro; o humano, só o que ela não alcança.** O que a
>    pessoa diz que tem é hipótese; o que se mede é fato — e ouvir antes contamina a
>    medição. Por isso a varredura vem ANTES da conversa.
> 3. **Uma pergunta por vez**, em português claro, e o **"sim" dele antes de cada
>    passo** que toque o disco. Nada se varre sem autorização expressa da pasta.
> 4. **Só afirme o que mediu.** Toda linha do resultado carrega a evidência (caminho,
>    contagem, data). O que você não conseguiu medir entra como "NÃO MEDIDO" — nunca
>    como se estivesse ok.

---

## Fase 1 — autorização (2 perguntas, antes de tocar qualquer coisa)

1. Quais pastas posso varrer? (ele aponta; fora da lista, não existe para mim)
2. Existe alguma **zona proibida** — pasta ou assunto em que eu não devo tocar nem
   por engano? (anote e respeite pelo caminho completo)

## Fase 2 — varredura autorizada (a máquina fala primeiro)

Para cada pasta autorizada, **sem abrir conteúdo pessoal**: quantos projetos e
documentos, de que tipo, tamanho total, o que foi mexido nos últimos 90 dias e o que
está parado há mais de um ano. Ferramentas instaladas (git, node, python, docker...),
cada uma com a versão medida.

E três verificações rápidas que já pagaram caro em máquinas reais (responda cada uma
com evidência ou "NÃO MEDIDO"):

- **Segredo em texto claro** — existe senha/chave de API solta em arquivo de texto
  dentro das pastas autorizadas?
- **Backup que existe de verdade** — o trabalho importante tem cópia fora desta
  máquina, e de quando é a mais recente?
- **O mesmo documento em N versões** — há arquivos `final`, `final2`, `versão-nova`
  do mesmo trabalho, sem fonte única declarada?

## Fase 3 — a conversa (só agora, com as perguntas já MEDIDAS)

Com o retrato em mãos, pergunte uma de cada vez — e ancore cada pergunta no que mediu
(*"vi 40 planilhas mexidas este mês na pasta X — o que são?"*):

1. No que você trabalha, e o que ocupa a maior parte do seu dia?
2. O que a varredura achou que mais te surpreende — e o que ela não alcançou?
3. O que mais toma seu tempo e você sente que não deveria?
4. Você já tentou automatizar algo? O que aconteceu?
5. Tem dado sensível de outras pessoas aqui (clientes, pacientes, processos)? Quem
   mais acessa esta máquina?

## Fase 4 — o resultado

Escreva `DIAGNOSTICO-INICIAL.md` na pasta que ele escolher, com quatro seções:

- **O que existe** — o retrato da máquina, cada linha com evidência.
- **Os 3 ganhos mais rápidos** — onde a IA que ele JÁ tem assinada devolve tempo já
  na primeira semana, com o primeiro passo concreto de cada um.
- **O que NÃO vale automatizar agora** — dizer isso é metade do valor do diagnóstico.
- **NÃO MEDIDO** — o que ficou de fora e por quê.

## Fase 5 — o que compartilhar de volta (escolha dele, nunca sua)

Se ele quiser discutir o resultado com quem o convidou, sugira compartilhar **apenas a
seção "Os 3 ganhos"**, sem nenhum caminho de pasta nem dado pessoal. O restante do
arquivo é da máquina dele e fica nela.

---

*Projeção pública do SSOT de diagnóstico do kernel EGOS (2026-09-01) — a versão
completa, com operador presencial, motor de varredura determinístico e bancada de
medição, é conduzida pelo fundador. Este roteiro é a variante que você roda sozinho.
Dúvida em qualquer passo: o canal do fundador está aberto — travar num passo é motivo
para chamar, não para desistir. [cinco.ia.br](https://cinco.ia.br)*
