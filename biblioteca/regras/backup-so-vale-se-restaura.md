# Backup só vale se alguém já restaurou a partir dele

## A regra em uma frase
Um arquivo de backup existente não prova nada. A prova é um teste periódico de restauração em ambiente limpo, com resultado registrado.

## Por que existe
Backup costuma falhar de modo silencioso: o arquivo é gerado, o tamanho parece normal, e na hora do desastre ele não restaura. Exemplo: numa operação pequena com vários clientes na mesma infraestrutura, a estratégia de backup lista seus limites sem enfeitar. A meta de perda máxima não é garantida, porque depende de agendamento e do provedor. Um apagamento intencional percebido dois dias depois não é coberto por um backup diário. Uma cópia gravada direto por pipe pode truncar sem aviso em bancos grandes. E o agendador que roda no mesmo servidor do aplicativo cai junto com ele.

## O que muda na prática
- Segue-se o padrão 3-2-1: três cópias, em duas mídias, uma fora do local.
- Backup de banco usa formato portátil, restaurável em qualquer servidor compatível, em vez de snapshot que só o provedor consegue abrir.
- Grava-se primeiro em disco local e confere-se o arquivo: tamanho acima de zero e próximo ao do dia anterior. Só depois envia.
- Segredos entram no backup cifrados.
- Há retenção em camadas (diários, semanais, mensais), com limpeza registrada.
- Uma falha de backup avisa uma pessoa.
- Periodicamente (por exemplo, uma vez por mês), restaura-se o último backup em um banco de teste, lista-se o conteúdo, faz-se uma consulta de sanidade e grava-se PASSOU ou FALHOU com a data.
- Cada cliente tem seu dump separado, para que um problema não bloqueie a restauração dos outros.

## Como adotar
1. Liste o que precisa de cópia e a criticidade de cada item.
2. Escreva o roteiro de recuperação para três cenários: dados corrompidos, servidor perdido, um cliente com dados errados.
3. Agende o teste de restauração e trate "PASSOU" como evidência, "nunca testado" como risco aberto.
4. Declare os limites do plano ao cliente, sem prometer o que o desenho não cobre.
