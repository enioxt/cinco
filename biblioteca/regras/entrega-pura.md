# Peça que vai para fora nasce no formato de envio

## A regra em uma frase
Documento destinado a alguém de fora já nasce no formato em que será enviado, sem instrução interna, sem estado de fluxo e sem rastro de como a decisão foi tomada; qualquer coisa que o autor precise dizer a quem encomendou a peça vai na conversa, nunca dentro do arquivo.

## Por que existe
O risco principal é mandar o que não devia ir, e a estética fica em segundo plano.

Exemplo: uma peça pronta para ser colada na conversa de um parceiro carrega, sem ninguém ter notado, um identificador de registro interno, o número de uma pergunta de aprovação, o caminho de um documento de governança, um marcador de decisão pendente, uma frase que era instrução ao agente e não ao leitor, e uma seção inteira de "notas internas".

Nada disso é segredo grave, e é por isso que passaria. O dano de copiar e colar demais é silencioso até o outro lado ler.

## O que muda na prática
- O entregável contém só o que o destinatário deve ler. Contexto de sessão vai para o registro de trabalho, decisão vai para o registro de aprovações, explicação a quem encomendou vai para o chat.
- Uma peça, um destinatário. Documento que serve a duas partes ao mesmo tempo serve mal às duas: separe em dois arquivos.
- Exceção se pede, nunca se presume. Se quem decide quiser anotação interna na peça, pede e se conversa antes.
- A regra vale para o par inteiro, fonte e versão gerada. Sujeira na fonte chega ao destino.
- Mantenha uma lista viva de marcadores internos que o gerador recusa: referência a aprovação humana, números de pergunta, a palavra "rascunho", marcadores de decisão pendente, identificadores de versão, caminhos de arquivos de governança.

## Como adotar
1. Defina quais pastas guardam material de entrega e quais guardam material de trabalho.
2. Escreva a lista de marcadores internos do seu ambiente: nomes de ferramentas, siglas, identificadores.
3. Faça o gerador de documentos recusar saída quando a fonte, numa pasta de entrega, contém um desses marcadores, e mostrar a linha de cada achado.
4. Teste os dois lados: peça suja é recusada, peça limpa passa.
5. Treine o hábito: nota a quem encomendou é mensagem, não parágrafo do arquivo.
