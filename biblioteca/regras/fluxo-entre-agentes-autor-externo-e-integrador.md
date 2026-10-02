# Fluxo entre agentes: o autor sem acesso entrega patch, o integrador valida e publica

## A regra em uma frase
Quando dois assistentes de IA colaboram no mesmo repositório, um autor sem poder de publicar entrega patch com prova literal do próprio estado, e um integrador com acesso valida, testa, resolve conflito e faz o envio.

## Por que existe
Sem papéis separados, o trabalho se perde por causas repetitivas. Um assistente faz commit num espaço sem remoto, e o commit nunca chega ao repositório. O envio retorna erro de permissão porque o ambiente do assistente não alcança o servidor de código. Marcadores de conflito ficam em arquivos commitados e quebram o build. O integrador reimplementa o que o autor já tinha feito. Os identificadores de commit relatados pelo autor não existem no remoto. E contadores gerados, como o número de rotas, ficam defasados em relação ao real.

## O que muda na prática
1. O autor edita e propõe; o integrador revisa, testa, mescla, envia e implanta.
2. O autor nunca presume que o envio funciona: confere o remoto antes, e se falhar gera patch e para.
3. O autor relata o estado com a saída literal de log, status e estatística do diff, nunca de memória.
4. Marcadores de conflito impedem o commit.
5. Toda ramificação parte do remoto principal, e o patch tem nome canônico com data, repositório e descrição.
6. Se os dois editam o mesmo arquivo, o integrador decide depois de ler as duas versões e rodar o build de cada uma.
7. Contadores gerados (rotas, capacidades) são regenerados em toda mudança que os afeta.

## Como adotar
- Escreva um prompt padrão para o autor com as regras de verificação e de entrega do patch.
- Instale uma checagem simples de marcadores de conflito no commit.
- Acompanhe periodicamente commits com marcadores, mudanças abertas há muito tempo e contadores fora de sincronia. A meta é zero.
- Use prefixos de ramo por origem (autor externo, integrador, humano) e rastreie o autor no rodapé do commit.
