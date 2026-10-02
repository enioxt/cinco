# Repositório que ficou para trás: realinhar com prova, em passos pequenos

## A regra em uma frase
Quando a cópia de trabalho de uma máquina fica muito atrás da linha principal, o realinhamento segue uma ordem fixa, com backup provado e verificação a cada serviço.

## Por que existe
Exemplo: a cópia de onde rodavam os serviços de uma operação ficou semanas atrás da linha principal, com dezenas de commits de diferença e muitos arquivos nunca commitados. O mecanismo que deveria acusar isso existia, mas o agendador dele estava desligado por causa do próprio atraso. O problema se protegia de ser medido.

## O que muda na prática
- Há um limite de ação, definido por você: passado um certo atraso em commits ou um certo acúmulo de arquivos sujos por alguns dias, entra o roteiro. Não se espera chegar a números maiores.
- O medidor de atraso fica sempre ligado e aparece no início da sessão.
- Antes de qualquer coisa, um backup do repositório inteiro, verificado e testado em um clone.
- O trabalho sujo vira commits por categoria em uma branch de segurança, com arquivos nomeados.
- Arquivos gerados (como páginas produzidas a partir do texto) nunca são mesclados à mão: resolve-se a fonte e regera-se.
- Testes de tipos e das suítes afetadas rodam antes de publicar.
- Publica-se por pedido de revisão, nunca por envio direto.
- Só depois da mesclagem se atualiza a máquina e se reinicia cada serviço, um por vez, com prova (resposta HTTP, estado ativo, uma mensagem real).
- Conflito de conteúdo entre dois lados que escreveram coisas diferentes sobre o mesmo assunto exige leitura humana. Nunca se resolve de forma automática.

## Como adotar
1. Ligue um medidor diário de distância para a linha principal.
2. Escreva esta ordem como lista de verificação curta.
3. Se o roteiro virar procedimento comum, o medidor deve ficar mais esperto, em vez de o texto crescer.
