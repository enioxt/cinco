# Capacidade sem status, evidência e responsável é afirmação sem prova

## A regra em uma frase
Toda capacidade listada num registro declara três campos obrigatórios (status, evidência, responsável), e a evidência precisa abrir em poucos minutos, senão a capacidade vira rascunho e sai das propostas.

## Por que existe
Capacidades listadas sem prova de comportamento viram "o sistema tem a funcionalidade X" em propostas comerciais. O cliente descobre que não funciona e a confiança se perde. Sem evidência verificável, nada distingue uma capacidade real de uma promessa (ver a regra de casos de ouro comportamentais).

## O que muda na prática
- Status em quatro valores: testado, em produção, rascunho, descontinuado. Só os dois primeiros podem aparecer em proposta.
- Evidência em três formatos aceitos: caminho de arquivo com linha, identificador de versão, ou endereço de produção que responde. "Implementado em algum lugar", "tem testes" e "funciona" são vagos e valem como fantasma.
- Responsável: pessoa, agente ou equipe, que responde por defeitos e atualizações.
- Auditoria rápida: ler o caminho, mostrar a versão, chamar o endereço. Se não bate, vira rascunho.
- Pendência legada não precisa de auditoria retroativa em lote. Marca-se uma data de corte e aplica-se o esquema a cada item que for tocado.
- Sem stubs em código de conformidade: uma função que devolve lista vazia ou "nulo" no lugar de lançar erro explícito é banida. Uma capacidade nova precisa de pelo menos três casos de comportamento, um deles desenhado para falhar se o código por baixo fosse um stub.
- Sinais de código a revisar: arquivos chamados compartilhado, stubs ou placeholder exportando funções com assinatura não trivial que devolvem valores triviais.

## Como adotar
1. Crie um modelo de entrada com os três campos.
2. Adote uma data de corte: itens novos seguem o modelo, itens antigos migram quando alguém os editar.
3. Escreva um comando que valida que os caminhos e endereços citados existem.
4. Antes de listar uma capacidade em proposta, execute a evidência na frente de outra pessoa.
