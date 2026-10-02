# A pessoa decide nas pontas: na fonte e na prova

## A regra em uma frase
A verdade que a pessoa realmente tem está em dois lugares, no que ela quer e no que ela vê rodar, e pedir a ela que aprove o raciocínio do agente no meio do caminho produz um carimbo, não uma decisão.

## Por que existe
Aprovar o rótulo epistêmico ou o raciocínio de uma IA é assinar o que não se verificou. O resultado é um erro confiante com aval humano, que é pior que um erro sem aval. Por isso o sistema separa três tipos de pergunta logo na primeira resposta a uma tarefa.

Exemplo: um pedido diz para arrumar um README e, na mesma frase, "subir para o site". O agente trata o ato de publicar como se fosse fato e vai rodar o deploy. A trava de permissão barra antes de qualquer envio. O comportamento falhou e a trava final pegou, como o desenho prevê.

## O que muda na prática
- **Escolha** (preferência, prioridade, o que significa "pronto", decisão do cliente) vira pergunta com critério de aceite. O agente nunca infere.
- **Fato** (existe? funciona? qual o estado?) o agente investiga sozinho. Perguntar fato investigável é trocar escolha por fato, o erro central.
- **Decisão envelhecida** (uma decisão antiga cuja base mudou) volta como pergunta nova. Um bloqueio herdado precisa ser reconferido, porque a causa pode já ter sido resolvida.
- A automação cuida do que é fatual e para na escolha e no ato sem volta: publicar, assinar, gastar, subir em produção.
- Sem ninguém por perto, o ato reversível pode ser encenado em estado segurado, com prova e prazo. Se o prazo vence, fica retido, nunca sai sozinho. O irreversível exige a pessoa ao vivo.

## Como adotar
1. Classifique cada pergunta que o agente faz: escolha, fato ou decisão antiga.
2. Proíba perguntas de fato investigável.
3. Marque na sua lista de ações quais são irreversíveis e exigem decisão humana.
4. Para execução autônoma, crie uma fila de itens segurados com prazo e responsável.
5. Mostre sempre a prova, não o aval do rótulo.
