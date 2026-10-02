# Só se publica como fato o que tem selo de validação com evidência

## A regra em uma frase
Cada capacidade que um artigo ou documento público afirma tem um estado registrado (validado, não testado ou apenas conceito), e o estado verde só existe com evidência ligada.

## Por que existe
Entre implementar e publicar há um passo que costuma ser pulado: alguém real usar e confirmar. Testes automáticos passando não substituem isso. Sem um registro, um artigo afirma como fato algo que só foi visto funcionando na máquina de quem escreveu.

## O que muda na prática
- Três estados: validado (prova humana ou teste real nesta sessão, com evidência ligada), não testado (implementado, testes passam, sem teste humano) e conceito (planejado, sem implementação verificável).
- Conceito é proibido como fato em texto público.
- Qualquer edição no arquivo da implementação devolve o selo a "não testado" até uma nova prova. Melhor ainda: só rebaixar quando muda a superfície mapeada, para não perder o selo a cada commit.
- Claim é uma afirmação para o usuário que altera expectativa, confiança, segurança, nível de automação, status de integração ou prontidão.
- Claims sensíveis (segurança, pagamento, isolamento de dados, anti-abuso) não ganham selo público de "não testado". Ou se valida antes de publicar ou se descreve de forma sóbria, sem promessa. Um selo assim entrega munição a concorrente e mostra a superfície de ataque.
- "Validado por N pessoas" não é confiança estatística. Mostre o cenário que foi validado.
- O pipeline é: construir, documentar, testar, disseminar, teste humano, registrar, publicar.

## Como adotar
1. Crie uma tabela com capacidade, afirmação em uma linha, quem validou, data, estado e evidência.
2. No rascunho, marque cada claim com o identificador da capacidade.
3. Adicione uma verificação automática que avise quando algum claim não está validado. Comece só avisando.
4. Endureça depois: exigir justificativa para publicar não validado, e bloquear verde sem evidência.
