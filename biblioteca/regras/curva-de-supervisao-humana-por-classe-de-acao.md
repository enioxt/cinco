# A supervisão humana desce por classe de ação, com prova

## A regra em uma frase
Todo sistema de IA começa com o humano aprovando cada ação e só reduz a supervisão, classe de ação por classe de ação, quando uma medição mostra que o sistema acerta; nunca por tempo decorrido nem por sensação de confiança.

## Por que existe
A ideia simples de "começa manual e vira automático" tem três defeitos. O primeiro: a maturidade não é global. O mesmo sistema pode estar pronto para resumir textos e despreparado para mexer em pagamentos, e tratar tudo como uma coisa só dilui a proteção justamente onde ela mais importa. O segundo: o que diminui é a aprovação ação por ação, não a vigilância. Quem tem experiência tende a aprovar mais coisas automaticamente e, ao mesmo tempo, interromper mais vezes o agente. Ninguém abandona o controle, troca "aprovar tudo" por "vigiar e intervir onde importa". O terceiro: certas classes de ação nunca saem do circuito humano. O inimigo constante é o viés de automação: se ninguém mede com que frequência o humano corrige o sistema, a aprovação vira carimbo.

Observação: a tendência descrita no segundo ponto é uma leitura do autor, sem fonte pública citada aqui.

## O que muda na prática
- Cada classe de ação (resumir, salvar, publicar, pagar) tem a sua própria fase de supervisão.
- Fase 1: o humano revisa tudo. Só avança com taxa de concordância alta, medida num período definido antes, sem nenhuma reversão e sem incidente.
- Fase 2: a IA age quando está confiante e avisa; o humano intervém. Aprovações sempre quase instantâneas são sinal de carimbo, e a resposta é aumentar o atrito (um resumo obrigatório antes de confirmar) ou voltar de fase.
- Fase 3: supervisão só no alto risco, com monitoramento da sessão e botão de parada sempre à vista. Troca de modelo, tipo de ação novo ou qualquer incidente devolvem a classe à fase anterior.
- Limites absolutos, em qualquer fase: mover dinheiro, ampliar acesso a dado sensível, ou fazer algo que não se desfaz com um clique. Decisão sobre pessoa, diagnóstico de saúde e certificação entram aqui, pela lei e pela engenharia.

## Como adotar
1. Liste as classes de ação que o seu sistema executa e dê a cada uma uma fase inicial (quase sempre a 1).
2. Registre cada decisão humana: aprovou, editou, interrompeu, reverteu, e quanto tempo levou.
3. Defina o limiar de concordância e o período de medição para cada classe, revise por classe periodicamente e depois de qualquer incidente.
4. Escreva os limites absolutos antes de começar e proíba a configuração de "auto-aprovar" nessas classes.
5. Ao explicar para um cliente, diga as duas coisas: a supervisão diminui com prova, e há coisas que nunca saem da mão humana.
