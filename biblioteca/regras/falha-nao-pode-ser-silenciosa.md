# Falha visível: nada quebra em silêncio

## A regra em uma frase
Uma capacidade só está pronta quando o caminho em que ela falha existe e foi provado, e tudo que roda sem pessoa na frente registra que rodou (inclusive quando falhou), entrega o aviso de verdade e tem alguém ou algo que percebe quando o próprio observador parou.

## Por que existe
Sistemas costumam mentir por educação, de cinco formas. Exemplo: um envio de mensagens devolve "enviado" com a gravação falhando por erro de permissão. Um notificador marca "entregue" quando o provedor respondeu que a credencial é inválida. Uma verificação automática está ligada, mas é incapaz de reprovar. Uma medição declara "sem pendências" sem ter conseguido medir. E um monitor coleta dados por meses e, na hora de avisar, apenas imprime "enviaria um alerta".

Em todos os casos cada peça foi construída de boa-fé e funcionou no primeiro dia. O que falta é obrigação de continuar funcionando, e a morte da instrumentação não tem sintoma: o painel segue verde, a fila de avisos segue crescendo, e quem lê o código conclui que o sistema avisa. Um placebo ocupa o lugar do remédio.

## O que muda na prática
- Sucesso só é reportado se a operação confirmou. Resposta de erro de autenticação com corpo "ok: false" não é entrega.
- Uma verificação automática ligada precisa ser capaz de reprovar. Teste com dado proibido (sai com erro) e com dado limpo (sai bem), porque um lado só não prova nada.
- "Não sei" nunca aparece como "ok". Medição que não mediu sai com um código próprio e diz que não provou nada.
- Tudo que roda sem humano (tarefa agendada, serviço, agente) registra a cada execução que rodou, e o fracasso também. Se só o sucesso escreve, "quebrou" e "sumiu" viram a mesma ausência. A escrita do sinal é atômica, porque um sinal truncado é pior que nenhum.
- Prova de execução, não de instalação: a medição se faz por despacho, nunca por declaração.
- A lista de vigiados é derivada da fonte viva (o agendador, a pasta de sinais), não escrita à mão. Lista manual não erra, só nunca cresce.
- Alerta que não foi entregue cai em um destino durável, marcado como não entregue, com o motivo. O próprio canal de alerta é medido e a falha dele grita.
- O registro de repetição só grava depois de uma entrega confirmada. Antes, uma falha silenciaria a nova tentativa por toda a janela.
- Cada tentativa vira uma linha com três estados: entregue, falhou, suprimido. Assim "chegou" e "foi engolido pelo filtro" não dão a mesma resposta.
- Ausência de registro nunca prova ausência de evento. "Não houve acesso" exige o registro vivo como lastro, senão é hipótese.
- Fila sem leitor é lixo. Notificador, tarefa agendada ou verificação nova só entra com prova de entrega, destino durável e um leitor definido.
- Instrumentação parada é religada ou arquivada com motivo, nunca deixada no limbo.
- Mesmo assim, se a máquina inteira estiver desligada, ninguém sabe. Um alarme por ausência de sinal exige um terceiro que espere o seu sinal.

## Como adotar
1. Para cada notificador, escreva um comando de teste que sai com erro se a mensagem não chegou, e inclua uma opção de simulação para provar o envio sem incomodar ninguém.
2. Para testar a falha, plante uma credencial inválida em vez de apenas remover a configuração, e use um título único por execução para que o filtro de repetição não mascare o teste.
3. Envolva cada tarefa agendada num invólucro que grave estado e resultado, e gere a lista de vigiados a partir do agendador.
4. Faça um segundo caminho independente cobrar esses sinais e avisar de qualquer sinal órfão ou parado.
5. Contrate ou monte um observador externo que alerte quando o sinal parar de chegar.
6. Revise periodicamente quem lê cada fila e cada registro.
