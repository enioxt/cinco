# Princípios de design: a interface mostra o rigor, não o decora

## A regra em uma frase
O visual de um sistema que promete verdade deve tornar essa verdade visível: cor com significado, prova antes da opinião, autoria à vista e uma só ideia forte por tela.

## Por que existe
Numa comparação de sites de referência em direção de arte cruzada com os aplicativos de uma mesma organização, dois padrões aparecem. O primeiro: cada aplicativo deriva para uma identidade própria, com cores de destaque diferentes, e nenhum usa a paleta que o documento de marca definiu. O sistema governa a IA e não governa o próprio design. O segundo: a identidade mais forte das referências vem do que elas recusam, e não do que enfeitam.

Quando houver que escolher uma paleta, vence a que está em uso e provada, e não a que só existe no papel.

## O que muda na prática
- Defina pela subtração. Liste o que sua marca recusa, por exemplo gradiente nebuloso, animação de "pensando", texto de entusiasmo, dado fictício em tela pública.
- Cor é veredito. Verde, âmbar e vermelho têm significado fixo e só aparecem quando há medição. Cor sem função é mentira visual.
- Prova antes de interpretação: registro, data e fonte primeiro, comentário depois. Quem assinou ou executou fica em destaque, não no rodapé.
- Grade regular para dados e estados, não cartões de tamanho aleatório.
- Dois tipos de letra, um para dados e identificadores, outro para narrativa. A tensão entre máquina e humano vira assinatura.
- Um momento marcante por tela, e vazio usado de propósito.
- Mostrar as costuras: log visível, margem de confiança explícita. Painel polido demais esconde complexidade.
- Teste no pior contexto: ícone minúsculo, impressão em preto e branco, celular.

## Como adotar
1. Reúna as telas que você tem hoje e meça quantas paletas e fontes existem de fato.
2. Escolha uma e extraia os valores para um arquivo único de tokens que todos os aplicativos leiam.
3. Escreva dez linhas do que a marca recusa e cole na página de padrões.
4. Revise cada tela nova contra a lista acima antes de publicar.
