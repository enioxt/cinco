# Revisão adversarial com pré-mortem e com teto

## A regra em uma frase
O que obriga alguém (que se assina, se paga, se cumpre, ou sai com o seu nome) só é apresentado como pronto depois de um pré-mortem e de uma revisão adversarial feita por quem não escreveu, e essa revisão tem teto de camadas definido antes, parando quando não traz nada novo.

## Por que existe
Quem critica define o eixo, não o universo. Exemplo: um contrato foi reescrito para responder a um parecer que criticava a forma. A reescrita otimizou todos os eixos citados e mediu o sucesso por eles, mas nenhuma medida era de substância. Uma cláusula potestativa, uma obrigação de correção sem limite e um direito de desistência perpétuo passaram intactos, porque ninguém os apontara. Três defeitos saíram dali: a métrica do conserto herdou o vocabulário de quem reclamou; uma política generosa sem moldura virou obrigação ilimitada; e simplificar apagou a régua, deixando promessas sem critério verificável.

O defeito oposto também existe. Sem teto, a análise cresce até o cansaço, e depois de certo ponto mais camadas geram só mais texto. A evidência que falta passa a vir de ação: um experimento, uma conversa, uma prova ao vivo.

Revisão sem mapa de riscos raciocina sobre hipóteses. Com um pré-mortem feito antes, os revisores discutem modos de falha concretos.

## O que muda na prática
1. **Pré-mortem primeiro**, em decisão de área de alto risco (texto público, preço, arquitetura irreversível, publicação com tráfego, contexto de segurança): mapeie como pode falhar e passe o mapa à revisão como contexto.
2. **A revisão pede, de propósito, que se ataquem eixos que ninguém pediu.** E pelo menos um revisor é de outra família de modelo, porque revisores da mesma família erram juntos e o erro correlacionado é invisível (ver a regra de revisão com modelos de linhagens diferentes).
3. **Teto registrado antes da primeira camada:** a classe da decisão, o custo estimado do erro, se há efeito em cascata sobre terceiros. Quanto mais irreversível, mais camadas são permitidas; decisão reversível e barata merece uma só.
4. **Cada camada devolve três listas:** ações novas, achados novos e categorias checadas (legal, segurança, custo, prazo, terceiros). Faltando qualquer uma, a camada é inválida. A revisão para quando uma camada não traz ação nova nem achado novo, ou quando o teto chega.
5. **Pedido de mais uma camada depois da parada se recusa com argumentos,** e a recusa fica registrada com data. Em decisão grave, só uma decisão humana libera mais, e repetir o mesmo argumento não conta como argumento novo.
6. **A saída relata os dois lados:** o que foi consertado e o que não foi examinado. Métrica de forma nunca é apresentada como prova de substância.
7. **Reprovação estrutural gera reescrita, não remendo,** e a reescrita passa pela mesma revisão. Ao cortar, pergunte de cada peça removida se alguma obrigação que ficou dependia dela.
8. **A revisão não roda em toda mudança.** Ela é lembrete que dispara quando o conteúdo toca área de risco; pular exige razão escrita ("risco aceito").

## Como adotar
1. Defina "documento de consequência" na sua equipe com quatro perguntas: alguém assina? alguém paga? alguém fica obrigado? sai com o meu nome?
2. Liste as áreas de alto risco e a tabela de classes de decisão com o teto de cada uma.
3. Dê às camadas um formato de saída com os três campos e guarde o pré-mortem junto da decisão.
4. Registre recusas e pulos em arquivo, com data e razão.
5. Mantenha uma lista de revisores e o hábito de perguntar: quais eixos ninguém examinou?
