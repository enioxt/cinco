# Chatbot com hierarquia de autoridade e regras que podem ser verificadas

## A regra em uma frase
Um chatbot obedece a uma cadeia de autoridade em que a regra de baixo nunca sobrepõe a de cima, e só entra nas regras dele a que declara onde e como será verificada.

## Por que existe
Regras de chatbot costumam virar texto de marketing: bonito, sem ligação com o que roda. Dois problemas aparecem quando o desenho é revisado por mais de uma IA ou por mais de uma pessoa. Primeiro: sem uma ordem de precedência, ninguém sabe quem manda quando duas instruções entram em conflito. Segundo: regra sem ponto de verificação é promessa. O desenho deve reconhecer suas lacunas, marcando como não verificada qualquer regra que ainda não tenha implementação em execução.

## O que muda na prática
- Cadeia de autoridade, de cima para baixo: lei e segurança, contrato com o cliente, política do produto, método de conversa, persona, entrada do usuário. Em conflito vence o superior e o conflito é registrado.
- Cada regra declara sua "superfície de verificação": política no banco de dados, teste de caso de ouro, filtro antes de gravar, coluna de auditoria. Sem isso, a regra não entra.
- Exemplos de regras válidas: não vazar dado entre clientes, não inventar peça nem preço, mascarar dado pessoal espontâneo, passar a um humano em desconto e reclamação, pedir consentimento explícito antes de entrevistas, definir retenção com prazo, citar a origem de fato afirmado, ter um botão de pausa geral.
- Modos de conversa com limite: descoberta (poucas perguntas), qualificação (a pontuação dispara a passagem a um humano), diagnóstico e operação, esta restrita às ferramentas registradas.
- Avaliação híbrida: heurística automática sempre ligada, amostra humana periódica e IA como juiz só na triagem, nunca sozinha com modelo barato.
- O conjunto de regras tem teto de tamanho. Tutorial vai para guia separado.
- Bots parados não são reformados só por conformidade. Adaptador por bot, nunca obrigação do núcleo.

## Como adotar
1. Desenhe a cadeia de autoridade do seu bot em seis degraus.
2. Para cada regra, escreva ao lado onde ela é verificada.
3. Crie ao menos um caso de ouro por regra, incluindo um que falharia se o código fosse um esqueleto vazio.
4. Defina quando as regras mudam: só por incidente real ou capacidade provada.
