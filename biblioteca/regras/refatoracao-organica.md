# Arquivo que cresce se divide no meio do caminho

## A regra em uma frase
Quando um arquivo ou módulo passa do tamanho que cabe na cabeça, ele é dividido em passos pequenos, com teste a cada passo, enquanto o trabalho segue; nunca numa reescrita grande e nunca adiado.

## Por que existe
Reescrita grande trava o trabalho e esconde defeitos; adiar a divisão faz o arquivo crescer até ninguém querer mexer. O meio-termo é um sinal automático de tamanho (um aviso e um limite maior) que diz quando dividir, e a divisão acompanha a tarefa que já estava em curso.

## O que muda na prática
- Só se extrai um módulo comum quando há pelo menos dois usuários dele; antes disso a abstração é especulação.
- Código morto sai primeiro, num passo separado.
- Cada passo roda os testes; renomear ou mudar assinatura exige achar todos os chamadores antes.
- O aviso de tamanho só incomoda quem fez o arquivo crescer.

## Como adotar
1. Escolha dois limites de linhas (aviso e bloqueio) que caibam no seu projeto e meça só o que mudou no commit.
2. Quando o aviso disparar, divida em passos pequenos, com poucos arquivos por vez.
3. Rode os testes entre os passos e faça commits pequenos.
4. Uma varredura periódica do repositório inteiro mostra onde o crescimento se acumula.
