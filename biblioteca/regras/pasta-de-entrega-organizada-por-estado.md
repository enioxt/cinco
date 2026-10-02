# Pasta de artefato entregue se organiza por estado, não por assunto

## A regra em uma frase
Toda pasta que acumula versões de algo entregue a terceiros (contrato, proposta, laudo, apresentação) separa o que vale hoje, o que foi superado, a linhagem e o material de apoio, e tem um índice dizendo o que está em vigor.

## Por que existe
Uma pasta plana com várias versões do mesmo documento cria dúvida sobre qual obriga alguém. O critério improvisado, "a mais recente", falha quando duas versões são editadas no mesmo dia.

Exemplo: um pacote de visita a um cliente reúne três versões de um contrato, duas de uma proposta, memoriais e estudos, tudo na mesma pasta. Nada diz qual minuta vale.

Apagar as versões antigas para limpar seria pior. Cada versão anterior é a base de uma verificação de regressão: a nova esqueceu o que a velha resolvia? Regressão é invisível, porque o texto novo lê bem e o que sumiu não aparece. Sem histórico, a verificação fica cega.

## O que muda na prática
- Quatro pastas: **vigente** (uma versão por artefato, nunca duas), **superado** (nunca se apaga), **linhagem** (o registro do que a versão não pode perder) e **apoio** (insumo interno que não vai ao destinatário).
- Um índice na raiz diz o que vale e em que ordem ler.
- A ordem da troca importa: a versão anterior desce para superado antes de a nova subir para vigente. Invertendo, existe uma janela com duas versões válidas ao mesmo tempo.
- Qualquer rotina que leia essa pasta encontra os arquivos por busca, não por caminho fixo, e guarda quantas linhagens já viu. Se o número cai, bloqueia. Sem essa contagem, uma reorganização pode deixar a verificação com lista vazia, e ela termina sem erro e sem uma linha de saída, indistinguível de "tudo certo".

## Como adotar
1. Crie as quatro pastas e mova o que existe, mantendo a versão em vigor em um só lugar.
2. Escreva o índice com data e ordem de leitura.
3. Faça qualquer verificação automática contar o que encontrou e falhar quando o total diminui.
4. Matéria de trabalho fora de qualquer repositório (downloads, documentos soltos) também tem prazo: defina um limite de dias sem migrar, e depois dele vira pendência cobrada.
