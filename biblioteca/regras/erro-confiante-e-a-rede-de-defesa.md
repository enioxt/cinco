# O erro mais perigoso é o confiante, e só uma rede de camadas o contém

## A regra em uma frase
O alvo principal de qualquer sistema com IA é o erro que chega bem escrito e com sentido falso, e a defesa contra ele é uma rede de camadas em que a trava automática do fim é a última rede, nunca a primeira.

## Por que existe
Um erro raso se corrige com mais instrução. O erro confiante tem forma perfeita e conteúdo errado, e por isso passa batido por quem revisa. É a falha mais perigosa, porque ninguém desconfia dela.

Um documento que descreve a defesa contra isso também pode cair no erro que descreve. É comum que uma camada rotulada como "bloqueia" apenas avise, que um marcador citado como existente não exista, ou que a mesma trava seja contada como duas camadas. Só a revisão adversarial, repetida, pega esse tipo de erro. A régua final é sempre o arquivo e a linha que comprovam.

Exemplo: um verificador de proveniência aprova um campo extraído porque o trecho citado existe de fato no documento. O trecho, porém, não sustenta o valor extraído. Citação provada não é conclusão provada.

## O que muda na prática
- Camadas independentes: calibragem na fonte, prova real antes de declarar pronto, refutação adversarial e proveniência que só afunila. Cada uma diz com honestidade se bloqueia ou apenas avisa.
- A trava automática no commit é último recurso. Quando ela pega algo, o comportamento já falhou antes.
- Em execução sem humano por perto, o erro raso vira confiante, então a refutação deixa de ser opcional.
- Quem cita um trecho declara a posição de onde ele veio, e o verificador reprova se o trecho casa em outro lugar.
- Taxa de verificação muito redonda é suspeita. Pode ser tautologia do verificador.
- "Conferido" por amostra é frase verdadeira sobre o comando e falsa sobre o olho. Provas visuais pedem um material consolidado que se abre de uma vez, ou a lista do que ficou de fora.

## Como adotar
1. Liste suas camadas de defesa e marque cada uma como bloqueia, avisa ou depende de pessoa. Não use a palavra "bloqueia" sem ter visto a trava barrar.
2. Garanta que pelo menos uma camada seja refutação por outro revisor, humano ou modelo diferente.
3. Para campos extraídos de documentos, grave de onde saiu o valor e confira a posição.
4. Desconfie dos próprios relatórios de cobertura. Peça o denominador.
5. Registre cada erro confiante achado em você mesmo. Eles mostram onde a rede tem furo.
