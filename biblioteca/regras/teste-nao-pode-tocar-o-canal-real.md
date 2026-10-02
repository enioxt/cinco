# Teste de automação nunca atravessa o canal de saída real

## A regra em uma frase
Quem testa um robô de mensagens ou de notificações usa canal simulado, instância descartável ou o próprio número de quem testa, nunca um payload falso contra a instância conectada.

## Por que existe
Um serviço que recebe eventos de mensagem não é um receptor passivo: ele processa o evento, gera resposta com o modelo e tenta entregá-la ao destinatário pelo aplicativo de mensagens.

Exemplo: alguém envia, por linha de comando, um evento simulado com um número falso ao endereço de entrada de um robô de atendimento. O robô responde a esse número inexistente a partir de uma conta nova, sem histórico, hospedada em nuvem. Esse é exatamente o padrão que as plataformas de mensagens tratam como spam, e a conta pode ser restringida sem que ninguém tenha enviado nada de propósito.

Robôs que só respondem tendem a ter risco de bloqueio muito menor que os que iniciam conversa. O teste do exemplo transformou um robô responsivo em proativo.

## O que muda na prática
- Nunca envie evento simulado a uma instância conectada.
- Testes de lógica usam o orquestrador com o envio substituído por um dublê.
- Testes de ponta a ponta usam uma instância descartável de homologação ou o seu próprio número, mandando para si mesmo.
- O robô só responde, dentro da janela de atendimento que a plataforma permite, e não transmite em massa.
- Números novos esquentam com uso humano por um período antes de ligar a automação, com limites diários crescentes.
- Reconexões por QR são raras, e instâncias com histórico grande desligam a sincronização completa.
- Depois de uma restrição, espera-se. Reconectar repetidamente agrava o quadro.

## Como adotar
1. Crie um endpoint de simulação que mostra a resposta sem enviar.
2. Documente que payload simulado em produção é proibido.
3. Compare telefones com uma função que normaliza variantes de formato, em vez de igualdade de texto.
