# O agente pode marcar uma decisão como não provada, mas não a revoga

## A regra em uma frase
Um agente pode declarar um número ou uma decisão como não provado e abrir uma pergunta ao humano, mas não converte por conta própria uma decisão humana registrada em hipótese.

## Por que existe
A régua epistêmica descreve o estado da prova. A decisão humana registrada descreve o estado da escolha. São eixos diferentes. Aplicar a régua sobre uma decisão já tomada e rebaixá-la a conceito tem a forma de um julgamento técnico e o efeito de uma revogação, e ninguém percebe que houve decisão.

Exemplo: numa equipe, uma sessão de agente rebaixa a "conceito" um número que tinha três decisões humanas registradas e aponta o documento comercial como erro. A crítica tem mérito, mas a revogação não era dela. Por horas, o repositório afirma uma coisa em dois arquivos vivos e outra, oposta, em dois registros de sessão para o mesmo número. Enquanto a decisão vive na cabeça de uma pessoa e a alegação vive no repositório, o que está escrito parece mandar, e o registro humano perde o peso.

## O que muda na prática
- Discordar com prova continua sendo obrigação. O que se proíbe é mudar o status registrado sem passar pelo humano.
- A correção é aditiva: a decisão segue valendo e ganha a ressalva de que a prova ainda não existe, com a pergunta aberta.
- Pedidos entre sessões não ficam só no chat. Uma caixa de mensagens versionada que ninguém leu há muito tempo é o sinal binário e testável de que algo quebrou.
- A idade do pedido vem do registro de versão que o criou, não da data do arquivo, que cópia e checkout reescrevem.

## Como adotar
1. Guarde decisões humanas em um registro com data e autor, separado de notas de agente.
2. Instrua os agentes a abrir pergunta em vez de editar o registro.
3. Crie uma caixa de entrada por destinatário e alerte quando algo passa de um prazo definido por você sem consumo.
4. Não tente detectar "reclassificação" por conteúdo. Julgar crítica legítima versus revogação gera ruído, e ruído vira contorno.
