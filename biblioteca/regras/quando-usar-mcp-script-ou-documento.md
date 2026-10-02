# Quando usar MCP, quando usar script e quando bastar um documento

## A regra em uma frase
Use MCP quando uma capacidade precisa ser compartilhada entre ambientes e agentes, com estado e auditoria; use script quando a operação é pontual ou determinística; use documento quando o conteúdo é conhecimento; e faça o agente lembrar do MCP por gatilhos, não por insistência.

## Por que existe
Agentes esquecem que a ferramenta existe, inventam solução quando deveriam consultá-la e gastam leituras de arquivo onde uma chamada resolveria. A resposta ingênua, sugerir MCP em toda pergunta, vira spam e passa a ser ignorada. Outro erro comum é tratar MCP como se fosse o fluxo de trabalho: o MCP dá acesso, mas a sequência, os critérios, os limites e a prova ficam numa habilidade (skill).

## O que muda na prática
1. MCP: capacidade entre ambientes, usada por vários agentes, com estado entre sessões, interface estável e auditoria.
2. Script: deploy, migração, operação única, determinismo sem modelo, latência mínima ou estado só local.
3. Documento: conhecimento estático, onboarding humano, decisão arquitetural.
4. Para o que o sistema de arquivos local resolve, use as ferramentas nativas e deixe o MCP para recurso externo.
5. Todo MCP pode estar fora do ar: se falhar, o agente continua com o método anterior, avisa em uma linha e registra, sem travar a sessão.
6. Gatilhos em quatro camadas: descrição da ferramenta, padrão no pedido do usuário, arquivo sendo editado e comandos de início e fim de sessão. No máximo uma ou duas sugestões por pedido.
7. Para promover uma capacidade a MCP: teste comportamental passando, maturidade mínima, responsável definido, modelo de ameaças se exposta e uso em pelo menos dois contextos.

## Como adotar
- Mantenha uma tabela curta de gatilho para ferramenta, com os padrões mais comuns do seu fluxo.
- Meça a taxa de sugestão útil e de falso positivo, e refine o padrão que gerar ruído demais.
- Nunca escreva "você deve usar a ferramenta X": se ela estiver fora do ar, o usuário fica bloqueado.
- Mantenha o inventário de servidores e a lógica de uso em documentos separados, para o inventário poder ser gerado.
