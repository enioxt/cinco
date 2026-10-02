# Coordenar antes de construir quando várias sessões recebem o mesmo pedido

## A regra em uma frase
Com mais de uma sessão ativa, a primeira ação diante de um pedido é olhar o que as outras já fazem e declarar o que você vai tocar, antes de escrever qualquer coisa.

## Por que existe
Exemplo: o mesmo pedido é colado em três sessões ao mesmo tempo. Em pouco tempo existem três mecanismos de coordenação construídos em paralelo: um salvo no histórico, um que apareceu e sumiu sem ser salvo, e um já arquivado de uma tentativa antiga. Duas decisões ainda recebem o mesmo número. Cada sessão varreu o disco, não viu o trabalho das outras e concluiu que faltava construir.

Varredura de disco não enxerga trabalho paralelo que ainda não foi salvo. Por isso a coordenação precisa de um lugar de encontro fora da árvore de arquivos.

## O que muda na prática
- Existe um registro compartilhado, só de acréscimo, onde cada sessão se identifica e declara o que vai tocar. O estado é sempre calculado a partir dele.
- Se duas sessões construíram a mesma coisa, vale quem salvou primeiro. Negociar custa uma rodada de modelo por sessão e pode empatar de novo. Quem perdeu adota a versão vencedora e oferece o que tinha de melhor.
- Medição que não escreve nada avança com um voto. Escrita exige mais de um. Publicar, gastar, apagar e mudar regra continuam indo a um humano, e uma proposta de ação desse tipo etiquetada como leitura é recusada.
- Observar conta como presença. Uma sessão que passou um bom tempo só lendo não pode expirar do registro.
- O contador de numeração lê o registro, as reservas e o histórico do git. Um número citado em commit já está queimado.
- Quem coordena limita quantos projetos conduz ao mesmo tempo. O excedente espera na fila.

## Como adotar
1. Crie um arquivo de registro fora do repositório, com uma linha por sessão: quem, o que, quando.
2. Faça a primeira ação de toda sessão ser ler esse registro.
3. Documente o critério de empate e defina um teto de projetos por coordenador que caiba na sua equipe.
4. Faça o detector de sessões ignorar subagentes. Um detector que conta sessões a mais bloquearia todo trabalho se virasse regra dura.
