# Documento vivo nunca apaga, e cada cópia é rastreável

## A regra em uma frase
Nenhuma entrada de um documento vivo é deletada: corrigir é riscar com motivo, autor e data, cada geração vira uma versão imutável e cada cópia que sai leva uma marca própria.

## Por que existe
Quando uma pessoa corrige o que a IA escreveu, apagar o original destrói o rastro do erro e impede de aprender com ele. Quando um documento sensível vaza, "ele existe" não responde nada, e a pergunta útil é qual cópia, para quem e quando.

Há ainda uma lição sobre a própria regra. Se ela manda capturar o padrão de cada correção humana num arquivo de aprendizados que cresça, convém conferir se o arquivo existe de fato. É comum a regra ser cumprida por disciplina enquanto o mecanismo que ela prescreve nunca foi criado. Cumprir uma regra de cabeça e ter o mecanismo que a sustenta são coisas diferentes.

## O que muda na prática
- Remover uma entrada significa riscá-la e anotar a data, o autor e o motivo, mantendo o conteúdo original visível.
- Toda edição manual deixa uma linha de histórico. Antes de um agente atualizar o documento, ele lê esse histórico e respeita as decisões humanas.
- Cada correção humana de uma saída de IA é lida como sinal: identifica-se o padrão do erro (fonte fraca, transcrição não validada, inferência precipitada), documenta-se e a próxima geração já o incorpora.
- Cada geração grava um retrato completo e imutável (entradas, texto e resultado da validação). Regenerar nunca sobrescreve a versão anterior.
- Cada download de documento sensível recebe uma marca única visível e uma linha de auditoria com quem, quando, formato e origem da requisição.
- Formatos ainda não suportados respondem com erro explícito, em vez de fingir suporte.
- Falta ainda, em muitos sistemas, o registro de quem aprovou exatamente aquele texto e quando. Vale tratá-lo como o próximo passo.

## Como adotar
1. Troque a exclusão por marcação de remoção com motivo.
2. Crie uma tabela de versões onde só se insere e nunca se atualiza.
3. Gere um identificador curto por cópia entregue e grave-o junto da auditoria da entrega.
4. Abra um arquivo de aprendizados de verdade, com data, padrão e correção, e leia-o antes da próxima geração.
