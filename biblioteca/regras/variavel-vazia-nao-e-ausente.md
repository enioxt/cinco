# Variável de ambiente vazia significa "não configurada"

## A regra em uma frase
Na leitura de configuração por variável de ambiente, use o operador que trata vazio como ausente, e só aceite vazio como valor legítimo quando houver um motivo escrito ao lado.

## Por que existe
Exemplo: um código lê uma chave de serviço com um operador de coalescência, que só cai para a próxima opção quando o valor é nulo ou indefinido. O arquivo de ambiente local declara a primeira variável vazia de propósito, com um comentário dizendo que é alias da outra. Quem escreveu o arquivo conta com o valor reserva. O programa não colabora: a variável vazia vence, a chave boa nunca é lida e o resultado é erro de autorização todos os dias, com a chave certa a um caractere de distância.

Exemplo: um robô funciona em produção e quebra em desenvolvimento. O servidor não tem arquivo local, então lá a variável é indefinida e o operador cai certo. Na máquina de desenvolvimento ela é vazia e o valor reserva morre. Quem depura vê uma falha que não reproduz em produção, ou "conserta" código que estava funcionando.

## O que muda na prática
- Vazio é "não configurada". O operador de curto-circuito lógico é o certo para esse caso.
- Se vazio é valor legítimo naquele ponto, declare o motivo em um comentário reconhecido pelo verificador.
- Um verificador só deve acusar o cruzamento perigoso: variável declarada vazia usada como primeira opção, com valor reserva real. Acusar tudo ensina a ignorar o aviso, e a maioria dos achados não importa.
- Ambientes diferentes revelam esse erro de formas diferentes; teste nos dois.

## Como adotar
1. Liste as variáveis vazias do seu arquivo de exemplo e de ambiente.
2. Procure leituras encadeadas que as usem como primeira opção.
3. Troque o operador, ou apague a linha vazia.
4. Adicione um teste que roda a leitura com a variável vazia.
