# Guardrails em cinco camadas para chatbots, agentes e servidores de ferramentas

## A regra em uma frase
Toda superfície que fala ou age em nome de uma equipe (chatbot, agente, servidor de ferramentas) declara quais das cinco camadas de proteção implementa (entrada, fundamentação, saída, ação e auditoria), e cada camada declarada aponta para o teste que a prova.

## Por que existe
Quando várias superfícies convivem, é comum uma ter proteção em código e as outras terem quase tudo escrito apenas no texto do prompt: o limite de escopo, a proibição de promessa, o pedido de confirmação humana. Texto de prompt ajuda, mas um usuário insistente o contorna. Sem uma lista do que cada superfície deve cumprir antes de ir ao ar, a cobertura depende da memória de quem construiu. A declaração sem teste é o pior caso, porque parece proteção e não é (ver a regra de casos de ouro comportamentais).

Sobre injeção de instruções, o ponto central é que a defesa real vem mais de contenção do que de um classificador único: isolamento das instruções de sistema, lista de ferramentas permitidas, autenticação reforçada em passos sensíveis e aprovação humana nas ações que não se desfazem. Classificadores e listas de padrões complementam, mas não bastam.

## O que muda na prática
1. **Entrada.** Detectar injeção de instrução, tratar dado pessoal antes de registrar (mascaramento ligado por padrão, com regras e verificação de dígitos para documentos de identificação), checar se a pergunta está no domínio e limitar tamanho e frequência.
2. **Fundamentação.** Responder só a partir de fontes recuperadas, exigir citação e ter um caminho de "não sei" quando a fonte é insuficiente. A fidelidade pode ser conferida depois da geração, no próprio fluxo de recuperação, por um modelo pequeno que compara resposta e contexto.
3. **Saída.** Mascarar dado pessoal, recusar absolutos e promessas falsas, checar contradição e conteúdo ofensivo.
4. **Ação.** Confirmação humana para escrita e para o que não se desfaz, matriz de quem pode chamar qual ferramenta, lista de ferramentas permitidas, autenticação, escopo por cliente e teto de gasto.
5. **Auditoria.** Registro encadeado de cada decisão, teste adversarial antes de implantar novos prompts de sistema e alerta quando o declarado diverge do que roda.
6. Declarar a camada sem teste que a prove é motivo de bloqueio.

## Como adotar
- Escreva um arquivo curto por superfície listando as camadas que ela implementa e o teste de cada uma, com pelo menos três casos por camada.
- Faça a tabela de conformidade das superfícies existentes, marcando separadamente o que está em código e o que está só no prompt.
- Defina mínimos por tipo: chatbot público exige entrada, saída e escopo; chatbot com busca em documentos exige também citação; servidor de ferramentas exige autenticação, matriz de permissões e auditoria; agente que escreve exige confirmação humana.
- Escolha ferramentas de terceiros só depois de conferir, na fonte, licença, estado de manutenção e encaixe com a sua linguagem; uma recomendação sem essa conferência é hipótese.
- Comece pela superfície pública e comercial, onde o dano de uma alucinação é maior.
- Reaproveite uma superfície bem protegida como referência e porte o padrão para as outras.
